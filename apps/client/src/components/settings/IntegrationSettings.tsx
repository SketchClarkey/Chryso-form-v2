import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  CardHeader,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import {
  Email as EmailIcon,
  Storage as StorageIcon,
  Notifications as NotificationsIcon,
  VpnKey as SsoIcon,
  ExpandMore as ExpandMoreIcon,
  TestTube as TestIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface IntegrationSettingsProps {
  settings: any;
  onChange: (data: any) => void;
}

const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({ settings, onChange }) => {
  const { request } = useApi();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const handleFieldChange = (section: string, field: string, value: any) => {
    onChange({
      [section]: {
        ...settings?.[section],
        [field]: value,
      },
    });
  };

  const handleNestedFieldChange = (section: string, subsection: string, field: string, value: any) => {
    onChange({
      [section]: {
        ...settings?.[section],
        [subsection]: {
          ...settings?.[section]?.[subsection],
          [field]: value,
        },
      },
    });
  };

  const testEmailConnection = async () => {
    if (!settings?.email?.provider) {
      setTestResults({ ...testResults, email: { success: false, message: 'No email provider configured' } });
      return;
    }

    setTesting({ ...testing, email: true });
    
    try {
      const testEmail = prompt('Enter email address to send test email to:') || 'test@example.com';
      const response = await request('/api/settings/test/email', {
        method: 'POST',
        data: { testEmail },
      });

      setTestResults({ 
        ...testResults, 
        email: { success: true, message: response.data.message } 
      });
    } catch (error: any) {
      setTestResults({ 
        ...testResults, 
        email: { success: false, message: error.response?.data?.message || 'Test failed' } 
      });
    } finally {
      setTesting({ ...testing, email: false });
    }
  };

  const testStorageConnection = async () => {
    setTesting({ ...testing, storage: true });
    
    try {
      const response = await request('/api/settings/test/storage', { method: 'POST' });
      setTestResults({ 
        ...testResults, 
        storage: { success: true, message: response.data.message } 
      });
    } catch (error: any) {
      setTestResults({ 
        ...testResults, 
        storage: { success: false, message: error.response?.data?.message || 'Test failed' } 
      });
    } finally {
      setTesting({ ...testing, storage: false });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Email Configuration */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <EmailIcon />
            <Typography variant="h6">Email Integration</Typography>
            {settings?.email?.provider && (
              <Chip
                label={settings.email.provider.toUpperCase()}
                color="primary"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Email Provider</InputLabel>
                <Select
                  value={settings?.email?.provider || ''}
                  onChange={(e) => handleFieldChange('email', 'provider', e.target.value)}
                  label="Email Provider"
                >
                  <MenuItem value="">None</MenuItem>
                  <MenuItem value="smtp">SMTP</MenuItem>
                  <MenuItem value="sendgrid">SendGrid</MenuItem>
                  <MenuItem value="mailgun">Mailgun</MenuItem>
                  <MenuItem value="ses">Amazon SES</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box display="flex" gap={1} alignItems="center">
                <Button
                  variant="outlined"
                  startIcon={<TestIcon />}
                  onClick={testEmailConnection}
                  disabled={!settings?.email?.provider || testing.email}
                  size="small"
                >
                  {testing.email ? 'Testing...' : 'Test Connection'}
                </Button>
                {testResults.email && (
                  <Chip
                    icon={testResults.email.success ? <CheckIcon /> : <ErrorIcon />}
                    label={testResults.email.success ? 'Success' : 'Failed'}
                    color={testResults.email.success ? 'success' : 'error'}
                    size="small"
                  />
                )}
              </Box>
            </Grid>

            {/* SMTP Settings */}
            {settings?.email?.provider === 'smtp' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="SMTP Host"
                    value={settings?.email?.settings?.smtp?.host || ''}
                    onChange={(e) => handleNestedFieldChange('email', 'settings', 'smtp', {
                      ...settings?.email?.settings?.smtp,
                      host: e.target.value
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Port"
                    type="number"
                    value={settings?.email?.settings?.smtp?.port || 587}
                    onChange={(e) => handleNestedFieldChange('email', 'settings', 'smtp', {
                      ...settings?.email?.settings?.smtp,
                      port: parseInt(e.target.value)
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings?.email?.settings?.smtp?.secure || false}
                        onChange={(e) => handleNestedFieldChange('email', 'settings', 'smtp', {
                          ...settings?.email?.settings?.smtp,
                          secure: e.target.checked
                        })}
                      />
                    }
                    label="Use SSL/TLS"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Username"
                    value={settings?.email?.settings?.smtp?.auth?.user || ''}
                    onChange={(e) => handleNestedFieldChange('email', 'settings', 'smtp', {
                      ...settings?.email?.settings?.smtp,
                      auth: {
                        ...settings?.email?.settings?.smtp?.auth,
                        user: e.target.value
                      }
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Password"
                    type="password"
                    value={settings?.email?.settings?.smtp?.auth?.pass || ''}
                    onChange={(e) => handleNestedFieldChange('email', 'settings', 'smtp', {
                      ...settings?.email?.settings?.smtp,
                      auth: {
                        ...settings?.email?.settings?.smtp?.auth,
                        pass: e.target.value
                      }
                    })}
                    fullWidth
                  />
                </Grid>
              </>
            )}

            {/* SendGrid Settings */}
            {settings?.email?.provider === 'sendgrid' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="API Key"
                    type="password"
                    value={settings?.email?.settings?.sendgrid?.apiKey || ''}
                    onChange={(e) => handleNestedFieldChange('email', 'settings', 'sendgrid', {
                      ...settings?.email?.settings?.sendgrid,
                      apiKey: e.target.value
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="From Email"
                    type="email"
                    value={settings?.email?.settings?.sendgrid?.fromEmail || ''}
                    onChange={(e) => handleNestedFieldChange('email', 'settings', 'sendgrid', {
                      ...settings?.email?.settings?.sendgrid,
                      fromEmail: e.target.value
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="From Name"
                    value={settings?.email?.settings?.sendgrid?.fromName || ''}
                    onChange={(e) => handleNestedFieldChange('email', 'settings', 'sendgrid', {
                      ...settings?.email?.settings?.sendgrid,
                      fromName: e.target.value
                    })}
                    fullWidth
                  />
                </Grid>
              </>
            )}

            {/* Email Templates */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Email Templates
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.email?.templates?.welcomeEmail || false}
                      onChange={(e) => handleNestedFieldChange('email', 'templates', 'welcomeEmail', e.target.checked)}
                    />
                  }
                  label="Welcome Email"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.email?.templates?.formNotification || false}
                      onChange={(e) => handleNestedFieldChange('email', 'templates', 'formNotification', e.target.checked)}
                    />
                  }
                  label="Form Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.email?.templates?.passwordReset || false}
                      onChange={(e) => handleNestedFieldChange('email', 'templates', 'passwordReset', e.target.checked)}
                    />
                  }
                  label="Password Reset"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.email?.templates?.systemAlerts || false}
                      onChange={(e) => handleNestedFieldChange('email', 'templates', 'systemAlerts', e.target.checked)}
                    />
                  }
                  label="System Alerts"
                />
              </Stack>
            </Grid>

            {testResults.email && (
              <Grid item xs={12}>
                <Alert severity={testResults.email.success ? 'success' : 'error'}>
                  {testResults.email.message}
                </Alert>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Storage Configuration */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <StorageIcon />
            <Typography variant="h6">Storage Integration</Typography>
            <Chip
              label={settings?.storage?.provider?.toUpperCase() || 'LOCAL'}
              color="secondary"
              size="small"
              variant="outlined"
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Storage Provider</InputLabel>
                <Select
                  value={settings?.storage?.provider || 'local'}
                  onChange={(e) => handleFieldChange('storage', 'provider', e.target.value)}
                  label="Storage Provider"
                >
                  <MenuItem value="local">Local Storage</MenuItem>
                  <MenuItem value="s3">Amazon S3</MenuItem>
                  <MenuItem value="azure">Azure Blob Storage</MenuItem>
                  <MenuItem value="gcp">Google Cloud Storage</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                startIcon={<TestIcon />}
                onClick={testStorageConnection}
                disabled={testing.storage}
                size="small"
              >
                {testing.storage ? 'Testing...' : 'Test Connection'}
              </Button>
              {testResults.storage && (
                <Chip
                  icon={testResults.storage.success ? <CheckIcon /> : <ErrorIcon />}
                  label={testResults.storage.success ? 'Success' : 'Failed'}
                  color={testResults.storage.success ? 'success' : 'error'}
                  size="small"
                  sx={{ ml: 1 }}
                />
              )}
            </Grid>

            {/* S3 Settings */}
            {settings?.storage?.provider === 's3' && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Access Key ID"
                    value={settings?.storage?.settings?.s3?.accessKeyId || ''}
                    onChange={(e) => handleNestedFieldChange('storage', 'settings', 's3', {
                      ...settings?.storage?.settings?.s3,
                      accessKeyId: e.target.value
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Secret Access Key"
                    type="password"
                    value={settings?.storage?.settings?.s3?.secretAccessKey || ''}
                    onChange={(e) => handleNestedFieldChange('storage', 'settings', 's3', {
                      ...settings?.storage?.settings?.s3,
                      secretAccessKey: e.target.value
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Region"
                    value={settings?.storage?.settings?.s3?.region || ''}
                    onChange={(e) => handleNestedFieldChange('storage', 'settings', 's3', {
                      ...settings?.storage?.settings?.s3,
                      region: e.target.value
                    })}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Bucket Name"
                    value={settings?.storage?.settings?.s3?.bucket || ''}
                    onChange={(e) => handleNestedFieldChange('storage', 'settings', 's3', {
                      ...settings?.storage?.settings?.s3,
                      bucket: e.target.value
                    })}
                    fullWidth
                  />
                </Grid>
              </>
            )}

            {testResults.storage && (
              <Grid item xs={12}>
                <Alert severity={testResults.storage.success ? 'success' : 'error'}>
                  {testResults.storage.message}
                </Alert>
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* SSO Configuration */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" gap={1}>
            <SsoIcon />
            <Typography variant="h6">Single Sign-On (SSO)</Typography>
            {settings?.sso?.enabled && (
              <Chip
                label="Enabled"
                color="success"
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.sso?.enabled || false}
                    onChange={(e) => handleFieldChange('sso', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Single Sign-On"
              />
            </Grid>

            {settings?.sso?.enabled && (
              <>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>SSO Provider</InputLabel>
                    <Select
                      value={settings?.sso?.provider || ''}
                      onChange={(e) => handleFieldChange('sso', 'provider', e.target.value)}
                      label="SSO Provider"
                    >
                      <MenuItem value="azure">Azure AD</MenuItem>
                      <MenuItem value="google">Google Workspace</MenuItem>
                      <MenuItem value="okta">Okta</MenuItem>
                      <MenuItem value="saml">Generic SAML</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Azure AD Settings */}
                {settings?.sso?.provider === 'azure' && (
                  <>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Tenant ID"
                        value={settings?.sso?.settings?.azure?.tenantId || ''}
                        onChange={(e) => handleNestedFieldChange('sso', 'settings', 'azure', {
                          ...settings?.sso?.settings?.azure,
                          tenantId: e.target.value
                        })}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Client ID"
                        value={settings?.sso?.settings?.azure?.clientId || ''}
                        onChange={(e) => handleNestedFieldChange('sso', 'settings', 'azure', {
                          ...settings?.sso?.settings?.azure,
                          clientId: e.target.value
                        })}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Client Secret"
                        type="password"
                        value={settings?.sso?.settings?.azure?.clientSecret || ''}
                        onChange={(e) => handleNestedFieldChange('sso', 'settings', 'azure', {
                          ...settings?.sso?.settings?.azure,
                          clientSecret: e.target.value
                        })}
                        fullWidth
                      />
                    </Grid>
                  </>
                )}

                <Grid item xs={12}>
                  <Alert severity="info">
                    After configuring SSO, make sure to test the integration before enabling it for all users.
                  </Alert>
                </Grid>
              </>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default IntegrationSettings;