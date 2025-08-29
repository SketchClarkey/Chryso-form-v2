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
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress,
  Typography,
  Divider,
  IconButton,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { Worksite, Contact, Equipment } from './WorksiteTable';

interface WorksiteFormData {
  name: string;
  customerName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contacts: Contact[];
  equipment: Equipment[];
  defaultTemplate?: string;
  isActive: boolean;
}

interface WorksiteFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (worksiteData: WorksiteFormData) => Promise<void>;
  worksite?: Worksite | null;
  loading: boolean;
  error?: string;
}

const initialFormData: WorksiteFormData = {
  name: '',
  customerName: '',
  address: {
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  },
  contacts: [],
  equipment: [],
  defaultTemplate: '',
  isActive: true,
};

const initialContact: Contact = {
  name: '',
  position: '',
  phone: '',
  email: '',
  isPrimary: false,
};

const initialEquipment: Equipment = {
  id: '',
  type: 'pump',
  model: '',
  serialNumber: '',
  condition: 'good',
  notes: '',
};

const equipmentTypes = [
  { value: 'pump', label: 'Pump' },
  { value: 'tank', label: 'Tank' },
  { value: 'dispenser', label: 'Dispenser' },
  { value: 'pulseMeter', label: 'Pulse Meter' },
];

const conditionOptions = [
  { value: 'excellent', label: 'Excellent', color: 'success' },
  { value: 'good', label: 'Good', color: 'info' },
  { value: 'fair', label: 'Fair', color: 'warning' },
  { value: 'poor', label: 'Poor', color: 'error' },
  { value: 'needs-repair', label: 'Needs Repair', color: 'error' },
];

export function WorksiteForm({
  open,
  onClose,
  onSubmit,
  worksite,
  loading,
  error,
}: WorksiteFormProps) {
  const [formData, setFormData] = useState<WorksiteFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Fetch active templates for selection
  const { data: templatesData } = useQuery({
    queryKey: ['templates', 'active'],
    queryFn: async () => {
      const response = await api.get('/templates?status=active&limit=100');
      return response.data.data.templates;
    },
  });

  const isEditing = Boolean(worksite);

  useEffect(() => {
    if (worksite) {
      setFormData({
        name: worksite.name,
        customerName: worksite.customerName,
        address: worksite.address,
        contacts: worksite.contacts.length > 0 ? worksite.contacts : [{ ...initialContact, isPrimary: true }],
        equipment: worksite.equipment,
        defaultTemplate: worksite.defaultTemplate?._id || '',
        isActive: worksite.isActive,
      });
    } else {
      setFormData({
        ...initialFormData,
        contacts: [{ ...initialContact, isPrimary: true }],
      });
    }
    setFormErrors({});
  }, [worksite, open]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Worksite name is required';
    }

    if (!formData.customerName.trim()) {
      errors.customerName = 'Customer name is required';
    }

    if (!formData.address.street.trim()) {
      errors['address.street'] = 'Street address is required';
    }

    if (!formData.address.city.trim()) {
      errors['address.city'] = 'City is required';
    }

    if (!formData.address.state.trim()) {
      errors['address.state'] = 'State is required';
    }

    if (!formData.address.zipCode.trim()) {
      errors['address.zipCode'] = 'ZIP code is required';
    }

    // Validate contacts
    formData.contacts.forEach((contact, index) => {
      if (!contact.name.trim()) {
        errors[`contact.${index}.name`] = 'Contact name is required';
      }
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        errors[`contact.${index}.email`] = 'Please enter a valid email address';
      }
    });

    // Validate equipment
    formData.equipment.forEach((equipment, index) => {
      if (!equipment.id.trim()) {
        errors[`equipment.${index}.id`] = 'Equipment ID is required';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1];
      setFormData(prev => ({
        ...prev,
        address: { ...prev.address, [addressField]: value },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleContactChange = (index: number, field: keyof Contact) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      ),
    }));

    const errorKey = `contact.${index}.${field}`;
    if (formErrors[errorKey]) {
      setFormErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const handleSetPrimaryContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.map((contact, i) => ({
        ...contact,
        isPrimary: i === index,
      })),
    }));
  };

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { ...initialContact }],
    }));
  };

  const removeContact = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index),
    }));
  };

  const handleEquipmentChange = (index: number, field: keyof Equipment) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.map((equipment, i) => 
        i === index ? { ...equipment, [field]: value } : equipment
      ),
    }));

    const errorKey = `equipment.${index}.${field}`;
    if (formErrors[errorKey]) {
      setFormErrors(prev => ({ ...prev, [errorKey]: '' }));
    }
  };

  const addEquipment = () => {
    const newEquipment = {
      ...initialEquipment,
      id: `eq-${Date.now()}`,
    };
    setFormData(prev => ({
      ...prev,
      equipment: [...prev.equipment, newEquipment],
    }));
  };

  const removeEquipment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.filter((_, i) => i !== index),
    }));
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
      maxWidth="lg"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle>
        {isEditing ? 'Edit Worksite' : 'Create New Worksite'}
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gap: 3 }}>
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Worksite Name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  error={Boolean(formErrors.name)}
                  helperText={formErrors.name}
                  required
                  fullWidth
                  disabled={submitting}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Customer Name"
                  value={formData.customerName}
                  onChange={handleInputChange('customerName')}
                  error={Boolean(formErrors.customerName)}
                  helperText={formErrors.customerName}
                  required
                  fullWidth
                  disabled={submitting}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Default Template */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Default Form Template
            </Typography>
            <FormControl fullWidth disabled={submitting}>
              <InputLabel>Default Template (Optional)</InputLabel>
              <Select
                value={formData.defaultTemplate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, defaultTemplate: e.target.value }))}
                label="Default Template (Optional)"
              >
                <MenuItem value="">
                  <em>No default template</em>
                </MenuItem>
                {templatesData?.map((template: any) => (
                  <MenuItem key={template._id} value={template._id}>
                    {template.name} ({template.category})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Select a default template that will be automatically used when creating forms for this worksite.
            </Typography>
          </Box>

          <Divider />

          {/* Address */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Address
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Street Address"
                  value={formData.address.street}
                  onChange={handleInputChange('address.street')}
                  error={Boolean(formErrors['address.street'])}
                  helperText={formErrors['address.street']}
                  required
                  fullWidth
                  disabled={submitting}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="City"
                  value={formData.address.city}
                  onChange={handleInputChange('address.city')}
                  error={Boolean(formErrors['address.city'])}
                  helperText={formErrors['address.city']}
                  required
                  fullWidth
                  disabled={submitting}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="State"
                  value={formData.address.state}
                  onChange={handleInputChange('address.state')}
                  error={Boolean(formErrors['address.state'])}
                  helperText={formErrors['address.state']}
                  required
                  fullWidth
                  disabled={submitting}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="ZIP Code"
                  value={formData.address.zipCode}
                  onChange={handleInputChange('address.zipCode')}
                  error={Boolean(formErrors['address.zipCode'])}
                  helperText={formErrors['address.zipCode']}
                  required
                  fullWidth
                  disabled={submitting}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Contacts */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Contacts
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addContact}
                disabled={submitting}
                size="small"
              >
                Add Contact
              </Button>
            </Box>

            {formData.contacts.map((contact, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2">
                      Contact {index + 1}
                    </Typography>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleSetPrimaryContact(index)}
                        color={contact.isPrimary ? 'primary' : 'default'}
                        title={contact.isPrimary ? 'Primary Contact' : 'Set as Primary'}
                      >
                        {contact.isPrimary ? <StarIcon /> : <StarBorderIcon />}
                      </IconButton>
                      {formData.contacts.length > 1 && (
                        <IconButton
                          size="small"
                          onClick={() => removeContact(index)}
                          disabled={submitting}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </Box>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Name"
                        value={contact.name}
                        onChange={handleContactChange(index, 'name')}
                        error={Boolean(formErrors[`contact.${index}.name`])}
                        helperText={formErrors[`contact.${index}.name`]}
                        required
                        fullWidth
                        disabled={submitting}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Position"
                        value={contact.position}
                        onChange={handleContactChange(index, 'position')}
                        fullWidth
                        disabled={submitting}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Phone"
                        value={contact.phone}
                        onChange={handleContactChange(index, 'phone')}
                        fullWidth
                        disabled={submitting}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Email"
                        type="email"
                        value={contact.email}
                        onChange={handleContactChange(index, 'email')}
                        error={Boolean(formErrors[`contact.${index}.email`])}
                        helperText={formErrors[`contact.${index}.email`]}
                        fullWidth
                        disabled={submitting}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Divider />

          {/* Equipment */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Equipment
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addEquipment}
                disabled={submitting}
                size="small"
              >
                Add Equipment
              </Button>
            </Box>

            {formData.equipment.map((equipment, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2">
                      Equipment {index + 1}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => removeEquipment(index)}
                      disabled={submitting}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Equipment ID"
                        value={equipment.id}
                        onChange={handleEquipmentChange(index, 'id')}
                        error={Boolean(formErrors[`equipment.${index}.id`])}
                        helperText={formErrors[`equipment.${index}.id`]}
                        required
                        fullWidth
                        disabled={submitting}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth disabled={submitting}>
                        <InputLabel>Type</InputLabel>
                        <Select
                          value={equipment.type}
                          onChange={(e) => handleEquipmentChange(index, 'type')(e as any)}
                          label="Type"
                        >
                          {equipmentTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        label="Model"
                        value={equipment.model}
                        onChange={handleEquipmentChange(index, 'model')}
                        fullWidth
                        disabled={submitting}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth disabled={submitting}>
                        <InputLabel>Condition</InputLabel>
                        <Select
                          value={equipment.condition}
                          onChange={(e) => handleEquipmentChange(index, 'condition')(e as any)}
                          label="Condition"
                        >
                          {conditionOptions.map((condition) => (
                            <MenuItem key={condition.value} value={condition.value}>
                              {condition.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Serial Number"
                        value={equipment.serialNumber}
                        onChange={handleEquipmentChange(index, 'serialNumber')}
                        fullWidth
                        disabled={submitting}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        label="Notes"
                        value={equipment.notes}
                        onChange={handleEquipmentChange(index, 'notes')}
                        fullWidth
                        multiline
                        rows={2}
                        disabled={submitting}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            ))}
          </Box>

          <Divider />

          {/* Status */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={handleInputChange('isActive')}
                  disabled={submitting}
                />
              }
              label="Active Worksite"
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || loading}
          startIcon={submitting && <CircularProgress size={16} />}
        >
          {isEditing ? 'Update Worksite' : 'Create Worksite'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}