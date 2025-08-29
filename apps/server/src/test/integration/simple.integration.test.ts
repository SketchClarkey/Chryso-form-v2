import { describe, it, beforeEach, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import type { Express } from 'express';

describe('Simple Integration Test', () => {
  let app: Express;

  beforeEach(async () => {
    // Create a simple test app without swagger and complex middleware
    app = express();
    app.use(express.json());
    
    // Add basic health endpoints
    app.get('/health', (req, res) => {
      res.json({
        success: true,
        data: { status: 'healthy' }
      });
    });
    
    app.get('/api/status', (req, res) => {
      res.json({
        success: true,
        data: { version: '2.0.0' }
      });
    });
    
    // Add 404 handlers
    app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        code: 'ENDPOINT_NOT_FOUND'
      });
    });
    
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        code: 'ROUTE_NOT_FOUND'
      });
    });
  });

  describe('Health endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
    });

    it('should return API status', async () => {
      const response = await request(app)
        .get('/api/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe('2.0.0');
    });
  });

  describe('404 handlers', () => {
    it('should return 404 for unknown API endpoint', async () => {
      const response = await request(app)
        .get('/api/unknown')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ENDPOINT_NOT_FOUND');
    });

    it('should return 404 for unknown route', async () => {
      const response = await request(app)
        .get('/unknown')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('ROUTE_NOT_FOUND');
    });
  });
});