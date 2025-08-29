import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Stack,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Share as ShareIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface QuickFilter {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  filterCriteria: {
    field: string;
    operator: string;
    value: any;
    dataType: string;
  };
  icon?: string;
  color?: string;
  isSystem: boolean;
  isActive?: boolean;
  usage: {
    totalUses: number;
    lastUsed?: Date;
  };
}

interface QuickFiltersProps {
  entityType: string;
  onFiltersChange: (activeFilters: QuickFilter[]) => void;
  showCreateButton?: boolean;
  maxVisible?: number;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({
  entityType,
  onFiltersChange,
  showCreateButton = true,
  maxVisible = 8,
}) => {
  const { request } = useApi();
  const [filters, setFilters] = useState<QuickFilter[]>([]);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedFilter, setSelectedFilter] = useState<QuickFilter | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newFilter, setNewFilter] = useState<Partial<QuickFilter>>({
    name: '',
    description: '',
    entityType,
    filterCriteria: {
      field: '',
      operator: 'equals',
      value: '',
      dataType: 'string',
    },
    color: 'primary',
    isSystem: false,
  });

  useEffect(() => {
    loadQuickFilters();
  }, [entityType]);

  useEffect(() => {
    const active = filters.filter(f => activeFilters.has(f.id));
    onFiltersChange(active);
  }, [activeFilters, filters]);

  const loadQuickFilters = async () => {
    setLoading(true);
    try {
      const response = await request(`/api/quick-filters?entityType=${entityType}`);
      setFilters(response.data.filters);
    } catch (error) {
      console.error('Failed to load quick filters:', error);
      // Load default system filters
      loadSystemFilters();
    } finally {
      setLoading(false);
    }
  };

  const loadSystemFilters = () => {
    const systemFilters: QuickFilter[] = [
      {
        id: 'today',
        name: 'Today',
        description: 'Items created today',
        entityType: 'all',
        filterCriteria: {
          field: 'createdAt',
          operator: 'dateToday',
          value: null,
          dataType: 'date',
        },
        color: 'primary',
        isSystem: true,
        usage: { totalUses: 0 },
      },
      {
        id: 'thisWeek',
        name: 'This Week',
        description: 'Items created this week',
        entityType: 'all',
        filterCriteria: {
          field: 'createdAt',
          operator: 'dateThisWeek',
          value: null,
          dataType: 'date',
        },
        color: 'info',
        isSystem: true,
        usage: { totalUses: 0 },
      },
    ];

    const entitySpecificFilters: { [key: string]: QuickFilter[] } = {
      form: [
        {
          id: 'draft',
          name: 'Draft',
          description: 'Draft forms',
          entityType: 'form',
          filterCriteria: {
            field: 'status',
            operator: 'equals',
            value: 'draft',
            dataType: 'string',
          },
          color: 'warning',
          isSystem: true,
          usage: { totalUses: 0 },
        },
        {
          id: 'completed',
          name: 'Completed',
          description: 'Completed forms',
          entityType: 'form',
          filterCriteria: {
            field: 'status',
            operator: 'equals',
            value: 'completed',
            dataType: 'string',
          },
          color: 'success',
          isSystem: true,
          usage: { totalUses: 0 },
        },
        {
          id: 'urgent',
          name: 'Urgent',
          description: 'High priority forms',
          entityType: 'form',
          filterCriteria: {
            field: 'priority',
            operator: 'in',
            value: ['high', 'urgent'],
            dataType: 'string',
          },
          color: 'error',
          isSystem: true,
          usage: { totalUses: 0 },
        },
      ],
      template: [
        {
          id: 'active_templates',
          name: 'Active',
          description: 'Active templates',
          entityType: 'template',
          filterCriteria: {
            field: 'isActive',
            operator: 'isTrue',
            value: true,
            dataType: 'boolean',
          },
          color: 'success',
          isSystem: true,
          usage: { totalUses: 0 },
        },
        {
          id: 'safety_templates',
          name: 'Safety',
          description: 'Safety templates',
          entityType: 'template',
          filterCriteria: {
            field: 'category',
            operator: 'equals',
            value: 'safety',
            dataType: 'string',
          },
          color: 'warning',
          isSystem: true,
          usage: { totalUses: 0 },
        },
      ],
    };

    const commonFilters = systemFilters.filter(
      f => f.entityType === 'all' || f.entityType === entityType
    );
    const specificFilters = entitySpecificFilters[entityType] || [];
    setFilters([...commonFilters, ...specificFilters]);
  };

  const handleFilterToggle = (filterId: string) => {
    const newActiveFilters = new Set(activeFilters);
    if (newActiveFilters.has(filterId)) {
      newActiveFilters.delete(filterId);
    } else {
      newActiveFilters.add(filterId);
    }
    setActiveFilters(newActiveFilters);

    // Track usage
    trackFilterUsage(filterId);
  };

  const trackFilterUsage = async (filterId: string) => {
    try {
      await request(`/api/quick-filters/${filterId}/usage`, { method: 'POST' });
      // Update local usage count
      setFilters(prev =>
        prev.map(f =>
          f.id === filterId
            ? {
                ...f,
                usage: { ...f.usage, totalUses: f.usage.totalUses + 1, lastUsed: new Date() },
              }
            : f
        )
      );
    } catch (error) {
      console.error('Failed to track filter usage:', error);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, filter: QuickFilter) => {
    setAnchorEl(event.currentTarget);
    setSelectedFilter(filter);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedFilter(null);
  };

  const handleCreateFilter = async () => {
    try {
      const response = await request('/api/quick-filters', {
        method: 'POST',
        data: newFilter,
      });

      setFilters([...filters, response.data.filter]);
      setCreateDialogOpen(false);
      setNewFilter({
        name: '',
        description: '',
        entityType,
        filterCriteria: {
          field: '',
          operator: 'equals',
          value: '',
          dataType: 'string',
        },
        color: 'primary',
        isSystem: false,
      });
    } catch (error) {
      console.error('Failed to create quick filter:', error);
    }
  };

  const handleEditFilter = () => {
    if (selectedFilter) {
      setNewFilter(selectedFilter);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleUpdateFilter = async () => {
    if (!selectedFilter) return;

    try {
      const response = await request(`/api/quick-filters/${selectedFilter.id}`, {
        method: 'PUT',
        data: newFilter,
      });

      setFilters(filters.map(f => (f.id === selectedFilter.id ? response.data.filter : f)));
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update quick filter:', error);
    }
  };

  const handleDeleteFilter = async () => {
    if (!selectedFilter || selectedFilter.isSystem) return;

    try {
      await request(`/api/quick-filters/${selectedFilter.id}`, { method: 'DELETE' });
      setFilters(filters.filter(f => f.id !== selectedFilter.id));
      setActiveFilters(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedFilter.id);
        return newSet;
      });
    } catch (error) {
      console.error('Failed to delete quick filter:', error);
    }
    handleMenuClose();
  };

  const clearAllFilters = () => {
    setActiveFilters(new Set());
  };

  const visibleFilters = filters.slice(0, maxVisible);
  const hiddenFilters = filters.slice(maxVisible);
  const hasActiveFilters = activeFilters.size > 0;

  const getChipColor = (color?: string) => {
    switch (color) {
      case 'primary':
        return 'primary';
      case 'secondary':
        return 'secondary';
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
        <Typography variant='subtitle2' color='text.secondary'>
          Quick Filters
        </Typography>
        <Box display='flex' gap={1}>
          {hasActiveFilters && (
            <Button
              size='small'
              onClick={clearAllFilters}
              startIcon={<ClearIcon />}
              color='secondary'
            >
              Clear All
            </Button>
          )}
          {showCreateButton && (
            <Button size='small' onClick={() => setCreateDialogOpen(true)} startIcon={<AddIcon />}>
              Create Filter
            </Button>
          )}
        </Box>
      </Box>

      <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
        {visibleFilters.map(filter => (
          <Tooltip key={filter.id} title={filter.description || filter.name}>
            <Box position='relative'>
              <Chip
                label={filter.name}
                clickable
                color={getChipColor(filter.color) as any}
                variant={activeFilters.has(filter.id) ? 'filled' : 'outlined'}
                onClick={() => handleFilterToggle(filter.id)}
                onDelete={!filter.isSystem ? undefined : undefined}
                deleteIcon={
                  !filter.isSystem ? (
                    <IconButton
                      size='small'
                      onClick={e => {
                        e.stopPropagation();
                        handleMenuOpen(e, filter);
                      }}
                    >
                      <MoreIcon fontSize='small' />
                    </IconButton>
                  ) : undefined
                }
                sx={{
                  '& .MuiChip-deleteIcon': {
                    display: 'none',
                  },
                  '&:hover .MuiChip-deleteIcon': {
                    display: !filter.isSystem ? 'flex' : 'none',
                  },
                }}
              />
              {filter.usage.totalUses > 0 && (
                <Typography
                  variant='caption'
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.625rem',
                  }}
                >
                  {filter.usage.totalUses > 99 ? '99+' : filter.usage.totalUses}
                </Typography>
              )}
            </Box>
          </Tooltip>
        ))}

        {hiddenFilters.length > 0 && (
          <Chip
            label={`+${hiddenFilters.length} more`}
            variant='outlined'
            onClick={e => handleMenuOpen(e, hiddenFilters[0])}
          />
        )}
      </Stack>

      {hasActiveFilters && (
        <Box mt={2}>
          <Typography variant='caption' color='text.secondary' gutterBottom display='block'>
            Active Filters ({activeFilters.size}):
          </Typography>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            {Array.from(activeFilters).map(filterId => {
              const filter = filters.find(f => f.id === filterId);
              return filter ? (
                <Chip
                  key={filterId}
                  label={filter.name}
                  size='small'
                  color={getChipColor(filter.color) as any}
                  onDelete={() => handleFilterToggle(filterId)}
                />
              ) : null;
            })}
          </Stack>
        </Box>
      )}

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        {selectedFilter && !selectedFilter.isSystem && (
          <MenuItem onClick={handleEditFilter}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Filter
          </MenuItem>
        )}
        <MenuItem onClick={() => console.log('Share filter')}>
          <ShareIcon sx={{ mr: 1 }} />
          Share Filter
        </MenuItem>
        <Divider />
        {selectedFilter && !selectedFilter.isSystem && (
          <MenuItem onClick={handleDeleteFilter} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete Filter
          </MenuItem>
        )}
      </Menu>

      {/* Create Filter Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Create Quick Filter</DialogTitle>
        <DialogContent>
          <Box display='flex' flexDirection='column' gap={2} mt={1}>
            <TextField
              label='Filter Name'
              value={newFilter.name}
              onChange={e => setNewFilter({ ...newFilter, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='Description'
              value={newFilter.description}
              onChange={e => setNewFilter({ ...newFilter, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Field</InputLabel>
              <Select
                value={newFilter.filterCriteria?.field || ''}
                onChange={e =>
                  setNewFilter({
                    ...newFilter,
                    filterCriteria: { ...newFilter.filterCriteria!, field: e.target.value },
                  })
                }
                label='Field'
              >
                <MenuItem value='status'>Status</MenuItem>
                <MenuItem value='priority'>Priority</MenuItem>
                <MenuItem value='createdAt'>Created Date</MenuItem>
                <MenuItem value='updatedAt'>Updated Date</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Color</InputLabel>
              <Select
                value={newFilter.color}
                onChange={e => setNewFilter({ ...newFilter, color: e.target.value })}
                label='Color'
              >
                <MenuItem value='primary'>Primary</MenuItem>
                <MenuItem value='secondary'>Secondary</MenuItem>
                <MenuItem value='success'>Success</MenuItem>
                <MenuItem value='warning'>Warning</MenuItem>
                <MenuItem value='error'>Error</MenuItem>
                <MenuItem value='info'>Info</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateFilter} variant='contained'>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Filter Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Edit Quick Filter</DialogTitle>
        <DialogContent>
          <Box display='flex' flexDirection='column' gap={2} mt={1}>
            <TextField
              label='Filter Name'
              value={newFilter.name}
              onChange={e => setNewFilter({ ...newFilter, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='Description'
              value={newFilter.description}
              onChange={e => setNewFilter({ ...newFilter, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Color</InputLabel>
              <Select
                value={newFilter.color}
                onChange={e => setNewFilter({ ...newFilter, color: e.target.value })}
                label='Color'
              >
                <MenuItem value='primary'>Primary</MenuItem>
                <MenuItem value='secondary'>Secondary</MenuItem>
                <MenuItem value='success'>Success</MenuItem>
                <MenuItem value='warning'>Warning</MenuItem>
                <MenuItem value='error'>Error</MenuItem>
                <MenuItem value='info'>Info</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateFilter} variant='contained'>
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuickFilters;
