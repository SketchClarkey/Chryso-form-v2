import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Grid,
  Chip,
  Stack,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Avatar,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  PlayArrow as ApplyIcon,
  Add as AddIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useApi } from '../../hooks/useApi';

interface AdvancedFilter {
  id: string;
  name: string;
  description?: string;
  entityType: 'form' | 'template' | 'user' | 'worksite' | 'dashboard' | 'all';
  groups: any[];
  globalLogicalOperator: 'AND' | 'OR';
  isShared: boolean;
  tags: string[];
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  usage: {
    totalUses: number;
    lastUsed?: Date;
  };
}

interface FilterManagerProps {
  onApplyFilter: (filter: AdvancedFilter) => void;
  onEditFilter: (filter: AdvancedFilter) => void;
  onCreateNew: () => void;
  entityType?: string;
}

const FilterManager: React.FC<FilterManagerProps> = ({
  onApplyFilter,
  onEditFilter,
  onCreateNew,
  entityType,
}) => {
  const { request } = useApi();
  const [filters, setFilters] = useState<AdvancedFilter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<AdvancedFilter | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState('');

  const tabs = [
    { label: 'My Filters', value: 'my' },
    { label: 'Shared Filters', value: 'shared' },
    { label: 'All Filters', value: 'all' },
  ];

  useEffect(() => {
    loadFilters();
  }, [selectedTab, entityType]);

  const loadFilters = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityType && entityType !== 'all') {
        params.set('entityType', entityType);
      }
      if (selectedTab === 0) {
        params.set('scope', 'my');
      } else if (selectedTab === 1) {
        params.set('scope', 'shared');
      }

      // Mock data for demonstration
      const mockFilters: AdvancedFilter[] = [
        {
          id: '1',
          name: 'High Priority Forms',
          description: 'Forms marked as high or urgent priority',
          entityType: 'form',
          groups: [
            {
              id: 'g1',
              name: 'Priority Group',
              criteria: [
                { field: 'priority', operator: 'in', value: ['high', 'urgent'] }
              ],
              logicalOperator: 'AND',
              isActive: true,
            }
          ],
          globalLogicalOperator: 'AND',
          isShared: false,
          tags: ['priority', 'urgent'],
          createdBy: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-20'),
          usage: { totalUses: 45, lastUsed: new Date() },
        },
        {
          id: '2',
          name: 'Completed This Week',
          description: 'All completed forms from this week',
          entityType: 'form',
          groups: [
            {
              id: 'g2',
              name: 'Status and Date',
              criteria: [
                { field: 'status', operator: 'equals', value: 'completed' },
                { field: 'completedAt', operator: 'dateThisWeek', value: null }
              ],
              logicalOperator: 'AND',
              isActive: true,
            }
          ],
          globalLogicalOperator: 'AND',
          isShared: true,
          tags: ['completed', 'weekly'],
          createdBy: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-18'),
          usage: { totalUses: 123, lastUsed: new Date('2024-01-22') },
        },
        {
          id: '3',
          name: 'Safety Templates',
          description: 'All safety-related templates',
          entityType: 'template',
          groups: [
            {
              id: 'g3',
              name: 'Category Filter',
              criteria: [
                { field: 'category', operator: 'equals', value: 'safety' }
              ],
              logicalOperator: 'AND',
              isActive: true,
            }
          ],
          globalLogicalOperator: 'AND',
          isShared: true,
          tags: ['safety', 'templates'],
          createdBy: { firstName: 'Mike', lastName: 'Johnson', email: 'mike@example.com' },
          createdAt: new Date('2024-01-05'),
          updatedAt: new Date('2024-01-15'),
          usage: { totalUses: 67, lastUsed: new Date('2024-01-21') },
        },
      ];

      let filteredMockData = mockFilters;

      if (entityType && entityType !== 'all') {
        filteredMockData = mockFilters.filter(f => f.entityType === entityType);
      }

      if (selectedTab === 0) {
        filteredMockData = filteredMockData.filter(f => f.createdBy.email === 'john@example.com'); // Mock current user
      } else if (selectedTab === 1) {
        filteredMockData = filteredMockData.filter(f => f.isShared);
      }

      setFilters(filteredMockData);
    } catch (error) {
      console.error('Failed to load filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, filter: AdvancedFilter) => {
    setAnchorEl(event.currentTarget);
    setSelectedFilter(filter);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFilter(null);
  };

  const handleApplyFilter = (filter: AdvancedFilter) => {
    onApplyFilter(filter);
    // Update usage statistics
    updateFilterUsage(filter.id);
  };

  const handleEditFilter = () => {
    if (selectedFilter) {
      onEditFilter(selectedFilter);
    }
    handleMenuClose();
  };

  const handleDeleteFilter = async () => {
    if (!selectedFilter) return;

    try {
      await request(`/api/filters/${selectedFilter.id}`, { method: 'DELETE' });
      setFilters(filters.filter(f => f.id !== selectedFilter.id));
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete filter:', error);
    }
    handleMenuClose();
  };

  const handleDuplicateFilter = async () => {
    if (!selectedFilter || !duplicateName.trim()) return;

    try {
      const duplicated = {
        ...selectedFilter,
        id: undefined,
        name: duplicateName,
        isShared: false,
      };

      const response = await request('/api/filters', {
        method: 'POST',
        data: duplicated,
      });

      setFilters([response.data.filter, ...filters]);
      setDuplicateDialogOpen(false);
      setDuplicateName('');
    } catch (error) {
      console.error('Failed to duplicate filter:', error);
    }
    handleMenuClose();
  };

  const updateFilterUsage = async (filterId: string) => {
    try {
      await request(`/api/filters/${filterId}/usage`, { method: 'POST' });
      // Update local state
      setFilters(filters.map(f => 
        f.id === filterId 
          ? { ...f, usage: { ...f.usage, totalUses: f.usage.totalUses + 1, lastUsed: new Date() }}
          : f
      ));
    } catch (error) {
      console.error('Failed to update filter usage:', error);
    }
  };

  const getEntityTypeIcon = (entityType: string) => {
    // This could return different icons based on entity type
    return <FilterIcon />;
  };

  const getEntityTypeColor = (entityType: string) => {
    switch (entityType) {
      case 'form': return 'primary';
      case 'template': return 'secondary';
      case 'user': return 'info';
      case 'worksite': return 'success';
      case 'dashboard': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Filter Manager</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateNew}
        >
          Create New Filter
        </Button>
      </Box>

      <Tabs
        value={selectedTab}
        onChange={(_, newValue) => setSelectedTab(newValue)}
        sx={{ mb: 3 }}
      >
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab.label} />
        ))}
      </Tabs>

      {filters.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <FilterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No filters found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {selectedTab === 0 
                ? "You haven't created any filters yet"
                : "No shared filters available"}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onCreateNew}
            >
              Create Your First Filter
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filters.map((filter) => (
            <Grid item xs={12} sm={6} md={4} key={filter.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Typography variant="h6" component="h3" gutterBottom noWrap>
                      {filter.name}
                    </Typography>
                    <Box display="flex" alignItems="center">
                      {filter.isShared ? (
                        <Tooltip title="Shared filter">
                          <PublicIcon fontSize="small" color="primary" />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Private filter">
                          <PrivateIcon fontSize="small" color="action" />
                        </Tooltip>
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, filter)}
                      >
                        <MoreIcon />
                      </IconButton>
                    </Box>
                  </Box>

                  {filter.description && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {filter.description}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
                    <Chip
                      icon={getEntityTypeIcon(filter.entityType)}
                      label={filter.entityType}
                      size="small"
                      color={getEntityTypeColor(filter.entityType) as any}
                      variant="outlined"
                    />
                    <Chip
                      label={`${filter.groups.length} groups`}
                      size="small"
                      variant="outlined"
                    />
                  </Stack>

                  {filter.tags.length > 0 && (
                    <Box mb={2}>
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {filter.tags.slice(0, 3).map((tag, index) => (
                          <Chip key={index} label={tag} size="small" variant="outlined" />
                        ))}
                        {filter.tags.length > 3 && (
                          <Chip label={`+${filter.tags.length - 3}`} size="small" variant="outlined" />
                        )}
                      </Stack>
                    </Box>
                  )}

                  <Box display="flex" alignItems="center" mb={1}>
                    <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: 12 }}>
                      {filter.createdBy.firstName[0]}{filter.createdBy.lastName[0]}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      by {filter.createdBy.firstName} {filter.createdBy.lastName}
                    </Typography>
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      {filter.usage.totalUses} uses
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDistanceToNow(new Date(filter.updatedAt), { addSuffix: true })}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<ApplyIcon />}
                    onClick={() => handleApplyFilter(filter)}
                    variant="contained"
                  >
                    Apply
                  </Button>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => onEditFilter(filter)}
                  >
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedFilter && handleApplyFilter(selectedFilter)}>
          <ApplyIcon sx={{ mr: 1 }} />
          Apply Filter
        </MenuItem>
        <MenuItem onClick={handleEditFilter}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => {
          setDuplicateName(`${selectedFilter?.name} (Copy)`);
          setDuplicateDialogOpen(true);
          handleMenuClose();
        }}>
          <CopyIcon sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={() => {
          setDeleteDialogOpen(true);
          handleMenuClose();
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Filter</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{selectedFilter?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteFilter} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog
        open={duplicateDialogOpen}
        onClose={() => setDuplicateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Duplicate Filter</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Create a copy of "{selectedFilter?.name}" with a new name.
          </DialogContentText>
          <TextField
            autoFocus
            label="Filter Name"
            fullWidth
            value={duplicateName}
            onChange={(e) => setDuplicateName(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDuplicateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDuplicateFilter}
            variant="contained"
            disabled={!duplicateName.trim()}
          >
            Duplicate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FilterManager;