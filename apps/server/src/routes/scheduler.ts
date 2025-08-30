import { Response, Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { Report } from '../models/Report';
import SchedulerService from '../services/schedulerService';

const router = Router();
const schedulerService = SchedulerService.getInstance();

// GET /api/scheduler/jobs - Get all scheduled jobs
router.get('/jobs', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    // Check permissions
    if (!['admin', 'manager'].includes(req.user!.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view scheduled jobs',
      });
    }

    const jobs = schedulerService.getScheduledJobs();
    return res.json({
      success: true,
      data: { jobs },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled jobs',
    });
  }
});

// POST /api/scheduler/reports/:id/schedule - Schedule a report
router.post(
  '/reports/:id/schedule',
  authenticate,
  [
    param('id').isMongoId().withMessage('Invalid report ID'),
    body('cronExpression').isString().withMessage('Cron expression is required'),
    body('timezone').optional().isString(),
    body('recipients').isArray().withMessage('Recipients must be an array'),
    body('exportFormat').isIn(['pdf', 'excel', 'csv']).withMessage('Invalid export format'),
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
          message: 'Not authorized to schedule this report',
        });
      }

      // Validate cron expression
      const cron = require('node-cron');
      if (!cron.validate(req.body.cronExpression)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cron expression',
        });
      }

      // Update report schedule
      report.schedule = {
        enabled: true,
        frequency: 'daily', // Default frequency, will be determined by cron expression
        cronExpression: req.body.cronExpression,
        timezone: req.body.timezone || 'UTC',
        recipients: req.body.recipients,
        exportFormat: req.body.exportFormat,
        lastRun: undefined,
        nextRun: new Date(), // Will be calculated by scheduler
      };

      await report.save();

      // Schedule the report
      const success = await schedulerService.scheduleReport(report);
      if (!success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to schedule report',
        });
      }

      return res.json({
        success: true,
        data: { report },
        message: 'Report scheduled successfully',
      });
    } catch (error) {
      console.error('Schedule report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to schedule report',
      });
    }
  }
);

// DELETE /api/scheduler/reports/:id/schedule - Unschedule a report
router.delete(
  '/reports/:id/schedule',
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
      if (req.user!.role !== 'admin' && !report.permissions.canEdit.includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to unschedule this report',
        });
      }

      // Unschedule the report
      await schedulerService.unscheduleReport(req.params.id);

      // Update report schedule
      if (report.schedule) {
        report.schedule.enabled = false;
      }
      await report.save();

      return res.json({
        success: true,
        message: 'Report unscheduled successfully',
      });
    } catch (error) {
      console.error('Unschedule report error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to unschedule report',
      });
    }
  }
);

// PUT /api/scheduler/jobs/:id/pause - Pause a scheduled job
router.put(
  '/jobs/:id/pause',
  authenticate,
  [param('id').isString().withMessage('Invalid job ID')],
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

      // Check permissions
      if (!['admin', 'manager'].includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to pause jobs',
        });
      }

      const success = await schedulerService.pauseJob(req.params.id);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Job not found',
        });
      }

      return res.json({
        success: true,
        message: 'Job paused successfully',
      });
    } catch (error) {
      console.error('Pause job error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to pause job',
      });
    }
  }
);

// PUT /api/scheduler/jobs/:id/resume - Resume a paused job
router.put(
  '/jobs/:id/resume',
  authenticate,
  [param('id').isString().withMessage('Invalid job ID')],
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

      // Check permissions
      if (!['admin', 'manager'].includes(req.user!.role)) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to resume jobs',
        });
      }

      const success = await schedulerService.resumeJob(req.params.id);
      if (!success) {
        return res.status(404).json({
          success: false,
          message: 'Job not found',
        });
      }

      return res.json({
        success: true,
        message: 'Job resumed successfully',
      });
    } catch (error) {
      console.error('Resume job error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to resume job',
      });
    }
  }
);

// GET /api/scheduler/cron-presets - Get common cron expression presets
router.get('/cron-presets', authenticate, (req, res) => {
  const presets = [
    {
      name: 'Every Hour',
      expression: '0 * * * *',
      description: 'Runs at the beginning of every hour',
    },
    {
      name: 'Daily at 9 AM',
      expression: '0 9 * * *',
      description: 'Runs every day at 9:00 AM',
    },
    {
      name: 'Weekly on Monday',
      expression: '0 9 * * MON',
      description: 'Runs every Monday at 9:00 AM',
    },
    {
      name: 'Monthly on 1st',
      expression: '0 9 1 * *',
      description: 'Runs on the 1st day of every month at 9:00 AM',
    },
    {
      name: 'Weekdays at 8 AM',
      expression: '0 8 * * MON-FRI',
      description: 'Runs Monday to Friday at 8:00 AM',
    },
    {
      name: 'Every 15 minutes',
      expression: '*/15 * * * *',
      description: 'Runs every 15 minutes',
    },
    {
      name: 'Quarterly',
      expression: '0 9 1 */3 *',
      description: 'Runs on the 1st day of every 3rd month at 9:00 AM',
    },
  ];

  return res.json({
    success: true,
    data: { presets },
  });
});

// POST /api/scheduler/email/test - Test email configuration
router.post(
  '/email/test',
  authenticate,
  [body('recipient').isEmail().withMessage('Valid recipient email is required')],
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

      // Check permissions
      if (req.user!.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can test email configuration',
        });
      }

      const success = await schedulerService.testEmailConfig();

      return res.json({
        success,
        message: success
          ? 'Email configuration is working correctly'
          : 'Email configuration test failed',
      });
    } catch (error) {
      console.error('Test email error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to test email configuration',
      });
    }
  }
);

// PUT /api/scheduler/email/config - Update email configuration
router.put(
  '/email/config',
  authenticate,
  [
    body('host').optional().isString(),
    body('port').optional().isInt({ min: 1, max: 65535 }),
    body('secure').optional().isBoolean(),
    body('user').optional().isString(),
    body('pass').optional().isString(),
    body('from').optional().isEmail(),
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

      // Check permissions
      if (req.user!.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only administrators can update email configuration',
        });
      }

      const emailConfig = {
        host: req.body.host,
        port: req.body.port,
        secure: req.body.secure,
        auth: {
          user: req.body.user,
          pass: req.body.pass,
        },
        from: req.body.from,
      };

      const success = await schedulerService.updateEmailConfig(emailConfig);

      return res.json({
        success,
        message: success
          ? 'Email configuration updated successfully'
          : 'Failed to update email configuration',
      });
    } catch (error) {
      console.error('Update email config error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update email configuration',
      });
    }
  }
);

export default router;
