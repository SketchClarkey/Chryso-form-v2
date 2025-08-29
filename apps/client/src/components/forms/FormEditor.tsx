import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { FileUploader, type FileAttachment } from '../upload/FileUploader';
import { FormStatusWorkflow, FormStatus, StatusHistoryItem } from './FormStatusWorkflow';
import { useToastNotifications } from '../notifications/NotificationToast';

interface FormData {
  worksite: string;
  formId: string;
  status: FormStatus;
  statusHistory?: StatusHistoryItem[];
  completionPercentage?: number;
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
    workAreaCleaned: boolean;
    siteTablesReplaced: boolean;
    systemCheckedForLeaks: boolean;
    pulseMetersLabeled: boolean;
    pumpsLabeled: boolean;
    tanksLabeled: boolean;
    dispensersLabeled: boolean;
    calibrationPointsReturned: boolean;
  };
  additionalInfo: {
    notes: string;
    attachments: FileAttachment[];
  };
}

const steps = [
  'Customer Information',
  'Service Details',
  'Service Checklist',
  'Additional Information',
];

const initialFormData: Partial<FormData> = {
  customerInfo: {
    customerName: '',
    plantLocation: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    serviceDate: '',
    equipmentType: '',
    equipmentModel: '',
    serialNumber: '',
  },
  serviceDetails: {
    serviceType: '',
    workPerformed: '',
    partsUsed: [],
    gcpTechnicianHours: 0,
    contractHours: 0,
    maintenanceProcedures: '',
    breakdownDetails: '',
  },
  serviceChecklist: {
    workAreaCleaned: false,
    siteTablesReplaced: false,
    systemCheckedForLeaks: false,
    pulseMetersLabeled: false,
    pumpsLabeled: false,
    tanksLabeled: false,
    dispensersLabeled: false,
    calibrationPointsReturned: false,
  },
  additionalInfo: {
    notes: '',
    attachments: [],
  },
};

export function FormEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToastNotifications();
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<FormData>>(initialFormData);
  const [error, setError] = useState<string>('');

  const isEditing = Boolean(id && id !== 'new');

  // Fetch form data if editing
  const { data: existingForm, isLoading: isLoadingForm } = useQuery({
    queryKey: ['form', id],
    queryFn: async () => {
      const response = await api.get(`/forms/${id}`);
      return response.data.data.form;
    },
    enabled: isEditing,
  });

  // Fetch user's worksites
  const { data: worksitesData } = useQuery({
    queryKey: ['worksites'],
    queryFn: async () => {
      const response = await api.get('/worksites');
      return response.data.data.worksites;
    },
  });

  useEffect(() => {
    if (existingForm) {
      setFormData(existingForm);
    }
  }, [existingForm]);

  // Save form mutation
  const saveFormMutation = useMutation({
    mutationFn: async (data: Partial<FormData>) => {
      if (isEditing) {
        const response = await api.put(`/forms/${id}`, data);
        return response.data;
      } else {
        const response = await api.post('/forms', data);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      navigate('/forms');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to save form');
    },
  });

  // Submit form mutation
  const submitFormMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/forms/${id}/submit`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.showFormSubmitted();
      navigate('/forms');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to submit form');
      toast.showError(err.response?.data?.message || 'Failed to submit form');
    },
  });

  // Status change mutation
  const statusChangeMutation = useMutation({
    mutationFn: async ({ status, comment }: { status: FormStatus; comment?: string }) => {
      const response = await api.patch(`/forms/${id}/status`, { status, comment });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form', id] });

      // Show appropriate toast based on status
      switch (variables.status) {
        case 'approved':
          toast.showFormApproved();
          break;
        case 'rejected':
          toast.showFormRejected(variables.comment);
          break;
        case 'completed':
          toast.showSuccess('Form marked as completed');
          break;
        case 'in-progress':
          toast.showInfo('Form is now in progress');
          break;
        default:
          toast.showSuccess(`Form status updated to ${variables.status}`);
      }
    },
    onError: (err: any) => {
      toast.showError(err.response?.data?.message || 'Failed to update form status');
    },
  });

  const handleSave = () => {
    if (!formData.worksite && user?.worksites?.[0]) {
      setFormData(prev => ({ ...prev, worksite: user.worksites[0].id }));
    }
    saveFormMutation.mutate(formData);
  };

  const handleStatusChange = async (newStatus: FormStatus, comment?: string) => {
    if (!id || id === 'new') return;
    return statusChangeMutation.mutateAsync({ status: newStatus, comment });
  };

  const handleSubmit = () => {
    if (isEditing) {
      submitFormMutation.mutate();
    } else {
      // Save first, then submit
      saveFormMutation.mutate({ ...formData, status: 'completed' });
    }
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

  const addPartUsed = () => {
    const newPart = {
      partNumber: '',
      description: '',
      quantity: 1,
      replaced: false,
    };
    setFormData(prev => ({
      ...prev,
      serviceDetails: {
        ...prev.serviceDetails,
        partsUsed: [...(prev.serviceDetails?.partsUsed || []), newPart],
      },
    }));
  };

  const updatePartUsed = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      serviceDetails: {
        ...prev.serviceDetails,
        partsUsed:
          prev.serviceDetails?.partsUsed?.map((part, i) =>
            i === index ? { ...part, [field]: value } : part
          ) || [],
      },
    }));
  };

  const removePartUsed = (index: number) => {
    setFormData(prev => ({
      ...prev,
      serviceDetails: {
        ...prev.serviceDetails,
        partsUsed: prev.serviceDetails?.partsUsed?.filter((_, i) => i !== index) || [],
      },
    }));
  };

  const updateAttachments = (attachments: FileAttachment[]) => {
    setFormData(prev => ({
      ...prev,
      additionalInfo: {
        ...prev.additionalInfo,
        attachments,
      },
    }));
  };

  if (isLoadingForm) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
        <CircularProgress />
      </Box>
    );
  }

  // Helper function to determine user permissions
  const canEdit = () => {
    if (!user || !formData.status) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'manager')
      return formData.status !== 'approved' && formData.status !== 'archived';
    if (user.role === 'technician')
      return (
        formData.status !== 'approved' &&
        formData.status !== 'archived' &&
        existingForm?.technician === user.id
      );
    return false;
  };

  const canApprove = () => {
    return user?.role === 'admin' || user?.role === 'manager';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant='h4'>{isEditing ? 'Edit Form' : 'Create New Form'}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant='outlined'
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saveFormMutation.isPending || !canEdit()}
          >
            Save Draft
          </Button>
          <Button
            variant='contained'
            startIcon={<SendIcon />}
            onClick={handleSubmit}
            disabled={saveFormMutation.isPending || submitFormMutation.isPending || !canEdit()}
          >
            {isEditing ? 'Submit' : 'Save & Submit'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Status Workflow Panel */}
        {isEditing && formData.status && (
          <Grid item xs={12} lg={4}>
            <FormStatusWorkflow
              currentStatus={formData.status}
              statusHistory={formData.statusHistory || []}
              canEdit={canEdit()}
              canApprove={canApprove()}
              userRole={user?.role || 'technician'}
              onStatusChange={handleStatusChange}
              completionPercentage={formData.completionPercentage}
            />
          </Grid>
        )}

        {/* Form Content */}
        <Grid item xs={12} lg={isEditing && formData.status ? 8 : 12}>
          <Card>
            <CardContent>
              <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                {steps.map(label => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>

              {/* Customer Information */}
              <Accordion expanded={activeStep === 0} onChange={() => setActiveStep(0)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant='h6'>Customer Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      gap: 2,
                    }}
                  >
                    <TextField
                      label='Customer Name'
                      value={formData.customerInfo?.customerName || ''}
                      onChange={e => updateFormData('customerInfo', 'customerName', e.target.value)}
                      required
                    />
                    <TextField
                      label='Plant Location'
                      value={formData.customerInfo?.plantLocation || ''}
                      onChange={e =>
                        updateFormData('customerInfo', 'plantLocation', e.target.value)
                      }
                      required
                    />
                    <TextField
                      label='Contact Person'
                      value={formData.customerInfo?.contactPerson || ''}
                      onChange={e =>
                        updateFormData('customerInfo', 'contactPerson', e.target.value)
                      }
                    />
                    <TextField
                      label='Contact Email'
                      type='email'
                      value={formData.customerInfo?.contactEmail || ''}
                      onChange={e => updateFormData('customerInfo', 'contactEmail', e.target.value)}
                    />
                    <TextField
                      label='Contact Phone'
                      value={formData.customerInfo?.contactPhone || ''}
                      onChange={e => updateFormData('customerInfo', 'contactPhone', e.target.value)}
                    />
                    <TextField
                      label='Service Date'
                      type='date'
                      value={formData.customerInfo?.serviceDate || ''}
                      onChange={e => updateFormData('customerInfo', 'serviceDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label='Equipment Type'
                      value={formData.customerInfo?.equipmentType || ''}
                      onChange={e =>
                        updateFormData('customerInfo', 'equipmentType', e.target.value)
                      }
                    />
                    <TextField
                      label='Equipment Model'
                      value={formData.customerInfo?.equipmentModel || ''}
                      onChange={e =>
                        updateFormData('customerInfo', 'equipmentModel', e.target.value)
                      }
                    />
                    <TextField
                      label='Serial Number'
                      value={formData.customerInfo?.serialNumber || ''}
                      onChange={e => updateFormData('customerInfo', 'serialNumber', e.target.value)}
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Service Details */}
              <Accordion expanded={activeStep === 1} onChange={() => setActiveStep(1)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant='h6'>Service Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      label='Service Type'
                      value={formData.serviceDetails?.serviceType || ''}
                      onChange={e =>
                        updateFormData('serviceDetails', 'serviceType', e.target.value)
                      }
                    />
                    <TextField
                      label='Work Performed'
                      multiline
                      rows={4}
                      value={formData.serviceDetails?.workPerformed || ''}
                      onChange={e =>
                        updateFormData('serviceDetails', 'workPerformed', e.target.value)
                      }
                    />

                    <Box>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 2,
                        }}
                      >
                        <Typography variant='h6'>Parts Used</Typography>
                        <Button onClick={addPartUsed}>Add Part</Button>
                      </Box>

                      {formData.serviceDetails?.partsUsed?.map((part, index) => (
                        <Card key={index} sx={{ mb: 2, p: 2 }}>
                          <Box
                            sx={{
                              display: 'grid',
                              gridTemplateColumns: '2fr 3fr 1fr auto auto',
                              gap: 2,
                              alignItems: 'center',
                            }}
                          >
                            <TextField
                              label='Part Number'
                              value={part.partNumber}
                              onChange={e => updatePartUsed(index, 'partNumber', e.target.value)}
                              size='small'
                            />
                            <TextField
                              label='Description'
                              value={part.description}
                              onChange={e => updatePartUsed(index, 'description', e.target.value)}
                              size='small'
                            />
                            <TextField
                              label='Quantity'
                              type='number'
                              value={part.quantity}
                              onChange={e =>
                                updatePartUsed(index, 'quantity', parseInt(e.target.value))
                              }
                              size='small'
                            />
                            <FormControlLabel
                              control={
                                <Switch
                                  checked={part.replaced}
                                  onChange={e =>
                                    updatePartUsed(index, 'replaced', e.target.checked)
                                  }
                                />
                              }
                              label='Replaced'
                            />
                            <Button
                              onClick={() => removePartUsed(index)}
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
                        label='GCP Technician Hours'
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
                          updateFormData(
                            'serviceDetails',
                            'contractHours',
                            parseFloat(e.target.value)
                          )
                        }
                      />
                    </Box>

                    <TextField
                      label='Maintenance Procedures'
                      multiline
                      rows={3}
                      value={formData.serviceDetails?.maintenanceProcedures || ''}
                      onChange={e =>
                        updateFormData('serviceDetails', 'maintenanceProcedures', e.target.value)
                      }
                    />

                    <TextField
                      label='Breakdown Details'
                      multiline
                      rows={3}
                      value={formData.serviceDetails?.breakdownDetails || ''}
                      onChange={e =>
                        updateFormData('serviceDetails', 'breakdownDetails', e.target.value)
                      }
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Service Checklist */}
              <Accordion expanded={activeStep === 2} onChange={() => setActiveStep(2)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant='h6'>Service Checklist</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                      gap: 1,
                    }}
                  >
                    {Object.entries({
                      workAreaCleaned: 'Work Area Cleaned',
                      siteTablesReplaced: 'Site Tables Replaced',
                      systemCheckedForLeaks: 'System Checked for Leaks',
                      pulseMetersLabeled: 'Pulse Meters Labeled',
                      pumpsLabeled: 'Pumps Labeled',
                      tanksLabeled: 'Tanks Labeled',
                      dispensersLabeled: 'Dispensers Labeled',
                      calibrationPointsReturned: 'Calibration Points Returned',
                    }).map(([field, label]) => (
                      <FormControlLabel
                        key={field}
                        control={
                          <Switch
                            checked={
                              formData.serviceChecklist?.[
                                field as keyof typeof formData.serviceChecklist
                              ] || false
                            }
                            onChange={e => updateChecklistItem(field, e.target.checked)}
                          />
                        }
                        label={label}
                      />
                    ))}
                  </Box>
                </AccordionDetails>
              </Accordion>

              {/* Additional Information */}
              <Accordion expanded={activeStep === 3} onChange={() => setActiveStep(3)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant='h6'>Additional Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <TextField
                    label='Additional Notes'
                    multiline
                    rows={4}
                    fullWidth
                    value={formData.additionalInfo?.notes || ''}
                    onChange={e => updateFormData('additionalInfo', 'notes', e.target.value)}
                    sx={{ mb: 3 }}
                  />

                  <Box>
                    <Typography variant='subtitle2' gutterBottom>
                      File Attachments
                    </Typography>
                    <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
                      Attach photos, documents, or other files related to this service report.
                    </Typography>
                    <FileUploader
                      files={formData.additionalInfo?.attachments || []}
                      onFilesChange={updateAttachments}
                      maxFiles={10}
                      maxSizeBytes={25 * 1024 * 1024} // 25MB
                    />
                  </Box>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
