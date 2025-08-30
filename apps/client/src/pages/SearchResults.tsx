import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Button,
  Pagination,
  CircularProgress,
  Alert,
  Stack,
  Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  ExpandMore as ExpandMoreIcon,
  Description as FormIcon,
  Assignment as TemplateIcon,
  Person as UserIcon,
  LocationOn as WorksiteIcon,
  Dashboard as DashboardIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useApi } from '../hooks/useApi';
import GlobalSearch from '../components/search/GlobalSearch';
import { formatDistanceToNow } from 'date-fns';

interface SearchResult {
  id: string;
  type: 'form' | 'template' | 'user' | 'worksite' | 'dashboard';
  title: string;
  description?: string;
  excerpt?: string;
  metadata: {
    createdAt?: Date;
    updatedAt?: Date;
    status?: string;
    category?: string;
    tags?: string[];
    createdBy?: string;
    location?: string;
  };
  relevanceScore: number;
}

interface SearchFacets {
  types: { type: string; count: number }[];
  statuses: { status: string; count: number }[];
  categories: { category: string; count: number }[];
}

const SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { request } = useApi();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [facets, setFacets] = useState<SearchFacets>({
    types: [],
    statuses: [],
    categories: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Search parameters
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const sortBy = searchParams.get('sortBy') || 'relevance';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  // Filters
  const selectedTypes = searchParams.get('types')?.split(',').filter(Boolean) || [];
  const selectedStatuses = searchParams.get('status')?.split(',').filter(Boolean) || [];
  const selectedCategories = searchParams.get('category')?.split(',').filter(Boolean) || [];

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [searchParams]);

  const performSearch = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
        sortBy,
        sortOrder,
      });

      if (selectedTypes.length > 0) {
        params.set('types', selectedTypes.join(','));
      }
      if (selectedStatuses.length > 0) {
        params.set('status', selectedStatuses.join(','));
      }
      if (selectedCategories.length > 0) {
        params.set('category', selectedCategories.join(','));
      }

      const response = await request(`/api/search?${params.toString()}`);
      setResults(response.data.results);
      setFacets(response.data.facets);
      setTotal(response.data.total);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const updateSearchParams = (updates: Record<string, string | string[] | null>) => {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        newParams.delete(key);
      } else if (Array.isArray(value)) {
        newParams.set(key, value.join(','));
      } else {
        newParams.set(key, value);
      }
    });

    // Reset page when changing filters
    if (!updates.page) {
      newParams.delete('page');
    }

    setSearchParams(newParams);
  };

  const handleTypeFilter = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    updateSearchParams({ types: newTypes });
  };

  const handleStatusFilter = (status: string) => {
    const newStatuses = selectedStatuses.includes(status)
      ? selectedStatuses.filter(s => s !== status)
      : [...selectedStatuses, status];
    updateSearchParams({ status: newStatuses });
  };

  const handleCategoryFilter = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    updateSearchParams({ category: newCategories });
  };

  const handleSortChange = (newSortBy: string) => {
    updateSearchParams({ sortBy: newSortBy, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage.toString() });
  };

  const clearFilters = () => {
    updateSearchParams({
      types: null,
      status: null,
      category: null,
      page: null,
    });
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'form':
        return <FormIcon color='primary' />;
      case 'template':
        return <TemplateIcon color='secondary' />;
      case 'user':
        return <UserIcon color='info' />;
      case 'worksite':
        return <WorksiteIcon color='success' />;
      case 'dashboard':
        return <DashboardIcon color='warning' />;
      default:
        return <FormIcon />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'approved':
        return 'success';
      case 'in-progress':
      case 'pending':
        return 'warning';
      case 'rejected':
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const navigateToResult = (result: SearchResult) => {
    switch (result.type) {
      case 'form':
        navigate(`/forms/${result.id}`);
        break;
      case 'template':
        navigate(`/templates/${result.id}`);
        break;
      case 'user':
        navigate(`/users/${result.id}`);
        break;
      case 'worksite':
        navigate(`/worksites/${result.id}`);
        break;
      case 'dashboard':
        navigate(`/dashboard/${result.id}`);
        break;
    }
  };

  const hasActiveFilters =
    selectedTypes.length > 0 || selectedStatuses.length > 0 || selectedCategories.length > 0;

  return (
    <Box>
      {/* Search Header */}
      <Box mb={3}>
        <Typography variant='h4' gutterBottom>
          Search
        </Typography>
        <GlobalSearch
          variant='page'
          initialQuery={query}
          showFilters={true}
          placeholder='Search across all forms, templates, users, and more...'
        />
      </Box>

      {query && (
        <Grid container spacing={3}>
          {/* Filters Sidebar */}
          <Grid size={{ xs: 12 }} md={3}>
            <Paper sx={{ p: 2, position: 'sticky', top: 16 }}>
              <Box display='flex' justifyContent='space-between' alignItems='center' mb={2}>
                <Typography variant='h6'>Filters</Typography>
                {hasActiveFilters && (
                  <Button
                    size='small'
                    onClick={clearFilters}
                    startIcon={<ClearIcon />}
                    color='secondary'
                  >
                    Clear
                  </Button>
                )}
              </Box>

              {/* Type Filters */}
              {facets.types.length > 0 && (
                <Accordion defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant='subtitle2'>Content Type</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <List dense>
                      {facets.types.map(({ type, count }) => (
                        <ListItem key={type} disablePadding>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedTypes.includes(type)}
                                onChange={() => handleTypeFilter(type)}
                                size='small'
                              />
                            }
                            label={
                              <Box display='flex' justifyContent='space-between' width='100%'>
                                <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                                  {type}s
                                </Typography>
                                <Chip label={count} size='small' variant='outlined' />
                              </Box>
                            }
                            sx={{ width: '100%', mr: 0 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Status Filters */}
              {facets.statuses.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant='subtitle2'>Status</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <List dense>
                      {facets.statuses.map(({ status, count }) => (
                        <ListItem key={status} disablePadding>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedStatuses.includes(status)}
                                onChange={() => handleStatusFilter(status)}
                                size='small'
                              />
                            }
                            label={
                              <Box display='flex' justifyContent='space-between' width='100%'>
                                <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                                  {status}
                                </Typography>
                                <Chip label={count} size='small' variant='outlined' />
                              </Box>
                            }
                            sx={{ width: '100%', mr: 0 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}

              {/* Category Filters */}
              {facets.categories.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant='subtitle2'>Category</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    <List dense>
                      {facets.categories.map(({ category, count }) => (
                        <ListItem key={category} disablePadding>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={selectedCategories.includes(category)}
                                onChange={() => handleCategoryFilter(category)}
                                size='small'
                              />
                            }
                            label={
                              <Box display='flex' justifyContent='space-between' width='100%'>
                                <Typography variant='body2' sx={{ textTransform: 'capitalize' }}>
                                  {category}
                                </Typography>
                                <Chip label={count} size='small' variant='outlined' />
                              </Box>
                            }
                            sx={{ width: '100%', mr: 0 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </Paper>
          </Grid>

          {/* Results */}
          <Grid size={{ xs: 12 }} md={9}>
            <Box mb={2} display='flex' justifyContent='space-between' alignItems='center'>
              <Typography variant='h6'>
                {loading ? 'Searching...' : `${total} results for "${query}"`}
              </Typography>
              <FormControl size='small' sx={{ minWidth: 120 }}>
                <InputLabel>Sort by</InputLabel>
                <Select
                  value={sortBy}
                  onChange={e => handleSortChange(e.target.value)}
                  label='Sort by'
                >
                  <MenuItem value='relevance'>Relevance</MenuItem>
                  <MenuItem value='date'>Date</MenuItem>
                  <MenuItem value='name'>Name</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {error && (
              <Alert severity='error' sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Box display='flex' justifyContent='center' p={4}>
                <CircularProgress />
              </Box>
            ) : results.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant='h6' gutterBottom>
                  No results found
                </Typography>
                <Typography color='text.secondary'>
                  Try adjusting your search terms or filters
                </Typography>
              </Paper>
            ) : (
              <>
                <List>
                  {results.map((result, index) => (
                    <React.Fragment key={`${result.type}-${result.id}`}>
                      <ListItemButton
                        onClick={() => navigateToResult(result)}
                        sx={{ p: 2, borderRadius: 1 }}
                      >
                        <ListItemIcon>{getResultIcon(result.type)}</ListItemIcon>
                        <ListItemText
                          primary={
                            <Box display='flex' alignItems='center' gap={1} mb={0.5}>
                              <Typography variant='h6' color='primary'>
                                {result.title}
                              </Typography>
                              <Chip
                                label={result.type}
                                size='small'
                                variant='outlined'
                                sx={{ textTransform: 'capitalize' }}
                              />
                              {result.metadata.status && (
                                <Chip
                                  label={result.metadata.status}
                                  size='small'
                                  color={getStatusColor(result.metadata.status) as any}
                                  variant='outlined'
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              {result.description && (
                                <Typography variant='body2' color='text.secondary' gutterBottom>
                                  {result.description}
                                </Typography>
                              )}
                              {result.excerpt && (
                                <Typography variant='body2' color='text.primary' gutterBottom>
                                  {result.excerpt}
                                </Typography>
                              )}
                              <Stack
                                direction='row'
                                spacing={2}
                                alignItems='center'
                                flexWrap='wrap'
                              >
                                {result.metadata.createdBy && (
                                  <Typography variant='caption' color='text.secondary'>
                                    by {result.metadata.createdBy}
                                  </Typography>
                                )}
                                {result.metadata.location && (
                                  <Typography variant='caption' color='text.secondary'>
                                    {result.metadata.location}
                                  </Typography>
                                )}
                                {result.metadata.updatedAt && (
                                  <Typography variant='caption' color='text.secondary'>
                                    {formatDistanceToNow(new Date(result.metadata.updatedAt), {
                                      addSuffix: true,
                                    })}
                                  </Typography>
                                )}
                                {result.metadata.tags && result.metadata.tags.length > 0 && (
                                  <Box display='flex' gap={0.5}>
                                    {result.metadata.tags.slice(0, 3).map((tag, idx) => (
                                      <Chip key={idx} label={tag} size='small' variant='outlined' />
                                    ))}
                                    {result.metadata.tags.length > 3 && (
                                      <Chip
                                        label={`+${result.metadata.tags.length - 3}`}
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
                      </ListItemButton>
                      {index < results.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>

                {/* Pagination */}
                {Math.ceil(total / limit) > 1 && (
                  <Box display='flex' justifyContent='center' mt={3}>
                    <Pagination
                      count={Math.ceil(total / limit)}
                      page={page}
                      onChange={(_, newPage) => handlePageChange(newPage)}
                      color='primary'
                      size='large'
                    />
                  </Box>
                )}
              </>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SearchResults;
