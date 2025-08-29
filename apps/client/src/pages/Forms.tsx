import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  InputAdornment,
  Toolbar,
  Alert,
  Skeleton,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Download as ExportIcon,
  Assignment as FormIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CompletedIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToastNotifications } from '../components/notifications/NotificationToast';

interface Form {
  _id: string;
  formId: string;
  worksite: {
    _id: string;
    name: string;
  };
  customerInfo: {
    customerName: string;
    plantLocation: string;
    serviceDate: string;
  };
  status: 'draft' | 'completed' | 'submitted' | 'approved' | 'rejected';
  completionPercentage: number;
  technician: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  draft: { color: 'default', icon: EditIcon, label: 'Draft' },
  completed: { color: 'info', icon: CompletedIcon, label: 'Completed' },
  submitted: { color: 'warning', icon: ScheduleIcon, label: 'Submitted' },
  approved: { color: 'success', icon: CheckCircle, label: 'Approved' },
  rejected: { color: 'error', icon: ErrorIcon, label: 'Rejected' },
} as const;

export function Forms() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const toast = useToastNotifications();
  const queryClient = useQueryClient();

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch forms data
  const { data: formsData, isLoading, error, isError } = useQuery({
    queryKey: ['forms', { page, pageSize, search: searchTerm, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      
      const response = await api.get(`/forms?${params}`);
      return response.data.data;
    },
    staleTime: 30000, // 30 seconds
  });

  const forms = formsData?.forms || [];
  const totalForms = formsData?.total || 0;
  const totalPages = Math.ceil(totalForms / pageSize);

  // Delete form mutation
  const deleteFormMutation = useMutation({
    mutationFn: async (formId: string) => {
      const response = await api.delete(`/forms/${formId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast.showSuccess('Form deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedForm(null);
    },
    onError: (error: any) => {
      toast.showError(error.response?.data?.message || 'Failed to delete form');
    },
  });

  // Filter forms based on search and status
  const filteredForms = useMemo(() => {
    return forms.filter((form: Form) => {
      const matchesSearch = !searchTerm || 
        form.customerInfo.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.customerInfo.plantLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        form.formId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || form.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [forms, searchTerm, statusFilter]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, form: Form) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedForm(form);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedForm(null);
  };

  const handleView = (form: Form) => {
    navigate(`/forms/${form._id}`);
    handleMenuClose();
  };

  const handleEdit = (form: Form) => {
    navigate(`/forms/${form._id}/edit`);
    handleMenuClose();
  };

  const handleDelete = (form: Form) => {
    setSelectedForm(form);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = () => {
    if (selectedForm) {
      deleteFormMutation.mutate(selectedForm._id);
    }
  };

  const handleRowClick = (form: Form) => {
    // Check permissions - technicians can only edit their own forms
    if (user?.role === 'technician' && form.technician._id !== user.id) {
      navigate(`/forms/${form._id}`); // View only
    } else {
      navigate(`/forms/${form._id}/edit`); // Edit
    }
  };

  const getStatusChip = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return <Chip label={status} size="small" />;

    return (
      <Chip
        label={config.label}
        color={config.color as any}
        size="small"
        icon={<config.icon sx={{ fontSize: '16px !important' }} />}
      />
    );
  };

  const canEditForm = (form: Form) => {
    if (user?.role === 'admin' || user?.role === 'manager') return true;
    if (user?.role === 'technician' && form.technician._id === user.id) return true;
    return false;
  };

  const canDeleteForm = (form: Form) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'manager' && form.status === 'draft') return true;
    return false;
  };

  if (isError) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Forms
        </Typography>
        <Alert severity="error">
          {error?.message || 'Failed to load forms. Please try again.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormIcon color="primary" />
          Forms
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/forms/new')}
          sx={{ minWidth: 140 }}
        >
          New Form
        </Button>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Toolbar sx={{ px: '0 !important', minHeight: '48px !important' }}>
            <TextField
              placeholder="Search forms..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300, mr: 2 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150, mr: 2 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ flexGrow: 1 }} />
            
            <Button
              startIcon={<ExportIcon />}
              variant="outlined"
              size="small"
            >
              Export
            </Button>
          </Toolbar>
        </CardContent>
      </Card>

      {/* Forms Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell><strong>Form ID</strong></TableCell>
                  <TableCell><strong>Customer</strong></TableCell>
                  <TableCell><strong>Location</strong></TableCell>
                  <TableCell><strong>Worksite</strong></TableCell>
                  <TableCell><strong>Technician</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Progress</strong></TableCell>
                  <TableCell><strong>Service Date</strong></TableCell>
                  <TableCell><strong>Last Updated</strong></TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      {Array.from({ length: 10 }).map((_, cellIndex) => (
                        <TableCell key={cellIndex}>
                          <Skeleton variant="text" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredForms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Box sx={{ textAlign: 'center' }}>
                        <FormIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No forms found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {searchTerm || statusFilter !== 'all' 
                            ? 'Try adjusting your search or filters'
                            : 'Click "New Form" to create your first form'
                          }
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredForms.map((form: Form) => (
                    <TableRow 
                      key={form._id} 
                      hover
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.02)
                        }
                      }}
                      onClick={() => handleRowClick(form)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {form.formId}
                        </Typography>
                      </TableCell>
                      <TableCell>{form.customerInfo.customerName}</TableCell>
                      <TableCell>{form.customerInfo.plantLocation}</TableCell>
                      <TableCell>{form.worksite.name}</TableCell>
                      <TableCell>{form.technician.name}</TableCell>
                      <TableCell>{getStatusChip(form.status)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 60,
                              height: 6,
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              borderRadius: 3,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                width: `${form.completionPercentage}%`,
                                height: '100%',
                                backgroundColor: theme.palette.primary.main,
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {form.completionPercentage}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {form.customerInfo.serviceDate 
                          ? format(parseISO(form.customerInfo.serviceDate), 'MMM dd, yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {format(parseISO(form.updatedAt), 'MMM dd, yyyy HH:mm')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, form)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
                size="medium"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedForm && handleView(selectedForm)}>
          <ViewIcon sx={{ mr: 1 }} />
          View
        </MenuItem>
        {selectedForm && canEditForm(selectedForm) && (
          <MenuItem onClick={() => selectedForm && handleEdit(selectedForm)}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        {selectedForm && canDeleteForm(selectedForm) && (
          <MenuItem onClick={() => selectedForm && handleDelete(selectedForm)} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Form</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete form "{selectedForm?.formId}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={confirmDelete} 
            color="error" 
            variant="contained"
            disabled={deleteFormMutation.isPending}
          >
            {deleteFormMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}