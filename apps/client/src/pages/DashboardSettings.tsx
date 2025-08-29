import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useApi } from '../hooks/useApi';

interface DashboardConfig {
  global: {
    defaultTheme: 'light' | 'dark' | 'auto';
    autoRefreshInterval: number;
    maxWidgetsPerDashboard: number;
    enablePublicDashboards: boolean;
    enableTemplates: boolean;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  permissions: {
    canCreateDashboards: string[];
    canEditAllDashboards: string[];
    canDeleteDashboards: string[];
    canShareDashboards: string[];
    canManageTemplates: string[];
  };
  dataRetention: {
    enableDataRetention: boolean;
    retentionPeriodDays: number;
    autoCleanup: boolean;
    archiveOldDashboards: boolean;
  };
  notifications: {
    enableEmailNotifications: boolean;
    notifyOnDashboardShare: boolean;
    notifyOnDashboardUpdate: boolean;
    digestFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

const DashboardSettings: React.FC = () => {
  const { request } = useApi();
  const [config, setConfig] = useState<DashboardConfig>({
    global: {
      defaultTheme: 'light',
      autoRefreshInterval: 300,
      maxWidgetsPerDashboard: 20,
      enablePublicDashboards: true,
      enableTemplates: true,
      cacheEnabled: true,
      cacheTTL: 300,
    },
    permissions: {
      canCreateDashboards: ['admin', 'manager'],
      canEditAllDashboards: ['admin'],
      canDeleteDashboards: ['admin'],
      canShareDashboards: ['admin', 'manager'],
      canManageTemplates: ['admin', 'manager'],
    },
    dataRetention: {
      enableDataRetention: false,
      retentionPeriodDays: 365,
      autoCleanup: false,
      archiveOldDashboards: false,
    },
    notifications: {
      enableEmailNotifications: true,
      notifyOnDashboardShare: true,
      notifyOnDashboardUpdate: false,
      digestFrequency: 'weekly',
    },
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = ['admin', 'manager', 'technician'];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await request('/api/settings/dashboard');
      if (response.data?.config) {
        setConfig(response.data.config);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await request('/api/settings/dashboard', {
        method: 'PUT',
        data: { config },
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (section: keyof typeof config.permissions, role: string) => {
    const currentRoles = config.permissions[section];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];

    setConfig({
      ...config,
      permissions: {
        ...config.permissions,
        [section]: newRoles,
      },
    });
  };

  return (
    <Box>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
        <Box>
          <Typography variant='h4' gutterBottom>
            Dashboard Configuration
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Configure global dashboard settings, permissions, and policies
          </Typography>
        </Box>
        <Box display='flex' gap={1}>
          <Button
            variant='outlined'
            startIcon={<RefreshIcon />}
            onClick={loadSettings}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant='contained'
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
          >
            Save Settings
          </Button>
        </Box>
      </Box>

      {success && (
        <Alert severity='success' sx={{ mb: 3 }}>
          Dashboard settings saved successfully
        </Alert>
      )}

      {error && (
        <Alert severity='error' sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Global Settings */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant='h6'>Global Settings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Default Theme</InputLabel>
                    <Select
                      value={config.global.defaultTheme}
                      onChange={e =>
                        setConfig({
                          ...config,
                          global: { ...config.global, defaultTheme: e.target.value as any },
                        })
                      }
                    >
                      <MenuItem value='light'>Light</MenuItem>
                      <MenuItem value='dark'>Dark</MenuItem>
                      <MenuItem value='auto'>Auto (System)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Auto Refresh Interval (seconds)'
                    type='number'
                    value={config.global.autoRefreshInterval}
                    onChange={e =>
                      setConfig({
                        ...config,
                        global: {
                          ...config.global,
                          autoRefreshInterval: parseInt(e.target.value) || 300,
                        },
                      })
                    }
                    inputProps={{ min: 30, max: 3600 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Max Widgets Per Dashboard'
                    type='number'
                    value={config.global.maxWidgetsPerDashboard}
                    onChange={e =>
                      setConfig({
                        ...config,
                        global: {
                          ...config.global,
                          maxWidgetsPerDashboard: parseInt(e.target.value) || 20,
                        },
                      })
                    }
                    inputProps={{ min: 1, max: 50 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label='Cache TTL (seconds)'
                    type='number'
                    value={config.global.cacheTTL}
                    onChange={e =>
                      setConfig({
                        ...config,
                        global: { ...config.global, cacheTTL: parseInt(e.target.value) || 300 },
                      })
                    }
                    inputProps={{ min: 30, max: 3600 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Stack direction='row' spacing={2} flexWrap='wrap'>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.global.enablePublicDashboards}
                          onChange={e =>
                            setConfig({
                              ...config,
                              global: {
                                ...config.global,
                                enablePublicDashboards: e.target.checked,
                              },
                            })
                          }
                        />
                      }
                      label='Enable Public Dashboards'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.global.enableTemplates}
                          onChange={e =>
                            setConfig({
                              ...config,
                              global: { ...config.global, enableTemplates: e.target.checked },
                            })
                          }
                        />
                      }
                      label='Enable Templates'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={config.global.cacheEnabled}
                          onChange={e =>
                            setConfig({
                              ...config,
                              global: { ...config.global, cacheEnabled: e.target.checked },
                            })
                          }
                        />
                      }
                      label='Enable Caching'
                    />
                  </Stack>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Permissions */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant='h6'>Permissions</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {Object.entries(config.permissions).map(([permission, allowedRoles]) => (
                  <Grid item xs={12} key={permission}>
                    <Box>
                      <Typography
                        variant='subtitle2'
                        gutterBottom
                        sx={{ textTransform: 'capitalize' }}
                      >
                        {permission.replace(/([A-Z])/g, ' $1').trim()}
                      </Typography>
                      <Stack direction='row' spacing={1} flexWrap='wrap'>
                        {roles.map(role => (
                          <Chip
                            key={role}
                            label={role}
                            clickable
                            color={allowedRoles.includes(role) ? 'primary' : 'default'}
                            onClick={() =>
                              handleRoleToggle(permission as keyof typeof config.permissions, role)
                            }
                            variant={allowedRoles.includes(role) ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Data Retention */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant='h6'>Data Retention</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.dataRetention.enableDataRetention}
                        onChange={e =>
                          setConfig({
                            ...config,
                            dataRetention: {
                              ...config.dataRetention,
                              enableDataRetention: e.target.checked,
                            },
                          })
                        }
                      />
                    }
                    label='Enable Data Retention Policies'
                  />
                </Grid>
                {config.dataRetention.enableDataRetention && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label='Retention Period (days)'
                        type='number'
                        value={config.dataRetention.retentionPeriodDays}
                        onChange={e =>
                          setConfig({
                            ...config,
                            dataRetention: {
                              ...config.dataRetention,
                              retentionPeriodDays: parseInt(e.target.value) || 365,
                            },
                          })
                        }
                        inputProps={{ min: 30, max: 2555 }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction='row' spacing={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.dataRetention.autoCleanup}
                              onChange={e =>
                                setConfig({
                                  ...config,
                                  dataRetention: {
                                    ...config.dataRetention,
                                    autoCleanup: e.target.checked,
                                  },
                                })
                              }
                            />
                          }
                          label='Auto Cleanup'
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.dataRetention.archiveOldDashboards}
                              onChange={e =>
                                setConfig({
                                  ...config,
                                  dataRetention: {
                                    ...config.dataRetention,
                                    archiveOldDashboards: e.target.checked,
                                  },
                                })
                              }
                            />
                          }
                          label='Archive Old Dashboards'
                        />
                      </Stack>
                    </Grid>
                  </>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant='h6'>Notifications</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.notifications.enableEmailNotifications}
                        onChange={e =>
                          setConfig({
                            ...config,
                            notifications: {
                              ...config.notifications,
                              enableEmailNotifications: e.target.checked,
                            },
                          })
                        }
                      />
                    }
                    label='Enable Email Notifications'
                  />
                </Grid>
                {config.notifications.enableEmailNotifications && (
                  <>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel>Digest Frequency</InputLabel>
                        <Select
                          value={config.notifications.digestFrequency}
                          onChange={e =>
                            setConfig({
                              ...config,
                              notifications: {
                                ...config.notifications,
                                digestFrequency: e.target.value as any,
                              },
                            })
                          }
                        >
                          <MenuItem value='daily'>Daily</MenuItem>
                          <MenuItem value='weekly'>Weekly</MenuItem>
                          <MenuItem value='monthly'>Monthly</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction='row' spacing={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.notifications.notifyOnDashboardShare}
                              onChange={e =>
                                setConfig({
                                  ...config,
                                  notifications: {
                                    ...config.notifications,
                                    notifyOnDashboardShare: e.target.checked,
                                  },
                                })
                              }
                            />
                          }
                          label='Notify on Dashboard Share'
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={config.notifications.notifyOnDashboardUpdate}
                              onChange={e =>
                                setConfig({
                                  ...config,
                                  notifications: {
                                    ...config.notifications,
                                    notifyOnDashboardUpdate: e.target.checked,
                                  },
                                })
                              }
                            />
                          }
                          label='Notify on Dashboard Update'
                        />
                      </Stack>
                    </Grid>
                  </>
                )}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardSettings;
