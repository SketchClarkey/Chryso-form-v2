import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BottomNavigation,
  BottomNavigationAction,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as FormsIcon,
  Analytics as AnalyticsIcon,
  Person as ProfileIcon,
  Menu as MenuIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Sync as SyncIcon,
  CloudOff as OfflineIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import PWAService from '../../services/pwaService';

interface MobileNavigationProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
}

export function MobileNavigation({ children, showBottomNav = true }: MobileNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const pwaService = PWAService.getInstance();

  const bottomNavItems = [
    { value: '/dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { value: '/forms', label: 'Forms', icon: <FormsIcon /> },
    { value: '/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    { value: '/profile', label: 'Profile', icon: <ProfileIcon /> },
  ];

  const getCurrentBottomNavValue = () => {
    const path = location.pathname;
    const item = bottomNavItems.find(item => path.startsWith(item.value));
    return item?.value || '/dashboard';
  };

  const handleBottomNavChange = (_: any, newValue: string) => {
    navigate(newValue);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleSync = async () => {
    try {
      await pwaService.triggerSync();
      // Show sync status
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/forms')) {
      if (path.includes('/new') || path.includes('/edit')) return 'Form Editor';
      return 'Forms';
    }
    if (path.startsWith('/analytics')) return 'Analytics';
    if (path.startsWith('/profile')) return 'Profile';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Chryso Forms';
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top App Bar */}
      <AppBar position="static" sx={{ zIndex: 1201 }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {getPageTitle()}
          </Typography>

          {isOffline && (
            <IconButton color="inherit" onClick={handleSync}>
              <Badge color="warning" variant="dot">
                <OfflineIcon />
              </Badge>
            </IconButton>
          )}

          <IconButton color="inherit">
            <Badge badgeContent={0} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <IconButton
            color="inherit"
            onClick={handleMenuClick}
          >
            <ProfileIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Side Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 280, pt: 2 }}>
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="h6">Chryso Forms</Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.name} ({user?.role})
            </Typography>
          </Box>
          <Divider />
          
          <List>
            <ListItem button onClick={() => { navigate('/dashboard'); setDrawerOpen(false); }}>
              <ListItemIcon><DashboardIcon /></ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            
            <ListItem button onClick={() => { navigate('/forms'); setDrawerOpen(false); }}>
              <ListItemIcon><FormsIcon /></ListItemIcon>
              <ListItemText primary="Forms" />
            </ListItem>
            
            <ListItem button onClick={() => { navigate('/forms/new'); setDrawerOpen(false); }}>
              <ListItemIcon><AddIcon /></ListItemIcon>
              <ListItemText primary="New Form" />
            </ListItem>
            
            <ListItem button onClick={() => { navigate('/analytics'); setDrawerOpen(false); }}>
              <ListItemIcon><AnalyticsIcon /></ListItemIcon>
              <ListItemText primary="Analytics" />
            </ListItem>
            
            <Divider sx={{ my: 1 }} />
            
            <ListItem button onClick={() => { navigate('/settings'); setDrawerOpen(false); }}>
              <ListItemIcon><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItem>
            
            <ListItem button onClick={handleSync}>
              <ListItemIcon><SyncIcon /></ListItemIcon>
              <ListItemText primary="Sync Data" />
            </ListItem>
            
            <ListItem button onClick={handleLogout}>
              <ListItemIcon><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Profile Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
          <ProfileIcon sx={{ mr: 1 }} />
          Profile
        </MenuItem>
        <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
          <SettingsIcon sx={{ mr: 1 }} />
          Settings
        </MenuItem>
        <MenuItem onClick={handleSync}>
          <SyncIcon sx={{ mr: 1 }} />
          Sync Data
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1 }} />
          Logout
        </MenuItem>
      </Menu>

      {/* Main Content */}
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        pb: showBottomNav ? 7 : 0 
      }}>
        {children}
      </Box>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <Paper 
          sx={{ 
            position: 'fixed', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 1000 
          }} 
          elevation={3}
        >
          <BottomNavigation
            value={getCurrentBottomNavValue()}
            onChange={handleBottomNavChange}
          >
            {bottomNavItems.map((item) => (
              <BottomNavigationAction
                key={item.value}
                value={item.value}
                label={item.label}
                icon={item.icon}
              />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
}