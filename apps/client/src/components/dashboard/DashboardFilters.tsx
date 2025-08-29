import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Typography,
  IconButton,
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  DateRange as DateIcon,
} from '@mui/icons-material';

interface DashboardFiltersProps {
  onFilterChange: (filters: DashboardFilters) => void;
}

export interface DashboardFilters {
  timeRange: 'week' | 'month' | 'quarter' | 'year' | 'custom';
  status: string[];
  worksite: string;
  technician: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export function DashboardFilters({ onFilterChange }: DashboardFiltersProps) {
  const [filters, setFilters] = useState<DashboardFilters>({
    timeRange: 'month',
    status: [],
    worksite: '',
    technician: '',
  });

  const [showFilters, setShowFilters] = useState(false);

  const timeRangeOptions = [
    { value: 'week', label: 'Last 7 days' },
    { value: 'month', label: 'Last 30 days' },
    { value: 'quarter', label: 'Last 3 months' },
    { value: 'year', label: 'Last 12 months' },
    { value: 'custom', label: 'Custom range' },
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const handleFilterChange = (field: keyof DashboardFilters, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleStatusChange = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    
    handleFilterChange('status', newStatuses);
  };

  const clearAllFilters = () => {
    const defaultFilters: DashboardFilters = {
      timeRange: 'month',
      status: [],
      worksite: '',
      technician: '',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters = filters.status.length > 0 || filters.worksite || filters.technician;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon color="primary" />
            <Typography variant="h6">Filters</Typography>
            {hasActiveFilters && (
              <Chip
                label={`${filters.status.length + (filters.worksite ? 1 : 0) + (filters.technician ? 1 : 0)} active`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Box>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outlined"
              size="small"
              sx={{ mr: 1 }}
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            {hasActiveFilters && (
              <IconButton onClick={clearAllFilters} size="small">
                <ClearIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Time Range - Always visible */}
        <Box sx={{ mb: showFilters ? 2 : 0 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={filters.timeRange}
              label="Time Range"
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
            >
              {timeRangeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Additional filters - Show/Hide based on state */}
        {showFilters && (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
            {/* Status Filter */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Status
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {statusOptions.map(option => (
                  <Chip
                    key={option.value}
                    label={option.label}
                    size="small"
                    onClick={() => handleStatusChange(option.value)}
                    color={filters.status.includes(option.value) ? 'primary' : 'default'}
                    variant={filters.status.includes(option.value) ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </Box>

            {/* Worksite Filter */}
            <FormControl size="small" fullWidth>
              <InputLabel>Worksite</InputLabel>
              <Select
                value={filters.worksite}
                label="Worksite"
                onChange={(e) => handleFilterChange('worksite', e.target.value)}
              >
                <MenuItem value="">All Worksites</MenuItem>
                <MenuItem value="worksite1">Test Worksite</MenuItem>
                {/* In real app, these would come from API */}
              </Select>
            </FormControl>

            {/* Technician Filter */}
            <FormControl size="small" fullWidth>
              <InputLabel>Technician</InputLabel>
              <Select
                value={filters.technician}
                label="Technician"
                onChange={(e) => handleFilterChange('technician', e.target.value)}
              >
                <MenuItem value="">All Technicians</MenuItem>
                <MenuItem value="tech1">John Doe</MenuItem>
                <MenuItem value="tech2">Jane Smith</MenuItem>
                {/* In real app, these would come from API */}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Custom Date Range */}
        {filters.timeRange === 'custom' && (
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="From Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              onChange={(e) => handleFilterChange('dateFrom', new Date(e.target.value))}
            />
            <TextField
              label="To Date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              onChange={(e) => handleFilterChange('dateTo', new Date(e.target.value))}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}