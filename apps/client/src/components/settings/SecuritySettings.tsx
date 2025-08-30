import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  Switch,
  Chip,
  Stack,
  Slider,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Security as SecurityIcon,
  Password as PasswordIcon,
  Shield as ShieldIcon,
  VpnLock as VpnIcon,
  History as AuditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

interface SecuritySettingsProps {
  settings: any;
  onChange: (data: any) => void;
}

const SecuritySettings: React.FC<SecuritySettingsProps> = ({ settings, onChange }) => {
  const handleFieldChange = (field: string, value: any) => {
    onChange({ [field]: value });
  };

  const handleNestedFieldChange = (section: string, field: string, value: any) => {
    onChange({
      [section]: {
        ...settings?.[section],
        [field]: value,
      },
    });
  };

  const handleAddIpAddress = () => {
    const ip = prompt('Enter IP address or range (e.g., 192.168.1.1 or 192.168.1.0/24):');
    if (ip && ip.trim()) {
      const currentIps = settings?.ipWhitelist || [];
      handleFieldChange('ipWhitelist', [...currentIps, ip.trim()]);
    }
  };

  const handleRemoveIpAddress = (index: number) => {
    const currentIps = settings?.ipWhitelist || [];
    handleFieldChange(
      'ipWhitelist',
      currentIps.filter((_: any, i: number) => i !== index)
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Password Policy */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<PasswordIcon />}
          title='Password Policy'
          subheader='Configure password requirements for all users'
        />
        <CardContent>
          <Grid2 container spacing={3}>
            <Grid2 md={6}>
              <Typography gutterBottom>Minimum Password Length</Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={settings?.passwordPolicy?.minLength || 8}
                  onChange={(_, value) =>
                    handleNestedFieldChange('passwordPolicy', 'minLength', value)
                  }
                  min={6}
                  max={20}
                  step={1}
                  marks
                  valueLabelDisplay='on'
                />
              </Box>
            </Grid2>

            <Grid2 md={6}>
              <Typography gutterBottom>Password History</Typography>
              <Box sx={{ px: 2 }}>
                <Slider
                  value={settings?.passwordPolicy?.preventReuse || 3}
                  onChange={(_, value) =>
                    handleNestedFieldChange('passwordPolicy', 'preventReuse', value)
                  }
                  min={0}
                  max={10}
                  step={1}
                  marks
                  valueLabelDisplay='on'
                  valueLabelFormat={value => `${value} passwords`}
                />
              </Box>
            </Grid2>

            <Grid size={{ xs: 12 }}>
              <Typography variant='subtitle2' gutterBottom>
                Password Requirements
              </Typography>
              <Stack direction='row' spacing={2} flexWrap='wrap' useFlexGap>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.passwordPolicy?.requireUppercase || false}
                      onChange={e =>
                        handleNestedFieldChange(
                          'passwordPolicy',
                          'requireUppercase',
                          e.target.checked
                        )
                      }
                    />
                  }
                  label='Uppercase Letters'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.passwordPolicy?.requireLowercase || false}
                      onChange={e =>
                        handleNestedFieldChange(
                          'passwordPolicy',
                          'requireLowercase',
                          e.target.checked
                        )
                      }
                    />
                  }
                  label='Lowercase Letters'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.passwordPolicy?.requireNumbers || false}
                      onChange={e =>
                        handleNestedFieldChange(
                          'passwordPolicy',
                          'requireNumbers',
                          e.target.checked
                        )
                      }
                    />
                  }
                  label='Numbers'
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.passwordPolicy?.requireSymbols || false}
                      onChange={e =>
                        handleNestedFieldChange(
                          'passwordPolicy',
                          'requireSymbols',
                          e.target.checked
                        )
                      }
                    />
                  }
                  label='Special Characters'
                />
              </Stack>
            </Grid2>

            <Grid2 md={6}>
              <TextField
                label='Password Expiry (days)'
                type='number'
                value={settings?.passwordPolicy?.maxAge || 0}
                onChange={e =>
                  handleNestedFieldChange('passwordPolicy', 'maxAge', parseInt(e.target.value) || 0)
                }
                fullWidth
                helperText='Set to 0 for no expiry'
              />
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Session & Access Control */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<ShieldIcon />}
          title='Session & Access Control'
          subheader='Configure session timeouts and access restrictions'
        />
        <CardContent>
          <Grid2 container spacing={3}>
            <Grid2 md={6}>
              <TextField
                label='Session Timeout (minutes)'
                type='number'
                value={settings?.sessionTimeout || 60}
                onChange={e => handleFieldChange('sessionTimeout', parseInt(e.target.value) || 60)}
                fullWidth
                helperText='Automatic logout after inactivity'
              />
            </Grid2>

            <Grid2 md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.mfaRequired || false}
                    onChange={e => handleFieldChange('mfaRequired', e.target.checked)}
                  />
                }
                label='Require Multi-Factor Authentication (MFA)'
              />
            </Grid2>

            <Grid2 md={6}>
              <TextField
                label='Max Login Attempts'
                type='number'
                value={settings?.maxLoginAttempts || 5}
                onChange={e => handleFieldChange('maxLoginAttempts', parseInt(e.target.value) || 5)}
                fullWidth
                helperText='Account lockout threshold'
              />
            </Grid2>

            <Grid2 md={6}>
              <TextField
                label='Lockout Duration (minutes)'
                type='number'
                value={settings?.lockoutDuration || 30}
                onChange={e => handleFieldChange('lockoutDuration', parseInt(e.target.value) || 30)}
                fullWidth
                helperText='How long accounts stay locked'
              />
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* IP Whitelist */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<VpnIcon />}
          title='IP Address Whitelist'
          subheader='Restrict access to specific IP addresses or ranges'
        />
        <CardContent>
          <Box mb={2}>
            <Button variant='outlined' startIcon={<AddIcon />} onClick={handleAddIpAddress}>
              Add IP Address
            </Button>
          </Box>

          {settings?.ipWhitelist?.length > 0 ? (
            <List>
              {settings.ipWhitelist.map((ip: string, index: number) => (
                <ListItem key={index}>
                  <ListItemText primary={ip} secondary='Allowed IP address or range' />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge='end'
                      onClick={() => handleRemoveIpAddress(index)}
                      color='error'
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity='info' icon={<WarningIcon />}>
              No IP restrictions configured. All IP addresses are allowed.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Audit Logging */}
      <Card>
        <CardHeader
          avatar={<AuditIcon />}
          title='Audit Logging'
          subheader='Configure system activity logging and retention'
        />
        <CardContent>
          <Grid2 container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.auditLogging?.enabled || true}
                    onChange={e =>
                      handleNestedFieldChange('auditLogging', 'enabled', e.target.checked)
                    }
                  />
                }
                label='Enable Audit Logging'
              />
            </Grid2>

            <Grid2 md={6}>
              <FormControl fullWidth>
                <InputLabel>Log Detail Level</InputLabel>
                <Select
                  value={settings?.auditLogging?.logLevel || 'basic'}
                  onChange={e =>
                    handleNestedFieldChange('auditLogging', 'logLevel', e.target.value)
                  }
                  label='Log Detail Level'
                  disabled={!settings?.auditLogging?.enabled}
                >
                  <MenuItem value='basic'>Basic - Login/logout, critical actions</MenuItem>
                  <MenuItem value='detailed'>Detailed - All user actions</MenuItem>
                  <MenuItem value='comprehensive'>Comprehensive - All system events</MenuItem>
                </Select>
              </FormControl>
            </Grid2>

            <Grid2 md={6}>
              <TextField
                label='Log Retention (days)'
                type='number'
                value={settings?.auditLogging?.retentionDays || 90}
                onChange={e =>
                  handleNestedFieldChange(
                    'auditLogging',
                    'retentionDays',
                    parseInt(e.target.value) || 90
                  )
                }
                fullWidth
                disabled={!settings?.auditLogging?.enabled}
                helperText='How long to keep audit logs'
              />
            </Grid2>

            <Grid size={{ xs: 12 }}>
              <Alert severity='info'>
                <Typography variant='body2'>
                  <strong>Log Levels Explained:</strong>
                </Typography>
                <Typography variant='body2' component='div'>
                  • <strong>Basic:</strong> User authentication, data export, configuration changes
                  <br />• <strong>Detailed:</strong> All user actions including form submissions,
                  searches, reports
                  <br />• <strong>Comprehensive:</strong> All system events including API calls,
                  background tasks, errors
                </Typography>
              </Alert>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SecuritySettings;
