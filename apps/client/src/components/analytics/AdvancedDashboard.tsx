import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Paper,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ButtonGroup,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  People as PeopleIcon,
  Work as WorkIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { useApi } from '../../hooks/useApi';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

interface MetricData {
  current: number;
  previous?: number;
  change?: number;
  changePercentage?: number;
  trend: 'up' | 'down' | 'stable';
  format: 'number' | 'percentage' | 'currency' | 'time';
}

interface Analytics {
  metrics: {
    [key: string]: MetricData;
  };
  trends: {
    [key: string]: Array<{
      period: string;
      value: number;
      change?: number;
      changePercentage?: number;
    }>;
  };
  distributions: {
    [key: string]: Array<{
      label: string;
      value: number;
      percentage: number;
    }>;
  };
  comparisons: {
    [key: string]: Array<{
      category: string;
      current: number;
      previous: number;
    }>;
  };
}

interface FilterOptions {
  templates: Array<{ value: string; label: string; category: string }>;
  worksites: Array<{ value: string; label: string; customer: string }>;
  technicians: Array<{ value: string; label: string; email: string }>;
  status: Array<{ value: string; label: string }>;
  granularities: Array<{ value: string; label: string }>;
}

const MetricCard: React.FC<{
  title: string;
  metric: MetricData;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, metric, icon, color = 'primary' }) => {
  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return `$${value.toLocaleString()}`;
      case 'time':
        return `${value.toFixed(1)}h`;
      default:
        return value.toLocaleString();
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color='success' fontSize='small' />;
      case 'down':
        return <TrendingDownIcon color='error' fontSize='small' />;
      default:
        return <TrendingFlatIcon color='disabled' fontSize='small' />;
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display='flex' justifyContent='space-between' alignItems='flex-start' mb={1}>
          <Box color={`${color}.main`}>{icon}</Box>
          {getTrendIcon(metric.trend)}
        </Box>

        <Typography variant='h4' component='div' gutterBottom>
          {formatValue(metric.current, metric.format)}
        </Typography>

        <Typography variant='body2' color='text.secondary' gutterBottom>
          {title}
        </Typography>

        {metric.changePercentage !== undefined && (
          <Box display='flex' alignItems='center' gap={0.5}>
            <Typography
              variant='caption'
              color={
                metric.changePercentage > 0
                  ? 'success.main'
                  : metric.changePercentage < 0
                    ? 'error.main'
                    : 'text.secondary'
              }
            >
              {metric.changePercentage > 0 ? '+' : ''}
              {metric.changePercentage.toFixed(1)}%
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              vs previous period
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const AdvancedDashboard: React.FC = () => {
  const { request } = useApi();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  });
  const [granularity, setGranularity] = useState('day');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [selectedWorksites, setSelectedWorksites] = useState<string[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState(0);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (filterOptions) {
      loadAnalytics();
    }
  }, [
    dateRange,
    granularity,
    selectedTemplates,
    selectedWorksites,
    selectedTechnicians,
    selectedStatus,
  ]);

  const loadInitialData = async () => {
    try {
      const [filtersResponse] = await Promise.all([request('GET', '/api/analytics/filters')]);

      setFilterOptions(filtersResponse.data);
    } catch (error: unknown) {
      setError('Failed to load dashboard data');
    }
  };

  const loadAnalytics = async () => {
    if (!filterOptions) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString(),
        granularity,
        ...(selectedTemplates.length && { templates: selectedTemplates.join(',') }),
        ...(selectedWorksites.length && { worksites: selectedWorksites.join(',') }),
        ...(selectedTechnicians.length && { technicians: selectedTechnicians.join(',') }),
        ...(selectedStatus.length && { status: selectedStatus.join(',') }),
      });

      const response = await request('GET', `/api/analytics/dashboard?${params}`);
      setAnalytics(response.data.analytics);
    } catch (error: unknown) {
      setError((error as Error).message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleQuickDateRange = (days: number) => {
    setDateRange({
      start: startOfDay(subDays(new Date(), days)),
      end: endOfDay(new Date()),
    });
  };

  const clearFilters = () => {
    setSelectedTemplates([]);
    setSelectedWorksites([]);
    setSelectedTechnicians([]);
    setSelectedStatus([]);
  };

  const chartColors = {
    primary: '#1976d2',
    secondary: '#dc004e',
    success: '#2e7d32',
    warning: '#ed6c02',
    error: '#d32f2f',
    info: '#0288d1',
  };

  const createLineChartData = (trends: any[], label: string) => ({
    labels: trends.map(t => format(new Date(t.period), 'MMM dd')),
    datasets: [
      {
        label,
        data: trends.map(t => t.value),
        borderColor: chartColors.primary,
        backgroundColor: `${chartColors.primary}20`,
        tension: 0.4,
        fill: true,
      },
    ],
  });

  const createBarChartData = (distribution: any[], colors: string[]) => ({
    labels: distribution.map(d => d.label),
    datasets: [
      {
        data: distribution.map(d => d.value),
        backgroundColor: colors.slice(0, distribution.length),
        borderWidth: 0,
      },
    ],
  });

  const createDoughnutChartData = (distribution: any[]) => ({
    labels: distribution.map(d => d.label),
    datasets: [
      {
        data: distribution.map(d => d.value),
        backgroundColor: [
          chartColors.primary,
          chartColors.secondary,
          chartColors.success,
          chartColors.warning,
          chartColors.error,
          chartColors.info,
        ].slice(0, distribution.length),
        borderWidth: 0,
      },
    ],
  });

  if (loading && !analytics) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='400px'>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert
        severity='error'
        action={
          <Button color='inherit' size='small' onClick={loadAnalytics}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h4'>Advanced Analytics</Typography>
        <Box display='flex' gap={1}>
          <IconButton
            onClick={() => setFilterMenuAnchor(document.body)}
            color={
              selectedTemplates.length ||
              selectedWorksites.length ||
              selectedTechnicians.length ||
              selectedStatus.length
                ? 'primary'
                : 'default'
            }
          >
            <FilterIcon />
          </IconButton>
          <IconButton onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon />
          </IconButton>
          <Button startIcon={<ExportIcon />} variant='outlined'>
            Export
          </Button>
        </Box>
      </Box>

      {/* Date Range and Quick Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems='center'>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box display='flex' gap={1}>
              <ButtonGroup size='small'>
                <Button onClick={() => handleQuickDateRange(7)}>7D</Button>
                <Button onClick={() => handleQuickDateRange(30)}>30D</Button>
                <Button onClick={() => handleQuickDateRange(90)}>90D</Button>
              </ButtonGroup>
            </Box>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box display='flex' gap={1}>
                <DatePicker
                  label='Start Date'
                  value={dateRange.start}
                  onChange={date => date && setDateRange({ ...dateRange, start: startOfDay(date) })}
                  slotProps={{
                    textField: { size: 'small' },
                  }}
                />
                <DatePicker
                  label='End Date'
                  value={dateRange.end}
                  onChange={date => date && setDateRange({ ...dateRange, end: endOfDay(date) })}
                  slotProps={{
                    textField: { size: 'small' },
                  }}
                />
              </Box>
            </LocalizationProvider>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl size='small' fullWidth>
              <InputLabel>Granularity</InputLabel>
              <Select value={granularity} onChange={e => setGranularity(e.target.value)}>
                {filterOptions?.granularities.map(g => (
                  <MenuItem key={g.value} value={g.value}>
                    {g.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Metrics Cards */}
      {analytics && (
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title='Total Forms'
              metric={
                analytics.metrics.totalForms || { current: 0, trend: 'stable', format: 'number' }
              }
              icon={<WorkIcon />}
              color='primary'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title='Completed Forms'
              metric={
                analytics.metrics.completedForms || {
                  current: 0,
                  trend: 'stable',
                  format: 'number',
                }
              }
              icon={<CheckCircleIcon />}
              color='success'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title='Completion Rate'
              metric={
                analytics.metrics.completionRate || {
                  current: 0,
                  trend: 'stable',
                  format: 'percentage',
                }
              }
              icon={<SpeedIcon />}
              color='info'
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <MetricCard
              title='Active Users'
              metric={
                analytics.metrics.activeUsers || { current: 0, trend: 'stable', format: 'number' }
              }
              icon={<PeopleIcon />}
              color='secondary'
            />
          </Grid>
        </Grid>
      )}

      {/* Charts Section */}
      <Box mb={3}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
          <Tab label='Trends' icon={<TimelineIcon />} />
          <Tab label='Distribution' icon={<AssessmentIcon />} />
          <Tab label='Performance' icon={<SpeedIcon />} />
        </Tabs>

        {/* Trends Tab */}
        {activeTab === 0 && analytics && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Form Submissions Trend
                  </Typography>
                  {analytics.trends.formSubmissions && (
                    <Line
                      data={createLineChartData(
                        analytics.trends.formSubmissions,
                        'Form Submissions'
                      )}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { beginAtZero: true },
                        },
                      }}
                      height={300}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    User Activity Trend
                  </Typography>
                  {analytics.trends.userActivity && (
                    <Line
                      data={createLineChartData(analytics.trends.userActivity, 'Active Users')}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: { beginAtZero: true },
                        },
                      }}
                      height={300}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Distribution Tab */}
        {activeTab === 1 && analytics && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Status Distribution
                  </Typography>
                  {analytics.distributions.statusDistribution && (
                    <Doughnut
                      data={createDoughnutChartData(analytics.distributions.statusDistribution)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                      height={300}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Template Usage
                  </Typography>
                  {analytics.distributions.templateUsage && (
                    <Bar
                      data={createBarChartData(analytics.distributions.templateUsage, [
                        chartColors.primary,
                        chartColors.secondary,
                        chartColors.success,
                        chartColors.warning,
                      ])}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                      height={300}
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Performance Tab */}
        {activeTab === 2 && analytics && (
          <Grid container spacing={3}>
            <Grid size={12}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Performance Overview
                  </Typography>
                  <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant='subtitle2' gutterBottom>
                        Completion Rate Trend
                      </Typography>
                      {analytics.trends.completions && (
                        <Line
                          data={createLineChartData(analytics.trends.completions, 'Completions')}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: { beginAtZero: true },
                            },
                          }}
                          height={200}
                        />
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <Typography variant='subtitle2' gutterBottom>
                        Key Metrics
                      </Typography>
                      <Box display='flex' flexDirection='column' gap={1}>
                        <Box display='flex' justifyContent='space-between'>
                          <Typography variant='body2'>Avg Completion Time:</Typography>
                          <Typography variant='body2' fontWeight='bold'>
                            {analytics.metrics.avgCompletionTime?.current.toFixed(1) || 0}h
                          </Typography>
                        </Box>
                        <Box display='flex' justifyContent='space-between'>
                          <Typography variant='body2'>Total Forms:</Typography>
                          <Typography variant='body2' fontWeight='bold'>
                            {analytics.metrics.totalForms?.current || 0}
                          </Typography>
                        </Box>
                        <Box display='flex' justifyContent='space-between'>
                          <Typography variant='body2'>Active Users:</Typography>
                          <Typography variant='body2' fontWeight='bold'>
                            {analytics.metrics.activeUsers?.current || 0}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 },
        }}
      >
        <Box p={2}>
          <Typography variant='h6' gutterBottom>
            Filters
          </Typography>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Templates ({selectedTemplates.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth size='small'>
                <Select
                  multiple
                  value={selectedTemplates}
                  onChange={e => setSelectedTemplates(e.target.value as string[])}
                  renderValue={selected => (
                    <Box display='flex' flexWrap='wrap' gap={0.5}>
                      {(selected as string[]).map(value => {
                        const template = filterOptions?.templates.find(t => t.value === value);
                        return <Chip key={value} label={template?.label} size='small' />;
                      })}
                    </Box>
                  )}
                >
                  {filterOptions?.templates.map(template => (
                    <MenuItem key={template.value} value={template.value}>
                      {template.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>Worksites ({selectedWorksites.length})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <FormControl fullWidth size='small'>
                <Select
                  multiple
                  value={selectedWorksites}
                  onChange={e => setSelectedWorksites(e.target.value as string[])}
                  renderValue={selected => (
                    <Box display='flex' flexWrap='wrap' gap={0.5}>
                      {(selected as string[]).map(value => {
                        const worksite = filterOptions?.worksites.find(w => w.value === value);
                        return <Chip key={value} label={worksite?.label} size='small' />;
                      })}
                    </Box>
                  )}
                >
                  {filterOptions?.worksites.map(worksite => (
                    <MenuItem key={worksite.value} value={worksite.value}>
                      {worksite.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </AccordionDetails>
          </Accordion>

          <Box display='flex' justifyContent='space-between' mt={2}>
            <Button size='small' onClick={clearFilters}>
              Clear All
            </Button>
            <Button size='small' variant='contained' onClick={() => setFilterMenuAnchor(null)}>
              Apply
            </Button>
          </Box>
        </Box>
      </Menu>
    </Box>
  );
};

export default AdvancedDashboard;
