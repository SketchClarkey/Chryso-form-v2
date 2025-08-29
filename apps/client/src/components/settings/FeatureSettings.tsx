import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  Switch,
  TextField,
  Alert,
  LinearProgress,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  Tune as FeaturesIcon,
  Dashboard as DashboardIcon,
  Analytics as AnalyticsIcon,
  PhoneIphone as MobileIcon,
  Api as ApiIcon,
  Build as CustomIcon,
  AccountTree as WorkflowIcon,
  IntegrationInstructions as IntegrationsIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

interface FeatureSettingsProps {
  settings: any;
  onChange: (data: any) => void;
}

const FeatureSettings: React.FC<FeatureSettingsProps> = ({ settings, onChange }) => {
  const handleModuleChange = (module: string, enabled: boolean) => {
    onChange({
      modules: {
        ...settings?.modules,
        [module]: enabled,
      },
    });
  };

  const handleLimitChange = (limit: string, value: number) => {
    onChange({
      limits: {
        ...settings?.limits,
        [limit]: value,
      },
    });
  };

  const modules = [
    {
      key: 'formBuilder',
      name: 'Form Builder',
      description: 'Advanced form creation and editing capabilities',
      icon: <DashboardIcon />,
      required: true,
    },
    {
      key: 'reporting',
      name: 'Reporting',
      description: 'Generate and customize reports from form data',
      icon: <AnalyticsIcon />,
      required: true,
    },
    {
      key: 'analytics',
      name: 'Analytics',
      description: 'Advanced analytics and data visualization',
      icon: <AnalyticsIcon />,
      required: false,
    },
    {
      key: 'mobileApp',
      name: 'Mobile App',
      description: 'Mobile application access and offline capabilities',
      icon: <MobileIcon />,
      required: false,
    },
    {
      key: 'apiAccess',
      name: 'API Access',
      description: 'RESTful API for third-party integrations',
      icon: <ApiIcon />,
      required: false,
    },
    {
      key: 'customFields',
      name: 'Custom Fields',
      description: 'Create and manage custom field types',
      icon: <CustomIcon />,
      required: false,
    },
    {
      key: 'workflows',
      name: 'Workflows',
      description: 'Automated workflows and approval processes',
      icon: <WorkflowIcon />,
      required: false,
    },
    {
      key: 'integrations',
      name: 'Integrations',
      description: 'Third-party service integrations',
      icon: <IntegrationsIcon />,
      required: false,
    },
  ];

  const getUsagePercentage = (current: number, max: number) => {
    return Math.min((current / max) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 75) return 'warning';
    return 'success';
  };

  // Mock current usage data - in real app this would come from API
  const currentUsage = {
    users: 28,
    forms: 156,
    storage: 3.2, // GB
    apiCalls: 8450,
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Module Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<FeaturesIcon />}
          title="Feature Modules"
          subheader="Enable or disable specific features for your organization"
        />
        <CardContent>
          <Grid container spacing={3}>
            {modules.map((module) => (
              <Grid item xs={12} md={6} key={module.key}>
                <Box
                  sx={{
                    p: 2,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                >
                  <Box sx={{ color: 'primary.main', mt: 0.5 }}>{module.icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle1" fontWeight="medium">
                        {module.name}
                      </Typography>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings?.modules?.[module.key] !== false}
                            onChange={(e) => handleModuleChange(module.key, e.target.checked)}
                            disabled={module.required}
                          />
                        }
                        label=""
                        sx={{ m: 0 }}
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {module.description}
                    </Typography>
                    {module.required && (
                      <Chip
                        label="Required"
                        size="small"
                        color="primary"
                        variant="outlined"
                        icon={<CheckIcon />}
                      />
                    )}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Note:</strong> Disabling modules will hide related features from users but won't delete existing data.
              Re-enabling a module will restore access to all previous data.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader
          title="Usage Limits"
          subheader="Configure resource limits for your organization"
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Maximum Users
              </Typography>
              <TextField
                type="number"
                value={settings?.limits?.maxUsers || 50}
                onChange={(e) => handleLimitChange('maxUsers', parseInt(e.target.value) || 50)}
                fullWidth
                inputProps={{ min: 1, max: 10000 }}
              />
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Current: {currentUsage.users} users
                  </Typography>
                  <Typography
                    variant="caption"
                    color={
                      getUsagePercentage(currentUsage.users, settings?.limits?.maxUsers || 50) >= 90
                        ? 'error.main'
                        : 'text.secondary'
                    }
                  >
                    {Math.round(getUsagePercentage(currentUsage.users, settings?.limits?.maxUsers || 50))}% used
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={getUsagePercentage(currentUsage.users, settings?.limits?.maxUsers || 50)}
                  color={getUsageColor(getUsagePercentage(currentUsage.users, settings?.limits?.maxUsers || 50))}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Maximum Forms
              </Typography>
              <TextField
                type="number"
                value={settings?.limits?.maxForms || 100}
                onChange={(e) => handleLimitChange('maxForms', parseInt(e.target.value) || 100)}
                fullWidth
                inputProps={{ min: 10, max: 50000 }}
              />
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Current: {currentUsage.forms} forms
                  </Typography>
                  <Typography
                    variant="caption"
                    color={
                      getUsagePercentage(currentUsage.forms, settings?.limits?.maxForms || 100) >= 90
                        ? 'error.main'
                        : 'text.secondary'
                    }
                  >
                    {Math.round(getUsagePercentage(currentUsage.forms, settings?.limits?.maxForms || 100))}% used
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={getUsagePercentage(currentUsage.forms, settings?.limits?.maxForms || 100)}
                  color={getUsageColor(getUsagePercentage(currentUsage.forms, settings?.limits?.maxForms || 100))}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                Storage Quota (GB)
              </Typography>
              <TextField
                type="number"
                value={settings?.limits?.storageQuota || 10}
                onChange={(e) => handleLimitChange('storageQuota', parseInt(e.target.value) || 10)}
                fullWidth
                inputProps={{ min: 1, max: 1000 }}
              />
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Current: {currentUsage.storage} GB used
                  </Typography>
                  <Typography
                    variant="caption"
                    color={
                      getUsagePercentage(currentUsage.storage, settings?.limits?.storageQuota || 10) >= 90
                        ? 'error.main'
                        : 'text.secondary'
                    }
                  >
                    {Math.round(getUsagePercentage(currentUsage.storage, settings?.limits?.storageQuota || 10))}% used
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={getUsagePercentage(currentUsage.storage, settings?.limits?.storageQuota || 10)}
                  color={getUsageColor(getUsagePercentage(currentUsage.storage, settings?.limits?.storageQuota || 10))}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" gutterBottom>
                API Calls per Month
              </Typography>
              <TextField
                type="number"
                value={settings?.limits?.apiCallsPerMonth || 10000}
                onChange={(e) => handleLimitChange('apiCallsPerMonth', parseInt(e.target.value) || 10000)}
                fullWidth
                inputProps={{ min: 1000, max: 10000000 }}
                disabled={!settings?.modules?.apiAccess}
              />
              <Box sx={{ mt: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    This month: {currentUsage.apiCalls} calls
                  </Typography>
                  <Typography
                    variant="caption"
                    color={
                      getUsagePercentage(currentUsage.apiCalls, settings?.limits?.apiCallsPerMonth || 10000) >= 90
                        ? 'error.main'
                        : 'text.secondary'
                    }
                  >
                    {Math.round(getUsagePercentage(currentUsage.apiCalls, settings?.limits?.apiCallsPerMonth || 10000))}% used
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={getUsagePercentage(currentUsage.apiCalls, settings?.limits?.apiCallsPerMonth || 10000)}
                  color={getUsageColor(getUsagePercentage(currentUsage.apiCalls, settings?.limits?.apiCallsPerMonth || 10000))}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Grid>
          </Grid>

          <Alert severity="warning" sx={{ mt: 3 }} icon={<WarningIcon />}>
            <Typography variant="body2">
              <strong>Important:</strong> When limits are reached, new users won't be able to create additional resources.
              Existing resources will continue to function normally. Consider upgrading your plan if you frequently reach these limits.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FeatureSettings;