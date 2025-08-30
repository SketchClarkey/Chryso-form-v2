import { Router, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';
import { updateUserSchema, searchSchema } from '../utils/validation.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (admin and managers only)
router.get(
  '/',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { page, limit, sort, order, q, role } = searchSchema.parse(req.query);

      // Build filter
      const filter: any = { isActive: true };

      if (q) {
        filter.$or = [
          { firstName: { $regex: q, $options: 'i' } },
          { lastName: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
        ];
      }

      if (role) {
        filter.role = role;
      }

      // Build sort
      const sortField = sort || 'createdAt';
      const sortOrder = order === 'asc' ? 1 : -1;
      const sortOptions: any = { [sortField]: sortOrder };

      // Execute query
      const skip = (Number(page) - 1) * Number(limit);

      const [users, total] = await Promise.all([
        User.find(filter)
          .populate('worksites', 'name customerName')
          .select('-password -refreshTokenVersion')
          .sort(sortOptions)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        User.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages,
            hasNextPage: Number(page) < totalPages,
            hasPrevPage: Number(page) > 1,
          },
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Get user by ID
router.get(
  '/:id',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.id;

      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format',
          code: 'INVALID_ID',
        });
        return;
      }

      const user = await User.findById(userId)
        .populate('worksites', 'name customerName address')
        .select('-password -refreshTokenVersion');

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Update user (admin only, or self for limited fields)
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.id;
    const currentUser = req.user!;

    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    // Check permissions
    const isAdmin = currentUser.role === 'admin';
    const isSelf = currentUser.id === userId;

    if (!isAdmin && !isSelf) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    const validatedData = updateUserSchema.parse(req.body);

    // Non-admin users can only update certain fields
    let finalUpdateData = validatedData;
    if (!isAdmin && isSelf) {
      const allowedFields = ['firstName', 'lastName', 'preferences'];
      const updateData = Object.keys(validatedData)
        .filter(key => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = validatedData[key as keyof typeof validatedData];
          return obj;
        }, {});

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No valid fields to update',
          code: 'NO_VALID_FIELDS',
        });
        return;
      }

      finalUpdateData = updateData;
    }

    // Check if email is being changed and if it already exists
    if (finalUpdateData.email) {
      const existingUser = await User.findOne({
        email: finalUpdateData.email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'Email already exists',
          code: 'EMAIL_EXISTS',
        });
        return;
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        ...finalUpdateData,
        ...(finalUpdateData.email && { email: finalUpdateData.email.toLowerCase() }),
        'metadata.lastModifiedBy': currentUser.id,
      },
      {
        new: true,
        runValidators: true,
        select: '-password -refreshTokenVersion',
      }
    ).populate('worksites', 'name customerName');

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid input data',
        errors: error.errors,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Deactivate user (admin only)
router.delete(
  '/:id',
  authorize('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user!;

      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format',
          code: 'INVALID_ID',
        });
        return;
      }

      // Prevent self-deletion
      if (currentUser.id === userId) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account',
          code: 'CANNOT_DELETE_SELF',
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        userId,
        {
          isActive: false,
          'metadata.lastModifiedBy': currentUser.id,
        },
        { new: true, select: '-password -refreshTokenVersion' }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        message: 'User deactivated successfully',
        data: { user },
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Assign worksites to user (admin and managers)
router.patch(
  '/:id/worksites',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user!;

      if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format',
          code: 'INVALID_ID',
        });
        return;
      }

      const { worksiteIds } = z
        .object({
          worksiteIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid worksite ID')),
        })
        .parse(req.body);

      const user = await User.findByIdAndUpdate(
        userId,
        {
          worksites: worksiteIds,
          'metadata.lastModifiedBy': currentUser.id,
        },
        { new: true, select: '-password -refreshTokenVersion' }
      ).populate('worksites', 'name customerName');

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      res.json({
        success: true,
        message: 'User worksites updated successfully',
        data: { user },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid worksite IDs',
          errors: error.errors,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      console.error('Assign worksites error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;
