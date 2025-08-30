import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Skeleton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Email as EmailIcon,
  Visibility as OpenIcon,
  TouchApp as ClickIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Schedule as TimeIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useApi } from '../../hooks/useApi';

interface EmailTemplateStatsProps {
  open: boolean;
  onClose: () => void;
  template: any;
}

const EmailTemplateStats: React.FC<EmailTemplateStatsProps> = ({ open, onClose, template }) => {
  const { request } = useApi();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template && open) {
      loadStats();
    }
  }, [template, open]);

  const loadStats = async () => {
    if (!template) return;

    setLoading(true);
    setError(null);

    try {
      const response = await get('/api/email-templates/${template._id}/stats');
      setStats(response.data.stats);
    } catch (error: any) {
      console.error('Failed to load template stats:', error);
      setError(error.response?.data?.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUpIcon color='success' />;
    if (trend < 0) return <TrendingDownIcon color='error' />;
    return <TrendingFlatIcon color='action' />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'success.main';
    if (trend < 0) return 'error.main';
    return 'text.secondary';
  };

  const formatTrend = (trend: number) => {
    const sign = trend > 0 ? '+' : '';
    return `${sign}${trend.toFixed(1)}%`;
  };

  const StatCard = ({ title, value, subtitle, icon, progress, trend }: any) => (
    <Card>
      <CardContent>
        <Box display='flex' alignItems='center' justifyContent='space-between'>
          <Box>
            <Typography variant='h4' component='div' gutterBottom>
              {value}
            </Typography>
            <Typography variant='h6' color='text.secondary'>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant='body2' color='text.secondary'>
                {subtitle}
              </Typography>
            )}
            {trend !== undefined && (
              <Box display='flex' alignItems='center' mt={1}>
                {getTrendIcon(trend)}
                <Typography variant='body2' color={getTrendColor(trend)} sx={{ ml: 0.5 }}>
                  {formatTrend(trend)} vs last month
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ color: 'primary.main' }}>{icon}</Box>
        </Box>
        {progress !== undefined && (
          <Box mt={2}>
            <LinearProgress
              variant='determinate'
              value={Math.min(progress, 100)}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, display: 'block' }}>
              {progress.toFixed(1)}% engagement rate
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  if (!template) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle>
        <Box display='flex' alignItems='center' gap={1}>
          <EmailIcon />
          <Box>
            <Typography variant='h6'>Template Statistics</Typography>
            <Typography variant='subtitle2' color='text.secondary'>
              {template.name}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity='error' sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Grid2 container spacing={3}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Grid2 sm={6} key={index}>
                <Card>
                  <CardContent>
                    <Skeleton variant='text' width='60%' height={40} />
                    <Skeleton variant='text' width='40%' height={24} />
                    <Skeleton variant='rectangular' width='100%' height={8} sx={{ mt: 2 }} />
                  </CardContent>
                </Card>
              </Grid2>
            ))}
          </Grid2>
        ) : stats ? (
          <>
            {/* Key Metrics */}
            <Grid2 container spacing={3} sx={{ mb: 3 }}>
              <Grid2 sm={6}>
                <StatCard
                  title='Total Sent'
                  value={stats.usage.sentCount.toLocaleString()}
                  subtitle='All time'
                  icon={<EmailIcon fontSize='large' />}
                  trend={stats.trends?.sentTrend}
                />
              </Grid2>

              <Grid2 sm={6}>
                <StatCard
                  title='Open Rate'
                  value={`${(stats.usage.openRate || 0).toFixed(1)}%`}
                  subtitle='Emails opened'
                  icon={<OpenIcon fontSize='large' />}
                  progress={stats.usage.openRate || 0}
                  trend={stats.trends?.openTrend}
                />
              </Grid2>

              <Grid2 sm={6}>
                <StatCard
                  title='Click Rate'
                  value={`${(stats.usage.clickRate || 0).toFixed(1)}%`}
                  subtitle='Links clicked'
                  icon={<ClickIcon fontSize='large' />}
                  progress={stats.usage.clickRate || 0}
                  trend={stats.trends?.clickTrend}
                />
              </Grid2>

              <Grid2 sm={6}>
                <StatCard
                  title='Last 30 Days'
                  value={stats.lastMonth?.sent?.toLocaleString() || '0'}
                  subtitle='Emails sent'
                  icon={<TimeIcon fontSize='large' />}
                />
              </Grid2>
            </Grid2>

            <Divider sx={{ my: 3 }} />

            {/* Template Details */}
            <Grid2 container spacing={3}>
              <Grid2 md={6}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      Template Information
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText
                          primary='Category'
                          secondary={
                            <Chip
                              label={template.category}
                              color='primary'
                              variant='outlined'
                              size='small'
                            />
                          }
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText primary='Type' secondary={template.type} />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary='Status'
                          secondary={
                            <Chip
                              label={template.isActive ? 'Active' : 'Inactive'}
                              color={template.isActive ? 'success' : 'error'}
                              variant='outlined'
                              size='small'
                            />
                          }
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary='Last Sent'
                          secondary={
                            stats.usage.lastSent
                              ? new Date(stats.usage.lastSent).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Never'
                          }
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary='Created'
                          secondary={new Date(template.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary='Last Updated'
                          secondary={new Date(template.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid2>

              <Grid2 md={6}>
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      Performance Insights
                    </Typography>

                    {stats.usage.sentCount > 0 ? (
                      <List>
                        <ListItem>
                          <ListItemIcon>
                            <EmailIcon color='primary' />
                          </ListItemIcon>
                          <ListItemText
                            primary='Delivery Performance'
                            secondary={`${stats.usage.sentCount} emails delivered successfully`}
                          />
                        </ListItem>

                        <ListItem>
                          <ListItemIcon>
                            <OpenIcon color='info' />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${(stats.usage.openRate || 0) > 20 ? 'Good' : 'Needs Improvement'} Open Rate`}
                            secondary={
                              (stats.usage.openRate || 0) > 20
                                ? 'Above average open rate indicates engaging subject lines'
                                : 'Consider improving subject lines to increase engagement'
                            }
                          />
                        </ListItem>

                        <ListItem>
                          <ListItemIcon>
                            <ClickIcon color='success' />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${(stats.usage.clickRate || 0) > 5 ? 'Excellent' : 'Average'} Click Rate`}
                            secondary={
                              (stats.usage.clickRate || 0) > 5
                                ? 'High click rate shows effective call-to-action'
                                : 'Consider optimizing links and call-to-action buttons'
                            }
                          />
                        </ListItem>

                        {stats.trends && (
                          <ListItem>
                            <ListItemIcon>{getTrendIcon(stats.trends.sentTrend)}</ListItemIcon>
                            <ListItemText
                              primary='Usage Trend'
                              secondary={
                                stats.trends.sentTrend > 0
                                  ? 'Template usage is increasing'
                                  : stats.trends.sentTrend < 0
                                    ? 'Template usage is decreasing'
                                    : 'Template usage is stable'
                              }
                            />
                          </ListItem>
                        )}
                      </List>
                    ) : (
                      <Alert severity='info'>
                        This template hasn't been used yet. Send some test emails to see performance
                        metrics.
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid2>
            </Grid2>

            {/* Recommendations */}
            {stats.usage.sentCount > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Card>
                  <CardContent>
                    <Typography variant='h6' gutterBottom>
                      Recommendations
                    </Typography>
                    <List>
                      {(stats.usage.openRate || 0) < 20 && (
                        <ListItem>
                          <ListItemText
                            primary='Improve Subject Lines'
                            secondary='Your open rate is below average. Try A/B testing different subject lines to improve engagement.'
                          />
                        </ListItem>
                      )}

                      {(stats.usage.clickRate || 0) < 3 && stats.usage.sentCount > 10 && (
                        <ListItem>
                          <ListItemText
                            primary='Optimize Call-to-Action'
                            secondary='Low click rate suggests your call-to-action buttons may need optimization. Consider making them more prominent or compelling.'
                          />
                        </ListItem>
                      )}

                      {stats.usage.sentCount > 100 && (stats.usage.openRate || 0) > 25 && (
                        <ListItem>
                          <ListItemText
                            primary='High Performing Template'
                            secondary='This template performs well! Consider using it as a baseline for creating similar templates.'
                          />
                        </ListItem>
                      )}

                      {stats.usage.sentCount < 5 && (
                        <ListItem>
                          <ListItemText
                            primary='Limited Data'
                            secondary='Send more emails to get meaningful performance insights. Consider running test campaigns.'
                          />
                        </ListItem>
                      )}
                    </List>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        ) : (
          <Typography variant='body1' color='text.secondary' textAlign='center' py={4}>
            No statistics available for this template.
          </Typography>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailTemplateStats;
