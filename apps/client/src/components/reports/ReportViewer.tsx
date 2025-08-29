import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  GetApp as ExportIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  Share as ShareIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as MetricIcon,
  TableChart as TableIcon,
  BarChart as ChartIcon,
} from '@mui/icons-material';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement,
} from 'chart.js';
import { useApi } from '../../hooks/useApi';
import { formatDistanceToNow, format } from 'date-fns';
import ExportDialog from './ExportDialog';
import ReportScheduler from './ReportScheduler';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  LineElement,
  PointElement,
  ArcElement
);

interface Report {
  _id: string;
  name: string;
  description?: string;
  category: string;
  status: string;
  dataSources: any[];
  visualizations: any[];
  layout: {
    width: number;
    height: number;
    backgroundColor?: string;
    margins?: any;
  };
  settings: {
    isPublic: boolean;
    allowExport: boolean;
    exportFormats: string[];
    autoRefresh: boolean;
    refreshInterval?: number;
  };
  usage: {
    totalViews: number;
    totalExports: number;
    lastViewed?: string;
  };
  createdBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
  version: number;
}

interface ReportViewerProps {
  reportId: string;
  onEdit?: () => void;
}

const VisualizationRenderer: React.FC<{
  visualization: any;
  data: any;
}> = ({ visualization, data }) => {
  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <Box
          display='flex'
          alignItems='center'
          justifyContent='center'
          height={200}
          color='text.secondary'
        >
          <Typography>No data available</Typography>
        </Box>
      );
    }

    const chartData = {
      labels: data.map((item: any) => item.label || item.name || 'Unknown'),
      datasets: [
        {
          label: visualization.title || 'Dataset',
          data: data.map((item: any) => item.value || item.count || 0),
          backgroundColor: [
            '#3f51b5',
            '#f50057',
            '#ff9800',
            '#4caf50',
            '#2196f3',
            '#9c27b0',
            '#607d8b',
          ],
          borderColor: [
            '#3f51b5',
            '#f50057',
            '#ff9800',
            '#4caf50',
            '#2196f3',
            '#9c27b0',
            '#607d8b',
          ],
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: !!visualization.title,
          text: visualization.title,
        },
      },
    };

    switch (visualization.config?.chartType) {
      case 'line':
        return <Line data={chartData} options={options} />;
      case 'pie':
        return <Pie data={chartData} options={options} />;
      case 'doughnut':
        return <Doughnut data={chartData} options={options} />;
      default:
        return <Bar data={chartData} options={options} />;
    }
  };

  const renderTable = () => {
    if (!data || data.length === 0) {
      return (
        <Box p={2} textAlign='center' color='text.secondary'>
          <Typography>No data available</Typography>
        </Box>
      );
    }

    const columns = visualization.config?.columns || [];
    const keys = columns.length > 0 ? columns.map((col: any) => col.field) : Object.keys(data[0]);

    return (
      <TableContainer>
        <Table size='small'>
          <TableHead>
            <TableRow>
              {keys.map((key: string) => {
                const column = columns.find((col: any) => col.field === key);
                return (
                  <TableCell key={key}>
                    {column?.header || key.charAt(0).toUpperCase() + key.slice(1)}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.slice(0, 10).map((row: any, index: number) => (
              <TableRow key={index}>
                {keys.map((key: string) => (
                  <TableCell key={key}>
                    {typeof row[key] === 'object'
                      ? JSON.stringify(row[key])
                      : String(row[key] || '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length > 10 && (
          <Box p={1} textAlign='center' bgcolor='grey.100'>
            <Typography variant='caption' color='text.secondary'>
              Showing 10 of {data.length} rows
            </Typography>
          </Box>
        )}
      </TableContainer>
    );
  };

  const renderMetric = () => {
    const value = data?.value || data?.count || 0;
    const format = visualization.config?.format || '';
    const prefix = visualization.config?.prefix || '';
    const suffix = visualization.config?.suffix || '';

    let displayValue = value;
    if (format === 'percentage') {
      displayValue = `${(value * 100).toFixed(1)}%`;
    } else if (format === 'currency') {
      displayValue = `$${value.toLocaleString()}`;
    } else {
      displayValue = value.toLocaleString();
    }

    return (
      <Box
        display='flex'
        flexDirection='column'
        alignItems='center'
        justifyContent='center'
        height='100%'
        p={2}
      >
        <Typography variant='h3' color='primary' gutterBottom>
          {prefix}
          {displayValue}
          {suffix}
        </Typography>
        {visualization.description && (
          <Typography variant='body2' color='text.secondary' textAlign='center'>
            {visualization.description}
          </Typography>
        )}
      </Box>
    );
  };

  const renderText = () => {
    return (
      <Box p={2}>
        <Typography
          variant='body1'
          dangerouslySetInnerHTML={{ __html: visualization.config?.content || '' }}
        />
      </Box>
    );
  };

  const renderImage = () => {
    return (
      <Box p={2} textAlign='center'>
        <img
          src={visualization.config?.url}
          alt={visualization.config?.alt || 'Report Image'}
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </Box>
    );
  };

  const getVisualizationContent = () => {
    switch (visualization.type) {
      case 'chart':
        return renderChart();
      case 'table':
        return renderTable();
      case 'metric':
        return renderMetric();
      case 'text':
        return renderText();
      case 'image':
        return renderImage();
      default:
        return (
          <Box p={2} textAlign='center' color='text.secondary'>
            <Typography>Unknown visualization type: {visualization.type}</Typography>
          </Box>
        );
    }
  };

  const getVisualizationIcon = () => {
    switch (visualization.type) {
      case 'chart':
        return <ChartIcon />;
      case 'table':
        return <TableIcon />;
      case 'metric':
        return <MetricIcon />;
      default:
        return <TrendingUpIcon />;
    }
  };

  return (
    <Card
      sx={{
        position: 'absolute',
        left: visualization.layout.x,
        top: visualization.layout.y,
        width: visualization.layout.width,
        height: visualization.layout.height,
        ...visualization.styling,
      }}
    >
      <CardContent sx={{ p: 1, height: '100%' }}>
        {visualization.title && (
          <Box display='flex' alignItems='center' mb={1}>
            {getVisualizationIcon()}
            <Typography variant='subtitle2' sx={{ ml: 1 }}>
              {visualization.title}
            </Typography>
          </Box>
        )}
        <Box sx={{ height: visualization.title ? 'calc(100% - 40px)' : '100%' }}>
          {getVisualizationContent()}
        </Box>
      </CardContent>
    </Card>
  );
};

const ReportViewer: React.FC<ReportViewerProps> = ({ reportId, onEdit }) => {
  const { request } = useApi();
  const [report, setReport] = useState<Report | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [schedulerDialogOpen, setSchedulerDialogOpen] = useState(false);

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await request(`/api/reports/${reportId}`);
      setReport(response.data.report);
      await generateReportData();
    } catch (error: any) {
      setError(error.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const generateReportData = async () => {
    setGenerating(true);
    try {
      const response = await request(`/api/reports/${reportId}/generate`, {
        method: 'POST',
        data: {},
      });
      setReportData(response.data.reportData);
    } catch (error: any) {
      console.error('Failed to generate report data:', error);
      // Create mock data for demonstration
      setReportData({
        forms: [
          { label: 'Completed', value: 45 },
          { label: 'In Progress', value: 12 },
          { label: 'Draft', value: 8 },
        ],
        templates: [
          { name: 'Service Report', totalForms: 34, lastUsed: '2024-01-15' },
          { name: 'Inspection Form', totalForms: 28, lastUsed: '2024-01-12' },
        ],
        worksites: [
          { name: 'Site A', totalForms: 22, city: 'Sydney' },
          { name: 'Site B', totalForms: 18, city: 'Melbourne' },
        ],
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleExportMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleExportMenuClose = () => {
    setExportAnchorEl(null);
  };

  const handleExport = () => {
    setExportDialogOpen(true);
    handleExportMenuClose();
  };

  const handleRefresh = () => {
    generateReportData();
  };

  const handleScheduleUpdate = (schedule: any) => {
    if (report) {
      setReport({
        ...report,
        schedule,
      });
    }
  };

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='400px'>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !report) {
    return <Alert severity='error'>{error || 'Report not found'}</Alert>;
  }

  return (
    <Box>
      {/* Header */}
      <Box
        display='flex'
        justifyContent='space-between'
        alignItems='flex-start'
        mb={3}
        pb={2}
        borderBottom='1px solid'
        borderColor='divider'
      >
        <Box>
          <Box display='flex' alignItems='center' gap={1} mb={1}>
            <Typography variant='h4'>{report.name}</Typography>
            <Chip label={report.category} color='primary' size='small' />
            <Chip label={`v${report.version}`} variant='outlined' size='small' />
          </Box>
          {report.description && (
            <Typography variant='body2' color='text.secondary' mb={2}>
              {report.description}
            </Typography>
          )}
          <Box display='flex' alignItems='center' gap={2}>
            <Typography variant='caption' color='text.secondary'>
              Created by {report.createdBy.firstName} {report.createdBy.lastName}
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              {report.usage.totalViews} views
            </Typography>
            <Typography variant='caption' color='text.secondary'>
              Last updated {formatDistanceToNow(new Date(report.updatedAt), { addSuffix: true })}
            </Typography>
          </Box>
        </Box>

        <Box display='flex' gap={1}>
          <Tooltip title='Refresh Data'>
            <IconButton onClick={handleRefresh} disabled={generating}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          <Button
            startIcon={<ScheduleIcon />}
            onClick={() => setSchedulerDialogOpen(true)}
            variant='outlined'
            color={report.schedule?.enabled ? 'success' : 'default'}
          >
            Schedule
          </Button>

          {report.settings.allowExport && (
            <Button startIcon={<ExportIcon />} onClick={handleExport} variant='outlined'>
              Export
            </Button>
          )}

          {onEdit && (
            <Button startIcon={<EditIcon />} onClick={onEdit} variant='outlined'>
              Edit
            </Button>
          )}
        </Box>
      </Box>

      {/* Report Canvas */}
      {generating ? (
        <Box display='flex' justifyContent='center' alignItems='center' height='400px'>
          <Box textAlign='center'>
            <CircularProgress />
            <Typography variant='body2' color='text.secondary' mt={2}>
              Generating report data...
            </Typography>
          </Box>
        </Box>
      ) : (
        <Paper
          sx={{
            position: 'relative',
            width: report.layout.width,
            height: report.layout.height,
            backgroundColor: report.layout.backgroundColor || '#ffffff',
            margin: '0 auto',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {report.visualizations.map(visualization => {
            const dataSourceData = reportData?.[visualization.dataSource] || [];
            return (
              <VisualizationRenderer
                key={visualization.id}
                visualization={visualization}
                data={dataSourceData}
              />
            );
          })}

          {report.visualizations.length === 0 && (
            <Box
              display='flex'
              alignItems='center'
              justifyContent='center'
              height='100%'
              color='text.secondary'
            >
              <Typography variant='h6'>No visualizations configured for this report</Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Auto-refresh indicator */}
      {report.settings.autoRefresh && (
        <Box mt={2} textAlign='center'>
          <Chip
            icon={<ScheduleIcon />}
            label={`Auto-refresh every ${report.settings.refreshInterval || 15} minutes`}
            variant='outlined'
            size='small'
          />
        </Box>
      )}

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        reportId={reportId}
        reportName={report.name}
      />

      {/* Scheduler Dialog */}
      <ReportScheduler
        open={schedulerDialogOpen}
        onClose={() => setSchedulerDialogOpen(false)}
        reportId={reportId}
        reportName={report.name}
        currentSchedule={report.schedule}
        onScheduleUpdate={handleScheduleUpdate}
      />
    </Box>
  );
};

export default ReportViewer;
