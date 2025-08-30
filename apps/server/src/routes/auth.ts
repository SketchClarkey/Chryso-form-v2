import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User, IUser } from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { validatePasswordStrength } from '../utils/password.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';
import { authRateLimit, strictAuthRateLimit } from '../middleware/security.js';
import { auditAuth, auditUserManagement } from '../middleware/audit.js';
import {
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '../utils/validation.js';

const router = Router();

// Apply rate limiting to auth routes
router.use('/login', authRateLimit as any);
router.use('/register', authRateLimit as any);
router.use('/forgot-password', strictAuthRateLimit as any);

// Public registration (can be disabled in production)
router.post('/register', auditAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({
      email: validatedData.email.toLowerCase(),
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        code: 'USER_EXISTS',
      });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(validatedData.password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        success: false,
        message: 'Password does not meet security requirements',
        errors: passwordValidation.errors,
        code: 'WEAK_PASSWORD',
      });
      return;
    }

    // Create new user
    const newUser = new User({
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email.toLowerCase(),
      password: validatedData.password,
      role: validatedData.role || 'technician',
      emailVerified: false, // In production, require email verification
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      },
    });

    await newUser.save();

    // Generate tokens
    const accessToken = generateAccessToken({
      id: newUser._id.toString(),
      email: newUser.email,
      role: newUser.role,
      worksiteIds: [],
    });

    const refreshToken = generateRefreshToken({
      id: newUser._id.toString(),
      tokenVersion: newUser.refreshTokenVersion,
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          fullName: newUser.fullName,
          role: newUser.role,
          worksites: [],
          preferences: newUser.preferences,
          emailVerified: newUser.emailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
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

    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Login
router.post('/login', auditAuth, async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user with password field
    const user = (await User.findOne({
      email: email.toLowerCase(),
      isActive: true,
    })
      .select('+password +refreshTokenVersion +loginAttempts +lockUntil')
      .populate('worksites', 'name address')) as IUser;

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Check if account is locked
    if (user.isLocked) {
      res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      await user.incrementLoginAttempts();
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
      return;
    }

    // Reset login attempts on successful login
    await user.resetLoginAttempts();

    // Generate tokens
    const worksiteIds = user.worksites ? user.worksites.map((w: any) => w._id.toString()) : [];

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      worksiteIds,
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      tokenVersion: user.refreshTokenVersion,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          worksites: user.worksites || [],
          preferences: user.preferences,
          lastLogin: user.lastLogin,
          emailVerified: user.emailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
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

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Find user and check token version
    const user = (await User.findById(payload.id)
      .select('+refreshTokenVersion')
      .populate('worksites', 'name address')) as IUser;

    if (!user || !user.isActive || user.refreshTokenVersion !== payload.tokenVersion) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN',
      });
      return;
    }

    // Generate new access token
    const worksiteIds = user.worksites ? user.worksites.map((w: any) => w._id.toString()) : [];

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      worksiteIds,
    });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
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

    res.status(401).json({
      success: false,
      message: 'Invalid refresh token',
      code: 'INVALID_REFRESH_TOKEN',
    });
  }
});

// Logout (invalidate refresh token)
router.post(
  '/logout',
  authenticate,
  auditAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Increment refresh token version to invalidate all refresh tokens
      await User.findByIdAndUpdate(req.user!.id, {
        $inc: { refreshTokenVersion: 1 },
      });

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Get current user profile
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id)
      .populate('worksites', 'name address customerName')
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
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          role: user.role,
          worksites: user.worksites || [],
          preferences: user.preferences,
          lastLogin: user.lastLogin,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Change password
router.post(
  '/change-password',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      // Find user with password
      const user = (await User.findById(req.user!.id).select('+password')) as IUser;

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
          code: 'INVALID_CURRENT_PASSWORD',
        });
        return;
      }

      // Validate new password strength
      const passwordValidation = validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        res.status(400).json({
          success: false,
          message: 'New password does not meet security requirements',
          errors: passwordValidation.errors,
          code: 'WEAK_PASSWORD',
        });
        return;
      }

      // Update password
      user.password = newPassword;
      user.metadata.lastModifiedBy = user._id;
      await user.save();

      // Increment refresh token version to invalidate existing tokens
      user.refreshTokenVersion += 1;
      await user.save();

      res.json({
        success: true,
        message: 'Password changed successfully',
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

      console.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Admin-only user registration
router.post(
  '/admin/register',
  authenticate,
  authorize('admin'),
  auditUserManagement,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await User.findOne({
        email: validatedData.email.toLowerCase(),
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists',
          code: 'USER_EXISTS',
        });
        return;
      }

      // Create new user
      const newUser = new User({
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email.toLowerCase(),
        password: validatedData.password,
        role: validatedData.role || 'technician',
        emailVerified: true, // Admin-created users are pre-verified
        metadata: {
          createdBy: req.user!.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
        },
      });

      await newUser.save();

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: {
            id: newUser._id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            fullName: newUser.fullName,
            role: newUser.role,
            emailVerified: newUser.emailVerified,
            createdAt: newUser.createdAt,
          },
        },
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

      console.error('Admin registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

export default router;
