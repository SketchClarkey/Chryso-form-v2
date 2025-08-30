import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler, AppError } from '../../middleware/errorHandler.js';
import { logger } from '../../utils/logger.js';

// Mock logger
vi.mock('../../utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
  },
}));

const mockRequest = (): Request => ({}) as Request;

const mockResponse = (): Response =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  }) as any;

const mockNext = vi.fn() as unknown as NextFunction;

describe('Error Handler Middleware', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalNodeEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv as 'development' | 'production' | 'test';
    } else {
      delete (process.env as any).NODE_ENV;
    }
    vi.restoreAllMocks();
  });

  it('should handle error with custom status code and message', () => {
    const error: AppError = new Error('Custom error message');
    error.statusCode = 400;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req, res, mockNext);

    expect(logger.error).toHaveBeenCalledWith('Error:', error);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Custom error message',
    });
  });

  it('should default to status 500 when no statusCode provided', () => {
    const error = new Error('Error without status code');

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error without status code',
    });
  });

  it('should default to "Internal server error" when no message provided', () => {
    const error = new Error('');
    error.message = '';

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Internal server error',
    });
  });

  it('should include stack trace in development environment', () => {
    process.env.NODE_ENV = 'development';

    const error = new Error('Development error');
    error.stack = 'Error stack trace';

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Development error',
      stack: 'Error stack trace',
    });
  });

  it('should not include stack trace in production environment', () => {
    process.env.NODE_ENV = 'production';

    const error = new Error('Production error');
    error.stack = 'Error stack trace';

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Production error',
    });
  });

  it('should log error details', () => {
    const error = new Error('Test error for logging');

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req, res, mockNext);

    expect(logger.error).toHaveBeenCalledWith('Error:', error);
  });

  it('should handle error with both custom statusCode and message', () => {
    const error: AppError = new Error('Unauthorized access');
    error.statusCode = 401;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unauthorized access',
    });
  });

  it('should handle validation errors', () => {
    const error: AppError = new Error('Validation failed');
    error.statusCode = 422;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Validation failed',
    });
  });
});
