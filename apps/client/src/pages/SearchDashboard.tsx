import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  History as HistoryIcon,
  Assessment as AnalyticsIcon,
  Speed as PerformanceIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useApi } from '../hooks/useApi';
import GlobalSearch from '../components/search/GlobalSearch';

interface SearchAnalytics {
  totalSearches: number;
  topQueries: { query: string; count: number; avgResults: number }[];
  searchesByType: { type: string; count: number }[];
  searchesByDay: { day: string; searches: number; results: number }[];
  avgSearchTime: number;
  noResultsQueries: { query: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const SearchDashboard: React.FC = () => {
  const { request } = useApi();
  const [analytics, setAnalytics] = useState<SearchAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSearchAnalytics();
  }, []);

  const loadSearchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // This would be a real API call in production
      // For now, we'll generate mock data
      const mockAnalytics: SearchAnalytics = {
        totalSearches: 15420,
        avgSearchTime: 245,
        topQueries: [
          { query: 'inspection', count: 342, avgResults: 28 },
          { query: 'maintenance', count: 289, avgResults: 15 },
          { query: 'safety check', count: 234, avgResults: 22 },
          { query: 'equipment', count: 198, avgResults: 35 },
          { query: 'report', count: 167, avgResults: 42 },
          { query: 'completed forms', count: 145, avgResults: 18 },
          { query: 'urgent', count: 123, avgResults: 12 },
          { query: 'john smith', count: 98, avgResults: 8 },
          { query: 'site A', count: 87, avgResults: 25 },
          { query: 'template', count: 76, avgResults: 31 },
        ],
        searchesByType: [
          { type: 'Forms', count: 8945 },
          { type: 'Templates', count: 2341 },
          { type: 'Users', count: 1876 },
          { type: 'Worksites', count: 1542 },
          { type: 'Dashboards', count: 716 },
        ],
        searchesByDay: [
          { day: 'Mon', searches: 2340, results: 15680 },
          { day: 'Tue', searches: 2567, results: 17234 },
          { day: 'Wed', searches: 2890, results: 19456 },
          { day: 'Thu', searches: 2675, results: 18123 },
          { day: 'Fri', searches: 2445, results: 16789 },
          { day: 'Sat', searches: 1234, results: 8765 },
          { day: 'Sun', searches: 1269, results: 9234 },
        ],
        noResultsQueries: [
          { query: 'xyz equipment', count: 23 },
          { query: 'broken machinery', count: 18 },
          { query: 'old reports 2019', count: 15 },
          { query: 'archived forms', count: 12 },
          { query: 'deleted templates', count: 9 },
        ],
      };

      setAnalytics(mockAnalytics);
    } catch (err: any) {
      setError(err.message || 'Failed to load search analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='400px'>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity='error' sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!analytics) {
    return (
      <Alert severity='warning' sx={{ mb: 2 }}>
        No search analytics data available
      </Alert>
    );
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant='h4' gutterBottom>
          Search Analytics
        </Typography>
        <Typography variant='body1' color='text.secondary' gutterBottom>
          Monitor search performance and user behavior patterns
        </Typography>

        {/* Quick Search */}
        <Box mt={2}>
          <GlobalSearch
            variant='page'
            placeholder='Test search functionality...'
            showFilters={false}
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <SearchIcon color='primary' sx={{ mr: 2, fontSize: 32 }} />
                <Box>
                  <Typography variant='h4'>{analytics.totalSearches.toLocaleString()}</Typography>
                  <Typography color='text.secondary'>Total Searches</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <PerformanceIcon color='success' sx={{ mr: 2, fontSize: 32 }} />
                <Box>
                  <Typography variant='h4'>{analytics.avgSearchTime}ms</Typography>
                  <Typography color='text.secondary'>Avg Search Time</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <TrendingUpIcon color='info' sx={{ mr: 2, fontSize: 32 }} />
                <Box>
                  <Typography variant='h4'>
                    {(
                      analytics.searchesByDay.reduce((sum, day) => sum + day.searches, 0) / 7
                    ).toFixed(0)}
                  </Typography>
                  <Typography color='text.secondary'>Daily Average</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display='flex' alignItems='center'>
                <AnalyticsIcon color='warning' sx={{ mr: 2, fontSize: 32 }} />
                <Box>
                  <Typography variant='h4'>
                    {analytics.noResultsQueries.reduce((sum, q) => sum + q.count, 0)}
                  </Typography>
                  <Typography color='text.secondary'>No Results</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Search Activity Chart */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Search Activity by Day
            </Typography>
            <ResponsiveContainer width='100%' height={300}>
              <BarChart data={analytics.searchesByDay}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='day' />
                <YAxis />
                <Tooltip />
                <Bar dataKey='searches' fill='#8884d8' name='Searches' />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Searches by Content Type */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Searches by Content Type
            </Typography>
            <ResponsiveContainer width='100%' height={300}>
              <PieChart>
                <Pie
                  data={analytics.searchesByType}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill='#8884d8'
                  dataKey='count'
                  nameKey='type'
                >
                  {analytics.searchesByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Top Search Queries */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Top Search Queries
            </Typography>
            <TableContainer>
              <Table size='small'>
                <TableHead>
                  <TableRow>
                    <TableCell>Query</TableCell>
                    <TableCell align='right'>Searches</TableCell>
                    <TableCell align='right'>Avg Results</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics.topQueries.slice(0, 10).map((query, index) => (
                    <TableRow key={index}>
                      <TableCell component='th' scope='row'>
                        {query.query}
                      </TableCell>
                      <TableCell align='right'>
                        <Chip label={query.count} size='small' color='primary' variant='outlined' />
                      </TableCell>
                      <TableCell align='right'>{query.avgResults}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* No Results Queries */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Queries with No Results
            </Typography>
            <List>
              {analytics.noResultsQueries.map((query, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      <SearchIcon color='error' />
                    </ListItemIcon>
                    <ListItemText primary={query.query} secondary={`${query.count} searches`} />
                    <Chip label={query.count} size='small' color='error' variant='outlined' />
                  </ListItem>
                  {index < analytics.noResultsQueries.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Search Performance Insights */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' gutterBottom>
              Search Performance Insights
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Box p={2} bgcolor='success.light' borderRadius={1}>
                  <Typography variant='subtitle2' color='success.dark'>
                    Most Effective Queries
                  </Typography>
                  <Typography variant='body2'>
                    Single-word queries like "inspection" and "maintenance" return the most relevant
                    results
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box p={2} bgcolor='warning.light' borderRadius={1}>
                  <Typography variant='subtitle2' color='warning.dark'>
                    Improvement Opportunity
                  </Typography>
                  <Typography variant='body2'>
                    {analytics.noResultsQueries.reduce((sum, q) => sum + q.count, 0)} searches
                    returned no results. Consider improving content coverage.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box p={2} bgcolor='info.light' borderRadius={1}>
                  <Typography variant='subtitle2' color='info.dark'>
                    Usage Pattern
                  </Typography>
                  <Typography variant='body2'>
                    Peak search activity occurs on Wednesday and Thursday, suggesting mid-week
                    workflow patterns
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SearchDashboard;
