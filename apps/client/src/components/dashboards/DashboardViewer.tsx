import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid2,
  Paper,
  IconButton,
  Button,
  Switch,
  FormControlLabel,
  Fab,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useApi } from '../../hooks/useApi';
import { MetricWidget } from './widgets/MetricWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { TableWidget } from './widgets/TableWidget';
import { TextWidget } from './widgets/TextWidget';
import { FilterWidget } from './widgets/FilterWidget';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'text' | 'filter';
  title: string;
  description?: string;
  config: any;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styling?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    borderRadius?: number;
    shadow?: boolean;
  };
  visibility?: {
    roles: string[];
  };
}

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  layout: {
    type: 'grid' | 'freeform';
    columns: number;
    gap: number;
    padding: number;
    backgroundColor?: string;
  };
  widgets: Widget[];
  settings: {
    autoRefresh: boolean;
    refreshInterval?: number;
    theme: 'light' | 'dark' | 'auto';
    fullscreen: boolean;
    showHeader: boolean;
    showFilters: boolean;
  };
  createdBy: {
    firstName: string;
    lastName: string;
  };
  updatedAt: Date;
}

interface WidgetData {
  widgetId: string;
  data: any;
  error?: string;
  lastUpdated: Date;
}

interface DashboardViewerProps {
  dashboardId: string;
  editable?: boolean;
  onEdit?: () => void;
}

const DashboardViewer: React.FC<DashboardViewerProps> = ({
  dashboardId,
  editable = false,
  onEdit,
}) => {
  const { request } = useApi();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [widgetData, setWidgetData] = useState<WidgetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    loadDashboard();
  }, [dashboardId]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (autoRefresh && dashboard?.settings.refreshInterval) {
      intervalId = setInterval(() => {
        loadDashboardData(true);
      }, dashboard.settings.refreshInterval * 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, dashboard?.settings.refreshInterval]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await get('/api/dashboards/${dashboardId}');
      const dashboardData = response.data.dashboard;
      setDashboard(dashboardData);
      setAutoRefresh(dashboardData.settings.autoRefresh);
      setFullscreen(dashboardData.settings.fullscreen);

      // Load dashboard data
      await loadDashboardData();
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async (forceRefresh = false) => {
    if (!dashboard && !forceRefresh) return;

    setRefreshing(true);
    try {
      const response = await get('/api/dashboards/${dashboardId}/data?refresh=${forceRefresh}');
      setWidgetData(response.data.widgets);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const toggleFullscreen = () => {
    setFullscreen(!fullscreen);
  };

  const renderWidget = (widget: Widget) => {
    const data = widgetData.find(d => d.widgetId === widget.id);

    const widgetProps = {
      widget,
      data: data?.data,
      error: data?.error,
      loading: !data && refreshing,
      lastUpdated: data?.lastUpdated,
    };

    const WidgetComponent = () => {
      switch (widget.type) {
        case 'metric':
          return <MetricWidget {...widgetProps} />;
        case 'chart':
          return <ChartWidget {...widgetProps} />;
        case 'table':
          return <TableWidget {...widgetProps} />;
        case 'text':
          return <TextWidget {...widgetProps} />;
        case 'filter':
          return <FilterWidget {...widgetProps} />;
        default:
          return (
            <Card sx={{ height: '100%', ...widget.styling }}>
              <CardContent>
                <Typography variant='h6'>{widget.title}</Typography>
                <Typography color='error'>Unknown widget type: {widget.type}</Typography>
              </CardContent>
            </Card>
          );
      }
    };

    return <WidgetComponent key={widget.id} />;
  };

  const getGridLayouts = () => {
    if (!dashboard) return { lg: [] };

    const layouts = dashboard.widgets.map(widget => ({
      i: widget.id,
      x: widget.layout.x,
      y: widget.layout.y,
      w: widget.layout.width,
      h: widget.layout.height,
      static: true, // Make widgets non-draggable in view mode
    }));

    return { lg: layouts };
  };

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='400px'>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!dashboard) {
    return (
      <Alert severity='warning' sx={{ mb: 2 }}>
        Dashboard not found
      </Alert>
    );
  }

  const containerStyle = {
    minHeight: fullscreen ? '100vh' : 'auto',
    backgroundColor: dashboard.layout.backgroundColor || 'background.default',
    padding: fullscreen ? 0 : dashboard.layout.padding / 8,
    position: fullscreen ? 'fixed' : 'relative',
    top: fullscreen ? 0 : 'auto',
    left: fullscreen ? 0 : 'auto',
    width: fullscreen ? '100vw' : '100%',
    height: fullscreen ? '100vh' : 'auto',
    zIndex: fullscreen ? 1300 : 'auto',
    overflow: fullscreen ? 'auto' : 'visible',
  };

  return (
    <Box sx={containerStyle}>
      {/* Header */}
      {dashboard.settings.showHeader && !fullscreen && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant='h4' gutterBottom>
              {dashboard.name}
            </Typography>
            {dashboard.description && (
              <Typography variant='body1' color='text.secondary' gutterBottom>
                {dashboard.description}
              </Typography>
            )}
            <Box display='flex' gap={1} mb={1}>
              <Chip label={dashboard.category} size='small' color='primary' variant='outlined' />
              {dashboard.tags.map((tag, index) => (
                <Chip key={index} label={tag} size='small' variant='outlined' />
              ))}
            </Box>
            <Typography variant='caption' color='text.secondary'>
              Created by {dashboard.createdBy.firstName} {dashboard.createdBy.lastName} • Last
              updated {new Date(dashboard.updatedAt).toLocaleDateString()}
            </Typography>
          </Box>
          <Box display='flex' gap={1}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                  size='small'
                />
              }
              label='Auto Refresh'
            />
            <Tooltip title='Refresh Data'>
              <IconButton onClick={handleRefresh} disabled={refreshing}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title='Fullscreen'>
              <IconButton onClick={toggleFullscreen}>
                <FullscreenIcon />
              </IconButton>
            </Tooltip>
            {editable && (
              <Tooltip title='Edit Dashboard'>
                <IconButton onClick={onEdit}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
            )}
            <IconButton onClick={handleMenuOpen}>
              <MoreIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Fullscreen Header */}
      {fullscreen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 64,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 3,
            zIndex: 1301,
          }}
        >
          <Typography variant='h6'>{dashboard.name}</Typography>
          <Box display='flex' gap={1} alignItems='center'>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                  size='small'
                />
              }
              label='Auto Refresh'
            />
            <IconButton onClick={handleRefresh} disabled={refreshing}>
              <RefreshIcon />
            </IconButton>
            <IconButton onClick={toggleFullscreen}>
              <FullscreenExitIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* Dashboard Content */}
      <Box sx={{ mt: fullscreen ? 8 : 0 }}>
        {refreshing && (
          <Box display='flex' justifyContent='center' mb={2}>
            <CircularProgress size={24} />
          </Box>
        )}

        {dashboard.widgets.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant='h6' gutterBottom>
              No widgets configured
            </Typography>
            <Typography variant='body2' color='text.secondary' mb={2}>
              This dashboard doesn't have any widgets yet.
            </Typography>
            {editable && (
              <Button variant='contained' onClick={onEdit} startIcon={<EditIcon />}>
                Edit Dashboard
              </Button>
            )}
          </Paper>
        ) : (
          <ResponsiveGridLayout
            className='layout'
            layouts={getGridLayouts()}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{
              lg: dashboard.layout.columns,
              md: dashboard.layout.columns,
              sm: 6,
              xs: 4,
              xxs: 2,
            }}
            rowHeight={60}
            margin={[dashboard.layout.gap, dashboard.layout.gap]}
            isDraggable={false}
            isResizable={false}
            useCSSTransforms={true}
          >
            {dashboard.widgets.map(renderWidget)}
          </ResponsiveGridLayout>
        )}
      </Box>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleRefresh}>
          <RefreshIcon sx={{ mr: 1 }} />
          Refresh Data
        </MenuItem>
        <MenuItem onClick={toggleFullscreen}>
          <FullscreenIcon sx={{ mr: 1 }} />
          {fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </MenuItem>
        {editable && (
          <MenuItem onClick={onEdit}>
            <EditIcon sx={{ mr: 1 }} />
            Edit Dashboard
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          <ShareIcon sx={{ mr: 1 }} />
          Share Dashboard
        </MenuItem>
      </Menu>

      {/* Refresh FAB (fullscreen only) */}
      {fullscreen && (
        <Fab
          color='primary'
          size='small'
          onClick={handleRefresh}
          disabled={refreshing}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1302,
          }}
        >
          <RefreshIcon />
        </Fab>
      )}
    </Box>
  );
};

export default DashboardViewer;
