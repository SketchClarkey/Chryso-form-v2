import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { DataRetentionPolicy } from '../models/DataRetentionPolicy.js';
import { DataRetentionService } from '../services/dataRetentionService.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';
import { auditSystemChanges } from '../middleware/audit.js';

const router = Router();
const dataRetentionService = DataRetentionService.getInstance();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const createPolicySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  entityType: z.enum(['form', 'auditLog', 'report', 'user', 'template', 'dashboard', 'all']),
  retentionPeriod: z.object({
    value: z.number().min(1),
    unit: z.enum(['days', 'months', 'years']),
  }),
  archiveBeforeDelete: z.boolean().default(true),
  archiveLocation: z.string().optional(),
  archiveFormat: z.enum(['json', 'csv', 'compressed']).default('compressed'),
  conditions: z
    .array(
      z.object({
        field: z.string(),
        operator: z.enum([
          'equals',
          'not_equals',
          'greater_than',
          'less_than',
          'contains',
          'exists',
        ]),
        value: z.any(),
      })
    )
    .optional(),
  legalHold: z
    .object({
      enabled: z.boolean(),
      reason: z.string().optional(),
      holdUntil: z.string().datetime().optional(),
      exemptFromDeletion: z.boolean().default(true),
    })
    .optional(),
  complianceRequirements: z
    .object({
      gdpr: z.boolean().default(false),
      hipaa: z.boolean().default(false),
      sox: z.boolean().default(false),
      pci: z.boolean().default(false),
      custom: z.array(z.string()).optional(),
    })
    .optional(),
  executionSchedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    hour: z.number().min(0).max(23),
    timezone: z.string().default('UTC'),
  }),
  organizationId: z.string().optional(),
});

// Get all retention policies
router.get('/', authorize('admin', 'manager'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, entityType, isActive } = req.query;
    const organizationId = req.user?.organizationId || (req.query.organizationId as string);

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID required',
      });
      return;
    }

    const query: any = { organizationId };
    if (entityType) query.entityType = entityType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (Number(page) - 1) * Number(limit);

    const [policies, total] = await Promise.all([
      DataRetentionPolicy.find(query)
        .populate('createdBy', 'firstName lastName email')
        .populate('modifiedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      DataRetentionPolicy.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        policies,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('Failed to get retention policies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve retention policies',
    });
  }
});

// Get single retention policy
router.get(
  '/:id',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId || (req.query.organizationId as string);

      const policy = await DataRetentionPolicy.findOne({ _id: id, organizationId })
        .populate('createdBy', 'firstName lastName email')
        .populate('modifiedBy', 'firstName lastName email');

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Retention policy not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { policy },
      });
    } catch (error) {
      console.error('Failed to get retention policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve retention policy',
      });
    }
  }
);

// Create new retention policy
router.post(
  '/',
  authorize('admin'),
  auditSystemChanges,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = createPolicySchema.parse(req.body);
      const organizationId = req.user?.organizationId || validatedData.organizationId;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
        return;
      }

      // Check for duplicate names
      const existingPolicy = await DataRetentionPolicy.findOne({
        name: validatedData.name,
        organizationId,
      });

      if (existingPolicy) {
        res.status(409).json({
          success: false,
          message: 'A retention policy with this name already exists',
        });
        return;
      }

      const policy = new DataRetentionPolicy({
        ...validatedData,
        organizationId,
        createdBy: new Types.ObjectId(req.user!.id),
        stats: {
          recordsArchived: 0,
          recordsDeleted: 0,
          totalSizeArchived: 0,
          errors: { count: 0 },
        },
      });

      await policy.save();

      res.status(201).json({
        success: true,
        message: 'Retention policy created successfully',
        data: { policy },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid input data',
          errors: error.errors,
        });
        return;
      }

      console.error('Failed to create retention policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create retention policy',
      });
    }
  }
);

// Update retention policy
router.put(
  '/:id',
  authorize('admin'),
  auditSystemChanges,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = createPolicySchema.partial().parse(req.body);
      const organizationId = req.user?.organizationId || req.body.organizationId;

      const policy = await DataRetentionPolicy.findOne({ _id: id, organizationId });

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Retention policy not found',
        });
        return;
      }

      // Check for duplicate names if name is being updated
      if (validatedData.name && validatedData.name !== policy.name) {
        const existingPolicy = await DataRetentionPolicy.findOne({
          name: validatedData.name,
          organizationId,
          _id: { $ne: id },
        });

        if (existingPolicy) {
          return res.status(409).json({
            success: false,
            message: 'A retention policy with this name already exists',
          });
        }
      }

      Object.assign(policy, validatedData);
      policy.modifiedBy = new Types.ObjectId(req.user!.id) as any;
      await policy.save();

      return res.json({
        success: true,
        message: 'Retention policy updated successfully',
        data: { policy },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid input data',
          errors: error.errors,
        });
      }

      console.error('Failed to update retention policy:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update retention policy',
      });
    }
  }
);

// Delete retention policy
router.delete(
  '/:id',
  authorize('admin'),
  auditSystemChanges,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId || (req.query.organizationId as string);

      const policy = await DataRetentionPolicy.findOneAndDelete({ _id: id, organizationId });

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Retention policy not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Retention policy deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete retention policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete retention policy',
      });
    }
  }
);

// Execute retention policy manually
router.post(
  '/:id/execute',
  authorize('admin'),
  auditSystemChanges,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId || req.body.organizationId;

      const policy = await DataRetentionPolicy.findOne({ _id: id, organizationId });

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Retention policy not found',
        });
        return;
      }

      const result = await dataRetentionService.executePolicy(policy);

      res.json({
        success: true,
        message: 'Retention policy executed successfully',
        data: { result },
      });
    } catch (error) {
      console.error('Failed to execute retention policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to execute retention policy',
      });
    }
  }
);

// Get retention statistics
router.get(
  '/stats/summary',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId || (req.query.organizationId as string);

      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: 'Organization ID required',
        });
        return;
      }

      const stats = await dataRetentionService.getRetentionStatistics(organizationId);

      res.json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      console.error('Failed to get retention statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve retention statistics',
      });
    }
  }
);

// Test retention policy (dry run)
router.post('/:id/test', authorize('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId || req.body.organizationId;

    const policy = await DataRetentionPolicy.findOne({ _id: id, organizationId });

    if (!policy) {
      res.status(404).json({
        success: false,
        message: 'Retention policy not found',
      });
      return;
    }

    // This would be a dry run to show what would be affected
    const cutoffDate = policy.getCutoffDate();

    // Count records that would be affected for each entity type
    const testResults: any = {
      cutoffDate,
      policyName: policy.name,
      entityType: policy.entityType,
      estimatedRecords: 0,
    };

    // Add logic to count records that would be affected
    // This is simplified - in production you'd want to run the same queries as the actual execution

    res.json({
      success: true,
      message: 'Retention policy test completed',
      data: { testResults },
    });
  } catch (error) {
    console.error('Failed to test retention policy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test retention policy',
    });
  }
});

// Toggle policy active status
router.patch(
  '/:id/toggle',
  authorize('admin'),
  auditSystemChanges,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const organizationId = req.user?.organizationId || req.body.organizationId;

      const policy = await DataRetentionPolicy.findOne({ _id: id, organizationId });

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Retention policy not found',
        });
        return;
      }

      policy.isActive = !policy.isActive;
      policy.modifiedBy = new Types.ObjectId(req.user!.id) as any;
      await policy.save();

      res.json({
        success: true,
        message: `Retention policy ${policy.isActive ? 'activated' : 'deactivated'} successfully`,
        data: { policy },
      });
    } catch (error) {
      console.error('Failed to toggle retention policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle retention policy',
      });
    }
  }
);

// Get execution history
router.get(
  '/:id/history',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { page = 1, limit = 20 } = req.query;
      const organizationId = req.user?.organizationId || (req.query.organizationId as string);

      const policy = await DataRetentionPolicy.findOne({ _id: id, organizationId });

      if (!policy) {
        res.status(404).json({
          success: false,
          message: 'Retention policy not found',
        });
        return;
      }

      // In a full implementation, you'd want to store execution history separately
      // For now, return basic policy stats
      const history = {
        policy: {
          name: policy.name,
          entityType: policy.entityType,
          isActive: policy.isActive,
        },
        stats: policy.stats,
        executions: [], // This would be populated from a separate execution log collection
      };

      res.json({
        success: true,
        data: { history },
      });
    } catch (error) {
      console.error('Failed to get retention history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve retention history',
      });
    }
  }
);

export default router;
