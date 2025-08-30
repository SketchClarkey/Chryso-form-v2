import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Alert,
  Skeleton,
  Stack,
  Badge,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  Send as SendIcon,
  Analytics as StatsIcon,
  Email as EmailIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';
import EmailTemplateEditor from './EmailTemplateEditor';
import EmailTemplatePreview from './EmailTemplatePreview';
import EmailTemplateStats from './EmailTemplateStats';

interface EmailTemplate {
  _id: string;
  name: string;
  description?: string;
  category: string;
  type: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: any[];
  settings: any;
  isActive: boolean;
  isSystem: boolean;
  usage: {
    sentCount: number;
    lastSent?: Date;
    openRate?: number;
    clickRate?: number;
  };
  createdBy: {
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role='tabpanel'
      hidden={value !== index}
      id={`template-tabpanel-${index}`}
      aria-labelledby={`template-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const EmailTemplateManager: React.FC = () => {
  const { request } = useApi();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentTab, setCurrentTab] = useState(0);

  // Dialog states
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [testEmailDialog, setTestEmailDialog] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testVariables, setTestVariables] = useState<Record<string, any>>({});

  const tabs = [
    { label: 'All Templates', value: 'all' },
    { label: 'System', value: 'system' },
    { label: 'Notifications', value: 'notification' },
    { label: 'Workflow', value: 'workflow' },
    { label: 'Custom', value: 'custom' },
  ];

  useEffect(() => {
    loadTemplates();
    loadMetadata();
  }, [categoryFilter]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await get('/api/email-templates?${params.toString()}');
      setTemplates(response.data.templates);
    } catch (error) {
      console.error('Failed to load email templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const response = await get('/api/email-templates/meta/categories');
      setCategories(response.data.categories);
      setTypes(response.data.types);
    } catch (error) {
      console.error('Failed to load template metadata:', error);
    }
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    loadTemplates();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, template: EmailTemplate) => {
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTemplate(null);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setEditorOpen(true);
  };

  const handleEditTemplate = () => {
    setEditorOpen(true);
    handleMenuClose();
  };

  const handleCloneTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      await request(`/api/email-templates/${selectedTemplate._id}/clone`, {
        method: 'POST',
        data: { name: `${selectedTemplate.name} (Copy)` },
      });

      loadTemplates();
    } catch (error) {
      console.error('Failed to clone template:', error);
    }
    handleMenuClose();
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      await request(`/api/email-templates/${selectedTemplate._id}`, {
        method: 'DELETE',
      });

      setTemplates(templates.filter(t => t._id !== selectedTemplate._id));
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
    handleMenuClose();
  };

  const handlePreviewTemplate = () => {
    setPreviewOpen(true);
    handleMenuClose();
  };

  const handleViewStats = () => {
    setStatsOpen(true);
    handleMenuClose();
  };

  const handleSendTest = async () => {
    if (!selectedTemplate || !testEmail) return;

    try {
      await request(`/api/email-templates/${selectedTemplate._id}/test`, {
        method: 'POST',
        data: {
          testEmail,
          variables: testVariables,
        },
      });

      setTestEmailDialog(false);
      setTestEmail('');
      setTestVariables({});
    } catch (error) {
      console.error('Failed to send test email:', error);
    }
    handleMenuClose();
  };

  const handleInitializeSystemTemplates = async () => {
    try {
      await request('/api/email-templates/system/initialize', {
        method: 'POST',
      });

      loadTemplates();
    } catch (error) {
      console.error('Failed to initialize system templates:', error);
    }
  };

  const handleTemplateUpdate = () => {
    loadTemplates();
    setEditorOpen(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'system':
        return 'primary';
      case 'notification':
        return 'info';
      case 'workflow':
        return 'warning';
      case 'custom':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatUsage = (template: EmailTemplate) => {
    const { sentCount, openRate, clickRate } = template.usage;
    if (sentCount === 0) return 'Never used';

    return `${sentCount} sent • ${openRate?.toFixed(1) || 0}% opened • ${clickRate?.toFixed(1) || 0}% clicked`;
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      searchTerm === '' ||
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <Container maxWidth='xl' sx={{ py: 4 }}>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h4'>Email Templates</Typography>
        <Stack direction='row' spacing={1}>
          <Button
            variant='outlined'
            onClick={handleInitializeSystemTemplates}
            startIcon={<SettingsIcon />}
          >
            Initialize System Templates
          </Button>
          <Button variant='contained' onClick={handleCreateTemplate} startIcon={<AddIcon />}>
            Create Template
          </Button>
        </Stack>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid2 container spacing={2} alignItems='center'>
            <Grid2 md={6}>
              <Box component='form' onSubmit={handleSearch} display='flex' gap={1}>
                <TextField
                  placeholder='Search templates...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  size='small'
                  fullWidth
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
                  }}
                />
                <Button type='submit' variant='outlined' size='small'>
                  Search
                </Button>
              </Box>
            </Grid2>
            <Grid2 md={6}>
              <FormControl size='small' fullWidth>
                <InputLabel>Filter by Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  label='Filter by Category'
                  startAdornment={<FilterIcon sx={{ mr: 1 }} />}
                >
                  <MenuItem value='all'>All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid2>
          </Grid2>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {loading ? (
        <Grid2 container spacing={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid2 md={6} lg={4} key={index}>
              <Card>
                <CardContent>
                  <Skeleton variant='text' width='60%' height={32} />
                  <Skeleton variant='text' width='40%' height={24} sx={{ mb: 2 }} />
                  <Skeleton variant='text' width='100%' height={20} />
                  <Skeleton variant='text' width='80%' height={20} />
                  <Box display='flex' justifyContent='space-between' mt={2}>
                    <Skeleton variant='rectangular' width={60} height={24} />
                    <Skeleton variant='rectangular' width={24} height={24} />
                  </Box>
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      ) : (
        <Grid2 container spacing={3}>
          {filteredTemplates.map(template => (
            <Grid2 md={6} lg={4} key={template._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  '&:hover': { boxShadow: 3 },
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box display='flex' justifyContent='space-between' alignItems='flex-start' mb={2}>
                    <Typography variant='h6' component='h2' noWrap>
                      {template.name}
                    </Typography>
                    <IconButton size='small' onClick={e => handleMenuOpen(e, template)}>
                      <MoreIcon />
                    </IconButton>
                  </Box>

                  <Stack direction='row' spacing={1} mb={2}>
                    <Chip
                      label={
                        categories.find(c => c.value === template.category)?.label ||
                        template.category
                      }
                      color={getCategoryColor(template.category) as any}
                      size='small'
                      variant='outlined'
                    />
                    {template.isSystem && (
                      <Chip label='System' size='small' color='secondary' variant='filled' />
                    )}
                    {!template.isActive && (
                      <Chip label='Inactive' size='small' color='error' variant='outlined' />
                    )}
                  </Stack>

                  {template.description && (
                    <Typography
                      variant='body2'
                      color='text.secondary'
                      gutterBottom
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        minHeight: '2.5em',
                      }}
                    >
                      {template.description}
                    </Typography>
                  )}

                  <Typography variant='body2' color='text.secondary' gutterBottom>
                    <strong>Subject:</strong> {template.subject}
                  </Typography>

                  <Typography variant='caption' color='text.secondary' display='block' mt={2}>
                    {formatUsage(template)}
                  </Typography>

                  <Typography variant='caption' color='text.secondary' display='block'>
                    Updated {new Date(template.updatedAt).toLocaleDateString()} by{' '}
                    {template.createdBy.firstName} {template.createdBy.lastName}
                  </Typography>
                </CardContent>

                {template.usage.sentCount > 0 && (
                  <Badge
                    badgeContent={template.usage.sentCount}
                    color='primary'
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                    }}
                  >
                    <EmailIcon />
                  </Badge>
                )}
              </Card>
            </Grid2>
          ))}
        </Grid2>
      )}

      {filteredTemplates.length === 0 && !loading && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <EmailIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant='h6' gutterBottom>
              No Email Templates Found
            </Typography>
            <Typography variant='body2' color='text.secondary' mb={3}>
              {searchTerm || categoryFilter !== 'all'
                ? 'No templates match your current filters.'
                : 'Create your first email template to get started.'}
            </Typography>
            <Button variant='contained' onClick={handleCreateTemplate} startIcon={<AddIcon />}>
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handlePreviewTemplate}>
          <PreviewIcon sx={{ mr: 1 }} />
          Preview
        </MenuItem>
        <MenuItem onClick={() => setTestEmailDialog(true)}>
          <SendIcon sx={{ mr: 1 }} />
          Send Test
        </MenuItem>
        <MenuItem onClick={handleViewStats}>
          <StatsIcon sx={{ mr: 1 }} />
          View Stats
        </MenuItem>
        {selectedTemplate && !selectedTemplate.isSystem && (
          <MenuItem onClick={handleEditTemplate}>
            <EditIcon sx={{ mr: 1 }} />
            Edit
          </MenuItem>
        )}
        <MenuItem onClick={handleCloneTemplate}>
          <CopyIcon sx={{ mr: 1 }} />
          Clone
        </MenuItem>
        {selectedTemplate && !selectedTemplate.isSystem && (
          <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
            <DeleteIcon sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
      </Menu>

      {/* Template Editor Dialog */}
      <EmailTemplateEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        template={selectedTemplate}
        categories={categories}
        types={types}
        onSave={handleTemplateUpdate}
      />

      {/* Template Preview Dialog */}
      <EmailTemplatePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        template={selectedTemplate}
      />

      {/* Template Stats Dialog */}
      <EmailTemplateStats
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        template={selectedTemplate}
      />

      {/* Test Email Dialog */}
      <Dialog
        open={testEmailDialog}
        onClose={() => setTestEmailDialog(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Send Test Email</DialogTitle>
        <DialogContent>
          <TextField
            label='Test Email Address'
            type='email'
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            fullWidth
            margin='normal'
            required
          />

          {selectedTemplate?.variables && selectedTemplate.variables.length > 0 && (
            <Box mt={2}>
              <Typography variant='subtitle2' gutterBottom>
                Template Variables (Optional)
              </Typography>
              <Alert severity='info' sx={{ mb: 2 }}>
                You can provide test values for template variables. Default values will be used if
                not provided.
              </Alert>
              {selectedTemplate.variables.map(variable => (
                <TextField
                  key={variable.name}
                  label={variable.name}
                  value={testVariables[variable.name] || ''}
                  onChange={e =>
                    setTestVariables({
                      ...testVariables,
                      [variable.name]: e.target.value,
                    })
                  }
                  fullWidth
                  margin='dense'
                  helperText={variable.description}
                />
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestEmailDialog(false)}>Cancel</Button>
          <Button onClick={handleSendTest} variant='contained' disabled={!testEmail}>
            Send Test
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Email Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteTemplate} color='error' variant='contained'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmailTemplateManager;
