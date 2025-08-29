import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { DataRetentionPolicy, IDataRetentionPolicy } from '../models/DataRetentionPolicy.js';
import { Form } from '../models/Form.js';
import { AuditLog } from '../models/AuditLog.js';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { Template } from '../models/Template.js';
import { Dashboard } from '../models/Dashboard.js';
import { AuditService } from './auditService.js';

export interface ArchiveResult {
  success: boolean;
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  archiveSize: number;
  archiveLocation?: string;
  error?: string;
}

export interface RetentionExecutionResult {
  policyId: string;
  policyName: string;
  success: boolean;
  results: ArchiveResult;
  executionTime: number;
  error?: string;
}

export class DataRetentionService {
  private static instance: DataRetentionService;
  private auditService: AuditService;

  private constructor() {
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): DataRetentionService {
    if (!DataRetentionService.instance) {
      DataRetentionService.instance = new DataRetentionService();
    }
    return DataRetentionService.instance;
  }

  // Execute all ready policies
  public async executeReadyPolicies(): Promise<RetentionExecutionResult[]> {
    console.log('🗄️ Starting data retention policy execution...');

    try {
      const readyPolicies = await DataRetentionPolicy.findReadyForExecution();
      console.log(`Found ${readyPolicies.length} policies ready for execution`);

      const results: RetentionExecutionResult[] = [];

      for (const policy of readyPolicies) {
        const result = await this.executePolicy(policy);
        results.push(result);

        // Update policy execution stats
        await this.updatePolicyStats(policy, result);
      }

      console.log('🗄️ Data retention policy execution completed');
      return results;
    } catch (error) {
      console.error('Failed to execute retention policies:', error);
      throw error;
    }
  }

  // Execute a specific policy
  public async executePolicy(policy: IDataRetentionPolicy): Promise<RetentionExecutionResult> {
    const startTime = Date.now();
    console.log(`Executing retention policy: ${policy.name} (${policy.entityType})`);

    try {
      // Check for legal hold
      if (policy.legalHold?.enabled && policy.legalHold.exemptFromDeletion) {
        console.log(`Policy ${policy.name} is under legal hold, skipping execution`);
        return {
          policyId: policy._id.toString(),
          policyName: policy.name,
          success: true,
          results: {
            success: true,
            recordsProcessed: 0,
            recordsArchived: 0,
            recordsDeleted: 0,
            archiveSize: 0,
          },
          executionTime: 0,
        };
      }

      let results: ArchiveResult;

      switch (policy.entityType) {
        case 'form':
          results = await this.processFormRetention(policy);
          break;
        case 'auditLog':
          results = await this.processAuditLogRetention(policy);
          break;
        case 'report':
          results = await this.processReportRetention(policy);
          break;
        case 'user':
          results = await this.processUserRetention(policy);
          break;
        case 'template':
          results = await this.processTemplateRetention(policy);
          break;
        case 'dashboard':
          results = await this.processDashboardRetention(policy);
          break;
        case 'all':
          results = await this.processAllEntitiesRetention(policy);
          break;
        default:
          throw new Error(`Unsupported entity type: ${policy.entityType}`);
      }

      const executionTime = Date.now() - startTime;

      // Log audit event
      await this.logRetentionEvent(policy, results, executionTime);

      return {
        policyId: policy._id.toString(),
        policyName: policy.name,
        success: true,
        results,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`Failed to execute policy ${policy.name}:`, error);

      return {
        policyId: policy._id.toString(),
        policyName: policy.name,
        success: false,
        results: {
          success: false,
          recordsProcessed: 0,
          recordsArchived: 0,
          recordsDeleted: 0,
          archiveSize: 0,
          error: error.message,
        },
        executionTime,
        error: error.message,
      };
    }
  }

  // Process form retention
  private async processFormRetention(policy: IDataRetentionPolicy): Promise<ArchiveResult> {
    const cutoffDate = policy.getCutoffDate();
    const query: any = {
      createdAt: { $lt: cutoffDate },
      organizationId: policy.organizationId,
    };

    // Apply additional conditions
    this.applyConditions(query, policy.conditions);

    const forms = await Form.find(query).lean();
    console.log(`Found ${forms.length} forms for retention processing`);

    let archiveLocation: string | undefined;
    let archiveSize = 0;

    if (policy.archiveBeforeDelete && forms.length > 0) {
      const archiveResult = await this.archiveData(forms, 'forms', policy);
      archiveLocation = archiveResult.location;
      archiveSize = archiveResult.size;
    }

    // Delete the records
    const deleteResult = await Form.deleteMany(query);

    return {
      success: true,
      recordsProcessed: forms.length,
      recordsArchived: policy.archiveBeforeDelete ? forms.length : 0,
      recordsDeleted: deleteResult.deletedCount || 0,
      archiveSize,
      archiveLocation,
    };
  }

  // Process audit log retention
  private async processAuditLogRetention(policy: IDataRetentionPolicy): Promise<ArchiveResult> {
    const cutoffDate = policy.getCutoffDate();
    const query: any = {
      timestamp: { $lt: cutoffDate },
      organizationId: policy.organizationId,
    };

    this.applyConditions(query, policy.conditions);

    const auditLogs = await AuditLog.find(query).lean();
    console.log(`Found ${auditLogs.length} audit logs for retention processing`);

    let archiveLocation: string | undefined;
    let archiveSize = 0;

    if (policy.archiveBeforeDelete && auditLogs.length > 0) {
      const archiveResult = await this.archiveData(auditLogs, 'audit-logs', policy);
      archiveLocation = archiveResult.location;
      archiveSize = archiveResult.size;
    }

    const deleteResult = await AuditLog.deleteMany(query);

    return {
      success: true,
      recordsProcessed: auditLogs.length,
      recordsArchived: policy.archiveBeforeDelete ? auditLogs.length : 0,
      recordsDeleted: deleteResult.deletedCount || 0,
      archiveSize,
      archiveLocation,
    };
  }

  // Process report retention
  private async processReportRetention(policy: IDataRetentionPolicy): Promise<ArchiveResult> {
    const cutoffDate = policy.getCutoffDate();
    const query: any = {
      createdAt: { $lt: cutoffDate },
      organizationId: policy.organizationId,
    };

    this.applyConditions(query, policy.conditions);

    const reports = await Report.find(query).lean();
    console.log(`Found ${reports.length} reports for retention processing`);

    let archiveLocation: string | undefined;
    let archiveSize = 0;

    if (policy.archiveBeforeDelete && reports.length > 0) {
      const archiveResult = await this.archiveData(reports, 'reports', policy);
      archiveLocation = archiveResult.location;
      archiveSize = archiveResult.size;
    }

    const deleteResult = await Report.deleteMany(query);

    return {
      success: true,
      recordsProcessed: reports.length,
      recordsArchived: policy.archiveBeforeDelete ? reports.length : 0,
      recordsDeleted: deleteResult.deletedCount || 0,
      archiveSize,
      archiveLocation,
    };
  }

  // Process user retention (for inactive users)
  private async processUserRetention(policy: IDataRetentionPolicy): Promise<ArchiveResult> {
    const cutoffDate = policy.getCutoffDate();
    const query: any = {
      lastLogin: { $lt: cutoffDate },
      isActive: false,
      organizationId: policy.organizationId,
    };

    this.applyConditions(query, policy.conditions);

    const users = await User.find(query).select('-password').lean();
    console.log(`Found ${users.length} inactive users for retention processing`);

    let archiveLocation: string | undefined;
    let archiveSize = 0;

    if (policy.archiveBeforeDelete && users.length > 0) {
      const archiveResult = await this.archiveData(users, 'users', policy);
      archiveLocation = archiveResult.location;
      archiveSize = archiveResult.size;
    }

    const deleteResult = await User.deleteMany(query);

    return {
      success: true,
      recordsProcessed: users.length,
      recordsArchived: policy.archiveBeforeDelete ? users.length : 0,
      recordsDeleted: deleteResult.deletedCount || 0,
      archiveSize,
      archiveLocation,
    };
  }

  // Process template retention
  private async processTemplateRetention(policy: IDataRetentionPolicy): Promise<ArchiveResult> {
    const cutoffDate = policy.getCutoffDate();
    const query: any = {
      createdAt: { $lt: cutoffDate },
      isActive: false, // Only delete inactive templates
      organizationId: policy.organizationId,
    };

    this.applyConditions(query, policy.conditions);

    const templates = await Template.find(query).lean();
    console.log(`Found ${templates.length} inactive templates for retention processing`);

    let archiveLocation: string | undefined;
    let archiveSize = 0;

    if (policy.archiveBeforeDelete && templates.length > 0) {
      const archiveResult = await this.archiveData(templates, 'templates', policy);
      archiveLocation = archiveResult.location;
      archiveSize = archiveResult.size;
    }

    const deleteResult = await Template.deleteMany(query);

    return {
      success: true,
      recordsProcessed: templates.length,
      recordsArchived: policy.archiveBeforeDelete ? templates.length : 0,
      recordsDeleted: deleteResult.deletedCount || 0,
      archiveSize,
      archiveLocation,
    };
  }

  // Process dashboard retention
  private async processDashboardRetention(policy: IDataRetentionPolicy): Promise<ArchiveResult> {
    const cutoffDate = policy.getCutoffDate();
    const query: any = {
      lastAccessed: { $lt: cutoffDate },
      organizationId: policy.organizationId,
    };

    this.applyConditions(query, policy.conditions);

    const dashboards = await Dashboard.find(query).lean();
    console.log(`Found ${dashboards.length} unused dashboards for retention processing`);

    let archiveLocation: string | undefined;
    let archiveSize = 0;

    if (policy.archiveBeforeDelete && dashboards.length > 0) {
      const archiveResult = await this.archiveData(dashboards, 'dashboards', policy);
      archiveLocation = archiveResult.location;
      archiveSize = archiveResult.size;
    }

    const deleteResult = await Dashboard.deleteMany(query);

    return {
      success: true,
      recordsProcessed: dashboards.length,
      recordsArchived: policy.archiveBeforeDelete ? dashboards.length : 0,
      recordsDeleted: deleteResult.deletedCount || 0,
      archiveSize,
      archiveLocation,
    };
  }

  // Process all entities retention
  private async processAllEntitiesRetention(policy: IDataRetentionPolicy): Promise<ArchiveResult> {
    const results: ArchiveResult[] = [];

    // Create individual policies for each entity type
    const entityTypes: Array<IDataRetentionPolicy['entityType']> = [
      'form',
      'auditLog',
      'report',
      'user',
      'template',
      'dashboard',
    ];

    for (const entityType of entityTypes) {
      if (entityType === 'all') continue;

      const tempPolicy = { ...policy.toObject(), entityType } as IDataRetentionPolicy;
      tempPolicy.getCutoffDate = policy.getCutoffDate.bind(policy);

      let result: ArchiveResult;

      switch (entityType) {
        case 'form':
          result = await this.processFormRetention(tempPolicy);
          break;
        case 'auditLog':
          result = await this.processAuditLogRetention(tempPolicy);
          break;
        case 'report':
          result = await this.processReportRetention(tempPolicy);
          break;
        case 'user':
          result = await this.processUserRetention(tempPolicy);
          break;
        case 'template':
          result = await this.processTemplateRetention(tempPolicy);
          break;
        case 'dashboard':
          result = await this.processDashboardRetention(tempPolicy);
          break;
        default:
          continue;
      }

      results.push(result);
    }

    // Combine results
    return {
      success: results.every(r => r.success),
      recordsProcessed: results.reduce((sum, r) => sum + r.recordsProcessed, 0),
      recordsArchived: results.reduce((sum, r) => sum + r.recordsArchived, 0),
      recordsDeleted: results.reduce((sum, r) => sum + r.recordsDeleted, 0),
      archiveSize: results.reduce((sum, r) => sum + r.archiveSize, 0),
    };
  }

  // Apply additional conditions to query
  private applyConditions(query: any, conditions?: IDataRetentionPolicy['conditions']): void {
    if (!conditions || conditions.length === 0) return;

    for (const condition of conditions) {
      switch (condition.operator) {
        case 'equals':
          query[condition.field] = condition.value;
          break;
        case 'not_equals':
          query[condition.field] = { $ne: condition.value };
          break;
        case 'greater_than':
          query[condition.field] = { $gt: condition.value };
          break;
        case 'less_than':
          query[condition.field] = { $lt: condition.value };
          break;
        case 'contains':
          query[condition.field] = { $regex: condition.value, $options: 'i' };
          break;
        case 'exists':
          query[condition.field] = { $exists: condition.value };
          break;
      }
    }
  }

  // Archive data to file system
  private async archiveData(
    data: any[],
    entityType: string,
    policy: IDataRetentionPolicy
  ): Promise<{ location: string; size: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const orgId = policy.organizationId.toString();
    const archiveDir = policy.archiveLocation || path.join(process.cwd(), 'archives', orgId);

    // Ensure archive directory exists
    await fs.mkdir(archiveDir, { recursive: true });

    const fileName = `${entityType}-${timestamp}`;
    let filePath: string;
    let size = 0;

    switch (policy.archiveFormat) {
      case 'json':
        filePath = path.join(archiveDir, `${fileName}.json`);
        const jsonData = JSON.stringify(data, null, 2);
        await fs.writeFile(filePath, jsonData);
        size = Buffer.byteLength(jsonData);
        break;

      case 'csv':
        filePath = path.join(archiveDir, `${fileName}.csv`);
        const csvData = this.convertToCSV(data);
        await fs.writeFile(filePath, csvData);
        size = Buffer.byteLength(csvData);
        break;

      case 'compressed':
      default:
        filePath = path.join(archiveDir, `${fileName}.json.gz`);
        const compressedData = JSON.stringify(data);

        const writeStream = createWriteStream(filePath);
        const gzipStream = createGzip();

        await pipeline(require('stream').Readable.from([compressedData]), gzipStream, writeStream);

        const stats = await fs.stat(filePath);
        size = stats.size;
        break;
    }

    console.log(`Archived ${data.length} ${entityType} records to ${filePath} (${size} bytes)`);

    return { location: filePath, size };
  }

  // Convert data to CSV format
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    data.forEach(record => {
      const row = headers.map(header => {
        let value = record[header];
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        // Escape CSV values
        return `"${String(value || '').replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  // Update policy execution statistics
  private async updatePolicyStats(
    policy: IDataRetentionPolicy,
    result: RetentionExecutionResult
  ): Promise<void> {
    const updateData: any = {
      'stats.lastExecuted': new Date(),
    };

    if (result.success) {
      updateData.$inc = {
        'stats.recordsArchived': result.results.recordsArchived,
        'stats.recordsDeleted': result.results.recordsDeleted,
        'stats.totalSizeArchived': result.results.archiveSize,
      };
    } else {
      updateData.$inc = {
        'stats.errors.count': 1,
      };
      updateData['stats.errors.lastError'] = result.error;
      updateData['stats.errors.lastErrorAt'] = new Date();
    }

    await DataRetentionPolicy.findByIdAndUpdate(policy._id, updateData);
  }

  // Log retention event for audit
  private async logRetentionEvent(
    policy: IDataRetentionPolicy,
    result: ArchiveResult,
    executionTime: number
  ): Promise<void> {
    try {
      const context = {
        organizationId: policy.organizationId.toString(),
        userId: policy.createdBy.toString(),
        userEmail: 'system',
        userName: 'Data Retention Service',
        userRole: 'system' as const,
        ipAddress: '127.0.0.1',
        userAgent: 'Data Retention Service',
        sessionId: `retention-${Date.now()}`,
        requestId: `ret-${policy._id}-${Date.now()}`,
      };

      await this.auditService.logEvent(context, {
        eventType: 'delete',
        action: 'execute_retention_policy',
        category: 'data',
        description: `Executed data retention policy: ${policy.name}`,
        resourceType: 'retention_policy',
        resourceId: policy._id.toString(),
        resourceName: policy.name,
        details: {
          policyName: policy.name,
          entityType: policy.entityType,
          recordsProcessed: result.recordsProcessed,
          recordsArchived: result.recordsArchived,
          recordsDeleted: result.recordsDeleted,
          archiveSize: result.archiveSize,
          archiveLocation: result.archiveLocation,
          executionTime,
          success: result.success,
        },
        severity: result.success ? 'low' : 'high',
        riskLevel: result.recordsDeleted > 1000 ? 'medium' : 'low',
        dataClassification: 'internal',
        status: result.success ? 'success' : 'failure',
        duration: executionTime,
        tags: ['retention', 'archive', 'deletion', policy.entityType],
      });
    } catch (error) {
      console.error('Failed to log retention audit event:', error);
    }
  }

  // Get retention statistics
  public async getRetentionStatistics(organizationId: string): Promise<any> {
    const policies = await DataRetentionPolicy.find({ organizationId }).lean();

    const stats = {
      totalPolicies: policies.length,
      activePolicies: policies.filter(p => p.isActive).length,
      totalRecordsArchived: policies.reduce((sum, p) => sum + p.stats.recordsArchived, 0),
      totalRecordsDeleted: policies.reduce((sum, p) => sum + p.stats.recordsDeleted, 0),
      totalSizeArchived: policies.reduce((sum, p) => sum + p.stats.totalSizeArchived, 0),
      totalErrors: policies.reduce((sum, p) => sum + p.stats.errors.count, 0),
      lastExecution: policies.reduce(
        (latest, p) => {
          if (!p.stats.lastExecuted) return latest;
          return !latest || p.stats.lastExecuted > latest ? p.stats.lastExecuted : latest;
        },
        null as Date | null
      ),
      policiesByEntityType: policies.reduce(
        (acc, p) => {
          acc[p.entityType] = (acc[p.entityType] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ),
    };

    return stats;
  }
}
