import { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  Avatar,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Description as FormsIcon,
  People as UsersIcon,
  Business as WorksitesIcon,
  Assignment as TemplatesIcon,
  Assessment as ReportsIcon,
  Analytics as AnalyticsIcon,
  Search as SearchIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Archive as ArchiveIcon,
  Settings as SettingsIcon,
  AccountCircle,
  Logout,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { Dashboard } from '../../pages/Dashboard';
import { Forms } from '../../pages/Forms';
import { Users } from '../../pages/Users';
import { Worksites } from '../../pages/Worksites';
import { Templates } from '../../pages/Templates';
import { Reports } from '../../pages/Reports';
import { Analytics } from '../../pages/Analytics';
import { SearchDashboard } from '../../pages/SearchDashboard';
import { AdvancedFiltering } from '../../pages/AdvancedFiltering';
import { Settings } from '../../pages/Settings';
import { Profile } from '../../pages/Profile';

const drawerWidth = 280;

interface NavigationItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navigationItems: NavigationItem[] = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
  },
  {
    path: '/forms',
    label: 'Forms',
    icon: <FormsIcon />,
  },
  {
    path: '/templates',
    label: 'Templates',
    icon: <TemplatesIcon />,
    roles: ['admin', 'manager'],
  },
  {
    path: '/worksites',
    label: 'Worksites',
    icon: <WorksitesIcon />,
    roles: ['admin', 'manager'],
  },
  {
    path: '/users',
    label: 'Users',
    icon: <UsersIcon />,
    roles: ['admin', 'manager'],
  },
  {
    path: '/reports',
    label: 'Reports',
    icon: <ReportsIcon />,
  },
  {
    path: '/analytics',
    label: 'Analytics',
    icon: <AnalyticsIcon />,
    roles: ['admin', 'manager'],
  },
  {
    path: '/search',
    label: 'Search',
    icon: <SearchIcon />,
  },
  {
    path: '/filters',
    label: 'Advanced Filters',
    icon: <SearchIcon />,
    roles: ['admin', 'manager'],
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    roles: ['admin'],
  },
];

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const filteredNavigationItems = navigationItems.filter(item => {
    if (!item.roles) return true;
    return user?.role && item.roles.includes(user.role);
  });

  const drawer = (
    <Box>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant='h6' component='div' color='primary' fontWeight={600}>
          Chryso Forms
        </Typography>
      </Box>
      <Divider />
      <List>
        {filteredNavigationItems.map(item => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) {
                  setMobileOpen(false);
                }
              }}
              sx={{
                mx: 1,
                borderRadius: 1,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position='fixed'
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color='inherit'
            aria-label='open drawer'
            edge='start'
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant='h6' noWrap component='div' sx={{ flexGrow: 1 }}>
            {filteredNavigationItems.find(item => item.path === location.pathname)?.label ||
              'Dashboard'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant='body2' sx={{ mr: 1, display: { xs: 'none', sm: 'block' } }}>
              {user?.fullName}
            </Typography>
            <IconButton
              size='large'
              aria-label='account of current user'
              aria-controls='menu-appbar'
              aria-haspopup='true'
              onClick={handleMenuOpen}
              color='inherit'
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        id='menu-appbar'
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            handleMenuClose();
            navigate('/profile');
          }}
        >
          <ListItemIcon>
            <AccountCircle fontSize='small' />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <Settings fontSize='small' />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize='small' />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Box component='nav' sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant='temporary'
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant='permanent'
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component='main'
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Routes>
          <Route path='/dashboard' element={<Dashboard />} />
          <Route path='/forms' element={<Forms />} />
          <Route path='/forms/:id' element={<Forms />} />
          <Route path='/templates/*' element={<Templates />} />
          <Route path='/worksites' element={<Worksites />} />
          <Route path='/users' element={<Users />} />
          <Route path='/reports/*' element={<Reports />} />
          <Route path='/analytics/*' element={<Analytics />} />
          <Route path='/search/*' element={<SearchDashboard />} />
          <Route path='/filters/*' element={<AdvancedFiltering />} />
          <Route path='/settings/*' element={<Settings />} />
          <Route path='/profile' element={<Profile />} />
        </Routes>
      </Box>
    </Box>
  );
}
