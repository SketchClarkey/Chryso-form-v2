import { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Settings as GeneralIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Backup as BackupIcon,
  Assessment as AuditIcon,
  PersonalVideo as SystemIcon,
  Tune as PreferencesIcon,
  IntegrationInstructions as IntegrationsIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import GeneralSettings from '../components/settings/GeneralSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import SystemSettings from '../components/settings/SystemSettings';
import UserPreferences from '../components/settings/UserPreferences';

interface SettingsSection {
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  roles?: string[];
  component: React.ReactNode;
}

const settingsSections: SettingsSection[] = [
  {
    path: 'general',
    label: 'General',
    icon: <GeneralIcon />,
    description: 'Application name, timezone, and basic configuration',
    roles: ['admin'],
    component: <GeneralSettings />,
  },
  {
    path: 'security',
    label: 'Security',
    icon: <SecurityIcon />,
    description: 'Password policies, session settings, and authentication',
    roles: ['admin'],
    component: <SecuritySettings />,
  },
  {
    path: 'system',
    label: 'System',
    icon: <SystemIcon />,
    description: 'System information, backups, and maintenance',
    roles: ['admin'],
    component: <SystemSettings />,
  },
  {
    path: 'preferences',
    label: 'User Preferences',
    icon: <PreferencesIcon />,
    description: 'Personal settings and preferences',
    component: <UserPreferences />,
  },
];

export function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Get current section from URL
  const currentPath = location.pathname.split('/').pop() || 'general';

  // Filter sections based on user role
  const filteredSections = settingsSections.filter(section => {
    if (!section.roles) return true;
    return user?.role && section.roles.includes(user.role);
  });

  // Get current section
  const currentSection = filteredSections.find(section => section.path === currentPath);

  return (
    <Box>
      <Typography variant='h4' gutterBottom>
        Settings
      </Typography>
      <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
        Configure application settings and preferences
      </Typography>

      <Grid2 container spacing={3}>
        {/* Settings Navigation */}
        <Grid size={{ xs: 12, md: 4, lg: 3 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Settings
              </Typography>
              <List>
                {filteredSections.map((section, index) => (
                  <div key={section.path}>
                    <ListItem disablePadding>
                      <ListItemButton
                        selected={currentPath === section.path}
                        onClick={() => navigate(`/settings/${section.path}`)}
                      >
                        <ListItemIcon>{section.icon}</ListItemIcon>
                        <ListItemText
                          primary={section.label}
                          secondary={
                            <Typography
                              variant='caption'
                              color='text.secondary'
                              sx={{ display: 'block' }}
                            >
                              {section.description}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                    {index < filteredSections.length - 1 && <Divider />}
                  </div>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid2>

        {/* Settings Content */}
        <Grid size={{ xs: 12, md: 8, lg: 9 }}>
          <Paper sx={{ p: 3, minHeight: 600 }}>
            <Routes>
              <Route path='general' element={<GeneralSettings />} />
              <Route path='security' element={<SecuritySettings />} />
              <Route path='system' element={<SystemSettings />} />
              <Route path='preferences' element={<UserPreferences />} />
              <Route path='*' element={<Navigate to='/settings/general' replace />} />
            </Routes>
          </Paper>
        </Grid2>
      </Grid2>
    </Box>
  );
}
