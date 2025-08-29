import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Typography,
  Divider,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import type { User } from './UserTable';

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'technician';
  password?: string;
  confirmPassword?: string;
  worksiteIds: string[];
  isActive: boolean;
}

interface Worksite {
  id: string;
  name: string;
}

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (userData: UserFormData) => Promise<void>;
  user?: User | null;
  worksites: Worksite[];
  loading: boolean;
  error?: string;
}

const initialFormData: UserFormData = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'technician',
  password: '',
  confirmPassword: '',
  worksiteIds: [],
  isActive: true,
};

export function UserForm({
  open,
  onClose,
  onSubmit,
  user,
  worksites,
  loading,
  error,
}: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const isEditing = Boolean(user);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        worksiteIds: user.worksites.map(w => w.id),
        isActive: user.isActive,
        password: '',
        confirmPassword: '',
      });
    } else {
      setFormData(initialFormData);
    }
    setFormErrors({});
  }, [user, open]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    // Password validation (only for new users or when changing password)
    if (!isEditing || formData.password) {
      if (!formData.password) {
        errors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      }

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    // Role-specific validation
    if (formData.role === 'manager' || formData.role === 'technician') {
      if (formData.worksiteIds.length === 0) {
        errors.worksiteIds = `${formData.role}s must be assigned to at least one worksite`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange =
    (field: keyof UserFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
      setFormData(prev => ({ ...prev, [field]: value }));

      // Clear error when user starts typing
      if (formErrors[field]) {
        setFormErrors(prev => ({ ...prev, [field]: '' }));
      }
    };

  const handleRoleChange = (event: SelectChangeEvent<string>) => {
    const role = event.target.value as UserFormData['role'];
    setFormData(prev => ({ ...prev, role }));

    // Clear worksite assignments for admins
    if (role === 'admin') {
      setFormData(prev => ({ ...prev, worksiteIds: [] }));
    }

    if (formErrors.role) {
      setFormErrors(prev => ({ ...prev, role: '' }));
    }
  };

  const handleWorksiteChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    setFormData(prev => ({ ...prev, worksiteIds: value }));

    if (formErrors.worksiteIds) {
      setFormErrors(prev => ({ ...prev, worksiteIds: '' }));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(formData);
      onClose();
    } catch (error) {
      // Error is handled by parent component
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth='md'
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>{isEditing ? 'Edit User' : 'Create New User'}</DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant='h6' gutterBottom>
              Basic Information
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label='First Name'
                value={formData.firstName}
                onChange={handleInputChange('firstName')}
                error={Boolean(formErrors.firstName)}
                helperText={formErrors.firstName}
                required
                disabled={submitting}
              />
              <TextField
                label='Last Name'
                value={formData.lastName}
                onChange={handleInputChange('lastName')}
                error={Boolean(formErrors.lastName)}
                helperText={formErrors.lastName}
                required
                disabled={submitting}
              />
            </Box>
            <TextField
              label='Email Address'
              type='email'
              value={formData.email}
              onChange={handleInputChange('email')}
              error={Boolean(formErrors.email)}
              helperText={formErrors.email}
              required
              fullWidth
              disabled={submitting}
              sx={{ mt: 2 }}
            />
          </Box>

          <Divider />

          {/* Role & Access */}
          <Box>
            <Typography variant='h6' gutterBottom>
              Role & Access
            </Typography>
            <FormControl fullWidth error={Boolean(formErrors.role)} disabled={submitting}>
              <InputLabel>Role</InputLabel>
              <Select value={formData.role} onChange={handleRoleChange} label='Role'>
                <MenuItem value='admin'>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label='Admin' color='error' size='small' />
                    <span>Full system access</span>
                  </Box>
                </MenuItem>
                <MenuItem value='manager'>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label='Manager' color='warning' size='small' />
                    <span>Worksite oversight and reporting</span>
                  </Box>
                </MenuItem>
                <MenuItem value='technician'>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label='Technician' color='info' size='small' />
                    <span>Field service and form creation</span>
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {/* Worksite Assignment */}
            {formData.role !== 'admin' && (
              <FormControl
                fullWidth
                sx={{ mt: 2 }}
                error={Boolean(formErrors.worksiteIds)}
                disabled={submitting}
              >
                <InputLabel>Assigned Worksites</InputLabel>
                <Select
                  multiple
                  value={formData.worksiteIds}
                  onChange={handleWorksiteChange}
                  input={<OutlinedInput label='Assigned Worksites' />}
                  renderValue={selected => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map(value => {
                        const worksite = worksites.find(w => w.id === value);
                        return <Chip key={value} label={worksite?.name || value} size='small' />;
                      })}
                    </Box>
                  )}
                >
                  {worksites.map(worksite => (
                    <MenuItem key={worksite.id} value={worksite.id}>
                      {worksite.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.worksiteIds && (
                  <Typography variant='caption' color='error' sx={{ mt: 0.5, ml: 1.75 }}>
                    {formErrors.worksiteIds}
                  </Typography>
                )}
              </FormControl>
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleInputChange('isActive')}
                  disabled={submitting}
                />
              }
              label='Active User'
              sx={{ mt: 2 }}
            />
          </Box>

          <Divider />

          {/* Password */}
          <Box>
            <Typography variant='h6' gutterBottom>
              {isEditing ? 'Change Password (Optional)' : 'Password'}
            </Typography>
            <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
              {isEditing
                ? 'Leave blank to keep current password'
                : 'Password must be at least 8 characters long'}
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label={isEditing ? 'New Password' : 'Password'}
                type='password'
                value={formData.password}
                onChange={handleInputChange('password')}
                error={Boolean(formErrors.password)}
                helperText={formErrors.password}
                required={!isEditing}
                disabled={submitting}
              />
              <TextField
                label='Confirm Password'
                type='password'
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                error={Boolean(formErrors.confirmPassword)}
                helperText={formErrors.confirmPassword}
                required={!isEditing || Boolean(formData.password)}
                disabled={submitting}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type='submit'
          variant='contained'
          disabled={submitting || loading}
          startIcon={submitting && <CircularProgress size={16} />}
        >
          {isEditing ? 'Update User' : 'Create User'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
