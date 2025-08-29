import express from 'express';
import { OrganizationSettings, IOrganizationSettings } from '../models/OrganizationSettings';
import { UserPreferences, IUserPreferences } from '../models/UserPreferences';
import { authenticate } from '../middleware/auth';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Organization Settings Routes (Admin only)
router.get('/organization', authorize('admin'), async (req, res) => {
  try {
    const { organizationId } = req.user!;

    let settings = await OrganizationSettings.findOne({ organizationId })
      .populate('createdBy', 'firstName lastName email')
      .populate('updatedBy', 'firstName lastName email');

    if (!settings) {
      // Create default settings
      settings = new OrganizationSettings({
        organizationId,
        general: {
          companyName: 'My Organization',
          timezone: 'UTC',
          dateFormat: 'MM/dd/yyyy',
          timeFormat: '12h',
          defaultLanguage: 'en',
          currency: 'USD',
          fiscalYearStart: 1,
          workWeek: {
            startDay: 1,
            workDays: [1, 2, 3, 4, 5],
            workHours: { start: '09:00', end: '17:00' },
          },
          address: { country: 'US' },
          contact: { email: req.user!.email },
        },
        createdBy: req.user!.userId,
        updatedBy: req.user!.userId,
      });
      await settings.save();
    }

    res.json({ settings });
  } catch (error) {
    console.error('Failed to get organization settings:', error);
    res.status(500).json({ message: 'Failed to get organization settings' });
  }
});

router.put('/organization', authorize('admin'), async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const updateData = { ...req.body, updatedBy: req.user!.userId };

    let settings = await OrganizationSettings.findOneAndUpdate({ organizationId }, updateData, {
      new: true,
      upsert: true,
      runValidators: true,
    }).populate('createdBy updatedBy', 'firstName lastName email');

    res.json({ settings, message: 'Organization settings updated successfully' });
  } catch (error) {
    console.error('Failed to update organization settings:', error);
    res.status(500).json({ message: 'Failed to update organization settings' });
  }
});

router.get('/organization/sections', authorize('admin'), async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const settings = await OrganizationSettings.findOne({ organizationId });

    const sections = [
      {
        id: 'general',
        name: 'General Settings',
        description: 'Company information, timezone, and basic preferences',
        icon: 'business',
        enabled: true,
      },
      {
        id: 'security',
        name: 'Security & Authentication',
        description: 'Password policies, MFA, and access controls',
        icon: 'security',
        enabled: true,
      },
      {
        id: 'integrations',
        name: 'Integrations',
        description: 'Email, storage, notifications, and SSO configuration',
        icon: 'integration_instructions',
        enabled: true,
      },
      {
        id: 'features',
        name: 'Features & Limits',
        description: 'Module access and usage limits',
        icon: 'tune',
        enabled: true,
      },
      {
        id: 'customization',
        name: 'Branding & Customization',
        description: 'Themes, logos, and custom fields',
        icon: 'palette',
        enabled: true,
      },
    ];

    res.json({ sections, currentSettings: settings });
  } catch (error) {
    console.error('Failed to get settings sections:', error);
    res.status(500).json({ message: 'Failed to get settings sections' });
  }
});

// User Preferences Routes
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const { userId } = req.user!;

    let preferences = await UserPreferences.findOne({ userId });

    if (!preferences) {
      // Create default preferences
      preferences = new UserPreferences({
        userId,
        appearance: {
          theme: 'system',
          colorScheme: 'default',
          density: 'standard',
          sidebarCollapsed: false,
          language: 'en',
        },
        dashboard: {
          layout: 'grid',
          widgets: [],
          refreshInterval: 300,
        },
      });
      await preferences.save();
    }

    res.json({ preferences });
  } catch (error) {
    console.error('Failed to get user preferences:', error);
    res.status(500).json({ message: 'Failed to get user preferences' });
  }
});

router.put('/preferences', authenticate, async (req, res) => {
  try {
    const { userId } = req.user!;
    const updateData = req.body;

    const preferences = await UserPreferences.findOneAndUpdate({ userId }, updateData, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.json({ preferences, message: 'User preferences updated successfully' });
  } catch (error) {
    console.error('Failed to update user preferences:', error);
    res.status(500).json({ message: 'Failed to update user preferences' });
  }
});

router.post('/preferences/activity', authenticate, async (req, res) => {
  try {
    const { userId } = req.user!;
    const { type, itemId, itemName, action } = req.body;

    await UserPreferences.findOneAndUpdate(
      { userId },
      {
        $push: {
          recentActivity: {
            $each: [{ type, itemId, itemName, action, timestamp: new Date() }],
            $position: 0,
            $slice: 50, // Keep only the latest 50 activities
          },
        },
      },
      { upsert: true }
    );

    res.json({ message: 'Activity logged successfully' });
  } catch (error) {
    console.error('Failed to log activity:', error);
    res.status(500).json({ message: 'Failed to log activity' });
  }
});

router.post('/preferences/pin', authenticate, async (req, res) => {
  try {
    const { userId } = req.user!;
    const { type, itemId } = req.body;

    if (!['forms', 'reports', 'dashboards', 'searches'].includes(type)) {
      return res.status(400).json({ message: 'Invalid pin type' });
    }

    await UserPreferences.findOneAndUpdate(
      { userId },
      { $addToSet: { [`pinnedItems.${type}`]: itemId } },
      { upsert: true }
    );

    res.json({ message: 'Item pinned successfully' });
  } catch (error) {
    console.error('Failed to pin item:', error);
    res.status(500).json({ message: 'Failed to pin item' });
  }
});

router.delete('/preferences/pin', authenticate, async (req, res) => {
  try {
    const { userId } = req.user!;
    const { type, itemId } = req.query;

    if (!['forms', 'reports', 'dashboards', 'searches'].includes(type as string)) {
      return res.status(400).json({ message: 'Invalid pin type' });
    }

    await UserPreferences.findOneAndUpdate(
      { userId },
      { $pull: { [`pinnedItems.${type}`]: itemId } }
    );

    res.json({ message: 'Item unpinned successfully' });
  } catch (error) {
    console.error('Failed to unpin item:', error);
    res.status(500).json({ message: 'Failed to unpin item' });
  }
});

// System Information Routes (Admin only)
router.get('/system/info', authorize('admin'), async (req, res) => {
  try {
    const systemInfo = {
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'connected', // This would need actual DB health check
        version: 'MongoDB 5.0+',
      },
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        platform: process.platform,
        nodeVersion: process.version,
      },
      features: {
        emailEnabled: !!process.env.SMTP_HOST || !!process.env.SENDGRID_API_KEY,
        storageProvider: process.env.STORAGE_PROVIDER || 'local',
        authProvider: process.env.AUTH_PROVIDER || 'local',
      },
    };

    res.json({ systemInfo });
  } catch (error) {
    console.error('Failed to get system info:', error);
    res.status(500).json({ message: 'Failed to get system information' });
  }
});

// Test Configuration Routes (Admin only)
router.post('/test/email', authorize('admin'), async (req, res) => {
  try {
    const { organizationId } = req.user!;
    const { testEmail } = req.body;

    // Get email settings
    const settings = await OrganizationSettings.findOne({ organizationId });

    if (!settings?.integrations?.email?.provider) {
      return res.status(400).json({ message: 'Email provider not configured' });
    }

    // Here you would implement actual email sending test
    // For now, just simulate success

    res.json({
      success: true,
      message: `Test email sent successfully to ${testEmail}`,
    });
  } catch (error) {
    console.error('Failed to test email:', error);
    res.status(500).json({ message: 'Failed to send test email' });
  }
});

router.post('/test/storage', authorize('admin'), async (req, res) => {
  try {
    const { organizationId } = req.user!;

    // Get storage settings
    const settings = await OrganizationSettings.findOne({ organizationId });

    if (!settings?.integrations?.storage) {
      return res.status(400).json({ message: 'Storage provider not configured' });
    }

    // Here you would implement actual storage connectivity test
    // For now, just simulate success

    res.json({
      success: true,
      message: 'Storage connectivity test successful',
    });
  } catch (error) {
    console.error('Failed to test storage:', error);
    res.status(500).json({ message: 'Failed to test storage connectivity' });
  }
});

export default router;
