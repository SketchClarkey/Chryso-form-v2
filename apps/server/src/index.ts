import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/environment.js';
import { connectDB } from './config/database.js';
import { logger } from './utils/logger.js';

// Import middleware
import {
  securityHeaders,
  generalRateLimit,
  validateContentType,
  sanitizeInput,
  preventNoSniff,
  preventFraming,
} from './middleware/security.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import formRoutes from './routes/forms.js';
import worksiteRoutes from './routes/worksites.js';
import uploadRoutes from './routes/uploads.js';
import auditRoutes from './routes/audit.js';
import dataRetentionRoutes from './routes/dataRetention.js';
import securityRoutes from './routes/security.js';
import templateRoutes from './routes/templates.js';
import reportRoutes from './routes/reports.js';
import analyticsRoutes from './routes/analytics.js';
import dashboardRoutes from './routes/dashboards.js';
import filterRoutes from './routes/filters.js';
import searchRoutes from './routes/search.js';
import emailTemplateRoutes from './routes/emailTemplateRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import schedulerRoutes from './routes/scheduler.js';
import SchedulerService from './services/schedulerService.js';

const app = express();
const PORT = env.PORT;

// Trust proxy if behind reverse proxy (for rate limiting)
app.set('trust proxy', 1);

async function startServer() {
  try {
    // Connect to database first
    await connectDB();

    // Security headers
    app.use(securityHeaders);
    app.use(preventNoSniff);
    app.use(preventFraming);

    // CORS configuration
    app.use(
      cors({
        origin: env.CORS_ORIGIN,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        optionsSuccessStatus: 200,
      })
    );

    // Compression middleware
    app.use(
      compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        level: 6,
      })
    );

    // Body parsing middleware
    app.use(
      express.json({
        limit: '10mb',
        strict: true,
        type: ['application/json'],
      })
    );
    app.use(
      express.urlencoded({
        extended: true,
        limit: '10mb',
        type: ['application/x-www-form-urlencoded'],
      })
    );

    // Content type validation and input sanitization
    app.use(validateContentType);
    app.use(sanitizeInput);

    // Apply general rate limiting to all API routes
    app.use('/api/', generalRateLimit);

    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: env.NODE_ENV,
      });
    });

    // Legacy health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server is running',
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          environment: env.NODE_ENV,
          version: '2.0.0',
        },
      });
    });

    // API status endpoint
    app.get('/api/status', (req, res) => {
      res.json({
        success: true,
        message: 'API is operational',
        data: {
          version: '2.0.0',
          environment: env.NODE_ENV,
          timestamp: new Date().toISOString(),
        },
      });
    });

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/forms', formRoutes);
    app.use('/api/worksites', worksiteRoutes);
    app.use('/api/uploads', uploadRoutes);
    app.use('/api/audit', auditRoutes);
    app.use('/api/data-retention', dataRetentionRoutes);
    app.use('/api/security', securityRoutes);
    app.use('/api/templates', templateRoutes);
    app.use('/api/reports', reportRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/dashboards', dashboardRoutes);
    app.use('/api/filters', filterRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/email-templates', emailTemplateRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/scheduler', schedulerRoutes);

    // 404 handler for API routes
    app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        code: 'ENDPOINT_NOT_FOUND',
        path: req.originalUrl,
      });
    });

    // 404 handler for all other routes
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        code: 'ROUTE_NOT_FOUND',
        path: req.originalUrl,
      });
    });

    // Global error handler
    app.use(
      (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
        console.error('Global error handler:', error);

        // Don't leak error details in production
        const isDevelopment = env.NODE_ENV === 'development';

        res.status(error.status || 500).json({
          success: false,
          message: error.message || 'Internal server error',
          code: error.code || 'INTERNAL_ERROR',
          ...(isDevelopment && { stack: error.stack, details: error.details }),
        });
      }
    );

    // Initialize scheduler service
    const schedulerService = SchedulerService.getInstance();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Chryso Forms v2 Server started`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
      console.log(`🔗 Server URL: http://localhost:${PORT}`);
      console.log(`🔗 Client URL: ${env.CLIENT_URL}`);
      console.log(`📊 Database: Connected to MongoDB`);
      console.log(`🔒 Security: Enhanced middleware active`);
      console.log(`🕐 Scheduler: Data retention and cleanup jobs active`);
      console.log(`⚡ Ready to accept requests`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);

      // Stop scheduler service first
      schedulerService.shutdownSystemJobs();

      server.close(() => {
        console.log('🔴 HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.log('🔴 Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
