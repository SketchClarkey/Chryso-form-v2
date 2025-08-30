import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import FilterService from '../services/filterService';
import { Form } from '../models/Form';
import { Template } from '../models/Template';
import { User } from '../models/User';
import { Worksite } from '../models/Worksite';
import { Dashboard } from '../models/Dashboard';

const router = Router();
const filterService = FilterService.getInstance();

// Validation middleware
const filterValidation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Filter name is required and must be less than 100 characters'),
  body('entityType')
    .isIn(['form', 'template', 'user', 'worksite', 'dashboard', 'all'])
    .withMessage('Invalid entity type'),
  body('groups').isArray({ min: 1 }).withMessage('At least one filter group is required'),
  body('globalLogicalOperator').isIn(['AND', 'OR']).withMessage('Invalid global logical operator'),
];

const applyFilterValidation = [
  body('filter').isObject().withMessage('Filter object is required'),
  body('entityType')
    .isIn(['form', 'template', 'user', 'worksite', 'dashboard', 'all'])
    .withMessage('Invalid entity type'),
];

// GET /api/filters - Get user's filters
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      entityType,
      scope = 'all', // 'my', 'shared', 'all'
      limit = 50,
      offset = 0,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter criteria
    const filterCriteria: any = {};

    if (entityType && entityType !== 'all') {
      filterCriteria.entityType = entityType;
    }

    if (scope === 'my') {
      filterCriteria.createdBy = new Types.ObjectId(req.user!.id);
    } else if (scope === 'shared') {
      filterCriteria.isShared = true;
    }

    // Mock data for demonstration - in real implementation, this would query the database
    const mockFilters = [
      {
        id: '1',
        name: 'High Priority Forms',
        description: 'Forms marked as high or urgent priority',
        entityType: 'form',
        groups: [
          {
            id: 'g1',
            name: 'Priority Group',
            criteria: [
              {
                id: 'c1',
                field: 'priority',
                operator: 'in',
                value: ['high', 'urgent'],
                dataType: 'string',
              },
            ],
            logicalOperator: 'AND',
            isActive: true,
          },
        ],
        globalLogicalOperator: 'AND',
        isShared: false,
        tags: ['priority', 'urgent'],
        createdBy: new Types.ObjectId(req.user!.id),
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-20'),
        usage: { totalUses: 45, lastUsed: new Date() },
      },
      {
        id: '2',
        name: 'Completed This Week',
        description: 'All completed forms from this week',
        entityType: 'form',
        groups: [
          {
            id: 'g2',
            name: 'Status and Date',
            criteria: [
              {
                id: 'c2',
                field: 'status',
                operator: 'equals',
                value: 'completed',
                dataType: 'string',
              },
              {
                id: 'c3',
                field: 'completedAt',
                operator: 'dateThisWeek',
                value: null,
                dataType: 'date',
              },
            ],
            logicalOperator: 'AND',
            isActive: true,
          },
        ],
        globalLogicalOperator: 'AND',
        isShared: true,
        tags: ['completed', 'weekly'],
        createdBy: 'other-user-id',
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-18'),
        usage: { totalUses: 123, lastUsed: new Date('2024-01-22') },
      },
    ];

    // Apply filters based on scope
    let filteredResults = mockFilters;

    if (scope === 'my') {
      filteredResults = mockFilters.filter(f => f.createdBy === new Types.ObjectId(req.user!.id));
    } else if (scope === 'shared') {
      filteredResults = mockFilters.filter(f => f.isShared);
    }

    if (entityType && entityType !== 'all') {
      filteredResults = filteredResults.filter(f => f.entityType === entityType);
    }

    res.json({
      success: true,
      data: {
        filters: filteredResults,
        total: filteredResults.length,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          hasMore: false,
        },
      },
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve filters',
    });
  }
});

// POST /api/filters - Create new filter
router.post('/', authenticate, filterValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, description, entityType, groups, globalLogicalOperator, isShared, tags } =
      req.body;

    // Validate the filter using the service
    const filter = {
      name,
      description,
      entityType,
      groups,
      globalLogicalOperator,
      isShared,
      tags,
      createdBy: new Types.ObjectId(req.user!.id),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validation = filterService.validateFilter(filter);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Filter validation failed',
        errors: validation.errors,
      });
    }

    // In a real implementation, save to database
    const savedFilter = {
      ...filter,
      id: `filter_${Date.now()}`,
      usage: { totalUses: 0 },
    };

    res.status(201).json({
      success: true,
      data: { filter: savedFilter },
    });
  } catch (error) {
    console.error('Create filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create filter',
    });
  }
});

// PUT /api/filters/:id - Update filter
router.put('/:id', authenticate, param('id').notEmpty(), filterValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { id } = req.params;
    const { name, description, entityType, groups, globalLogicalOperator, isShared, tags } =
      req.body;

    // In a real implementation, check if filter exists and user has permission to edit
    const updatedFilter = {
      id,
      name,
      description,
      entityType,
      groups,
      globalLogicalOperator,
      isShared,
      tags,
      updatedAt: new Date(),
    };

    const validation = filterService.validateFilter(updatedFilter);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Filter validation failed',
        errors: validation.errors,
      });
    }

    res.json({
      success: true,
      data: { filter: updatedFilter },
    });
  } catch (error) {
    console.error('Update filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update filter',
    });
  }
});

// DELETE /api/filters/:id - Delete filter
router.delete('/:id', authenticate, param('id').notEmpty(), async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, check if filter exists and user has permission to delete
    res.json({
      success: true,
      message: 'Filter deleted successfully',
    });
  } catch (error) {
    console.error('Delete filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete filter',
    });
  }
});

// POST /api/filters/apply - Apply filter to get results
router.post('/apply', authenticate, applyFilterValidation, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { filter, entityType, pagination = { limit: 50, offset: 0 } } = req.body;
    const startTime = Date.now();

    // Validate the filter
    const validation = filterService.validateFilter(filter);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Filter validation failed',
        errors: validation.errors,
      });
    }

    // Build MongoDB query
    const mongoQuery = filterService.buildMongoQuery(filter);

    let results: any[] = [];
    let total = 0;

    // Apply the filter based on entity type
    switch (entityType) {
      case 'form':
        results = await Form.find(mongoQuery)
          .populate('technicianId', 'firstName lastName')
          .populate('worksiteId', 'name location')
          .limit(pagination.limit)
          .skip(pagination.offset)
          .lean();
        total = await Form.countDocuments({});
        break;

      case 'template':
        results = await Template.find(mongoQuery)
          .populate('createdBy', 'firstName lastName')
          .limit(pagination.limit)
          .skip(pagination.offset)
          .lean();
        total = await Template.countDocuments({});
        break;

      case 'user':
        if (req.user!.role === 'admin' || req.user!.role === 'manager') {
          results = await User.find(mongoQuery)
            .select('-password')
            .limit(pagination.limit)
            .skip(pagination.offset)
            .lean();
          total = await User.countDocuments({});
        } else {
          return res.status(403).json({
            success: false,
            message: 'Insufficient permissions to filter users',
          });
        }
        break;

      case 'worksite':
        results = await Worksite.find(mongoQuery)
          .limit(pagination.limit)
          .skip(pagination.offset)
          .lean();
        total = await Worksite.countDocuments({});
        break;

      case 'dashboard':
        // Add access control for dashboards
        const dashboardQuery = {
          ...mongoQuery,
          $or: [
            { createdBy: new Types.ObjectId(req.user!.id) },
            { 'permissions.canView': { $in: [req.user!.role] } },
            { 'sharing.isPublic': true },
          ],
        };
        results = await Dashboard.find(dashboardQuery)
          .populate('createdBy', 'firstName lastName')
          .limit(pagination.limit)
          .skip(pagination.offset)
          .lean();
        total = await Dashboard.countDocuments({});
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported entity type for filtering',
        });
    }

    const executionTime = Date.now() - startTime;

    // Prepare applied filters summary
    const appliedFilters = filter.groups
      .filter((group: any) => group.isActive)
      .map((group: any) => ({
        groupName: group.name,
        criteriaCount: group.criteria.length,
        isActive: group.isActive,
      }));

    res.json({
      success: true,
      data: {
        data: results,
        total,
        filteredCount: results.length,
        executionTime,
        appliedFilters,
        query: mongoQuery, // For debugging - remove in production
      },
    });
  } catch (error) {
    console.error('Apply filter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply filter',
    });
  }
});

// GET /api/filters/fields/:entityType - Get available fields for entity type
router.get(
  '/fields/:entityType',
  authenticate,
  param('entityType').notEmpty(),
  async (req, res) => {
    try {
      const { entityType } = req.params;

      const fields = filterService.getAvailableFields(entityType);

      res.json({
        success: true,
        data: { fields },
      });
    } catch (error) {
      console.error('Get fields error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve fields',
      });
    }
  }
);

// GET /api/filters/operators/:dataType - Get available operators for data type
router.get('/operators/:dataType', authenticate, param('dataType').notEmpty(), async (req, res) => {
  try {
    const { dataType } = req.params;

    const operators = filterService.getOperatorsForType(dataType);

    res.json({
      success: true,
      data: { operators },
    });
  } catch (error) {
    console.error('Get operators error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve operators',
    });
  }
});

// POST /api/filters/:id/usage - Track filter usage
router.post('/:id/usage', authenticate, param('id').notEmpty(), async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, increment usage count and update last used date
    res.json({
      success: true,
      message: 'Filter usage tracked',
    });
  } catch (error) {
    console.error('Track usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track filter usage',
    });
  }
});

export default router;
