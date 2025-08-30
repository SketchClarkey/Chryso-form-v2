import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Box,
  Typography,
  Chip,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Collapse,
  Paper,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Visibility as ViewIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useApi } from '../../hooks/useApi';

interface AuditLog {
  _id: string;
  timestamp: string;
  eventType: string;
  action: string;
  category: string;
  description: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  resourceType?: string;
  resourceId?: string;
  resourceName?: string;
  ipAddress?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'warning' | 'pending';
  duration?: number;
  details?: any;
  tags?: string[];
  correlationId?: string;
}

interface AuditLogViewerProps {
  organizationId?: string;
  height?: number | string;
  embedded?: boolean;
}

const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  organizationId,
  height = 600,
  embedded = false,
}) => {
  const { request } = useApi();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null,
    category: '',
    eventType: '',
    severity: '',
    userId: '',
    resourceType: '',
    search: '',
  });

  // Detail view
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadLogs();
  }, [page, rowsPerPage, filters, organizationId]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: (page + 1).toString(),
        limit: rowsPerPage.toString(),
      });

      // Add filters
      if (organizationId) params.append('organizationId', organizationId);
      if (filters.startDate) params.append('startDate', filters.startDate.toISOString());
      if (filters.endDate) params.append('endDate', filters.endDate.toISOString());
      if (filters.category) params.append('category', filters.category);
      if (filters.eventType) params.append('eventType', filters.eventType);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.search) params.append('search', filters.search);

      const response = await request('GET', `/api/audit/logs?${params}`);
      setLogs(response.data.logs);
      setTotal(response.data.pagination.total);
    } catch (error: any) {
      console.error('Failed to load audit logs:', error);
      setError(error.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
    setPage(0); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      category: '',
      eventType: '',
      severity: '',
      userId: '',
      resourceType: '',
      search: '',
    });
    setPage(0);
  };

  const handleExport = async () => {
    try {
      const response = await request('POST', '/api/audit/export', {
        format: 'csv',
        filters: {
          ...filters,
          startDate: filters.startDate?.toISOString(),
          endDate: filters.endDate?.toISOString(),
        },
        organizationId,
      });

      // Create download link
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
      setError('Failed to export logs');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color='error' />;
      case 'high':
        return <WarningIcon color='warning' />;
      case 'medium':
        return <SecurityIcon color='info' />;
      default:
        return <SuccessIcon color='success' />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'success';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failure':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const toggleRowExpansion = (logId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const viewLogDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setDetailOpen(true);
  };

  const filterSection = (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant='h6' gutterBottom>
        Filters
      </Typography>
      <Grid container spacing={2} alignItems='center'>
        <Grid size={{ xs: 12, md: 3 }}>
          <DateTimePicker
            label='Start Date'
            value={filters.startDate}
            onChange={date => handleFilterChange('startDate', date)}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <DateTimePicker
            label='End Date'
            value={filters.endDate}
            onChange={date => handleFilterChange('endDate', date)}
            slotProps={{ textField: { size: 'small', fullWidth: true } }}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl size='small' fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category}
              onChange={e => handleFilterChange('category', e.target.value)}
              label='Category'
            >
              <MenuItem value=''>All</MenuItem>
              <MenuItem value='authentication'>Authentication</MenuItem>
              <MenuItem value='data'>Data</MenuItem>
              <MenuItem value='user_management'>User Management</MenuItem>
              <MenuItem value='system'>System</MenuItem>
              <MenuItem value='security'>Security</MenuItem>
              <MenuItem value='compliance'>Compliance</MenuItem>
              <MenuItem value='integration'>Integration</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <FormControl size='small' fullWidth>
            <InputLabel>Severity</InputLabel>
            <Select
              value={filters.severity}
              onChange={e => handleFilterChange('severity', e.target.value)}
              label='Severity'
            >
              <MenuItem value=''>All</MenuItem>
              <MenuItem value='low'>Low</MenuItem>
              <MenuItem value='medium'>Medium</MenuItem>
              <MenuItem value='high'>High</MenuItem>
              <MenuItem value='critical'>Critical</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, md: 2 }}>
          <Box display='flex' gap={1}>
            <Tooltip title='Refresh'>
              <IconButton onClick={loadLogs} size='small'>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title='Export'>
              <IconButton onClick={handleExport} size='small'>
                <ExportIcon />
              </IconButton>
            </Tooltip>
            <Button onClick={clearFilters} size='small'>
              Clear
            </Button>
          </Box>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            size='small'
            fullWidth
            placeholder='Search logs...'
            value={filters.search}
            onChange={e => handleFilterChange('search', e.target.value)}
          />
        </Grid>
      </Grid>
    </Paper>
  );

  const content = (
    <>
      {!embedded && filterSection}

      {error && (
        <Alert severity='error' sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer
        component={Paper}
        sx={{ height: embedded ? height : 'auto', maxHeight: height }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell width={50}></TableCell>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Severity</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.map(log => (
              <React.Fragment key={log._id}>
                <TableRow hover>
                  <TableCell>
                    <IconButton size='small' onClick={() => toggleRowExpansion(log._id)}>
                      {expandedRows.has(log._id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>
                    <Typography variant='body2'>
                      {new Date(log.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant='body2' fontWeight='bold'>
                        {log.userName || 'System'}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {log.userEmail}
                      </Typography>
                      {log.userRole && (
                        <Chip label={log.userRole} size='small' variant='outlined' sx={{ ml: 1 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant='body2' fontWeight='bold'>
                        {log.action}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {log.category}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {log.resourceType && (
                      <Box>
                        <Typography variant='body2'>
                          {log.resourceName || log.resourceId || log.resourceType}
                        </Typography>
                        <Typography variant='caption' color='text.secondary'>
                          {log.resourceType}
                        </Typography>
                      </Box>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display='flex' alignItems='center' gap={1}>
                      {getSeverityIcon(log.severity)}
                      <Chip
                        label={log.severity}
                        size='small'
                        color={getSeverityColor(log.severity) as any}
                        variant='outlined'
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      size='small'
                      color={getStatusColor(log.status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    {log.duration && <Typography variant='body2'>{log.duration}ms</Typography>}
                  </TableCell>
                  <TableCell>
                    <Tooltip title='View Details'>
                      <IconButton size='small' onClick={() => viewLogDetail(log)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>

                {/* Expanded row */}
                <TableRow>
                  <TableCell colSpan={9} sx={{ p: 0 }}>
                    <Collapse in={expandedRows.has(log._id)} timeout='auto' unmountOnExit>
                      <Box sx={{ p: 2, bgcolor: 'background.default' }}>
                        <Typography variant='body2' gutterBottom>
                          <strong>Description:</strong> {log.description}
                        </Typography>
                        {log.ipAddress && (
                          <Typography variant='body2' gutterBottom>
                            <strong>IP Address:</strong> {log.ipAddress}
                          </Typography>
                        )}
                        {log.correlationId && (
                          <Typography variant='body2' gutterBottom>
                            <strong>Correlation ID:</strong> {log.correlationId}
                          </Typography>
                        )}
                        {log.tags && log.tags.length > 0 && (
                          <Box mt={1}>
                            <Typography variant='body2' component='span'>
                              <strong>Tags:</strong>
                            </Typography>
                            {log.tags.map(tag => (
                              <Chip
                                key={tag}
                                label={tag}
                                size='small'
                                variant='outlined'
                                sx={{ ml: 0.5, mt: 0.5 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {!embedded && (
        <TablePagination
          component='div'
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={e => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
        />
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth='md' fullWidth>
        <DialogTitle>Audit Log Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant='subtitle2'>Timestamp</Typography>
                  <Typography variant='body2'>
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant='subtitle2'>Event Type</Typography>
                  <Typography variant='body2'>{selectedLog.eventType}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant='subtitle2'>Action</Typography>
                  <Typography variant='body2'>{selectedLog.action}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant='subtitle2'>Category</Typography>
                  <Typography variant='body2'>{selectedLog.category}</Typography>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Typography variant='subtitle2'>Description</Typography>
                  <Typography variant='body2'>{selectedLog.description}</Typography>
                </Grid>
                {selectedLog.details && (
                  <Grid size={{ xs: 12 }}>
                    <Typography variant='subtitle2'>Details</Typography>
                    <Paper sx={{ p: 1, bgcolor: 'background.default' }}>
                      <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <Card>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
          <Typography variant='h5'>Audit Logs</Typography>
          <Box display='flex' gap={1}>
            <Button
              variant='outlined'
              startIcon={<RefreshIcon />}
              onClick={loadLogs}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button variant='outlined' startIcon={<ExportIcon />} onClick={handleExport}>
              Export
            </Button>
          </Box>
        </Box>
        {content}
      </CardContent>
    </Card>
  );
};

export default AuditLogViewer;
