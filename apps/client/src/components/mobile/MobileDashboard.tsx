import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Fab,
  Paper,
  Alert,
  Skeleton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Assignment as FormIcon,
  Add as AddIcon,
  TrendingUp,
  Schedule,
  CheckCircle,
  Warning,
  Sync as SyncIcon,
  CloudOff,
  LocationOn,
  Person,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import OfflineService from '../../services/offlineService';
import PWAService from '../../services/pwaService';

interface DashboardStats {
  totalForms: number;
  pendingForms: number;
  completedForms: number;
  thisMonthForms: number;
  recentForms: Array<{
    id: string;
    customerName: string;
    serviceDate: string;
    status: string;
    worksite: string;
  }>;
}

export function MobileDashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [offlineStorageInfo, setOfflineStorageInfo] = useState({ 
    size: 0, 
    formCount: 0, 
    attachmentCount: 0 
  });

  const offlineService = OfflineService.getInstance();
  const pwaService = PWAService.getInstance();

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor sync status
  useEffect(() => {
    const handleSyncStatus = (status: string, progress?: number) => {
      setSyncStatus(status);
      setSyncProgress(progress || 0);
    };

    offlineService.onSyncStatusChange(handleSyncStatus);
  }, [offlineService]);

  // Load offline storage info
  useEffect(() => {
    const loadStorageInfo = async () => {
      const info = await offlineService.getOfflineStorageInfo();
      setOfflineStorageInfo(info);
    };

    loadStorageInfo();
  }, [offlineService]);

  // Fetch dashboard data (skip if offline)
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/dashboard/stats');
      return response.data.data;
    },
    enabled: !isOffline,
    refetchInterval: isOffline ? false : 30000, // Refresh every 30 seconds when online
  });

  const handleSync = async () => {
    try {
      await offlineService.processSync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'success';
      case 'in-progress':
        return 'info';
      case 'pending':
      case 'review':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'primary',
    subtitle 
  }: {
    title: string;
    value: number | string;
    icon: any;
    color?: 'primary' | 'success' | 'warning' | 'error';
    subtitle?: string;
  }) => (
    <Card 
      sx={{ 
        background: `linear-gradient(135deg, ${alpha(theme.palette[color].main, 0.1)}, ${alpha(theme.palette[color].main, 0.05)})`,
        border: `1px solid ${alpha(theme.palette[color].main, 0.2)}`
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h4" color={`${color}.main`} fontWeight="bold">
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          <Icon sx={{ fontSize: 40, color: `${color}.main`, opacity: 0.7 }} />
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 2, pb: 9 }}>
      {/* Offline Status */}
      {isOffline && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          action={
            <IconButton color="inherit" onClick={handleSync}>
              <SyncIcon />
            </IconButton>
          }
        >
          You're offline. {offlineStorageInfo.formCount > 0 && `${offlineStorageInfo.formCount} forms cached locally.`}
        </Alert>
      )}

      {/* Sync Status */}
      {syncStatus && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <SyncIcon color="primary" />
            <Typography variant="body2">{syncStatus}</Typography>
          </Box>
          {syncProgress > 0 && (
            <LinearProgress variant="determinate" value={syncProgress} />
          )}
        </Paper>
      )}

      {/* Welcome Section */}
      <Paper sx={{ p: 2, mb: 3, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})` }}>
        <Typography variant="h6" color="white" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person />
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body2" sx={{ color: alpha('#fff', 0.8), mt: 0.5 }}>
          {user?.role} • {user?.worksites?.[0]?.name || 'No worksite assigned'}
        </Typography>
      </Paper>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={100} />
          ) : (
            <StatCard
              title="Total Forms"
              value={stats?.totalForms || 0}
              icon={FormIcon}
              color="primary"
            />
          )}
        </Grid>
        <Grid item xs={6}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={100} />
          ) : (
            <StatCard
              title="Pending"
              value={stats?.pendingForms || 0}
              icon={Schedule}
              color="warning"
            />
          )}
        </Grid>
        <Grid item xs={6}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={100} />
          ) : (
            <StatCard
              title="Completed"
              value={stats?.completedForms || 0}
              icon={CheckCircle}
              color="success"
            />
          )}
        </Grid>
        <Grid item xs={6}>
          {isLoading ? (
            <Skeleton variant="rectangular" height={100} />
          ) : (
            <StatCard
              title="This Month"
              value={stats?.thisMonthForms || 0}
              icon={TrendingUp}
              color="primary"
              subtitle="New forms"
            />
          )}
        </Grid>
      </Grid>

      {/* Offline Storage Info */}
      {(isOffline || offlineStorageInfo.formCount > 0) && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CloudOff color="action" />
              Offline Storage
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Typography variant="h6" color="primary.main">
                  {offlineStorageInfo.formCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Forms
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h6" color="primary.main">
                  {offlineStorageInfo.attachmentCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Files
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h6" color="primary.main">
                  {formatFileSize(offlineStorageInfo.size)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Cache Size
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Recent Forms */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6">Recent Forms</Typography>
          </Box>
          
          {isLoading ? (
            <Box sx={{ p: 2 }}>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
              ))}
            </Box>
          ) : stats?.recentForms && stats.recentForms.length > 0 ? (
            <List sx={{ p: 0 }}>
              {stats.recentForms.map((form, index) => (
                <ListItem 
                  key={form.id}
                  divider={index < stats.recentForms.length - 1}
                  button
                  onClick={() => navigate(`/forms/${form.id}`)}
                >
                  <ListItemText
                    primary={form.customerName}
                    secondary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <LocationOn sx={{ fontSize: 14 }} />
                        <Typography variant="caption">{form.worksite}</Typography>
                        <Typography variant="caption">•</Typography>
                        <Typography variant="caption">{form.serviceDate}</Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={form.status}
                      size="small"
                      color={getStatusColor(form.status) as any}
                      variant="outlined"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <FormIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                {isOffline ? 'Recent forms will appear when you\'re online' : 'No forms found'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ 
          position: 'fixed', 
          bottom: 80, 
          right: 16,
          zIndex: 1000
        }}
        onClick={() => navigate('/forms/new')}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}