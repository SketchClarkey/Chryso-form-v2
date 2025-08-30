import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  authenticate,
  authorize,
  requireWorksite,
  AuthenticatedRequest,
} from '../../middleware/auth.js';
import * as jwt from '../../utils/jwt.js';
import { User } from '../../models/User.js';

// Mock dependencies
vi.mock('../../utils/jwt.js');
vi.mock('../../models/User.js');

const mockRequest = (overrides: Partial<AuthenticatedRequest> = {}): AuthenticatedRequest =>
  ({
    header: vi.fn(),
    params: {},
    body: {},
    query: {},
    ...overrides,
  }) as any;

const mockResponse = (): Response =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  }) as any;

const mockNext = vi.fn() as unknown as NextFunction;

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('authenticate', () => {
    it('should authenticate valid token and attach user to request', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'technician',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
        worksites: [{ _id: 'worksite1', name: 'Site 1' }],
      };

      const mockDecodedToken = { id: 'user123' };

      vi.mocked(jwt.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(jwt.verifyAccessToken).mockReturnValue(mockDecodedToken as any);

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockUser),
      };
      vi.mocked(User.findById).mockReturnValue(mockUserQuery as any);

      const req = mockRequest();
      req.header = vi.fn().mockReturnValue('Bearer valid-token');
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(jwt.extractTokenFromHeader).toHaveBeenCalledWith('Bearer valid-token');
      expect(jwt.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(req.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        role: 'technician',
        worksiteIds: ['worksite1'],
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when no token provided', async () => {
      vi.mocked(jwt.extractTokenFromHeader).mockReturnValue(null);

      const req = mockRequest();
      req.header = vi.fn().mockReturnValue(null);
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access token required',
        code: 'NO_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token', async () => {
      vi.mocked(jwt.extractTokenFromHeader).mockReturnValue('invalid-token');
      vi.mocked(jwt.verifyAccessToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const req = mockRequest();
      req.header = vi.fn().mockReturnValue('Bearer invalid-token');
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user not found', async () => {
      const mockDecodedToken = { id: 'nonexistent' };

      vi.mocked(jwt.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(jwt.verifyAccessToken).mockReturnValue(mockDecodedToken as any);

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(User.findById).mockReturnValue(mockUserQuery as any);

      const req = mockRequest();
      req.header = vi.fn().mockReturnValue('Bearer valid-token');
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found or inactive',
        code: 'USER_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when user is inactive', async () => {
      const mockUser = {
        _id: 'user123',
        email: 'test@example.com',
        role: 'technician',
        firstName: 'John',
        lastName: 'Doe',
        isActive: false,
        worksites: [],
      };

      const mockDecodedToken = { id: 'user123' };

      vi.mocked(jwt.extractTokenFromHeader).mockReturnValue('valid-token');
      vi.mocked(jwt.verifyAccessToken).mockReturnValue(mockDecodedToken as any);

      const mockUserQuery = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue(mockUser),
      };
      vi.mocked(User.findById).mockReturnValue(mockUserQuery as any);

      const req = mockRequest();
      req.header = vi.fn().mockReturnValue('Bearer valid-token');
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'User not found or inactive',
        code: 'USER_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should allow access when user has required role', () => {
      const middleware = authorize('admin', 'manager');
      const req = mockRequest({
        user: {
          id: 'user123',
          email: 'admin@example.com',
          role: 'admin',
          worksiteIds: [],
          firstName: 'Admin',
          lastName: 'User',
        },
      });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user lacks required role', () => {
      const middleware = authorize('admin', 'manager');
      const req = mockRequest({
        user: {
          id: 'user123',
          email: 'tech@example.com',
          role: 'technician',
          worksiteIds: [],
          firstName: 'Tech',
          lastName: 'User',
        },
      });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: ['admin', 'manager'],
        current: 'technician',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      const middleware = authorize('admin');
      const req = mockRequest(); // No user property
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireWorksite', () => {
    it('should allow admin access to any worksite', () => {
      const req = mockRequest({
        user: {
          id: 'admin123',
          email: 'admin@example.com',
          role: 'admin',
          worksiteIds: [],
          firstName: 'Admin',
          lastName: 'User',
        },
        params: { worksiteId: 'worksite1' },
      });
      const res = mockResponse();

      requireWorksite(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow user access to their assigned worksite', () => {
      const req = mockRequest({
        user: {
          id: 'tech123',
          email: 'tech@example.com',
          role: 'technician',
          worksiteIds: ['worksite1', 'worksite2'],
          firstName: 'Tech',
          lastName: 'User',
        },
        params: { worksiteId: 'worksite1' },
      });
      const res = mockResponse();

      requireWorksite(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when worksite ID not provided', () => {
      const req = mockRequest({
        user: {
          id: 'tech123',
          email: 'tech@example.com',
          role: 'technician',
          worksiteIds: ['worksite1'],
          firstName: 'Tech',
          lastName: 'User',
        },
        params: {},
      });
      const res = mockResponse();

      requireWorksite(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Worksite ID required',
        code: 'WORKSITE_ID_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user not assigned to worksite', () => {
      const req = mockRequest({
        user: {
          id: 'tech123',
          email: 'tech@example.com',
          role: 'technician',
          worksiteIds: ['worksite1'],
          firstName: 'Tech',
          lastName: 'User',
        },
        params: { worksiteId: 'worksite2' },
      });
      const res = mockResponse();

      requireWorksite(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to this worksite',
        code: 'WORKSITE_ACCESS_DENIED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should check worksite ID in body when not in params', () => {
      const req = mockRequest({
        user: {
          id: 'tech123',
          email: 'tech@example.com',
          role: 'technician',
          worksiteIds: ['worksite1'],
          firstName: 'Tech',
          lastName: 'User',
        },
        params: {},
        body: { worksiteId: 'worksite1' },
      });
      const res = mockResponse();

      requireWorksite(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should check worksite ID in query when not in params or body', () => {
      const req = mockRequest({
        user: {
          id: 'tech123',
          email: 'tech@example.com',
          role: 'technician',
          worksiteIds: ['worksite1'],
          firstName: 'Tech',
          lastName: 'User',
        },
        params: {},
        body: {},
        query: { worksiteId: 'worksite1' },
      });
      const res = mockResponse();

      requireWorksite(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny access when user not authenticated', () => {
      const req = mockRequest({ params: { worksiteId: 'worksite1' } });
      const res = mockResponse();

      requireWorksite(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
