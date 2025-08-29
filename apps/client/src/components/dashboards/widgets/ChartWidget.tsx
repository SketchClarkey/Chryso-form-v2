import React from 'react';
import { Card, CardContent, Typography, Box, CircularProgress, Alert } from '@mui/material';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ChartWidgetProps {
  widget: {
    id: string;
    title: string;
    description?: string;
    config: {
      chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
      dataSource?: string;
      xAxis?: string;
      yAxis?: string[];
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
    chartType: string;
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      color?: string;
    }>;
  };
  error?: string;
  loading?: boolean;
  lastUpdated?: Date;
}

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];

const ChartWidget: React.FC<ChartWidgetProps> = ({ widget, data, error, loading, lastUpdated }) => {
  const renderChart = () => {
    if (!data) return null;

    // Transform data for recharts
    const chartData = data.labels.map((label, index) => ({
      name: label,
      ...data.datasets.reduce(
        (acc, dataset) => ({
          ...acc,
          [dataset.label]: dataset.data[index] || 0,
        }),
        {}
      ),
    }));

    switch (data.chartType) {
      case 'line':
        return (
          <ResponsiveContainer width='100%' height='100%'>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.datasets.map((dataset, index) => (
                <Line
                  key={dataset.label}
                  type='monotone'
                  dataKey={dataset.label}
                  stroke={dataset.color || CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='name' />
              <YAxis />
              <Tooltip />
              <Legend />
              {data.datasets.map((dataset, index) => (
                <Bar
                  key={dataset.label}
                  dataKey={dataset.label}
                  fill={dataset.color || CHART_COLORS[index % CHART_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'doughnut':
        const pieData = data.labels.map((label, index) => ({
          name: label,
          value: data.datasets[0]?.data[index] || 0,
          fill: CHART_COLORS[index % CHART_COLORS.length],
        }));

        return (
          <ResponsiveContainer width='100%' height='100%'>
            <PieChart>
              <Pie
                data={pieData}
                cx='50%'
                cy='50%'
                innerRadius={data.chartType === 'doughnut' ? 40 : 0}
                outerRadius={80}
                paddingAngle={5}
                dataKey='value'
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <Box display='flex' alignItems='center' justifyContent='center' height='100%'>
            <Typography variant='body2' color='text.secondary'>
              Unsupported chart type: {data.chartType}
            </Typography>
          </Box>
        );
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
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', pb: 1 }}>
        <Box display='flex' justifyContent='space-between' alignItems='center' mb={1}>
          <Typography variant='subtitle2' color='text.secondary' noWrap>
            {widget.title}
          </Typography>
          {lastUpdated && (
            <Typography variant='caption' color='text.secondary'>
              {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
        </Box>

        <Box flex={1} minHeight={200}>
          {loading ? (
            <Box display='flex' justifyContent='center' alignItems='center' height='100%'>
              <CircularProgress size={32} />
            </Box>
          ) : error ? (
            <Alert severity='error'>{error}</Alert>
          ) : data && data.labels.length > 0 ? (
            renderChart()
          ) : (
            <Box display='flex' alignItems='center' justifyContent='center' height='100%'>
              <Typography variant='body2' color='text.secondary'>
                No data available
              </Typography>
            </Box>
          )}
        </Box>

        {widget.description && (
          <Typography variant='caption' color='text.secondary' sx={{ mt: 1 }}>
            {widget.description}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default ChartWidget;
