import { Router, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Form, IForm } from '../models/Form.js';
import { Worksite } from '../models/Worksite.js';
import {
  authenticate,
  authorize,
  AuthenticatedRequest,
  requireWorksite,
} from '../middleware/auth.js';
import { createFormSchema, updateFormSchema, searchSchema } from '../utils/validation.js';
import { auditDataAccess, auditMiddleware } from '../middleware/audit.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all forms with filtering and pagination
router.get(
  '/',
  auditDataAccess,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { page, limit, sort, order, q, status, worksite, technician, dateFrom, dateTo } =
        searchSchema.parse(req.query);
      const currentUser = req.user!;

      // Build filter based on user role and permissions
      const filter: any = {};

      // Role-based filtering
      if (currentUser.role === 'technician') {
        filter.technician = currentUser.id;
      } else if (currentUser.role === 'manager') {
        // Managers can see forms from their worksites
        filter.worksite = { $in: currentUser.worksiteIds };
      }
      // Admins can see all forms (no additional filter)

      // Apply search filters
      if (q) {
        filter.$or = [
          { formId: { $regex: q, $options: 'i' } },
          { 'customerInfo.customerName': { $regex: q, $options: 'i' } },
          { 'customerInfo.plantLocation': { $regex: q, $options: 'i' } },
        ];
      }

      if (status) {
        filter.status = status;
      }

      if (worksite && currentUser.role !== 'technician') {
        filter.worksite = worksite;
      }

      if (technician && (currentUser.role === 'admin' || currentUser.role === 'manager')) {
        filter.technician = technician;
      }

      if (dateFrom || dateTo) {
        filter.createdAt = {};
        if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
        if (dateTo) filter.createdAt.$lte = new Date(dateTo);
      }

      // Build sort
      const sortField = sort || 'createdAt';
      const sortOrder = order === 'asc' ? 1 : -1;
      const sortOptions: any = { [sortField]: sortOrder };

      // Execute query
      const skip = (Number(page) - 1) * Number(limit);

      const [forms, total] = await Promise.all([
        Form.find(filter)
          .populate('worksite', 'name customerName address')
          .populate('technician', 'firstName lastName email')
          .populate('approvedBy', 'firstName lastName email')
          .sort(sortOptions)
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Form.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / Number(limit));

      res.json({
        success: true,
        data: {
          forms,
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

      console.error('Get forms error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Get form by ID
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const formId = req.params.id;
    const currentUser = req.user!;

    if (!formId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid form ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    const form = (await Form.findById(formId)
      .populate('worksite', 'name customerName address contacts')
      .populate('technician', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email')
      .populate('rejectedBy', 'firstName lastName email')) as IForm;

    if (!form) {
      res.status(404).json({
        success: false,
        message: 'Form not found',
        code: 'FORM_NOT_FOUND',
      });
      return;
    }

    // Check permissions
    if (currentUser.role === 'technician' && form.technician._id.toString() !== currentUser.id) {
      res.status(403).json({
        success: false,
        message: 'Access denied to this form',
        code: 'ACCESS_DENIED',
      });
      return;
    }

    if (
      currentUser.role === 'manager' &&
      !currentUser.worksiteIds.includes(form.worksite._id.toString())
    ) {
      res.status(403).json({
        success: false,
        message: 'Access denied to this worksite',
        code: 'WORKSITE_ACCESS_DENIED',
      });
      return;
    }

    res.json({
      success: true,
      data: { form },
    });
  } catch (error) {
    console.error('Get form by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Create new form
router.post(
  '/',
  requireWorksite,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const currentUser = req.user!;
      const validatedData = createFormSchema.parse(req.body);

      // Verify worksite access
      if (
        currentUser.role !== 'admin' &&
        !currentUser.worksiteIds.includes(validatedData.worksite)
      ) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this worksite',
          code: 'WORKSITE_ACCESS_DENIED',
        });
        return;
      }

      // Verify worksite exists
      const worksite = await Worksite.findById(validatedData.worksite);
      if (!worksite) {
        res.status(404).json({
          success: false,
          message: 'Worksite not found',
          code: 'WORKSITE_NOT_FOUND',
        });
        return;
      }

      // Create form
      const form = new Form({
        ...validatedData,
        technician: currentUser.id,
        metadata: {
          createdBy: currentUser.id,
          syncStatus: 'synced',
          offlineCreated: false,
        },
      });

      await form.save();

      // Populate for response
      await form.populate([
        { path: 'worksite', select: 'name customerName address' },
        { path: 'technician', select: 'firstName lastName email' },
      ]);

      res.status(201).json({
        success: true,
        message: 'Form created successfully',
        data: { form },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid form data',
          errors: error.errors,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      console.error('Create form error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Update form
router.put('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const formId = req.params.id;
    const currentUser = req.user!;

    if (!formId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid form ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    const validatedData = updateFormSchema.parse(req.body);

    const form = (await Form.findById(formId)) as IForm;
    if (!form) {
      res.status(404).json({
        success: false,
        message: 'Form not found',
        code: 'FORM_NOT_FOUND',
      });
      return;
    }

    // Check edit permissions
    if (!form.canBeEditedBy(currentUser.id, currentUser.role)) {
      res.status(403).json({
        success: false,
        message: 'Form cannot be edited in current status or insufficient permissions',
        code: 'EDIT_NOT_ALLOWED',
      });
      return;
    }

    // Update form
    Object.assign(form, validatedData, {
      'metadata.lastModifiedBy': currentUser.id,
      'metadata.version': form.metadata.version + 1,
    });

    await form.save();

    // Populate for response
    await form.populate([
      { path: 'worksite', select: 'name customerName address' },
      { path: 'technician', select: 'firstName lastName email' },
    ]);

    res.json({
      success: true,
      message: 'Form updated successfully',
      data: { form },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Invalid form data',
        errors: error.errors,
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    console.error('Update form error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Submit form for completion
router.post('/:id/submit', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const formId = req.params.id;
    const currentUser = req.user!;

    if (!formId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid form ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    const form = (await Form.findById(formId)) as IForm;
    if (!form) {
      res.status(404).json({
        success: false,
        message: 'Form not found',
        code: 'FORM_NOT_FOUND',
      });
      return;
    }

    // Check permissions - only form creator can submit
    if (form.technician._id.toString() !== currentUser.id) {
      res.status(403).json({
        success: false,
        message: 'Only the form creator can submit this form',
        code: 'SUBMIT_NOT_ALLOWED',
      });
      return;
    }

    if (form.status !== 'draft' && form.status !== 'in-progress') {
      res.status(400).json({
        success: false,
        message: 'Form cannot be submitted in current status',
        code: 'INVALID_STATUS_FOR_SUBMIT',
      });
      return;
    }

    // Update form status
    form.status = 'completed';
    form.submittedAt = new Date();
    form.completedAt = new Date();
    form.metadata.lastModifiedBy = new mongoose.Types.ObjectId(currentUser.id);

    await form.save();

    res.json({
      success: true,
      message: 'Form submitted successfully',
      data: { form },
    });
  } catch (error) {
    console.error('Submit form error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

// Approve or reject form (managers and admins)
router.post(
  '/:id/review',
  authorize('admin', 'manager'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const formId = req.params.id;
      const currentUser = req.user!;

      if (!formId.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400).json({
          success: false,
          message: 'Invalid form ID format',
          code: 'INVALID_ID',
        });
        return;
      }

      const { action, reason } = z
        .object({
          action: z.enum(['approve', 'reject']),
          reason: z.string().optional(),
        })
        .parse(req.body);

      const form = (await Form.findById(formId)) as IForm;
      if (!form) {
        res.status(404).json({
          success: false,
          message: 'Form not found',
          code: 'FORM_NOT_FOUND',
        });
        return;
      }

      if (form.status !== 'completed') {
        res.status(400).json({
          success: false,
          message: 'Form must be completed before review',
          code: 'INVALID_STATUS_FOR_REVIEW',
        });
        return;
      }

      // Check worksite access for managers
      if (
        currentUser.role === 'manager' &&
        !currentUser.worksiteIds.includes(form.worksite._id.toString())
      ) {
        res.status(403).json({
          success: false,
          message: 'Access denied to this worksite',
          code: 'WORKSITE_ACCESS_DENIED',
        });
        return;
      }

      // Update form based on action
      if (action === 'approve') {
        form.status = 'approved';
        form.approvedAt = new Date();
        form.approvedBy = new mongoose.Types.ObjectId(currentUser.id);
      } else {
        form.status = 'rejected';
        form.rejectedAt = new Date();
        form.rejectedBy = new mongoose.Types.ObjectId(currentUser.id);
        if (reason) {
          form.rejectionReason = reason;
        }
      }

      form.metadata.lastModifiedBy = new mongoose.Types.ObjectId(currentUser.id);
      await form.save();

      res.json({
        success: true,
        message: `Form ${action}d successfully`,
        data: { form },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid review data',
          errors: error.errors,
          code: 'VALIDATION_ERROR',
        });
        return;
      }

      console.error('Review form error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// Delete form (admin only, or draft forms by creator)
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const formId = req.params.id;
    const currentUser = req.user!;

    if (!formId.match(/^[0-9a-fA-F]{24}$/)) {
      res.status(400).json({
        success: false,
        message: 'Invalid form ID format',
        code: 'INVALID_ID',
      });
      return;
    }

    const form = (await Form.findById(formId)) as IForm;
    if (!form) {
      res.status(404).json({
        success: false,
        message: 'Form not found',
        code: 'FORM_NOT_FOUND',
      });
      return;
    }

    // Check delete permissions
    const canDelete =
      currentUser.role === 'admin' ||
      (form.technician._id.toString() === currentUser.id && form.status === 'draft');

    if (!canDelete) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions to delete this form',
        code: 'DELETE_NOT_ALLOWED',
      });
      return;
    }

    await Form.findByIdAndDelete(formId);

    res.json({
      success: true,
      message: 'Form deleted successfully',
    });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  }
});

export default router;
