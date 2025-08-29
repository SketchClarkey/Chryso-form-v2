import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  FormControlLabel,
  FormGroup,
  Checkbox,
  RadioGroup,
  Radio,
  FormLabel,
  Box,
  LinearProgress,
  Alert,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Description as CsvIcon,
  Image as ImageIcon,
  GetApp as DownloadIcon,
  Settings as SettingsIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface ExportFormat {
  format: string;
  name: string;
  description: string;
  icon: string;
  options: {
    pageSize?: string[];
    orientation?: string[];
    includeCharts?: boolean;
    includeData?: boolean;
  };
}

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  reportId: string;
  reportName: string;
}

const getFormatIcon = (iconName: string) => {
  const icons: { [key: string]: React.ReactElement } = {
    picture_as_pdf: <PdfIcon />,
    table_chart: <ExcelIcon />,
    description: <CsvIcon />,
    image: <ImageIcon />,
  };
  return icons[iconName] || <DownloadIcon />;
};

const ExportDialog: React.FC<ExportDialogProps> = ({ open, onClose, reportId, reportName }) => {
  const { request } = useApi();
  const [formats, setFormats] = useState<ExportFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [exportOptions, setExportOptions] = useState({
    includeCharts: true,
    includeData: true,
    pageSize: 'A4',
    orientation: 'portrait',
  });
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canExport, setCanExport] = useState(false);

  useEffect(() => {
    if (open) {
      loadExportFormats();
    }
  }, [open, reportId]);

  const loadExportFormats = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await request(`/api/reports/${reportId}/export-formats`);
      setFormats(response.data.formats);
      setCanExport(response.data.canExport);

      if (response.data.formats.length > 0) {
        setSelectedFormat(response.data.formats[0].format);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to load export formats');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selectedFormat || !canExport) return;

    setExporting(true);
    setError(null);

    try {
      const response = await request(`/api/reports/${reportId}/export`, {
        method: 'POST',
        data: {
          format: selectedFormat,
          ...exportOptions,
        },
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().slice(0, 10);
      const extension = selectedFormat === 'excel' ? 'xlsx' : selectedFormat;
      link.download = `${reportName.replace(/[^a-zA-Z0-9\-_]/g, '_')}_${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const selectedFormatObj = formats.find(f => f.format === selectedFormat);

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        <Box display='flex' alignItems='center' gap={1}>
          <DownloadIcon />
          Export Report: {reportName}
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display='flex' justifyContent='center' alignItems='center' height='200px'>
            <LinearProgress sx={{ width: '100%' }} />
          </Box>
        ) : error ? (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : !canExport ? (
          <Alert severity='warning' sx={{ mb: 2 }}>
            You don't have permission to export this report.
          </Alert>
        ) : (
          <>
            {/* Format Selection */}
            <Typography variant='h6' gutterBottom>
              Choose Export Format
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {formats.map(format => (
                <Grid item xs={12} sm={6} md={3} key={format.format}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      border: selectedFormat === format.format ? 2 : 1,
                      borderColor: selectedFormat === format.format ? 'primary.main' : 'divider',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                    onClick={() => setSelectedFormat(format.format)}
                  >
                    <CardContent sx={{ textAlign: 'center', p: 2 }}>
                      <Box color='primary.main' mb={1}>
                        {getFormatIcon(format.icon)}
                      </Box>
                      <Typography variant='subtitle2' gutterBottom>
                        {format.name}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {format.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Export Options */}
            {selectedFormatObj && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant='h6' gutterBottom>
                  <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Export Options
                </Typography>

                <Grid container spacing={3}>
                  {/* Include Options */}
                  <Grid item xs={12} md={6}>
                    <FormControl component='fieldset'>
                      <FormLabel component='legend'>Include</FormLabel>
                      <FormGroup>
                        {selectedFormatObj.options.includeCharts && (
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={exportOptions.includeCharts}
                                onChange={e =>
                                  setExportOptions({
                                    ...exportOptions,
                                    includeCharts: e.target.checked,
                                  })
                                }
                              />
                            }
                            label='Charts and Visualizations'
                          />
                        )}
                        {selectedFormatObj.options.includeData && (
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={exportOptions.includeData}
                                onChange={e =>
                                  setExportOptions({
                                    ...exportOptions,
                                    includeData: e.target.checked,
                                  })
                                }
                              />
                            }
                            label='Raw Data Tables'
                          />
                        )}
                      </FormGroup>
                    </FormControl>
                  </Grid>

                  {/* Page Options (for PDF) */}
                  {selectedFormatObj.options.pageSize && (
                    <Grid item xs={12} md={6}>
                      <FormControl component='fieldset'>
                        <FormLabel component='legend'>Page Size</FormLabel>
                        <RadioGroup
                          value={exportOptions.pageSize}
                          onChange={e =>
                            setExportOptions({
                              ...exportOptions,
                              pageSize: e.target.value,
                            })
                          }
                        >
                          {selectedFormatObj.options.pageSize.map(size => (
                            <FormControlLabel
                              key={size}
                              value={size}
                              control={<Radio />}
                              label={size}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                  )}

                  {/* Orientation Options (for PDF) */}
                  {selectedFormatObj.options.orientation && (
                    <Grid item xs={12} md={6}>
                      <FormControl component='fieldset'>
                        <FormLabel component='legend'>Orientation</FormLabel>
                        <RadioGroup
                          value={exportOptions.orientation}
                          onChange={e =>
                            setExportOptions({
                              ...exportOptions,
                              orientation: e.target.value,
                            })
                          }
                        >
                          {selectedFormatObj.options.orientation.map(orientation => (
                            <FormControlLabel
                              key={orientation}
                              value={orientation}
                              control={<Radio />}
                              label={orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                  )}
                </Grid>

                {/* Format-specific Information */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant='subtitle2' gutterBottom>
                    About {selectedFormatObj.name}
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {selectedFormatObj.description}
                  </Typography>

                  {selectedFormat === 'pdf' && (
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary='Perfect for: Reports, presentations, sharing'
                          secondary='Includes formatted charts, tables, and text with consistent layout'
                        />
                      </ListItem>
                    </List>
                  )}

                  {selectedFormat === 'excel' && (
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary='Perfect for: Data analysis, further processing'
                          secondary='Multiple sheets with raw data, formulas, and pivot table ready'
                        />
                      </ListItem>
                    </List>
                  )}

                  {selectedFormat === 'csv' && (
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary='Perfect for: Data import, simple analysis'
                          secondary='Plain text format compatible with any spreadsheet application'
                        />
                      </ListItem>
                    </List>
                  )}

                  {selectedFormat === 'png' && (
                    <List dense>
                      <ListItem>
                        <ListItemText
                          primary='Perfect for: Presentations, web sharing'
                          secondary='High-resolution image suitable for embedding in documents'
                        />
                      </ListItem>
                    </List>
                  )}
                </Box>
              </>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={exporting}>
          Cancel
        </Button>
        <Button
          onClick={handleExport}
          variant='contained'
          disabled={!selectedFormat || !canExport || exporting}
          startIcon={exporting ? <LinearProgress size={20} /> : <DownloadIcon />}
        >
          {exporting ? 'Exporting...' : 'Export'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
