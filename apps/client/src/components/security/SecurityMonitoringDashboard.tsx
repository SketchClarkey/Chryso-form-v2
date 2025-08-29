import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  Paper,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Tooltip,
  Switch,
  FormControlLabel,
  TextField,
  MenuItem,
  Badge
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  Shield as ShieldIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  NotificationsActive as AlertIcon,
  Timeline as TrendIcon,
  Person as UserIcon,
  Lock as LockIcon,
  VpnKey as KeyIcon,
  Computer as SystemIcon,
  Language as NetworkIcon,
  Assessment as ReportIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useApi } from '../../hooks/useApi';

interface SecurityMetrics {
  totalSecurityEvents: number;
  criticalAlerts: number;
  failedLogins: number;
  suspiciousActivity: number;
  blockedIPs: number;
  complianceScore: number;
  trends: {
    securityEventsChange: number;
    alertsChange: number;
    complianceChange: number;
  };
}

interface SecurityAlert {
  _id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  title: string;
  description: string;
  source: string;
  ipAddress?: string;
  userEmail?: string;
  userId?: string;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  assignedTo?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolution?: string;
  tags: string[];
}

interface ThreatIntel {
  _id: string;
  threatType: string;
  severity: string;
  description: string;
  indicators: string[];
  lastSeen: string;
  count: number;
  blocked: boolean;
}

interface SecurityEvent {
  timestamp: string;
  eventType: string;
  severity: string;
  count: number;
}

const SecurityMonitoringDashboard: React.FC = () => {
  const { request } = useApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState(0);
  
  // Data states
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [threatIntel, setThreatIntel] = useState<ThreatIntel[]>([]);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [complianceData, setComplianceData] = useState<any>(null);
  
  // Filter states
  const [timeRange, setTimeRange] = useState('24h');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Dialog states
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  // Real-time updates
  useEffect(() => {
    const interval = autoRefresh ? setInterval(loadDashboardData, 30000) : null; // 30 seconds
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, timeRange, severityFilter, categoryFilter]);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange, severityFilter, categoryFilter]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        timeRange,
        ...(severityFilter !== 'all' && { severity: severityFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter })
      });

      const [metricsRes, alertsRes, eventsRes, complianceRes] = await Promise.all([
        request(`/api/security/metrics?${params}`),
        request(`/api/security/alerts?${params}&limit=50`),
        request(`/api/security/events?${params}`),
        request(`/api/security/compliance?${params}`)
      ]);

      setMetrics(metricsRes.data);
      setAlerts(alertsRes.data.alerts);
      setSecurityEvents(eventsRes.data.events);
      setComplianceData(complianceRes.data);

      // Load threat intelligence
      const threatRes = await request('/api/security/threats');
      setThreatIntel(threatRes.data.threats);

    } catch (error: any) {
      console.error('Failed to load security dashboard:', error);
      setError(error.response?.data?.message || 'Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: 'investigate' | 'resolve' | 'false_positive', resolution?: string) => {
    try {
      await request(`/api/security/alerts/${alertId}`, {
        method: 'PATCH',
        data: { action, resolution }
      });
      
      loadDashboardData(); // Refresh data
      setAlertDialogOpen(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update alert');
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <ErrorIcon color="error" />;
      case 'high': return <WarningIcon color="warning" />;
      case 'medium': return <SecurityIcon color="info" />;
      default: return <SuccessIcon color="success" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';  
      case 'medium': return 'info';
      default: return 'success';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'success';
      case 'investigating': return 'warning';
      case 'false_positive': return 'info';
      default: return 'error';
    }
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUpIcon color="error" fontSize="small" />;
    if (change < 0) return <TrendingDownIcon color="success" fontSize="small" />;
    return null;
  };

  const MetricCard = ({ title, value, icon, trend, color = 'primary.main', subtitle }: any) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" color={color} gutterBottom>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box display="flex" alignItems="center" mt={1}>
                {getTrendIcon(trend)}
                <Typography
                  variant="body2"
                  color={trend > 0 ? 'error.main' : 'success.main'}
                  sx={{ ml: 0.5 }}
                >
                  {Math.abs(trend)}% vs last period
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: 'primary.main', fontSize: '2rem' }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const TabPanel = ({ children, value, index }: any) => (
    <div hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );

  const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3'];

  return (
    <Box p={3}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Security Monitoring Dashboard</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          <TextField
            select
            size="small"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            sx={{ minWidth: 120 }}
          >
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </TextField>
          <Tooltip title="Refresh Now">
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

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Key Metrics */}
      {metrics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard
              title="Security Events"
              value={metrics.totalSecurityEvents}
              icon={<SecurityIcon fontSize="large" />}
              trend={metrics.trends.securityEventsChange}
              subtitle="Total events"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard
              title="Critical Alerts"
              value={metrics.criticalAlerts}
              icon={<AlertIcon fontSize="large" />}
              trend={metrics.trends.alertsChange}
              color="error.main"
              subtitle="Require attention"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard
              title="Failed Logins"
              value={metrics.failedLogins}
              icon={<LockIcon fontSize="large" />}
              color="warning.main"
              subtitle="Authentication failures"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard
              title="Suspicious Activity"
              value={metrics.suspiciousActivity}
              icon={<ShieldIcon fontSize="large" />}
              color="warning.main"
              subtitle="Anomalous patterns"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard
              title="Blocked IPs"
              value={metrics.blockedIPs}
              icon={<NetworkIcon fontSize="large" />}
              subtitle="Threat sources"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <MetricCard
              title="Compliance Score"
              value={`${metrics.complianceScore}%`}
              icon={<ReportIcon fontSize="large" />}
              trend={metrics.trends.complianceChange}
              color={metrics.complianceScore >= 90 ? 'success.main' : 'warning.main'}
              subtitle="Overall compliance"
            />
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={selectedTab} 
          onChange={(_, newValue) => setSelectedTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Security Alerts" icon={<AlertIcon />} />
          <Tab label="Threat Intelligence" icon={<ShieldIcon />} />
          <Tab label="Event Analytics" icon={<TrendIcon />} />
          <Tab label="Compliance" icon={<ReportIcon />} />
          <Tab label="User Activity" icon={<UserIcon />} />
        </Tabs>

        <TabPanel value={selectedTab} index={0}>
          {/* Security Alerts Tab */}
          <Box p={3}>
            <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
              <Typography variant="h6">Active Security Alerts</Typography>
              <Box display="flex" gap={2}>
                <TextField
                  select
                  size="small"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="all">All Severities</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                </TextField>
                <TextField
                  select
                  size="small"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  sx={{ minWidth: 120 }}
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  <MenuItem value="authentication">Authentication</MenuItem>
                  <MenuItem value="authorization">Authorization</MenuItem>
                  <MenuItem value="data_access">Data Access</MenuItem>
                  <MenuItem value="network">Network</MenuItem>
                  <MenuItem value="malware">Malware</MenuItem>
                </TextField>
              </Box>
            </Box>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Severity</TableCell>
                    <TableCell>Alert</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert._id}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {getSeverityIcon(alert.severity)}
                          <Chip
                            label={alert.severity}
                            size="small"
                            color={getSeverityColor(alert.severity) as any}
                            variant="outlined"
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="subtitle2">
                            {alert.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {alert.description.length > 60 
                              ? `${alert.description.substring(0, 60)}...`
                              : alert.description
                            }
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip label={alert.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {alert.source}
                          </Typography>
                          {alert.ipAddress && (
                            <Typography variant="caption" color="text.secondary">
                              IP: {alert.ipAddress}
                            </Typography>
                          )}
                          {alert.userEmail && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              User: {alert.userEmail}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(alert.timestamp).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={alert.status}
                          size="small"
                          color={getStatusColor(alert.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setAlertDialogOpen(true);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={1}>
          {/* Threat Intelligence Tab */}
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Threat Intelligence Feed
            </Typography>
            <Grid container spacing={3}>
              {threatIntel.map((threat) => (
                <Grid item xs={12} md={6} key={threat._id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                        <Typography variant="h6">
                          {threat.threatType}
                        </Typography>
                        <Chip
                          label={threat.severity}
                          size="small"
                          color={getSeverityColor(threat.severity) as any}
                        />
                      </Box>
                      <Typography variant="body2" gutterBottom>
                        {threat.description}
                      </Typography>
                      <Box mt={2}>
                        <Typography variant="caption" color="text.secondary">
                          Indicators: {threat.indicators.length}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Last Seen: {new Date(threat.lastSeen).toLocaleString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Count: {threat.count} | Blocked: {threat.blocked ? 'Yes' : 'No'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={2}>
          {/* Event Analytics Tab */}
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Security Event Trends
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Security Events Over Time
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={securityEvents}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="timestamp" />
                        <YAxis />
                        <ChartTooltip />
                        <Area 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6}
                          name="Events"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Events by Severity
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Critical', value: alerts.filter(a => a.severity === 'critical').length },
                            { name: 'High', value: alerts.filter(a => a.severity === 'high').length },
                            { name: 'Medium', value: alerts.filter(a => a.severity === 'medium').length },
                            { name: 'Low', value: alerts.filter(a => a.severity === 'low').length }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label
                        >
                          {alerts.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={3}>
          {/* Compliance Tab */}
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Compliance Status
            </Typography>
            {complianceData && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Compliance Frameworks
                      </Typography>
                      {Object.entries(complianceData.frameworks || {}).map(([framework, score]: [string, any]) => (
                        <Box key={framework} mb={2}>
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1">
                              {framework.toUpperCase()}
                            </Typography>
                            <Typography variant="body1" color={score >= 90 ? 'success.main' : 'warning.main'}>
                              {score}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={score}
                            color={score >= 90 ? 'success' : 'warning'}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Compliance Issues
                      </Typography>
                      {complianceData.issues?.map((issue: any, index: number) => (
                        <Box key={index} mb={2}>
                          <Box display="flex" alignItems="center" gap={1}>
                            {getSeverityIcon(issue.severity)}
                            <Typography variant="subtitle2">
                              {issue.title}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {issue.description}
                          </Typography>
                        </Box>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={selectedTab} index={4}>
          {/* User Activity Tab */}
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Suspicious User Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This section would show user behavior analysis, anomalous login patterns, 
              and suspicious access attempts detected by the system.
            </Typography>
            {/* This would be populated with actual user activity data */}
          </Box>
        </TabPanel>
      </Paper>

      {/* Alert Detail Dialog */}
      <Dialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Security Alert Details
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    {getSeverityIcon(selectedAlert.severity)}
                    <Typography variant="h6">
                      {selectedAlert.title}
                    </Typography>
                    <Chip
                      label={selectedAlert.severity}
                      size="small"
                      color={getSeverityColor(selectedAlert.severity) as any}
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1" gutterBottom>
                    {selectedAlert.description}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Category</Typography>
                  <Typography variant="body2">{selectedAlert.category}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Source</Typography>
                  <Typography variant="body2">{selectedAlert.source}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Timestamp</Typography>
                  <Typography variant="body2">
                    {new Date(selectedAlert.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">Status</Typography>
                  <Chip
                    label={selectedAlert.status}
                    size="small"
                    color={getStatusColor(selectedAlert.status) as any}
                  />
                </Grid>
                {selectedAlert.ipAddress && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">IP Address</Typography>
                    <Typography variant="body2">{selectedAlert.ipAddress}</Typography>
                  </Grid>
                )}
                {selectedAlert.userEmail && (
                  <Grid item xs={6}>
                    <Typography variant="subtitle2">User</Typography>
                    <Typography variant="body2">{selectedAlert.userEmail}</Typography>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Tags</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                    {selectedAlert.tags.map(tag => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>
            Close
          </Button>
          {selectedAlert?.status === 'open' && (
            <>
              <Button
                color="info"
                onClick={() => handleAlertAction(selectedAlert._id, 'investigate')}
              >
                Investigate
              </Button>
              <Button
                color="warning"
                onClick={() => handleAlertAction(selectedAlert._id, 'false_positive')}
              >
                False Positive
              </Button>
              <Button
                color="success"
                onClick={() => handleAlertAction(selectedAlert._id, 'resolve', 'Resolved via dashboard')}
              >
                Resolve
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityMonitoringDashboard;