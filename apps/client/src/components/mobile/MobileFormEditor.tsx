import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  MobileStepper,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Switch,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  KeyboardArrowLeft,
  KeyboardArrowRight,
  Save as SaveIcon,
  Send as SendIcon,
  PhotoCamera,
  LocationOn,
  CloudOff,
  Sync,
  Add,
  Remove,
  Check,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { EnhancedFileUploader, type EnhancedFileAttachment } from '../upload/EnhancedFileUploader';
import { useToastNotifications } from '../notifications/NotificationToast';
import PWAService from '../../services/pwaService';

interface FormData {
  worksite: string;
  formId: string;
  status: string;
  customerInfo: {
    customerName: string;
    plantLocation: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
    serviceDate: string;
    equipmentType: string;
    equipmentModel: string;
    serialNumber: string;
  };
  serviceDetails: {
    serviceType: string;
    workPerformed: string;
    partsUsed: Array<{
      partNumber: string;
      description: string;
      quantity: number;
      replaced: boolean;
    }>;
    gcpTechnicianHours: number;
    contractHours: number;
    maintenanceProcedures: string;
    breakdownDetails: string;
  };
  serviceChecklist: {
    [key: string]: boolean;
  };
  additionalInfo: {
    notes: string;
    attachments: EnhancedFileAttachment[];
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
  };
}

const steps = ['Customer Info', 'Service Details', 'Checklist', 'Additional Info'];

const checklistItems = {
  workAreaCleaned: 'Work Area Cleaned',
  siteTablesReplaced: 'Site Tables Replaced',
  systemCheckedForLeaks: 'System Checked for Leaks',
  pulseMetersLabeled: 'Pulse Meters Labeled',
  pumpsLabeled: 'Pumps Labeled',
  tanksLabeled: 'Tanks Labeled',
  dispensersLabeled: 'Dispensers Labeled',
  calibrationPointsReturned: 'Calibration Points Returned',
};

export function MobileFormEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToastNotifications();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<FormData>>({});
  const [error, setError] = useState<string>('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [addPartDialog, setAddPartDialog] = useState(false);
  const [newPart, setNewPart] = useState({
    partNumber: '',
    description: '',
    quantity: 1,
    replaced: false,
  });

  const pwaService = PWAService.getInstance();
  const isEditing = Boolean(id && id !== 'new');

  useEffect(() => {
    // Listen for online/offline status
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save form data to local storage for offline use
  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      const formKey = `form_${id || 'new'}`;
      pwaService.storeOfflineData(formKey, formData, 'form');
    }
  }, [formData, id, pwaService]);

  // Fetch form data if editing
  const { data: existingForm, isLoading: isLoadingForm } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const response = await api.get(`/forms/${id}`);
      return response.data.data.form;
    },
    enabled: isEditing && !isOffline,
  });

  useEffect(() => {
    if (existingForm) {
      setFormData(existingForm);
    } else if (isEditing && isOffline) {
      // Try to load from offline storage
      const loadOfflineForm = async () => {
        const offlineForm = await pwaService.getOfflineData(`form_${id}`);
        if (offlineForm) {
          setFormData(offlineForm);
          toast.showInfo('Loaded offline version of form');
        }
      };
      loadOfflineForm();
    }
  }, [existingForm, isEditing, isOffline, id, pwaService, toast]);

  // Save form mutation with offline support
  const saveFormMutation = useMutation({
    mutationFn: async (data: Partial<FormData>) => {
      if (isOffline) {
        // Store in offline storage
        const formKey = `form_${id || Date.now()}`;
        await pwaService.storeOfflineData(formKey, data, 'form');
        await pwaService.storeOfflineData(
          `pending_save_${formKey}`,
          {
            type: isEditing ? 'update' : 'create',
            data,
            formId: id,
          },
          'pending_request'
        );
        return { data: { message: 'Saved offline - will sync when online' } };
      }

      if (isEditing) {
        const response = await api.put(`/forms/${id}`, data);
        return response.data;
      } else {
        const response = await api.post('/forms', data);
        return response.data;
      }
    },
    onSuccess: data => {
      if (isOffline) {
        toast.showInfo('Form saved offline - will sync when connection is restored');
      } else {
        queryClient.invalidateQueries({ queryKey: ['forms'] });
        toast.showSuccess('Form saved successfully');
        if (!isEditing) {
          navigate('/forms');
        }
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to save form');
      toast.showError(err.response?.data?.message || 'Failed to save form');
    },
  });

  const handleNext = () => {
    setActiveStep(prevActiveStep => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep(prevActiveStep => prevActiveStep - 1);
  };

  const handleSave = () => {
    saveFormMutation.mutate(formData);
  };

  const updateFormData = (section: keyof FormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const updateChecklistItem = (field: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      serviceChecklist: {
        ...prev.serviceChecklist,
        [field]: checked,
      },
    }));
  };

  const addPart = () => {
    setFormData(prev => ({
      ...prev,
      serviceDetails: {
        ...prev.serviceDetails,
        partsUsed: [...(prev.serviceDetails?.partsUsed || []), { ...newPart }],
      },
    }));
    setNewPart({ partNumber: '', description: '', quantity: 1, replaced: false });
    setAddPartDialog(false);
  };

  const removePart = (index: number) => {
    setFormData(prev => ({
      ...prev,
      serviceDetails: {
        ...prev.serviceDetails,
        partsUsed: prev.serviceDetails?.partsUsed?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.showError('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          additionalInfo: {
            ...prev.additionalInfo,
            location: { latitude, longitude },
          },
        }));
        toast.showSuccess('Location captured');
      },
      error => {
        toast.showError('Failed to get location: ' + error.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Customer Info
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Customer Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label='Customer Name'
                value={formData.customerInfo?.customerName || ''}
                onChange={e => updateFormData('customerInfo', 'customerName', e.target.value)}
                required
                fullWidth
              />
              <TextField
                label='Plant Location'
                value={formData.customerInfo?.plantLocation || ''}
                onChange={e => updateFormData('customerInfo', 'plantLocation', e.target.value)}
                required
                fullWidth
              />
              <TextField
                label='Contact Person'
                value={formData.customerInfo?.contactPerson || ''}
                onChange={e => updateFormData('customerInfo', 'contactPerson', e.target.value)}
                fullWidth
              />
              <TextField
                label='Contact Email'
                type='email'
                value={formData.customerInfo?.contactEmail || ''}
                onChange={e => updateFormData('customerInfo', 'contactEmail', e.target.value)}
                fullWidth
              />
              <TextField
                label='Contact Phone'
                value={formData.customerInfo?.contactPhone || ''}
                onChange={e => updateFormData('customerInfo', 'contactPhone', e.target.value)}
                fullWidth
              />
              <TextField
                label='Service Date'
                type='date'
                value={formData.customerInfo?.serviceDate || ''}
                onChange={e => updateFormData('customerInfo', 'serviceDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label='Equipment Type'
                value={formData.customerInfo?.equipmentType || ''}
                onChange={e => updateFormData('customerInfo', 'equipmentType', e.target.value)}
                fullWidth
              />
              <TextField
                label='Equipment Model'
                value={formData.customerInfo?.equipmentModel || ''}
                onChange={e => updateFormData('customerInfo', 'equipmentModel', e.target.value)}
                fullWidth
              />
              <TextField
                label='Serial Number'
                value={formData.customerInfo?.serialNumber || ''}
                onChange={e => updateFormData('customerInfo', 'serialNumber', e.target.value)}
                fullWidth
              />
            </Box>
          </Box>
        );

      case 1: // Service Details
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Service Details
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label='Service Type'
                value={formData.serviceDetails?.serviceType || ''}
                onChange={e => updateFormData('serviceDetails', 'serviceType', e.target.value)}
                fullWidth
              />
              <TextField
                label='Work Performed'
                multiline
                rows={3}
                value={formData.serviceDetails?.workPerformed || ''}
                onChange={e => updateFormData('serviceDetails', 'workPerformed', e.target.value)}
                fullWidth
              />

              {/* Parts Used */}
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography variant='subtitle1'>Parts Used</Typography>
                  <Button startIcon={<Add />} onClick={() => setAddPartDialog(true)} size='small'>
                    Add Part
                  </Button>
                </Box>

                {formData.serviceDetails?.partsUsed?.map((part, index) => (
                  <Card key={index} sx={{ mb: 1, p: 1 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant='body2' fontWeight='bold'>
                          {part.partNumber} - {part.description}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          Quantity: {part.quantity} {part.replaced && '• Replaced'}
                        </Typography>
                      </Box>
                      <Button
                        startIcon={<Remove />}
                        onClick={() => removePart(index)}
                        color='error'
                        size='small'
                      >
                        Remove
                      </Button>
                    </Box>
                  </Card>
                ))}
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label='GCP Hours'
                  type='number'
                  value={formData.serviceDetails?.gcpTechnicianHours || 0}
                  onChange={e =>
                    updateFormData(
                      'serviceDetails',
                      'gcpTechnicianHours',
                      parseFloat(e.target.value)
                    )
                  }
                />
                <TextField
                  label='Contract Hours'
                  type='number'
                  value={formData.serviceDetails?.contractHours || 0}
                  onChange={e =>
                    updateFormData('serviceDetails', 'contractHours', parseFloat(e.target.value))
                  }
                />
              </Box>

              <TextField
                label='Maintenance Procedures'
                multiline
                rows={2}
                value={formData.serviceDetails?.maintenanceProcedures || ''}
                onChange={e =>
                  updateFormData('serviceDetails', 'maintenanceProcedures', e.target.value)
                }
                fullWidth
              />

              <TextField
                label='Breakdown Details'
                multiline
                rows={2}
                value={formData.serviceDetails?.breakdownDetails || ''}
                onChange={e => updateFormData('serviceDetails', 'breakdownDetails', e.target.value)}
                fullWidth
              />
            </Box>
          </Box>
        );

      case 2: // Checklist
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Service Checklist
            </Typography>
            <List>
              {Object.entries(checklistItems).map(([field, label]) => (
                <ListItem key={field} sx={{ px: 0 }}>
                  <ListItemText primary={label} />
                  <ListItemSecondaryAction>
                    <Switch
                      checked={formData.serviceChecklist?.[field] || false}
                      onChange={e => updateChecklistItem(field, e.target.checked)}
                      color='primary'
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        );

      case 3: // Additional Info
        return (
          <Box sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Additional Information
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label='Additional Notes'
                multiline
                rows={4}
                value={formData.additionalInfo?.notes || ''}
                onChange={e => updateFormData('additionalInfo', 'notes', e.target.value)}
                fullWidth
              />

              {/* Location Section */}
              <Paper sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 1,
                  }}
                >
                  <Typography variant='subtitle1'>Location</Typography>
                  <Button startIcon={<LocationOn />} onClick={getCurrentLocation} size='small'>
                    Get Location
                  </Button>
                </Box>
                {formData.additionalInfo?.location && (
                  <Typography variant='body2' color='text.secondary'>
                    Lat: {formData.additionalInfo.location.latitude.toFixed(6)}, Lng:{' '}
                    {formData.additionalInfo.location.longitude.toFixed(6)}
                  </Typography>
                )}
              </Paper>

              {/* File Attachments */}
              <Box>
                <Typography variant='subtitle1' gutterBottom>
                  File Attachments
                </Typography>
                <EnhancedFileUploader
                  files={formData.additionalInfo?.attachments || []}
                  onFilesChange={files => updateFormData('additionalInfo', 'attachments', files)}
                  maxFiles={5}
                  maxSizeBytes={10 * 1024 * 1024} // 10MB for mobile
                  enableCamera={true}
                  enableAnnotations={true}
                  autoOptimize={true}
                  offlineCapable={true}
                  acceptedTypes={['image/*', 'application/pdf', '.doc', '.docx']}
                />
              </Box>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  if (isLoadingForm) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant='h6'>{isEditing ? 'Edit Form' : 'New Form'}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isOffline && <Chip icon={<CloudOff />} label='Offline' color='warning' size='small' />}
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saveFormMutation.isPending}
              size='small'
              variant='outlined'
            >
              Save
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity='error' sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Card sx={{ m: 1, height: 'calc(100% - 16px)' }}>
          <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>{renderStepContent()}</CardContent>
        </Card>
      </Box>

      {/* Bottom Navigation */}
      <Paper sx={{ borderRadius: 0 }}>
        <MobileStepper
          variant='dots'
          steps={steps.length}
          position='static'
          activeStep={activeStep}
          nextButton={
            <Button size='small' onClick={handleNext} disabled={activeStep === steps.length - 1}>
              Next
              <KeyboardArrowRight />
            </Button>
          }
          backButton={
            <Button size='small' onClick={handleBack} disabled={activeStep === 0}>
              <KeyboardArrowLeft />
              Back
            </Button>
          }
        />
      </Paper>

      {/* Add Part Dialog */}
      <Dialog open={addPartDialog} onClose={() => setAddPartDialog(false)} fullWidth maxWidth='sm'>
        <DialogTitle>Add Part</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label='Part Number'
              value={newPart.partNumber}
              onChange={e => setNewPart(prev => ({ ...prev, partNumber: e.target.value }))}
              fullWidth
            />
            <TextField
              label='Description'
              value={newPart.description}
              onChange={e => setNewPart(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
            />
            <TextField
              label='Quantity'
              type='number'
              value={newPart.quantity}
              onChange={e => setNewPart(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
              fullWidth
            />
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Switch
                checked={newPart.replaced}
                onChange={e => setNewPart(prev => ({ ...prev, replaced: e.target.checked }))}
              />
              <Typography>Part was replaced</Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddPartDialog(false)}>Cancel</Button>
          <Button
            onClick={addPart}
            variant='contained'
            disabled={!newPart.partNumber || !newPart.description}
          >
            Add Part
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
