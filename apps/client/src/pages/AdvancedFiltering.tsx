import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Tab,
  Tabs,
  Dialog,
  DialogContent,
  Fab,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useApi } from '../hooks/useApi';
import FilterManager from '../components/filters/FilterManager';
import AdvancedFilterBuilder from '../components/filters/AdvancedFilterBuilder';
import FilterApplicator from '../components/filters/FilterApplicator';

interface AdvancedFilter {
  id?: string;
  name: string;
  description?: string;
  entityType: 'form' | 'template' | 'user' | 'worksite' | 'dashboard' | 'all';
  groups: any[];
  globalLogicalOperator: 'AND' | 'OR';
  isShared: boolean;
  tags: string[];
}

const AdvancedFiltering: React.FC = () => {
  const { request } = useApi();
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedEntityType, setSelectedEntityType] = useState('form');
  const [availableFields, setAvailableFields] = useState<{ [key: string]: any }>({});
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingFilter, setEditingFilter] = useState<AdvancedFilter | null>(null);
  const [appliedFilter, setAppliedFilter] = useState<AdvancedFilter | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { label: 'Filter Manager', value: 'manager' },
    { label: 'Active Filters', value: 'active' },
    { label: 'Filter Builder', value: 'builder' },
  ];

  const entityTypes = [
    { value: 'form', label: 'Forms' },
    { value: 'template', label: 'Templates' },
    { value: 'user', label: 'Users' },
    { value: 'worksite', label: 'Worksites' },
    { value: 'dashboard', label: 'Dashboards' },
    { value: 'all', label: 'All Types' },
  ];

  useEffect(() => {
    loadAvailableFields();
  }, [selectedEntityType]);

  const loadAvailableFields = async () => {
    setLoading(true);
    try {
      const response = await request(`/api/filters/fields/${selectedEntityType}`);
      setAvailableFields(response.data.fields);
    } catch (err: any) {
      setError(err.message || 'Failed to load available fields');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewFilter = () => {
    setEditingFilter(null);
    setBuilderOpen(true);
    setCurrentTab(2); // Switch to builder tab
  };

  const handleEditFilter = (filter: AdvancedFilter) => {
    setEditingFilter(filter);
    setBuilderOpen(true);
    setCurrentTab(2); // Switch to builder tab
  };

  const handleApplyFilter = (filter: AdvancedFilter) => {
    setAppliedFilter(filter);
    setCurrentTab(1); // Switch to active filters tab
  };

  const handleSaveFilter = async (filter: AdvancedFilter) => {
    try {
      setLoading(true);

      if (editingFilter?.id) {
        await request(`/api/filters/${editingFilter.id}`, {
          method: 'PUT',
          data: filter,
        });
      } else {
        await request('/api/filters', {
          method: 'POST',
          data: filter,
        });
      }

      setBuilderOpen(false);
      setEditingFilter(null);
      setCurrentTab(0); // Switch back to manager
    } catch (err: any) {
      setError(err.message || 'Failed to save filter');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBuilder = () => {
    setBuilderOpen(false);
    setEditingFilter(null);
  };

  const handleClearAppliedFilter = () => {
    setAppliedFilter(null);
  };

  return (
    <Box>
      <Box mb={3}>
        <Typography variant='h4' gutterBottom>
          Advanced Filtering System
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          Create, manage, and apply complex filters across all data types
        </Typography>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Entity Type Selector */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Filter Configuration
              </Typography>
              <Box display='flex' gap={2} alignItems='center' flexWrap='wrap'>
                <Typography variant='body2' color='text.secondary'>
                  Entity Type:
                </Typography>
                {entityTypes.map(type => (
                  <Button
                    key={type.value}
                    variant={selectedEntityType === type.value ? 'contained' : 'outlined'}
                    onClick={() => setSelectedEntityType(type.value)}
                    size='small'
                  >
                    {type.label}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Tabs
                value={currentTab}
                onChange={(_, newValue) => setCurrentTab(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
              >
                {tabs.map((tab, index) => (
                  <Tab key={index} label={tab.label} />
                ))}
              </Tabs>

              {loading && (
                <Box display='flex' justifyContent='center' p={4}>
                  <CircularProgress />
                </Box>
              )}

              {/* Filter Manager Tab */}
              {currentTab === 0 && !loading && (
                <FilterManager
                  onApplyFilter={handleApplyFilter}
                  onEditFilter={handleEditFilter}
                  onCreateNew={handleCreateNewFilter}
                  entityType={selectedEntityType}
                />
              )}

              {/* Active Filters Tab */}
              {currentTab === 1 && !loading && (
                <Box>
                  {appliedFilter ? (
                    <FilterApplicator
                      filter={appliedFilter}
                      onFilterChange={setAppliedFilter}
                      onSaveFilter={handleSaveFilter}
                      onClearFilter={handleClearAppliedFilter}
                      entityType={selectedEntityType}
                      autoApply={true}
                    />
                  ) : (
                    <Card variant='outlined'>
                      <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <FilterIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant='h6' gutterBottom>
                          No Active Filters
                        </Typography>
                        <Typography variant='body2' color='text.secondary' mb={3}>
                          Select a filter from the Filter Manager to apply it and see results
                        </Typography>
                        <Button
                          variant='contained'
                          onClick={() => setCurrentTab(0)}
                          startIcon={<FilterIcon />}
                        >
                          Browse Filters
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              )}

              {/* Filter Builder Tab */}
              {currentTab === 2 && !loading && (
                <Box>
                  {builderOpen || editingFilter ? (
                    <AdvancedFilterBuilder
                      filter={editingFilter || undefined}
                      onSave={handleSaveFilter}
                      onCancel={handleCancelBuilder}
                      entityType={selectedEntityType}
                      availableFields={availableFields}
                    />
                  ) : (
                    <Card variant='outlined'>
                      <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <SettingsIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                        <Typography variant='h6' gutterBottom>
                          Filter Builder
                        </Typography>
                        <Typography variant='body2' color='text.secondary' mb={3}>
                          Create complex filters with multiple criteria and logical operators
                        </Typography>
                        <Button
                          variant='contained'
                          onClick={handleCreateNewFilter}
                          startIcon={<AddIcon />}
                        >
                          Create New Filter
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Statistics Card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Filter Statistics
              </Typography>
              <Box display='flex' flexDirection='column' gap={2}>
                <Box display='flex' justifyContent='space-between'>
                  <Typography variant='body2'>Available Fields:</Typography>
                  <Typography variant='body2' fontWeight='bold'>
                    {Object.keys(availableFields).length}
                  </Typography>
                </Box>
                <Box display='flex' justifyContent='space-between'>
                  <Typography variant='body2'>Active Filters:</Typography>
                  <Typography variant='body2' fontWeight='bold'>
                    {appliedFilter ? 1 : 0}
                  </Typography>
                </Box>
                <Box display='flex' justifyContent='space-between'>
                  <Typography variant='body2'>Entity Type:</Typography>
                  <Typography
                    variant='body2'
                    fontWeight='bold'
                    sx={{ textTransform: 'capitalize' }}
                  >
                    {selectedEntityType}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions Card */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Quick Actions
              </Typography>
              <Box display='flex' gap={2} flexWrap='wrap'>
                <Button variant='outlined' startIcon={<AddIcon />} onClick={handleCreateNewFilter}>
                  New Filter
                </Button>
                <Button
                  variant='outlined'
                  startIcon={<FilterIcon />}
                  onClick={() => setCurrentTab(0)}
                >
                  Browse Filters
                </Button>
                {appliedFilter && (
                  <Button variant='outlined' color='secondary' onClick={handleClearAppliedFilter}>
                    Clear Active Filter
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Floating Action Button */}
      <Fab
        color='primary'
        aria-label='create filter'
        onClick={handleCreateNewFilter}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <AddIcon />
      </Fab>

      {/* Builder Dialog */}
      <Dialog
        open={builderOpen}
        onClose={handleCancelBuilder}
        maxWidth='lg'
        fullWidth
        PaperProps={{
          sx: { minHeight: '80vh' },
        }}
      >
        <DialogContent sx={{ p: 0 }}>
          <AdvancedFilterBuilder
            filter={editingFilter || undefined}
            onSave={handleSaveFilter}
            onCancel={handleCancelBuilder}
            entityType={selectedEntityType}
            availableFields={availableFields}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default AdvancedFiltering;
