import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { AuditService } from './auditService.js';

export interface ThreatAlert {
  id: string;
  type:
    | 'brute_force'
    | 'anomalous_access'
    | 'suspicious_activity'
    | 'data_exfiltration'
    | 'privilege_escalation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  indicators: string[];
  affectedUser?: string;
  sourceIP?: string;
  detectedAt: Date;
  confidence: number; // 0-100
  evidence: any[];
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  type: string;
  enabled: boolean;
  conditions: any;
  action: 'alert' | 'block' | 'log';
  severity: string;
}

export class ThreatDetectionService {
  private static instance: ThreatDetectionService;
  private auditService: AuditService;

  private constructor() {
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): ThreatDetectionService {
    if (!ThreatDetectionService.instance) {
      ThreatDetectionService.instance = new ThreatDetectionService();
    }
    return ThreatDetectionService.instance;
  }

  // Main threat detection analysis
  public async analyzeThreats(
    organizationId: string,
    timeWindowHours: number = 24
  ): Promise<ThreatAlert[]> {
    console.log(`🔍 Starting threat analysis for organization ${organizationId}`);

    const threats: ThreatAlert[] = [];
    const now = new Date();
    const startTime = new Date(now.getTime() - timeWindowHours * 60 * 60 * 1000);

    try {
      // Run all detection rules
      const detectionPromises = [
        this.detectBruteForceAttacks(organizationId, startTime, now),
        this.detectAnomalousAccess(organizationId, startTime, now),
        this.detectSuspiciousActivity(organizationId, startTime, now),
        this.detectDataExfiltration(organizationId, startTime, now, timeWindowHours),
        this.detectPrivilegeEscalation(organizationId, startTime, now),
      ];

      const results = await Promise.all(detectionPromises);
      results.forEach(threatList => threats.push(...threatList));

      console.log(`🔍 Threat analysis completed: ${threats.length} threats detected`);

      // Log detected threats for audit
      for (const threat of threats) {
        await this.logThreatDetection(organizationId, threat);
      }

      return threats;
    } catch (error) {
      console.error('Threat analysis failed:', error);
      throw error;
    }
  }

  // Detect brute force attacks (multiple failed logins)
  private async detectBruteForceAttacks(
    organizationId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ThreatAlert[]> {
    const threats: ThreatAlert[] = [];

    try {
      // Find IPs with multiple failed login attempts
      const bruteForceAttempts = await AuditLog.aggregate([
        {
          $match: {
            organizationId,
            timestamp: { $gte: startTime, $lte: endTime },
            category: 'authentication',
            status: 'failure',
            ipAddress: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: {
              ipAddress: '$ipAddress',
              userEmail: '$userEmail',
            },
            count: { $sum: 1 },
            attempts: { $push: '$$ROOT' },
          },
        },
        {
          $match: {
            count: { $gte: 5 }, // 5 or more failed attempts
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      for (const attempt of bruteForceAttempts) {
        const severity = this.calculateBruteForceSeverity(attempt.count);
        const confidence = Math.min(95, attempt.count * 10);

        threats.push({
          id: `brute_force_${attempt._id.ipAddress}_${Date.now()}`,
          type: 'brute_force',
          severity,
          title: 'Brute Force Attack Detected',
          description: `${attempt.count} failed login attempts from IP ${attempt._id.ipAddress} targeting user ${attempt._id.userEmail || 'multiple users'}`,
          indicators: [attempt._id.ipAddress, attempt._id.userEmail].filter(Boolean),
          affectedUser: attempt._id.userEmail,
          sourceIP: attempt._id.ipAddress,
          detectedAt: new Date(),
          confidence,
          evidence: attempt.attempts.slice(0, 5), // Include first 5 attempts as evidence
        });
      }
    } catch (error) {
      console.error('Failed to detect brute force attacks:', error);
    }

    return threats;
  }

  // Detect anomalous access patterns
  private async detectAnomalousAccess(
    organizationId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ThreatAlert[]> {
    const threats: ThreatAlert[] = [];

    try {
      // Find users accessing data at unusual times
      const now = new Date();
      const currentHour = now.getHours();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      const isBusinessHours = currentHour >= 8 && currentHour <= 18 && !isWeekend;

      if (!isBusinessHours) {
        const outOfHoursAccess = await AuditLog.find({
          organizationId,
          timestamp: { $gte: startTime, $lte: endTime },
          category: 'data',
          eventType: { $in: ['read', 'export'] },
          userEmail: { $exists: true },
        }).lean();

        // Group by user
        const userAccess: Record<string, any[]> = {};
        outOfHoursAccess.forEach(log => {
          if (!userAccess[log.userEmail!]) {
            userAccess[log.userEmail!] = [];
          }
          userAccess[log.userEmail!].push(log);
        });

        // Check for users with significant out-of-hours activity
        for (const [userEmail, activities] of Object.entries(userAccess)) {
          if (activities.length >= 3) {
            // 3+ activities outside business hours
            threats.push({
              id: `anomalous_access_${userEmail}_${Date.now()}`,
              type: 'anomalous_access',
              severity: 'medium',
              title: 'Anomalous Access Pattern',
              description: `User ${userEmail} accessed ${activities.length} data resources outside business hours`,
              indicators: [userEmail],
              affectedUser: userEmail,
              detectedAt: new Date(),
              confidence: 75,
              evidence: activities.slice(0, 3),
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to detect anomalous access:', error);
    }

    return threats;
  }

  // Detect suspicious activity patterns
  private async detectSuspiciousActivity(
    organizationId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ThreatAlert[]> {
    const threats: ThreatAlert[] = [];

    try {
      // Find users with rapid sequential actions (possible automation)
      const rapidActions = await AuditLog.aggregate([
        {
          $match: {
            organizationId,
            timestamp: { $gte: startTime, $lte: endTime },
            userEmail: { $exists: true },
          },
        },
        {
          $sort: { timestamp: 1 },
        },
        {
          $group: {
            _id: '$userEmail',
            actions: { $push: '$$ROOT' },
          },
        },
      ]);

      for (const userActions of rapidActions) {
        const actions = userActions.actions;
        let suspiciousSequences = 0;

        // Check for rapid sequential actions (< 1 second apart)
        for (let i = 1; i < actions.length; i++) {
          const timeDiff =
            new Date(actions[i].timestamp).getTime() - new Date(actions[i - 1].timestamp).getTime();
          if (timeDiff < 1000) {
            // Less than 1 second
            suspiciousSequences++;
          }
        }

        if (suspiciousSequences >= 5) {
          // 5+ rapid actions
          threats.push({
            id: `suspicious_activity_${userActions._id}_${Date.now()}`,
            type: 'suspicious_activity',
            severity: 'medium',
            title: 'Suspicious Activity Pattern',
            description: `User ${userActions._id} performed ${suspiciousSequences} rapid sequential actions (possible automation)`,
            indicators: [userActions._id],
            affectedUser: userActions._id,
            detectedAt: new Date(),
            confidence: 70,
            evidence: actions.slice(-5), // Last 5 actions as evidence
          });
        }
      }
    } catch (error) {
      console.error('Failed to detect suspicious activity:', error);
    }

    return threats;
  }

  // Detect data exfiltration attempts
  private async detectDataExfiltration(
    organizationId: string,
    startTime: Date,
    endTime: Date,
    timeWindowHours: number = 24
  ): Promise<ThreatAlert[]> {
    const threats: ThreatAlert[] = [];

    try {
      // Find users with excessive data exports
      const dataExports = await AuditLog.aggregate([
        {
          $match: {
            organizationId,
            timestamp: { $gte: startTime, $lte: endTime },
            eventType: 'export',
            userEmail: { $exists: true },
          },
        },
        {
          $group: {
            _id: '$userEmail',
            exportCount: { $sum: 1 },
            exports: { $push: '$$ROOT' },
          },
        },
        {
          $match: {
            exportCount: { $gte: 10 }, // 10+ exports in timeframe
          },
        },
      ]);

      for (const userExports of dataExports) {
        const severity = userExports.exportCount >= 20 ? 'high' : 'medium';
        const confidence = Math.min(90, userExports.exportCount * 5);

        threats.push({
          id: `data_exfiltration_${userExports._id}_${Date.now()}`,
          type: 'data_exfiltration',
          severity,
          title: 'Potential Data Exfiltration',
          description: `User ${userExports._id} performed ${userExports.exportCount} data exports in ${timeWindowHours}h window`,
          indicators: [userExports._id],
          affectedUser: userExports._id,
          detectedAt: new Date(),
          confidence,
          evidence: userExports.exports.slice(0, 5),
        });
      }
    } catch (error) {
      console.error('Failed to detect data exfiltration:', error);
    }

    return threats;
  }

  // Detect privilege escalation attempts
  private async detectPrivilegeEscalation(
    organizationId: string,
    startTime: Date,
    endTime: Date
  ): Promise<ThreatAlert[]> {
    const threats: ThreatAlert[] = [];

    try {
      // Find failed authorization attempts by non-admin users
      const authorizationFailures = await AuditLog.aggregate([
        {
          $match: {
            organizationId,
            timestamp: { $gte: startTime, $lte: endTime },
            category: 'authorization',
            status: 'failure',
            userRole: { $in: ['technician', 'manager'] }, // Non-admin users
            userEmail: { $exists: true },
          },
        },
        {
          $group: {
            _id: '$userEmail',
            failureCount: { $sum: 1 },
            failures: { $push: '$$ROOT' },
          },
        },
        {
          $match: {
            failureCount: { $gte: 3 }, // 3+ authorization failures
          },
        },
      ]);

      for (const userFailures of authorizationFailures) {
        threats.push({
          id: `privilege_escalation_${userFailures._id}_${Date.now()}`,
          type: 'privilege_escalation',
          severity: 'high',
          title: 'Privilege Escalation Attempt',
          description: `User ${userFailures._id} attempted to access restricted resources ${userFailures.failureCount} times`,
          indicators: [userFailures._id],
          affectedUser: userFailures._id,
          detectedAt: new Date(),
          confidence: 85,
          evidence: userFailures.failures.slice(0, 3),
        });
      }
    } catch (error) {
      console.error('Failed to detect privilege escalation:', error);
    }

    return threats;
  }

  // Calculate severity for brute force attacks
  private calculateBruteForceSeverity(
    attemptCount: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (attemptCount >= 50) return 'critical';
    if (attemptCount >= 20) return 'high';
    if (attemptCount >= 10) return 'medium';
    return 'low';
  }

  // Log threat detection for audit trail
  private async logThreatDetection(organizationId: string, threat: ThreatAlert): Promise<void> {
    try {
      const context = {
        organizationId,
        userId: 'system',
        userEmail: 'system@threatdetection',
        userName: 'Threat Detection System',
        userRole: 'system' as const,
        ipAddress: '127.0.0.1',
        userAgent: 'ThreatDetectionService',
        sessionId: `threat-${Date.now()}`,
        requestId: `threat-${threat.id}`,
      };

      await this.auditService.logEvent(context, {
        eventType: 'create',
        action: 'threat_detected',
        category: 'security',
        description: `Threat detected: ${threat.title}`,
        resourceType: 'threat_alert',
        resourceId: threat.id,
        resourceName: threat.type,
        details: {
          threatType: threat.type,
          severity: threat.severity,
          confidence: threat.confidence,
          indicators: threat.indicators,
          affectedUser: threat.affectedUser,
          sourceIP: threat.sourceIP,
          evidenceCount: threat.evidence.length,
        },
        severity: threat.severity,
        riskLevel: threat.severity,
        dataClassification: 'confidential',
        status: 'success',
        tags: ['threat_detection', 'security', threat.type],
      });
    } catch (error) {
      console.error('Failed to log threat detection:', error);
    }
  }

  // Get threat statistics
  public async getThreatStatistics(organizationId: string, days: number = 7): Promise<any> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - days * 24 * 60 * 60 * 1000);

    try {
      const stats = await AuditLog.aggregate([
        {
          $match: {
            organizationId,
            timestamp: { $gte: startTime, $lte: endTime },
            category: 'security',
            action: 'threat_detected',
          },
        },
        {
          $group: {
            _id: {
              threatType: '$details.threatType',
              severity: '$severity',
            },
            count: { $sum: 1 },
            latestDetection: { $max: '$timestamp' },
          },
        },
        {
          $group: {
            _id: '$_id.threatType',
            totalCount: { $sum: '$count' },
            severityBreakdown: {
              $push: {
                severity: '$_id.severity',
                count: '$count',
              },
            },
            latestDetection: { $max: '$latestDetection' },
          },
        },
      ]);

      return {
        totalThreats: stats.reduce((sum, stat) => sum + stat.totalCount, 0),
        threatTypes: stats,
        detectionPeriod: {
          start: startTime,
          end: endTime,
          days,
        },
      };
    } catch (error) {
      console.error('Failed to get threat statistics:', error);
      throw error;
    }
  }

  // Get active threats (recent detections)
  public async getActiveThreats(
    organizationId: string,
    hours: number = 24
  ): Promise<ThreatAlert[]> {
    const threats = await this.analyzeThreats(organizationId, hours);

    // Filter for recent high-priority threats
    return threats
      .filter(
        threat =>
          threat.severity === 'critical' || threat.severity === 'high' || threat.confidence >= 80
      )
      .sort((a, b) => {
        // Sort by severity and confidence
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.confidence - a.confidence;
      });
  }
}
