import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Alert,
  Skeleton,
  Divider,
  Button,
  Stack,
} from '@mui/material';
import {
  Business as GeneralIcon,
  Security as SecurityIcon,
  IntegrationInstructions as IntegrationsIcon,
  Tune as FeaturesIcon,
  Palette as CustomizationIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';
import GeneralSettings from './GeneralSettings';
import SecuritySettings from './SecuritySettings';
import IntegrationSettings from './IntegrationSettings';
import FeatureSettings from './FeatureSettings';
import CustomizationSettings from './CustomizationSettings';

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const SystemSettings: React.FC = () => {
  const { request } = useApi();
  const [currentTab, setCurrentTab] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const tabs = [
    { id: 'general', label: 'General', icon: <GeneralIcon /> },
    { id: 'security', label: 'Security', icon: <SecurityIcon /> },
    { id: 'integrations', label: 'Integrations', icon: <IntegrationsIcon /> },
    { id: 'features', label: 'Features', icon: <FeaturesIcon /> },
    { id: 'customization', label: 'Customization', icon: <CustomizationIcon /> },
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const [settingsResponse, sectionsResponse] = await Promise.all([
        get('/api/settings/organization'),
        get('/api/settings/organization/sections'),
      ]);

      setSettings(settingsResponse.data.settings);
      setSections(sectionsResponse.data.sections);
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      setError(error.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to switch tabs?')) {
        setCurrentTab(newValue);
        setHasUnsavedChanges(false);
      }
    } else {
      setCurrentTab(newValue);
    }
  };

  const handleSettingsChange = (section: string, newData: any) => {
    setSettings((prev: any) => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        ...newData,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await request('/api/settings/organization', {
        method: 'PUT',
        data: settings,
      });

      setSettings(response.data.settings);
      setSuccess('Settings saved successfully!');
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setError(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to refresh?')) {
        loadSettings();
        setHasUnsavedChanges(false);
      }
    } else {
      loadSettings();
    }
  };

  if (loading) {
    return (
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Typography variant='h4' gutterBottom>
          System Settings
        </Typography>
        <Box sx={{ width: '100%' }}>
          <Skeleton variant='rectangular' height={48} sx={{ mb: 2 }} />
          <Skeleton variant='rectangular' height={400} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h4'>System Settings</Typography>
        <Stack direction='row' spacing={1}>
          <Button onClick={handleRefresh} startIcon={<RefreshIcon />} disabled={saving}>
            Refresh
          </Button>
          <Button
            variant='contained'
            onClick={handleSave}
            startIcon={<SaveIcon />}
            disabled={!hasUnsavedChanges || saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity='success' sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {hasUnsavedChanges && (
        <Alert severity='warning' sx={{ mb: 2 }}>
          You have unsaved changes. Don't forget to save your settings.
        </Alert>
      )}

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label='settings tabs'
            variant='scrollable'
            scrollButtons='auto'
          >
            {tabs.map((tab, index) => (
              <Tab
                key={tab.id}
                icon={tab.icon}
                iconPosition='start'
                label={tab.label}
                id={`settings-tab-${index}`}
                aria-controls={`settings-tabpanel-${index}`}
              />
            ))}
          </Tabs>
        </Box>

        <CardContent sx={{ p: 0 }}>
          <TabPanel value={currentTab} index={0}>
            <GeneralSettings
              settings={settings?.general}
              onChange={data => handleSettingsChange('general', data)}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={1}>
            <SecuritySettings
              settings={settings?.security}
              onChange={data => handleSettingsChange('security', data)}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={2}>
            <IntegrationSettings
              settings={settings?.integrations}
              onChange={data => handleSettingsChange('integrations', data)}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={3}>
            <FeatureSettings
              settings={settings?.features}
              onChange={data => handleSettingsChange('features', data)}
            />
          </TabPanel>

          <TabPanel value={currentTab} index={4}>
            <CustomizationSettings
              settings={settings?.customization}
              onChange={data => handleSettingsChange('customization', data)}
            />
          </TabPanel>
        </CardContent>
      </Card>
    </Container>
  );
};

export default SystemSettings;
