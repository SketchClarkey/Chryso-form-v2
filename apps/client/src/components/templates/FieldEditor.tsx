import { useState, useEffect } from 'react';
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
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';

interface IFieldOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface IFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

interface IFormField {
  id: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'email'
    | 'phone'
    | 'date'
    | 'datetime'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'file'
    | 'signature'
    | 'separator'
    | 'heading';
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  options?: IFieldOption[];
  validation?: IFieldValidation;
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
  layout?: {
    width: number;
    order: number;
  };
}

interface FieldEditorProps {
  open: boolean;
  field: IFormField | null;
  onClose: () => void;
  onSave: (field: IFormField) => void;
  existingFields: IFormField[]; // For conditional logic
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', supportsOptions: false },
  { value: 'textarea', label: 'Text Area', supportsOptions: false },
  { value: 'number', label: 'Number', supportsOptions: false },
  { value: 'email', label: 'Email', supportsOptions: false },
  { value: 'phone', label: 'Phone', supportsOptions: false },
  { value: 'date', label: 'Date', supportsOptions: false },
  { value: 'datetime', label: 'Date & Time', supportsOptions: false },
  { value: 'select', label: 'Dropdown', supportsOptions: true },
  { value: 'multiselect', label: 'Multi-select', supportsOptions: true },
  { value: 'radio', label: 'Radio Buttons', supportsOptions: true },
  { value: 'checkbox', label: 'Checkbox', supportsOptions: false },
  { value: 'file', label: 'File Upload', supportsOptions: false },
  { value: 'signature', label: 'Signature', supportsOptions: false },
  { value: 'separator', label: 'Separator', supportsOptions: false },
  { value: 'heading', label: 'Heading', supportsOptions: false },
];

export function FieldEditor({ open, field, onClose, onSave, existingFields }: FieldEditorProps) {
  const [formData, setFormData] = useState<IFormField>({
    id: '',
    type: 'text',
    label: '',
    description: '',
    placeholder: '',
    defaultValue: '',
    options: [],
    validation: {},
    layout: { width: 12, order: 0 },
  });

  useEffect(() => {
    if (field) {
      setFormData({
        ...field,
        options: field.options || [],
        validation: field.validation || {},
        layout: field.layout || { width: 12, order: 0 },
      });
    }
  }, [field]);

  const currentFieldType = FIELD_TYPES.find(type => type.value === formData.type);
  const needsOptions = currentFieldType?.supportsOptions;

  const handleFieldChange = (key: keyof IFormField, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleValidationChange = (key: keyof IFieldValidation, value: any) => {
    setFormData(prev => ({
      ...prev,
      validation: { ...prev.validation, [key]: value },
    }));
  };

  const handleLayoutChange = (key: keyof NonNullable<IFormField['layout']>, value: any) => {
    setFormData(prev => ({
      ...prev,
      layout: { ...prev.layout!, [key]: value },
    }));
  };

  const addOption = () => {
    const newOption: IFieldOption = {
      label: 'New Option',
      value: `option_${Date.now()}`,
      disabled: false,
    };
    setFormData(prev => ({
      ...prev,
      options: [...(prev.options || []), newOption],
    }));
  };

  const updateOption = (index: number, key: keyof IFieldOption, value: any) => {
    setFormData(prev => ({
      ...prev,
      options:
        prev.options?.map((option, i) => (i === index ? { ...option, [key]: value } : option)) ||
        [],
    }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleSave = () => {
    // Validation
    if (!formData.label.trim()) {
      alert('Field label is required');
      return;
    }

    if (needsOptions && (!formData.options || formData.options.length === 0)) {
      alert('This field type requires at least one option');
      return;
    }

    onSave(formData);
    onClose();
  };

  const handleClose = () => {
    onClose();
    // Reset form after a brief delay to avoid visual glitches
    setTimeout(() => {
      setFormData({
        id: '',
        type: 'text',
        label: '',
        description: '',
        placeholder: '',
        defaultValue: '',
        options: [],
        validation: {},
        layout: { width: 12, order: 0 },
      });
    }, 200);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='md' fullWidth>
      <DialogTitle>{field?.id ? 'Edit Field' : 'Add New Field'}</DialogTitle>

      <DialogContent>
        <Box display='flex' flexDirection='column' gap={3} pt={2}>
          {/* Field Type */}
          <FormControl fullWidth>
            <InputLabel>Field Type</InputLabel>
            <Select
              value={formData.type}
              onChange={e => handleFieldChange('type', e.target.value)}
              label='Field Type'
            >
              {FIELD_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Basic Properties */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }} md={8}>
              <TextField
                fullWidth
                label='Field Label'
                value={formData.label}
                onChange={e => handleFieldChange('label', e.target.value)}
                required
              />
            </Grid>
            <Grid size={{ xs: 12 }} md={4}>
              <FormControl fullWidth>
                <InputLabel>Width</InputLabel>
                <Select
                  value={formData.layout?.width || 12}
                  onChange={e => handleLayoutChange('width', e.target.value)}
                  label='Width'
                >
                  <MenuItem value={12}>Full Width (12/12)</MenuItem>
                  <MenuItem value={6}>Half Width (6/12)</MenuItem>
                  <MenuItem value={4}>One Third (4/12)</MenuItem>
                  <MenuItem value={3}>One Quarter (3/12)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <TextField
            fullWidth
            label='Description'
            value={formData.description || ''}
            onChange={e => handleFieldChange('description', e.target.value)}
            multiline
            rows={2}
            helperText='Optional help text displayed below the field'
          />

          {formData.type !== 'separator' && formData.type !== 'heading' && (
            <TextField
              fullWidth
              label='Placeholder'
              value={formData.placeholder || ''}
              onChange={e => handleFieldChange('placeholder', e.target.value)}
              helperText='Placeholder text shown inside empty input fields'
            />
          )}

          {/* Options for select/radio/multiselect fields */}
          {needsOptions && (
            <Box>
              <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
                <Typography variant='h6'>Options</Typography>
                <Button startIcon={<AddIcon />} onClick={addOption} size='small'>
                  Add Option
                </Button>
              </Box>

              {formData.options?.map((option, index) => (
                <Box key={index} display='flex' alignItems='center' gap={2} mb={2}>
                  <TextField
                    size='small'
                    label='Label'
                    value={option.label}
                    onChange={e => updateOption(index, 'label', e.target.value)}
                  />
                  <TextField
                    size='small'
                    label='Value'
                    value={option.value}
                    onChange={e => updateOption(index, 'value', e.target.value)}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        size='small'
                        checked={!option.disabled}
                        onChange={e => updateOption(index, 'disabled', !e.target.checked)}
                      />
                    }
                    label='Enabled'
                  />
                  <IconButton size='small' color='error' onClick={() => removeOption(index)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}

              {(!formData.options || formData.options.length === 0) && (
                <Typography variant='body2' color='text.secondary' textAlign='center' py={2}>
                  No options added yet. Click "Add Option" to create the first option.
                </Typography>
              )}
            </Box>
          )}

          {/* Validation Rules */}
          <Box>
            <Typography variant='h6' gutterBottom>
              Validation Rules
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.validation?.required || false}
                      onChange={e => handleValidationChange('required', e.target.checked)}
                    />
                  }
                  label='Required Field'
                />
              </Grid>

              {(formData.type === 'text' || formData.type === 'textarea') && (
                <>
                  <Grid size={{ xs: 6 }} md={3}>
                    <TextField
                      fullWidth
                      size='small'
                      label='Min Length'
                      type='number'
                      value={formData.validation?.minLength || ''}
                      onChange={e =>
                        handleValidationChange('minLength', parseInt(e.target.value) || undefined)
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }} md={3}>
                    <TextField
                      fullWidth
                      size='small'
                      label='Max Length'
                      type='number'
                      value={formData.validation?.maxLength || ''}
                      onChange={e =>
                        handleValidationChange('maxLength', parseInt(e.target.value) || undefined)
                      }
                    />
                  </Grid>
                </>
              )}

              {formData.type === 'number' && (
                <>
                  <Grid size={{ xs: 6 }} md={3}>
                    <TextField
                      fullWidth
                      size='small'
                      label='Minimum Value'
                      type='number'
                      value={formData.validation?.min || ''}
                      onChange={e =>
                        handleValidationChange('min', parseFloat(e.target.value) || undefined)
                      }
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }} md={3}>
                    <TextField
                      fullWidth
                      size='small'
                      label='Maximum Value'
                      type='number'
                      value={formData.validation?.max || ''}
                      onChange={e =>
                        handleValidationChange('max', parseFloat(e.target.value) || undefined)
                      }
                    />
                  </Grid>
                </>
              )}

              {(formData.type === 'text' ||
                formData.type === 'email' ||
                formData.type === 'phone') && (
                <Grid size={{ xs: 12 }} md={6}>
                  <TextField
                    fullWidth
                    size='small'
                    label='Pattern (Regex)'
                    value={formData.validation?.pattern || ''}
                    onChange={e => handleValidationChange('pattern', e.target.value || undefined)}
                    helperText='Regular expression for validation'
                  />
                </Grid>
              )}
            </Grid>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant='contained' onClick={handleSave}>
          {field?.id ? 'Update Field' : 'Add Field'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
