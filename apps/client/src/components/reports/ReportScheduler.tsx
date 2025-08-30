import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Alert,
  FormControlLabel,
  Switch,
  Autocomplete,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Info as InfoIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface CronPreset {
  name: string;
  expression: string;
  description: string;
}

interface ReportSchedulerProps {
  open: boolean;
  onClose: () => void;
  reportId: string;
  reportName: string;
  currentSchedule?: {
    enabled: boolean;
    cronExpression?: string;
    timezone?: string;
    recipients?: string[];
    exportFormat?: string;
    lastRun?: string;
    nextRun?: string;
  };
  onScheduleUpdate?: (schedule: any) => void;
}

const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
];

const ReportScheduler: React.FC<ReportSchedulerProps> = ({
  open,
  onClose,
  reportId,
  reportName,
  currentSchedule,
  onScheduleUpdate,
}) => {
  const { request } = useApi();
  const [enabled, setEnabled] = useState(currentSchedule?.enabled || false);
  const [cronExpression, setCronExpression] = useState(currentSchedule?.cronExpression || '');
  const [customCron, setCustomCron] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [timezone, setTimezone] = useState(currentSchedule?.timezone || 'UTC');
  const [recipients, setRecipients] = useState<string[]>(currentSchedule?.recipients || []);
  const [newRecipient, setNewRecipient] = useState('');
  const [exportFormat, setExportFormat] = useState(currentSchedule?.exportFormat || 'pdf');

  const [cronPresets, setCronPresets] = useState<CronPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadCronPresets();
    }
  }, [open]);

  const loadCronPresets = async () => {
    try {
      const response = await get('/api/scheduler/cron-presets');
      setCronPresets(response.data.presets);
    } catch (error: any) {
      setError('Failed to load schedule presets');
    }
  };

  const handlePresetSelect = (preset: CronPreset) => {
    setSelectedPreset(preset.name);
    setCronExpression(preset.expression);
    setCustomCron('');
  };

  const handleCustomCronChange = (value: string) => {
    setCustomCron(value);
    setCronExpression(value);
    setSelectedPreset('');
  };

  const handleAddRecipient = () => {
    if (newRecipient && !recipients.includes(newRecipient)) {
      setRecipients([...recipients, newRecipient]);
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (email: string) => {
    setRecipients(recipients.filter(r => r !== email));
  };

  const handleSave = async () => {
    if (!cronExpression) {
      setError('Please select a schedule or enter a custom cron expression');
      return;
    }

    if (recipients.length === 0) {
      setError('Please add at least one email recipient');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (enabled) {
        // Schedule the report
        await request(`/api/scheduler/reports/${reportId}/schedule`, {
          method: 'POST',
          data: {
            cronExpression,
            timezone,
            recipients,
            exportFormat,
          },
        });
      } else {
        // Unschedule the report
        await request(`/api/scheduler/reports/${reportId}/schedule`, {
          method: 'DELETE',
        });
      }

      const updatedSchedule = {
        enabled,
        cronExpression: enabled ? cronExpression : undefined,
        timezone: enabled ? timezone : undefined,
        recipients: enabled ? recipients : [],
        exportFormat: enabled ? exportFormat : undefined,
      };

      if (onScheduleUpdate) {
        onScheduleUpdate(updatedSchedule);
      }

      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to update report schedule');
    } finally {
      setSaving(false);
    }
  };

  const getNextRunDescription = () => {
    if (!cronExpression) return 'No schedule set';

    // Simple description based on common patterns
    if (cronExpression === '0 * * * *') return 'Every hour';
    if (cronExpression === '0 9 * * *') return 'Daily at 9:00 AM';
    if (cronExpression === '0 9 * * MON') return 'Weekly on Monday at 9:00 AM';
    if (cronExpression === '0 9 1 * *') return 'Monthly on the 1st at 9:00 AM';
    if (cronExpression === '0 8 * * MON-FRI') return 'Weekdays at 8:00 AM';
    if (cronExpression === '*/15 * * * *') return 'Every 15 minutes';
    if (cronExpression === '0 9 1 */3 *') return 'Quarterly on the 1st at 9:00 AM';

    return cronExpression;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        <Box display='flex' alignItems='center' gap={1}>
          <ScheduleIcon />
          Schedule Report: {reportName}
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Enable/Disable Schedule */}
        <Box mb={3}>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={e => setEnabled(e.target.checked)}
                color='primary'
              />
            }
            label='Enable scheduled report delivery'
          />
        </Box>

        {enabled && (
          <>
            {/* Schedule Configuration */}
            <Box mb={3}>
              <Typography variant='h6' gutterBottom>
                <TimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Schedule Configuration
              </Typography>

              {/* Preset Schedules */}
              <Typography variant='subtitle2' gutterBottom sx={{ mt: 2 }}>
                Common Schedules
              </Typography>
              <Grid2 container spacing={1} sx={{ mb: 2 }}>
                {cronPresets.map(preset => (
                  <Grid key={preset.name}>
                    <Chip
                      label={preset.name}
                      clickable
                      color={selectedPreset === preset.name ? 'primary' : 'default'}
                      onClick={() => handlePresetSelect(preset)}
                    />
                  </Grid2>
                ))}
              </Grid2>

              {/* Custom Cron Expression */}
              <TextField
                fullWidth
                label='Custom Cron Expression'
                value={customCron}
                onChange={e => handleCustomCronChange(e.target.value)}
                placeholder='0 9 * * MON (Every Monday at 9:00 AM)'
                helperText={
                  <Box>
                    Format: minute hour day month day-of-week
                    <br />
                    <a href='https://crontab.guru' target='_blank' rel='noopener noreferrer'>
                      Learn more about cron expressions
                    </a>
                  </Box>
                }
                sx={{ mb: 2 }}
              />

              {/* Timezone */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Timezone</InputLabel>
                <Select value={timezone} onChange={e => setTimezone(e.target.value)}>
                  {timezones.map(tz => (
                    <MenuItem key={tz} value={tz}>
                      {tz}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Schedule Preview */}
              {cronExpression && (
                <Card variant='outlined' sx={{ mb: 3 }}>
                  <CardContent>
                    <Typography variant='subtitle2' gutterBottom>
                      Schedule Preview
                    </Typography>
                    <Box display='flex' alignItems='center' gap={1}>
                      <InfoIcon color='info' fontSize='small' />
                      <Typography variant='body2'>
                        {getNextRunDescription()} ({timezone})
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Email Configuration */}
            <Box mb={3}>
              <Typography variant='h6' gutterBottom>
                <EmailIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Email Configuration
              </Typography>

              {/* Export Format */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Export Format</InputLabel>
                <Select value={exportFormat} onChange={e => setExportFormat(e.target.value)}>
                  <MenuItem value='pdf'>PDF Document</MenuItem>
                  <MenuItem value='excel'>Excel Workbook</MenuItem>
                  <MenuItem value='csv'>CSV File</MenuItem>
                </Select>
              </FormControl>

              {/* Recipients */}
              <Typography variant='subtitle2' gutterBottom>
                Email Recipients
              </Typography>

              <Box display='flex' gap={1} mb={2}>
                <TextField
                  fullWidth
                  label='Email Address'
                  type='email'
                  value={newRecipient}
                  onChange={e => setNewRecipient(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      handleAddRecipient();
                    }
                  }}
                />
                <Button variant='outlined' onClick={handleAddRecipient} disabled={!newRecipient}>
                  <AddIcon />
                </Button>
              </Box>

              {/* Recipients List */}
              {recipients.length > 0 && (
                <Card variant='outlined'>
                  <List dense>
                    {recipients.map((email, index) => (
                      <ListItem
                        key={email}
                        secondaryAction={
                          <IconButton edge='end' onClick={() => handleRemoveRecipient(email)}>
                            <DeleteIcon />
                          </IconButton>
                        }
                      >
                        <ListItemIcon>
                          <EmailIcon />
                        </ListItemIcon>
                        <ListItemText primary={email} />
                      </ListItem>
                    ))}
                  </List>
                </Card>
              )}

              {recipients.length === 0 && (
                <Alert severity='warning'>
                  Please add at least one email recipient to receive scheduled reports.
                </Alert>
              )}
            </Box>

            {/* Current Schedule Info */}
            {currentSchedule?.enabled && (
              <Card variant='outlined' sx={{ bgcolor: 'grey.50' }}>
                <CardContent>
                  <Typography variant='subtitle2' gutterBottom>
                    Current Schedule Status
                  </Typography>
                  <Grid2 container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant='caption' color='text.secondary'>
                        Last Run
                      </Typography>
                      <Typography variant='body2'>
                        {currentSchedule.lastRun
                          ? new Date(currentSchedule.lastRun).toLocaleString()
                          : 'Never'}
                      </Typography>
                    </Grid2>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant='caption' color='text.secondary'>
                        Next Run
                      </Typography>
                      <Typography variant='body2'>
                        {currentSchedule.nextRun
                          ? new Date(currentSchedule.nextRun).toLocaleString()
                          : 'Not scheduled'}
                      </Typography>
                    </Grid2>
                  </Grid2>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant='contained'
          disabled={saving}
          startIcon={<ScheduleIcon />}
        >
          {saving ? 'Saving...' : enabled ? 'Schedule Report' : 'Disable Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReportScheduler;
