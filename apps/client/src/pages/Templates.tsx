import { useState } from 'react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import {
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CloneIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToastNotifications } from '../components/notifications/NotificationToast';
import { TemplateBuilder } from '../components/templates/TemplateBuilder';
import { TemplateDetail } from '../components/templates/TemplateDetail';

interface ITemplate {
  _id: string;
  name: string;
  description?: string;
  category: string;
  status: 'draft' | 'active' | 'archived' | 'pending_approval';
  version: number;
  tags: string[];
  usage: {
    totalForms: number;
    lastUsed?: string;
  };
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  permissions: {
    canView: string[];
    canUse: string[];
    canEdit: string[];
  };
}

interface TemplateFilters {
  search: string;
  category: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

function TemplateCard({
  template,
  onView,
  onEdit,
  onDelete,
  onClone,
}: {
  template: ITemplate;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClone: (id: string) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user } = useAuth();

  const canEdit = user?.role === 'admin' || template.permissions.canEdit.includes(user?.role || '');
  const canDelete = user?.role === 'admin';

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

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display='flex' justifyContent='space-between' alignItems='flex-start' mb={2}>
          <Typography variant='h6' component='div' noWrap>
            {template.name}
          </Typography>
          <Box>
            <Chip
              label={template.status}
              size='small'
              color={getStatusColor(template.status) as any}
            />
            <IconButton size='small' onClick={e => setAnchorEl(e.currentTarget)}>
              <MoreIcon />
            </IconButton>
          </Box>
        </Box>

        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          {template.description || 'No description provided'}
        </Typography>

        <Box display='flex' flexWrap='wrap' gap={0.5} mb={2}>
          <Chip label={template.category} size='small' variant='outlined' />
          {template.tags.map((tag, index) => (
            <Chip key={index} label={tag} size='small' variant='outlined' />
          ))}
        </Box>

        <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
          <Typography variant='caption' color='text.secondary'>
            Version {template.version}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {template.usage.totalForms} forms created
          </Typography>
        </Box>

        <Typography variant='caption' color='text.secondary'>
          By {template.createdBy.firstName} {template.createdBy.lastName}
        </Typography>
      </CardContent>

      <CardActions>
        <Button size='small' startIcon={<ViewIcon />} onClick={() => onView(template._id)}>
          View
        </Button>
        {canEdit && (
          <Button size='small' startIcon={<EditIcon />} onClick={() => onEdit(template._id)}>
            Edit
          </Button>
        )}
      </CardActions>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem
          onClick={() => {
            onClone(template._id);
            setAnchorEl(null);
          }}
        >
          <CloneIcon sx={{ mr: 1 }} /> Clone Template
        </MenuItem>
        <MenuItem onClick={() => setAnchorEl(null)}>
          <ExportIcon sx={{ mr: 1 }} /> Export Template
        </MenuItem>
        {canDelete && (
          <MenuItem
            onClick={() => {
              onDelete(template._id);
              setAnchorEl(null);
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon sx={{ mr: 1 }} /> Delete Template
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
}

function TemplateList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToastNotifications();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<TemplateFilters>({
    search: '',
    category: '',
    status: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  const [page, setPage] = useState(1);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; templateId?: string }>({
    open: false,
  });

  const limit = 12;

  // Fetch templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['templates', filters, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await api.get(`/templates?${params}`);
      return response.data.data;
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await api.delete(`/templates/${templateId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.showSuccess('Template deleted successfully');
    },
    onError: (err: any) => {
      toast.showError(err.response?.data?.message || 'Failed to delete template');
    },
  });

  // Clone template mutation
  const cloneTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const response = await api.post(`/templates/${templateId}/clone`, {
        name: `Copy of Template`,
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

  const handleView = (templateId: string) => {
    navigate(`/templates/${templateId}`);
  };

  const handleEdit = (templateId: string) => {
    navigate(`/templates/${templateId}/edit`);
  };

  const handleDelete = (templateId: string) => {
    setDeleteDialog({ open: true, templateId });
  };

  const confirmDelete = () => {
    if (deleteDialog.templateId) {
      deleteTemplateMutation.mutate(deleteDialog.templateId);
    }
    setDeleteDialog({ open: false });
  };

  const handleClone = (templateId: string) => {
    cloneTemplateMutation.mutate(templateId);
  };

  const updateFilter = (key: keyof TemplateFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const canCreateTemplate = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Box>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h4'>Templates</Typography>
        {canCreateTemplate && (
          <Button
            variant='contained'
            startIcon={<AddIcon />}
            onClick={() => navigate('/templates/new')}
          >
            Create Template
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems='center'>
            <Grid size={{ xs: 12 }} md={4}>
              <TextField
                fullWidth
                placeholder='Search templates...'
                value={filters.search}
                onChange={e => updateFilter('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={filters.category}
                  onChange={e => updateFilter('category', e.target.value)}
                  label='Category'
                >
                  <MenuItem value=''>All Categories</MenuItem>
                  <MenuItem value='maintenance'>Maintenance</MenuItem>
                  <MenuItem value='inspection'>Inspection</MenuItem>
                  <MenuItem value='service'>Service</MenuItem>
                  <MenuItem value='installation'>Installation</MenuItem>
                  <MenuItem value='calibration'>Calibration</MenuItem>
                  <MenuItem value='breakdown'>Breakdown</MenuItem>
                  <MenuItem value='custom'>Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={e => updateFilter('status', e.target.value)}
                  label='Status'
                >
                  <MenuItem value=''>All Status</MenuItem>
                  <MenuItem value='draft'>Draft</MenuItem>
                  <MenuItem value='active'>Active</MenuItem>
                  <MenuItem value='archived'>Archived</MenuItem>
                  <MenuItem value='pending_approval'>Pending Approval</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={filters.sortBy}
                  onChange={e => updateFilter('sortBy', e.target.value)}
                  label='Sort By'
                >
                  <MenuItem value='updatedAt'>Last Modified</MenuItem>
                  <MenuItem value='name'>Name</MenuItem>
                  <MenuItem value='createdAt'>Created Date</MenuItem>
                  <MenuItem value='usage.totalForms'>Usage</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Order</InputLabel>
                <Select
                  value={filters.sortOrder}
                  onChange={e => updateFilter('sortOrder', e.target.value as 'asc' | 'desc')}
                  label='Order'
                >
                  <MenuItem value='desc'>Descending</MenuItem>
                  <MenuItem value='asc'>Ascending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <Box display='flex' justifyContent='center' py={4}>
          <Typography>Loading templates...</Typography>
        </Box>
      ) : templatesData?.templates?.length > 0 ? (
        <>
          <Grid container spacing={3}>
            {templatesData.templates.map((template: ITemplate) => (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={template._id}>
                <TemplateCard
                  template={template}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onClone={handleClone}
                />
              </Grid>
            ))}
          </Grid>

          {templatesData.pagination && templatesData.pagination.pages > 1 && (
            <Box display='flex' justifyContent='center' mt={4}>
              <Pagination
                count={templatesData.pagination.pages}
                page={page}
                onChange={(_, value) => setPage(value)}
                color='primary'
              />
            </Box>
          )}
        </>
      ) : (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant='h6' gutterBottom>
              No templates found
            </Typography>
            <Typography variant='body1' color='text.secondary' sx={{ mb: 3 }}>
              {canCreateTemplate
                ? 'Start building your first template to streamline form creation.'
                : 'No templates are available for your role.'}
            </Typography>
            {canCreateTemplate && (
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={() => navigate('/templates/new')}
              >
                Create First Template
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Alert severity='warning' sx={{ mb: 2 }}>
            This action cannot be undone. The template and all its data will be permanently deleted.
          </Alert>
          <Typography>Are you sure you want to delete this template?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color='error'
            variant='contained'
            disabled={deleteTemplateMutation.isPending}
          >
            Delete Template
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export function Templates() {
  const location = useLocation();

  return (
    <Routes>
      <Route path='/' element={<TemplateList />} />
      <Route path='/new' element={<TemplateBuilder />} />
      <Route path='/:id' element={<TemplateDetail />} />
      <Route path='/:id/edit' element={<TemplateBuilder />} />
    </Routes>
  );
}
