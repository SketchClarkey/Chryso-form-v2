import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Chip,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  Autocomplete,
  Stack,
  Tooltip,
  Avatar,
  Divider,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Share as ShareIcon,
  PlayArrow as RunIcon,
  Add as AddIcon,
  Public as PublicIcon,
  Lock as PrivateIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useApi } from '../../hooks/useApi';

interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  query: string;
  entityType: string;
  filters: {
    field: string;
    operator: string;
    value: any;
  }[];
  sorting: {
    field: string;
    direction: 'asc' | 'desc';
  };
  columns: string[];
  isPublic: boolean;
  isPinned: boolean;
  tags: string[];
  createdBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: Date;
  updatedAt: Date;
  usage: {
    totalUses: number;
    lastUsed?: Date;
    avgResultCount: number;
  };
}

interface SavedSearchesProps {
  entityType: string;
  onSearchSelect: (search: SavedSearch) => void;
  onSaveCurrentSearch?: (searchData: Partial<SavedSearch>) => void;
  currentQuery?: string;
  showCreateButton?: boolean;
  compact?: boolean;
}

const SavedSearches: React.FC<SavedSearchesProps> = ({
  entityType,
  onSearchSelect,
  onSaveCurrentSearch,
  currentQuery = '',
  showCreateButton = true,
  compact = false,
}) => {
  const { request } = useApi();
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [popularSearches, setPopularSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSearch, setSelectedSearch] = useState<SavedSearch | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [searchData, setSearchData] = useState<Partial<SavedSearch>>({
    name: '',
    description: '',
    query: currentQuery,
    entityType,
    isPublic: false,
    isPinned: false,
    tags: [],
    filters: [],
    sorting: { field: 'createdAt', direction: 'desc' },
    columns: [],
  });

  useEffect(() => {
    loadSavedSearches();
    loadPopularSearches();
  }, [entityType]);

  const loadSavedSearches = async () => {
    setLoading(true);
    try {
      const response = await get('/api/saved-searches?entityType=${entityType}');
      setSearches(response.data.searches);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
      // Load mock data
      loadMockSearches();
    } finally {
      setLoading(false);
    }
  };

  const loadPopularSearches = async () => {
    try {
      const response = await get('/api/saved-searches/popular?entityType=${entityType}&limit=5');
      setPopularSearches(response.data.searches);
    } catch (error) {
      console.error('Failed to load popular searches:', error);
    }
  };

  const loadMockSearches = () => {
    const mockSearches: SavedSearch[] = [
      {
        id: '1',
        name: 'Urgent Forms This Week',
        description: 'High priority forms from this week',
        query: 'urgent priority inspection',
        entityType: 'form',
        filters: [
          { field: 'priority', operator: 'equals', value: 'urgent' },
          { field: 'createdAt', operator: 'dateThisWeek', value: null },
        ],
        sorting: { field: 'createdAt', direction: 'desc' },
        columns: ['formId', 'status', 'priority', 'createdAt'],
        isPublic: false,
        isPinned: true,
        tags: ['urgent', 'priority'],
        createdBy: { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        usage: { totalUses: 456, lastUsed: new Date(), avgResultCount: 23 },
      },
      {
        id: '2',
        name: 'Completed Inspections',
        description: 'All completed inspection forms',
        query: 'completed inspection',
        entityType: 'form',
        filters: [
          { field: 'status', operator: 'equals', value: 'completed' },
          { field: 'formData.type', operator: 'contains', value: 'inspection' },
        ],
        sorting: { field: 'completedAt', direction: 'desc' },
        columns: ['formId', 'customerName', 'completedAt'],
        isPublic: true,
        isPinned: false,
        tags: ['completed', 'inspection'],
        createdBy: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-10'),
        usage: { totalUses: 789, lastUsed: new Date('2024-01-20'), avgResultCount: 67 },
      },
    ];

    setSearches(mockSearches.filter(s => s.entityType === entityType));
    setPopularSearches(
      mockSearches.filter(s => s.entityType === entityType && s.usage.totalUses > 100)
    );
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, search: SavedSearch) => {
    setAnchorEl(event.currentTarget);
    setSelectedSearch(search);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSearch(null);
  };

  const handleRunSearch = (search: SavedSearch) => {
    onSearchSelect(search);
    updateUsage(search.id);
  };

  const handleTogglePin = async (search: SavedSearch) => {
    try {
      const updatedSearch = { ...search, isPinned: !search.isPinned };
      await request(`/api/saved-searches/${search.id}`, {
        method: 'PUT',
        data: updatedSearch,
      });

      setSearches(searches.map(s => (s.id === search.id ? updatedSearch : s)));
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
    handleMenuClose();
  };

  const handleEditSearch = () => {
    if (selectedSearch) {
      setSearchData(selectedSearch);
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteSearch = async () => {
    if (!selectedSearch) return;

    try {
      await request(`/api/saved-searches/${selectedSearch.id}`, { method: 'DELETE' });
      setSearches(searches.filter(s => s.id !== selectedSearch.id));
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Failed to delete search:', error);
    }
    handleMenuClose();
  };

  const handleSaveSearch = async () => {
    try {
      const response = await request('/api/saved-searches', {
        method: 'POST',
        data: searchData,
      });

      setSearches([response.data.search, ...searches]);
      setSaveDialogOpen(false);
      resetSearchData();
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const handleUpdateSearch = async () => {
    if (!selectedSearch) return;

    try {
      const response = await request(`/api/saved-searches/${selectedSearch.id}`, {
        method: 'PUT',
        data: searchData,
      });

      setSearches(searches.map(s => (s.id === selectedSearch.id ? response.data.search : s)));
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Failed to update search:', error);
    }
  };

  const updateUsage = async (searchId: string) => {
    try {
      await request(`/api/saved-searches/${searchId}/usage`, { method: 'POST' });

      // Update local usage
      setSearches(
        searches.map(s =>
          s.id === searchId
            ? {
                ...s,
                usage: { ...s.usage, totalUses: s.usage.totalUses + 1, lastUsed: new Date() },
              }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to update usage:', error);
    }
  };

  const resetSearchData = () => {
    setSearchData({
      name: '',
      description: '',
      query: currentQuery,
      entityType,
      isPublic: false,
      isPinned: false,
      tags: [],
      filters: [],
      sorting: { field: 'createdAt', direction: 'desc' },
      columns: [],
    });
  };

  const openSaveDialog = () => {
    setSearchData({
      ...searchData,
      query: currentQuery,
      entityType,
    });
    setSaveDialogOpen(true);
  };

  const pinnedSearches = searches.filter(s => s.isPinned);
  const regularSearches = searches.filter(s => !s.isPinned);

  if (compact) {
    return (
      <Box>
        <Stack spacing={1}>
          {pinnedSearches.length > 0 && (
            <Box>
              <Typography variant='caption' color='text.secondary' gutterBottom display='block'>
                Pinned Searches
              </Typography>
              {pinnedSearches.slice(0, 3).map(search => (
                <Chip
                  key={search.id}
                  label={search.name}
                  clickable
                  onClick={() => handleRunSearch(search)}
                  color='primary'
                  variant='outlined'
                  icon={<StarIcon />}
                  size='small'
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}

          {popularSearches.length > 0 && (
            <Box>
              <Typography variant='caption' color='text.secondary' gutterBottom display='block'>
                Popular Searches
              </Typography>
              {popularSearches.slice(0, 3).map(search => (
                <Chip
                  key={search.id}
                  label={search.name}
                  clickable
                  onClick={() => handleRunSearch(search)}
                  color='secondary'
                  variant='outlined'
                  icon={<TrendingIcon />}
                  size='small'
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
        <Typography variant='h6'>Saved Searches</Typography>
        {showCreateButton && onSaveCurrentSearch && currentQuery && (
          <Button size='small' onClick={openSaveDialog} startIcon={<AddIcon />} variant='outlined'>
            Save Current Search
          </Button>
        )}
      </Box>

      {/* Popular Searches */}
      {popularSearches.length > 0 && (
        <Box mb={3}>
          <Typography variant='subtitle2' color='text.secondary' gutterBottom>
            Popular Searches
          </Typography>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            {popularSearches.slice(0, 5).map(search => (
              <Tooltip
                key={search.id}
                title={`${search.usage.totalUses} uses • ${search.usage.avgResultCount} avg results`}
              >
                <Chip
                  label={search.name}
                  clickable
                  onClick={() => handleRunSearch(search)}
                  color='secondary'
                  variant='outlined'
                  icon={<TrendingIcon />}
                  size='small'
                />
              </Tooltip>
            ))}
          </Stack>
        </Box>
      )}

      {/* Saved Searches List */}
      {searches.length === 0 ? (
        <Card variant='outlined'>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <SearchIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant='h6' color='text.secondary' gutterBottom>
              No Saved Searches
            </Typography>
            <Typography variant='body2' color='text.secondary' mb={2}>
              Save your frequent searches for quick access
            </Typography>
            {currentQuery && (
              <Button variant='contained' onClick={openSaveDialog} startIcon={<AddIcon />}>
                Save Current Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <List>
          {/* Pinned Searches */}
          {pinnedSearches.length > 0 && (
            <>
              <Typography variant='subtitle2' color='text.secondary' sx={{ px: 2, py: 1 }}>
                Pinned Searches
              </Typography>
              {pinnedSearches.map((search, index) => (
                <React.Fragment key={search.id}>
                  <ListItemButton onClick={() => handleRunSearch(search)}>
                    <ListItemIcon>
                      <StarIcon color='primary' />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display='flex' alignItems='center' gap={1}>
                          <Typography variant='subtitle1'>{search.name}</Typography>
                          {search.isPublic && <PublicIcon fontSize='small' color='action' />}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            {search.description || search.query}
                          </Typography>
                          <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                            <Typography variant='caption' color='text.secondary'>
                              {search.usage.totalUses} uses
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              Updated{' '}
                              {formatDistanceToNow(new Date(search.updatedAt), { addSuffix: true })}
                            </Typography>
                            {search.tags.length > 0 && (
                              <Box display='flex' gap={0.5}>
                                {search.tags.slice(0, 2).map((tag, idx) => (
                                  <Chip key={idx} label={tag} size='small' variant='outlined' />
                                ))}
                                {search.tags.length > 2 && (
                                  <Chip
                                    label={`+${search.tags.length - 2}`}
                                    size='small'
                                    variant='outlined'
                                  />
                                )}
                              </Box>
                            )}
                          </Stack>
                        </Box>
                      }
                    />
                    <IconButton
                      onClick={e => {
                        e.stopPropagation();
                        handleMenuOpen(e, search);
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  </ListItemButton>
                  {index < pinnedSearches.length - 1 && <Divider />}
                </React.Fragment>
              ))}
              {regularSearches.length > 0 && <Divider sx={{ my: 1 }} />}
            </>
          )}

          {/* Regular Searches */}
          {regularSearches.length > 0 && (
            <>
              {pinnedSearches.length > 0 && (
                <Typography variant='subtitle2' color='text.secondary' sx={{ px: 2, py: 1 }}>
                  All Searches
                </Typography>
              )}
              {regularSearches.map((search, index) => (
                <React.Fragment key={search.id}>
                  <ListItemButton onClick={() => handleRunSearch(search)}>
                    <ListItemIcon>
                      <SearchIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display='flex' alignItems='center' gap={1}>
                          <Typography variant='subtitle1'>{search.name}</Typography>
                          {search.isPublic ? (
                            <PublicIcon fontSize='small' color='action' />
                          ) : (
                            <PrivateIcon fontSize='small' color='action' />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant='body2' color='text.secondary' gutterBottom>
                            {search.description || search.query}
                          </Typography>
                          <Stack direction='row' spacing={1} alignItems='center' flexWrap='wrap'>
                            <Avatar sx={{ width: 16, height: 16, fontSize: 10 }}>
                              {search.createdBy.firstName[0]}
                              {search.createdBy.lastName[0]}
                            </Avatar>
                            <Typography variant='caption' color='text.secondary'>
                              by {search.createdBy.firstName} {search.createdBy.lastName}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {search.usage.totalUses} uses
                            </Typography>
                          </Stack>
                        </Box>
                      }
                    />
                    <IconButton
                      onClick={e => {
                        e.stopPropagation();
                        handleMenuOpen(e, search);
                      }}
                    >
                      <MoreIcon />
                    </IconButton>
                  </ListItemButton>
                  {index < regularSearches.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </>
          )}
        </List>
      )}

      {/* Context Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => selectedSearch && handleRunSearch(selectedSearch)}>
          <RunIcon sx={{ mr: 1 }} />
          Run Search
        </MenuItem>
        <MenuItem onClick={() => selectedSearch && handleTogglePin(selectedSearch)}>
          {selectedSearch?.isPinned ? (
            <StarBorderIcon sx={{ mr: 1 }} />
          ) : (
            <StarIcon sx={{ mr: 1 }} />
          )}
          {selectedSearch?.isPinned ? 'Unpin' : 'Pin'}
        </MenuItem>
        <MenuItem onClick={handleEditSearch}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => console.log('Share search')}>
          <ShareIcon sx={{ mr: 1 }} />
          Share
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => setDeleteDialogOpen(true)} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Save Search Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Save Search</DialogTitle>
        <DialogContent>
          <Box display='flex' flexDirection='column' gap={2} mt={1}>
            <TextField
              label='Search Name'
              value={searchData.name}
              onChange={e => setSearchData({ ...searchData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='Description'
              value={searchData.description}
              onChange={e => setSearchData({ ...searchData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label='Search Query'
              value={searchData.query}
              onChange={e => setSearchData({ ...searchData, query: e.target.value })}
              fullWidth
              InputProps={{ readOnly: true }}
              helperText='This is the current search query'
            />
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={searchData.tags || []}
              onChange={(_, newValue) => setSearchData({ ...searchData, tags: newValue })}
              renderInput={params => (
                <TextField {...params} label='Tags' placeholder='Add tags...' />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip variant='outlined' label={option} {...getTagProps({ index })} key={index} />
                ))
              }
            />
            <Stack direction='row' spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={searchData.isPublic || false}
                    onChange={e => setSearchData({ ...searchData, isPublic: e.target.checked })}
                  />
                }
                label='Make Public'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={searchData.isPinned || false}
                    onChange={e => setSearchData({ ...searchData, isPinned: e.target.checked })}
                  />
                }
                label='Pin to Top'
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveSearch} variant='contained'>
            Save Search
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Search Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Edit Search</DialogTitle>
        <DialogContent>
          <Box display='flex' flexDirection='column' gap={2} mt={1}>
            <TextField
              label='Search Name'
              value={searchData.name}
              onChange={e => setSearchData({ ...searchData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label='Description'
              value={searchData.description}
              onChange={e => setSearchData({ ...searchData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <Autocomplete
              multiple
              freeSolo
              options={[]}
              value={searchData.tags || []}
              onChange={(_, newValue) => setSearchData({ ...searchData, tags: newValue })}
              renderInput={params => (
                <TextField {...params} label='Tags' placeholder='Add tags...' />
              )}
            />
            <Stack direction='row' spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={searchData.isPublic || false}
                    onChange={e => setSearchData({ ...searchData, isPublic: e.target.checked })}
                  />
                }
                label='Make Public'
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={searchData.isPinned || false}
                    onChange={e => setSearchData({ ...searchData, isPinned: e.target.checked })}
                  />
                }
                label='Pin to Top'
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleUpdateSearch} variant='contained'>
            Update Search
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Search</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedSearch?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteSearch} color='error' variant='contained'>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavedSearches;
