import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Fab,
  Chip,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  Avatar,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as DuplicateIcon,
  Share as ShareIcon,
  MoreVert as MoreIcon,
  Dashboard as DashboardIcon,
  Visibility as ViewIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { formatDistanceToNow } from 'date-fns';

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category: 'personal' | 'team' | 'organization' | 'public';
  tags: string[];
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  usage: {
    totalViews: number;
    lastViewed?: Date;
  };
  updatedAt: Date;
  createdAt: Date;
  widgets: any[];
  isTemplate?: boolean;
}

const DashboardManager: React.FC = () => {
  const navigate = useNavigate();
  const { request } = useApi();

  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [duplicateName, setDuplicateName] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [actionDashboard, setActionDashboard] = useState<Dashboard | null>(null);

  const categories = [
    { value: 'all', label: 'All Dashboards' },
    { value: 'personal', label: 'Personal' },
    { value: 'team', label: 'Team' },
    { value: 'organization', label: 'Organization' },
    { value: 'public', label: 'Public' },
  ];

  useEffect(() => {
    loadDashboards();
  }, [selectedCategory]);

  const loadDashboards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') {
        params.set('category', selectedCategory);
      }
      if (searchQuery) {
        params.set('search', searchQuery);
      }

      const response = await request(`/api/dashboards?${params.toString()}`);
      setDashboards(response.data.dashboards);
    } catch (error) {
      console.error('Failed to load dashboards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadDashboards();
  };

  const handleCreateNew = () => {
    navigate('/dashboard-builder');
  };

  const handleEditDashboard = (dashboard: Dashboard) => {
    navigate(`/dashboard-builder/${dashboard.id}`);
  };

  const handleViewDashboard = (dashboard: Dashboard) => {
    navigate(`/dashboard/${dashboard.id}`);
  };

  const handleDeleteDashboard = async () => {
    if (!selectedDashboard) return;

    try {
      await request(`/api/dashboards/${selectedDashboard.id}`, {
        method: 'DELETE',
      });

      setDashboards(dashboards.filter(d => d.id !== selectedDashboard.id));
      setDeleteDialogOpen(false);
      setSelectedDashboard(null);
    } catch (error) {
      console.error('Failed to delete dashboard:', error);
    }
  };

  const handleDuplicateDashboard = async () => {
    if (!selectedDashboard || !duplicateName.trim()) return;

    try {
      const response = await request(`/api/dashboards/${selectedDashboard.id}/duplicate`, {
        method: 'POST',
        data: { name: duplicateName },
      });

      setDashboards([response.data.dashboard, ...dashboards]);
      setDuplicateDialogOpen(false);
      setSelectedDashboard(null);
      setDuplicateName('');
    } catch (error) {
      console.error('Failed to duplicate dashboard:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, dashboard: Dashboard) => {
    setAnchorEl(event.currentTarget);
    setActionDashboard(dashboard);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActionDashboard(null);
  };

  const openDeleteDialog = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const openDuplicateDialog = (dashboard: Dashboard) => {
    setSelectedDashboard(dashboard);
    setDuplicateName(`${dashboard.name} (Copy)`);
    setDuplicateDialogOpen(true);
    handleMenuClose();
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal':
        return 'primary';
      case 'team':
        return 'secondary';
      case 'organization':
        return 'warning';
      case 'public':
        return 'success';
      default:
        return 'default';
    }
  };

  const filteredDashboards = dashboards.filter(
    dashboard =>
      dashboard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dashboard.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dashboard.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='400px'>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display='flex' justifyContent='between' alignItems='center' mb={3}>
        <Box>
          <Typography variant='h4' gutterBottom>
            Dashboard Manager
          </Typography>
          <Typography variant='body1' color='text.secondary'>
            Create, edit, and manage your custom dashboards
          </Typography>
        </Box>
        <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreateNew} size='large'>
          Create Dashboard
        </Button>
      </Box>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems='center'>
            <Grid size={{ xs: 12 }} md={6}>
              <Tabs
                value={selectedCategory}
                onChange={(_, newValue) => setSelectedCategory(newValue)}
                variant='scrollable'
                scrollButtons='auto'
              >
                {categories.map(category => (
                  <Tab key={category.value} label={category.label} value={category.value} />
                ))}
              </Tabs>
            </Grid>
            <Grid size={{ xs: 12 }} md={6}>
              <Box display='flex' gap={1}>
                <TextField
                  placeholder='Search dashboards...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  size='small'
                  fullWidth
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                  }}
                  onKeyPress={e => e.key === 'Enter' && handleSearch()}
                />
                <Button variant='outlined' onClick={handleSearch} startIcon={<FilterIcon />}>
                  Search
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Dashboard Grid */}
      {filteredDashboards.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <DashboardIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant='h6' gutterBottom>
              No dashboards found
            </Typography>
            <Typography variant='body2' color='text.secondary' mb={3}>
              {searchQuery
                ? 'Try adjusting your search criteria'
                : 'Get started by creating your first dashboard'}
            </Typography>
            <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreateNew}>
              Create Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredDashboards.map(dashboard => (
            <Grid size={{ xs: 12 }} sm={6} md={4} key={dashboard.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box display='flex' justifyContent='space-between' alignItems='flex-start' mb={1}>
                    <Typography variant='h6' component='h2' gutterBottom noWrap>
                      {dashboard.name}
                    </Typography>
                    <IconButton size='small' onClick={e => handleMenuOpen(e, dashboard)}>
                      <MoreIcon />
                    </IconButton>
                  </Box>

                  {dashboard.description && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      sx={{
                        mb: 2,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {dashboard.description}
                    </Typography>
                  )}

                  <Stack direction='row' spacing={1} mb={2} flexWrap='wrap' useFlexGap>
                    <Chip
                      label={dashboard.category}
                      size='small'
                      color={getCategoryColor(dashboard.category) as any}
                      variant='outlined'
                    />
                    {dashboard.isTemplate && (
                      <Chip label='Template' size='small' color='info' variant='outlined' />
                    )}
                  </Stack>

                  {dashboard.tags.length > 0 && (
                    <Box mb={2}>
                      <Stack direction='row' spacing={0.5} flexWrap='wrap' useFlexGap>
                        {dashboard.tags.slice(0, 3).map((tag, index) => (
                          <Chip key={index} label={tag} size='small' variant='outlined' />
                        ))}
                        {dashboard.tags.length > 3 && (
                          <Chip
                            label={`+${dashboard.tags.length - 3}`}
                            size='small'
                            variant='outlined'
                          />
                        )}
                      </Stack>
                    </Box>
                  )}

                  <Box display='flex' alignItems='center' mb={1}>
                    <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}>
                      {dashboard.createdBy.firstName[0]}
                      {dashboard.createdBy.lastName[0]}
                    </Avatar>
                    <Typography variant='caption' color='text.secondary'>
                      by {dashboard.createdBy.firstName} {dashboard.createdBy.lastName}
                    </Typography>
                  </Box>

                  <Box display='flex' justifyContent='space-between' alignItems='center'>
                    <Typography variant='caption' color='text.secondary'>
                      {dashboard.widgets.length} widgets • {dashboard.usage.totalViews} views
                    </Typography>
                    <Typography variant='caption' color='text.secondary'>
                      {formatDistanceToNow(new Date(dashboard.updatedAt), { addSuffix: true })}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions>
                  <Button
                    size='small'
                    startIcon={<ViewIcon />}
                    onClick={() => handleViewDashboard(dashboard)}
                  >
                    View
                  </Button>
                  <Button
                    size='small'
                    startIcon={<EditIcon />}
                    onClick={() => handleEditDashboard(dashboard)}
                  >
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => actionDashboard && handleViewDashboard(actionDashboard)}>
          <ViewIcon sx={{ mr: 1 }} />
          View Dashboard
        </MenuItem>
        <MenuItem onClick={() => actionDashboard && handleEditDashboard(actionDashboard)}>
          <EditIcon sx={{ mr: 1 }} />
          Edit Dashboard
        </MenuItem>
        <MenuItem onClick={() => actionDashboard && openDuplicateDialog(actionDashboard)}>
          <DuplicateIcon sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={() => actionDashboard && openDeleteDialog(actionDashboard)}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Dashboard</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedDashboard?.name}"? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteDashboard} color='error' variant='contained'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Duplicate Dashboard</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Create a copy of "{selectedDashboard?.name}" with a new name.
          </DialogContentText>
          <TextField
            autoFocus
            label='Dashboard Name'
            fullWidth
            value={duplicateName}
            onChange={e => setDuplicateName(e.target.value)}
            margin='dense'
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDuplicateDashboard}
            variant='contained'
            disabled={!duplicateName.trim()}
          >
            Duplicate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color='primary'
        aria-label='create dashboard'
        onClick={handleCreateNew}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};

export default DashboardManager;
