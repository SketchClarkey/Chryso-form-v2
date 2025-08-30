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
  Button,
  Avatar,
  Stack,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Palette as PaletteIcon,
  Upload as UploadIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ColorLens as ColorIcon,
  Branding as BrandingIcon,
  Extension as FieldIcon,
} from '@mui/icons-material';
import { ChromePicker } from 'react-color';

interface CustomizationSettingsProps {
  settings: any;
  onChange: (data: any) => void;
}

const CustomizationSettings: React.FC<CustomizationSettingsProps> = ({ settings, onChange }) => {
  const [colorPickerOpen, setColorPickerOpen] = React.useState<string | null>(null);
  const [customFieldDialog, setCustomFieldDialog] = React.useState(false);
  const [editingField, setEditingField] = React.useState<any>(null);

  const handleThemeChange = (field: string, value: any) => {
    onChange({
      theme: {
        ...settings?.theme,
        [field]: value,
      },
    });
  };

  const handleBrandingChange = (field: string, value: any) => {
    onChange({
      branding: {
        ...settings?.branding,
        [field]: value,
      },
    });
  };

  const handleCustomFieldAdd = (field: any) => {
    const currentFields = settings?.customFields || [];
    const newField = {
      id: `custom_${Date.now()}`,
      ...field,
    };

    onChange({
      customFields: [...currentFields, newField],
    });
    setCustomFieldDialog(false);
    setEditingField(null);
  };

  const handleCustomFieldUpdate = (fieldId: string, updatedField: any) => {
    const currentFields = settings?.customFields || [];
    const updatedFields = currentFields.map((field: any) =>
      field.id === fieldId ? { ...field, ...updatedField } : field
    );

    onChange({
      customFields: updatedFields,
    });
    setCustomFieldDialog(false);
    setEditingField(null);
  };

  const handleCustomFieldDelete = (fieldId: string) => {
    const currentFields = settings?.customFields || [];
    onChange({
      customFields: currentFields.filter((field: any) => field.id !== fieldId),
    });
  };

  const predefinedColors = [
    { name: 'Blue', value: '#1976d2' },
    { name: 'Red', value: '#d32f2f' },
    { name: 'Green', value: '#388e3c' },
    { name: 'Purple', value: '#7b1fa2' },
    { name: 'Orange', value: '#f57c00' },
    { name: 'Teal', value: '#00796b' },
  ];

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'select', label: 'Dropdown' },
    { value: 'multiselect', label: 'Multi-Select' },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Theme Customization */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<PaletteIcon />}
          title='Theme & Colors'
          subheader='Customize the visual appearance of your application'
        />
        <CardContent>
          <Grid2 container spacing={3}>
            <Grid2 md={6}>
              <Typography variant='subtitle2' gutterBottom>
                Primary Color
              </Typography>
              <Box display='flex' alignItems='center' gap={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: settings?.theme?.primaryColor || '#1976d2',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    cursor: 'pointer',
                  }}
                  onClick={() => setColorPickerOpen('primary')}
                />
                <TextField
                  value={settings?.theme?.primaryColor || '#1976d2'}
                  onChange={e => handleThemeChange('primaryColor', e.target.value)}
                  size='small'
                  sx={{ flex: 1 }}
                />
              </Box>
              <Stack direction='row' spacing={1} sx={{ mt: 1 }} flexWrap='wrap' useFlexGap>
                {predefinedColors.map(color => (
                  <Chip
                    key={color.value}
                    label={color.name}
                    clickable
                    onClick={() => handleThemeChange('primaryColor', color.value)}
                    sx={{
                      backgroundColor: color.value,
                      color: 'white',
                      '&:hover': { backgroundColor: color.value },
                    }}
                    size='small'
                  />
                ))}
              </Stack>
            </Grid2>

            <Grid2 md={6}>
              <Typography variant='subtitle2' gutterBottom>
                Secondary Color
              </Typography>
              <Box display='flex' alignItems='center' gap={2}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor: settings?.theme?.secondaryColor || '#dc004e',
                    borderRadius: 1,
                    border: 1,
                    borderColor: 'divider',
                    cursor: 'pointer',
                  }}
                  onClick={() => setColorPickerOpen('secondary')}
                />
                <TextField
                  value={settings?.theme?.secondaryColor || '#dc004e'}
                  onChange={e => handleThemeChange('secondaryColor', e.target.value)}
                  size='small'
                  sx={{ flex: 1 }}
                />
              </Box>
            </Grid2>

            <Grid2 md={6}>
              <Typography variant='subtitle2' gutterBottom>
                Logo
              </Typography>
              <Box display='flex' alignItems='center' gap={2}>
                <Avatar
                  src={settings?.theme?.logoUrl}
                  sx={{ width: 60, height: 60 }}
                  variant='rounded'
                >
                  <ColorIcon />
                </Avatar>
                <Box>
                  <Button
                    variant='outlined'
                    startIcon={<UploadIcon />}
                    size='small'
                    onClick={() => {
                      // File upload handler would go here
                      console.log('Upload logo');
                    }}
                  >
                    Upload Logo
                  </Button>
                  <Typography variant='caption' display='block' sx={{ mt: 0.5 }}>
                    Recommended: 200x60px, PNG or SVG
                  </Typography>
                </Box>
              </Box>
            </Grid2>

            <Grid2 md={6}>
              <Typography variant='subtitle2' gutterBottom>
                Favicon
              </Typography>
              <Box display='flex' alignItems='center' gap={2}>
                <Avatar src={settings?.theme?.faviconUrl} sx={{ width: 32, height: 32 }}>
                  <ColorIcon fontSize='small' />
                </Avatar>
                <Box>
                  <Button
                    variant='outlined'
                    startIcon={<UploadIcon />}
                    size='small'
                    onClick={() => {
                      // File upload handler would go here
                      console.log('Upload favicon');
                    }}
                  >
                    Upload Favicon
                  </Button>
                  <Typography variant='caption' display='block' sx={{ mt: 0.5 }}>
                    32x32px ICO or PNG format
                  </Typography>
                </Box>
              </Box>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          avatar={<BrandingIcon />}
          title='Branding Options'
          subheader='Configure branding and footer customization'
        />
        <CardContent>
          <Grid2 container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.branding?.showPoweredBy !== false}
                    onChange={e => handleBrandingChange('showPoweredBy', e.target.checked)}
                  />
                }
                label="Show 'Powered by' branding"
              />
            </Grid2>

            <Grid size={{ xs: 12 }}>
              <TextField
                label='Custom Header HTML'
                multiline
                rows={3}
                value={settings?.branding?.customHeader || ''}
                onChange={e => handleBrandingChange('customHeader', e.target.value)}
                fullWidth
                helperText='HTML content to display in the header area'
              />
            </Grid2>

            <Grid size={{ xs: 12 }}>
              <TextField
                label='Custom Footer HTML'
                multiline
                rows={3}
                value={settings?.branding?.customFooter || ''}
                onChange={e => handleBrandingChange('customFooter', e.target.value)}
                fullWidth
                helperText='HTML content to display in the footer area'
              />
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card>
        <CardHeader
          avatar={<FieldIcon />}
          title='Custom Fields'
          subheader='Define custom fields that can be used across forms'
          action={
            <Button
              variant='outlined'
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingField(null);
                setCustomFieldDialog(true);
              }}
            >
              Add Field
            </Button>
          }
        />
        <CardContent>
          {settings?.customFields && settings.customFields.length > 0 ? (
            <List>
              {settings.customFields.map((field: any) => (
                <ListItem key={field.id} divider>
                  <ListItemText
                    primary={field.name}
                    secondary={
                      <Box>
                        <Typography variant='body2' component='span'>
                          Type: {fieldTypes.find(t => t.value === field.type)?.label || field.type}
                        </Typography>
                        {field.required && (
                          <Chip label='Required' size='small' color='primary' sx={{ ml: 1 }} />
                        )}
                        {field.options && field.options.length > 0 && (
                          <Typography variant='caption' display='block'>
                            Options: {field.options.join(', ')}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge='end'
                      onClick={() => {
                        setEditingField(field);
                        setCustomFieldDialog(true);
                      }}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      edge='end'
                      onClick={() => handleCustomFieldDelete(field.id)}
                      color='error'
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant='body2' color='text.secondary' textAlign='center' py={4}>
              No custom fields defined. Click "Add Field" to create your first custom field.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Color Picker Dialog */}
      <Dialog open={!!colorPickerOpen} onClose={() => setColorPickerOpen(null)}>
        <DialogTitle>
          Choose {colorPickerOpen === 'primary' ? 'Primary' : 'Secondary'} Color
        </DialogTitle>
        <DialogContent>
          <ChromePicker
            color={
              colorPickerOpen === 'primary'
                ? settings?.theme?.primaryColor || '#1976d2'
                : settings?.theme?.secondaryColor || '#dc004e'
            }
            onChange={color => {
              if (colorPickerOpen === 'primary') {
                handleThemeChange('primaryColor', color.hex);
              } else {
                handleThemeChange('secondaryColor', color.hex);
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setColorPickerOpen(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Custom Field Dialog */}
      <CustomFieldDialog
        open={customFieldDialog}
        onClose={() => {
          setCustomFieldDialog(false);
          setEditingField(null);
        }}
        onSave={
          editingField
            ? field => handleCustomFieldUpdate(editingField.id, field)
            : handleCustomFieldAdd
        }
        initialData={editingField}
        fieldTypes={fieldTypes}
      />
    </Box>
  );
};

// Custom Field Dialog Component
interface CustomFieldDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (field: any) => void;
  initialData?: any;
  fieldTypes: Array<{ value: string; label: string }>;
}

const CustomFieldDialog: React.FC<CustomFieldDialogProps> = ({
  open,
  onClose,
  onSave,
  initialData,
  fieldTypes,
}) => {
  const [fieldData, setFieldData] = React.useState({
    name: '',
    type: 'text',
    required: false,
    defaultValue: '',
    options: [],
  });

  React.useEffect(() => {
    if (initialData) {
      setFieldData(initialData);
    } else {
      setFieldData({
        name: '',
        type: 'text',
        required: false,
        defaultValue: '',
        options: [],
      });
    }
  }, [initialData, open]);

  const handleSave = () => {
    if (!fieldData.name.trim()) return;
    onSave(fieldData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>{initialData ? 'Edit Custom Field' : 'Add Custom Field'}</DialogTitle>
      <DialogContent>
        <Grid2 container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              label='Field Name'
              value={fieldData.name}
              onChange={e => setFieldData({ ...fieldData, name: e.target.value })}
              fullWidth
              required
            />
          </Grid2>

          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth>
              <InputLabel>Field Type</InputLabel>
              <Select
                value={fieldData.type}
                onChange={e => setFieldData({ ...fieldData, type: e.target.value })}
                label='Field Type'
              >
                {fieldTypes.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid2>

          {(fieldData.type === 'select' || fieldData.type === 'multiselect') && (
            <Grid size={{ xs: 12 }}>
              <TextField
                label='Options (comma-separated)'
                value={Array.isArray(fieldData.options) ? fieldData.options.join(', ') : ''}
                onChange={e =>
                  setFieldData({
                    ...fieldData,
                    options: e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean),
                  })
                }
                fullWidth
                helperText='Enter options separated by commas'
              />
            </Grid2>
          )}

          <Grid size={{ xs: 12 }}>
            <TextField
              label='Default Value'
              value={fieldData.defaultValue}
              onChange={e => setFieldData({ ...fieldData, defaultValue: e.target.value })}
              fullWidth
            />
          </Grid2>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={fieldData.required}
                  onChange={e => setFieldData({ ...fieldData, required: e.target.checked })}
                />
              }
              label='Required Field'
            />
          </Grid2>
        </Grid2>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant='contained' disabled={!fieldData.name.trim()}>
          {initialData ? 'Update' : 'Add'} Field
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomizationSettings;
