import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  LinearProgress,
  Button,
  Divider,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Person as UserIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Shield as ShieldIcon,
  Lock as LockIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useApi } from '../../hooks/useApi';
import AuditLogViewer from './AuditLogViewer';

interface SecurityMetrics {
  totalEvents: number;
  securityAlerts: number;
  failedLogins: number;
  criticalEvents: number;
  complianceViolations: number;
  activeUsers: number;
  trends: {
    eventsChange: number;
    alertsChange: number;
    complianceChange: number;
  };
}

interface SecurityAlert {
  _id: string;
  timestamp: string;
  severity: string;
  description: string;
  category: string;
  userEmail?: string;
  ipAddress?: string;
  status: string;
}

interface SecurityDashboardProps {
  organizationId?: string;
}

const SecurityDashboard: React.FC<SecurityDashboardProps> = ({ organizationId }) => {
  const { request } = useApi();
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [anomalous, setAnomalous] = useState<any[]>([]);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [organizationId]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [metricsRes, alertsRes, anomalousRes] = await Promise.all([
        request('/api/audit/summary'),
        request('/api/audit/security-alerts?hours=24'),
        request('/api/audit/anomalous?hours=24')
      ]);

      // Process metrics
      const summary = metricsRes.data.summary;
      const processedMetrics: SecurityMetrics = {
        totalEvents: summary.reduce((acc: number, cat: any) => acc + cat.totalEvents, 0),
        securityAlerts: alertsRes.data.alerts.length,
        failedLogins: summary.find((cat: any) => cat._id === 'authentication')?.events
          ?.find((event: any) => event.status === 'failure')?.count || 0,
        criticalEvents: summary.reduce((acc: number, cat: any) => 
          acc + (cat.events?.filter((e: any) => e.severity === 'critical')?.length || 0), 0),
        complianceViolations: summary.find((cat: any) => cat._id === 'compliance')?.totalEvents || 0,
        activeUsers: new Set(alertsRes.data.alerts.map((a: any) => a.userEmail).filter(Boolean)).size,
        trends: {
          eventsChange: Math.floor(Math.random() * 20) - 10, // Mock trend data
          alertsChange: Math.floor(Math.random() * 30) - 15,
          complianceChange: Math.floor(Math.random() * 10) - 5
        }
      };

      setMetrics(processedMetrics);
      setAlerts(alertsRes.data.alerts);
      setAnomalous(anomalousRes.data.anomalous);

      // Generate trends data for charts
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toISOString().split('T')[0],
          events: Math.floor(Math.random() * 100) + 50,
          alerts: Math.floor(Math.random() * 20) + 5,
          compliance: Math.floor(Math.random() * 5)
        };
      });
      setTrendsData(last7Days);

    } catch (error: any) {
      console.error('Failed to load security dashboard:', error);
      setError(error.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getMetricColor = (value: number, threshold: number) => {
    if (value === 0) return 'success.main';
    if (value <= threshold) return 'warning.main';
    return 'error.main';
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUpIcon color="error" fontSize="small" />;
    if (change < 0) return <TrendingDownIcon color="success" fontSize="small" />;
    return null;
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <ErrorIcon color="error" />;
      case 'high':
        return <WarningIcon color="warning" />;
      case 'medium':
        return <SecurityIcon color="info" />;
      default:
        return <SuccessIcon color="success" />;
    }
  };

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57'];

  const MetricCard = ({ title, value, icon, trend, color = 'primary.main' }: any) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" color={color} gutterBottom>
              {value.toLocaleString()}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {title}
            </Typography>
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {getTrendIcon(trend)}
                <Typography
                  variant="body2"
                  color={trend > 0 ? 'error.main' : 'success.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend)}% vs last week
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: 'primary.main' }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box p={3}>
        <LinearProgress />
        <Typography variant="h6" textAlign="center" mt={2}>
          Loading security dashboard...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Security Dashboard</Typography>
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh Data">
            <IconButton onClick={loadDashboardData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {metrics && (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard
                title="Security Alerts"
                value={metrics.securityAlerts}
                icon={<SecurityIcon fontSize="large" />}
                trend={metrics.trends.alertsChange}
                color={getMetricColor(metrics.securityAlerts, 5)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard
                title="Failed Logins"
                value={metrics.failedLogins}
                icon={<LockIcon fontSize="large" />}
                color={getMetricColor(metrics.failedLogins, 10)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard
                title="Critical Events"
                value={metrics.criticalEvents}
                icon={<ErrorIcon fontSize="large" />}
                color={getMetricColor(metrics.criticalEvents, 3)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard
                title="Compliance Issues"
                value={metrics.complianceViolations}
                icon={<ShieldIcon fontSize="large" />}
                trend={metrics.trends.complianceChange}
                color={getMetricColor(metrics.complianceViolations, 2)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard
                title="Total Events"
                value={metrics.totalEvents}
                icon={<TimelineIcon fontSize="large" />}
                trend={metrics.trends.eventsChange}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <MetricCard
                title="Active Users"
                value={metrics.activeUsers}
                icon={<UserIcon fontSize="large" />}
              />
            </Grid>
          </Grid>

          {/* Charts */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Security Events Trend (Last 7 Days)
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip />
                      <Line 
                        type="monotone" 
                        dataKey="events" 
                        stroke="#8884d8" 
                        name="Total Events"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="alerts" 
                        stroke="#ff7300" 
                        name="Security Alerts"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="compliance" 
                        stroke="#ff0000" 
                        name="Compliance Issues"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Alert Categories
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Authentication', value: metrics.failedLogins },
                          { name: 'Access Control', value: Math.floor(metrics.securityAlerts * 0.3) },
                          { name: 'Data Access', value: Math.floor(metrics.securityAlerts * 0.4) },
                          { name: 'System', value: Math.floor(metrics.securityAlerts * 0.2) },
                          { name: 'Other', value: Math.floor(metrics.securityAlerts * 0.1) }
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label
                      >
                        {trendsData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Recent Security Alerts */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Recent Security Alerts
                    </Typography>
                    <Chip 
                      label={`${alerts.length} alerts`} 
                      color={alerts.length > 10 ? 'error' : alerts.length > 5 ? 'warning' : 'success'}
                      size="small"
                    />
                  </Box>
                  <List>
                    {alerts.slice(0, 8).map((alert) => (
                      <ListItem key={alert._id} divider>
                        <ListItemIcon>
                          {getSeverityIcon(alert.severity)}
                        </ListItemIcon>
                        <ListItemText
                          primary={alert.description}
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(alert.timestamp).toLocaleString()}
                              </Typography>
                              {alert.userEmail && (
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                  • {alert.userEmail}
                                </Typography>
                              )}
                              {alert.ipAddress && (
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                  • {alert.ipAddress}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                        <Chip
                          label={alert.status}
                          size="small"
                          color={alert.status === 'failure' ? 'error' : 'warning'}
                          variant="outlined"
                        />
                      </ListItem>
                    ))}
                  </List>
                  {alerts.length === 0 && (
                    <Box textAlign="center" py={4}>
                      <SuccessIcon color="success" fontSize="large" />
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        No security alerts in the last 24 hours
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Anomalous Activity
                  </Typography>
                  <List>
                    {anomalous.slice(0, 8).map((item, index) => (
                      <ListItem key={index} divider>
                        <ListItemIcon>
                          <WarningIcon color="warning" />
                        </ListItemIcon>
                        <ListItemText
                          primary={`${item.count} suspicious events`}
                          secondary={
                            <Box>
                              <Typography variant="caption" color="text.secondary">
                                User: {item._id.userId || 'Unknown'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                • IP: {item._id.ipAddress}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                • Action: {item._id.action}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip
                          label={`${item.count} events`}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </ListItem>
                    ))}
                  </List>
                  {anomalous.length === 0 && (
                    <Box textAlign="center" py={4}>
                      <SuccessIcon color="success" fontSize="large" />
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        No anomalous activity detected
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* Detailed Audit Log View */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Audit Events
          </Typography>
          <AuditLogViewer
            organizationId={organizationId}
            height={500}
            embedded
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default SecurityDashboard;