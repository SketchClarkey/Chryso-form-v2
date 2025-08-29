import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';

interface IFormSection {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: any[];
  layout?: {
    columns: number;
    order: number;
  };
}

interface SectionEditorProps {
  open: boolean;
  section: IFormSection | null;
  onClose: () => void;
  onSave: (section: Omit<IFormSection, 'fields'>) => void;
}

export function SectionEditor({ open, section, onClose, onSave }: SectionEditorProps) {
  const [formData, setFormData] = useState<Omit<IFormSection, 'fields'>>({
    id: '',
    title: '',
    description: '',
    collapsible: false,
    collapsed: false,
    layout: {
      columns: 1,
      order: 0,
    },
  });

  useEffect(() => {
    if (section) {
      setFormData({
        id: section.id,
        title: section.title,
        description: section.description || '',
        collapsible: section.collapsible || false,
        collapsed: section.collapsed || false,
        layout: section.layout || { columns: 1, order: 0 },
      });
    }
  }, [section]);

  const handleFieldChange = (key: keyof Omit<IFormSection, 'fields'>, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleLayoutChange = (key: keyof NonNullable<IFormSection['layout']>, value: any) => {
    setFormData(prev => ({
      ...prev,
      layout: { ...prev.layout!, [key]: value },
    }));
  };

  const handleSave = () => {
    // Validation
    if (!formData.title.trim()) {
      alert('Section title is required');
      return;
    }

    onSave(formData);
    onClose();
  };

  const handleClose = () => {
    onClose();
    // Reset form after a brief delay to avoid visual glitches
    setTimeout(() => {
      setFormData({
        id: '',
        title: '',
        description: '',
        collapsible: false,
        collapsed: false,
        layout: {
          columns: 1,
          order: 0,
        },
      });
    }, 200);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {section?.id ? 'Edit Section' : 'Add New Section'}
      </DialogTitle>
      
      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} pt={2}>
          {/* Basic Properties */}
          <TextField
            fullWidth
            label="Section Title"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            required
            autoFocus
          />

          <TextField
            fullWidth
            label="Description"
            value={formData.description || ''}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            multiline
            rows={3}
            helperText="Optional description displayed at the top of the section"
          />

          {/* Layout Options */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Columns</InputLabel>
                <Select
                  value={formData.layout?.columns || 1}
                  onChange={(e) => handleLayoutChange('columns', e.target.value)}
                  label="Columns"
                >
                  <MenuItem value={1}>1 Column</MenuItem>
                  <MenuItem value={2}>2 Columns</MenuItem>
                  <MenuItem value={3}>3 Columns</MenuItem>
                  <MenuItem value={4}>4 Columns</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Display Order"
                type="number"
                value={formData.layout?.order || 0}
                onChange={(e) => handleLayoutChange('order', parseInt(e.target.value) || 0)}
                helperText="Lower numbers appear first"
              />
            </Grid>
          </Grid>

          {/* Behavior Options */}
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.collapsible || false}
                  onChange={(e) => handleFieldChange('collapsible', e.target.checked)}
                />
              }
              label="Collapsible Section"
            />
            <Box component="p" sx={{ mt: 0, mb: 0, fontSize: '0.75rem', color: 'text.secondary' }}>
              Allow users to expand/collapse this section
            </Box>
          </Box>

          {formData.collapsible && (
            <Box ml={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.collapsed || false}
                    onChange={(e) => handleFieldChange('collapsed', e.target.checked)}
                  />
                }
                label="Initially Collapsed"
              />
              <Box component="p" sx={{ mt: 0, mb: 0, fontSize: '0.75rem', color: 'text.secondary' }}>
                Start with this section collapsed when the form loads
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave}>
          {section?.id ? 'Update Section' : 'Add Section'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}