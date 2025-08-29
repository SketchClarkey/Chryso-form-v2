import { Router, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import AnalyticsService, { AnalyticsQuery } from '../services/analyticsService';
import { Template } from '../models/Template';
import { Worksite } from '../models/Worksite';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../types/express.js';

const router = Router();
const analyticsService = AnalyticsService.getInstance();

// GET /api/analytics/dashboard - Get dashboard analytics
router.get('/dashboard', authenticate, [
  query('startDate').isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').isISO8601().withMessage('End date must be a valid ISO date'),
  query('granularity').optional().isIn(['hour', 'day', 'week', 'month', 'quarter', 'year']),
  query('worksites').optional().isString(),
  query('templates').optional().isString(),
  query('technicians').optional().isString(),
  query('status').optional().isString(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    // Parse query parameters
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    const granularity = (req.query.granularity as string) || 'day';

    // Parse filters
    const filters: AnalyticsQuery['filters'] = {};
    if (req.query.worksites) {
      filters.worksites = (req.query.worksites as string).split(',');
    }
    if (req.query.templates) {
      filters.templates = (req.query.templates as string).split(',');
    }
    if (req.query.technicians) {
      filters.technicians = (req.query.technicians as string).split(',');
    }
    if (req.query.status) {
      filters.status = (req.query.status as string).split(',');
    }

    const analyticsQuery: AnalyticsQuery = {
      dateRange: { start: startDate, end: endDate },
      granularity: granularity as any,
      filters,
    };

    const analytics = await analyticsService.generateAnalytics(analyticsQuery, req.user?.role || 'technician');

    res.json({
      success: true,
      data: {
        analytics,
        query: analyticsQuery,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate analytics',
    });
  }
});

// GET /api/analytics/filters - Get available filter options
router.get('/filters', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [templates, worksites, technicians] = await Promise.all([
      Template.find({ status: 'published' }).select('_id name category').lean(),
      Worksite.find({ isActive: true }).select('_id name customerName').lean(),
      req.user?.role === 'admin' || req.user?.role === 'manager'
        ? User.find({ role: 'technician', isActive: true }).select('_id firstName lastName email').lean()
        : [],
    ]);

    const statusOptions = [
      { value: 'draft', label: 'Draft' },
      { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' },
      { value: 'submitted', label: 'Submitted' },
      { value: 'approved', label: 'Approved' },
      { value: 'rejected', label: 'Rejected' },
    ];

    res.json({
      success: true,
      data: {
        templates: templates.map(t => ({
          value: t._id,
          label: t.name,
          category: t.category,
        })),
        worksites: worksites.map(w => ({
          value: w._id,
          label: w.name,
          customer: w.customerName,
        })),
        technicians: technicians.map(u => ({
          value: u._id,
          label: `${u.firstName} ${u.lastName}`,
          email: u.email,
        })),
        status: statusOptions,
        granularities: [
          { value: 'hour', label: 'Hourly' },
          { value: 'day', label: 'Daily' },
          { value: 'week', label: 'Weekly' },
          { value: 'month', label: 'Monthly' },
          { value: 'quarter', label: 'Quarterly' },
          { value: 'year', label: 'Yearly' },
        ],
      },
    });
  } catch (error) {
    console.error('Analytics filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch filter options',
    });
  }
});

// GET /api/analytics/quick-stats - Get quick statistics
router.get('/quick-stats', authenticate, [
  query('period').optional().isIn(['today', 'week', 'month', 'quarter', 'year']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'month';
    
    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    const analyticsQuery: AnalyticsQuery = {
      dateRange: { start: startDate, end: endDate },
      granularity: 'day',
    };

    const analytics = await analyticsService.generateAnalytics(analyticsQuery, req.user?.role || 'technician');

    res.json({
      success: true,
      data: {
        period,
        metrics: analytics.metrics,
        totalForms: analytics.metrics.totalForms?.current || 0,
        completionRate: analytics.metrics.completionRate?.current || 0,
        activeUsers: analytics.metrics.activeUsers?.current || 0,
        avgCompletionTime: analytics.metrics.avgCompletionTime?.current || 0,
      },
    });
  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch quick statistics',
    });
  }
});

// GET /api/analytics/trends/:metric - Get trend data for specific metric
router.get('/trends/:metric', authenticate, [
  query('startDate').isISO8601().withMessage('Start date must be a valid ISO date'),
  query('endDate').isISO8601().withMessage('End date must be a valid ISO date'),
  query('granularity').optional().isIn(['hour', 'day', 'week', 'month']),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const metric = req.params.metric;
    const startDate = new Date(req.query.startDate as string);
    const endDate = new Date(req.query.endDate as string);
    const granularity = (req.query.granularity as string) || 'day';

    const analyticsQuery: AnalyticsQuery = {
      dateRange: { start: startDate, end: endDate },
      granularity: granularity as any,
    };

    const analytics = await analyticsService.generateAnalytics(analyticsQuery, req.user?.role || 'technician');

    const trendData = analytics.trends[metric];
    if (!trendData) {
      return res.status(404).json({
        success: false,
        message: `Trend data not found for metric: ${metric}`,
      });
    }

    res.json({
      success: true,
      data: {
        metric,
        trend: trendData,
        summary: {
          total: trendData.reduce((sum, point) => sum + point.value, 0),
          average: trendData.length > 0 ? trendData.reduce((sum, point) => sum + point.value, 0) / trendData.length : 0,
          peak: Math.max(...trendData.map(point => point.value)),
          lowest: Math.min(...trendData.map(point => point.value)),
        },
      },
    });
  } catch (error) {
    console.error('Trend data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trend data',
    });
  }
});

// POST /api/analytics/export - Export analytics data
router.post('/export', authenticate, [
  body('query').isObject().withMessage('Analytics query is required'),
  body('format').isIn(['csv', 'excel', 'json']).withMessage('Invalid export format'),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    if (!['admin', 'manager'].includes(req.user?.role || 'technician')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to export analytics data',
      });
    }

    const { query: analyticsQuery, format } = req.body;

    // Convert string dates to Date objects
    analyticsQuery.dateRange.start = new Date(analyticsQuery.dateRange.start);
    analyticsQuery.dateRange.end = new Date(analyticsQuery.dateRange.end);

    const analytics = await analyticsService.generateAnalytics(analyticsQuery, req.user?.role || 'technician');

    // Format data for export
    const exportData = {
      metadata: {
        generatedAt: new Date(),
        dateRange: analyticsQuery.dateRange,
        granularity: analyticsQuery.granularity,
        filters: analyticsQuery.filters,
      },
      metrics: analytics.metrics,
      trends: analytics.trends,
      distributions: analytics.distributions,
      comparisons: analytics.comparisons,
    };

    switch (format) {
      case 'json':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.json`);
        res.send(JSON.stringify(exportData, null, 2));
        break;

      case 'csv':
        // Convert to CSV format
        const csvData = convertToCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.csv`);
        res.send(csvData);
        break;

      case 'excel':
        // For now, return JSON - in production, use a library like xlsx
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=analytics-${Date.now()}.json`);
        res.send(JSON.stringify(exportData, null, 2));
        break;

      default:
        throw new Error('Unsupported export format');
    }

  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
    });
  }
});

// GET /api/analytics/performance - Get performance metrics
router.get('/performance', authenticate, [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
], async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user?.role || 'technician')) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view performance metrics',
      });
    }

    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

    const analyticsQuery: AnalyticsQuery = {
      dateRange: { start: startDate, end: endDate },
      granularity: 'day',
    };

    const analytics = await analyticsService.generateAnalytics(analyticsQuery, req.user?.role || 'technician');

    // Calculate performance indicators
    const performanceMetrics = {
      efficiency: {
        completionRate: analytics.metrics.completionRate?.current || 0,
        avgCompletionTime: analytics.metrics.avgCompletionTime?.current || 0,
        productivity: analytics.metrics.totalForms?.current || 0,
      },
      quality: {
        errorRate: 0, // Placeholder - would need error tracking
        reworkRate: 0, // Placeholder - would need rework tracking
        complianceRate: 100, // Placeholder - would need compliance tracking
      },
      utilization: {
        activeUsers: analytics.metrics.activeUsers?.current || 0,
        systemUptime: 99.9, // Placeholder - would need system monitoring
        peakUsage: Math.max(...(analytics.trends.userActivity || []).map(t => t.value)),
      },
    };

    res.json({
      success: true,
      data: {
        performance: performanceMetrics,
        period: { start: startDate, end: endDate },
        trends: {
          efficiency: analytics.trends.completions || [],
          utilization: analytics.trends.userActivity || [],
        },
      },
    });
  } catch (error) {
    console.error('Performance metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance metrics',
    });
  }
});

// Utility function to convert data to CSV
function convertToCSV(data: any): string {
  if (!data || typeof data !== 'object') {
    return '';
  }
  
  // Simple CSV conversion - in production, use a proper CSV library
  const json = JSON.stringify(data, null, 2);
  return json.replace(/[{}",]/g, '').replace(/:\s*/g, ',');
}

export default router;