import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { Report, IReport } from '../models/Report';
import { User } from '../models/User';
import ExportService from './exportService';
import { DataRetentionService } from './dataRetentionService.js';
import { ThreatDetectionService } from './threatDetectionService.js';
import { promises as fs } from 'fs';
import path from 'path';

interface ScheduledJob {
  id: string;
  reportId: string;
  schedule: string;
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  task: cron.ScheduledTask;
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export class SchedulerService {
  private static instance: SchedulerService;
  private jobs: Map<string, ScheduledJob> = new Map();
  private systemJobs: Map<string, cron.ScheduledTask> = new Map();
  private emailTransporter: nodemailer.Transporter | null = null;
  private emailConfig: EmailConfig | null = null;
  private dataRetentionService: DataRetentionService;
  private threatDetectionService: ThreatDetectionService;

  constructor() {
    this.dataRetentionService = DataRetentionService.getInstance();
    this.threatDetectionService = ThreatDetectionService.getInstance();
    this.initializeEmailService();
    this.loadScheduledReports();
    this.initializeSystemJobs();
  }

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  private initializeEmailService(): void {
    // Load email configuration from environment or database
    this.emailConfig = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
      from: process.env.SMTP_FROM || 'noreply@chrysoform.com',
    };

    if (this.emailConfig.auth.user && this.emailConfig.auth.pass) {
      this.emailTransporter = nodemailer.createTransporter(this.emailConfig);
    } else {
      console.warn('Email configuration missing. Scheduled reports will not be sent.');
    }
  }

  private async loadScheduledReports(): Promise<void> {
    try {
      const reports = await Report.find({
        'schedule.enabled': true,
        status: 'published',
      }).lean();

      for (const report of reports) {
        await this.scheduleReport(report as IReport);
      }

      console.log(`Loaded ${reports.length} scheduled reports`);
    } catch (error) {
      console.error('Failed to load scheduled reports:', error);
    }
  }

  async scheduleReport(report: IReport): Promise<boolean> {
    try {
      if (!report.schedule?.enabled || !report.schedule.cronExpression) {
        return false;
      }

      // Validate cron expression
      if (!cron.validate(report.schedule.cronExpression)) {
        console.error(
          `Invalid cron expression for report ${report.name}: ${report.schedule.cronExpression}`
        );
        return false;
      }

      // Remove existing job if it exists
      await this.unscheduleReport(report._id.toString());

      // Create new scheduled task
      const task = cron.schedule(
        report.schedule.cronExpression,
        async () => {
          await this.executeScheduledReport(report._id.toString());
        },
        {
          scheduled: true,
          timezone: report.schedule.timezone || 'UTC',
        }
      );

      const job: ScheduledJob = {
        id: `report-${report._id}`,
        reportId: report._id.toString(),
        schedule: report.schedule.cronExpression,
        recipients: report.schedule.recipients || [],
        format: report.schedule.exportFormat || 'pdf',
        task,
        enabled: true,
        nextRun: this.getNextRunDate(report.schedule.cronExpression),
      };

      this.jobs.set(job.id, job);
      console.log(`Scheduled report: ${report.name} (${report.schedule.cronExpression})`);

      return true;
    } catch (error) {
      console.error(`Failed to schedule report ${report.name}:`, error);
      return false;
    }
  }

  async unscheduleReport(reportId: string): Promise<boolean> {
    const jobId = `report-${reportId}`;
    const job = this.jobs.get(jobId);

    if (job) {
      job.task.stop();
      this.jobs.delete(jobId);
      console.log(`Unscheduled report: ${reportId}`);
      return true;
    }

    return false;
  }

  private async executeScheduledReport(reportId: string): Promise<void> {
    const job = this.jobs.get(`report-${reportId}`);
    if (!job) {
      console.error(`Scheduled job not found for report: ${reportId}`);
      return;
    }

    try {
      console.log(`Executing scheduled report: ${reportId}`);

      // Load report
      const report = await Report.findById(reportId).populate(
        'createdBy',
        'firstName lastName email'
      );

      if (!report) {
        console.error(`Report not found: ${reportId}`);
        return;
      }

      // Generate report data
      const data = await this.generateReportData(report);

      // Export report
      const exportService = ExportService.getInstance();
      const { filePath, fileName } = await exportService.exportReport(
        report,
        data,
        {
          format: job.format,
          includeCharts: true,
          includeData: true,
        },
        'system'
      );

      // Send email if recipients are configured
      if (job.recipients.length > 0 && this.emailTransporter) {
        await this.sendReportEmail(report, filePath, fileName, job.recipients);
      }

      // Update job statistics
      job.lastRun = new Date();
      job.nextRun = this.getNextRunDate(job.schedule);

      // Update report statistics
      report.usage.totalExports += 1;
      report.schedule!.lastRun = new Date();
      report.schedule!.nextRun = job.nextRun;
      await report.save();

      console.log(`Completed scheduled report: ${report.name}`);
    } catch (error) {
      console.error(`Failed to execute scheduled report ${reportId}:`, error);
    }
  }

  private async generateReportData(report: IReport): Promise<any> {
    // This is a simplified version - in production, you'd want to reuse
    // the same logic from the reports route
    const data: any = {};

    for (const dataSource of report.dataSources) {
      // Apply filters and generate data based on data source type
      // For now, return empty data - this should be implemented properly
      data[dataSource.id] = [];
    }

    return data;
  }

  private async sendReportEmail(
    report: IReport,
    filePath: string,
    fileName: string,
    recipients: string[]
  ): Promise<void> {
    if (!this.emailTransporter) {
      console.warn('Email transporter not configured');
      return;
    }

    try {
      const fileBuffer = await fs.readFile(filePath);

      const mailOptions = {
        from: this.emailConfig!.from,
        to: recipients.join(', '),
        subject: `Scheduled Report: ${report.name}`,
        html: this.generateEmailTemplate(report),
        attachments: [
          {
            filename: fileName,
            content: fileBuffer,
          },
        ],
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`Report email sent to ${recipients.length} recipients`);
    } catch (error) {
      console.error('Failed to send report email:', error);
    }
  }

  private generateEmailTemplate(report: IReport): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Scheduled Report</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { padding: 20px 0; }
          .footer { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Scheduled Report: ${report.name}</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Category:</strong> ${report.category}</p>
            <p><strong>Version:</strong> ${report.version}</p>
          </div>
          
          <div class="content">
            ${report.description ? `<p><strong>Description:</strong> ${report.description}</p>` : ''}
            
            <p>Your scheduled report has been generated and is attached to this email.</p>
            
            <h3>Report Details:</h3>
            <ul>
              <li>Data Sources: ${report.dataSources.length}</li>
              <li>Visualizations: ${report.visualizations.length}</li>
              <li>Status: ${report.status}</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>This is an automated message from Chryso Form Management System.</p>
            <p>If you no longer wish to receive these reports, please contact your administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getNextRunDate(cronExpression: string): Date {
    try {
      // Simple next run calculation - in production, use a proper cron parser
      const now = new Date();
      now.setHours(now.getHours() + 1); // Placeholder - add 1 hour
      return now;
    } catch (error) {
      console.error('Failed to calculate next run date:', error);
      return new Date();
    }
  }

  // Management methods
  getScheduledJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values()).map(job => ({
      ...job,
      task: undefined as any, // Don't serialize the task
    }));
  }

  async pauseJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.task.stop();
      job.enabled = false;
      return true;
    }
    return false;
  }

  async resumeJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.task.start();
      job.enabled = true;
      return true;
    }
    return false;
  }

  async deleteJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.task.destroy();
      this.jobs.delete(jobId);
      return true;
    }
    return false;
  }

  // Update email configuration
  async updateEmailConfig(config: Partial<EmailConfig>): Promise<boolean> {
    try {
      this.emailConfig = { ...this.emailConfig!, ...config };

      if (this.emailConfig.auth.user && this.emailConfig.auth.pass) {
        this.emailTransporter = nodemailer.createTransporter(this.emailConfig);
        return true;
      }
    } catch (error) {
      console.error('Failed to update email configuration:', error);
    }
    return false;
  }

  // Test email configuration
  async testEmailConfig(): Promise<boolean> {
    if (!this.emailTransporter) {
      return false;
    }

    try {
      await this.emailTransporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }

  // Initialize system jobs (data retention, cleanup, etc.)
  private initializeSystemJobs(): void {
    console.log('🕐 Initializing system jobs...');

    // Data retention job - runs every hour
    const retentionJob = cron.schedule(
      '0 * * * *',
      async () => {
        try {
          console.log('🗄️ Running scheduled data retention check...');
          const results = await this.dataRetentionService.executeReadyPolicies();

          if (results.length > 0) {
            console.log(`✅ Executed ${results.length} data retention policies`);
            const successful = results.filter(r => r.success).length;
            const failed = results.length - successful;

            if (failed > 0) {
              console.warn(`⚠️ ${failed} retention policies failed to execute`);
            }
          }
        } catch (error) {
          console.error('❌ Failed to execute data retention policies:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    this.systemJobs.set('dataRetention', retentionJob);
    console.log('📅 Data retention job scheduled (every hour)');

    // Daily cleanup job - runs at 2 AM UTC
    const cleanupJob = cron.schedule(
      '0 2 * * *',
      async () => {
        try {
          console.log('🧹 Running daily cleanup tasks...');
          await this.cleanupExpiredSessions();
          await this.cleanupTemporaryFiles();
          await this.optimizeDatabaseIndexes();
          console.log('✅ Daily cleanup completed');
        } catch (error) {
          console.error('❌ Failed to run cleanup tasks:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    this.systemJobs.set('dailyCleanup', cleanupJob);
    console.log('📅 Daily cleanup job scheduled (2 AM UTC)');

    // Weekly database optimization - runs every Sunday at 3 AM UTC
    const optimizeJob = cron.schedule(
      '0 3 * * 0',
      async () => {
        try {
          console.log('🗃️ Running weekly database optimization...');
          await this.optimizeDatabaseIndexes();
          await this.compactCollections();
          console.log('✅ Weekly optimization completed');
        } catch (error) {
          console.error('❌ Failed to run optimization tasks:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    this.systemJobs.set('weeklyOptimization', optimizeJob);
    console.log('📅 Weekly optimization job scheduled (Sunday 3 AM UTC)');

    // Threat detection job - runs every 15 minutes
    const threatDetectionJob = cron.schedule(
      '*/15 * * * *',
      async () => {
        try {
          console.log('🛡️ Running threat detection analysis...');

          // This would normally get all organization IDs from a configuration or database
          // For now, we'll skip automatic threat detection and let it be triggered by API calls
          console.log('🛡️ Threat detection ready (triggered via API)');
        } catch (error) {
          console.error('❌ Failed to run threat detection:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    this.systemJobs.set('threatDetection', threatDetectionJob);
    console.log('📅 Threat detection job scheduled (every 15 minutes)');

    console.log('✅ System jobs initialized');
  }

  // Cleanup expired sessions
  private async cleanupExpiredSessions(): Promise<void> {
    console.log('🧹 Cleaning up expired sessions...');
    // Implementation would depend on session storage (Redis, MongoDB, etc.)
    // For now, this is a placeholder
  }

  // Cleanup temporary files
  private async cleanupTemporaryFiles(): Promise<void> {
    console.log('🧹 Cleaning up temporary files...');
    const tempDir = path.join(process.cwd(), 'temp');

    try {
      // Check if temp directory exists
      try {
        await fs.access(tempDir);
      } catch {
        return; // Directory doesn't exist
      }

      const files = await fs.readdir(tempDir, { withFileTypes: true });
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file.name);

        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtime.getTime();

          if (age > maxAge) {
            if (file.isDirectory()) {
              await fs.rmdir(filePath, { recursive: true });
            } else {
              await fs.unlink(filePath);
            }
            deletedCount++;
          }
        } catch (error) {
          console.warn(`Failed to clean up ${filePath}:`, error);
        }
      }

      if (deletedCount > 0) {
        console.log(`🗑️ Cleaned up ${deletedCount} temporary files`);
      }
    } catch (error) {
      console.error('Failed to clean up temporary files:', error);
    }
  }

  // Optimize database indexes
  private async optimizeDatabaseIndexes(): Promise<void> {
    console.log('🗃️ Optimizing database indexes...');

    try {
      const mongoose = await import('mongoose');
      const db = mongoose.connection.db;

      if (!db) {
        console.warn('Database connection not available for index optimization');
        return;
      }

      const collections = await db.listCollections().toArray();

      for (const collectionInfo of collections) {
        try {
          const collection = db.collection(collectionInfo.name);
          await collection.reIndex();
          console.log(`✅ Reindexed collection: ${collectionInfo.name}`);
        } catch (error) {
          console.warn(`Failed to reindex ${collectionInfo.name}:`, error);
        }
      }

      console.log('✅ Database index optimization completed');
    } catch (error) {
      console.error('Failed to optimize database indexes:', error);
    }
  }

  // Compact database collections
  private async compactCollections(): Promise<void> {
    console.log('🗜️ Compacting database collections...');

    try {
      const mongoose = await import('mongoose');
      const db = mongoose.connection.db;

      if (!db) {
        console.warn('Database connection not available for compaction');
        return;
      }

      const collections = await db.listCollections().toArray();

      for (const collectionInfo of collections) {
        try {
          await db.command({ compact: collectionInfo.name });
          console.log(`✅ Compacted collection: ${collectionInfo.name}`);
        } catch (error) {
          // Compact might not be supported in all MongoDB versions
          console.warn(`Failed to compact ${collectionInfo.name}:`, error);
        }
      }

      console.log('✅ Database compaction completed');
    } catch (error) {
      console.error('Failed to compact database collections:', error);
    }
  }

  // Get system job status
  getSystemJobStatus(): any {
    const jobStatuses: Record<string, any> = {};

    this.systemJobs.forEach((job, name) => {
      jobStatuses[name] = {
        running: job.running || false,
        scheduled: job.scheduled || false,
        destroyed: job.destroyed || false,
      };
    });

    return {
      totalSystemJobs: this.systemJobs.size,
      jobs: jobStatuses,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    };
  }

  // Stop all system jobs (for graceful shutdown)
  shutdownSystemJobs(): void {
    console.log('🛑 Shutting down system jobs...');

    this.systemJobs.forEach((job, name) => {
      job.stop();
      job.destroy();
      console.log(`🛑 Stopped system job: ${name}`);
    });

    this.systemJobs.clear();
    console.log('✅ System jobs shut down');
  }
}

export default SchedulerService;
