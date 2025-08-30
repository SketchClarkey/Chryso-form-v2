import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { Report, IReport } from '../models/Report.js';
import { Form } from '../models/Form.js';
import { Template } from '../models/Template.js';
import { Worksite } from '../models/Worksite.js';
import { User } from '../models/User.js';

const router = Router();

// Validation middleware
const validateReport = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Name must be between 1 and 200 characters'),
  body('category')
    .isIn(['operational', 'analytical', 'compliance', 'financial', 'custom'])
    .withMessage('Invalid category'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('dataSources').isArray({ min: 0 }).withMessage('Data sources must be an array'),
  body('visualizations').isArray({ min: 0 }).withMessage('Visualizations must be an array'),
];

// GET /api/reports - Get all reports
router.get(
  '/',
  authenticate,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('category')
      .optional()
      .isIn(['operational', 'analytical', 'compliance', 'financial', 'custom']),
    query('status').optional().isIn(['draft', 'published', 'archived']),
    query('search').optional().isString(),
    query('tags').optional().isString(),
    query('sortBy')
      .optional()
      .isIn(['name', 'createdAt', 'updatedAt', 'usage.totalViews', 'usage.lastViewed']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
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
        status,
        search,
        tags,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = req.query;

      // Build query filter
      const filter: any = {};

      // Role-based filtering
      if (req.user?.role !== 'admin') {
        filter['permissions.canView'] = { $in: [req.user!.role] };
      }

      if (category) filter.category = category;
      if (status) filter.status = status;

      if (search) {
        filter.$text = { $search: search as string };
      }

      if (tags) {
        const tagArray = (tags as string).split(',').map(tag => tag.trim());
        filter.tags = { $in: tagArray };
      }

      // Build sort object
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

      const skip = (Number(page) - 1) * Number(limit);

      const [reports, total] = await Promise.all([
        Report.find(filter)
          .populate('createdBy', 'firstName lastName email')
          .populate('lastModifiedBy', 'firstName lastName email')
          .sort(sort)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Report.countDocuments(filter),
      ]);

      return res.json({
        success: true,
        data: {
          reports,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      console.error('Get reports error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch reports',
      });
    }
  }
);

// GET /api/reports/:id - Get report by ID
router.get(
  '/:id',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid report ID')],
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

      const report = await Report.findById(req.params.id)
        .populate('createdBy', 'firstName lastName email')
        .populate('lastModifiedBy', 'firstName lastName email')
        .populate('collaborators.user', 'firstName lastName email');

      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      // Check permissions
      if (req.user!.role !== 'admin' && !report.permissions.canView.includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this report',
        });
      }

      // Update view statistics
      report.usage.totalViews += 1;
      report.usage.lastViewed = new Date();
      await report.save();

      return res.json({
        success: true,
        data: { report },
      });
    } catch (error) {
      console.error('Get report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch report',
      });
    }
  }
);

// POST /api/reports - Create new report
router.post('/', authenticate, validateReport, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Check permissions
    if (!['admin', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create reports',
      });
    }

    const reportData = {
      ...req.body,
      createdBy: new Types.ObjectId(req.user!.id),
      permissions: {
        canView: req.body.permissions?.canView || ['admin', 'manager', 'technician'],
        canEdit: req.body.permissions?.canEdit || ['admin', 'manager'],
        canExport: req.body.permissions?.canExport || ['admin', 'manager', 'technician'],
      },
      usage: {
        totalViews: 0,
        totalExports: 0,
      },
    };

    const report = new Report(reportData);
    await report.save();
    await report.populate('createdBy', 'firstName lastName email');

    return res.status(201).json({
      success: true,
      data: { report },
      message: 'Report created successfully',
    });
  } catch (error) {
    console.error('Create report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create report',
    });
  }
});

// PUT /api/reports/:id - Update report
router.put(
  '/:id',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid report ID'), ...validateReport],
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

      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      // Check permissions
      if (req.user!.role !== 'admin' && !report.permissions.canEdit.includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to edit this report',
        });
      }

      // Add version history entry
      if (req.body.changes) {
        report.versionHistory.push({
          version: report.version,
          changes: req.body.changes,
          modifiedBy: new Types.ObjectId(req.user!.id),
          timestamp: new Date(),
          snapshot: {
            dataSources: report.dataSources,
            visualizations: report.visualizations,
            layout: report.layout,
          },
        });
      }

      // Update report
      Object.assign(report, req.body);
      report.lastModifiedBy = new Types.ObjectId(req.user!.id);

      await report.save();
      await report.populate('createdBy', 'firstName lastName email');
      await report.populate('lastModifiedBy', 'firstName lastName email');

      return res.json({
        success: true,
        data: { report },
        message: 'Report updated successfully',
      });
    } catch (error) {
      console.error('Update report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update report',
      });
    }
  }
);

// DELETE /api/reports/:id - Delete report
router.delete(
  '/:id',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid report ID')],
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

      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      // Check permissions
      if (req.user!.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can delete reports',
        });
      }

      await Report.findByIdAndDelete(req.params.id);

      return res.json({
        success: true,
        message: 'Report deleted successfully',
      });
    } catch (error) {
      console.error('Delete report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete report',
      });
    }
  }
);

// POST /api/reports/:id/clone - Clone report
router.post(
  '/:id/clone',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid report ID'),
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

      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      // Check permissions
      if (req.user!.role !== 'admin' && !report.permissions.canView.includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to clone this report',
        });
      }

      const clonedReport = await report.clone(req.body.name, new Types.ObjectId(req.user!.id));
      await clonedReport.populate('createdBy', 'firstName lastName email');

      return res.status(201).json({
        success: true,
        data: { report: clonedReport },
        message: 'Report cloned successfully',
      });
    } catch (error) {
      console.error('Clone report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to clone report',
      });
    }
  }
);

// PATCH /api/reports/:id/status - Update report status
router.patch(
  '/:id/status',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid report ID'),
    body('status').isIn(['draft', 'published', 'archived']).withMessage('Invalid status'),
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

      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      // Check permissions
      if (req.user!.role !== 'admin' && !report.permissions.canEdit.includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to change report status',
        });
      }

      report.status = req.body.status;
      report.lastModifiedBy = new Types.ObjectId(req.user!.id);
      await report.save();

      return res.json({
        success: true,
        data: { report },
        message: `Report status updated to ${req.body.status}`,
      });
    } catch (error) {
      console.error('Update report status error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update report status',
      });
    }
  }
);

// POST /api/reports/:id/generate - Generate report data
router.post(
  '/:id/generate',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid report ID'),
    body('dateRange').optional().isObject(),
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

      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      // Check permissions
      if (req.user!.role !== 'admin' && !report.permissions.canView.includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to generate this report',
        });
      }

      const data = await generateReportData(report, req.user!.role, req.body.dateRange);

      return res.json({
        success: true,
        data: {
          reportData: data,
          generatedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Generate report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate report data',
      });
    }
  }
);

// Helper function to generate actual report data
async function generateReportData(
  report: IReport,
  userRole: string,
  dateRange?: { start: Date; end: Date }
) {
  const data: any = {};

  for (const dataSource of report.dataSources) {
    const query: any = {};

    // Apply date range filter if provided
    if (dateRange) {
      query.createdAt = {
        $gte: dateRange.start,
        $lte: dateRange.end,
      };
    }

    // Apply data source filters
    if (dataSource.filters && dataSource.filters.length > 0) {
      for (const filter of dataSource.filters) {
        const fieldPath = filter.field;

        switch (filter.operator) {
          case 'equals':
            query[fieldPath] = filter.value;
            break;
          case 'not_equals':
            query[fieldPath] = { $ne: filter.value };
            break;
          case 'contains':
            query[fieldPath] = { $regex: filter.value, $options: 'i' };
            break;
          case 'greater_than':
            query[fieldPath] = { $gt: filter.value };
            break;
          case 'less_than':
            query[fieldPath] = { $lt: filter.value };
            break;
          case 'in':
            query[fieldPath] = { $in: Array.isArray(filter.value) ? filter.value : [filter.value] };
            break;
        }
      }
    }

    let results: any[] = [];

    switch (dataSource.type) {
      case 'form':
        results = await Form.find(query)
          .populate('technician', 'firstName lastName')
          .populate('worksite', 'name customerName')
          .sort({ createdAt: -1 })
          .limit(1000)
          .lean();
        break;

      case 'template':
        results = await Template.find(query)
          .populate('createdBy', 'firstName lastName')
          .sort({ updatedAt: -1 })
          .lean();
        break;

      case 'worksite':
        results = await Worksite.find(query)
          .populate('metadata.createdBy', 'firstName lastName')
          .sort({ name: 1 })
          .lean();
        break;

      case 'user':
        if (['admin', 'manager'].includes(userRole)) {
          results = await User.find(query)
            .select('-password -refreshTokens')
            .sort({ createdAt: -1 })
            .lean();
        }
        break;
    }

    data[dataSource.id] = results;
  }

  return data;
}

// GET /api/reports/datasources - Get available data sources
router.get('/meta/datasources', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get available data sources based on user permissions
    const dataSources = [
      {
        id: 'forms',
        type: 'form',
        name: 'Form Submissions',
        description: 'Data from submitted forms',
        fields: [
          { id: 'formId', name: 'Form ID', type: 'text', path: 'formId' },
          { id: 'status', name: 'Status', type: 'text', path: 'status' },
          { id: 'submittedAt', name: 'Submitted Date', type: 'date', path: 'createdAt' },
          { id: 'technician', name: 'Technician', type: 'object', path: 'technician' },
          { id: 'worksite', name: 'Worksite', type: 'object', path: 'worksite' },
        ],
      },
      {
        id: 'templates',
        type: 'template',
        name: 'Form Templates',
        description: 'Template usage and statistics',
        fields: [
          { id: 'name', name: 'Template Name', type: 'text', path: 'name' },
          { id: 'category', name: 'Category', type: 'text', path: 'category' },
          { id: 'status', name: 'Status', type: 'text', path: 'status' },
          { id: 'totalForms', name: 'Total Forms', type: 'number', path: 'usage.totalForms' },
          { id: 'lastUsed', name: 'Last Used', type: 'date', path: 'usage.lastUsed' },
        ],
      },
      {
        id: 'worksites',
        type: 'worksite',
        name: 'Worksites',
        description: 'Worksite information and statistics',
        fields: [
          { id: 'name', name: 'Worksite Name', type: 'text', path: 'name' },
          { id: 'customerName', name: 'Customer', type: 'text', path: 'customerName' },
          { id: 'city', name: 'City', type: 'text', path: 'address.city' },
          { id: 'state', name: 'State', type: 'text', path: 'address.state' },
          { id: 'isActive', name: 'Active', type: 'boolean', path: 'isActive' },
          {
            id: 'totalForms',
            name: 'Total Forms',
            type: 'number',
            path: 'metadata.serviceHistory.totalForms',
          },
        ],
      },
    ];

    // Add users data source for admin/manager roles
    if (['admin', 'manager'].includes(req.user!.role)) {
      dataSources.push({
        id: 'users',
        type: 'user',
        name: 'Users',
        description: 'User accounts and activity',
        fields: [
          { id: 'firstName', name: 'First Name', type: 'text', path: 'firstName' },
          { id: 'lastName', name: 'Last Name', type: 'text', path: 'lastName' },
          { id: 'email', name: 'Email', type: 'text', path: 'email' },
          { id: 'role', name: 'Role', type: 'text', path: 'role' },
          { id: 'isActive', name: 'Active', type: 'boolean', path: 'isActive' },
          { id: 'lastLogin', name: 'Last Login', type: 'date', path: 'lastLogin' },
        ],
      });
    }

    return res.json({
      success: true,
      data: { dataSources },
    });
  } catch (error) {
    console.error('Get data sources error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch data sources',
    });
  }
});

// POST /api/reports/:id/export - Export report
router.post(
  '/:id/export',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid report ID'),
    body('format').isIn(['pdf', 'excel', 'csv', 'png']).withMessage('Invalid export format'),
    body('includeCharts').optional().isBoolean(),
    body('includeData').optional().isBoolean(),
    body('pageSize').optional().isIn(['A4', 'Letter', 'Legal']),
    body('orientation').optional().isIn(['portrait', 'landscape']),
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

      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      // Check permissions
      if (req.user!.role !== 'admin' && !report.permissions.canExport.includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to export this report',
        });
      }

      // Check if export format is allowed
      if (!report.settings?.exportFormats?.includes(req.body.format)) {
        return res.status(400).json({
          success: false,
          message: `Export format ${req.body.format} is not allowed for this report`,
        });
      }

      // Generate report data
      const data = await generateReportData(report, req.user!.role, req.body.dateRange);

      // Export report
      const ExportService = require('../services/exportService').default;
      const exportService = ExportService.getInstance();

      const exportOptions = {
        format: req.body.format,
        includeCharts: req.body.includeCharts !== false,
        includeData: req.body.includeData !== false,
        pageSize: req.body.pageSize || 'A4',
        orientation: req.body.orientation || 'portrait',
        dateRange: req.body.dateRange,
      };

      const { filePath, fileName } = await exportService.exportReport(
        report,
        data,
        exportOptions,
        req.user!.id
      );

      // Update export statistics
      report.usage.totalExports += 1;
      report.usage.lastExported = new Date();
      await report.save();

      // Send file
      res.download(filePath, fileName, (err: any) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Failed to download exported file',
            });
          }
          return;
        }
        // Success case - file downloaded successfully
        return;
      });
      return; // Explicit return for the async function
    } catch (error) {
      console.error('Export report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to export report',
      });
    }
  }
);

// GET /api/reports/:id/export-formats - Get available export formats for report
router.get(
  '/:id/export-formats',
  authenticate,
  [param('id').isMongoId().withMessage('Invalid report ID')],
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

      const report = await Report.findById(req.params.id);
      if (!report) {
        return res.status(404).json({
          success: false,
          message: 'Report not found',
        });
      }

      // Check permissions
      if (req.user!.role !== 'admin' && !report.permissions.canView.includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this report',
        });
      }

      const availableFormats = [
        {
          format: 'pdf',
          name: 'PDF Document',
          description: 'Portable document with charts and tables',
          icon: 'picture_as_pdf',
          options: {
            pageSize: ['A4', 'Letter', 'Legal'],
            orientation: ['portrait', 'landscape'],
            includeCharts: true,
            includeData: true,
          },
        },
        {
          format: 'excel',
          name: 'Excel Workbook',
          description: 'Spreadsheet with multiple sheets and raw data',
          icon: 'table_chart',
          options: {
            includeData: true,
          },
        },
        {
          format: 'csv',
          name: 'CSV File',
          description: 'Comma-separated values for data import',
          icon: 'description',
          options: {
            includeData: true,
          },
        },
        {
          format: 'png',
          name: 'PNG Image',
          description: 'High-resolution image of the report',
          icon: 'image',
          options: {
            includeCharts: true,
          },
        },
      ];

      // Filter by allowed formats
      const allowedFormats = report.settings?.exportFormats || ['pdf', 'excel', 'csv'];
      const filteredFormats = availableFormats.filter(format =>
        allowedFormats.includes(format.format as "csv" | "image" | "pdf" | "excel")
      );

      return res.json({
        success: true,
        data: {
          formats: filteredFormats,
          canExport:
            report.permissions.canExport.includes(req.user!.role) || req.user!.role === 'admin',
        },
      });
    } catch (error) {
      console.error('Get export formats error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get export formats',
      });
    }
  }
);

export default router;
