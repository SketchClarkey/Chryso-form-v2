import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Typography,
  Chip,
  Divider,
  CircularProgress,
  Autocomplete,
  Avatar,
  Stack,
  useTheme,
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  History as HistoryIcon,
  TrendingUp as TrendingIcon,
  Description as FormIcon,
  Template as TemplateIcon,
  Person as UserIcon,
  LocationOn as WorksiteIcon,
  Dashboard as DashboardIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';

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

interface GlobalSearchProps {
  variant?: 'header' | 'page' | 'modal';
  placeholder?: string;
  onResultSelect?: (result: SearchResult) => void;
  showFilters?: boolean;
  initialQuery?: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  variant = 'header',
  placeholder = 'Search forms, templates, users...',
  onResultSelect,
  showFilters = false,
  initialQuery = '',
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { request } = useApi();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularTerms, setPopularTerms] = useState<{ term: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2) {
      performSearch();
      getSuggestions();
    } else {
      setResults([]);
      setSuggestions([]);
    }
  }, [debouncedQuery, selectedTypes]);

  useEffect(() => {
    if (variant === 'page') {
      loadRecentAndPopular();
    }
  }, [variant]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery,
        limit: '10',
        sortBy: 'relevance',
      });

      if (selectedTypes.length > 0) {
        params.set('types', selectedTypes.join(','));
      }

      const response = await get('/api/search?${params.toString()}');
      setResults(response.data.results);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async () => {
    try {
      const response = await get('/api/search/suggestions?q=${encodeURIComponent(debouncedQuery)}');
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
    }
  };

  const loadRecentAndPopular = async () => {
    try {
      const [recentRes, popularRes] = await Promise.all([
        get('/api/search/recent'),
        get('/api/search/popular'),
      ]);

      setRecentSearches(recentRes.data.recentSearches);
      setPopularTerms(popularRes.data.popularTerms);
    } catch (error) {
      console.error('Failed to load recent/popular searches:', error);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    setOpen(value.length >= 2);
  };

  const handleResultClick = (result: SearchResult) => {
    setOpen(false);
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      // Navigate to the result
      navigateToResult(result);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setOpen(false);
    // Trigger search with the suggestion
    performSearch();
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
        return <SearchIcon />;
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

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setOpen(false);
    } else if (event.key === 'Enter' && query) {
      setOpen(false);
      if (variant === 'header') {
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }
    }
  };

  const searchWidth = variant === 'header' ? 400 : '100%';

  return (
    <Box ref={anchorRef} sx={{ position: 'relative', width: searchWidth }}>
      <TextField
        ref={inputRef}
        fullWidth
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(query.length >= 2)}
        size={variant === 'header' ? 'small' : 'medium'}
        InputProps={{
          startAdornment: (
            <InputAdornment position='start'>
              <SearchIcon color='action' />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position='end'>
              {loading && <CircularProgress size={20} />}
              {query && (
                <IconButton size='small' onClick={handleClear}>
                  <ClearIcon />
                </IconButton>
              )}
            </InputAdornment>
          ),
          sx: {
            borderRadius: variant === 'header' ? 20 : 1,
          },
        }}
      />

      {/* Type Filters for page variant */}
      {showFilters && variant === 'page' && (
        <Box sx={{ mt: 2 }}>
          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
            {[
              { value: 'form', label: 'Forms', icon: <FormIcon /> },
              { value: 'template', label: 'Templates', icon: <TemplateIcon /> },
              { value: 'user', label: 'Users', icon: <UserIcon /> },
              { value: 'worksite', label: 'Worksites', icon: <WorksiteIcon /> },
              { value: 'dashboard', label: 'Dashboards', icon: <DashboardIcon /> },
            ].map(type => (
              <Chip
                key={type.value}
                label={type.label}
                icon={type.icon}
                clickable
                color={selectedTypes.includes(type.value) ? 'primary' : 'default'}
                onClick={() => {
                  setSelectedTypes(prev =>
                    prev.includes(type.value)
                      ? prev.filter(t => t !== type.value)
                      : [...prev, type.value]
                  );
                }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Search Results Dropdown */}
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement='bottom-start'
        style={{ width: anchorRef.current?.clientWidth, zIndex: theme.zIndex.modal }}
        disablePortal={false}
      >
        <Paper
          sx={{
            mt: 1,
            maxHeight: 400,
            overflow: 'auto',
            boxShadow: 3,
            border: 1,
            borderColor: 'divider',
          }}
        >
          <List dense>
            {/* Search Results */}
            {results.length > 0 && (
              <>
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant='subtitle2' color='text.secondary'>
                        Search Results
                      </Typography>
                    }
                  />
                </ListItem>
                {results.map(result => (
                  <ListItemButton
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleResultClick(result)}
                    sx={{ pl: 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>{getResultIcon(result.type)}</ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display='flex' alignItems='center' gap={1}>
                          <Typography variant='body2' noWrap>
                            {result.title}
                          </Typography>
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
                            <Typography variant='caption' color='text.secondary' display='block'>
                              {result.description}
                            </Typography>
                          )}
                          {result.excerpt && (
                            <Typography variant='caption' color='text.secondary'>
                              {result.excerpt}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                ))}
                {variant === 'header' && (
                  <ListItemButton
                    onClick={() => navigate(`/search?q=${encodeURIComponent(query)}`)}
                  >
                    <ListItemText
                      primary={
                        <Typography variant='body2' color='primary'>
                          View all results for "{query}"
                        </Typography>
                      }
                    />
                  </ListItemButton>
                )}
              </>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && query.length >= 2 && (
              <>
                {results.length > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Typography variant='subtitle2' color='text.secondary'>
                        Suggestions
                      </Typography>
                    }
                  />
                </ListItem>
                {suggestions.map((suggestion, index) => (
                  <ListItemButton
                    key={`suggestion-${index}`}
                    onClick={() => handleSuggestionClick(suggestion)}
                    sx={{ pl: 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <SearchIcon fontSize='small' />
                    </ListItemIcon>
                    <ListItemText primary={suggestion} />
                  </ListItemButton>
                ))}
              </>
            )}

            {/* Recent/Popular for empty search */}
            {!query && variant === 'page' && (
              <>
                {recentSearches.length > 0 && (
                  <>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant='subtitle2' color='text.secondary'>
                            Recent Searches
                          </Typography>
                        }
                      />
                    </ListItem>
                    {recentSearches.map((recent, index) => (
                      <ListItemButton
                        key={`recent-${index}`}
                        onClick={() => handleSuggestionClick(recent)}
                        sx={{ pl: 2 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <HistoryIcon fontSize='small' />
                        </ListItemIcon>
                        <ListItemText primary={recent} />
                      </ListItemButton>
                    ))}
                  </>
                )}

                {popularTerms.length > 0 && (
                  <>
                    {recentSearches.length > 0 && <Divider />}
                    <ListItem>
                      <ListItemText
                        primary={
                          <Typography variant='subtitle2' color='text.secondary'>
                            Popular Searches
                          </Typography>
                        }
                      />
                    </ListItem>
                    {popularTerms.slice(0, 5).map((popular, index) => (
                      <ListItemButton
                        key={`popular-${index}`}
                        onClick={() => handleSuggestionClick(popular.term)}
                        sx={{ pl: 2 }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <TrendingIcon fontSize='small' />
                        </ListItemIcon>
                        <ListItemText
                          primary={popular.term}
                          secondary={`${popular.count} searches`}
                        />
                      </ListItemButton>
                    ))}
                  </>
                )}
              </>
            )}

            {/* No results */}
            {query.length >= 2 && results.length === 0 && suggestions.length === 0 && !loading && (
              <ListItem>
                <ListItemText
                  primary={
                    <Typography variant='body2' color='text.secondary' textAlign='center'>
                      No results found for "{query}"
                    </Typography>
                  }
                />
              </ListItem>
            )}
          </List>
        </Paper>
      </Popper>
    </Box>
  );
};

export default GlobalSearch;
