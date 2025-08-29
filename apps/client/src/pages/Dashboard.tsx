import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  LinearProgress,
} from '@mui/material';
import {
  Description as FormIcon,
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { FormStatusChart } from '../components/charts/FormStatusChart';
import { FormTrendsChart } from '../components/charts/FormTrendsChart';
import { DashboardFilters, type DashboardFilters as FilterType } from '../components/dashboard/DashboardFilters';

interface DashboardStats {
  totalForms: number;
  completedForms: number;
  pendingForms: number;
  rejectedForms: number;
  draftForms: number;
  inProgressForms: number;
}


export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    completedForms: 0,
    pendingForms: 0,
    rejectedForms: 0,
    draftForms: 0,
    inProgressForms: 0,
  });

  const [filters, setFilters] = useState<FilterType>({
    timeRange: 'month',
    status: [],
    worksite: '',
    technician: '',
  });

  // Build query params based on filters
  const buildQueryParams = (limit: number = 50) => {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());
    
    if (filters.status.length > 0) {
      params.set('status', filters.status.join(','));
    }
    if (filters.worksite) {
      params.set('worksite', filters.worksite);
    }
    if (filters.technician) {
      params.set('technician', filters.technician);
    }
    
    return params.toString();
  };

  // Fetch forms data
  const { data: formsData, isLoading: isLoadingForms, error: formsError } = useQuery({
    queryKey: ['forms', 'dashboard', filters],
    queryFn: async () => {
      const queryParams = buildQueryParams(50);
      const response = await api.get(`/forms?${queryParams}`);
      return response.data.data;
    },
  });

  // Fetch recent forms for display
  const { data: recentFormsData, isLoading: isLoadingRecent } = useQuery({
    queryKey: ['forms', 'recent', filters],
    queryFn: async () => {
      const queryParams = buildQueryParams(5);
      const response = await api.get(`/forms?${queryParams}&sort=createdAt`);
      return response.data.data;
    },
  });

  // Calculate stats from forms data
  useEffect(() => {
    if (formsData?.forms) {
      const forms = formsData.forms;
      const newStats = {
        totalForms: forms.length,
        completedForms: forms.filter((f: { status: string }) => f.status === 'completed').length,
        pendingForms: forms.filter((f: { status: string }) => f.status === 'in-progress').length,
        rejectedForms: forms.filter((f: { status: string }) => f.status === 'rejected').length,
        draftForms: forms.filter((f: { status: string }) => f.status === 'draft').length,
        inProgressForms: forms.filter((f: { status: string }) => f.status === 'in-progress').length,
      };
      setStats(newStats);
    }
  }, [formsData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      case 'rejected': return 'error';
      case 'approved': return 'success';
      case 'draft': return 'info';
      default: return 'default';
    }
  };

  const completionRate = stats.totalForms > 0 ? (stats.completedForms / stats.totalForms) * 100 : 0;

  // Prepare chart data
  const statusChartData = [
    { name: 'Draft', value: stats.draftForms, color: '#2196f3' },
    { name: 'In Progress', value: stats.inProgressForms, color: '#ff9800' },
    { name: 'Completed', value: stats.completedForms, color: '#4caf50' },
    { name: 'Rejected', value: stats.rejectedForms, color: '#f44336' },
  ];

  // Generate trend data (mock data for now - in real app would come from API)
  const generateTrendData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Mock data generation
      const created = Math.floor(Math.random() * 10) + 1;
      const completed = Math.floor(Math.random() * 8) + 1;
      
      data.push({
        date: date.toISOString().split('T')[0],
        created,
        completed,
        total: created + completed,
      });
    }
    return data;
  };

  const trendData = generateTrendData();

  const handleFilterChange = (newFilters: FilterType) => {
    setFilters(newFilters);
  };

  if (formsError) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Alert severity="error">
          Failed to load dashboard data. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome to Chryso Forms. Here's an overview of your recent activity.
      </Typography>

      <DashboardFilters onFilterChange={handleFilterChange} />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Stats Cards */}
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 3
        }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <FormIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Forms
                  </Typography>
                  <Typography variant="h4">
                    {isLoadingForms ? <CircularProgress size={24} /> : stats.totalForms}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CompletedIcon color="success" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Completed
                  </Typography>
                  <Typography variant="h4">
                    {isLoadingForms ? <CircularProgress size={24} /> : stats.completedForms}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <PendingIcon color="warning" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    In Progress
                  </Typography>
                  <Typography variant="h4">
                    {isLoadingForms ? <CircularProgress size={24} /> : stats.inProgressForms}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUpIcon color="info" sx={{ mr: 2 }} />
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Completion Rate
                  </Typography>
                  <Typography variant="h4">
                    {isLoadingForms ? <CircularProgress size={24} /> : `${Math.round(completionRate)}%`}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Progress Bar */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Overall Progress
            </Typography>
            <Box sx={{ mb: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={completionRate} 
                sx={{ height: 8, borderRadius: 5 }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {stats.completedForms} of {stats.totalForms} forms completed ({Math.round(completionRate)}%)
            </Typography>
          </CardContent>
        </Card>

        {/* Charts Section */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormStatusChart 
              data={statusChartData} 
              title="Form Status Distribution" 
              type="pie"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormTrendsChart 
              data={trendData} 
              title="Form Activity (Last 7 Days)" 
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Recent Forms */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Forms
              </Typography>
              {isLoadingRecent ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <List>
                  {recentFormsData?.forms?.length > 0 ? (
                    recentFormsData.forms.map((form: { id: string; formId?: string; status: string; customerInfo?: { customerName?: string }; createdAt?: string }) => (
                      <ListItem key={form.id} divider>
                        <ListItemIcon>
                          <FormIcon />
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle1">
                                {form.formId || `Form #${form.id.slice(-6)}`}
                              </Typography>
                              <Chip 
                                label={form.status} 
                                size="small" 
                                color={getStatusColor(form.status) as any}
                                variant="outlined"
                              />
                            </Box>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              {form.customerInfo?.customerName || 'No customer'} • 
                              {form.createdAt ? new Date(form.createdAt).toLocaleDateString() : 'No date'}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))
                  ) : (
                    <ListItem>
                      <ListItemIcon>
                        <FormIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary="No forms yet"
                        secondary="Start by creating your first form"
                      />
                    </ListItem>
                  )}
                </List>
              )}
            </Paper>
          </Grid>

          {/* Status Breakdown */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Status Breakdown
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { label: 'Draft', count: stats.draftForms, color: 'info' },
                  { label: 'In Progress', count: stats.inProgressForms, color: 'warning' },
                  { label: 'Completed', count: stats.completedForms, color: 'success' },
                  { label: 'Rejected', count: stats.rejectedForms, color: 'error' },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2">{item.label}</Typography>
                    <Chip 
                      label={item.count} 
                      size="small" 
                      color={item.color as any}
                      variant="outlined"
                    />
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}