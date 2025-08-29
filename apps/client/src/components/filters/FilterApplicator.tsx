import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Stack,
  Chip,
  Divider,
  Collapse,
  Alert,
  CircularProgress,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Tune as TuneIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface FilterCriteria {
  id: string;
  field: string;
  operator: string;
  value: any;
  dataType: string;
}

interface FilterGroup {
  id: string;
  name: string;
  criteria: FilterCriteria[];
  logicalOperator: 'AND' | 'OR';
  isActive: boolean;
}

interface AdvancedFilter {
  id?: string;
  name: string;
  description?: string;
  entityType: string;
  groups: FilterGroup[];
  globalLogicalOperator: 'AND' | 'OR';
  isShared: boolean;
  tags: string[];
}

interface FilterResult {
  data: any[];
  total: number;
  filteredCount: number;
  executionTime: number;
  appliedFilters: {
    groupName: string;
    criteriaCount: number;
    isActive: boolean;
  }[];
}

interface FilterApplicatorProps {
  filter: AdvancedFilter;
  onFilterChange?: (filter: AdvancedFilter) => void;
  onSaveFilter?: (filter: AdvancedFilter) => void;
  onClearFilter?: () => void;
  entityType: string;
  autoApply?: boolean;
}

const FilterApplicator: React.FC<FilterApplicatorProps> = ({
  filter,
  onFilterChange,
  onSaveFilter,
  onClearFilter,
  entityType,
  autoApply = true,
}) => {
  const { request } = useApi();
  const [result, setResult] = useState<FilterResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [filterSummary, setFilterSummary] = useState<string>('');

  useEffect(() => {
    generateFilterSummary();
    if (autoApply && hasActiveFilters()) {
      applyFilter();
    }
  }, [filter]);

  const hasActiveFilters = (): boolean => {
    return filter.groups.some(group => 
      group.isActive && group.criteria.length > 0
    );
  };

  const getActiveFiltersCount = (): number => {
    return filter.groups.filter(group => group.isActive).length;
  };

  const getActiveCriteriaCount = (): number => {
    return filter.groups
      .filter(group => group.isActive)
      .reduce((total, group) => total + group.criteria.length, 0);
  };

  const generateFilterSummary = () => {
    const activeGroups = filter.groups.filter(group => group.isActive);
    
    if (activeGroups.length === 0) {
      setFilterSummary('No active filters');
      return;
    }

    const groupSummaries = activeGroups.map(group => {
      const criteriaSummary = group.criteria
        .map(criteria => `${getFieldLabel(criteria.field)} ${getOperatorLabel(criteria.operator)} ${formatValue(criteria.value, criteria.dataType)}`)
        .join(` ${group.logicalOperator} `);
      
      return group.criteria.length > 1 ? `(${criteriaSummary})` : criteriaSummary;
    });

    const summary = groupSummaries.join(` ${filter.globalLogicalOperator} `);
    setFilterSummary(summary);
  };

  const getFieldLabel = (field: string): string => {
    // This would typically come from field definitions
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getOperatorLabel = (operator: string): string => {
    const labels: { [key: string]: string } = {
      equals: '=',
      notEquals: '≠',
      contains: '⊃',
      notContains: '⊅',
      greaterThan: '>',
      lessThan: '<',
      greaterThanOrEqual: '≥',
      lessThanOrEqual: '≤',
      between: '⊆',
      in: '∈',
      notIn: '∉',
      isEmpty: 'is empty',
      isNotEmpty: 'is not empty',
      isTrue: 'is true',
      isFalse: 'is false',
    };
    return labels[operator] || operator;
  };

  const formatValue = (value: any, dataType: string): string => {
    if (value === null || value === undefined) return '';
    
    if (Array.isArray(value)) {
      return `[${value.join(', ')}]`;
    }
    
    if (dataType === 'date' && value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    if (typeof value === 'string' && value.length > 20) {
      return `"${value.substring(0, 20)}..."`;
    }
    
    return `"${value}"`;
  };

  const applyFilter = async () => {
    if (!hasActiveFilters()) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await request('/api/filters/apply', {
        method: 'POST',
        data: {
          filter,
          entityType,
        },
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to apply filter');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroupActive = (groupId: string) => {
    const updatedFilter = {
      ...filter,
      groups: filter.groups.map(group =>
        group.id === groupId
          ? { ...group, isActive: !group.isActive }
          : group
      ),
    };
    onFilterChange?.(updatedFilter);
  };

  const clearAllFilters = () => {
    const clearedFilter = {
      ...filter,
      groups: filter.groups.map(group => ({ ...group, isActive: false })),
    };
    onFilterChange?.(clearedFilter);
    onClearFilter?.();
  };

  const handleSaveFilter = () => {
    if (onSaveFilter) {
      onSaveFilter(filter);
    }
  };

  return (
    <Box>
      <Card variant="outlined">
        <CardContent sx={{ pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <Badge badgeContent={getActiveFiltersCount()} color="primary">
                <FilterIcon color={hasActiveFilters() ? 'primary' : 'action'} />
              </Badge>
              <Typography variant="h6">
                {filter.name || 'Advanced Filter'}
              </Typography>
              {hasActiveFilters() && (
                <Chip
                  label={`${getActiveCriteriaCount()} criteria`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
            
            <Stack direction="row" spacing={1}>
              {onSaveFilter && (
                <Tooltip title="Save Filter">
                  <IconButton onClick={handleSaveFilter}>
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
              )}
              
              <Tooltip title="Clear All Filters">
                <IconButton 
                  onClick={clearAllFilters}
                  disabled={!hasActiveFilters()}
                  color="error"
                >
                  <ClearIcon />
                </IconButton>
              </Tooltip>
              
              <IconButton onClick={() => setExpanded(!expanded)}>
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Stack>
          </Box>

          <Collapse in={expanded}>
            <Box mt={2}>
              {filter.description && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {filter.description}
                </Typography>
              )}

              {/* Filter Summary */}
              <Box mt={1} mb={2}>
                <Typography variant="caption" color="text.secondary">
                  Active Filters:
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', bgcolor: 'grey.100', p: 1, borderRadius: 1, mt: 0.5 }}>
                  {filterSummary}
                </Typography>
              </Box>

              {/* Filter Groups */}
              <Stack spacing={1}>
                {filter.groups.map((group, index) => (
                  <Box key={group.id}>
                    {index > 0 && (
                      <Box display="flex" justifyContent="center" py={0.5}>
                        <Chip
                          label={filter.globalLogicalOperator}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </Box>
                    )}
                    
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      p={1}
                      border={1}
                      borderColor={group.isActive ? 'primary.main' : 'grey.300'}
                      borderRadius={1}
                      bgcolor={group.isActive ? 'primary.50' : 'grey.50'}
                    >
                      <IconButton
                        size="small"
                        onClick={() => toggleGroupActive(group.id)}
                        color={group.isActive ? 'primary' : 'default'}
                      >
                        <TuneIcon />
                      </IconButton>
                      
                      <Box flex={1}>
                        <Typography variant="subtitle2" color={group.isActive ? 'primary.main' : 'text.secondary'}>
                          {group.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {group.criteria.length} criteria • {group.logicalOperator} logic
                        </Typography>
                      </Box>
                      
                      <Chip
                        label={group.isActive ? 'Active' : 'Inactive'}
                        size="small"
                        color={group.isActive ? 'success' : 'default'}
                        variant="outlined"
                        onClick={() => toggleGroupActive(group.id)}
                        clickable
                      />
                    </Box>
                  </Box>
                ))}
              </Stack>

              {/* Apply Filter Button */}
              {!autoApply && (
                <Box mt={2} display="flex" justifyContent="center">
                  <Button
                    variant="contained"
                    onClick={applyFilter}
                    disabled={!hasActiveFilters() || loading}
                    startIcon={loading ? <CircularProgress size={16} /> : <FilterIcon />}
                  >
                    {loading ? 'Applying...' : 'Apply Filter'}
                  </Button>
                </Box>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Filter Results */}
      {loading && (
        <Card sx={{ mt: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Applying filters...
            </Typography>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Filter Results
            </Typography>
            
            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
              <Chip
                label={`${result.filteredCount} of ${result.total} records`}
                color="primary"
                icon={<FilterIcon />}
              />
              <Typography variant="caption" color="text.secondary">
                Execution time: {result.executionTime}ms
              </Typography>
            </Stack>

            {/* Applied Filters Summary */}
            <Typography variant="subtitle2" gutterBottom>
              Applied Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {result.appliedFilters.map((appliedFilter, index) => (
                <Chip
                  key={index}
                  label={`${appliedFilter.groupName} (${appliedFilter.criteriaCount})`}
                  size="small"
                  color={appliedFilter.isActive ? 'success' : 'default'}
                  variant="outlined"
                />
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            {/* Results Summary */}
            <Box>
              <Typography variant="body2" color="text.secondary">
                {result.filteredCount === 0 
                  ? 'No records match the current filter criteria.'
                  : `Showing ${result.filteredCount} records that match your filter criteria.`
                }
              </Typography>
              
              {result.filteredCount < result.total && (
                <Typography variant="body2" color="text.secondary">
                  {result.total - result.filteredCount} records were filtered out.
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* No Active Filters Message */}
      {!hasActiveFilters() && !loading && (
        <Card sx={{ mt: 2 }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <FilterIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Active Filters
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Activate one or more filter groups to see results
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default FilterApplicator;