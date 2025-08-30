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
  Divider,
  FormControlLabel,
  Switch,
  Button,
  Avatar,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Upload as UploadIcon,
  Business as CompanyIcon,
  Schedule as TimeIcon,
  Language as LanguageIcon,
  AttachMoney as CurrencyIcon,
} from '@mui/icons-material';

interface GeneralSettingsProps {
  settings: any;
  onChange: (data: any) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onChange }) => {
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

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
  ];

  const dateFormats = [
    { value: 'MM/dd/yyyy', label: 'MM/dd/yyyy (US)' },
    { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy (UK)' },
    { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd (ISO)' },
    { value: 'dd.MM.yyyy', label: 'dd.MM.yyyy (German)' },
  ];

  const currencies = [
    { value: 'USD', label: 'US Dollar (USD)' },
    { value: 'EUR', label: 'Euro (EUR)' },
    { value: 'GBP', label: 'British Pound (GBP)' },
    { value: 'CAD', label: 'Canadian Dollar (CAD)' },
    { value: 'AUD', label: 'Australian Dollar (AUD)' },
    { value: 'JPY', label: 'Japanese Yen (JPY)' },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'it', label: 'Italian' },
    { value: 'pt', label: 'Portuguese' },
  ];

  const workDayOptions = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Company Information */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<CompanyIcon />}
          title='Company Information'
          subheader='Basic information about your organization'
        />
        <CardContent>
          <Grid2 container spacing={3}>
            <Grid2 md={8}>
              <TextField
                label='Company Name'
                value={settings?.companyName || ''}
                onChange={e => handleFieldChange('companyName', e.target.value)}
                fullWidth
                required
              />
            </Grid2>
            <Grid2 md={4}>
              <Box display='flex' flexDirection='column' alignItems='center' gap={2}>
                <Avatar
                  src={settings?.companyLogo}
                  sx={{ width: 80, height: 80 }}
                  variant='rounded'
                >
                  <CompanyIcon fontSize='large' />
                </Avatar>
                <Button
                  variant='outlined'
                  startIcon={<UploadIcon />}
                  size='small'
                  onClick={() => {
                    // File upload handler would go here
                    console.log('Upload company logo');
                  }}
                >
                  Upload Logo
                </Button>
              </Box>
            </Grid2>

            <Grid2 md={6}>
              <TextField
                label='Street Address'
                value={settings?.address?.street || ''}
                onChange={e => handleNestedFieldChange('address', 'street', e.target.value)}
                fullWidth
              />
            </Grid2>
            <Grid2 md={6}>
              <TextField
                label='City'
                value={settings?.address?.city || ''}
                onChange={e => handleNestedFieldChange('address', 'city', e.target.value)}
                fullWidth
              />
            </Grid2>
            <Grid2 md={4}>
              <TextField
                label='State/Province'
                value={settings?.address?.state || ''}
                onChange={e => handleNestedFieldChange('address', 'state', e.target.value)}
                fullWidth
              />
            </Grid2>
            <Grid2 md={4}>
              <TextField
                label='ZIP/Postal Code'
                value={settings?.address?.zipCode || ''}
                onChange={e => handleNestedFieldChange('address', 'zipCode', e.target.value)}
                fullWidth
              />
            </Grid2>
            <Grid2 md={4}>
              <TextField
                label='Country'
                value={settings?.address?.country || ''}
                onChange={e => handleNestedFieldChange('address', 'country', e.target.value)}
                fullWidth
                required
              />
            </Grid2>

            <Grid2 md={4}>
              <TextField
                label='Phone Number'
                value={settings?.contact?.phone || ''}
                onChange={e => handleNestedFieldChange('contact', 'phone', e.target.value)}
                fullWidth
              />
            </Grid2>
            <Grid2 md={4}>
              <TextField
                label='Email Address'
                type='email'
                value={settings?.contact?.email || ''}
                onChange={e => handleNestedFieldChange('contact', 'email', e.target.value)}
                fullWidth
                required
              />
            </Grid2>
            <Grid2 md={4}>
              <TextField
                label='Website'
                value={settings?.contact?.website || ''}
                onChange={e => handleNestedFieldChange('contact', 'website', e.target.value)}
                fullWidth
              />
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<LanguageIcon />}
          title='Regional Settings'
          subheader='Timezone, language, and format preferences'
        />
        <CardContent>
          <Grid2 container spacing={3}>
            <Grid2 md={6}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={settings?.timezone || 'UTC'}
                  onChange={e => handleFieldChange('timezone', e.target.value)}
                  label='Timezone'
                >
                  {timezones.map(tz => (
                    <MenuItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 md={6}>
              <FormControl fullWidth>
                <InputLabel>Default Language</InputLabel>
                <Select
                  value={settings?.defaultLanguage || 'en'}
                  onChange={e => handleFieldChange('defaultLanguage', e.target.value)}
                  label='Default Language'
                >
                  {languages.map(lang => (
                    <MenuItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>

            <Grid2 md={4}>
              <FormControl fullWidth>
                <InputLabel>Date Format</InputLabel>
                <Select
                  value={settings?.dateFormat || 'MM/dd/yyyy'}
                  onChange={e => handleFieldChange('dateFormat', e.target.value)}
                  label='Date Format'
                >
                  {dateFormats.map(format => (
                    <MenuItem key={format.value} value={format.value}>
                      {format.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 md={4}>
              <FormControl fullWidth>
                <InputLabel>Time Format</InputLabel>
                <Select
                  value={settings?.timeFormat || '12h'}
                  onChange={e => handleFieldChange('timeFormat', e.target.value)}
                  label='Time Format'
                >
                  <MenuItem value='12h'>12-hour (AM/PM)</MenuItem>
                  <MenuItem value='24h'>24-hour</MenuItem>
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 md={4}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={settings?.currency || 'USD'}
                  onChange={e => handleFieldChange('currency', e.target.value)}
                  label='Currency'
                >
                  {currencies.map(currency => (
                    <MenuItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Work Week Settings */}
      <Card>
        <CardHeader
          avatar={<TimeIcon />}
          title='Work Week Settings'
          subheader="Configure your organization's work schedule"
        />
        <CardContent>
          <Grid2 container spacing={3}>
            <Grid2 md={6}>
              <FormControl fullWidth>
                <InputLabel>Week Start Day</InputLabel>
                <Select
                  value={settings?.workWeek?.startDay || 1}
                  onChange={e => handleNestedFieldChange('workWeek', 'startDay', e.target.value)}
                  label='Week Start Day'
                >
                  {workDayOptions.map(day => (
                    <MenuItem key={day.value} value={day.value}>
                      {day.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
            <Grid2 md={3}>
              <TextField
                label='Work Start Time'
                type='time'
                value={settings?.workWeek?.workHours?.start || '09:00'}
                onChange={e =>
                  handleNestedFieldChange('workWeek', 'workHours', {
                    ...settings?.workWeek?.workHours,
                    start: e.target.value,
                  })
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid2>
            <Grid2 md={3}>
              <TextField
                label='Work End Time'
                type='time'
                value={settings?.workWeek?.workHours?.end || '17:00'}
                onChange={e =>
                  handleNestedFieldChange('workWeek', 'workHours', {
                    ...settings?.workWeek?.workHours,
                    end: e.target.value,
                  })
                }
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid2>

            <Grid size={{ xs: 12 }}>
              <Typography variant='subtitle2' gutterBottom>
                Work Days
              </Typography>
              <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
                {workDayOptions.map(day => (
                  <FormControlLabel
                    key={day.value}
                    control={
                      <Switch
                        checked={settings?.workWeek?.workDays?.includes(day.value) || false}
                        onChange={e => {
                          const currentWorkDays = settings?.workWeek?.workDays || [];
                          let newWorkDays;
                          if (e.target.checked) {
                            newWorkDays = [...currentWorkDays, day.value];
                          } else {
                            newWorkDays = currentWorkDays.filter((d: number) => d !== day.value);
                          }
                          handleNestedFieldChange('workWeek', 'workDays', newWorkDays);
                        }}
                      />
                    }
                    label={day.label}
                  />
                ))}
              </Stack>
            </Grid2>

            <Grid2 md={6}>
              <FormControl fullWidth>
                <InputLabel>Fiscal Year Start Month</InputLabel>
                <Select
                  value={settings?.fiscalYearStart || 1}
                  onChange={e => handleFieldChange('fiscalYearStart', e.target.value)}
                  label='Fiscal Year Start Month'
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {new Date(2024, i, 1).toLocaleString('default', { month: 'long' })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>
    </Box>
  );
};

export default GeneralSettings;
