import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Alert,
  Tooltip,
  Paper,
  Tabs,
  Tab,
  LinearProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as ExecuteIcon,
  Pause as PauseIcon,
  History as HistoryIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Schedule as ScheduleIcon,
  Assessment as StatsIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface DataRetentionPolicy {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  entityType: string;
  retentionPeriod: {
    value: number;
    unit: string;
  };
  archiveBeforeDelete: boolean;
  archiveLocation?: string;
  archiveFormat: string;
  conditions?: any[];
  legalHold?: {
    enabled: boolean;
    reason?: string;
    holdUntil?: string;
    exemptFromDeletion: boolean;
  };
  complianceRequirements?: {
    gdpr: boolean;
    hipaa: boolean;
    sox: boolean;
    pci: boolean;
    custom?: string[];
  };
  executionSchedule: {
    frequency: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    hour: number;
    timezone: string;
  };
  stats: {
    lastExecuted?: string;
    recordsArchived: number;
    recordsDeleted: number;
    totalSizeArchived: number;
    errors: {
      count: number;
      lastError?: string;
      lastErrorAt?: string;
    };
  };
  createdBy: any;
  modifiedBy?: any;
  createdAt: string;
  updatedAt: string;
}

interface RetentionStats {
  totalPolicies: number;
  activePolicies: number;
  totalRecordsArchived: number;
  totalRecordsDeleted: number;
  totalSizeArchived: number;
  totalErrors: number;
  lastExecution?: string;
  policiesByEntityType: Record<string, number>;
}

const policySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  entityType: z.enum(['form', 'auditLog', 'report', 'user', 'template', 'dashboard', 'all']),
  retentionPeriod: z.object({
    value: z.number().min(1, 'Value must be at least 1'),
    unit: z.enum(['days', 'months', 'years'])
  }),
  archiveBeforeDelete: z.boolean(),
  archiveLocation: z.string().optional(),
  archiveFormat: z.enum(['json', 'csv', 'compressed']),
  executionSchedule: z.object({
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    dayOfWeek: z.number().min(0).max(6).optional(),
    dayOfMonth: z.number().min(1).max(31).optional(),
    hour: z.number().min(0).max(23),
    timezone: z.string()
  }),
  legalHold: z.object({
    enabled: z.boolean(),
    reason: z.string().optional(),
    holdUntil: z.string().optional(),
    exemptFromDeletion: z.boolean()
  }).optional(),
  complianceRequirements: z.object({
    gdpr: z.boolean(),
    hipaa: z.boolean(),
    sox: z.boolean(),
    pci: z.boolean(),
    custom: z.array(z.string()).optional()
  }).optional()
});

type PolicyFormData = z.infer<typeof policySchema>;

const DataRetentionManager: React.FC = () => {
  const { request } = useApi();
  const [policies, setPolicies] = useState<DataRetentionPolicy[]>([]);
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedTab, setSelectedTab] = useState(0);

  // Dialog states
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DataRetentionPolicy | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<DataRetentionPolicy | null>(null);
  const [executeDialogOpen, setExecuteDialogOpen] = useState(false);
  const [policyToExecute, setPolicyToExecute] = useState<DataRetentionPolicy | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<PolicyFormData>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      archiveBeforeDelete: true,
      archiveFormat: 'compressed',
      executionSchedule: {
        frequency: 'daily',
        hour: 2,
        timezone: 'UTC'
      },
      legalHold: {
        enabled: false,
        exemptFromDeletion: true
      },
      complianceRequirements: {
        gdpr: false,
        hipaa: false,
        sox: false,
        pci: false
      }
    }
  });

  const watchedFrequency = watch('executionSchedule.frequency');

  useEffect(() => {
    loadPolicies();
    loadStats();
  }, [page, rowsPerPage]);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await request(`/api/data-retention?page=${page + 1}&limit=${rowsPerPage}`);
      setPolicies(response.data.policies);
      setTotal(response.data.pagination.total);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load retention policies');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await request('/api/data-retention/stats/summary');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to load retention stats:', error);
    }
  };

  const handleCreatePolicy = () => {
    setEditingPolicy(null);
    reset();
    setPolicyDialogOpen(true);
  };

  const handleEditPolicy = (policy: DataRetentionPolicy) => {
    setEditingPolicy(policy);
    reset({
      name: policy.name,
      description: policy.description,
      entityType: policy.entityType as any,
      retentionPeriod: policy.retentionPeriod,
      archiveBeforeDelete: policy.archiveBeforeDelete,
      archiveLocation: policy.archiveLocation,
      archiveFormat: policy.archiveFormat as any,
      executionSchedule: policy.executionSchedule,
      legalHold: policy.legalHold,
      complianceRequirements: policy.complianceRequirements
    });
    setPolicyDialogOpen(true);
  };

  const handleSavePolicy = async (data: PolicyFormData) => {
    try {
      setError(null);
      
      if (editingPolicy) {
        await request(`/api/data-retention/${editingPolicy._id}`, {
          method: 'PUT',
          data
        });
      } else {
        await request('/api/data-retention', {
          method: 'POST',
          data
        });
      }

      setPolicyDialogOpen(false);
      loadPolicies();
      loadStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save retention policy');
    }
  };

  const handleDeletePolicy = (policy: DataRetentionPolicy) => {
    setPolicyToDelete(policy);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!policyToDelete) return;

    try {
      setError(null);
      await request(`/api/data-retention/${policyToDelete._id}`, {
        method: 'DELETE'
      });

      setDeleteDialogOpen(false);
      setPolicyToDelete(null);
      loadPolicies();
      loadStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to delete retention policy');
    }
  };

  const handleTogglePolicy = async (policy: DataRetentionPolicy) => {
    try {
      setError(null);
      await request(`/api/data-retention/${policy._id}/toggle`, {
        method: 'PATCH'
      });

      loadPolicies();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to toggle retention policy');
    }
  };

  const handleExecutePolicy = (policy: DataRetentionPolicy) => {
    setPolicyToExecute(policy);
    setExecuteDialogOpen(true);
  };

  const confirmExecute = async () => {
    if (!policyToExecute) return;

    try {
      setError(null);
      await request(`/api/data-retention/${policyToExecute._id}/execute`, {
        method: 'POST'
      });

      setExecuteDialogOpen(false);
      setPolicyToExecute(null);
      loadPolicies();
      loadStats();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to execute retention policy');
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getEntityTypeIcon = (entityType: string) => {
    switch (entityType) {
      case 'form': return '📋';
      case 'auditLog': return '🔍';
      case 'report': return '📊';
      case 'user': return '👤';
      case 'template': return '📄';
      case 'dashboard': return '📈';
      case 'all': return '🗂️';
      default: return '📄';
    }
  };

  const getStatusColor = (isActive: boolean) => isActive ? 'success' : 'default';

  const TabPanel = ({ children, value, index }: any) => (
    <div hidden={value !== index}>
      {value === index && <Box p={3}>{children}</Box>}
    </div>
  );

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Data Retention Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreatePolicy}
        >
          Create Policy
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={selectedTab} onChange={(_, newValue) => setSelectedTab(newValue)}>
          <Tab label="Policies" icon={<SecurityIcon />} />
          <Tab label="Statistics" icon={<StatsIcon />} />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {/* Policies Tab */}
          {loading && <LinearProgress />}
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Entity Type</TableCell>
                  <TableCell>Retention Period</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Executed</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy._id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">
                          {policy.name}
                        </Typography>
                        {policy.description && (
                          <Typography variant="caption" color="text.secondary">
                            {policy.description}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{getEntityTypeIcon(policy.entityType)}</span>
                        <Typography variant="body2">
                          {policy.entityType}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {policy.retentionPeriod.value} {policy.retentionPeriod.unit}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {policy.executionSchedule.frequency} at {policy.executionSchedule.hour}:00 UTC
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={policy.isActive ? 'Active' : 'Inactive'}
                        color={getStatusColor(policy.isActive)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {policy.stats.lastExecuted ? (
                        <Typography variant="body2">
                          {new Date(policy.stats.lastExecuted).toLocaleDateString()}
                        </Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Never
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Edit Policy">
                          <IconButton
                            size="small"
                            onClick={() => handleEditPolicy(policy)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={policy.isActive ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            size="small"
                            onClick={() => handleTogglePolicy(policy)}
                          >
                            {policy.isActive ? <PauseIcon /> : <PlayArrow />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Execute Now">
                          <IconButton
                            size="small"
                            onClick={() => handleExecutePolicy(policy)}
                            disabled={!policy.isActive}
                          >
                            <ExecuteIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Policy">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeletePolicy(policy)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* Statistics Tab */}
          {stats && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {stats.totalPolicies}
                    </Typography>
                    <Typography variant="h6">Total Policies</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stats.activePolicies} active
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="success.main">
                      {stats.totalRecordsArchived.toLocaleString()}
                    </Typography>
                    <Typography variant="h6">Records Archived</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatSize(stats.totalSizeArchived)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="warning.main">
                      {stats.totalRecordsDeleted.toLocaleString()}
                    </Typography>
                    <Typography variant="h6">Records Deleted</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Permanent deletions
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="h4" color="error.main">
                      {stats.totalErrors}
                    </Typography>
                    <Typography variant="h6">Total Errors</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Policy execution errors
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Policies by Entity Type
                    </Typography>
                    <Grid container spacing={2}>
                      {Object.entries(stats.policiesByEntityType).map(([entityType, count]) => (
                        <Grid item xs={6} md={3} key={entityType}>
                          <Box display="flex" alignItems="center" gap={1}>
                            <span>{getEntityTypeIcon(entityType)}</span>
                            <Typography variant="body1">
                              {entityType}: {count}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </TabPanel>
      </Paper>

      {/* Policy Creation/Edit Dialog */}
      <Dialog
        open={policyDialogOpen}
        onClose={() => setPolicyDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingPolicy ? 'Edit Retention Policy' : 'Create Retention Policy'}
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit(handleSavePolicy)}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Policy Name"
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Controller
                  name="entityType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Entity Type</InputLabel>
                      <Select {...field} label="Entity Type">
                        <MenuItem value="form">Forms</MenuItem>
                        <MenuItem value="auditLog">Audit Logs</MenuItem>
                        <MenuItem value="report">Reports</MenuItem>
                        <MenuItem value="user">Users</MenuItem>
                        <MenuItem value="template">Templates</MenuItem>
                        <MenuItem value="dashboard">Dashboards</MenuItem>
                        <MenuItem value="all">All Entities</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Description"
                      multiline
                      rows={2}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6} md={4}>
                <Controller
                  name="retentionPeriod.value"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Retention Value"
                      type="number"
                      error={!!errors.retentionPeriod?.value}
                      helperText={errors.retentionPeriod?.value?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} md={4}>
                <Controller
                  name="retentionPeriod.unit"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Unit</InputLabel>
                      <Select {...field} label="Unit">
                        <MenuItem value="days">Days</MenuItem>
                        <MenuItem value="months">Months</MenuItem>
                        <MenuItem value="years">Years</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Controller
                  name="archiveFormat"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Archive Format</InputLabel>
                      <Select {...field} label="Archive Format">
                        <MenuItem value="json">JSON</MenuItem>
                        <MenuItem value="csv">CSV</MenuItem>
                        <MenuItem value="compressed">Compressed</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="archiveBeforeDelete"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={<Switch {...field} checked={field.value} />}
                      label="Archive data before deletion"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={6} md={4}>
                <Controller
                  name="executionSchedule.frequency"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Frequency</InputLabel>
                      <Select {...field} label="Frequency">
                        <MenuItem value="daily">Daily</MenuItem>
                        <MenuItem value="weekly">Weekly</MenuItem>
                        <MenuItem value="monthly">Monthly</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              
              {watchedFrequency === 'weekly' && (
                <Grid item xs={6} md={4}>
                  <Controller
                    name="executionSchedule.dayOfWeek"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>Day of Week</InputLabel>
                        <Select {...field} label="Day of Week">
                          <MenuItem value={0}>Sunday</MenuItem>
                          <MenuItem value={1}>Monday</MenuItem>
                          <MenuItem value={2}>Tuesday</MenuItem>
                          <MenuItem value={3}>Wednesday</MenuItem>
                          <MenuItem value={4}>Thursday</MenuItem>
                          <MenuItem value={5}>Friday</MenuItem>
                          <MenuItem value={6}>Saturday</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              )}

              {watchedFrequency === 'monthly' && (
                <Grid item xs={6} md={4}>
                  <Controller
                    name="executionSchedule.dayOfMonth"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label="Day of Month"
                        type="number"
                        inputProps={{ min: 1, max: 31 }}
                      />
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={6} md={4}>
                <Controller
                  name="executionSchedule.hour"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Hour (24h format)"
                      type="number"
                      inputProps={{ min: 0, max: 23 }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPolicyDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit(handleSavePolicy)}
          >
            {editingPolicy ? 'Update' : 'Create'} Policy
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the retention policy "{policyToDelete?.name}"?
          This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Execute Confirmation Dialog */}
      <Dialog
        open={executeDialogOpen}
        onClose={() => setExecuteDialogOpen(false)}
      >
        <DialogTitle>Execute Retention Policy</DialogTitle>
        <DialogContent>
          Are you sure you want to execute the retention policy "{policyToExecute?.name}" now?
          This will permanently archive and/or delete data according to the policy rules.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecuteDialogOpen(false)}>Cancel</Button>
          <Button color="warning" variant="contained" onClick={confirmExecute}>
            Execute Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DataRetentionManager;