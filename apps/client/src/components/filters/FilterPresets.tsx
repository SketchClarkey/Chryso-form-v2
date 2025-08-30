import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Stack,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Autocomplete,
  FormControlLabel,
  Switch,
  Tooltip,
  Badge,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  FilterList as FilterIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  PlayArrow as ApplyIcon,
  Settings as SettingsIcon,
  ContentCopy as CopyIcon,
  Tune as TuneIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface QuickFilter {
  id: string;
  name: string;
  color?: string;
}

interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  category: 'common' | 'workflow' | 'status' | 'date' | 'custom';
  entityType: string;
  quickFilters: string[];
  advancedFilter?: any;
  autoApply: boolean;
  isDefault: boolean;
  isSystem: boolean;
  order: number;
  usage: {
    totalUses: number;
    lastUsed?: Date;
  };
}

interface FilterPresetsProps {
  entityType: string;
  availableQuickFilters: QuickFilter[];
  onPresetApply: (preset: FilterPreset) => void;
  onPresetCreate?: (preset: Partial<FilterPreset>) => void;
  showCreateButton?: boolean;
}

const FilterPresets: React.FC<FilterPresetsProps> = ({
  entityType,
  availableQuickFilters,
  onPresetApply,
  onPresetCreate,
  showCreateButton = true,
}) => {
  const { request } = useApi();
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<FilterPreset | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [presetData, setPresetData] = useState<Partial<FilterPreset>>({
    name: '',
    description: '',
    category: 'custom',
    entityType,
    quickFilters: [],
    autoApply: false,
    isDefault: false,
    isSystem: false,
    order: 0,
  });

  const categories = [
    { value: 'common', label: 'Common Filters', color: 'primary' },
    { value: 'workflow', label: 'Workflow', color: 'secondary' },
    { value: 'status', label: 'Status', color: 'success' },
    { value: 'date', label: 'Date Filters', color: 'info' },
    { value: 'custom', label: 'Custom', color: 'default' },
  ];

  useEffect(() => {
    loadFilterPresets();
  }, [entityType]);

  const loadFilterPresets = async () => {
    setLoading(true);
    try {
      const response = await request(`/api/filter-presets?entityType=${entityType}`);
      setPresets(response.data.presets);
    } catch (error) {
      console.error('Failed to load filter presets:', error);
      // Load default system presets
      loadDefaultPresets();
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPresets = () => {
    const defaultPresets: FilterPreset[] = [
      {
        id: 'recent_items',
        name: 'Recent Items',
        description: 'Items from the last 7 days',
        category: 'date',
        entityType,
        quickFilters: ['today', 'thisWeek'],
        autoApply: false,
        isDefault: true,
        isSystem: true,
        order: 1,
        usage: { totalUses: 245 },
      },
      {
        id: 'status_workflow',
        name: 'Status Workflow',
        description: 'Common status filters',
        category: 'status',
        entityType,
        quickFilters: entityType === 'form' ? ['draft', 'completed'] : ['active'],
        autoApply: false,
        isDefault: false,
        isSystem: true,
        order: 2,
        usage: { totalUses: 189 },
      },
    ];

    if (entityType === 'form') {
      defaultPresets.push({
        id: 'priority_workflow',
        name: 'Priority Workflow',
        description: 'Priority-based filters',
        category: 'workflow',
        entityType,
        quickFilters: ['urgent'],
        autoApply: false,
        isDefault: false,
        isSystem: true,
        order: 3,
        usage: { totalUses: 156 },
      });
    }

    setPresets(defaultPresets);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, preset: FilterPreset) => {
    setAnchorEl(event.currentTarget);
    setSelectedPreset(preset);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPreset(null);
  };

  const handleApplyPreset = (preset: FilterPreset) => {
    onPresetApply(preset);
    updateUsage(preset.id);
  };

  const handleCreatePreset = async () => {
    try {
      const response = await request('/api/filter-presets', {
        method: 'POST',
        data: presetData,
      });

      setPresets([...presets, response.data.preset]);
      setCreateDialogOpen(false);
      resetPresetData();
    } catch (error) {
      console.error('Failed to create preset:', error);
    }
  };

  const handleEditPreset = () => {
    if (selectedPreset) {
      setPresetData(selectedPreset);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleUpdatePreset = async () => {
    if (!selectedPreset) return;

    try {
      const response = await request(`/api/filter-presets/${selectedPreset.id}`, {
        method: 'PUT',
        data: presetData,
      });

      setPresets(presets.map(p => (p.id === selectedPreset.id ? response.data.preset : p)));
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update preset:', error);
    }
  };

  const handleDeletePreset = async () => {
    if (!selectedPreset || selectedPreset.isSystem) return;

    try {
      await request(`/api/filter-presets/${selectedPreset.id}`, { method: 'DELETE' });
      setPresets(presets.filter(p => p.id !== selectedPreset.id));
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete preset:', error);
    }
    handleMenuClose();
  };

  const handleDuplicatePreset = async () => {
    if (!selectedPreset) return;

    const duplicatedPreset = {
      ...selectedPreset,
      id: undefined,
      name: `${selectedPreset.name} (Copy)`,
      isSystem: false,
      isDefault: false,
    };

    try {
      const response = await request('/api/filter-presets', {
        method: 'POST',
        data: duplicatedPreset,
      });

      setPresets([...presets, response.data.preset]);
    } catch (error) {
      console.error('Failed to duplicate preset:', error);
    }
    handleMenuClose();
  };

  const updateUsage = async (presetId: string) => {
    try {
      await request(`/api/filter-presets/${presetId}/usage`, { method: 'POST' });

      setPresets(
        presets.map(p =>
          p.id === presetId
            ? {
                ...p,
                usage: { ...p.usage, totalUses: p.usage.totalUses + 1, lastUsed: new Date() },
              }
            : p
        )
      );
    } catch (error) {
      console.error('Failed to update usage:', error);
    }
  };

  const resetPresetData = () => {
    setPresetData({
      name: '',
      description: '',
      category: 'custom',
      entityType,
      quickFilters: [],
      autoApply: false,
      isDefault: false,
      isSystem: false,
      order: 0,
    });
  };

  const getCategoryColor = (category: string) => {
    const categoryInfo = categories.find(c => c.value === category);
    return categoryInfo?.color || 'default';
  };

  const getQuickFilterNames = (filterIds: string[]) => {
    return filterIds
      .map(id => availableQuickFilters.find(f => f.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const groupedPresets = presets.reduce(
    (groups, preset) => {
      const category = preset.category;
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(preset);
      return groups;
    },
    {} as Record<string, FilterPreset[]>
  );

  return (
    <Box>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
        <Typography variant='h6'>Filter Presets</Typography>
        {showCreateButton && (
          <Button
            size='small'
            onClick={() => setCreateDialogOpen(true)}
            startIcon={<AddIcon />}
            variant='outlined'
          >
            Create Preset
          </Button>
        )}
      </Box>

      {Object.entries(groupedPresets).map(([category, categoryPresets]) => {
        const categoryInfo = categories.find(c => c.value === category);
        return (
          <Box key={category} mb={3}>
            <Typography
              variant='subtitle2'
              color='text.secondary'
              gutterBottom
              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            >
              <Chip
                label={categoryInfo?.label || category}
                size='small'
                color={getCategoryColor(category) as any}
                variant='outlined'
              />
              <Typography variant='caption'>
                {categoryPresets.length} preset{categoryPresets.length !== 1 ? 's' : ''}
              </Typography>
            </Typography>

            <Grid container spacing={2}>
              {categoryPresets
                .sort((a, b) => a.order - b.order)
                .map(preset => (
                  <Grid size={{ xs: 12 }} sm={6} md={4} key={preset.id}>
                    <Card
                      variant='outlined'
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        '&:hover': { boxShadow: 2 },
                      }}
                    >
                      {preset.isDefault && (
                        <Chip
                          label='Default'
                          size='small'
                          color='primary'
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            zIndex: 1,
                          }}
                        />
                      )}

                      <CardContent sx={{ flex: 1 }}>
                        <Box display='flex' alignItems='center' mb={1}>
                          <Typography variant='h6' component='h3' noWrap flex={1}>
                            {preset.name}
                          </Typography>
                          <IconButton size='small' onClick={e => handleMenuOpen(e, preset)}>
                            <MoreIcon />
                          </IconButton>
                        </Box>

                        {preset.description && (
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            gutterBottom
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {preset.description}
                          </Typography>
                        )}

                        <Box mb={2}>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                            gutterBottom
                            display='block'
                          >
                            Quick Filters:
                          </Typography>
                          <Typography variant='body2'>
                            {preset.quickFilters.length > 0
                              ? getQuickFilterNames(preset.quickFilters) || 'No matching filters'
                              : 'No filters selected'}
                          </Typography>
                        </Box>

                        <Stack
                          direction='row'
                          spacing={1}
                          alignItems='center'
                          flexWrap='wrap'
                          useFlexGap
                        >
                          {preset.autoApply && (
                            <Chip label='Auto Apply' size='small' color='info' variant='outlined' />
                          )}
                          {preset.isSystem && (
                            <Chip
                              label='System'
                              size='small'
                              color='secondary'
                              variant='outlined'
                            />
                          )}
                          <Typography variant='caption' color='text.secondary'>
                            {preset.usage.totalUses} uses
                          </Typography>
                        </Stack>
                      </CardContent>

                      <CardActions>
                        <Button
                          size='small'
                          onClick={() => handleApplyPreset(preset)}
                          startIcon={<ApplyIcon />}
                          variant='contained'
                          fullWidth
                        >
                          Apply Preset
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
            </Grid>
          </Box>
        );
      })}

      {presets.length === 0 && (
        <Card variant='outlined'>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <FilterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant='h6' gutterBottom>
              No Filter Presets
            </Typography>
            <Typography variant='body2' color='text.secondary' mb={3}>
              Create preset combinations of quick filters for easy access
            </Typography>
            <Button
              variant='contained'
              onClick={() => setCreateDialogOpen(true)}
              startIcon={<AddIcon />}
            >
              Create Your First Preset
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedPreset && handleApplyPreset(selectedPreset)}>
          <ApplyIcon sx={{ mr: 1 }} />
          Apply Preset
        </MenuItem>
        {selectedPreset && !selectedPreset.isSystem && (
          <MenuItem onClick={handleEditPreset}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        <MenuItem onClick={handleDuplicatePreset}>
          <CopyIcon sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <Divider />
        {selectedPreset && !selectedPreset.isSystem && (
          <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Create Preset Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Create Filter Preset</DialogTitle>
        <DialogContent>
          <Box display='flex' flexDirection='column' gap={2} mt={1}>
            <TextField
              label='Preset Name'
              value={presetData.name}
              onChange={e => setPresetData({ ...presetData, name: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label='Description'
              value={presetData.description}
              onChange={e => setPresetData({ ...presetData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={presetData.category}
                onChange={e => setPresetData({ ...presetData, category: e.target.value as any })}
                label='Category'
              >
                {categories.map(category => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Autocomplete
              multiple
              options={availableQuickFilters}
              getOptionLabel={option => option.name}
              value={availableQuickFilters.filter(f => presetData.quickFilters?.includes(f.id))}
              onChange={(_, value) =>
                setPresetData({
                  ...presetData,
                  quickFilters: value.map(f => f.id),
                })
              }
              renderInput={params => (
                <TextField {...params} label='Quick Filters' placeholder='Select filters...' />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant='outlined'
                    label={option.name}
                    {...getTagProps({ index })}
                    key={option.id}
                  />
                ))
              }
            />

            <Stack direction='row' spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={presetData.autoApply || false}
                    onChange={e => setPresetData({ ...presetData, autoApply: e.target.checked })}
                  />
                }
                label='Auto Apply'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={presetData.isDefault || false}
                    onChange={e => setPresetData({ ...presetData, isDefault: e.target.checked })}
                  />
                }
                label='Set as Default'
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreatePreset} variant='contained'>
            Create Preset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Preset Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Edit Filter Preset</DialogTitle>
        <DialogContent>
          <Box display='flex' flexDirection='column' gap={2} mt={1}>
            <TextField
              label='Preset Name'
              value={presetData.name}
              onChange={e => setPresetData({ ...presetData, name: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label='Description'
              value={presetData.description}
              onChange={e => setPresetData({ ...presetData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Autocomplete
              multiple
              options={availableQuickFilters}
              getOptionLabel={option => option.name}
              value={availableQuickFilters.filter(f => presetData.quickFilters?.includes(f.id))}
              onChange={(_, value) =>
                setPresetData({
                  ...presetData,
                  quickFilters: value.map(f => f.id),
                })
              }
              renderInput={params => (
                <TextField {...params} label='Quick Filters' placeholder='Select filters...' />
              )}
            />

            <Stack direction='row' spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={presetData.autoApply || false}
                    onChange={e => setPresetData({ ...presetData, autoApply: e.target.checked })}
                  />
                }
                label='Auto Apply'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={presetData.isDefault || false}
                    onChange={e => setPresetData({ ...presetData, isDefault: e.target.checked })}
                  />
                }
                label='Set as Default'
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdatePreset} variant='contained'>
            Update Preset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Preset</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedPreset?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeletePreset} color='error' variant='contained'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FilterPresets;
