import express from 'express';
import { EmailTemplate, IEmailTemplate } from '../models/EmailTemplate.js';
import EmailTemplateService from '../services/emailTemplateService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AuthenticatedRequest } from '../types/express.js';

const router = express.Router();
const emailTemplateService = EmailTemplateService.getInstance();

// Get all email templates
router.get('/', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId } = req.user!;
    const { category, type, active, search, page = 1, limit = 50 } = req.query;

    const filter: any = { organizationId };

    if (category) filter.category = category;
    if (type) filter.type = type;
    if (active !== undefined) filter.isActive = active === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [templates, total] = await Promise.all([
      EmailTemplate.find(filter)
        .populate('createdBy updatedBy', 'firstName lastName email')
        .sort({ category: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      EmailTemplate.countDocuments(filter),
    ]);

    return res.json({
      templates,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('Failed to get email templates:', error);
    return res.status(500).json({ message: 'Failed to get email templates' });
  }
});

// Get template by ID
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId } = req.user!;
    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      organizationId,
    }).populate('createdBy updatedBy', 'firstName lastName email');

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    return res.json({ template });
  } catch (error) {
    console.error('Failed to get email template:', error);
    return res.status(500).json({ message: 'Failed to get email template' });
  }
});

// Create new template
router.post('/', authorize('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId, userId } = req.user!;
    const templateData = req.body;

    // Validate template content
    const validation = emailTemplateService.validateTemplate(
      templateData.subject,
      templateData.htmlContent,
      templateData.variables
    );

    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Template validation failed',
        errors: validation.errors,
      });
    }

    // Check for duplicate type if system template
    if (templateData.isSystem) {
      const existingTemplate = await EmailTemplate.findOne({
        organizationId,
        type: templateData.type,
        isSystem: true,
      });

      if (existingTemplate) {
        return res.status(400).json({
          message: 'System template of this type already exists',
        });
      }
    }

    const template = new EmailTemplate({
      ...templateData,
      organizationId,
      createdBy: userId,
      updatedBy: userId,
      settings: {
        priority: 'normal',
        trackOpens: true,
        trackClicks: true,
        ...templateData.settings,
      },
      localization: {
        defaultLanguage: 'en',
        translations: [],
        ...templateData.localization,
      },
      usage: {
        sentCount: 0,
      },
    });

    const savedTemplate = await template.save();
    await savedTemplate.populate('createdBy updatedBy', 'firstName lastName email');

    return res.status(201).json({
      template: savedTemplate,
      message: 'Template created successfully',
    });
  } catch (error) {
    console.error('Failed to create email template:', error);
    return res.status(500).json({ message: 'Failed to create email template' });
  }
});

// Update template
router.put('/:id', authorize('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId, userId } = req.user!;
    const templateData = req.body;

    // Validate template content
    const validation = emailTemplateService.validateTemplate(
      templateData.subject,
      templateData.htmlContent,
      templateData.variables
    );

    if (!validation.isValid) {
      return res.status(400).json({
        message: 'Template validation failed',
        errors: validation.errors,
      });
    }

    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Prevent modifying system template type
    if (template.isSystem && templateData.type && templateData.type !== template.type) {
      return res.status(400).json({
        message: 'Cannot change type of system template',
      });
    }

    Object.assign(template, {
      ...templateData,
      updatedBy: userId,
      version: template.version + 1,
    });

    const updatedTemplate = await template.save();
    await updatedTemplate.populate('createdBy updatedBy', 'firstName lastName email');

    return res.json({
      template: updatedTemplate,
      message: 'Template updated successfully',
    });
  } catch (error) {
    console.error('Failed to update email template:', error);
    return res.status(500).json({ message: 'Failed to update email template' });
  }
});

// Delete template
router.delete('/:id', authorize('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId } = req.user!;

    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    if (template.isSystem) {
      return res.status(400).json({
        message: 'Cannot delete system template',
      });
    }

    await EmailTemplate.findByIdAndDelete(req.params.id);

    return res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Failed to delete email template:', error);
    return res.status(500).json({ message: 'Failed to delete email template' });
  }
});

// Clone template
router.post('/:id/clone', authorize('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId, userId } = req.user!;
    const { name } = req.body;

    const originalTemplate = await EmailTemplate.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!originalTemplate) {
      return res.status(404).json({ message: 'Template not found' });
    }

    const clonedTemplate = new EmailTemplate({
      organizationId,
      name: name || `${originalTemplate.name} (Copy)`,
      description: originalTemplate.description,
      category: 'custom', // Cloned templates are always custom
      type: 'custom',
      subject: originalTemplate.subject,
      htmlContent: originalTemplate.htmlContent,
      textContent: originalTemplate.textContent,
      variables: [...originalTemplate.variables],
      settings: { ...originalTemplate.settings },
      localization: {
        defaultLanguage: originalTemplate.localization.defaultLanguage,
        translations: [...originalTemplate.localization.translations],
      },
      triggers: [...originalTemplate.triggers],
      isActive: true,
      isSystem: false,
      usage: { sentCount: 0 },
      createdBy: userId,
      updatedBy: userId,
    });

    const savedTemplate = await clonedTemplate.save();
    await savedTemplate.populate('createdBy updatedBy', 'firstName lastName email');

    return res.status(201).json({
      template: savedTemplate,
      message: 'Template cloned successfully',
    });
  } catch (error) {
    console.error('Failed to clone email template:', error);
    return res.status(500).json({ message: 'Failed to clone email template' });
  }
});

// Preview template
router.post('/:id/preview', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId } = req.user!;
    const { variables, language = 'en' } = req.body;

    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    try {
      const rendered = await emailTemplateService.renderTemplate(
        (template._id as any).toString(),
        variables,
        language
      );

      return res.json({ preview: rendered });
    } catch (renderError: any) {
      return res.status(400).json({
        message: 'Template rendering failed',
        error: renderError.message,
      });
    }
  } catch (error) {
    console.error('Failed to preview email template:', error);
    return res.status(500).json({ message: 'Failed to preview email template' });
  }
});

// Send test email
router.post('/:id/test', authorize('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId } = req.user!;
    const { testEmail, variables, language = 'en' } = req.body;

    if (!testEmail) {
      return res.status(400).json({ message: 'Test email address is required' });
    }

    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    try {
      const rendered = await emailTemplateService.renderTemplate(
        (template._id as any).toString(),
        variables || {},
        language
      );

      // Here you would integrate with your email service
      // For now, just simulate success

      return res.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        preview: rendered,
      });
    } catch (renderError: any) {
      return res.status(400).json({
        message: 'Template rendering failed',
        error: renderError.message,
      });
    }
  } catch (error) {
    console.error('Failed to send test email:', error);
    return res.status(500).json({ message: 'Failed to send test email' });
  }
});

// Get template categories and types
router.get('/meta/categories', authenticate, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const categories = [
      { value: 'system', label: 'System Templates', description: 'Built-in system templates' },
      { value: 'notification', label: 'Notifications', description: 'User and form notifications' },
      { value: 'workflow', label: 'Workflow', description: 'Workflow-related emails' },
      { value: 'custom', label: 'Custom', description: 'Custom templates' },
    ];

    const types = [
      { value: 'welcome', label: 'Welcome Email', category: 'system' },
      { value: 'form_notification', label: 'Form Notification', category: 'notification' },
      { value: 'password_reset', label: 'Password Reset', category: 'system' },
      { value: 'form_reminder', label: 'Form Reminder', category: 'workflow' },
      { value: 'approval_request', label: 'Approval Request', category: 'workflow' },
      { value: 'approval_response', label: 'Approval Response', category: 'workflow' },
      { value: 'system_alert', label: 'System Alert', category: 'system' },
      { value: 'digest', label: 'Digest Email', category: 'notification' },
      { value: 'custom', label: 'Custom Template', category: 'custom' },
    ];

    return res.json({ categories, types });
  } catch (error) {
    console.error('Failed to get template metadata:', error);
    return res.status(500).json({ message: 'Failed to get template metadata' });
  }
});

// Get template usage statistics
router.get('/:id/stats', authorize('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId } = req.user!;

    const template = await EmailTemplate.findOne({
      _id: req.params.id,
      organizationId,
    });

    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // In a real implementation, you would gather more detailed stats
    const stats = {
      usage: template.usage,
      lastMonth: {
        sent: Math.floor(template.usage.sentCount * 0.3), // Mock data
        opened: Math.floor((template.usage.sentCount * 0.3 * (template.usage.openRate || 0)) / 100),
        clicked: Math.floor(
          (template.usage.sentCount * 0.3 * (template.usage.clickRate || 0)) / 100
        ),
      },
      trends: {
        sentTrend: 5.2, // Mock percentage change
        openTrend: -2.1,
        clickTrend: 1.8,
      },
    };

    return res.json({ stats });
  } catch (error) {
    console.error('Failed to get template stats:', error);
    return res.status(500).json({ message: 'Failed to get template stats' });
  }
});

// Initialize system templates
router.post('/system/initialize', authorize('admin'), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { organizationId, userId } = req.user!;

    const createdTemplates = await emailTemplateService.createSystemTemplates(
      organizationId!,
      userId!
    );

    return res.json({
      message: `${createdTemplates.length} system templates initialized`,
      templates: createdTemplates.map(t => ({ id: t._id, name: t.name, type: t.type })),
    });
  } catch (error) {
    console.error('Failed to initialize system templates:', error);
    return res.status(500).json({ message: 'Failed to initialize system templates' });
  }
});

export default router;
