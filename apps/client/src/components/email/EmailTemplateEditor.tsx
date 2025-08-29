import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Tabs,
  Tab,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Preview as PreviewIcon,
  ExpandMore as ExpandMoreIcon,
  Help as HelpIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface EmailTemplateEditorProps {
  open: boolean;
  onClose: () => void;
  template?: any;
  categories: any[];
  types: any[];
  onSave: () => void;
}

interface Variable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: any;
  example?: any;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const EmailTemplateEditor: React.FC<EmailTemplateEditorProps> = ({
  open,
  onClose,
  template,
  categories,
  types,
  onSave,
}) => {
  const { request } = useApi();
  const [currentTab, setCurrentTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Form data state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'custom',
    type: 'custom',
    subject: '',
    htmlContent: '',
    textContent: '',
    variables: [] as Variable[],
    settings: {
      fromName: '',
      fromEmail: '',
      replyTo: '',
      priority: 'normal',
      trackOpens: true,
      trackClicks: true,
    },
    isActive: true,
  });

  const [newVariable, setNewVariable] = useState<Variable>({
    name: '',
    description: '',
    type: 'string',
    required: false,
    defaultValue: '',
    example: '',
  });

  useEffect(() => {
    if (template && open) {
      setFormData({
        name: template.name || '',
        description: template.description || '',
        category: template.category || 'custom',
        type: template.type || 'custom',
        subject: template.subject || '',
        htmlContent: template.htmlContent || '',
        textContent: template.textContent || '',
        variables: template.variables || [],
        settings: {
          fromName: template.settings?.fromName || '',
          fromEmail: template.settings?.fromEmail || '',
          replyTo: template.settings?.replyTo || '',
          priority: template.settings?.priority || 'normal',
          trackOpens: template.settings?.trackOpens !== false,
          trackClicks: template.settings?.trackClicks !== false,
        },
        isActive: template.isActive !== false,
      });
    } else if (!template && open) {
      // Reset form for new template
      setFormData({
        name: '',
        description: '',
        category: 'custom',
        type: 'custom',
        subject: '',
        htmlContent: getDefaultHtmlTemplate(),
        textContent: '',
        variables: [],
        settings: {
          fromName: '',
          fromEmail: '',
          replyTo: '',
          priority: 'normal',
          trackOpens: true,
          trackClicks: true,
        },
        isActive: true,
      });
    }
    
    if (open) {
      setCurrentTab(0);
      setErrors([]);
    }
  }, [template, open]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSettingChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [field]: value }
    }));
  };

  const handleAddVariable = () => {
    if (!newVariable.name || !newVariable.description) return;

    const exists = formData.variables.some(v => v.name === newVariable.name);
    if (exists) {
      setErrors(['Variable with this name already exists']);
      return;
    }

    setFormData(prev => ({
      ...prev,
      variables: [...prev.variables, { ...newVariable }]
    }));

    setNewVariable({
      name: '',
      description: '',
      type: 'string',
      required: false,
      defaultValue: '',
      example: '',
    });
    setErrors([]);
  };

  const handleRemoveVariable = (index: number) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrors([]);

    try {
      const url = template 
        ? `/api/email-templates/${template._id}`
        : '/api/email-templates';
      
      const method = template ? 'PUT' : 'POST';

      await request(url, {
        method,
        data: formData,
      });

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save template:', error);
      const errorMessages = error.response?.data?.errors || [
        error.response?.data?.message || 'Failed to save template'
      ];
      setErrors(errorMessages);
    } finally {
      setSaving(false);
    }
  };

  const insertHandlebarsHelper = (helper: string) => {
    const textarea = document.getElementById('html-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      const newValue = before + helper + after;
      handleFieldChange('htmlContent', newValue);
      
      // Set cursor position after inserted helper
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + helper.length, start + helper.length);
      }, 0);
    }
  };

  const handlebarsHelpers = [
    { name: 'Variable', syntax: '{{variableName}}', description: 'Insert a variable value' },
    { name: 'Format Date', syntax: '{{formatDate dateVariable "YYYY-MM-DD"}}', description: 'Format a date variable' },
    { name: 'Currency', syntax: '{{currency amount "USD"}}', description: 'Format currency amount' },
    { name: 'If Condition', syntax: '{{#if variable}}...{{/if}}', description: 'Conditional content' },
    { name: 'Each Loop', syntax: '{{#each items}}...{{/each}}', description: 'Loop through array' },
    { name: 'Unless', syntax: '{{#unless variable}}...{{/unless}}', description: 'Negative condition' },
  ];

  const availableTypes = types.filter(type => 
    formData.category === 'custom' || type.category === formData.category
  );

  function getDefaultHtmlTemplate(): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
        }
        .container { 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background-color: #1976d2; 
            color: white; 
            text-align: center; 
            padding: 20px; 
            border-radius: 8px 8px 0 0; 
        }
        .content { 
            background-color: #f9f9f9; 
            padding: 30px; 
            border-radius: 0 0 8px 8px; 
        }
        .button { 
            display: inline-block; 
            background-color: #1976d2; 
            color: white; 
            text-decoration: none; 
            padding: 12px 24px; 
            border-radius: 4px; 
            margin: 20px 0; 
        }
        .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #666; 
            font-size: 12px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Email Title</h1>
        </div>
        <div class="content">
            <h2>Hello {{userName}},</h2>
            <p>Your email content goes here.</p>
            
            <a href="{{actionUrl}}" class="button">Call to Action</a>
            
            <p>Best regards,<br>Your Team</p>
        </div>
        <div class="footer">
            <p>This email was sent automatically.</p>
        </div>
    </div>
</body>
</html>`;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        {template ? 'Edit Email Template' : 'Create Email Template'}
      </DialogTitle>
      
      <DialogContent>
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((error, index) => (
              <div key={index}>{error}</div>
            ))}
          </Alert>
        )}

        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Basic Info" />
          <Tab label="Content" />
          <Tab label="Variables" />
          <Tab label="Settings" />
        </Tabs>

        {/* Basic Info Tab */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="Template Name"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                fullWidth
                required
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => {
                    handleFieldChange('category', e.target.value);
                    if (e.target.value !== 'custom') {
                      handleFieldChange('type', '');
                    }
                  }}
                  label="Category"
                >
                  {categories.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                  label="Type"
                  disabled={template?.isSystem}
                >
                  {availableTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleFieldChange('isActive', e.target.checked)}
                  />
                }
                label="Active"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                value={formData.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                fullWidth
                multiline
                rows={2}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Subject Line"
                value={formData.subject}
                onChange={(e) => handleFieldChange('subject', e.target.value)}
                fullWidth
                required
                helperText="Use {{variableName}} for dynamic content"
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Content Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">HTML Content</Typography>
                <Button
                  size="small"
                  startIcon={<HelpIcon />}
                  onClick={() => window.open('https://handlebarsjs.com/guide/', '_blank')}
                >
                  Handlebars Guide
                </Button>
              </Box>
              
              <Accordion sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Handlebars Helpers</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={1}>
                    {handlebarsHelpers.map((helper, index) => (
                      <Grid item xs={12} sm={6} md={4} key={index}>
                        <Paper 
                          sx={{ p: 1, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                          onClick={() => insertHandlebarsHelper(helper.syntax)}
                        >
                          <Typography variant="caption" display="block" fontWeight="bold">
                            {helper.name}
                          </Typography>
                          <Typography variant="caption" display="block" fontFamily="monospace" color="text.secondary">
                            {helper.syntax}
                          </Typography>
                          <Typography variant="caption" display="block" color="text.secondary">
                            {helper.description}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </AccordionDetails>
              </Accordion>

              <TextField
                id="html-content"
                multiline
                rows={20}
                value={formData.htmlContent}
                onChange={(e) => handleFieldChange('htmlContent', e.target.value)}
                fullWidth
                variant="outlined"
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Text Content (Optional)
              </Typography>
              <TextField
                multiline
                rows={8}
                value={formData.textContent}
                onChange={(e) => handleFieldChange('textContent', e.target.value)}
                fullWidth
                variant="outlined"
                helperText="Plain text version for email clients that don't support HTML"
                sx={{
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                  }
                }}
              />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Variables Tab */}
        <TabPanel value={currentTab} index={2}>
          <Box mb={3}>
            <Typography variant="h6" gutterBottom>
              Template Variables
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Define variables that can be used in your template with {"{{variableName}}"} syntax.
            </Typography>
          </Box>

          {/* Add Variable Form */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Add New Variable
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Variable Name"
                  value={newVariable.name}
                  onChange={(e) => setNewVariable({ ...newVariable, name: e.target.value })}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Description"
                  value={newVariable.description}
                  onChange={(e) => setNewVariable({ ...newVariable, description: e.target.value })}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={newVariable.type}
                    onChange={(e) => setNewVariable({ ...newVariable, type: e.target.value as any })}
                    label="Type"
                  >
                    <MenuItem value="string">String</MenuItem>
                    <MenuItem value="number">Number</MenuItem>
                    <MenuItem value="date">Date</MenuItem>
                    <MenuItem value="boolean">Boolean</MenuItem>
                    <MenuItem value="array">Array</MenuItem>
                    <MenuItem value="object">Object</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={newVariable.required}
                      onChange={(e) => setNewVariable({ ...newVariable, required: e.target.checked })}
                      size="small"
                    />
                  }
                  label="Required"
                />
              </Grid>
              <Grid item xs={6} sm={1}>
                <Button
                  variant="contained"
                  onClick={handleAddVariable}
                  disabled={!newVariable.name || !newVariable.description}
                  startIcon={<AddIcon />}
                  size="small"
                >
                  Add
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Variables List */}
          {formData.variables.length > 0 ? (
            <List>
              {formData.variables.map((variable, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2" fontFamily="monospace">
                          {`{{${variable.name}}}`}
                        </Typography>
                        <Chip label={variable.type} size="small" variant="outlined" />
                        {variable.required && (
                          <Chip label="Required" size="small" color="error" variant="outlined" />
                        )}
                      </Box>
                    }
                    secondary={variable.description}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveVariable(index)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No variables defined. Add variables to make your template dynamic.
            </Typography>
          )}
        </TabPanel>

        {/* Settings Tab */}
        <TabPanel value={currentTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                label="From Name"
                value={formData.settings.fromName}
                onChange={(e) => handleSettingChange('fromName', e.target.value)}
                fullWidth
                helperText="Leave empty to use system default"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="From Email"
                type="email"
                value={formData.settings.fromEmail}
                onChange={(e) => handleSettingChange('fromEmail', e.target.value)}
                fullWidth
                helperText="Leave empty to use system default"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Reply To"
                type="email"
                value={formData.settings.replyTo}
                onChange={(e) => handleSettingChange('replyTo', e.target.value)}
                fullWidth
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.settings.priority}
                  onChange={(e) => handleSettingChange('priority', e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Stack direction="row" spacing={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings.trackOpens}
                      onChange={(e) => handleSettingChange('trackOpens', e.target.checked)}
                    />
                  }
                  label="Track Email Opens"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.settings.trackClicks}
                      onChange={(e) => handleSettingChange('trackClicks', e.target.checked)}
                    />
                  }
                  label="Track Link Clicks"
                />
              </Stack>
            </Grid>
          </Grid>
        </TabPanel>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !formData.name || !formData.subject || !formData.htmlContent}
        >
          {saving ? 'Saving...' : template ? 'Update Template' : 'Create Template'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailTemplateEditor;