import { Router, Response } from 'express';
import { z } from 'zod';
import { Worksite, IWorksite } from '../models/Worksite.js';
import { Template } from '../models/Template.js';
import { authenticate, authorize, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Schema for creating a worksite
const createWorksiteSchema = z.object({
  name: z.string().min(1, 'Worksite name is required'),
  customerName: z.string().min(1, 'Customer name is required'),
  address: z.object({
    street: z.string().min(1, 'Street address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    zipCode: z.string().min(1, 'ZIP code is required'),
    country: z.string().default('Australia'),
  }),
  contacts: z
    .array(
      z.object({
        name: z.string().min(1, 'Contact name is required'),
        position: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        isPrimary: z.boolean().default(false),
      })
    )
    .default([]),
  equipment: z.array(z.any()).default([]),
  defaultTemplate: z.string().optional(),
});

// Get all worksites
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;

    let worksites;
    if (user.role === 'admin') {
      // Admins can see all worksites
      worksites = await Worksite.find({})
        .populate('metadata.defaultFormTemplate', 'name category status')
        .sort({ name: 1 });
    } else {
      // Users can only see worksites they're assigned to
      worksites = await Worksite.find({
        _id: { $in: user.worksiteIds },
      })
        .populate('metadata.defaultFormTemplate', 'name category status')
        .sort({ name: 1 });
    }

    res.json({
      success: true,
      data: {
        worksites: worksites.map(worksite => ({
          id: worksite._id,
          name: worksite.name,
          customerName: worksite.customerName,
          address: worksite.address,
          contacts: worksite.contacts,
          equipment: worksite.equipment || [],
          isActive: worksite.isActive,
          defaultTemplate: worksite.metadata?.defaultFormTemplate,
          createdAt: worksite.createdAt,
          updatedAt: worksite.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching worksites:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worksites',
      code: 'FETCH_ERROR',
    });
  }
});

// Create a new worksite (admin only)
router.post(
  '/',
  authorize('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const validatedData = createWorksiteSchema.parse(req.body);

      // Validate template if provided
      let defaultTemplate = null;
      if (validatedData.defaultTemplate) {
        defaultTemplate = await Template.findById(validatedData.defaultTemplate);
        if (!defaultTemplate) {
          res.status(400).json({
            success: false,
            message: 'Invalid template ID provided',
            code: 'INVALID_TEMPLATE',
          });
          return;
        }
      }

      const worksite = new Worksite({
        name: validatedData.name,
        customerName: validatedData.customerName,
        address: validatedData.address,
        contacts: validatedData.contacts,
        equipment: validatedData.equipment,
        isActive: true,
        metadata: {
          createdBy: new Types.ObjectId(req.user!.id),
          defaultFormTemplate: defaultTemplate?._id,
          serviceHistory: {
            totalForms: 0,
          },
        },
        preferences: {
          autoFillEquipment: false,
          defaultChemicals: [],
          notifications: {
            serviceReminders: true,
            equipmentAlerts: true,
          },
        },
      });

      await worksite.save();

      res.status(201).json({
        success: true,
        message: 'Worksite created successfully',
        data: {
          worksite: {
            id: worksite._id,
            name: worksite.name,
            customerName: worksite.customerName,
            address: worksite.address,
            contacts: worksite.contacts,
            equipment: worksite.equipment || [],
            isActive: worksite.isActive,
            defaultTemplate: worksite.metadata?.defaultFormTemplate,
            createdAt: worksite.createdAt,
            updatedAt: worksite.updatedAt,
          },
        },
      });
    } catch (error: any) {
      console.error('Worksite creation error:', error);

      if (error.name === 'ZodError') {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          errors: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create worksite',
        code: 'CREATION_ERROR',
      });
    }
  }
);

// Update worksite default template
router.patch(
  '/:id/template',
  authorize('admin'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { templateId } = req.body;

      // Find the worksite
      const worksite = await Worksite.findById(id);
      if (!worksite) {
        res.status(404).json({
          success: false,
          message: 'Worksite not found',
          code: 'WORKSITE_NOT_FOUND',
        });
        return;
      }

      // Validate template if provided
      let template = null;
      if (templateId) {
        template = await Template.findById(templateId);
        if (!template) {
          res.status(400).json({
            success: false,
            message: 'Invalid template ID provided',
            code: 'INVALID_TEMPLATE',
          });
          return;
        }

        // Check if template is active
        if (template.status !== 'active') {
          res.status(400).json({
            success: false,
            message: 'Template must be active to be assigned to worksite',
            code: 'TEMPLATE_NOT_ACTIVE',
          });
          return;
        }
      }

      // Update worksite
      worksite.metadata.defaultFormTemplate = template?._id || undefined;
      worksite.metadata.lastModifiedBy = new Types.ObjectId(req.user!.id);
      await worksite.save();

      // Populate template data for response
      await worksite.populate('metadata.defaultFormTemplate', 'name category status');

      res.json({
        success: true,
        message: template
          ? 'Default template assigned successfully'
          : 'Default template removed successfully',
        data: {
          worksite: {
            id: worksite._id,
            name: worksite.name,
            customerName: worksite.customerName,
            defaultTemplate: worksite.metadata.defaultFormTemplate,
          },
        },
      });
    } catch (error: any) {
      console.error('Template assignment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update template assignment',
        code: 'ASSIGNMENT_ERROR',
      });
    }
  }
);

// Get worksite by ID with template details
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    const worksite = await Worksite.findById(id)
      .populate('metadata.defaultFormTemplate', 'name category status version')
      .populate('metadata.createdBy', 'firstName lastName email')
      .populate('metadata.lastModifiedBy', 'firstName lastName email');

    if (!worksite) {
      res.status(404).json({
        success: false,
        message: 'Worksite not found',
        code: 'WORKSITE_NOT_FOUND',
      });
      return;
    }

    // Check permissions
    if (user.role !== 'admin' && !user.worksiteIds.includes(worksite._id.toString())) {
      res.status(403).json({
        success: false,
        message: 'Not authorized to view this worksite',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        worksite: {
          id: worksite._id,
          name: worksite.name,
          customerName: worksite.customerName,
          address: worksite.address,
          contacts: worksite.contacts,
          equipment: worksite.equipment || [],
          isActive: worksite.isActive,
          defaultTemplate: worksite.metadata.defaultFormTemplate,
          metadata: worksite.metadata,
          preferences: worksite.preferences,
          createdAt: worksite.createdAt,
          updatedAt: worksite.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching worksite:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worksite',
      code: 'FETCH_ERROR',
    });
  }
});

export default router;
