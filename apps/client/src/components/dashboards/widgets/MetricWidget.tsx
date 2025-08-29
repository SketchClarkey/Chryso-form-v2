import React from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Alert, Chip } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';

interface MetricWidgetProps {
  widget: {
    id: string;
    title: string;
    description?: string;
    config: {
      metric?: string;
      format?: 'number' | 'percentage' | 'currency' | 'time';
      aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
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
    value: number;
    metric: string;
    aggregation: string;
    format: string;
    previousValue?: number;
    trend?: 'up' | 'down' | 'flat';
  };
  error?: string;
  loading?: boolean;
  lastUpdated?: Date;
}

const MetricWidget: React.FC<MetricWidgetProps> = ({
  widget,
  data,
  error,
  loading,
  lastUpdated,
}) => {
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'time':
        return `${value.toFixed(1)}h`;
      default:
        return new Intl.NumberFormat('en-US').format(value);
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color='success' />;
      case 'down':
        return <TrendingDownIcon color='error' />;
      case 'flat':
        return <TrendingFlatIcon color='action' />;
      default:
        return null;
    }
  };

  const getTrendColor = (trend?: string) => {
    switch (trend) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      case 'flat':
        return 'text.secondary';
      default:
        return 'text.secondary';
    }
  };

  const calculateTrendPercent = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
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
        <Typography variant='subtitle2' color='text.secondary' gutterBottom noWrap>
          {widget.title}
        </Typography>

        {loading ? (
          <Box display='flex' justifyContent='center' alignItems='center' flex={1}>
            <CircularProgress size={32} />
          </Box>
        ) : error ? (
          <Alert severity='error' sx={{ mt: 1 }}>
            {error}
          </Alert>
        ) : data ? (
          <Box flex={1} display='flex' flexDirection='column' justifyContent='center'>
            <Box display='flex' alignItems='center' mb={1}>
              <Typography
                variant='h3'
                sx={{
                  fontWeight: 'bold',
                  color: widget.styling?.textColor || 'text.primary',
                  mr: 1,
                }}
              >
                {formatValue(data.value, data.format)}
              </Typography>
              {data.trend && getTrendIcon(data.trend)}
            </Box>

            {data.previousValue !== undefined && (
              <Box display='flex' alignItems='center' gap={1}>
                <Typography
                  variant='caption'
                  sx={{
                    color: getTrendColor(data.trend),
                    fontWeight: 500,
                  }}
                >
                  {data.trend === 'up' ? '+' : data.trend === 'down' ? '-' : ''}
                  {Math.abs(calculateTrendPercent(data.value, data.previousValue)).toFixed(1)}%
                </Typography>
                <Typography variant='caption' color='text.secondary'>
                  vs previous period
                </Typography>
              </Box>
            )}

            {widget.description && (
              <Typography variant='caption' color='text.secondary' sx={{ mt: 1 }}>
                {widget.description}
              </Typography>
            )}
          </Box>
        ) : (
          <Box display='flex' alignItems='center' justifyContent='center' flex={1}>
            <Typography variant='body2' color='text.secondary'>
              No data available
            </Typography>
          </Box>
        )}

        {lastUpdated && (
          <Box mt='auto' pt={1}>
            <Typography variant='caption' color='text.secondary'>
              Updated {lastUpdated.toLocaleTimeString()}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricWidget;
