import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Preview as PreviewIcon,
  DragIndicator as DragIcon,
  ExpandMore as ExpandMoreIcon,
  ContentCopy as CopyIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useToastNotifications } from '../notifications/NotificationToast';
import { FieldEditor } from './FieldEditor';
import { SectionEditor } from './SectionEditor';

// Template interfaces
interface IFieldOption {
  label: string;
  value: string;
  disabled?: boolean;
}

interface IFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
}

interface IFormField {
  id: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'email'
    | 'phone'
    | 'date'
    | 'datetime'
    | 'select'
    | 'multiselect'
    | 'radio'
    | 'checkbox'
    | 'file'
    | 'signature'
    | 'separator'
    | 'heading';
  label: string;
  description?: string;
  placeholder?: string;
  defaultValue?: any;
  options?: IFieldOption[];
  validation?: IFieldValidation;
  conditional?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
  };
  layout?: {
    width: number;
    order: number;
  };
}

interface IFormSection {
  id: string;
  title: string;
  description?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  fields: IFormField[];
  layout?: {
    columns: number;
    order: number;
  };
}

interface ITemplate {
  _id?: string;
  name: string;
  description?: string;
  category:
    | 'maintenance'
    | 'inspection'
    | 'service'
    | 'installation'
    | 'calibration'
    | 'breakdown'
    | 'custom';
  sections: IFormSection[];
  version?: number;
  status?: 'draft' | 'active' | 'archived' | 'pending_approval';
  tags: string[];
  permissions?: {
    canView: string[];
    canUse: string[];
    canEdit: string[];
  };
}

// Field types configuration
const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📞' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'datetime', label: 'Date & Time', icon: '⏰' },
  { value: 'select', label: 'Dropdown', icon: '🎯' },
  { value: 'multiselect', label: 'Multi-select', icon: '☑️' },
  { value: 'radio', label: 'Radio Buttons', icon: '🔘' },
  { value: 'checkbox', label: 'Checkbox', icon: '✅' },
  { value: 'file', label: 'File Upload', icon: '📎' },
  { value: 'signature', label: 'Signature', icon: '✍️' },
  { value: 'separator', label: 'Separator', icon: '➖' },
  { value: 'heading', label: 'Heading', icon: '📌' },
];

const CATEGORIES = [
  'maintenance',
  'inspection',
  'service',
  'installation',
  'calibration',
  'breakdown',
  'custom',
];

// Draggable field component
function DraggableField({
  field,
  sectionId,
  onEdit,
  onDelete,
}: {
  field: IFormField;
  sectionId: string;
  onEdit: (sectionId: string, fieldId: string) => void;
  onDelete: (sectionId: string, fieldId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const fieldType = FIELD_TYPES.find(type => type.value === field.type);

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      sx={{
        p: 2,
        mb: 2,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'grab',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
      {...attributes}
      {...listeners}
    >
      <Box display='flex' alignItems='center' justifyContent='space-between'>
        <Box display='flex' alignItems='center' gap={1}>
          <DragIcon color='action' />
          <Typography variant='body2' color='text.secondary'>
            {fieldType?.icon} {fieldType?.label}
          </Typography>
          <Typography variant='body1' fontWeight={500}>
            {field.label}
          </Typography>
          {field.validation?.required && <Chip label='Required' size='small' color='error' />}
        </Box>
        <Box>
          <IconButton
            size='small'
            onClick={e => {
              e.stopPropagation();
              onEdit(sectionId, field.id);
            }}
          >
            <EditIcon />
          </IconButton>
          <IconButton
            size='small'
            color='error'
            onClick={e => {
              e.stopPropagation();
              onDelete(sectionId, field.id);
            }}
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>
      {field.description && (
        <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
          {field.description}
        </Typography>
      )}
    </Paper>
  );
}

// Draggable section component
function DraggableSection({
  section,
  onEditSection,
  onDeleteSection,
  onEditField,
  onDeleteField,
  onAddField,
}: {
  section: IFormSection;
  onEditSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onEditField: (sectionId: string, fieldId: string) => void;
  onDeleteField: (sectionId: string, fieldId: string) => void;
  onAddField: (sectionId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} sx={{ mb: 3 }}>
      <CardContent>
        <Box display='flex' alignItems='center' justifyContent='space-between' mb={2}>
          <Box display='flex' alignItems='center' gap={1}>
            <Box {...attributes} {...listeners} sx={{ cursor: 'grab' }}>
              <DragIcon color='action' />
            </Box>
            <Typography variant='h6'>{section.title}</Typography>
            <Chip
              label={`${section.fields.length} field${section.fields.length !== 1 ? 's' : ''}`}
              size='small'
              color='primary'
            />
          </Box>
          <Box>
            <IconButton size='small' onClick={() => onAddField(section.id)} color='primary'>
              <AddIcon />
            </IconButton>
            <IconButton size='small' onClick={() => onEditSection(section.id)}>
              <EditIcon />
            </IconButton>
            <IconButton size='small' color='error' onClick={() => onDeleteSection(section.id)}>
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>

        {section.description && (
          <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
            {section.description}
          </Typography>
        )}

        <SortableContext items={section.fields} strategy={verticalListSortingStrategy}>
          {section.fields.map(field => (
            <DraggableField
              key={field.id}
              field={field}
              sectionId={section.id}
              onEdit={onEditField}
              onDelete={onDeleteField}
            />
          ))}
        </SortableContext>

        {section.fields.length === 0 && (
          <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover' }}>
            <Typography variant='body2' color='text.secondary'>
              No fields in this section. Click the + button to add fields.
            </Typography>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
}

export function TemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToastNotifications();

  const [template, setTemplate] = useState<ITemplate>({
    name: '',
    description: '',
    category: 'custom',
    sections: [],
    tags: [],
  });

  const [draggedItem, setDraggedItem] = useState<any>(null);
  const [editingField, setEditingField] = useState<{ sectionId: string; field: IFormField } | null>(
    null
  );
  const [editingSection, setEditingSection] = useState<IFormSection | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const isEditing = Boolean(id && id !== 'new');

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch template if editing
  const { data: existingTemplate, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: async () => {
      const response = await api.get(`/templates/${id}`);
      return response.data.data.template;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingTemplate) {
      setTemplate(existingTemplate);
    }
  }, [existingTemplate]);

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: ITemplate) => {
      if (isEditing) {
        const response = await api.put(`/templates/${id}`, templateData);
        return response.data;
      } else {
        const response = await api.post('/templates', templateData);
        return response.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.showSuccess(
        isEditing ? 'Template updated successfully' : 'Template created successfully'
      );
      navigate('/templates');
    },
    onError: (err: any) => {
      toast.showError(err.response?.data?.message || 'Failed to save template');
    },
  });

  const handleSave = () => {
    if (!template.name) {
      toast.showError('Template name is required');
      return;
    }
    if (template.sections.length === 0) {
      toast.showError('Template must have at least one section');
      return;
    }
    saveTemplateMutation.mutate(template);
  };

  // Generate unique IDs
  const generateId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setDraggedItem(event.active);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedItem(null);

    if (!over || active.id === over.id) return;

    // Handle section reordering
    const activeIndex = template.sections.findIndex(s => s.id === active.id);
    const overIndex = template.sections.findIndex(s => s.id === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      setTemplate(prev => ({
        ...prev,
        sections: arrayMove(prev.sections, activeIndex, overIndex),
      }));
      return;
    }

    // Handle field reordering within sections
    for (const section of template.sections) {
      const activeFieldIndex = section.fields.findIndex(f => f.id === active.id);
      const overFieldIndex = section.fields.findIndex(f => f.id === over.id);

      if (activeFieldIndex !== -1 && overFieldIndex !== -1) {
        setTemplate(prev => ({
          ...prev,
          sections: prev.sections.map(s =>
            s.id === section.id
              ? { ...s, fields: arrayMove(s.fields, activeFieldIndex, overFieldIndex) }
              : s
          ),
        }));
        break;
      }
    }
  };

  // Section operations
  const addSection = (sectionData: Omit<IFormSection, 'id' | 'fields'>) => {
    const newSection: IFormSection = {
      id: `section_${Date.now()}`,
      ...sectionData,
      fields: [],
    };
    setTemplate(prev => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const updateSection = (sectionId: string, updates: Partial<IFormSection>) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      ),
    }));
  };

  const deleteSection = (sectionId: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.filter(s => s.id !== sectionId),
    }));
  };

  const handleSaveSection = (sectionData: Omit<IFormSection, 'fields'>) => {
    if (editingSection) {
      // Update existing section
      updateSection(editingSection.id, sectionData);
    } else {
      // Add new section
      addSection(sectionData);
    }
    setEditingSection(null);
  };

  // Field operations
  const addField = (sectionId: string, fieldData: Omit<IFormField, 'id'>) => {
    const newField: IFormField = {
      id: generateId(),
      ...fieldData,
    };

    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, fields: [...section.fields, newField] } : section
      ),
    }));
  };

  const updateField = (sectionId: string, fieldId: string, updates: Partial<IFormField>) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? {
              ...section,
              fields: section.fields.map(field =>
                field.id === fieldId ? { ...field, ...updates } : field
              ),
            }
          : section
      ),
    }));
  };

  const deleteField = (sectionId: string, fieldId: string) => {
    setTemplate(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId
          ? { ...section, fields: section.fields.filter(f => f.id !== fieldId) }
          : section
      ),
    }));
  };

  const handleSaveField = (fieldData: IFormField) => {
    if (editingField) {
      if (editingField.sectionId) {
        // Update existing field or add to existing section
        const existingField = template.sections
          .find(s => s.id === editingField.sectionId)
          ?.fields.find(f => f.id === fieldData.id);

        if (existingField) {
          updateField(editingField.sectionId, fieldData.id, fieldData);
        } else {
          addField(editingField.sectionId, fieldData);
        }
      } else {
        // Add to first section or create a section if none exist
        if (template.sections.length === 0) {
          const newSection: IFormSection = {
            id: `section_${Date.now()}`,
            title: 'Section 1',
            fields: [fieldData],
          };
          setTemplate(prev => ({
            ...prev,
            sections: [newSection],
          }));
        } else {
          addField(template.sections[0].id, fieldData);
        }
      }
    }
    setEditingField(null);
  };

  if (isLoading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h4'>{isEditing ? 'Edit Template' : 'Create Template'}</Typography>
        <Box display='flex' gap={2}>
          <Button
            variant='outlined'
            startIcon={<ViewIcon />}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            variant='outlined'
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saveTemplateMutation.isPending}
          >
            Save Template
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Template Settings Panel */}
        <Grid size={{ xs: 12 }} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Template Settings
              </Typography>
              <Box display='flex' flexDirection='column' gap={2}>
                <TextField
                  label='Template Name'
                  value={template.name}
                  onChange={e => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
                <TextField
                  label='Description'
                  multiline
                  rows={3}
                  value={template.description || ''}
                  onChange={e => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                />
                <FormControl>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={template.category}
                    onChange={e =>
                      setTemplate(prev => ({ ...prev, category: e.target.value as any }))
                    }
                    label='Category'
                  >
                    {CATEGORIES.map(cat => (
                      <MenuItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label='Tags (comma separated)'
                  value={template.tags.join(', ')}
                  onChange={e =>
                    setTemplate(prev => ({
                      ...prev,
                      tags: e.target.value
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(Boolean),
                    }))
                  }
                  helperText='Add tags to help categorize this template'
                />
              </Box>
            </CardContent>
          </Card>

          {/* Field Types Palette */}
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>
                Field Types
              </Typography>
              <Grid container spacing={1}>
                {FIELD_TYPES.map(fieldType => (
                  <Grid size={{ xs: 6 }} key={fieldType.value}>
                    <Paper
                      sx={{
                        p: 1,
                        textAlign: 'center',
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                      }}
                      onClick={() => {
                        setEditingField({
                          sectionId: '',
                          field: {
                            id: generateId(),
                            type: fieldType.value as any,
                            label: fieldType.label,
                          },
                        });
                      }}
                    >
                      <Typography variant='h6'>{fieldType.icon}</Typography>
                      <Typography variant='caption'>{fieldType.label}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Template Builder */}
        <Grid size={{ xs: 12 }} md={8}>
          <Box display='flex' justifyContent='between' alignItems='center' mb={2}>
            <Typography variant='h6'>Template Structure</Typography>
            <Button
              variant='contained'
              startIcon={<AddIcon />}
              onClick={() =>
                setEditingSection({
                  id: '',
                  title: 'New Section',
                  fields: [],
                })
              }
            >
              Add Section
            </Button>
          </Box>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={template.sections} strategy={verticalListSortingStrategy}>
              {template.sections.map(section => (
                <DraggableSection
                  key={section.id}
                  section={section}
                  onEditSection={sectionId => {
                    const section = template.sections.find(s => s.id === sectionId);
                    if (section) setEditingSection(section);
                  }}
                  onDeleteSection={deleteSection}
                  onEditField={(sectionId, fieldId) => {
                    const section = template.sections.find(s => s.id === sectionId);
                    const field = section?.fields.find(f => f.id === fieldId);
                    if (field) setEditingField({ sectionId, field });
                  }}
                  onDeleteField={deleteField}
                  onAddField={sectionId => {
                    setEditingField({
                      sectionId,
                      field: {
                        id: generateId(),
                        type: 'text',
                        label: 'New Field',
                      },
                    });
                  }}
                />
              ))}
            </SortableContext>

            <DragOverlay>
              {draggedItem ? (
                <Card sx={{ opacity: 0.8 }}>
                  <CardContent>
                    <Typography>Dragging...</Typography>
                  </CardContent>
                </Card>
              ) : null}
            </DragOverlay>
          </DndContext>

          {template.sections.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant='h6' color='text.secondary' gutterBottom>
                No sections yet
              </Typography>
              <Typography variant='body1' color='text.secondary' sx={{ mb: 2 }}>
                Start building your template by adding a section
              </Typography>
              <Button
                variant='contained'
                startIcon={<AddIcon />}
                onClick={() =>
                  setEditingSection({
                    id: '',
                    title: 'Section 1',
                    fields: [],
                  })
                }
              >
                Add First Section
              </Button>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Section Editor Dialog */}
      <SectionEditor
        open={Boolean(editingSection)}
        section={editingSection}
        onClose={() => setEditingSection(null)}
        onSave={handleSaveSection}
      />

      {/* Field Editor Dialog */}
      <FieldEditor
        open={Boolean(editingField)}
        field={editingField?.field || null}
        onClose={() => setEditingField(null)}
        onSave={handleSaveField}
        existingFields={template.sections.flatMap(s => s.fields)}
      />
    </Box>
  );
}
