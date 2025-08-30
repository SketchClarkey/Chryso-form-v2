import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/environment.js';

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
import swaggerRoutes from './routes/swagger.js';

export function createApp(): express.Application {
  const app = express();

  // Trust proxy if behind reverse proxy (for rate limiting)
  app.set('trust proxy', 1);

  // Security headers
  app.use(securityHeaders as any);
  app.use(preventNoSniff as any);
  app.use(preventFraming as any);

  // CORS configuration
  app.use(
    cors({
      origin: env.CORS_ORIGIN || 'http://localhost:3000',
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
    }) as any
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
  app.use(validateContentType as any);
  app.use(sanitizeInput as any);

  // Apply general rate limiting to all API routes (skip in test environment)
  if (env.NODE_ENV !== 'test') {
    app.use('/api/', generalRateLimit as any);
  }

  // Health check endpoint
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

  // Swagger API Documentation
  app.use('/api', swaggerRoutes);

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
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', error);

    // Don't leak error details in production
    const isDevelopment = env.NODE_ENV === 'development';

    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      ...(isDevelopment && { stack: error.stack, details: error.details }),
    });
  });

  return app;
}
