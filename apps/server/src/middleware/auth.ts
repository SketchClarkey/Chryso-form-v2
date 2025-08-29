import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, JwtPayload } from '../utils/jwt.js';
import { User } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'technician';
    worksiteIds: string[];
    firstName: string;
    lastName: string;
    organizationId?: string;
  };
}

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.header('Authorization'));

    if (!token) {
      res.status(401).json({ 
        success: false,
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
      return;
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id)
      .select('-password -refreshTokenVersion')
      .populate('worksites', 'name address')
      .lean();

    if (!user || !user.isActive) {
      res.status(401).json({ 
        success: false,
        message: 'User not found or inactive',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      worksiteIds: user.worksites?.map((w: any) => w._id.toString()) || [],
      firstName: user.firstName,
      lastName: user.lastName,
    };

    next();
  } catch (error) {
    res.status(401).json({ 
      success: false,
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN'
    });
  }
};

export const authorize = (...roles: Array<'admin' | 'manager' | 'technician'>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false,
        message: 'Authentication required',
        code: 'NOT_AUTHENTICATED'
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role
      });
      return;
    }

    next();
  };
};

export const requireWorksite = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false,
      message: 'Authentication required',
      code: 'NOT_AUTHENTICATED'
    });
    return;
  }

  const worksiteId = req.params.worksiteId || req.body.worksiteId || req.query.worksiteId;

  if (!worksiteId) {
    res.status(400).json({ 
      success: false,
      message: 'Worksite ID required',
      code: 'WORKSITE_ID_REQUIRED'
    });
    return;
  }

  if (req.user.role !== 'admin' && !req.user.worksiteIds.includes(worksiteId)) {
    res.status(403).json({ 
      success: false,
      message: 'Access denied to this worksite',
      code: 'WORKSITE_ACCESS_DENIED'
    });
    return;
  }

  next();
};

export default {
  authenticate,
  authorize,
  requireWorksite,
};