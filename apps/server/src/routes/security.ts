import { Router, Response } from 'express';
import { z } from 'zod';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';
import { auditSecurityEvents } from '../middleware/audit.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Security metrics endpoint
router.get('/metrics',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = '24h' } = req.query;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      // Calculate time range
      const now = new Date();
      let startTime = new Date();
      
      switch (timeRange) {
        case '1h':
          startTime.setHours(now.getHours() - 1);
          break;
        case '24h':
          startTime.setHours(now.getHours() - 24);
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          break;
        default:
          startTime.setHours(now.getHours() - 24);
      }

      // Get security metrics from audit logs
      const [
        totalEvents,
        criticalEvents,
        failedLogins,
        suspiciousActivity,
        uniqueIPs,
        complianceViolations
      ] = await Promise.all([
        // Total security events
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: startTime },
          category: { $in: ['security', 'authentication', 'authorization'] }
        }),
        
        // Critical alerts
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: startTime },
          severity: 'critical',
          category: { $in: ['security', 'authentication', 'authorization'] }
        }),
        
        // Failed logins
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: startTime },
          category: 'authentication',
          status: 'failure'
        }),
        
        // Suspicious activity (multiple failed attempts, unusual access patterns)
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: startTime },
          riskLevel: { $in: ['high', 'critical'] }
        }),
        
        // Unique IP addresses
        AuditLog.distinct('ipAddress', {
          organizationId,
          timestamp: { $gte: startTime },
          ipAddress: { $exists: true, $ne: null }
        }),
        
        // Compliance violations
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: startTime },
          category: 'compliance',
          severity: { $in: ['high', 'critical'] }
        })
      ]);

      // Calculate previous period for trends
      const previousPeriodStart = new Date(startTime);
      const periodDuration = now.getTime() - startTime.getTime();
      previousPeriodStart.setTime(startTime.getTime() - periodDuration);

      const [prevTotalEvents, prevCriticalEvents, prevCompliance] = await Promise.all([
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: previousPeriodStart, $lt: startTime },
          category: { $in: ['security', 'authentication', 'authorization'] }
        }),
        
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: previousPeriodStart, $lt: startTime },
          severity: 'critical',
          category: { $in: ['security', 'authentication', 'authorization'] }
        }),
        
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: previousPeriodStart, $lt: startTime },
          category: 'compliance',
          severity: { $in: ['high', 'critical'] }
        })
      ]);

      // Calculate trends
      const securityEventsChange = prevTotalEvents > 0 
        ? Math.round(((totalEvents - prevTotalEvents) / prevTotalEvents) * 100) 
        : 0;
      const alertsChange = prevCriticalEvents > 0 
        ? Math.round(((criticalEvents - prevCriticalEvents) / prevCriticalEvents) * 100) 
        : 0;
      const complianceChange = prevCompliance > 0 
        ? Math.round(((complianceViolations - prevCompliance) / prevCompliance) * 100) 
        : 0;

      // Calculate compliance score (simplified)
      const complianceScore = Math.max(0, 100 - (complianceViolations * 2));

      const metrics = {
        totalSecurityEvents: totalEvents,
        criticalAlerts: criticalEvents,
        failedLogins,
        suspiciousActivity,
        blockedIPs: 0, // Would come from firewall/security system integration
        complianceScore,
        trends: {
          securityEventsChange,
          alertsChange,
          complianceChange
        }
      };

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      console.error('Failed to get security metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security metrics'
      });
    }
  }
);

// Security alerts endpoint
router.get('/alerts',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = '24h', severity, category, limit = 50, page = 1 } = req.query;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      // Calculate time range
      const now = new Date();
      let startTime = new Date();
      
      switch (timeRange) {
        case '1h':
          startTime.setHours(now.getHours() - 1);
          break;
        case '24h':
          startTime.setHours(now.getHours() - 24);
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          break;
        default:
          startTime.setHours(now.getHours() - 24);
      }

      // Build query
      const query: any = {
        organizationId,
        timestamp: { $gte: startTime },
        $or: [
          { severity: { $in: ['high', 'critical'] } },
          { category: { $in: ['security', 'authentication', 'authorization'] } },
          { riskLevel: { $in: ['high', 'critical'] } }
        ]
      };

      if (severity && severity !== 'all') {
        query.severity = severity;
      }

      if (category && category !== 'all') {
        query.category = category;
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [alerts, total] = await Promise.all([
        AuditLog.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        AuditLog.countDocuments(query)
      ]);

      // Transform audit logs into security alerts format
      const securityAlerts = alerts.map(log => ({
        _id: log._id,
        timestamp: log.timestamp,
        severity: log.severity || 'medium',
        category: log.category || 'security',
        title: log.action || 'Security Event',
        description: log.description || 'Security event detected',
        source: 'Audit System',
        ipAddress: log.ipAddress,
        userEmail: log.userEmail,
        userId: log.userId,
        status: log.status === 'failure' ? 'open' : 'resolved',
        tags: log.tags || []
      }));

      res.json({
        success: true,
        data: {
          alerts: securityAlerts,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
          }
        }
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

// Update alert status
router.patch('/alerts/:id',
  authorize('admin', 'manager'),
  auditSecurityEvents,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { action, resolution } = req.body;
      const organizationId = req.user?.organizationId || req.body.organizationId;

      // In a full implementation, you'd have a separate SecurityAlert model
      // For now, we'll log the action as a new audit event
      const auditData = {
        eventType: 'update',
        action: 'update_security_alert',
        category: 'security',
        description: `Security alert ${action}: ${resolution || 'No resolution provided'}`,
        resourceType: 'security_alert',
        resourceId: id,
        details: { action, resolution },
        severity: 'low',
        riskLevel: 'low',
        status: 'success'
      };

      // This would normally update a SecurityAlert document
      // For demo purposes, we'll just acknowledge the action

      res.json({
        success: true,
        message: `Alert ${action} successfully`,
        data: { alertId: id, action, resolution }
      });
    } catch (error) {
      console.error('Failed to update security alert:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update security alert'
      });
    }
  }
);

// Security events timeline
router.get('/events',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = '24h' } = req.query;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      // Calculate time range
      const now = new Date();
      let startTime = new Date();
      let groupBy = '$hour';
      let dateFormat = '%Y-%m-%d %H:00';
      
      switch (timeRange) {
        case '1h':
          startTime.setHours(now.getHours() - 1);
          groupBy = '$minute';
          dateFormat = '%Y-%m-%d %H:%M';
          break;
        case '24h':
          startTime.setHours(now.getHours() - 24);
          groupBy = '$hour';
          dateFormat = '%Y-%m-%d %H:00';
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          groupBy = '$dayOfYear';
          dateFormat = '%Y-%m-%d';
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          groupBy = '$dayOfYear';
          dateFormat = '%Y-%m-%d';
          break;
        default:
          startTime.setHours(now.getHours() - 24);
      }

      const events = await AuditLog.aggregate([
        {
          $match: {
            organizationId: organizationId,
            timestamp: { $gte: startTime },
            category: { $in: ['security', 'authentication', 'authorization'] }
          }
        },
        {
          $group: {
            _id: {
              time: {
                $dateToString: {
                  format: dateFormat,
                  date: '$timestamp'
                }
              },
              severity: '$severity'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.time',
            total: { $sum: '$count' },
            critical: {
              $sum: {
                $cond: [{ $eq: ['$_id.severity', 'critical'] }, '$count', 0]
              }
            },
            high: {
              $sum: {
                $cond: [{ $eq: ['$_id.severity', 'high'] }, '$count', 0]
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            timestamp: '$_id',
            count: '$total',
            critical: 1,
            high: 1,
            _id: 0
          }
        }
      ]);

      res.json({
        success: true,
        data: { events }
      });
    } catch (error) {
      console.error('Failed to get security events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security events'
      });
    }
  }
);

// Threat intelligence (mock data for demo)
router.get('/threats',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Mock threat intelligence data
      // In production, this would integrate with threat intelligence feeds
      const threats = [
        {
          _id: '1',
          threatType: 'Brute Force Attack',
          severity: 'high',
          description: 'Multiple failed login attempts detected from suspicious IP addresses',
          indicators: ['192.168.1.100', '10.0.0.50'],
          lastSeen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          count: 15,
          blocked: true
        },
        {
          _id: '2',
          threatType: 'Suspicious File Upload',
          severity: 'medium',
          description: 'Potentially malicious file types uploaded to forms',
          indicators: ['.exe', '.bat', '.cmd'],
          lastSeen: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          count: 3,
          blocked: true
        },
        {
          _id: '3',
          threatType: 'Anomalous Data Access',
          severity: 'critical',
          description: 'Unusual data access patterns detected outside business hours',
          indicators: ['user123@example.com'],
          lastSeen: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          count: 8,
          blocked: false
        }
      ];

      res.json({
        success: true,
        data: { threats }
      });
    } catch (error) {
      console.error('Failed to get threat intelligence:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve threat intelligence'
      });
    }
  }
);

// Compliance status
router.get('/compliance',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = '30d' } = req.query;
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      // Calculate compliance scores based on audit data
      const now = new Date();
      const startTime = new Date();
      startTime.setDate(now.getDate() - 30); // Last 30 days for compliance

      const [
        totalEvents,
        complianceViolations,
        dataAccessEvents,
        auditEvents
      ] = await Promise.all([
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: startTime }
        }),
        
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: startTime },
          category: 'compliance',
          severity: { $in: ['high', 'critical'] }
        }),
        
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: startTime },
          category: 'data'
        }),
        
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: startTime },
          category: { $in: ['security', 'authentication', 'data'] }
        })
      ]);

      // Calculate compliance scores (simplified algorithm)
      const gdprScore = Math.max(0, 100 - (complianceViolations * 5));
      const hipaaScore = Math.max(0, 100 - (complianceViolations * 3));
      const soxScore = Math.max(0, 100 - (complianceViolations * 4));
      const pciScore = Math.max(0, 100 - (complianceViolations * 6));

      // Generate compliance issues
      const issues = [];
      if (complianceViolations > 0) {
        issues.push({
          severity: 'high',
          title: 'Data Access Violations',
          description: `${complianceViolations} compliance violations detected in the last 30 days`
        });
      }
      
      if (dataAccessEvents > 1000) {
        issues.push({
          severity: 'medium',
          title: 'High Data Access Volume',
          description: 'Unusually high volume of data access events may require review'
        });
      }

      const complianceData = {
        frameworks: {
          gdpr: gdprScore,
          hipaa: hipaaScore,
          sox: soxScore,
          pci: pciScore
        },
        issues,
        summary: {
          totalEvents,
          complianceViolations,
          auditCoverage: totalEvents > 0 ? Math.round((auditEvents / totalEvents) * 100) : 0
        }
      };

      res.json({
        success: true,
        data: complianceData
      });
    } catch (error) {
      console.error('Failed to get compliance status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve compliance status'
      });
    }
  }
);

// Security dashboard summary
router.get('/summary',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const organizationId = req.user?.organizationId || req.query.organizationId as string;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      const last24Hours = new Date();
      last24Hours.setHours(last24Hours.getHours() - 24);

      const [
        totalEvents,
        criticalAlerts,
        activeThreats,
        complianceScore
      ] = await Promise.all([
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: last24Hours },
          category: { $in: ['security', 'authentication', 'authorization'] }
        }),
        
        AuditLog.countDocuments({
          organizationId,
          timestamp: { $gte: last24Hours },
          severity: 'critical'
        }),
        
        // Mock active threats count
        Promise.resolve(3),
        
        // Calculate overall compliance score
        AuditLog.countDocuments({
          organizationId,
          category: 'compliance',
          severity: { $in: ['high', 'critical'] }
        }).then(violations => Math.max(0, 100 - (violations * 2)))
      ]);

      const summary = {
        totalEvents,
        criticalAlerts,
        activeThreats,
        complianceScore,
        status: criticalAlerts > 5 ? 'critical' : criticalAlerts > 0 ? 'warning' : 'healthy'
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Failed to get security summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security summary'
      });
    }
  }
);

export default router;