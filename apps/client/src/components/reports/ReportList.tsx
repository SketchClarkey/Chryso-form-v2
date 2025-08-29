import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Pagination,
  Avatar,
  Tooltip,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileCopy as CloneIcon,
  Visibility as ViewIcon,
  GetApp as ExportIcon,
  Schedule as ScheduleIcon,
  Assessment as ReportIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { formatDistanceToNow } from 'date-fns';
import ExportDialog from './ExportDialog';

interface Report {
  _id: string;
  name: string;
  description?: string;
  category: 'operational' | 'analytical' | 'compliance' | 'financial' | 'custom';
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  lastModifiedBy?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  usage: {
    totalViews: number;
    totalExports: number;
    lastViewed?: string;
    lastExported?: string;
  };
  schedule?: {
    enabled: boolean;
    frequency: string;
    nextRun?: string;
  };
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface ReportListProps {
  onCreateNew?: () => void;
}

const getCategoryColor = (category: string) => {
  const colors = {
    operational: 'primary',
    analytical: 'secondary',
    compliance: 'warning',
    financial: 'success',
    custom: 'default',
  } as const;
  return colors[category as keyof typeof colors] || 'default';
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'analytical':
      return <TrendingUpIcon />;
    case 'compliance':
    case 'financial':
      return <ReportIcon />;
    default:
      return <ReportIcon />;
  }
};

const ReportCard: React.FC<{
  report: Report;
  onView: () => void;
  onEdit: () => void;
  onClone: () => void;
  onDelete: () => void;
  onExport: () => void;
}> = ({ report, onView, onEdit, onClone, onDelete, onExport }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box display='flex' justifyContent='space-between' alignItems='flex-start' mb={1}>
          <Box display='flex' alignItems='center' gap={1}>
            {getCategoryIcon(report.category)}
            <Typography variant='h6' component='h2' noWrap>
              {report.name}
            </Typography>
          </Box>
          <IconButton size='small' onClick={handleMenuClick}>
            <MoreVertIcon />
          </IconButton>
        </Box>

        <Box display='flex' gap={1} mb={2}>
          <Chip label={report.category} color={getCategoryColor(report.category)} size='small' />
          <Chip
            label={report.status}
            color={report.status === 'published' ? 'success' : 'default'}
            size='small'
            variant='outlined'
          />
          {report.schedule?.enabled && (
            <Tooltip title='Scheduled Report'>
              <Chip
                icon={<ScheduleIcon />}
                label={report.schedule.frequency}
                size='small'
                color='info'
                variant='outlined'
              />
            </Tooltip>
          )}
        </Box>

        {report.description && (
          <Typography
            variant='body2'
            color='text.secondary'
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 2,
            }}
          >
            {report.description}
          </Typography>
        )}

        {report.tags.length > 0 && (
          <Box display='flex' gap={0.5} flexWrap='wrap' mb={2}>
            {report.tags.slice(0, 3).map(tag => (
              <Chip key={tag} label={tag} size='small' variant='outlined' />
            ))}
            {report.tags.length > 3 && (
              <Chip label={`+${report.tags.length - 3}`} size='small' variant='outlined' />
            )}
          </Box>
        )}

        <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
          <Typography variant='caption' color='text.secondary'>
            Created by {report.createdBy.firstName} {report.createdBy.lastName}
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            v{report.version}
          </Typography>
        </Box>

        <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
          <Typography variant='caption' color='text.secondary'>
            {report.usage.totalViews} views • {report.usage.totalExports} exports
          </Typography>
          <Typography variant='caption' color='text.secondary'>
            {formatDistanceToNow(new Date(report.updatedAt), { addSuffix: true })}
          </Typography>
        </Box>
      </CardContent>

      <CardActions>
        <Button size='small' onClick={onView} startIcon={<ViewIcon />}>
          View
        </Button>
        <Button size='small' onClick={onEdit} startIcon={<EditIcon />}>
          Edit
        </Button>
      </CardActions>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem
          onClick={() => {
            onClone();
            handleMenuClose();
          }}
        >
          <CloneIcon sx={{ mr: 1 }} fontSize='small' />
          Clone
        </MenuItem>
        <MenuItem
          onClick={() => {
            onExport();
            handleMenuClose();
          }}
        >
          <ExportIcon sx={{ mr: 1 }} fontSize='small' />
          Export
        </MenuItem>
        <MenuItem
          onClick={() => {
            onDelete();
            handleMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize='small' />
          Delete
        </MenuItem>
      </Menu>
    </Card>
  );
};

const ReportList: React.FC<ReportListProps> = ({ onCreateNew }) => {
  const { request } = useApi();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Dialogs
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; report?: Report }>({
    open: false,
  });
  const [cloneDialog, setCloneDialog] = useState<{ open: boolean; report?: Report; name: string }>({
    open: false,
    name: '',
  });
  const [exportDialog, setExportDialog] = useState<{ open: boolean; report?: Report }>({
    open: false,
  });

  useEffect(() => {
    loadReports();
  }, [currentPage, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        ...(searchTerm && { search: searchTerm }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(statusFilter && { status: statusFilter }),
        sortBy,
        sortOrder,
      });

      const response = await request(`/api/reports?${params}`);
      setReports(response.data.reports);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (report: Report) => {
    navigate(`/reports/${report._id}/view`);
  };

  const handleEdit = (report: Report) => {
    navigate(`/reports/${report._id}/edit`);
  };

  const handleClone = (report: Report) => {
    setCloneDialog({
      open: true,
      report,
      name: `${report.name} (Copy)`,
    });
  };

  const handleCloneConfirm = async () => {
    if (!cloneDialog.report) return;

    try {
      await request(`/api/reports/${cloneDialog.report._id}/clone`, {
        method: 'POST',
        data: { name: cloneDialog.name },
      });
      loadReports();
      setCloneDialog({ open: false, name: '' });
    } catch (error) {
      console.error('Failed to clone report:', error);
    }
  };

  const handleDelete = (report: Report) => {
    setDeleteDialog({ open: true, report });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.report) return;

    try {
      await request(`/api/reports/${deleteDialog.report._id}`, { method: 'DELETE' });
      loadReports();
      setDeleteDialog({ open: false });
    } catch (error) {
      console.error('Failed to delete report:', error);
    }
  };

  const handleExport = (report: Report) => {
    setExportDialog({ open: true, report });
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      navigate('/reports/new');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h4'>Reports</Typography>
        <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreateNew}>
          New Report
        </Button>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label='Search reports'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </Grid>
        <Grid item xs={6} md={2}>
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <MenuItem value=''>All</MenuItem>
              <MenuItem value='operational'>Operational</MenuItem>
              <MenuItem value='analytical'>Analytical</MenuItem>
              <MenuItem value='compliance'>Compliance</MenuItem>
              <MenuItem value='financial'>Financial</MenuItem>
              <MenuItem value='custom'>Custom</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={2}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <MenuItem value=''>All</MenuItem>
              <MenuItem value='draft'>Draft</MenuItem>
              <MenuItem value='published'>Published</MenuItem>
              <MenuItem value='archived'>Archived</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={2}>
          <FormControl fullWidth>
            <InputLabel>Sort By</InputLabel>
            <Select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <MenuItem value='updatedAt'>Last Updated</MenuItem>
              <MenuItem value='createdAt'>Created Date</MenuItem>
              <MenuItem value='name'>Name</MenuItem>
              <MenuItem value='usage.totalViews'>Views</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6} md={2}>
          <FormControl fullWidth>
            <InputLabel>Order</InputLabel>
            <Select value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
              <MenuItem value='desc'>Descending</MenuItem>
              <MenuItem value='asc'>Ascending</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Reports Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: 8 }, (_, index) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={index}>
              <Card sx={{ height: 280 }}>
                <CardContent>
                  <Box display='flex' justifyContent='center' alignItems='center' height='100%'>
                    <Typography>Loading...</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : reports.length === 0 ? (
        <Box
          display='flex'
          flexDirection='column'
          alignItems='center'
          justifyContent='center'
          py={8}
        >
          <ReportIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant='h6' color='text.secondary' gutterBottom>
            No reports found
          </Typography>
          <Typography variant='body2' color='text.secondary' mb={3}>
            Get started by creating your first report
          </Typography>
          <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreateNew}>
            Create Report
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {reports.map(report => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={report._id}>
              <ReportCard
                report={report}
                onView={() => handleView(report)}
                onEdit={() => handleEdit(report)}
                onClone={() => handleClone(report)}
                onDelete={() => handleDelete(report)}
                onExport={() => handleExport(report)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display='flex' justifyContent='center' mt={4}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={(_, page) => setCurrentPage(page)}
            color='primary'
          />
        </Box>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false })}>
        <DialogTitle>Delete Report</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{deleteDialog.report?.name}"? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false })}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color='error' variant='contained'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={cloneDialog.open} onClose={() => setCloneDialog({ open: false, name: '' })}>
        <DialogTitle>Clone Report</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>Enter a name for the cloned report:</DialogContentText>
          <TextField
            fullWidth
            label='Report Name'
            value={cloneDialog.name}
            onChange={e => setCloneDialog({ ...cloneDialog, name: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloneDialog({ open: false, name: '' })}>Cancel</Button>
          <Button
            onClick={handleCloneConfirm}
            variant='contained'
            disabled={!cloneDialog.name.trim()}
          >
            Clone
          </Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      {exportDialog.report && (
        <ExportDialog
          open={exportDialog.open}
          onClose={() => setExportDialog({ open: false })}
          reportId={exportDialog.report._id}
          reportName={exportDialog.report.name}
        />
      )}
    </Box>
  );
};

export default ReportList;
