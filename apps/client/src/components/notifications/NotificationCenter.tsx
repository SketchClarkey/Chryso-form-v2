import { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NotificationsNone as NotificationsNoneIcon,
  MarkEmailRead as MarkReadIcon,
  Delete as DeleteIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Form as FormIcon,
  Business as WorksiteIcon,
  Person as UserIcon,
  Engineering as EquipmentIcon,
  Computer as SystemIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  notificationService,
  Notification,
  NotificationSettings,
  NotificationType,
  NotificationPriority,
} from '../../services/notificationService';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <SuccessIcon color='success' />;
    case 'warning':
      return <WarningIcon color='warning' />;
    case 'error':
      return <ErrorIcon color='error' />;
    default:
      return <InfoIcon color='info' />;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'form':
      return <FormIcon />;
    case 'worksite':
      return <WorksiteIcon />;
    case 'user':
      return <UserIcon />;
    case 'equipment':
      return <EquipmentIcon />;
    case 'system':
      return <SystemIcon />;
    default:
      return <InfoIcon />;
  }
};

const getPriorityColor = (priority: NotificationPriority) => {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return <div hidden={value !== index}>{value === index && <Box>{children}</Box>}</div>;
}

export function NotificationCenter() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getNotifications({ limit: 50 }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch notification settings
  const { data: settings } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => notificationService.getSettings(),
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (notificationIds: string[]) => notificationService.markAsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (notificationId: string) => notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Partial<NotificationSettings>) =>
      notificationService.updateSettings(newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
    },
  });

  // Real-time notification listening
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(notification => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    notificationService.startListening();

    return () => {
      unsubscribe();
      notificationService.stopListening();
    };
  }, [queryClient]);

  const notifications = notificationData?.notifications || [];
  const unreadCount = notificationData?.unreadCount || 0;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate([notificationId]);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDeleteNotification = (notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }

    handleMenuClose();
  };

  const filteredNotifications = notifications.filter(notification => {
    if (selectedTab === 0) return !notification.isRead; // Unread
    if (selectedTab === 1) return true; // All
    if (selectedTab === 2)
      return notification.priority === 'urgent' || notification.priority === 'high'; // Important
    return true;
  });

  const handleSettingsChange = (path: string, value: boolean) => {
    if (!settings) return;

    const pathParts = path.split('.');
    const newSettings = { ...settings };
    let current: any = newSettings;

    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = value;

    updateSettingsMutation.mutate(newSettings);
  };

  return (
    <>
      <IconButton size='large' color='inherit' onClick={handleMenuOpen}>
        <Badge badgeContent={unreadCount} color='error'>
          {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { width: 400, maxHeight: 600 },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant='h6'>Notifications</Typography>
            <Box>
              <IconButton size='small' onClick={() => setSettingsDialogOpen(true)}>
                <SettingsIcon />
              </IconButton>
              {unreadCount > 0 && (
                <IconButton size='small' onClick={handleMarkAllAsRead}>
                  <MarkReadIcon />
                </IconButton>
              )}
            </Box>
          </Box>

          <Tabs
            value={selectedTab}
            onChange={(_, newValue) => setSelectedTab(newValue)}
            sx={{ mt: 1 }}
          >
            <Tab label={`Unread (${unreadCount})`} />
            <Tab label='All' />
            <Tab label='Important' />
          </Tabs>
        </Box>

        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant='body2' color='text.secondary'>
                No notifications
              </Typography>
            </Box>
          ) : (
            <List>
              {filteredNotifications.map((notification, index) => (
                <Box key={notification.id}>
                  <ListItem
                    button
                    onClick={() => handleNotificationClick(notification)}
                    sx={{
                      backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                      '&:hover': { backgroundColor: 'action.selected' },
                    }}
                  >
                    <ListItemIcon>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getCategoryIcon(notification.category)}
                        {getNotificationIcon(notification.type)}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant='subtitle2' noWrap>
                            {notification.title}
                          </Typography>
                          <Chip
                            label={notification.priority}
                            size='small'
                            color={getPriorityColor(notification.priority)}
                            variant='outlined'
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant='body2' color='text.secondary' noWrap>
                            {notification.message}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {formatTimestamp(notification.createdAt)}
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size='small'
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                      >
                        <DeleteIcon fontSize='small' />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < filteredNotifications.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </Box>

        {notifications.length > 0 && (
          <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
            <Button
              fullWidth
              size='small'
              onClick={() => {
                // Navigate to full notifications page
                handleMenuClose();
              }}
            >
              View All Notifications
            </Button>
          </Box>
        )}
      </Menu>

      {/* Settings Dialog */}
      <Dialog
        open={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Notification Settings</DialogTitle>
        <DialogContent>
          {settings && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Email Notifications
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.email.enabled}
                          onChange={e => handleSettingsChange('email.enabled', e.target.checked)}
                        />
                      }
                      label='Enable Email Notifications'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.email.formStatusChanges}
                          onChange={e =>
                            handleSettingsChange('email.formStatusChanges', e.target.checked)
                          }
                          disabled={!settings.email.enabled}
                        />
                      }
                      label='Form Status Changes'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.email.formAssignments}
                          onChange={e =>
                            handleSettingsChange('email.formAssignments', e.target.checked)
                          }
                          disabled={!settings.email.enabled}
                        />
                      }
                      label='Form Assignments'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.email.equipmentAlerts}
                          onChange={e =>
                            handleSettingsChange('email.equipmentAlerts', e.target.checked)
                          }
                          disabled={!settings.email.enabled}
                        />
                      }
                      label='Equipment Alerts'
                    />
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    Push Notifications
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.push.enabled}
                          onChange={e => handleSettingsChange('push.enabled', e.target.checked)}
                        />
                      }
                      label='Enable Push Notifications'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.push.formStatusChanges}
                          onChange={e =>
                            handleSettingsChange('push.formStatusChanges', e.target.checked)
                          }
                          disabled={!settings.push.enabled}
                        />
                      }
                      label='Form Status Changes'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.push.urgentOnly}
                          onChange={e => handleSettingsChange('push.urgentOnly', e.target.checked)}
                          disabled={!settings.push.enabled}
                        />
                      }
                      label='Urgent Only'
                    />
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    In-App Notifications
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.inApp.enabled}
                          onChange={e => handleSettingsChange('inApp.enabled', e.target.checked)}
                        />
                      }
                      label='Enable In-App Notifications'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.inApp.showDesktopNotifications}
                          onChange={e =>
                            handleSettingsChange('inApp.showDesktopNotifications', e.target.checked)
                          }
                          disabled={!settings.inApp.enabled}
                        />
                      }
                      label='Desktop Notifications'
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.inApp.playSound}
                          onChange={e => handleSettingsChange('inApp.playSound', e.target.checked)}
                          disabled={!settings.inApp.enabled}
                        />
                      }
                      label='Play Sound'
                    />
                  </Box>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
