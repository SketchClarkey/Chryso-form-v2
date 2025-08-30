import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './express.js';

// Route handler types that properly handle async functions and return types
export type RouteHandler<T = any> = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

export type AuthenticatedRouteHandler<T = any> = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void> | void;

// Async route handler wrapper that handles Promise return types
export const asyncHandler = <T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Authenticated async route handler wrapper
export const asyncAuthHandler = <T = any>(
  fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Type-safe response helpers
export const sendSuccess = <T = any>(res: Response, data?: T, message?: string, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (res: Response, message: string, statusCode = 500, code?: string, details?: any) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    details,
  });
};

export const sendValidationError = (res: Response, errors: any[]) => {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors,
  });
};