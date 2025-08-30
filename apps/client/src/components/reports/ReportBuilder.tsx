import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Box,
  Button,
  Card,
  CardContent,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  TableChart,
  BarChart,
  PieChart,
  Assessment,
  TextFields,
  Image,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface DataSource {
  id: string;
  type: 'form' | 'template' | 'worksite' | 'user';
  name: string;
  description: string;
  fields: Array<{
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'object';
    path: string;
  }>;
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
    logic?: 'and' | 'or';
  }>;
}

interface Visualization {
  id: string;
  type: 'table' | 'chart' | 'metric' | 'text' | 'image';
  title?: string;
  description?: string;
  dataSource: string;
  config: any;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styling?: any;
}

interface Report {
  id?: string;
  name: string;
  description?: string;
  category: 'operational' | 'analytical' | 'compliance' | 'financial' | 'custom';
  dataSources: DataSource[];
  visualizations: Visualization[];
  layout: {
    width: number;
    height: number;
    backgroundColor?: string;
    margins?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  settings: {
    isPublic: boolean;
    allowExport: boolean;
    exportFormats: Array<'pdf' | 'excel' | 'csv' | 'image'>;
    autoRefresh: boolean;
    refreshInterval?: number;
    cacheTimeout?: number;
  };
}

const ItemTypes = {
  VISUALIZATION: 'visualization',
  COMPONENT: 'component',
};

const DraggableComponent: React.FC<{
  type: string;
  icon: React.ReactNode;
  name: string;
}> = ({ type, icon, name }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.COMPONENT,
    item: { type, name },
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
        border: '1px solid #ddd',
        borderRadius: 1,
        mb: 1,
        '&:hover': { bgcolor: 'grey.100' },
      }}
    >
      {icon}
      <ListItemText primary={name} sx={{ ml: 1 }} />
    </ListItem>
  );
};

const DropCanvas: React.FC<{
  visualizations: Visualization[];
  onDrop: (item: any, offset: { x: number; y: number }) => void;
  onVisualizationUpdate: (id: string, updates: Partial<Visualization>) => void;
  onVisualizationDelete: (id: string) => void;
}> = ({ visualizations, onDrop, onVisualizationUpdate, onVisualizationDelete }) => {
  const [{ canDrop, isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.COMPONENT,
    drop: (item: any, monitor) => {
      const offset = monitor.getClientOffset();
      if (offset) {
        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (canvasRect) {
          const x = offset.x - canvasRect.left;
          const y = offset.y - canvasRect.top;
          onDrop(item, { x, y });
        }
      }
    },
    collect: monitor => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const canvasRef = React.useRef<HTMLDivElement>(null);
  const isActive = canDrop && isOver;

  return (
    <Paper
      ref={drop}
      sx={{
        position: 'relative',
        minHeight: 600,
        width: '100%',
        backgroundColor: isActive ? 'action.hover' : 'background.default',
        border: '2px dashed',
        borderColor: isActive ? 'primary.main' : 'grey.300',
        p: 2,
      }}
    >
      <div ref={canvasRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
        {visualizations.map(viz => (
          <DraggableVisualization
            key={viz.id}
            visualization={viz}
            onUpdate={onVisualizationUpdate}
            onDelete={onVisualizationDelete}
          />
        ))}
        {visualizations.length === 0 && (
          <Box
            display='flex'
            alignItems='center'
            justifyContent='center'
            height='100%'
            color='text.secondary'
          >
            <Typography variant='h6'>Drag components here to build your report</Typography>
          </Box>
        )}
      </div>
    </Paper>
  );
};

const DraggableVisualization: React.FC<{
  visualization: Visualization;
  onUpdate: (id: string, updates: Partial<Visualization>) => void;
  onDelete: (id: string) => void;
}> = ({ visualization, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);

  const getIcon = (type: string) => {
    switch (type) {
      case 'table':
        return <TableChart />;
      case 'chart':
        return <BarChart />;
      case 'metric':
        return <Assessment />;
      case 'text':
        return <TextFields />;
      case 'image':
        return <Image />;
      default:
        return <BarChart />;
    }
  };

  return (
    <>
      <Box
        sx={{
          position: 'absolute',
          left: visualization.layout.x,
          top: visualization.layout.y,
          width: visualization.layout.width,
          height: visualization.layout.height,
          border: '1px solid',
          borderColor: 'grey.400',
          borderRadius: 1,
          backgroundColor: 'background.paper',
          p: 1,
          cursor: 'move',
          '&:hover': {
            borderColor: 'primary.main',
            '& .visualization-controls': { opacity: 1 },
          },
        }}
      >
        <Box
          className='visualization-controls'
          sx={{
            position: 'absolute',
            top: -35,
            right: 0,
            display: 'flex',
            gap: 0.5,
            opacity: 0,
            transition: 'opacity 0.2s',
          }}
        >
          <IconButton
            size='small'
            onClick={() => setIsEditing(true)}
            sx={{ bgcolor: 'background.paper' }}
          >
            <EditIcon fontSize='small' />
          </IconButton>
          <IconButton
            size='small'
            onClick={() => onDelete(visualization.id)}
            sx={{ bgcolor: 'background.paper', color: 'error.main' }}
          >
            <DeleteIcon fontSize='small' />
          </IconButton>
        </Box>

        <Box display='flex' alignItems='center' mb={1}>
          {getIcon(visualization.type)}
          <Typography variant='subtitle2' sx={{ ml: 1 }}>
            {visualization.title || `${visualization.type} Component`}
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
          <Typography variant='body2'>
            {visualization.type.charAt(0).toUpperCase() + visualization.type.slice(1)} Preview
          </Typography>
        </Box>
      </Box>

      <Dialog open={isEditing} onClose={() => setIsEditing(false)} maxWidth='md' fullWidth>
        <DialogTitle>Edit {visualization.type} Component</DialogTitle>
        <DialogContent>
          <VisualizationEditor
            visualization={visualization}
            onChange={updates => onUpdate(visualization.id, updates)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditing(false)}>Cancel</Button>
          <Button onClick={() => setIsEditing(false)} variant='contained'>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const VisualizationEditor: React.FC<{
  visualization: Visualization;
  onChange: (updates: Partial<Visualization>) => void;
}> = ({ visualization, onChange }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
        <Tab label='General' />
        <Tab label='Data' />
        <Tab label='Styling' />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label='Title'
                value={visualization.title || ''}
                onChange={e => onChange({ title: e.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label='Description'
                value={visualization.description || ''}
                onChange={e => onChange({ description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Data Source</InputLabel>
                <Select
                  value={visualization.dataSource}
                  onChange={e => onChange({ dataSource: e.target.value as string })}
                >
                  <MenuItem value='forms'>Form Submissions</MenuItem>
                  <MenuItem value='templates'>Templates</MenuItem>
                  <MenuItem value='worksites'>Worksites</MenuItem>
                  <MenuItem value='users'>Users</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {visualization.type === 'chart' && (
              <Grid size={{ xs: 12 }}>
                <FormControl fullWidth>
                  <InputLabel>Chart Type</InputLabel>
                  <Select
                    value={visualization.config?.chartType || 'bar'}
                    onChange={e =>
                      onChange({
                        config: { ...visualization.config, chartType: e.target.value },
                      })
                    }
                  >
                    <MenuItem value='bar'>Bar Chart</MenuItem>
                    <MenuItem value='line'>Line Chart</MenuItem>
                    <MenuItem value='pie'>Pie Chart</MenuItem>
                    <MenuItem value='doughnut'>Doughnut Chart</MenuItem>
                    <MenuItem value='area'>Area Chart</MenuItem>
                    <MenuItem value='scatter'>Scatter Chart</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        )}

        {activeTab === 2 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label='Background Color'
                type='color'
                value={visualization.styling?.backgroundColor || '#ffffff'}
                onChange={e =>
                  onChange({
                    styling: { ...visualization.styling, backgroundColor: e.target.value },
                  })
                }
              />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField
                fullWidth
                label='Border Color'
                type='color'
                value={visualization.styling?.borderColor || '#dddddd'}
                onChange={e =>
                  onChange({
                    styling: { ...visualization.styling, borderColor: e.target.value },
                  })
                }
              />
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

const ReportBuilder: React.FC<{ reportId?: string }> = ({ reportId }) => {
  const { request } = useApi();
  const [report, setReport] = useState<Report>({
    name: 'New Report',
    category: 'custom',
    dataSources: [],
    visualizations: [],
    layout: {
      width: 1200,
      height: 800,
      backgroundColor: '#ffffff',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
    },
    settings: {
      isPublic: false,
      allowExport: true,
      exportFormats: ['pdf', 'excel'],
      autoRefresh: false,
      refreshInterval: 15,
      cacheTimeout: 5,
    },
  });

  const [availableDataSources, setAvailableDataSources] = useState<DataSource[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDataSources();
    if (reportId) {
      loadReport(reportId);
    }
  }, [reportId]);

  const loadDataSources = async () => {
    try {
      const response = await request('/api/reports/meta/datasources');
      setAvailableDataSources(response.data.dataSources);
    } catch (error) {
      console.error('Failed to load data sources:', error);
    }
  };

  const loadReport = async (id: string) => {
    try {
      const response = await request(`/api/reports/${id}`);
      setReport(response.data.report);
    } catch (error) {
      console.error('Failed to load report:', error);
    }
  };

  const handleDrop = (item: any, offset: { x: number; y: number }) => {
    const newVisualization: Visualization = {
      id: `${item.type}-${Date.now()}`,
      type: item.type,
      title: `New ${item.name}`,
      dataSource: availableDataSources[0]?.id || 'forms',
      config: {},
      layout: {
        x: Math.max(0, offset.x - 100),
        y: Math.max(0, offset.y - 50),
        width: 300,
        height: 200,
      },
    };

    setReport(prev => ({
      ...prev,
      visualizations: [...prev.visualizations, newVisualization],
    }));
  };

  const handleVisualizationUpdate = (id: string, updates: Partial<Visualization>) => {
    setReport(prev => ({
      ...prev,
      visualizations: prev.visualizations.map(viz =>
        viz.id === id ? { ...viz, ...updates } : viz
      ),
    }));
  };

  const handleVisualizationDelete = (id: string) => {
    setReport(prev => ({
      ...prev,
      visualizations: prev.visualizations.filter(viz => viz.id !== id),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (reportId) {
        await request(`/api/reports/${reportId}`, {
          method: 'PUT',
          data: report,
        });
      } else {
        await request('/api/reports', {
          method: 'POST',
          data: report,
        });
      }
    } catch (error) {
      console.error('Failed to save report:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Drawer
          variant='persistent'
          anchor='left'
          open={sidebarOpen}
          sx={{
            width: 320,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 320,
              boxSizing: 'border-box',
              position: 'relative',
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Report Builder
            </Typography>

            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Components</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  <DraggableComponent type='table' icon={<TableChart />} name='Data Table' />
                  <DraggableComponent type='chart' icon={<BarChart />} name='Chart' />
                  <DraggableComponent type='metric' icon={<Assessment />} name='Metric' />
                  <DraggableComponent type='text' icon={<TextFields />} name='Text Block' />
                  <DraggableComponent type='image' icon={<Image />} name='Image' />
                </List>
              </AccordionDetails>
            </Accordion>

            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>Report Settings</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label='Report Name'
                      value={report.name}
                      onChange={e => setReport({ ...report, name: e.target.value })}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Category</InputLabel>
                      <Select
                        value={report.category}
                        onChange={e =>
                          setReport({
                            ...report,
                            category: e.target.value as Report['category'],
                          })
                        }
                      >
                        <MenuItem value='operational'>Operational</MenuItem>
                        <MenuItem value='analytical'>Analytical</MenuItem>
                        <MenuItem value='compliance'>Compliance</MenuItem>
                        <MenuItem value='financial'>Financial</MenuItem>
                        <MenuItem value='custom'>Custom</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Box>
        </Drawer>

        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box display='flex' justifyContent='between' alignItems='center'>
              <Typography variant='h5'>{report.name}</Typography>
              <Box display='flex' gap={1}>
                <Button
                  variant='outlined'
                  startIcon={<SettingsIcon />}
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  Settings
                </Button>
                <Button
                  variant='contained'
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Report'}
                </Button>
              </Box>
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, p: 2, overflow: 'auto' }}>
            <DropCanvas
              visualizations={report.visualizations}
              onDrop={handleDrop}
              onVisualizationUpdate={handleVisualizationUpdate}
              onVisualizationDelete={handleVisualizationDelete}
            />
          </Box>
        </Box>
      </Box>
    </DndProvider>
  );
};

export default ReportBuilder;
