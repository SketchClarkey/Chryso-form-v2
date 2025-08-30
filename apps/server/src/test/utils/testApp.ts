import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';

// Import routes
import authRoutes from '../../routes/auth.js';
import usersRoutes from '../../routes/users.js';
import templatesRoutes from '../../routes/templates.js';
import formsRoutes from '../../routes/forms.js';
import worksitesRoutes from '../../routes/worksites.js';

// Import middleware
import { errorHandler } from '../../middleware/errorHandler.js';

export function createTestApp(): Express {
  const app = express();

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS
  app.use(
    cors({
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    })
  );

  // Security
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled for testing
    })
  );

  // Rate limiting (very permissive for testing)
  const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10000, // Very high limit for tests
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests from this IP',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter as any);

  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      },
    });
  });

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/forms', formsRoutes);
  app.use('/api/worksites', worksitesRoutes);

  // API status endpoint
  app.get('/api/status', (req, res) => {
    res.json({
      success: true,
      data: {
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // API 404 handler
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      code: 'ENDPOINT_NOT_FOUND',
      message: `API endpoint ${req.originalUrl} not found`,
    });
  });

  // General 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      success: false,
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
    });
  });

  // Error handler
  app.use(errorHandler);

  return app;
}
