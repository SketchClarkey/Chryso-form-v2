import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Edit as EditIcon,
  MoreVert as MoreIcon,
  ContentCopy as CloneIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  GetApp as ExportIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToastNotifications } from '../notifications/NotificationToast';
import { TemplateApprovalWorkflow } from './TemplateApprovalWorkflow';
import { TemplateVersioning } from './TemplateVersioning';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export function TemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastNotifications();
  const queryClient = useQueryClient();

  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Fetch template details
  const {
    data: template,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      const response = await api.get(`/templates/${id}`);
      return response.data.data.template;
    },
    enabled: !!id,
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/templates/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.showSuccess('Template deleted successfully');
      navigate('/templates');
    },
    onError: (err: any) => {
      toast.showError(err.response?.data?.message || 'Failed to delete template');
    },
  });

  // Clone template mutation
  const cloneTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/templates/${id}/clone`, {
        name: `Copy of ${template?.name}`,
      });
      return response.data;
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.showSuccess('Template cloned successfully');
      navigate(`/templates/${data.data.template._id}/edit`);
    },
    onError: (err: any) => {
      toast.showError(err.response?.data?.message || 'Failed to clone template');
    },
  });

  // Archive template mutation
  const archiveTemplateMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(`/templates/${id}/status`, {
        status: 'archived',
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', id] });
      toast.showSuccess('Template archived successfully');
    },
    onError: (err: any) => {
      toast.showError(err.response?.data?.message || 'Failed to archive template');
    },
  });

  if (isLoading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !template) {
    return (
      <Alert severity='error'>Template not found or you don't have permission to view it.</Alert>
    );
  }

  const canEdit =
    user?.role === 'admin' || template.permissions?.canEdit.includes(user?.role || '');
  const canDelete = user?.role === 'admin';
  const canApprove = user?.role === 'admin' || user?.role === 'manager';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'default';
      case 'pending_approval':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleExportTemplate = async () => {
    try {
      const response = await api.get(`/templates/${id}/export`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.showSuccess('Template exported successfully');
    } catch (error) {
      toast.showError('Failed to export template');
    }
    handleMenuClose();
  };

  return (
    <Box>
      {/* Header */}
      <Box display='flex' justifyContent='space-between' alignItems='flex-start' mb={3}>
        <Box>
          <Typography variant='h4' gutterBottom>
            {template.name}
          </Typography>
          <Box display='flex' alignItems='center' gap={2} mb={2}>
            <Chip
              label={template.status.replace('_', ' ').toUpperCase()}
              color={getStatusColor(template.status) as any}
              variant='filled'
            />
            <Chip label={`Version ${template.version}`} variant='outlined' />
            <Chip
              label={template.category.charAt(0).toUpperCase() + template.category.slice(1)}
              variant='outlined'
            />
          </Box>
          {template.description && (
            <Typography variant='body1' color='text.secondary' paragraph>
              {template.description}
            </Typography>
          )}
        </Box>

        <Box display='flex' gap={1}>
          <Button
            variant='outlined'
            startIcon={<ViewIcon />}
            onClick={() => navigate(`/templates/${id}/preview`)}
          >
            Preview
          </Button>
          {canEdit && (
            <Button
              variant='contained'
              startIcon={<EditIcon />}
              onClick={() => navigate(`/templates/${id}/edit`)}
            >
              Edit Template
            </Button>
          )}
          <IconButton onClick={handleMenuOpen}>
            <MoreIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Template Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid2 container spacing={3}>
            <Grid2 md={6}>
              <Typography variant='subtitle2' color='text.secondary'>
                Created By
              </Typography>
              <Typography variant='body1'>
                {template.createdBy?.firstName} {template.createdBy?.lastName}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {new Date(template.createdAt).toLocaleDateString()}
              </Typography>
            </Grid2>
            <Grid2 md={6}>
              <Typography variant='subtitle2' color='text.secondary'>
                Last Modified
              </Typography>
              <Typography variant='body1'>
                {template.lastModifiedBy?.firstName} {template.lastModifiedBy?.lastName}
              </Typography>
              <Typography variant='caption' color='text.secondary'>
                {new Date(template.updatedAt).toLocaleDateString()}
              </Typography>
            </Grid2>
            <Grid2 md={6}>
              <Typography variant='subtitle2' color='text.secondary'>
                Usage Statistics
              </Typography>
              <Typography variant='body1'>
                {template.usage?.totalForms || 0} forms created
              </Typography>
              {template.usage?.lastUsed && (
                <Typography variant='caption' color='text.secondary'>
                  Last used: {new Date(template.usage.lastUsed).toLocaleDateString()}
                </Typography>
              )}
            </Grid2>
            <Grid2 md={6}>
              <Typography variant='subtitle2' color='text.secondary'>
                Tags
              </Typography>
              <Box display='flex' flexWrap='wrap' gap={0.5}>
                {template.tags?.length > 0 ? (
                  template.tags.map((tag: string, index: number) => (
                    <Chip key={index} label={tag} size='small' variant='outlined' />
                  ))
                ) : (
                  <Typography variant='body2' color='text.secondary'>
                    No tags
                  </Typography>
                )}
              </Box>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab label='Template Structure' />
          <Tab label='Approval Workflow' />
          <Tab label='Version History' />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Template Structure */}
        <Card>
          <CardContent>
            <Typography variant='h6' gutterBottom>
              Template Structure
            </Typography>
            <Typography variant='body2' color='text.secondary' gutterBottom>
              {template.sections?.length || 0} sections,{' '}
              {template.sections?.reduce(
                (total: number, section: any) => total + (section.fields?.length || 0),
                0
              ) || 0}{' '}
              fields
            </Typography>

            {template.sections?.map((section: any, index: number) => (
              <Card key={section.id} variant='outlined' sx={{ mt: 2 }}>
                <CardContent>
                  <Typography variant='subtitle1' gutterBottom>
                    {section.title}
                  </Typography>
                  {section.description && (
                    <Typography variant='body2' color='text.secondary' gutterBottom>
                      {section.description}
                    </Typography>
                  )}
                  <Typography variant='caption' color='text.secondary'>
                    {section.fields?.length || 0} fields
                  </Typography>

                  {section.fields?.length > 0 && (
                    <Box mt={2}>
                      {section.fields.map((field: any) => (
                        <Chip
                          key={field.id}
                          label={`${field.label} (${field.type})`}
                          size='small'
                          variant='outlined'
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}

            {(!template.sections || template.sections.length === 0) && (
              <Alert severity='info'>This template has no sections defined yet.</Alert>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <TemplateApprovalWorkflow template={template} canApprove={canApprove} canEdit={canEdit} />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <TemplateVersioning template={template} />
      </TabPanel>

      {/* Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            cloneTemplateMutation.mutate();
            handleMenuClose();
          }}
        >
          <CloneIcon sx={{ mr: 1 }} /> Clone Template
        </MenuItem>

        <MenuItem onClick={handleExportTemplate}>
          <ExportIcon sx={{ mr: 1 }} /> Export Template
        </MenuItem>

        <Divider />

        {template.status !== 'archived' && canEdit && (
          <MenuItem
            onClick={() => {
              archiveTemplateMutation.mutate();
              handleMenuClose();
            }}
          >
            <ArchiveIcon sx={{ mr: 1 }} /> Archive Template
          </MenuItem>
        )}

        {canDelete && (
          <MenuItem
            onClick={() => {
              if (
                confirm(
                  'Are you sure you want to delete this template? This action cannot be undone.'
                )
              ) {
                deleteTemplateMutation.mutate();
              }
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} /> Delete Template
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
