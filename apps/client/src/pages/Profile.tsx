import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Person as PersonIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      formSubmissions: boolean;
      approvals: boolean;
      reminders: boolean;
    };
    timezone: string;
  };
}

interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function Profile() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    role: user?.role || '',
    preferences: {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        push: false,
        formSubmissions: true,
        approvals: true,
        reminders: true,
      },
      timezone: 'UTC',
    },
  });

  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      const response = await api.put(`/users/${user?.id}`, data);
      return response.data;
    },
    onSuccess: data => {
      updateUser(data.data.user);
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      setIsEditing(false);
      setErrors({});
    },
    onError: (error: any) => {
      console.error('Profile update error:', error);
      setErrors({ general: error.response?.data?.message || 'Failed to update profile' });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeData) => {
      const response = await api.put(`/users/${user?.id}/change-password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.data;
    },
    onSuccess: () => {
      setShowPasswordDialog(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
    },
    onError: (error: any) => {
      console.error('Password change error:', error);
      setErrors({ password: error.response?.data?.message || 'Failed to change password' });
    },
  });

  const handleSaveProfile = () => {
    const newErrors: Record<string, string> = {};

    if (!profileData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!profileData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!profileData.email.trim()) {
      newErrors.email = 'Email is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    updateProfileMutation.mutate({
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      preferences: profileData.preferences,
    });
  };

  const handlePasswordChange = () => {
    const newErrors: Record<string, string> = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    changePasswordMutation.mutate(passwordData);
  };

  const handleCancel = () => {
    setProfileData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      role: user?.role || '',
      preferences: {
        theme: 'light',
        language: 'en',
        notifications: {
          email: true,
          push: false,
          formSubmissions: true,
          approvals: true,
          reminders: true,
        },
        timezone: 'UTC',
      },
    });
    setIsEditing(false);
    setErrors({});
  };

  return (
    <Box>
      <Typography variant='h4' gutterBottom>
        Profile
      </Typography>
      <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
        Manage your account settings and preferences
      </Typography>

      {errors.general && (
        <Alert severity='error' sx={{ mb: 3 }}>
          {errors.general}
        </Alert>
      )}

      <Grid2 container spacing={3}>
        {/* Profile Information */}
        <Grid2 md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant='h6'>Profile Information</Typography>
                <Box sx={{ flexGrow: 1 }} />
                {!isEditing ? (
                  <Button
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                    variant='outlined'
                  >
                    Edit
                  </Button>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      startIcon={<SaveIcon />}
                      onClick={handleSaveProfile}
                      variant='contained'
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? <CircularProgress size={20} /> : 'Save'}
                    </Button>
                    <Button
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      variant='outlined'
                      disabled={updateProfileMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </Box>
                )}
              </Box>

              <Grid2 container spacing={3}>
                <Grid2 sm={6}>
                  <TextField
                    fullWidth
                    label='First Name'
                    value={profileData.firstName}
                    onChange={e => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={!isEditing}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                  />
                </Grid2>
                <Grid2 sm={6}>
                  <TextField
                    fullWidth
                    label='Last Name'
                    value={profileData.lastName}
                    onChange={e => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={!isEditing}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                  />
                </Grid2>
                <Grid2 sm={6}>
                  <TextField
                    fullWidth
                    label='Email'
                    value={profileData.email}
                    disabled
                    helperText='Email cannot be changed'
                  />
                </Grid2>
                <Grid2 sm={6}>
                  <TextField
                    fullWidth
                    label='Role'
                    value={profileData.role}
                    disabled
                    helperText='Role is assigned by administrators'
                  />
                </Grid2>
              </Grid2>

              <Divider sx={{ my: 3 }} />

              {/* Preferences */}
              <Typography variant='h6' gutterBottom>
                Preferences
              </Typography>

              <Grid2 container spacing={3}>
                <Grid2 sm={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={profileData.preferences.theme}
                      onChange={e =>
                        setProfileData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            theme: e.target.value as 'light' | 'dark',
                          },
                        }))
                      }
                      label='Theme'
                    >
                      <MenuItem value='light'>Light</MenuItem>
                      <MenuItem value='dark'>Dark</MenuItem>
                    </Select>
                  </FormControl>
                </Grid2>
                <Grid2 sm={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={profileData.preferences.language}
                      onChange={e =>
                        setProfileData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, language: e.target.value },
                        }))
                      }
                      label='Language'
                    >
                      <MenuItem value='en'>English</MenuItem>
                      <MenuItem value='es'>Spanish</MenuItem>
                      <MenuItem value='fr'>French</MenuItem>
                    </Select>
                  </FormControl>
                </Grid2>
                <Grid2 sm={6}>
                  <FormControl fullWidth disabled={!isEditing}>
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={profileData.preferences.timezone}
                      onChange={e =>
                        setProfileData(prev => ({
                          ...prev,
                          preferences: { ...prev.preferences, timezone: e.target.value },
                        }))
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
                </Grid2>
              </Grid2>

              {/* Notification Settings */}
              <Typography variant='h6' gutterBottom sx={{ mt: 3 }}>
                Notification Settings
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={profileData.preferences.notifications.email}
                      onChange={e =>
                        setProfileData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            notifications: {
                              ...prev.preferences.notifications,
                              email: e.target.checked,
                            },
                          },
                        }))
                      }
                      disabled={!isEditing}
                    />
                  }
                  label='Email notifications'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profileData.preferences.notifications.formSubmissions}
                      onChange={e =>
                        setProfileData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            notifications: {
                              ...prev.preferences.notifications,
                              formSubmissions: e.target.checked,
                            },
                          },
                        }))
                      }
                      disabled={!isEditing}
                    />
                  }
                  label='Form submission notifications'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profileData.preferences.notifications.approvals}
                      onChange={e =>
                        setProfileData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            notifications: {
                              ...prev.preferences.notifications,
                              approvals: e.target.checked,
                            },
                          },
                        }))
                      }
                      disabled={!isEditing}
                    />
                  }
                  label='Approval notifications'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={profileData.preferences.notifications.reminders}
                      onChange={e =>
                        setProfileData(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            notifications: {
                              ...prev.preferences.notifications,
                              reminders: e.target.checked,
                            },
                          },
                        }))
                      }
                      disabled={!isEditing}
                    />
                  }
                  label='Reminder notifications'
                />
              </Box>
            </CardContent>
          </Card>
        </Grid2>

        {/* Account Actions */}
        <Grid2 md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', fontSize: '2rem' }}>
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </Avatar>
                <Box sx={{ ml: 2 }}>
                  <Typography variant='h6'>
                    {user?.firstName} {user?.lastName}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {user?.role}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {user?.email}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <List>
                <ListItem button onClick={() => setShowPasswordDialog(true)}>
                  <SecurityIcon sx={{ mr: 2 }} />
                  <ListItemText
                    primary='Change Password'
                    secondary='Update your account password'
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>

          <Paper sx={{ mt: 2, p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Account Statistics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2'>Member since:</Typography>
                <Typography variant='body2'>
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant='body2'>Last login:</Typography>
                <Typography variant='body2'>
                  {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid2>
      </Grid2>

      {/* Password Change Dialog */}
      <Dialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {errors.password && (
            <Alert severity='error' sx={{ mb: 2 }}>
              {errors.password}
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label='Current Password'
              type='password'
              value={passwordData.currentPassword}
              onChange={e =>
                setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))
              }
              error={!!errors.currentPassword}
              helperText={errors.currentPassword}
            />
            <TextField
              fullWidth
              label='New Password'
              type='password'
              value={passwordData.newPassword}
              onChange={e => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              error={!!errors.newPassword}
              helperText={errors.newPassword || 'Must be at least 8 characters'}
            />
            <TextField
              fullWidth
              label='Confirm New Password'
              type='password'
              value={passwordData.confirmPassword}
              onChange={e =>
                setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))
              }
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowPasswordDialog(false)}
            disabled={changePasswordMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePasswordChange}
            variant='contained'
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? <CircularProgress size={20} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
