import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  DragIndicator as DragIcon,
  Assessment as MetricIcon,
  BarChart as ChartIcon,
  TableChart as TableIcon,
  TextFields as TextIcon,
  FilterList as FilterIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  Palette as PaletteIcon,
  GridOn as GridIcon,
} from '@mui/icons-material';
import { Responsive, WidthProvider } from 'react-grid-layout';
import { useApi } from '../../hooks/useApi';

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
    minWidth?: number;
    minHeight?: number;
  };
  styling?: {
    backgroundColor?: string;
    borderColor?: string;
    textColor?: string;
    borderRadius?: number;
    shadow?: boolean;
    padding?: number;
  };
  visibility?: {
    roles: string[];
  };
}

interface Dashboard {
  id?: string;
  name: string;
  description?: string;
  category: 'personal' | 'team' | 'organization' | 'public';
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
  permissions: {
    canView: string[];
    canEdit: string[];
    canShare: string[];
  };
}

const ItemTypes = {
  WIDGET: 'widget',
  WIDGET_TYPE: 'widget_type',
};

const WidgetTypeItem: React.FC<{
  type: string;
  icon: React.ReactNode;
  name: string;
  description: string;
}> = ({ type, icon, name, description }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.WIDGET_TYPE,
    item: { type, name, description },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <ListItem
      ref={drag}
      sx={{
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        mb: 1,
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText
        primary={name}
        secondary={description}
        secondaryTypographyProps={{ variant: 'caption' }}
      />
    </ListItem>
  );
};

const DashboardCanvas: React.FC<{
  widgets: Widget[];
  layout: Dashboard['layout'];
  onWidgetAdd: (type: string, position: { x: number; y: number }) => void;
  onWidgetUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  onWidgetDelete: (widgetId: string) => void;
  onLayoutChange: (layout: any[]) => void;
}> = ({ widgets, layout, onWidgetAdd, onWidgetUpdate, onWidgetDelete, onLayoutChange }) => {
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.WIDGET_TYPE,
    drop: (item: any, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset) {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const x = Math.floor((offset.x - canvasRect.left) / (canvasRect.width / layout.columns));
          const y = Math.floor((offset.y - canvasRect.top) / 60); // Approximate row height
          onWidgetAdd(item.type, {
            x: Math.max(0, Math.min(x, layout.columns - 2)),
            y: Math.max(0, y),
          });
        }
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const canvasRef = React.useRef<HTMLDivElement>(null);

  const gridLayouts = widgets.map(widget => ({
    i: widget.id,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.width,
    h: widget.layout.height,
    minW: widget.layout.minWidth || 1,
    minH: widget.layout.minHeight || 1,
  }));

  const handleLayoutChange = (newLayout: any[]) => {
    onLayoutChange(newLayout);
  };

  const renderWidget = (widget: Widget) => (
    <Card key={widget.id} sx={{ height: '100%', ...widget.styling }}>
      <CardContent sx={{ height: '100%', position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
            opacity: 0,
            transition: 'opacity 0.2s',
            '.MuiCard-root:hover &': { opacity: 1 },
          }}
        >
          <IconButton
            size='small'
            onClick={() => onWidgetUpdate(widget.id, widget)}
            sx={{ bgcolor: 'background.paper' }}
          >
            <EditIcon fontSize='small' />
          </IconButton>
          <IconButton
            size='small'
            onClick={() => onWidgetDelete(widget.id)}
            color='error'
            sx={{ bgcolor: 'background.paper' }}
          >
            <DeleteIcon fontSize='small' />
          </IconButton>
        </Box>

        <Box display='flex' alignItems='center' mb={1}>
          {getWidgetTypeIcon(widget.type)}
          <Typography variant='subtitle2' sx={{ ml: 1 }}>
            {widget.title}
          </Typography>
        </Box>

        <Box
          sx={{
            height: 'calc(100% - 40px)',
            border: '1px dashed',
            borderColor: 'grey.300',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          <Typography variant='body2'>{widget.description || `${widget.type} Widget`}</Typography>
        </Box>
      </CardContent>
    </Card>
  );

  const getWidgetTypeIcon = (type: string) => {
    switch (type) {
      case 'metric':
        return <MetricIcon fontSize='small' />;
      case 'chart':
        return <ChartIcon fontSize='small' />;
      case 'table':
        return <TableIcon fontSize='small' />;
      case 'text':
        return <TextIcon fontSize='small' />;
      case 'filter':
        return <FilterIcon fontSize='small' />;
      default:
        return <MetricIcon fontSize='small' />;
    }
  };

  return (
    <Paper
      ref={drop}
      sx={{
        position: 'relative',
        minHeight: 600,
        width: '100%',
        backgroundColor:
          isOver && canDrop ? 'action.hover' : layout.backgroundColor || 'background.default',
        border: '2px dashed',
        borderColor: isOver && canDrop ? 'primary.main' : 'grey.300',
        p: layout.padding / 8,
      }}
    >
      <div ref={canvasRef} style={{ width: '100%', height: '100%' }}>
        {widgets.length > 0 ? (
          <ResponsiveGridLayout
            className='layout'
            layouts={{ lg: gridLayouts }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: layout.columns, md: layout.columns, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={60}
            margin={[layout.gap, layout.gap]}
            onLayoutChange={handleLayoutChange}
            draggableHandle='.drag-handle'
            resizeHandles={['se']}
          >
            {widgets.map(renderWidget)}
          </ResponsiveGridLayout>
        ) : (
          <Box
            display='flex'
            alignItems='center'
            justifyContent='center'
            height='100%'
            color='text.secondary'
          >
            <Typography variant='h6'>Drag widgets here to build your dashboard</Typography>
          </Box>
        )}
      </div>
    </Paper>
  );
};

const WidgetEditor: React.FC<{
  widget: Widget | null;
  open: boolean;
  onClose: () => void;
  onSave: (widget: Widget) => void;
}> = ({ widget, open, onClose, onSave }) => {
  const [editedWidget, setEditedWidget] = useState<Widget | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (widget) {
      setEditedWidget({ ...widget });
    }
  }, [widget]);

  if (!editedWidget) return null;

  const handleSave = () => {
    onSave(editedWidget);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>Edit Widget: {editedWidget.title}</DialogTitle>
      <DialogContent>
        <Box sx={{ width: '100%', mt: 2 }}>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label='General' />
            <Tab label='Configuration' />
            <Tab label='Styling' />
            <Tab label='Visibility' />
          </Tabs>

          {/* General Tab */}
          {activeTab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Grid2 container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label='Widget Title'
                    value={editedWidget.title}
                    onChange={e => setEditedWidget({ ...editedWidget, title: e.target.value })}
                  />
                </Grid2>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label='Description'
                    value={editedWidget.description || ''}
                    onChange={e =>
                      setEditedWidget({ ...editedWidget, description: e.target.value })
                    }
                    multiline
                    rows={3}
                  />
                </Grid2>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label='Width'
                    type='number'
                    value={editedWidget.layout.width}
                    onChange={e =>
                      setEditedWidget({
                        ...editedWidget,
                        layout: { ...editedWidget.layout, width: parseInt(e.target.value) },
                      })
                    }
                    inputProps={{ min: 1, max: 12 }}
                  />
                </Grid2>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label='Height'
                    type='number'
                    value={editedWidget.layout.height}
                    onChange={e =>
                      setEditedWidget({
                        ...editedWidget,
                        layout: { ...editedWidget.layout, height: parseInt(e.target.value) },
                      })
                    }
                    inputProps={{ min: 1, max: 20 }}
                  />
                </Grid2>
              </Grid2>
            </Box>
          )}

          {/* Configuration Tab */}
          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant='h6' gutterBottom>
                Widget Configuration
              </Typography>
              {editedWidget.type === 'metric' && (
                <Grid2 container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Metric</InputLabel>
                      <Select
                        value={editedWidget.config?.metric || ''}
                        onChange={e =>
                          setEditedWidget({
                            ...editedWidget,
                            config: { ...editedWidget.config, metric: e.target.value },
                          })
                        }
                      >
                        <MenuItem value='totalForms'>Total Forms</MenuItem>
                        <MenuItem value='completedForms'>Completed Forms</MenuItem>
                        <MenuItem value='activeUsers'>Active Users</MenuItem>
                        <MenuItem value='avgCompletionTime'>Avg Completion Time</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid2>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Format</InputLabel>
                      <Select
                        value={editedWidget.config?.format || 'number'}
                        onChange={e =>
                          setEditedWidget({
                            ...editedWidget,
                            config: { ...editedWidget.config, format: e.target.value },
                          })
                        }
                      >
                        <MenuItem value='number'>Number</MenuItem>
                        <MenuItem value='percentage'>Percentage</MenuItem>
                        <MenuItem value='currency'>Currency</MenuItem>
                        <MenuItem value='time'>Time</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid2>
                </Grid2>
              )}

              {editedWidget.type === 'chart' && (
                <Grid2 container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Chart Type</InputLabel>
                      <Select
                        value={editedWidget.config?.chartType || 'bar'}
                        onChange={e =>
                          setEditedWidget({
                            ...editedWidget,
                            config: { ...editedWidget.config, chartType: e.target.value },
                          })
                        }
                      >
                        <MenuItem value='bar'>Bar Chart</MenuItem>
                        <MenuItem value='line'>Line Chart</MenuItem>
                        <MenuItem value='pie'>Pie Chart</MenuItem>
                        <MenuItem value='doughnut'>Doughnut Chart</MenuItem>
                        <MenuItem value='area'>Area Chart</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid2>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Data Source</InputLabel>
                      <Select
                        value={editedWidget.config?.dataSource || ''}
                        onChange={e =>
                          setEditedWidget({
                            ...editedWidget,
                            config: { ...editedWidget.config, dataSource: e.target.value },
                          })
                        }
                      >
                        <MenuItem value='forms'>Forms</MenuItem>
                        <MenuItem value='templates'>Templates</MenuItem>
                        <MenuItem value='worksites'>Worksites</MenuItem>
                        <MenuItem value='users'>Users</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid2>
                </Grid2>
              )}

              {editedWidget.type === 'text' && (
                <Grid2 container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label='Content'
                      value={editedWidget.config?.content || ''}
                      onChange={e =>
                        setEditedWidget({
                          ...editedWidget,
                          config: { ...editedWidget.config, content: e.target.value },
                        })
                      }
                      multiline
                      rows={6}
                      placeholder='Enter your text content here...'
                    />
                  </Grid2>
                </Grid2>
              )}
            </Box>
          )}

          {/* Styling Tab */}
          {activeTab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Grid2 container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label='Background Color'
                    type='color'
                    value={editedWidget.styling?.backgroundColor || '#ffffff'}
                    onChange={e =>
                      setEditedWidget({
                        ...editedWidget,
                        styling: { ...editedWidget.styling, backgroundColor: e.target.value },
                      })
                    }
                  />
                </Grid2>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label='Border Color'
                    type='color'
                    value={editedWidget.styling?.borderColor || '#dddddd'}
                    onChange={e =>
                      setEditedWidget({
                        ...editedWidget,
                        styling: { ...editedWidget.styling, borderColor: e.target.value },
                      })
                    }
                  />
                </Grid2>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    fullWidth
                    label='Border Radius'
                    type='number'
                    value={editedWidget.styling?.borderRadius || 4}
                    onChange={e =>
                      setEditedWidget({
                        ...editedWidget,
                        styling: {
                          ...editedWidget.styling,
                          borderRadius: parseInt(e.target.value),
                        },
                      })
                    }
                    inputProps={{ min: 0, max: 50 }}
                  />
                </Grid2>
                <Grid size={{ xs: 6 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editedWidget.styling?.shadow || false}
                        onChange={e =>
                          setEditedWidget({
                            ...editedWidget,
                            styling: { ...editedWidget.styling, shadow: e.target.checked },
                          })
                        }
                      />
                    }
                    label='Drop Shadow'
                  />
                </Grid2>
              </Grid2>
            </Box>
          )}

          {/* Visibility Tab */}
          {activeTab === 3 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant='subtitle2' gutterBottom>
                Visible to Roles
              </Typography>
              <Box display='flex' gap={1} flexWrap='wrap'>
                {['admin', 'manager', 'technician'].map(role => (
                  <Chip
                    key={role}
                    label={role}
                    clickable
                    color={editedWidget.visibility?.roles?.includes(role) ? 'primary' : 'default'}
                    onClick={() => {
                      const currentRoles = editedWidget.visibility?.roles || [];
                      const newRoles = currentRoles.includes(role)
                        ? currentRoles.filter(r => r !== role)
                        : [...currentRoles, role];

                      setEditedWidget({
                        ...editedWidget,
                        visibility: { ...editedWidget.visibility, roles: newRoles },
                      });
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant='contained'>
          Save Widget
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const DashboardBuilder: React.FC<{ dashboardId?: string }> = ({ dashboardId }) => {
  const { request } = useApi();
  const [dashboard, setDashboard] = useState<Dashboard>({
    name: 'New Dashboard',
    category: 'personal',
    tags: [],
    layout: {
      type: 'grid',
      columns: 12,
      gap: 16,
      padding: 16,
    },
    widgets: [],
    settings: {
      autoRefresh: false,
      theme: 'light',
      fullscreen: false,
      showHeader: true,
      showFilters: true,
    },
    permissions: {
      canView: ['admin', 'manager', 'technician'],
      canEdit: ['admin'],
      canShare: ['admin', 'manager'],
    },
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dashboardId) {
      loadDashboard();
    }
  }, [dashboardId]);

  const loadDashboard = async () => {
    if (!dashboardId) return;

    setLoading(true);
    try {
      const response = await get('/api/dashboards/${dashboardId}');
      setDashboard(response.data.dashboard);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWidgetAdd = (type: string, position: { x: number; y: number }) => {
    const newWidget: Widget = {
      id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: type as any,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      config: {},
      layout: {
        x: position.x,
        y: position.y,
        width: type === 'metric' ? 3 : type === 'text' ? 6 : 4,
        height: type === 'table' ? 6 : type === 'chart' ? 4 : 2,
        minWidth: 2,
        minHeight: 1,
      },
      styling: {
        backgroundColor: '#ffffff',
        borderRadius: 4,
        shadow: true,
      },
      visibility: {
        roles: ['admin', 'manager', 'technician'],
      },
    };

    setDashboard({
      ...dashboard,
      widgets: [...dashboard.widgets, newWidget],
    });
  };

  const handleWidgetUpdate = (widgetId: string, updates: Partial<Widget>) => {
    setDashboard({
      ...dashboard,
      widgets: dashboard.widgets.map(widget =>
        widget.id === widgetId ? { ...widget, ...updates } : widget
      ),
    });
  };

  const handleWidgetDelete = (widgetId: string) => {
    setDashboard({
      ...dashboard,
      widgets: dashboard.widgets.filter(widget => widget.id !== widgetId),
    });
  };

  const handleLayoutChange = (newLayout: any[]) => {
    const updatedWidgets = dashboard.widgets.map(widget => {
      const layoutItem = newLayout.find(item => item.i === widget.id);
      if (layoutItem) {
        return {
          ...widget,
          layout: {
            ...widget.layout,
            x: layoutItem.x,
            y: layoutItem.y,
            width: layoutItem.w,
            height: layoutItem.h,
          },
        };
      }
      return widget;
    });

    setDashboard({
      ...dashboard,
      widgets: updatedWidgets,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (dashboardId) {
        await request(`/api/dashboards/${dashboardId}`, {
          method: 'PUT',
          data: dashboard,
        });
      } else {
        const response = await request('/api/dashboards', {
          method: 'POST',
          data: dashboard,
        });
        // Navigate to the new dashboard or handle success
        console.log('Dashboard created:', response.data.dashboard);
      }
    } catch (error) {
      console.error('Failed to save dashboard:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='400px'>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <Drawer
          variant='persistent'
          anchor='left'
          open={sidebarOpen}
          sx={{
            width: 300,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 300,
              boxSizing: 'border-box',
              position: 'relative',
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Dashboard Builder
            </Typography>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Widgets</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  <WidgetTypeItem
                    type='metric'
                    icon={<MetricIcon />}
                    name='Metric'
                    description='Display key performance indicators'
                  />
                  <WidgetTypeItem
                    type='chart'
                    icon={<ChartIcon />}
                    name='Chart'
                    description='Visualize data with various chart types'
                  />
                  <WidgetTypeItem
                    type='table'
                    icon={<TableIcon />}
                    name='Table'
                    description='Display data in tabular format'
                  />
                  <WidgetTypeItem
                    type='text'
                    icon={<TextIcon />}
                    name='Text'
                    description='Add custom text and descriptions'
                  />
                  <WidgetTypeItem
                    type='filter'
                    icon={<FilterIcon />}
                    name='Filter'
                    description='Interactive data filters'
                  />
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Dashboard Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid2 container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label='Dashboard Name'
                      value={dashboard.name}
                      onChange={e => setDashboard({ ...dashboard, name: e.target.value })}
                    />
                  </Grid2>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={dashboard.category}
                        onChange={e =>
                          setDashboard({
                            ...dashboard,
                            category: e.target.value as Dashboard['category'],
                          })
                        }
                      >
                        <MenuItem value='personal'>Personal</MenuItem>
                        <MenuItem value='team'>Team</MenuItem>
                        <MenuItem value='organization'>Organization</MenuItem>
                        <MenuItem value='public'>Public</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid2>
                  <Grid size={{ xs: 12 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={dashboard.settings.autoRefresh}
                          onChange={e =>
                            setDashboard({
                              ...dashboard,
                              settings: { ...dashboard.settings, autoRefresh: e.target.checked },
                            })
                          }
                        />
                      }
                      label='Auto Refresh'
                    />
                  </Grid2>
                </Grid2>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box display='flex' justifyContent='space-between' alignItems='center'>
              <Typography variant='h5'>{dashboard.name}</Typography>
              <Box display='flex' gap={1}>
                <Button
                  variant='outlined'
                  startIcon={<GridIcon />}
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? 'Hide' : 'Show'} Sidebar
                </Button>
                <Button
                  variant='contained'
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Dashboard'}
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Canvas */}
          <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
            <DashboardCanvas
              widgets={dashboard.widgets}
              layout={dashboard.layout}
              onWidgetAdd={handleWidgetAdd}
              onWidgetUpdate={(widgetId, updates) => {
                if (updates === dashboard.widgets.find(w => w.id === widgetId)) {
                  // This is an edit request - open the editor
                  setEditingWidget(dashboard.widgets.find(w => w.id === widgetId) || null);
                } else {
                  handleWidgetUpdate(widgetId, updates);
                }
              }}
              onWidgetDelete={handleWidgetDelete}
              onLayoutChange={handleLayoutChange}
            />
          </Box>
        </Box>

        {/* Widget Editor */}
        <WidgetEditor
          widget={editingWidget}
          open={!!editingWidget}
          onClose={() => setEditingWidget(null)}
          onSave={widget => handleWidgetUpdate(widget.id, widget)}
        />
      </Box>
    </DndProvider>
  );
};

export default DashboardBuilder;
