import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Stack,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  Slider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Palette as AppearanceIcon,
  Notifications as NotificationsIcon,
  Work as WorkIcon,
  ViewModule as DisplayIcon,
  Security as PrivacyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Dashboard as DashboardIcon,
  Description as FormIcon,
  Assessment as ReportIcon,
  Search as SearchIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`preferences-tabpanel-${index}`}
      aria-labelledby={`preferences-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const UserPreferences: React.FC = () => {
  const { request } = useApi();
  const [currentTab, setCurrentTab] = useState(0);
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <AppearanceIcon /> },
    { id: 'notifications', label: 'Notifications', icon: <NotificationsIcon /> },
    { id: 'work', label: 'Work Preferences', icon: <WorkIcon /> },
    { id: 'display', label: 'Data Display', icon: <DisplayIcon /> },
    { id: 'privacy', label: 'Privacy', icon: <PrivacyIcon /> },
  ];

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const response = await request('/api/settings/preferences');
      setPreferences(response.data.preferences);
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);

    try {
      await request('/api/settings/preferences', {
        method: 'PUT',
        data: preferences,
      });

      setSuccess('Preferences saved successfully!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (section: string, field: string, value: any) => {
    setPreferences((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [field]: value,
      },
    }));
  };

  const handleNestedPreferenceChange = (
    section: string,
    subsection: string,
    field: string,
    value: any
  ) => {
    setPreferences((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [subsection]: {
          ...prev?.[section]?.[subsection],
          [field]: value,
        },
      },
    }));
  };

  if (loading || !preferences) {
    return (
      <Container maxWidth='lg' sx={{ py: 4 }}>
        <Typography variant='h4' gutterBottom>
          User Preferences
        </Typography>
        <Typography>Loading preferences...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth='lg' sx={{ py: 4 }}>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h4'>User Preferences</Typography>
        <Button variant='contained' onClick={handleSave} startIcon={<SaveIcon />} disabled={saving}>
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </Box>

      {success && (
        <Alert severity='success' sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={(_, newValue) => setCurrentTab(newValue)}
            aria-label='preferences tabs'
            variant='scrollable'
            scrollButtons='auto'
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.id}
                icon={tab.icon}
                iconPosition='start'
                label={tab.label}
                id={`preferences-tab-${index}`}
                aria-controls={`preferences-tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0 }}>
          {/* Appearance */}
          <TabPanel value={currentTab} index={0}>
            <Box sx={{ p: 3 }}>
              <Typography variant='h6' gutterBottom>
                Appearance Settings
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={preferences?.appearance?.theme || 'system'}
                      onChange={e => handlePreferenceChange('appearance', 'theme', e.target.value)}
                      label='Theme'
                    >
                      <MenuItem value='light'>Light</MenuItem>
                      <MenuItem value='dark'>Dark</MenuItem>
                      <MenuItem value='system'>System Default</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Color Scheme</InputLabel>
                    <Select
                      value={preferences?.appearance?.colorScheme || 'default'}
                      onChange={e =>
                        handlePreferenceChange('appearance', 'colorScheme', e.target.value)
                      }
                      label='Color Scheme'
                    >
                      <MenuItem value='default'>Default</MenuItem>
                      <MenuItem value='blue'>Blue</MenuItem>
                      <MenuItem value='green'>Green</MenuItem>
                      <MenuItem value='purple'>Purple</MenuItem>
                      <MenuItem value='orange'>Orange</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Density</InputLabel>
                    <Select
                      value={preferences?.appearance?.density || 'standard'}
                      onChange={e =>
                        handlePreferenceChange('appearance', 'density', e.target.value)
                      }
                      label='Density'
                    >
                      <MenuItem value='comfortable'>Comfortable</MenuItem>
                      <MenuItem value='standard'>Standard</MenuItem>
                      <MenuItem value='compact'>Compact</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={preferences?.appearance?.language || 'en'}
                      onChange={e =>
                        handlePreferenceChange('appearance', 'language', e.target.value)
                      }
                      label='Language'
                    >
                      <MenuItem value='en'>English</MenuItem>
                      <MenuItem value='es'>Spanish</MenuItem>
                      <MenuItem value='fr'>French</MenuItem>
                      <MenuItem value='de'>German</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.appearance?.sidebarCollapsed || false}
                        onChange={e =>
                          handlePreferenceChange('appearance', 'sidebarCollapsed', e.target.checked)
                        }
                      />
                    }
                    label='Keep sidebar collapsed by default'
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Notifications */}
          <TabPanel value={currentTab} index={1}>
            <Box sx={{ p: 3 }}>
              <Typography variant='h6' gutterBottom>
                Notification Settings
              </Typography>

              <Typography variant='subtitle1' gutterBottom sx={{ mt: 3 }}>
                Email Notifications
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.notifications?.email?.formSubmissions || false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'notifications',
                            'email',
                            'formSubmissions',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='Form Submissions'
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.notifications?.email?.formAssignments || false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'notifications',
                            'email',
                            'formAssignments',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='Form Assignments'
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.notifications?.email?.systemAlerts || false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'notifications',
                            'email',
                            'systemAlerts',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='System Alerts'
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.notifications?.email?.weeklyDigest || false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'notifications',
                            'email',
                            'weeklyDigest',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='Weekly Digest'
                  />
                </Grid>
              </Grid>

              <Typography variant='subtitle1' gutterBottom sx={{ mt: 3 }}>
                Browser Notifications
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.notifications?.browser?.enabled || false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'notifications',
                            'browser',
                            'enabled',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='Enable browser notifications'
                  />
                </Grid>
                {preferences?.notifications?.browser?.enabled && (
                  <>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences?.notifications?.browser?.formSubmissions || false}
                            onChange={e =>
                              handleNestedPreferenceChange(
                                'notifications',
                                'browser',
                                'formSubmissions',
                                e.target.checked
                              )
                            }
                          />
                        }
                        label='Form Submissions'
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={preferences?.notifications?.browser?.mentions || false}
                            onChange={e =>
                              handleNestedPreferenceChange(
                                'notifications',
                                'browser',
                                'mentions',
                                e.target.checked
                              )
                            }
                          />
                        }
                        label='Mentions'
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          </TabPanel>

          {/* Work Preferences */}
          <TabPanel value={currentTab} index={2}>
            <Box sx={{ p: 3 }}>
              <Typography variant='h6' gutterBottom>
                Work Preferences
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={preferences?.workPreferences?.timezone || 'UTC'}
                      onChange={e =>
                        handleNestedPreferenceChange(
                          'workPreferences',
                          'timezone',
                          '',
                          e.target.value
                        )
                      }
                      label='Timezone'
                    >
                      <MenuItem value='UTC'>UTC</MenuItem>
                      <MenuItem value='America/New_York'>Eastern Time</MenuItem>
                      <MenuItem value='America/Chicago'>Central Time</MenuItem>
                      <MenuItem value='America/Denver'>Mountain Time</MenuItem>
                      <MenuItem value='America/Los_Angeles'>Pacific Time</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Default Form View</InputLabel>
                    <Select
                      value={preferences?.workPreferences?.defaultFormView || 'list'}
                      onChange={e =>
                        handleNestedPreferenceChange(
                          'workPreferences',
                          'defaultFormView',
                          '',
                          e.target.value
                        )
                      }
                      label='Default Form View'
                    >
                      <MenuItem value='grid'>Grid</MenuItem>
                      <MenuItem value='list'>List</MenuItem>
                      <MenuItem value='kanban'>Kanban</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.workPreferences?.autoAssignForms || false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'workPreferences',
                            'autoAssignForms',
                            '',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='Auto-assign new forms to me'
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Data Display */}
          <TabPanel value={currentTab} index={3}>
            <Box sx={{ p: 3 }}>
              <Typography variant='h6' gutterBottom>
                Data Display Settings
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Date Format</InputLabel>
                    <Select
                      value={preferences?.dataDisplay?.dateFormat || 'MM/dd/yyyy'}
                      onChange={e =>
                        handleNestedPreferenceChange(
                          'dataDisplay',
                          'dateFormat',
                          '',
                          e.target.value
                        )
                      }
                      label='Date Format'
                    >
                      <MenuItem value='MM/dd/yyyy'>MM/dd/yyyy (US)</MenuItem>
                      <MenuItem value='dd/MM/yyyy'>dd/MM/yyyy (UK)</MenuItem>
                      <MenuItem value='yyyy-MM-dd'>yyyy-MM-dd (ISO)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Time Format</InputLabel>
                    <Select
                      value={preferences?.dataDisplay?.timeFormat || '12h'}
                      onChange={e =>
                        handleNestedPreferenceChange(
                          'dataDisplay',
                          'timeFormat',
                          '',
                          e.target.value
                        )
                      }
                      label='Time Format'
                    >
                      <MenuItem value='12h'>12-hour (AM/PM)</MenuItem>
                      <MenuItem value='24h'>24-hour</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography gutterBottom>Items per page</Typography>
                  <Slider
                    value={preferences?.dataDisplay?.itemsPerPage || 25}
                    onChange={(_, value) =>
                      handleNestedPreferenceChange('dataDisplay', 'itemsPerPage', '', value)
                    }
                    min={10}
                    max={100}
                    step={5}
                    marks
                    valueLabelDisplay='on'
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Default Sort Order</InputLabel>
                    <Select
                      value={preferences?.dataDisplay?.defaultSortOrder || 'desc'}
                      onChange={e =>
                        handleNestedPreferenceChange(
                          'dataDisplay',
                          'defaultSortOrder',
                          '',
                          e.target.value
                        )
                      }
                      label='Default Sort Order'
                    >
                      <MenuItem value='asc'>Ascending</MenuItem>
                      <MenuItem value='desc'>Descending</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.dataDisplay?.showTutorials !== false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'dataDisplay',
                            'showTutorials',
                            '',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='Show tutorial tooltips and help messages'
                  />
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Privacy */}
          <TabPanel value={currentTab} index={4}>
            <Box sx={{ p: 3 }}>
              <Typography variant='h6' gutterBottom>
                Privacy Settings
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Profile Visibility</InputLabel>
                    <Select
                      value={preferences?.privacy?.profileVisibility || 'organization'}
                      onChange={e =>
                        handleNestedPreferenceChange(
                          'privacy',
                          'profileVisibility',
                          '',
                          e.target.value
                        )
                      }
                      label='Profile Visibility'
                    >
                      <MenuItem value='public'>Public</MenuItem>
                      <MenuItem value='organization'>Organization Only</MenuItem>
                      <MenuItem value='private'>Private</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.privacy?.showOnlineStatus !== false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'privacy',
                            'showOnlineStatus',
                            '',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='Show online status to other users'
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.privacy?.allowDirectMessages !== false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'privacy',
                            'allowDirectMessages',
                            '',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='Allow direct messages from other users'
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={preferences?.privacy?.shareActivityStatus !== false}
                        onChange={e =>
                          handleNestedPreferenceChange(
                            'privacy',
                            'shareActivityStatus',
                            '',
                            e.target.checked
                          )
                        }
                      />
                    }
                    label='Share activity status (currently working on)'
                  />
                </Grid>
              </Grid>

              {/* Pinned Items */}
              <Typography variant='h6' gutterBottom sx={{ mt: 4 }}>
                Pinned Items
              </Typography>

              <Grid container spacing={2}>
                {/* Pinned Forms */}
                <Grid item xs={12} md={6}>
                  <Typography variant='subtitle2' gutterBottom>
                    <FormIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Pinned Forms
                  </Typography>
                  {preferences?.pinnedItems?.forms?.length > 0 ? (
                    <List dense>
                      {preferences.pinnedItems.forms.slice(0, 3).map((formId: string) => (
                        <ListItem key={formId}>
                          <ListItemIcon>
                            <StarIcon color='primary' />
                          </ListItemIcon>
                          <ListItemText primary={`Form ${formId}`} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      No pinned forms
                    </Typography>
                  )}
                </Grid>

                {/* Pinned Reports */}
                <Grid item xs={12} md={6}>
                  <Typography variant='subtitle2' gutterBottom>
                    <ReportIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Pinned Reports
                  </Typography>
                  {preferences?.pinnedItems?.reports?.length > 0 ? (
                    <List dense>
                      {preferences.pinnedItems.reports.slice(0, 3).map((reportId: string) => (
                        <ListItem key={reportId}>
                          <ListItemIcon>
                            <StarIcon color='primary' />
                          </ListItemIcon>
                          <ListItemText primary={`Report ${reportId}`} />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant='body2' color='text.secondary'>
                      No pinned reports
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </Box>
          </TabPanel>
        </CardContent>
      </Card>
    </Container>
  );
};

export default UserPreferences;
