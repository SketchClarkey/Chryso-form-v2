import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Autocomplete,
  Chip,
  Button,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface FilterWidgetProps {
  widget: {
    id: string;
    title: string;
    description?: string;
    config: {
      filterType?: 'dropdown' | 'multiselect' | 'daterange' | 'search';
      filterOptions?: any[];
    };
    styling?: {
      backgroundColor?: string;
      borderColor?: string;
      textColor?: string;
      borderRadius?: number;
      shadow?: boolean;
    };
  };
  data?: {
    options: any[];
  };
  error?: string;
  loading?: boolean;
  lastUpdated?: Date;
  onFilterChange?: (filterId: string, value: any) => void;
}

const FilterWidget: React.FC<FilterWidgetProps> = ({
  widget,
  data,
  error,
  loading,
  lastUpdated,
  onFilterChange,
}) => {
  const [selectedValue, setSelectedValue] = useState<any>(null);
  const [selectedValues, setSelectedValues] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [searchValue, setSearchValue] = useState('');

  const options = data?.options || widget.config.filterOptions || [];

  const handleSingleChange = (value: any) => {
    setSelectedValue(value);
    onFilterChange?.(widget.id, value);
  };

  const handleMultiChange = (values: any[]) => {
    setSelectedValues(values);
    onFilterChange?.(widget.id, values);
  };

  const handleDateRangeChange = (index: number, date: Date | null) => {
    const newRange: [Date | null, Date | null] = [...dateRange];
    newRange[index] = date;
    setDateRange(newRange);
    onFilterChange?.(widget.id, newRange);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    onFilterChange?.(widget.id, value);
  };

  const handleClear = () => {
    setSelectedValue(null);
    setSelectedValues([]);
    setDateRange([null, null]);
    setSearchValue('');
    onFilterChange?.(widget.id, null);
  };

  const renderFilter = () => {
    switch (widget.config.filterType) {
      case 'dropdown':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{widget.title}</InputLabel>
            <Select
              value={selectedValue || ''}
              onChange={(e) => handleSingleChange(e.target.value)}
              label={widget.title}
            >
              <MenuItem value="">
                <em>All</em>
              </MenuItem>
              {options.map((option, index) => (
                <MenuItem key={index} value={option.value || option}>
                  {option.label || option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'multiselect':
        return (
          <Autocomplete
            multiple
            size="small"
            options={options}
            getOptionLabel={(option) => option.label || option}
            value={selectedValues}
            onChange={(_, newValues) => handleMultiChange(newValues)}
            renderInput={(params) => (
              <TextField {...params} label={widget.title} />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  variant="outlined"
                  label={option.label || option}
                  size="small"
                  {...getTagProps({ index })}
                  key={index}
                />
              ))
            }
          />
        );

      case 'daterange':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box display="flex" gap={1} flexDirection={{ xs: 'column', sm: 'row' }}>
              <DatePicker
                label="From"
                value={dateRange[0]}
                onChange={(date) => handleDateRangeChange(0, date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
              <DatePicker
                label="To"
                value={dateRange[1]}
                onChange={(date) => handleDateRangeChange(1, date)}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Box>
          </LocalizationProvider>
        );

      case 'search':
        return (
          <TextField
            fullWidth
            size="small"
            label={widget.title}
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Enter search term..."
          />
        );

      default:
        return (
          <Typography variant="body2" color="text.secondary">
            Unknown filter type: {widget.config.filterType}
          </Typography>
        );
    }
  };

  const hasValue = () => {
    switch (widget.config.filterType) {
      case 'dropdown':
        return selectedValue !== null && selectedValue !== '';
      case 'multiselect':
        return selectedValues.length > 0;
      case 'daterange':
        return dateRange[0] !== null || dateRange[1] !== null;
      case 'search':
        return searchValue !== '';
      default:
        return false;
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        ...widget.styling,
        ...(widget.styling?.shadow && {
          boxShadow: 3,
        }),
      }}
    >
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="subtitle2" color="text.secondary" noWrap>
            {widget.title}
          </Typography>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>

        <Box flex={1} display="flex" flexDirection="column" gap={2}>
          {renderFilter()}

          {hasValue() && (
            <Button
              size="small"
              onClick={handleClear}
              variant="outlined"
              color="secondary"
            >
              Clear Filter
            </Button>
          )}
        </Box>

        {widget.description && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2 }}>
            {widget.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default FilterWidget;