import { z } from 'zod';

// Common validation schemas
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(1, 'Email is required')
  .max(100, 'Email cannot exceed 100 characters');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(50, 'Name cannot exceed 50 characters')
  .trim();

export const phoneSchema = z
  .string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .optional();

export const mongoIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ID format');

// Auth validation schemas
export const registerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['admin', 'manager', 'technician']).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// User validation schemas
export const updateUserSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  role: z.enum(['admin', 'manager', 'technician']).optional(),
  isActive: z.boolean().optional(),
  worksites: z.array(mongoIdSchema).optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark']).optional(),
      notifications: z.boolean().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

// Worksite validation schemas
export const createWorksiteSchema = z.object({
  name: z.string().min(1, 'Worksite name is required').max(200),
  customerName: z.string().min(1, 'Customer name is required').max(200),
  address: z.object({
    street: z.string().min(1, 'Street address is required').max(200),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'State is required').max(50),
    zipCode: z.string().min(1, 'ZIP code is required').max(20),
    country: z.string().max(50).default('United States'),
  }),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1, 'Contact name is required').max(100),
        position: z.string().max(100).optional(),
        phone: phoneSchema,
        email: emailSchema.optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .min(1, 'At least one contact is required'),
  equipment: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.enum(['pump', 'tank', 'dispenser', 'pulseMeter']),
        model: z.string().optional(),
        serialNumber: z.string().optional(),
        condition: z.enum(['excellent', 'good', 'fair', 'poor', 'needs-repair']),
        lastServiceDate: z.string().datetime().optional(),
        notes: z.string().max(500).optional(),
        specifications: z.record(z.any()).optional(),
      })
    )
    .optional()
    .default([]),
  preferences: z
    .object({
      autoFillEquipment: z.boolean().default(true),
      defaultChemicals: z.array(z.string()).optional().default([]),
      notifications: z
        .object({
          serviceReminders: z.boolean().default(true),
          equipmentAlerts: z.boolean().default(true),
        })
        .optional()
        .default({}),
    })
    .optional()
    .default({}),
});

export const updateWorksiteSchema = createWorksiteSchema.partial();

// Form validation schemas
export const dispenserSystemSchema = z.object({
  tankNumber: z.string().min(1, 'Tank number is required'),
  chemicalProduct: z.string().min(1, 'Chemical product is required'),
  tankSize: z.number().positive('Tank size must be positive'),
  equipmentCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
  pumpModel: z.string().optional(),
  pumpCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
  pulseMeterType: z.string().optional(),
  pulseMeterCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
  dispenserType: z.string().optional(),
  dispenserCondition: z.enum(['excellent', 'good', 'fair', 'poor']),
});

export const calibrationDataSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  doseRate: z.number().nonnegative('Dose rate must be non-negative'),
  cementContent: z.number().nonnegative('Cement content must be non-negative'),
  batchTotal: z.number().nonnegative('Batch total must be non-negative'),
  actualMeasurement: z.number().nonnegative('Actual measurement must be non-negative'),
  resultPercentage: z.number(),
  graduatedMeasureId: z.string().min(1, 'Graduated measure ID is required'),
});

export const createFormSchema = z.object({
  worksite: mongoIdSchema,
  customerInfo: z.object({
    customerName: z.string().min(1, 'Customer name is required'),
    plantLocation: z.string().min(1, 'Plant location is required'),
    contactPhone: z.string().optional(),
    contactFax: z.string().optional(),
    contactPerson: z.string().optional(),
    workOrderNumber: z.string().optional(),
    shippingInfo: z.string().optional(),
  }),
  dispenserSystems: z.array(dispenserSystemSchema).optional().default([]),
  serviceType: z
    .object({
      service: z.boolean().default(false),
      breakdown: z.boolean().default(false),
      calibration: z.boolean().default(false),
      installation: z.boolean().default(false),
      jobComplete: z.boolean().default(false),
    })
    .optional()
    .default({}),
  maintenanceDetails: z
    .object({
      gcpTechnicianHours: z.number().nonnegative().optional(),
      contractHours: z.number().nonnegative().optional(),
      partsUsed: z
        .array(
          z.object({
            partNumber: z.string().min(1, 'Part number is required'),
            description: z.string().min(1, 'Description is required'),
            quantity: z.number().nonnegative('Quantity must be non-negative'),
            replaced: z.boolean().default(false),
          })
        )
        .optional()
        .default([]),
      maintenanceProcedures: z.string().max(2000).optional(),
      breakdownDetails: z.string().max(2000).optional(),
    })
    .optional()
    .default({}),
  calibrationData: z.array(calibrationDataSchema).optional().default([]),
  serviceChecklist: z
    .object({
      workAreaCleaned: z.boolean().default(false),
      siteTablesReplaced: z.boolean().default(false),
      systemCheckedForLeaks: z.boolean().default(false),
      pulseMetersLabeled: z.boolean().default(false),
      pumpsLabeled: z.boolean().default(false),
      tanksLabeled: z.boolean().default(false),
      dispensersLabeled: z.boolean().default(false),
      calibrationPointsReturned: z.boolean().default(false),
    })
    .optional(),
  additionalInfo: z
    .object({
      notes: z.string().max(1000).optional(),
      attachments: z
        .array(
          z.object({
            filename: z.string().min(1),
            originalName: z.string().min(1),
            mimeType: z.string().min(1),
            size: z.number().positive(),
            uploadedAt: z.string().datetime().optional(),
          })
        )
        .optional()
        .default([]),
    })
    .optional(),
  signatures: z
    .object({
      customer: z
        .object({
          dataUrl: z.string().min(1),
          timestamp: z.string().datetime().optional(),
          signedBy: z.string().min(1),
          ipAddress: z.string().optional(),
        })
        .optional(),
      servicePerson: z
        .object({
          dataUrl: z.string().min(1),
          timestamp: z.string().datetime().optional(),
          signedBy: z.string().min(1),
          ipAddress: z.string().optional(),
        })
        .optional(),
    })
    .optional()
    .default({}),
});

export const updateFormSchema = createFormSchema.partial().extend({
  status: z
    .enum(['draft', 'in-progress', 'completed', 'approved', 'rejected', 'archived'])
    .optional(),
});

// Query validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const searchSchema = z
  .object({
    q: z.string().min(1, 'Search query is required').optional(),
    status: z.string().optional(),
    role: z.string().optional(),
    worksite: mongoIdSchema.optional(),
    technician: mongoIdSchema.optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  })
  .merge(paginationSchema);

export default {
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  mongoIdSchema,
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateUserSchema,
  createWorksiteSchema,
  updateWorksiteSchema,
  dispenserSystemSchema,
  calibrationDataSchema,
  createFormSchema,
  updateFormSchema,
  paginationSchema,
  searchSchema,
};
