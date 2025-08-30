import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Tabs,
  Tab,
  Alert,
  Skeleton,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Visibility as PreviewIcon,
  Code as CodeIcon,
  Smartphone as MobileIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface EmailTemplatePreviewProps {
  open: boolean;
  onClose: () => void;
  template: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role='tabpanel' hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const EmailTemplatePreview: React.FC<EmailTemplatePreviewProps> = ({ open, onClose, template }) => {
  const { request } = useApi();
  const [currentTab, setCurrentTab] = useState(0);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [language, setLanguage] = useState('en');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    if (template && open) {
      // Initialize variables with example values
      const initialVariables: Record<string, any> = {};
      template.variables?.forEach((variable: any) => {
        if (variable.example !== undefined) {
          initialVariables[variable.name] = variable.example;
        } else if (variable.defaultValue !== undefined) {
          initialVariables[variable.name] = variable.defaultValue;
        } else {
          // Provide sensible defaults based on type
          switch (variable.type) {
            case 'string':
              initialVariables[variable.name] = `Sample ${variable.name}`;
              break;
            case 'number':
              initialVariables[variable.name] = 42;
              break;
            case 'date':
              initialVariables[variable.name] = new Date().toISOString();
              break;
            case 'boolean':
              initialVariables[variable.name] = true;
              break;
            case 'array':
              initialVariables[variable.name] = ['Item 1', 'Item 2', 'Item 3'];
              break;
            case 'object':
              initialVariables[variable.name] = { key: 'value' };
              break;
            default:
              initialVariables[variable.name] = 'Sample Value';
          }
        }
      });

      setVariables(initialVariables);
      loadPreview(initialVariables);
    }
  }, [template, open]);

  const loadPreview = async (variableValues = variables) => {
    if (!template) return;

    setLoading(true);
    setError(null);

    try {
      const response = await request(`/api/email-templates/${template._id}/preview`, {
        method: 'POST',
        data: {
          variables: variableValues,
          language,
        },
      });

      setPreviewData(response.data.preview);
    } catch (error: any) {
      console.error('Failed to load preview:', error);
      setError(error.response?.data?.error || 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  const handleVariableChange = (variableName: string, value: any) => {
    const newVariables = { ...variables, [variableName]: value };
    setVariables(newVariables);

    // Debounced preview update
    clearTimeout((window as any).previewTimeout);
    (window as any).previewTimeout = setTimeout(() => {
      loadPreview(newVariables);
    }, 500);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    setTimeout(() => loadPreview(), 100);
  };

  const renderVariableInput = (variable: any) => {
    const value = variables[variable.name] || '';

    switch (variable.type) {
      case 'boolean':
        return (
          <FormControl size='small' fullWidth>
            <InputLabel>{variable.name}</InputLabel>
            <Select
              value={value ? 'true' : 'false'}
              onChange={e => handleVariableChange(variable.name, e.target.value === 'true')}
              label={variable.name}
            >
              <MenuItem value='true'>True</MenuItem>
              <MenuItem value='false'>False</MenuItem>
            </Select>
          </FormControl>
        );

      case 'number':
        return (
          <TextField
            label={variable.name}
            type='number'
            value={value}
            onChange={e => handleVariableChange(variable.name, parseFloat(e.target.value) || 0)}
            size='small'
            fullWidth
            helperText={variable.description}
          />
        );

      case 'date':
        return (
          <TextField
            label={variable.name}
            type='datetime-local'
            value={value ? new Date(value).toISOString().slice(0, 16) : ''}
            onChange={e =>
              handleVariableChange(
                variable.name,
                e.target.value ? new Date(e.target.value).toISOString() : ''
              )
            }
            size='small'
            fullWidth
            helperText={variable.description}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'array':
        return (
          <TextField
            label={variable.name}
            value={Array.isArray(value) ? value.join(', ') : value}
            onChange={e =>
              handleVariableChange(
                variable.name,
                e.target.value.split(',').map(s => s.trim())
              )
            }
            size='small'
            fullWidth
            helperText={`${variable.description} (comma-separated)`}
            multiline
            rows={2}
          />
        );

      case 'object':
        return (
          <TextField
            label={variable.name}
            value={typeof value === 'object' ? JSON.stringify(value, null, 2) : value}
            onChange={e => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleVariableChange(variable.name, parsed);
              } catch {
                handleVariableChange(variable.name, e.target.value);
              }
            }}
            size='small'
            fullWidth
            helperText={`${variable.description} (JSON format)`}
            multiline
            rows={3}
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              },
            }}
          />
        );

      default:
        return (
          <TextField
            label={variable.name}
            value={value}
            onChange={e => handleVariableChange(variable.name, e.target.value)}
            size='small'
            fullWidth
            helperText={variable.description}
            multiline={
              variable.name.toLowerCase().includes('content') ||
              variable.name.toLowerCase().includes('message')
            }
            rows={
              variable.name.toLowerCase().includes('content') ||
              variable.name.toLowerCase().includes('message')
                ? 2
                : 1
            }
          />
        );
    }
  };

  const availableLanguages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth='xl' fullWidth>
      <DialogTitle>
        <Box display='flex' justifyContent='space-between' alignItems='center'>
          <Typography variant='h6'>Preview: {template?.name}</Typography>
          <Box display='flex' gap={1}>
            <Button
              variant={viewMode === 'desktop' ? 'contained' : 'outlined'}
              size='small'
              startIcon={<ComputerIcon />}
              onClick={() => setViewMode('desktop')}
            >
              Desktop
            </Button>
            <Button
              variant={viewMode === 'mobile' ? 'contained' : 'outlined'}
              size='small'
              startIcon={<MobileIcon />}
              onClick={() => setViewMode('mobile')}
            >
              Mobile
            </Button>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid2 container spacing={3}>
          {/* Variables Panel */}
          <Grid2 md={4}>
            <Paper sx={{ p: 2, height: 'fit-content', maxHeight: '70vh', overflow: 'auto' }}>
              <Typography variant='h6' gutterBottom>
                Template Variables
              </Typography>

              {template?.localization?.translations?.length > 0 && (
                <FormControl size='small' fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Language</InputLabel>
                  <Select
                    value={language}
                    onChange={e => handleLanguageChange(e.target.value)}
                    label='Language'
                  >
                    {availableLanguages.map(lang => (
                      <MenuItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              <Divider sx={{ my: 2 }} />

              {template?.variables?.length > 0 ? (
                <Grid2 container spacing={2}>
                  {template.variables.map((variable: any, index: number) => (
                    <Grid2 key={index}>{renderVariableInput(variable)}</Grid2>
                  ))}
                </Grid2>
              ) : (
                <Typography variant='body2' color='text.secondary'>
                  No variables defined for this template.
                </Typography>
              )}
            </Paper>
          </Grid2>

          {/* Preview Panel */}
          <Grid2 md={8}>
            <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)}>
                  <Tab icon={<PreviewIcon />} label='HTML Preview' />
                  <Tab icon={<CodeIcon />} label='HTML Source' />
                  {previewData?.textContent && <Tab label='Text Version' />}
                </Tabs>
              </Box>

              {error && (
                <Alert severity='error' sx={{ m: 2 }}>
                  {error}
                </Alert>
              )}

              {loading ? (
                <Box sx={{ p: 2 }}>
                  <Skeleton variant='text' width='60%' height={32} />
                  <Skeleton variant='rectangular' width='100%' height={400} sx={{ mt: 1 }} />
                </Box>
              ) : (
                <>
                  {/* HTML Preview Tab */}
                  <TabPanel value={currentTab} index={0}>
                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {previewData?.subject && (
                        <Box
                          sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'grey.50' }}
                        >
                          <Typography variant='subtitle2' color='text.secondary'>
                            Subject:
                          </Typography>
                          <Typography variant='body1' fontWeight='medium'>
                            {previewData.subject}
                          </Typography>
                        </Box>
                      )}

                      <Box
                        sx={{
                          flex: 1,
                          overflow: 'auto',
                          maxWidth: viewMode === 'mobile' ? '375px' : '100%',
                          mx: viewMode === 'mobile' ? 'auto' : 0,
                          border: viewMode === 'mobile' ? '1px solid #ccc' : 'none',
                          borderRadius: viewMode === 'mobile' ? 2 : 0,
                        }}
                      >
                        <iframe
                          srcDoc={previewData?.htmlContent || ''}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            minHeight: '400px',
                          }}
                          title='Email Preview'
                        />
                      </Box>
                    </Box>
                  </TabPanel>

                  {/* HTML Source Tab */}
                  <TabPanel value={currentTab} index={1}>
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                      <pre
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          lineHeight: 1.4,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          margin: 0,
                        }}
                      >
                        {previewData?.htmlContent || ''}
                      </pre>
                    </Box>
                  </TabPanel>

                  {/* Text Version Tab */}
                  {previewData?.textContent && (
                    <TabPanel value={currentTab} index={2}>
                      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                        <pre
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            lineHeight: 1.4,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            margin: 0,
                          }}
                        >
                          {previewData.textContent}
                        </pre>
                      </Box>
                    </TabPanel>
                  )}
                </>
              )}
            </Paper>
          </Grid2>
        </Grid2>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailTemplatePreview;
