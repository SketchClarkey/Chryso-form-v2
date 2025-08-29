import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Badge,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Collapse,
  Divider,
  Avatar
} from '@mui/material';
import {
  Security as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as SuccessIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  NotificationsActive as AlertIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  PlayArrow as InvestigateIcon,
  Done as ResolveIcon,
  NotInterested as FalsePositiveIcon,
  Schedule as TimeIcon,
  Person as PersonIcon,
  Computer as ComputerIcon
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

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

interface SecurityAlertCenterProps {
  embedded?: boolean;
  height?: number;
  autoRefresh?: boolean;
  onAlertClick?: (alert: SecurityAlert) => void;
}

const SecurityAlertCenter: React.FC<SecurityAlertCenterProps> = ({
  embedded = false,
  height = 400,
  autoRefresh = true,
  onAlertClick
}) => {
  const { request } = useApi();
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  
  // Filter states
  const [showOnlyOpen, setShowOnlyOpen] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string[]>(['critical', 'high']);

  useEffect(() => {
    loadAlerts();
    
    if (autoRefresh) {
      const interval = setInterval(loadAlerts, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, showOnlyOpen, severityFilter]);

  const loadAlerts = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        timeRange: '24h',
        limit: '20',
        ...(severityFilter.length > 0 && { severity: severityFilter.join(',') })
      });

      const response = await request(`/api/security/alerts?${params}`);
      let alertsData = response.data.alerts;

      // Filter by status if needed
      if (showOnlyOpen) {
        alertsData = alertsData.filter((alert: SecurityAlert) => 
          alert.status === 'open' || alert.status === 'investigating'
        );
      }

      setAlerts(alertsData);
    } catch (error: any) {
      console.error('Failed to load security alerts:', error);
      setError(error.response?.data?.message || 'Failed to load security alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleAlertAction = async (alertId: string, action: string, resolution?: string) => {
    try {
      await request(`/api/security/alerts/${alertId}`, {
        method: 'PATCH',
        data: { action, resolution }
      });
      
      loadAlerts();
      setActionDialogOpen(false);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update alert');
    }
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

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const criticalCount = alerts.filter(alert => alert.severity === 'critical').length;
  const highCount = alerts.filter(alert => alert.severity === 'high').length;
  const openCount = alerts.filter(alert => alert.status === 'open').length;

  return (
    <Card sx={{ height: embedded ? height : 'auto' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Badge badgeContent={openCount} color="error">
              <AlertIcon />
            </Badge>
            <Typography variant="h6">
              Security Alerts
            </Typography>
          </Box>
          <Box display="flex" gap={1}>
            {criticalCount > 0 && (
              <Chip 
                label={`${criticalCount} Critical`} 
                color="error" 
                size="small" 
                variant="outlined"
              />
            )}
            {highCount > 0 && (
              <Chip 
                label={`${highCount} High`} 
                color="warning" 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {alerts.length === 0 && !loading && (
          <Box textAlign="center" py={4}>
            <SuccessIcon color="success" fontSize="large" />
            <Typography variant="body2" color="text.secondary" mt={1}>
              No security alerts at this time
            </Typography>
          </Box>
        )}

        <List sx={{ maxHeight: embedded ? height - 100 : 'none', overflow: 'auto' }}>
          {alerts.map((alert) => (
            <React.Fragment key={alert._id}>
              <ListItem
                button
                onClick={() => {
                  if (onAlertClick) {
                    onAlertClick(alert);
                  } else {
                    setExpandedAlert(expandedAlert === alert._id ? null : alert._id);
                  }
                }}
                sx={{
                  border: 1,
                  borderColor: `${getSeverityColor(alert.severity)}.main`,
                  borderRadius: 1,
                  mb: 1,
                  bgcolor: alert.severity === 'critical' ? 'error.light' : 'transparent'
                }}
              >
                <ListItemIcon>
                  {getSeverityIcon(alert.severity)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="subtitle2">
                        {alert.title}
                      </Typography>
                      <Chip
                        label={alert.category}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={alert.status}
                        size="small"
                        color={getStatusColor(alert.status) as any}
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {alert.description}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <TimeIcon fontSize="small" />
                          <Typography variant="caption">
                            {getTimeAgo(alert.timestamp)}
                          </Typography>
                        </Box>
                        {alert.userEmail && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <PersonIcon fontSize="small" />
                            <Typography variant="caption">
                              {alert.userEmail}
                            </Typography>
                          </Box>
                        )}
                        {alert.ipAddress && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <ComputerIcon fontSize="small" />
                            <Typography variant="caption">
                              {alert.ipAddress}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedAlert(expandedAlert === alert._id ? null : alert._id);
                    }}
                  >
                    {expandedAlert === alert._id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>

              <Collapse in={expandedAlert === alert._id} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 4, pr: 2, pb: 2 }}>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Source:</strong> {alert.source}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Timestamp:</strong> {new Date(alert.timestamp).toLocaleString()}
                  </Typography>
                  
                  {alert.tags && alert.tags.length > 0 && (
                    <Box mt={1} mb={2}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Tags:</strong>
                      </Typography>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {alert.tags.map(tag => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </Box>
                  )}

                  {alert.status === 'open' && (
                    <Box display="flex" gap={1} mt={2}>
                      <Button
                        size="small"
                        startIcon={<InvestigateIcon />}
                        onClick={() => {
                          setSelectedAlert(alert);
                          setActionDialogOpen(true);
                        }}
                      >
                        Investigate
                      </Button>
                      <Button
                        size="small"
                        color="success"
                        startIcon={<ResolveIcon />}
                        onClick={() => handleAlertAction(alert._id, 'resolve', 'Resolved from alert center')}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="small"
                        color="info"
                        startIcon={<FalsePositiveIcon />}
                        onClick={() => handleAlertAction(alert._id, 'false_positive')}
                      >
                        False Positive
                      </Button>
                    </Box>
                  )}

                  {alert.status === 'resolved' && alert.resolution && (
                    <Box mt={2}>
                      <Typography variant="body2">
                        <strong>Resolution:</strong> {alert.resolution}
                      </Typography>
                      {alert.resolvedBy && (
                        <Typography variant="caption" color="text.secondary">
                          Resolved by {alert.resolvedBy} on {new Date(alert.resolvedAt!).toLocaleString()}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Box>
              </Collapse>
            </React.Fragment>
          ))}
        </List>
      </CardContent>

      {/* Action Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Alert Actions</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedAlert.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {selectedAlert.description}
              </Typography>
              
              <Box mt={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Available Actions:
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Button
                    variant="outlined"
                    startIcon={<InvestigateIcon />}
                    onClick={() => handleAlertAction(selectedAlert._id, 'investigate')}
                  >
                    Mark as Investigating
                  </Button>
                  <Button
                    variant="outlined"
                    color="success"
                    startIcon={<ResolveIcon />}
                    onClick={() => handleAlertAction(selectedAlert._id, 'resolve', 'Manually resolved')}
                  >
                    Resolve Alert
                  </Button>
                  <Button
                    variant="outlined"
                    color="info"
                    startIcon={<FalsePositiveIcon />}
                    onClick={() => handleAlertAction(selectedAlert._id, 'false_positive')}
                  >
                    Mark as False Positive
                  </Button>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default SecurityAlertCenter;