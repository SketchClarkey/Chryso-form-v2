import { Request, Response } from 'express';
import { Types } from 'mongoose';

// Type alias for Express Response to fix return type issues
export type ApiResponse = Response;

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'technician';
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
    _id?: Types.ObjectId;
    organizationId?: string;
    worksiteIds?: string[];
    userId?: string;
  };
}
