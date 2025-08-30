import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';
import { Template, ITemplate } from '../models/Template.js';
import { User } from '../models/User.js';
import { Form } from '../models/Form.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name cannot exceed 200 characters'),
  category: z.enum([
    'maintenance',
    'inspection',
    'service',
    'installation',
    'calibration',
    'breakdown',
    'custom',
  ]),
  description: z.string().optional(),
  elements: z.array(z.any()).min(1, 'Template must have at least one element'),
  permissions: z
    .object({
      canView: z.array(z.enum(['admin', 'manager', 'technician'])).optional(),
      canUse: z.array(z.enum(['admin', 'manager', 'technician'])).optional(),
      canEdit: z.array(z.enum(['admin', 'manager', 'technician'])).optional(),
    })
    .optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

const searchTemplatesSchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 1)),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val) : 20)),
  category: z
    .enum([
      'maintenance',
      'inspection',
      'service',
      'installation',
      'calibration',
      'breakdown',
      'custom',
    ])
    .optional(),
  status: z.enum(['draft', 'active', 'archived', 'pending_approval']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// GET /api/templates - Get all templates
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = searchTemplatesSchema.parse(req.query);
    const {
      page = 1,
      limit = 20,
      category,
      status,
      search,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = query;

    // Build filter
    const filter: any = {};

    // Role-based filtering
    if (req.user!.role !== 'admin') {
      filter['permissions.canView'] = { $in: [req.user!.role] };
    }

    if (category) filter.category = category;
    if (status) filter.status = status;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      Template.find(filter)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Template.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        templates,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.errors,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    console.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/templates/:id - Get template by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templateId = req.params.id;

    if (!templateId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid template ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    const template = await Template.findById(templateId)
      .populate('createdBy', 'firstName lastName email')
      .populate('lastModifiedBy', 'firstName lastName email');

    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
      return;
    }

    // Check permissions
    if (req.user!.role !== 'admin' && !template.permissions?.canView?.includes(req.user!.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this template',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    res.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      code: 'INTERNAL_ERROR',
    });
  }
});

// POST /api/templates - Create new template
router.post(
  '/',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = createTemplateSchema.parse(req.body);

      const templateData = {
        ...validatedData,
        status: 'draft' as const,
        createdBy: req.user!.id,
        metadata: {
          version: 1,
        },
        permissions: {
          canView: validatedData.permissions?.canView || ['admin', 'manager', 'technician'],
          canUse: validatedData.permissions?.canUse || ['admin', 'manager', 'technician'],
          canEdit: validatedData.permissions?.canEdit || ['admin', 'manager'],
        },
        usage: {
          totalForms: 0,
          lastUsed: null,
        },
      };

      const template = new Template(templateData);
      await template.save();

      await template.populate('createdBy', 'firstName lastName email');

      res.status(201).json({
        success: true,
        data: { template },
        message: 'Template created successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid template data',
          errors: error.errors,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      console.error('Create template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create template',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// PUT /api/templates/:id - Update template
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templateId = req.params.id;

    if (!templateId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid template ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    const validatedData = updateTemplateSchema.parse(req.body);

    const template = await Template.findById(templateId);
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
      return;
    }

    // Check permissions
    if (req.user!.role !== 'admin' && !template.permissions?.canEdit?.includes(req.user!.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to edit this template',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    // Update template
    Object.assign(template, validatedData);
    template.lastModifiedBy = req.user!.id;
    template.metadata.version = (template.metadata.version || 1) + 1;

    await template.save();

    await template.populate('createdBy', 'firstName lastName email');
    await template.populate('lastModifiedBy', 'firstName lastName email');

    res.json({
      success: true,
      data: { template },
      message: 'Template updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid template data',
        errors: error.errors,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    console.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template',
      code: 'INTERNAL_ERROR',
    });
  }
});

// DELETE /api/templates/:id - Delete template
router.delete(
  '/:id',
  authorize('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templateId = req.params.id;

      if (!templateId.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid template ID format',
          code: 'INVALID_ID',
        });
        return;
      }

      const template = await Template.findById(templateId);
      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found',
          code: 'TEMPLATE_NOT_FOUND',
        });
        return;
      }

      // Check if template is being used
      const formsUsingTemplate = await Form.countDocuments({ templateUsed: template._id });
      if (formsUsingTemplate > 0) {
        res.status(400).json({
          success: false,
          message: `Cannot delete template. It is being used by ${formsUsingTemplate} forms. Archive it instead.`,
          code: 'TEMPLATE_IN_USE',
        });
        return;
      }

      await Template.findByIdAndDelete(templateId);

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('Delete template error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete template',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// POST /api/templates/:id/clone - Clone template
router.post('/:id/clone', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templateId = req.params.id;
    const { name } = z
      .object({
        name: z.string().min(1, 'Name is required').max(200, 'Name cannot exceed 200 characters'),
      })
      .parse(req.body);

    if (!templateId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid template ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    const template = await Template.findById(templateId);
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
      return;
    }

    // Check permissions
    if (req.user!.role !== 'admin' && !template.permissions?.canView?.includes(req.user!.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to clone this template',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    // Create cloned template
    const clonedTemplate = new Template({
      name,
      category: template.category,
      description: `${template.description || ''} (Cloned)`,
      elements: JSON.parse(JSON.stringify(template.elements)), // Deep copy
      status: 'draft',
      createdBy: req.user!.id,
      metadata: {
        version: 1,
      },
      permissions: template.permissions,
      usage: {
        totalForms: 0,
        lastUsed: null,
      },
    });

    await clonedTemplate.save();
    await clonedTemplate.populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: { template: clonedTemplate },
      message: 'Template cloned successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid clone data',
        errors: error.errors,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    console.error('Clone template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clone template',
      code: 'INTERNAL_ERROR',
    });
  }
});

// PATCH /api/templates/:id/status - Update template status
router.patch('/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templateId = req.params.id;
    const { status, comment } = z
      .object({
        status: z.enum(['draft', 'active', 'archived', 'pending_approval']),
        comment: z.string().optional(),
      })
      .parse(req.body);

    if (!templateId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid template ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    const template = await Template.findById(templateId);
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
      return;
    }

    // Check permissions
    if (req.user!.role !== 'admin' && !template.permissions?.canEdit?.includes(req.user!.role)) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to change template status',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    template.status = status;
    template.lastModifiedBy = req.user!.id;
    await template.save();

    res.json({
      success: true,
      data: { template },
      message: `Template status updated to ${status}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid status data',
        errors: error.errors,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    console.error('Update template status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update template status',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/templates/:id/forms - Get forms created from template
router.get('/:id/forms', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const templateId = req.params.id;
    const { page = 1, limit = 20 } = z
      .object({
        page: z
          .string()
          .optional()
          .transform(val => (val ? parseInt(val) : 1)),
        limit: z
          .string()
          .optional()
          .transform(val => (val ? parseInt(val) : 20)),
      })
      .parse(req.query);

    if (!templateId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid template ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    const template = await Template.findById(templateId);
    if (!template) {
      res.status(404).json({
        success: false,
        message: 'Template not found',
        code: 'TEMPLATE_NOT_FOUND',
      });
      return;
    }

    const skip = (page - 1) * limit;

    const [forms, total] = await Promise.all([
      Form.find({ templateUsed: template._id })
        .populate('technician', 'firstName lastName email')
        .populate('worksite', 'name customerName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Form.countDocuments({ templateUsed: template._id }),
    ]);

    res.json({
      success: true,
      data: {
        forms,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.errors,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    console.error('Get template forms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template forms',
      code: 'INTERNAL_ERROR',
    });
  }
});

// GET /api/templates/meta/categories - Get template categories with counts
router.get('/meta/categories', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ];

    const categories = await Template.aggregate(pipeline);

    const result = categories.map(cat => ({
      category: cat._id,
      total: cat.count,
      active: cat.activeCount,
    }));

    res.json({
      success: true,
      data: { categories: result },
    });
  } catch (error) {
    console.error('Get template categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch template categories',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;
