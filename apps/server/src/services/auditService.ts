import { AuditLog, IAuditLog } from '../models/AuditLog';
import { CompliancePolicy } from '../models/CompliancePolicy';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface AuditContext {
  organizationId: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  endpoint?: string;
  httpMethod?: string;
  correlationId?: string;
}

export interface AuditEventData {
  eventType: IAuditLog['eventType'];
  action: string;
  category: IAuditLog['category'];
  description: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  severity?: IAuditLog['severity'];
  riskLevel?: IAuditLog['riskLevel'];
  complianceFlags?: string[];
  dataClassification?: IAuditLog['dataClassification'];
  status?: IAuditLog['status'];
  errorMessage?: string;
  duration?: number;
  tags?: string[];
}

export class AuditService {
  private static instance: AuditService;
  
  static getInstance(): AuditService {
    if (!AuditService.instance) {
      AuditService.instance = new AuditService();
    }
    return AuditService.instance;
  }

  async logEvent(context: AuditContext, eventData: AuditEventData): Promise<IAuditLog> {
    try {
      // Determine severity and risk level if not provided
      const severity = eventData.severity || this.calculateSeverity(eventData);
      const riskLevel = eventData.riskLevel || this.calculateRiskLevel(eventData);
      
      // Get compliance flags based on the event
      const complianceFlags = eventData.complianceFlags || await this.getComplianceFlags(context, eventData);
      
      const auditLog = new AuditLog({
        organizationId: context.organizationId,
        
        // Event Information
        eventType: eventData.eventType,
        action: eventData.action,
        category: eventData.category,
        
        // Actor Information
        userId: context.userId,
        userEmail: context.userEmail,
        userName: context.userName,
        userRole: context.userRole,
        sessionId: context.sessionId,
        
        // Target Information
        resourceType: eventData.resourceType,
        resourceId: eventData.resourceId,
        resourceName: eventData.resourceName,
        
        // Request Context
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        endpoint: context.endpoint,
        httpMethod: context.httpMethod,
        
        // Event Details
        description: eventData.description,
        details: this.sanitizeDetails(eventData.details),
        oldValues: this.sanitizeDetails(eventData.oldValues),
        newValues: this.sanitizeDetails(eventData.newValues),
        
        // Classification
        severity,
        riskLevel,
        complianceFlags,
        dataClassification: eventData.dataClassification || 'internal',
        
        // Status
        status: eventData.status || 'success',
        errorMessage: eventData.errorMessage,
        duration: eventData.duration,
        
        // Metadata
        tags: eventData.tags,
        correlationId: context.correlationId || uuidv4(),
        
        timestamp: new Date()
      });

      const savedLog = await auditLog.save();
      
      // Check for real-time compliance violations
      await this.checkComplianceViolations(context.organizationId, savedLog);
      
      // Trigger alerts if needed
      await this.checkAlertThresholds(context.organizationId, savedLog);
      
      return savedLog;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      throw error;
    }
  }

  async logAuthentication(
    context: AuditContext, 
    action: 'login' | 'logout' | 'password_reset' | 'mfa_challenge',
    success: boolean,
    details?: Record<string, any>
  ): Promise<IAuditLog> {
    return this.logEvent(context, {
      eventType: action === 'logout' ? 'logout' : 'login',
      action,
      category: 'authentication',
      description: `User ${action} ${success ? 'successful' : 'failed'}`,
      details,
      severity: success ? 'low' : 'medium',
      riskLevel: success ? 'none' : 'medium',
      status: success ? 'success' : 'failure',
      complianceFlags: ['GDPR', 'ISO27001'],
      tags: ['authentication', action]
    });
  }

  async logDataAccess(
    context: AuditContext,
    resourceType: string,
    resourceId: string,
    resourceName: string,
    action: 'view' | 'download' | 'export',
    details?: Record<string, any>
  ): Promise<IAuditLog> {
    return this.logEvent(context, {
      eventType: 'read',
      action: `${resourceType}_${action}`,
      category: 'data',
      description: `User accessed ${resourceType}: ${resourceName}`,
      resourceType,
      resourceId,
      resourceName,
      details,
      severity: action === 'export' ? 'medium' : 'low',
      riskLevel: action === 'export' ? 'medium' : 'low',
      complianceFlags: ['GDPR', 'HIPAA'],
      dataClassification: details?.classification || 'internal',
      tags: ['data_access', action, resourceType]
    });
  }

  async logDataModification(
    context: AuditContext,
    resourceType: string,
    resourceId: string,
    resourceName: string,
    action: 'create' | 'update' | 'delete',
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    details?: Record<string, any>
  ): Promise<IAuditLog> {
    return this.logEvent(context, {
      eventType: action,
      action: `${resourceType}_${action}`,
      category: 'data',
      description: `User ${action}d ${resourceType}: ${resourceName}`,
      resourceType,
      resourceId,
      resourceName,
      oldValues,
      newValues,
      details,
      severity: action === 'delete' ? 'high' : 'medium',
      riskLevel: action === 'delete' ? 'high' : 'low',
      complianceFlags: ['GDPR', 'HIPAA', 'SOX'],
      tags: ['data_modification', action, resourceType]
    });
  }

  async logAdminAction(
    context: AuditContext,
    action: string,
    description: string,
    resourceType?: string,
    resourceId?: string,
    details?: Record<string, any>
  ): Promise<IAuditLog> {
    return this.logEvent(context, {
      eventType: 'admin',
      action: `admin_${action}`,
      category: 'user_management',
      description: `Admin action: ${description}`,
      resourceType,
      resourceId,
      details,
      severity: 'high',
      riskLevel: 'high',
      complianceFlags: ['SOX', 'ISO27001'],
      tags: ['admin', action]
    });
  }

  async logSecurityEvent(
    context: AuditContext,
    eventType: 'suspicious_activity' | 'failed_authorization' | 'security_violation',
    description: string,
    details?: Record<string, any>
  ): Promise<IAuditLog> {
    return this.logEvent(context, {
      eventType: 'access',
      action: eventType,
      category: 'security',
      description,
      details,
      severity: 'critical',
      riskLevel: 'critical',
      status: 'warning',
      complianceFlags: ['GDPR', 'ISO27001'],
      tags: ['security', eventType]
    });
  }

  async logSystemEvent(
    context: AuditContext,
    action: string,
    description: string,
    details?: Record<string, any>
  ): Promise<IAuditLog> {
    return this.logEvent(context, {
      eventType: 'system',
      action: `system_${action}`,
      category: 'system',
      description: `System event: ${description}`,
      details,
      severity: 'low',
      riskLevel: 'none',
      tags: ['system', action]
    });
  }

  // Helper method to create audit context from Express request
  createContextFromRequest(req: Request, organizationId: string): AuditContext {
    const user = (req as any).user;
    
    return {
      organizationId,
      userId: user?.userId,
      userEmail: user?.email,
      userName: user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : undefined,
      userRole: user?.role,
      sessionId: (req as any).sessionID,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      endpoint: req.path,
      httpMethod: req.method as any,
      correlationId: req.headers['x-correlation-id'] as string || uuidv4()
    };
  }

  // Analytics and reporting methods
  async getAuditSummary(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const summary = await AuditLog.aggregate([
      {
        $match: {
          organizationId,
          timestamp: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            eventType: '$eventType',
            status: '$status'
          },
          count: { $sum: 1 },
          avgDuration: { $avg: '$duration' }
        }
      },
      {
        $group: {
          _id: '$_id.category',
          events: {
            $push: {
              eventType: '$_id.eventType',
              status: '$_id.status',
              count: '$count',
              avgDuration: '$avgDuration'
            }
          },
          totalEvents: { $sum: '$count' }
        }
      },
      { $sort: { totalEvents: -1 } }
    ]);

    return summary;
  }

  async getSecurityAlerts(organizationId: string, hours: number = 24): Promise<IAuditLog[]> {
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return AuditLog.find({
      organizationId,
      timestamp: { $gte: startTime },
      $or: [
        { severity: { $in: ['high', 'critical'] } },
        { status: 'failure' },
        { category: 'security' }
      ]
    }).sort({ timestamp: -1 }).limit(100);
  }

  async getUserActivity(
    organizationId: string,
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<IAuditLog[]> {
    return AuditLog.find({
      organizationId,
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    }).sort({ timestamp: -1 });
  }

  async getResourceActivity(
    organizationId: string,
    resourceType: string,
    resourceId: string
  ): Promise<IAuditLog[]> {
    return AuditLog.find({
      organizationId,
      resourceType,
      resourceId
    }).sort({ timestamp: -1 }).limit(100);
  }

  async getComplianceReport(
    organizationId: string,
    complianceType?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const matchStage: any = { organizationId };
    
    if (complianceType) {
      matchStage.complianceFlags = complianceType;
    }
    
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = startDate;
      if (endDate) matchStage.timestamp.$lte = endDate;
    }

    const report = await AuditLog.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            compliance: { $arrayElemAt: ['$complianceFlags', 0] },
            severity: '$severity',
            status: '$status'
          },
          count: { $sum: 1 },
          events: { $push: '$$ROOT' }
        }
      },
      {
        $group: {
          _id: '$_id.compliance',
          severityBreakdown: {
            $push: {
              severity: '$_id.severity',
              status: '$_id.status',
              count: '$count'
            }
          },
          totalEvents: { $sum: '$count' }
        }
      }
    ]);

    return report;
  }

  // Private helper methods
  private calculateSeverity(eventData: AuditEventData): IAuditLog['severity'] {
    if (eventData.status === 'failure' && eventData.category === 'security') {
      return 'critical';
    }
    if (eventData.eventType === 'delete' || eventData.category === 'security') {
      return 'high';
    }
    if (eventData.eventType === 'update' || eventData.category === 'user_management') {
      return 'medium';
    }
    return 'low';
  }

  private calculateRiskLevel(eventData: AuditEventData): IAuditLog['riskLevel'] {
    if (eventData.status === 'failure' && eventData.category === 'authentication') {
      return 'high';
    }
    if (eventData.eventType === 'delete' || eventData.category === 'security') {
      return 'high';
    }
    if (eventData.eventType === 'export' || eventData.category === 'data') {
      return 'medium';
    }
    if (eventData.eventType === 'update') {
      return 'low';
    }
    return 'none';
  }

  private async getComplianceFlags(context: AuditContext, eventData: AuditEventData): Promise<string[]> {
    const flags: string[] = [];
    
    // Data-related events typically require GDPR compliance
    if (eventData.category === 'data' || eventData.resourceType === 'user') {
      flags.push('GDPR');
    }
    
    // Authentication and security events
    if (eventData.category === 'authentication' || eventData.category === 'security') {
      flags.push('ISO27001');
    }
    
    // Financial or administrative actions
    if (eventData.category === 'user_management' || eventData.eventType === 'admin') {
      flags.push('SOX');
    }
    
    return flags;
  }

  private sanitizeDetails(details?: Record<string, any>): Record<string, any> | undefined {
    if (!details) return undefined;
    
    const sanitized = { ...details };
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'ssn', 'creditCard'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });
    
    return sanitized;
  }

  private async checkComplianceViolations(organizationId: string, auditLog: IAuditLog): Promise<void> {
    try {
      const policies = await CompliancePolicy.find({ organizationId, isActive: true });
      
      for (const policy of policies) {
        const applicableRules = policy.getApplicableRules({
          resourceType: auditLog.resourceType,
          action: auditLog.action,
          userRole: auditLog.userRole
        });
        
        for (const rule of applicableRules) {
          // Check if rule requirements are met
          if (rule.requirements.accessLogging && !auditLog.userId) {
            // Log compliance violation
            await this.logEvent({
              organizationId,
              correlationId: auditLog.correlationId
            }, {
              eventType: 'system',
              action: 'compliance_violation',
              category: 'compliance',
              description: `Compliance violation: ${rule.name}`,
              details: {
                policyType: policy.type,
                ruleName: rule.name,
                originalEventId: auditLog._id
              },
              severity: 'high',
              riskLevel: 'high',
              status: 'warning'
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to check compliance violations:', error);
    }
  }

  private async checkAlertThresholds(organizationId: string, auditLog: IAuditLog): Promise<void> {
    try {
      // Check for suspicious activity patterns
      if (auditLog.severity === 'critical' || auditLog.status === 'failure') {
        // This would trigger real-time alerts
        console.log(`ALERT: Critical audit event for organization ${organizationId}`, {
          action: auditLog.action,
          user: auditLog.userEmail,
          severity: auditLog.severity
        });
      }
    } catch (error) {
      console.error('Failed to check alert thresholds:', error);
    }
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           'unknown';
  }
}

export default AuditService;