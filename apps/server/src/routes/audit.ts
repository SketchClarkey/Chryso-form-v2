import { Router, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { CompliancePolicy } from '../models/CompliancePolicy';
import { AuditService } from '../services/auditService';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth';
import { auditMiddleware } from '../middleware/audit';

const router = Router();
const auditService = AuditService.getInstance();

// Apply authentication to all routes
router.use(authenticate);

// Get audit logs with filtering
router.get('/logs', 
  authorize('admin', 'manager'),
  auditMiddleware({ 
    action: 'view_audit_logs',
    category: 'security',
    description: 'Viewed audit logs'
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        startDate,
        endDate,
        category,
        eventType,
        severity,
        userId,
        resourceType,
        resourceId,
        page = 1,
        limit = 50,
        search
      } = req.query;

      const organizationId = req.user?.organizationId || req.query.organizationId as string;
      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
        return;
      }

      // Build query
      const query: any = { organizationId };

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate as string);
        if (endDate) query.timestamp.$lte = new Date(endDate as string);
      }

      if (category) query.category = category;
      if (eventType) query.eventType = eventType;
      if (severity) query.severity = severity;
      if (userId) query.userId = userId;
      if (resourceType) query.resourceType = resourceType;
      if (resourceId) query.resourceId = resourceId;

      // Text search
      if (search) {
        query.$or = [
          { description: { $regex: search, $options: 'i' } },
          { action: { $regex: search, $options: 'i' } },
          { userEmail: { $regex: search, $options: 'i' } },
          { resourceName: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      
      const [logs, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      console.error('Failed to get audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit logs'
      });
    }
  }
);

// Get audit summary/statistics
router.get('/summary',
  authorize('admin', 'manager'),
  auditMiddleware({
    action: 'view_audit_summary',
    category: 'security',
    description: 'Viewed audit summary'
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { startDate, endDate } = req.query;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
      const end = endDate ? new Date(endDate as string) : new Date();

      const summary = await auditService.getAuditSummary(organizationId, start, end);

      res.json({
        success: true,
        data: { summary }
      });
    } catch (error) {
      console.error('Failed to get audit summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve audit summary'
      });
    }
  }
);

// Get security alerts
router.get('/security-alerts',
  authorize('admin', 'manager'),
  auditMiddleware({
    action: 'view_security_alerts',
    category: 'security',
    description: 'Viewed security alerts'
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hours = 24 } = req.query;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      const alerts = await auditService.getSecurityAlerts(organizationId, Number(hours));

      res.json({
        success: true,
        data: { alerts }
      });
    } catch (error) {
      console.error('Failed to get security alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security alerts'
      });
    }
  }
);

// Get user activity
router.get('/users/:userId/activity',
  authorize('admin', 'manager'),
  auditMiddleware({
    action: 'view_user_activity',
    category: 'security',
    description: 'Viewed user activity'
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;
      const { startDate, endDate } = req.query;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default 7 days
      const end = endDate ? new Date(endDate as string) : new Date();

      const activity = await auditService.getUserActivity(organizationId, userId, start, end);

      res.json({
        success: true,
        data: { activity }
      });
    } catch (error) {
      console.error('Failed to get user activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user activity'
      });
    }
  }
);

// Get resource activity
router.get('/resources/:resourceType/:resourceId/activity',
  authorize('admin', 'manager'),
  auditMiddleware({
    action: 'view_resource_activity',
    category: 'security',
    description: 'Viewed resource activity'
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { resourceType, resourceId } = req.params;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      const activity = await auditService.getResourceActivity(organizationId, resourceType, resourceId);

      res.json({
        success: true,
        data: { activity }
      });
    } catch (error) {
      console.error('Failed to get resource activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve resource activity'
      });
    }
  }
);

// Get compliance report
router.get('/compliance/report',
  authorize('admin', 'manager'),
  auditMiddleware({
    action: 'view_compliance_report',
    category: 'compliance',
    description: 'Viewed compliance report'
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { complianceType, startDate, endDate } = req.query;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;

      const report = await auditService.getComplianceReport(
        organizationId,
        complianceType as string,
        start,
        end
      );

      res.json({
        success: true,
        data: { report }
      });
    } catch (error) {
      console.error('Failed to get compliance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve compliance report'
      });
    }
  }
);

// Get anomalous activity
router.get('/anomalous',
  authorize('admin', 'manager'),
  auditMiddleware({
    action: 'view_anomalous_activity',
    category: 'security',
    description: 'Viewed anomalous activity'
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { hours = 24 } = req.query;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      const anomalous = await AuditLog.getAnomalousActivity(organizationId, Number(hours));

      res.json({
        success: true,
        data: { anomalous }
      });
    } catch (error) {
      console.error('Failed to get anomalous activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve anomalous activity'
      });
    }
  }
);

// Export audit logs
router.post('/export',
  authorize('admin', 'manager'),
  auditMiddleware({
    action: 'export_audit_logs',
    category: 'data',
    description: 'Exported audit logs',
    sensitivity: 'confidential'
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { format = 'csv', filters = {} } = req.body;
      const organizationId = req.user?.organizationId || req.body.organizationId;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      // Build query from filters
      const query: any = { organizationId, ...filters };

      const logs = await AuditLog.find(query)
        .sort({ timestamp: -1 })
        .limit(10000) // Limit exports to prevent memory issues
        .lean();

      if (format === 'csv') {
        // Convert to CSV format
        const csv = convertLogsToCSV(logs);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
        return res.send(csv);
      } else {
        // Return JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
        return res.json(logs);
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export audit logs'
      });
    }
  }
);

// Helper function to convert logs to CSV
function convertLogsToCSV(logs: any[]): string {
  if (logs.length === 0) return '';

  const headers = [
    'timestamp',
    'eventType',
    'action',
    'category',
    'description',
    'userEmail',
    'userName',
    'userRole',
    'resourceType',
    'resourceId',
    'resourceName',
    'ipAddress',
    'severity',
    'riskLevel',
    'status',
    'duration'
  ];

  const csvRows = [headers.join(',')];

  logs.forEach(log => {
    const row = headers.map(header => {
      let value = log[header] || '';
      
      // Handle special cases
      if (header === 'timestamp') {
        value = new Date(value).toISOString();
      }
      
      // Escape CSV values
      if (typeof value === 'string') {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
}

export default router;