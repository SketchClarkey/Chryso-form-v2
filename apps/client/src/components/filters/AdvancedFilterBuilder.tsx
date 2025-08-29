import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  AccordionActions,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { v4 as uuidv4 } from 'uuid';

interface FilterCriteria {
  id: string;
  field: string;
  operator: string;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  logicalOperator?: 'AND' | 'OR';
}

interface FilterGroup {
  id: string;
  name: string;
  criteria: FilterCriteria[];
  logicalOperator: 'AND' | 'OR';
  isActive: boolean;
}

interface AdvancedFilter {
  id?: string;
  name: string;
  description?: string;
  entityType: 'form' | 'template' | 'user' | 'worksite' | 'dashboard' | 'all';
  groups: FilterGroup[];
  globalLogicalOperator: 'AND' | 'OR';
  sorting?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  isShared: boolean;
  tags: string[];
}

interface FieldDefinition {
  label: string;
  type: string;
  searchable: boolean;
  options?: string[];
}

interface AdvancedFilterBuilderProps {
  filter?: AdvancedFilter;
  onSave: (filter: AdvancedFilter) => void;
  onCancel: () => void;
  entityType?: string;
  availableFields?: { [key: string]: FieldDefinition };
}

const operatorLabels = {
  equals: 'Equals',
  notEquals: 'Not Equals',
  contains: 'Contains',
  notContains: 'Does Not Contain',
  startsWith: 'Starts With',
  endsWith: 'Ends With',
  greaterThan: 'Greater Than',
  lessThan: 'Less Than',
  greaterThanOrEqual: 'Greater Than or Equal',
  lessThanOrEqual: 'Less Than or Equal',
  between: 'Between',
  in: 'In List',
  notIn: 'Not In List',
  isEmpty: 'Is Empty',
  isNotEmpty: 'Is Not Empty',
  isTrue: 'Is True',
  isFalse: 'Is False',
  dateEquals: 'Date Equals',
  dateBefore: 'Date Before',
  dateAfter: 'Date After',
  dateBetween: 'Date Between',
  dateToday: 'Today',
  dateYesterday: 'Yesterday',
  dateThisWeek: 'This Week',
  dateThisMonth: 'This Month',
  dateThisYear: 'This Year',
};

const getOperatorsForType = (dataType: string): string[] => {
  switch (dataType) {
    case 'string':
      return [
        'equals',
        'notEquals',
        'contains',
        'notContains',
        'startsWith',
        'endsWith',
        'isEmpty',
        'isNotEmpty',
      ];
    case 'number':
      return [
        'equals',
        'notEquals',
        'greaterThan',
        'lessThan',
        'greaterThanOrEqual',
        'lessThanOrEqual',
        'between',
        'isEmpty',
        'isNotEmpty',
      ];
    case 'boolean':
      return ['isTrue', 'isFalse'];
    case 'date':
      return [
        'dateEquals',
        'dateBefore',
        'dateAfter',
        'dateBetween',
        'dateToday',
        'dateYesterday',
        'dateThisWeek',
        'dateThisMonth',
        'dateThisYear',
      ];
    case 'array':
      return ['contains', 'notContains', 'in', 'notIn', 'isEmpty', 'isNotEmpty'];
    case 'object':
      return ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'];
    default:
      return ['equals', 'notEquals'];
  }
};

const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  filter: initialFilter,
  onSave,
  onCancel,
  entityType = 'form',
  availableFields = {},
}) => {
  const [filter, setFilter] = useState<AdvancedFilter>(
    initialFilter || {
      name: '',
      description: '',
      entityType: entityType as any,
      groups: [],
      globalLogicalOperator: 'AND',
      isShared: false,
      tags: [],
    }
  );

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addGroup = () => {
    const newGroup: FilterGroup = {
      id: uuidv4(),
      name: `Group ${filter.groups.length + 1}`,
      criteria: [],
      logicalOperator: 'AND',
      isActive: true,
    };

    setFilter(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup],
    }));
  };

  const updateGroup = (groupId: string, updates: Partial<FilterGroup>) => {
    setFilter(prev => ({
      ...prev,
      groups: prev.groups.map(group => (group.id === groupId ? { ...group, ...updates } : group)),
    }));
  };

  const deleteGroup = (groupId: string) => {
    setFilter(prev => ({
      ...prev,
      groups: prev.groups.filter(group => group.id !== groupId),
    }));
  };

  const duplicateGroup = (groupId: string) => {
    const groupToDuplicate = filter.groups.find(g => g.id === groupId);
    if (groupToDuplicate) {
      const duplicatedGroup: FilterGroup = {
        ...groupToDuplicate,
        id: uuidv4(),
        name: `${groupToDuplicate.name} (Copy)`,
        criteria: groupToDuplicate.criteria.map(c => ({ ...c, id: uuidv4() })),
      };

      setFilter(prev => ({
        ...prev,
        groups: [...prev.groups, duplicatedGroup],
      }));
    }
  };

  const addCriteria = (groupId: string) => {
    const fieldKeys = Object.keys(availableFields);
    const firstField = fieldKeys.length > 0 ? fieldKeys[0] : '';
    const fieldDef = availableFields[firstField];

    const newCriteria: FilterCriteria = {
      id: uuidv4(),
      field: firstField,
      operator: fieldDef ? getOperatorsForType(fieldDef.type)[0] : 'equals',
      value: '',
      dataType: fieldDef ? (fieldDef.type as any) : 'string',
    };

    updateGroup(groupId, {
      criteria: [...(filter.groups.find(g => g.id === groupId)?.criteria || []), newCriteria],
    });
  };

  const updateCriteria = (
    groupId: string,
    criteriaId: string,
    updates: Partial<FilterCriteria>
  ) => {
    const group = filter.groups.find(g => g.id === groupId);
    if (group) {
      const updatedCriteria = group.criteria.map(c =>
        c.id === criteriaId ? { ...c, ...updates } : c
      );

      updateGroup(groupId, { criteria: updatedCriteria });
    }
  };

  const deleteCriteria = (groupId: string, criteriaId: string) => {
    const group = filter.groups.find(g => g.id === groupId);
    if (group) {
      const updatedCriteria = group.criteria.filter(c => c.id !== criteriaId);
      updateGroup(groupId, { criteria: updatedCriteria });
    }
  };

  const handleFieldChange = (groupId: string, criteriaId: string, fieldName: string) => {
    const fieldDef = availableFields[fieldName];
    if (fieldDef) {
      const availableOperators = getOperatorsForType(fieldDef.type);
      const operator = availableOperators[0];

      updateCriteria(groupId, criteriaId, {
        field: fieldName,
        dataType: fieldDef.type as any,
        operator,
        value: fieldDef.type === 'boolean' ? false : '',
      });
    }
  };

  const renderValueInput = (criteria: FilterCriteria, groupId: string) => {
    const fieldDef = availableFields[criteria.field];
    const operatorsWithoutValue = [
      'isEmpty',
      'isNotEmpty',
      'isTrue',
      'isFalse',
      'dateToday',
      'dateYesterday',
      'dateThisWeek',
      'dateThisMonth',
      'dateThisYear',
    ];

    if (operatorsWithoutValue.includes(criteria.operator)) {
      return null;
    }

    switch (criteria.dataType) {
      case 'string':
        if (fieldDef?.options) {
          return (
            <FormControl fullWidth size='small'>
              <InputLabel>Value</InputLabel>
              <Select
                value={criteria.value}
                onChange={e => updateCriteria(groupId, criteria.id, { value: e.target.value })}
                label='Value'
              >
                {fieldDef.options.map(option => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }
        return (
          <TextField
            fullWidth
            size='small'
            label='Value'
            value={criteria.value}
            onChange={e => updateCriteria(groupId, criteria.id, { value: e.target.value })}
          />
        );

      case 'number':
        if (criteria.operator === 'between') {
          return (
            <Stack direction='row' spacing={1} alignItems='center'>
              <TextField
                size='small'
                type='number'
                label='From'
                value={Array.isArray(criteria.value) ? criteria.value[0] : ''}
                onChange={e => {
                  const current = Array.isArray(criteria.value) ? criteria.value : ['', ''];
                  current[0] = e.target.value;
                  updateCriteria(groupId, criteria.id, { value: current });
                }}
              />
              <Typography>to</Typography>
              <TextField
                size='small'
                type='number'
                label='To'
                value={Array.isArray(criteria.value) ? criteria.value[1] : ''}
                onChange={e => {
                  const current = Array.isArray(criteria.value) ? criteria.value : ['', ''];
                  current[1] = e.target.value;
                  updateCriteria(groupId, criteria.id, { value: current });
                }}
              />
            </Stack>
          );
        }
        return (
          <TextField
            fullWidth
            size='small'
            type='number'
            label='Value'
            value={criteria.value}
            onChange={e => updateCriteria(groupId, criteria.id, { value: e.target.value })}
          />
        );

      case 'boolean':
        return (
          <FormControl fullWidth size='small'>
            <InputLabel>Value</InputLabel>
            <Select
              value={criteria.value}
              onChange={e => updateCriteria(groupId, criteria.id, { value: e.target.value })}
              label='Value'
            >
              <MenuItem value={true}>True</MenuItem>
              <MenuItem value={false}>False</MenuItem>
            </Select>
          </FormControl>
        );

      case 'date':
        if (criteria.operator === 'dateBetween') {
          return (
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Stack direction='row' spacing={1} alignItems='center'>
                <DatePicker
                  label='From Date'
                  value={Array.isArray(criteria.value) ? criteria.value[0] : null}
                  onChange={date => {
                    const current = Array.isArray(criteria.value) ? criteria.value : [null, null];
                    current[0] = date;
                    updateCriteria(groupId, criteria.id, { value: current });
                  }}
                  slotProps={{ textField: { size: 'small' } }}
                />
                <Typography>to</Typography>
                <DatePicker
                  label='To Date'
                  value={Array.isArray(criteria.value) ? criteria.value[1] : null}
                  onChange={date => {
                    const current = Array.isArray(criteria.value) ? criteria.value : [null, null];
                    current[1] = date;
                    updateCriteria(groupId, criteria.id, { value: current });
                  }}
                  slotProps={{ textField: { size: 'small' } }}
                />
              </Stack>
            </LocalizationProvider>
          );
        }
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label='Date'
              value={criteria.value}
              onChange={date => updateCriteria(groupId, criteria.id, { value: date })}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
          </LocalizationProvider>
        );

      case 'array':
        if (criteria.operator === 'in' || criteria.operator === 'notIn') {
          return (
            <Autocomplete
              multiple
              freeSolo
              size='small'
              options={fieldDef?.options || []}
              value={Array.isArray(criteria.value) ? criteria.value : []}
              onChange={(_, newValue) => updateCriteria(groupId, criteria.id, { value: newValue })}
              renderInput={params => (
                <TextField {...params} label='Values' placeholder='Add values...' />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant='outlined' label={option} {...getTagProps({ index })} key={index} />
                ))
              }
            />
          );
        }
        return (
          <TextField
            fullWidth
            size='small'
            label='Value'
            value={criteria.value}
            onChange={e => updateCriteria(groupId, criteria.id, { value: e.target.value })}
          />
        );

      default:
        return (
          <TextField
            fullWidth
            size='small'
            label='Value'
            value={criteria.value}
            onChange={e => updateCriteria(groupId, criteria.id, { value: e.target.value })}
          />
        );
    }
  };

  const validateFilter = (): boolean => {
    const newErrors: string[] = [];

    if (!filter.name.trim()) {
      newErrors.push('Filter name is required');
    }

    if (filter.groups.length === 0) {
      newErrors.push('At least one filter group is required');
    }

    filter.groups.forEach((group, groupIndex) => {
      if (!group.name.trim()) {
        newErrors.push(`Group ${groupIndex + 1}: Name is required`);
      }

      if (group.criteria.length === 0) {
        newErrors.push(`Group ${groupIndex + 1}: At least one criteria is required`);
      }

      group.criteria.forEach((criteria, criteriaIndex) => {
        if (!criteria.field) {
          newErrors.push(
            `Group ${groupIndex + 1}, Criteria ${criteriaIndex + 1}: Field is required`
          );
        }

        if (!criteria.operator) {
          newErrors.push(
            `Group ${groupIndex + 1}, Criteria ${criteriaIndex + 1}: Operator is required`
          );
        }
      });
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validateFilter()) {
      setSaveDialogOpen(true);
    }
  };

  const confirmSave = () => {
    onSave(filter);
    setSaveDialogOpen(false);
  };

  const clearFilter = () => {
    setFilter({
      name: '',
      description: '',
      entityType: entityType as any,
      groups: [],
      globalLogicalOperator: 'AND',
      isShared: false,
      tags: [],
    });
  };

  return (
    <Box>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant='h6' gutterBottom>
            Advanced Filter Builder
          </Typography>

          <Stack spacing={2}>
            <TextField
              label='Filter Name'
              value={filter.name}
              onChange={e => setFilter(prev => ({ ...prev, name: e.target.value }))}
              required
            />

            <TextField
              label='Description'
              value={filter.description}
              onChange={e => setFilter(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={2}
            />

            <Stack direction='row' spacing={2} alignItems='center'>
              <FormControl>
                <InputLabel>Global Logic</InputLabel>
                <Select
                  value={filter.globalLogicalOperator}
                  onChange={e =>
                    setFilter(prev => ({
                      ...prev,
                      globalLogicalOperator: e.target.value as 'AND' | 'OR',
                    }))
                  }
                  label='Global Logic'
                >
                  <MenuItem value='AND'>AND (All groups must match)</MenuItem>
                  <MenuItem value='OR'>OR (Any group can match)</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={filter.isShared}
                    onChange={e => setFilter(prev => ({ ...prev, isShared: e.target.checked }))}
                  />
                }
                label='Share with team'
              />
            </Stack>

            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={filter.tags}
              onChange={(_, newValue) => setFilter(prev => ({ ...prev, tags: newValue }))}
              renderInput={params => (
                <TextField {...params} label='Tags' placeholder='Add tags...' />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant='outlined' label={option} {...getTagProps({ index })} key={index} />
                ))
              }
            />
          </Stack>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <Alert severity='error' sx={{ mb: 2 }}>
          <Typography variant='subtitle2'>Please fix the following errors:</Typography>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Filter Groups */}
      <Stack spacing={2}>
        {filter.groups.map((group, groupIndex) => (
          <Accordion key={group.id} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display='flex' alignItems='center' gap={2}>
                <Typography variant='h6'>{group.name}</Typography>
                <Chip
                  size='small'
                  label={group.logicalOperator}
                  color={group.logicalOperator === 'AND' ? 'primary' : 'secondary'}
                />
                <Chip size='small' label={`${group.criteria.length} criteria`} variant='outlined' />
                <Switch
                  checked={group.isActive}
                  onChange={e => updateGroup(group.id, { isActive: e.target.checked })}
                  size='small'
                />
              </Box>
            </AccordionSummary>

            <AccordionDetails>
              <Stack spacing={2}>
                <Stack direction='row' spacing={2} alignItems='center'>
                  <TextField
                    label='Group Name'
                    value={group.name}
                    onChange={e => updateGroup(group.id, { name: e.target.value })}
                    size='small'
                  />
                  <FormControl size='small'>
                    <InputLabel>Logic</InputLabel>
                    <Select
                      value={group.logicalOperator}
                      onChange={e =>
                        updateGroup(group.id, { logicalOperator: e.target.value as 'AND' | 'OR' })
                      }
                      label='Logic'
                    >
                      <MenuItem value='AND'>AND</MenuItem>
                      <MenuItem value='OR'>OR</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>

                {/* Criteria */}
                {group.criteria.map((criteria, criteriaIndex) => (
                  <Card key={criteria.id} variant='outlined'>
                    <CardContent>
                      <Stack direction='row' spacing={2} alignItems='center' flexWrap='wrap'>
                        {criteriaIndex > 0 && (
                          <Typography variant='body2' color='primary' fontWeight='bold'>
                            {group.logicalOperator}
                          </Typography>
                        )}

                        <FormControl size='small' sx={{ minWidth: 200 }}>
                          <InputLabel>Field</InputLabel>
                          <Select
                            value={criteria.field}
                            onChange={e => handleFieldChange(group.id, criteria.id, e.target.value)}
                            label='Field'
                          >
                            {Object.entries(availableFields).map(([key, field]) => (
                              <MenuItem key={key} value={key}>
                                {field.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <FormControl size='small' sx={{ minWidth: 150 }}>
                          <InputLabel>Operator</InputLabel>
                          <Select
                            value={criteria.operator}
                            onChange={e =>
                              updateCriteria(group.id, criteria.id, { operator: e.target.value })
                            }
                            label='Operator'
                          >
                            {getOperatorsForType(criteria.dataType).map(op => (
                              <MenuItem key={op} value={op}>
                                {operatorLabels[op] || op}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>

                        <Box sx={{ flexGrow: 1, minWidth: 200 }}>
                          {renderValueInput(criteria, group.id)}
                        </Box>

                        <IconButton
                          color='error'
                          onClick={() => deleteCriteria(group.id, criteria.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}

                <Button
                  startIcon={<AddIcon />}
                  onClick={() => addCriteria(group.id)}
                  variant='outlined'
                >
                  Add Criteria
                </Button>
              </Stack>
            </AccordionDetails>

            <AccordionActions>
              <Button
                startIcon={<CopyIcon />}
                onClick={() => duplicateGroup(group.id)}
                size='small'
              >
                Duplicate
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                onClick={() => deleteGroup(group.id)}
                color='error'
                size='small'
              >
                Delete Group
              </Button>
            </AccordionActions>
          </Accordion>
        ))}

        <Button startIcon={<AddIcon />} onClick={addGroup} variant='contained' size='large'>
          Add Filter Group
        </Button>
      </Stack>

      {/* Actions */}
      <Stack direction='row' spacing={2} sx={{ mt: 3 }} justifyContent='flex-end'>
        <Button onClick={clearFilter} startIcon={<ClearIcon />}>
          Clear All
        </Button>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} variant='contained' startIcon={<SaveIcon />}>
          Save Filter
        </Button>
      </Stack>

      {/* Save Confirmation Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Filter</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to save this filter as "{filter.name}"?</Typography>
          {filter.isShared && (
            <Alert severity='info' sx={{ mt: 2 }}>
              This filter will be shared with your team members.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmSave} variant='contained'>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdvancedFilterBuilder;
