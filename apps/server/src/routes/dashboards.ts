import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/express';
import DashboardService from '../services/dashboardService';

const router = Router();
const dashboardService = DashboardService.getInstance();

// Validation middleware
const validateDashboard = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1 and 200 characters'),
  body('category')
    .isIn(['personal', 'team', 'organization', 'public'])
    .withMessage('Invalid category'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('widgets').isArray().withMessage('Widgets must be an array'),
  body('layout').isObject().withMessage('Layout configuration is required'),
];

const validateWidget = [
  body('type')
    .isIn(['metric', 'chart', 'table', 'text', 'filter'])
    .withMessage('Invalid widget type'),
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Widget title is required'),
  body('config').isObject().withMessage('Widget configuration is required'),
  body('layout').isObject().withMessage('Widget layout is required'),
];

// GET /api/dashboards - Get all dashboards
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category').optional().isIn(['personal', 'team', 'organization', 'public']),
    query('tags').optional().isString(),
    query('search').optional().isString(),
    query('createdBy').optional().isMongoId(),
    query('isTemplate').optional().isBoolean(),
    query('isPublic').optional().isBoolean(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const {
        page = 1,
        limit = 20,
        category,
        tags,
        search,
        createdBy,
        isTemplate,
        isPublic,
      } = req.query;

      const query = {
        ...(category && { category: category as string }),
        ...(tags && { tags: (tags as string).split(',').map(tag => tag.trim()) }),
        ...(search && { search: search as string }),
        ...(createdBy && { createdBy: createdBy as string }),
        ...(isTemplate !== undefined && { isTemplate: isTemplate === 'true' }),
        ...(isPublic !== undefined && { isPublic: isPublic === 'true' }),
      };

      const result = await dashboardService.getDashboards(
        query,
        req.user?.role || 'technician',
        req.user?.id || '',
        Number(page),
        Number(limit)
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Get dashboards error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch dashboards',
      });
    }
  }
);

// GET /api/dashboards/:id - Get dashboard by ID
router.get(
  '/:id',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid dashboard ID')],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const dashboard = await dashboardService.getDashboard(
        req.params.id,
        req.user?.role || 'technician',
        req.user?.id || ''
      );

      return res.json({
        success: true,
        data: { dashboard },
      });
    } catch (error: any) {
      console.error('Get dashboard error:', error);
      const status =
        error.message === 'Dashboard not found'
          ? 404
          : error.message === 'Access denied'
            ? 403
            : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to fetch dashboard',
      });
    }
  }
);

// POST /api/dashboards - Create new dashboard
router.post(
  '/',
  authenticate,
  validateDashboard,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const dashboard = await dashboardService.createDashboard(req.body, req.user?.id || '');

      return res.status(201).json({
        success: true,
        data: { dashboard },
        message: 'Dashboard created successfully',
      });
    } catch (error: any) {
      console.error('Create dashboard error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create dashboard',
      });
    }
  }
);

// PUT /api/dashboards/:id - Update dashboard
router.put(
  '/:id',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid dashboard ID'),
    ...validateDashboard,
    body('changes').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { changes, ...updates } = req.body;
      const dashboard = await dashboardService.updateDashboard(
        req.params.id,
        updates,
        req.user?.id || '',
        changes
      );

      return res.json({
        success: true,
        data: { dashboard },
        message: 'Dashboard updated successfully',
      });
    } catch (error: any) {
      console.error('Update dashboard error:', error);
      const status = error.message === 'Dashboard not found' ? 404 : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to update dashboard',
      });
    }
  }
);

// DELETE /api/dashboards/:id - Delete dashboard
router.delete(
  '/:id',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid dashboard ID')],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      await dashboardService.deleteDashboard(
        req.params.id,
        req.user?.role || 'technician',
        req.user?.id || ''
      );

      return res.json({
        success: true,
        message: 'Dashboard deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete dashboard error:', error);
      const status =
        error.message === 'Dashboard not found'
          ? 404
          : error.message.includes('Not authorized')
            ? 403
            : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to delete dashboard',
      });
    }
  }
);

// POST /api/dashboards/:id/duplicate - Duplicate dashboard
router.post(
  '/:id/duplicate',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid dashboard ID'),
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name is required'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const dashboard = await dashboardService.duplicateDashboard(
        req.params.id,
        req.body.name,
        req.user?.role || 'technician',
        req.user?.id || ''
      );

      return res.status(201).json({
        success: true,
        data: { dashboard },
        message: 'Dashboard duplicated successfully',
      });
    } catch (error: any) {
      console.error('Duplicate dashboard error:', error);
      const status =
        error.message === 'Dashboard not found'
          ? 404
          : error.message.includes('Not authorized')
            ? 403
            : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to duplicate dashboard',
      });
    }
  }
);

// GET /api/dashboards/:id/data - Get dashboard data
router.get(
  '/:id/data',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid dashboard ID'),
    query('refresh').optional().isBoolean(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const forceRefresh = req.query.refresh === 'true';
      const widgetData = await dashboardService.generateDashboardData(
        req.params.id,
        req.user?.role || 'technician',
        req.user?.id || '',
        forceRefresh
      );

      return res.json({
        success: true,
        data: {
          widgets: widgetData,
          generatedAt: new Date(),
        },
      });
    } catch (error: any) {
      console.error('Get dashboard data error:', error);
      const status =
        error.message === 'Dashboard not found'
          ? 404
          : error.message === 'Access denied'
            ? 403
            : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to generate dashboard data',
      });
    }
  }
);

// POST /api/dashboards/:id/widgets - Add widget to dashboard
router.post(
  '/:id/widgets',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid dashboard ID'), ...validateWidget],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const widget = {
        ...req.body,
        id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      const dashboard = await dashboardService.updateDashboard(
        req.params.id,
        { $push: { widgets: widget } } as any,
        req.user?.id || '',
        `Added widget: ${widget.title}`
      );

      return res.status(201).json({
        success: true,
        data: { dashboard },
        message: 'Widget added successfully',
      });
    } catch (error: any) {
      console.error('Add widget error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to add widget',
      });
    }
  }
);

// PUT /api/dashboards/:id/widgets/:widgetId - Update widget
router.put(
  '/:id/widgets/:widgetId',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid dashboard ID'),
    param('widgetId').isString().withMessage('Invalid widget ID'),
    ...validateWidget,
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      // This would require a more complex update operation
      // For now, we'll fetch, modify, and save the entire dashboard
      const dashboard = await dashboardService.getDashboard(
        req.params.id,
        req.user?.role || 'technician',
        req.user?.id || ''
      );

      const widgetIndex = dashboard.widgets.findIndex(w => w.id === req.params.widgetId);
      if (widgetIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Widget not found',
        });
      }

      dashboard.widgets[widgetIndex] = { ...dashboard.widgets[widgetIndex], ...req.body };
      const updatedDashboard = await dashboardService.updateDashboard(
        req.params.id,
        { widgets: dashboard.widgets },
        req.user?.id || '',
        `Updated widget: ${req.body.title}`
      );

      return res.json({
        success: true,
        data: { dashboard: updatedDashboard },
        message: 'Widget updated successfully',
      });
    } catch (error: any) {
      console.error('Update widget error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to update widget',
      });
    }
  }
);

// DELETE /api/dashboards/:id/widgets/:widgetId - Delete widget
router.delete(
  '/:id/widgets/:widgetId',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid dashboard ID'),
    param('widgetId').isString().withMessage('Invalid widget ID'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const dashboard = await dashboardService.getDashboard(
        req.params.id,
        req.user?.role || 'technician',
        req.user?.id || ''
      );

      const originalLength = dashboard.widgets.length;
      dashboard.widgets = dashboard.widgets.filter(w => w.id !== req.params.widgetId);

      if (dashboard.widgets.length === originalLength) {
        return res.status(404).json({
          success: false,
          message: 'Widget not found',
        });
      }

      const updatedDashboard = await dashboardService.updateDashboard(
        req.params.id,
        { widgets: dashboard.widgets },
        req.user?.id || '',
        `Deleted widget: ${req.params.widgetId}`
      );

      return res.json({
        success: true,
        data: { dashboard: updatedDashboard },
        message: 'Widget deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete widget error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete widget',
      });
    }
  }
);

// GET /api/dashboards/templates - Get dashboard templates
router.get(
  '/templates/list',
  authenticate,
  [query('category').optional().isString()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const templates = await dashboardService.getDashboardTemplates(req.query.category as string);

      return res.json({
        success: true,
        data: { templates },
      });
    } catch (error: any) {
      console.error('Get dashboard templates error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch dashboard templates',
      });
    }
  }
);

// POST /api/dashboards/templates/:id/create - Create dashboard from template
router.post(
  '/templates/:id/create',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid template ID'),
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Dashboard name is required'),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const dashboard = await dashboardService.createDashboardFromTemplate(
        req.params.id,
        req.body.name,
        req.user?.id || ''
      );

      return res.status(201).json({
        success: true,
        data: { dashboard },
        message: 'Dashboard created from template successfully',
      });
    } catch (error: any) {
      console.error('Create dashboard from template error:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      return res.status(status).json({
        success: false,
        message: error.message || 'Failed to create dashboard from template',
      });
    }
  }
);

export default router;
