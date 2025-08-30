import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ShowChart as ShowChartIcon,
  Analytics as AnalyticsIcon,
  Insights as InsightsIcon,
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import { useApi } from '../../hooks/useApi';
import { format, parseISO, subDays, endOfDay } from 'date-fns';

interface TrendPoint {
  period: string;
  value: number;
  change?: number;
  changePercentage?: number;
  metadata?: any;
}

interface TrendAnalysis {
  metric: string;
  trend: TrendPoint[];
  summary: {
    total: number;
    average: number;
    peak: number;
    lowest: number;
  };
  insights: {
    type: 'growth' | 'decline' | 'seasonal' | 'volatile' | 'stable';
    description: string;
    confidence: number;
    recommendations?: string[];
  };
}

interface TrendAnalysisProps {
  dateRange: {
    start: Date;
    end: Date;
  };
  granularity: string;
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ dateRange, granularity }) => {
  const { request } = useApi();
  const [analyses, setAnalyses] = useState<TrendAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState('formSubmissions');

  const availableMetrics = [
    { value: 'formSubmissions', label: 'Form Submissions', color: '#1976d2' },
    { value: 'completions', label: 'Form Completions', color: '#2e7d32' },
    { value: 'userActivity', label: 'User Activity', color: '#ed6c02' },
  ];

  useEffect(() => {
    loadTrendAnalysis();
  }, [dateRange, granularity]);

  const loadTrendAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const promises = availableMetrics.map(metric =>
        request(
          `/api/analytics/trends/${metric.value}?startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}&granularity=${granularity}`
        )
      );

      const results = await Promise.all(promises);
      const analysesData = results.map((result, index) => ({
        metric: availableMetrics[index].value,
        ...result.data,
        insights: generateInsights(result.data.trend),
      }));

      setAnalyses(analysesData);
    } catch (error: any) {
      setError(error.message || 'Failed to load trend analysis');
    } finally {
      setLoading(false);
    }
  };

  const generateInsights = (trend: TrendPoint[]) => {
    if (!trend || trend.length < 2) {
      return {
        type: 'stable' as const,
        description: 'Insufficient data for trend analysis',
        confidence: 0,
      };
    }

    // Calculate trend statistics
    const values = trend.map(t => t.value);
    const changes = trend.slice(1).map((t, i) => t.value - trend[i].value);
    const positiveChanges = changes.filter(c => c > 0).length;
    const negativeChanges = changes.filter(c => c < 0).length;
    const totalChange = values[values.length - 1] - values[0];
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;

    // Calculate volatility
    const variance =
      changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length;
    const volatility = Math.sqrt(variance);
    const coefficientOfVariation = Math.abs(avgChange) > 0 ? volatility / Math.abs(avgChange) : 0;

    // Determine trend type and confidence
    let type: 'growth' | 'decline' | 'seasonal' | 'volatile' | 'stable';
    let description: string;
    let confidence: number;
    let recommendations: string[] = [];

    if (coefficientOfVariation > 1.5) {
      type = 'volatile';
      description = 'High volatility with significant fluctuations';
      confidence = 85;
      recommendations = [
        'Investigate causes of high variability',
        'Consider implementing stability measures',
        'Monitor for external factors affecting performance',
      ];
    } else if (totalChange > 0 && positiveChanges > negativeChanges) {
      type = 'growth';
      const growthRate = (totalChange / values[0]) * 100;
      description = `Positive growth trend with ${growthRate.toFixed(1)}% overall increase`;
      confidence = Math.min(95, 60 + (positiveChanges / changes.length) * 35);
      recommendations = [
        'Continue current strategies that are driving growth',
        'Scale successful initiatives',
        'Monitor sustainability of growth rate',
      ];
    } else if (totalChange < 0 && negativeChanges > positiveChanges) {
      type = 'decline';
      const declineRate = Math.abs(totalChange / values[0]) * 100;
      description = `Declining trend with ${declineRate.toFixed(1)}% overall decrease`;
      confidence = Math.min(95, 60 + (negativeChanges / changes.length) * 35);
      recommendations = [
        'Identify root causes of decline',
        'Implement corrective measures',
        'Review and adjust current strategies',
      ];
    } else if (detectSeasonality(values)) {
      type = 'seasonal';
      description = 'Cyclical pattern detected with recurring fluctuations';
      confidence = 75;
      recommendations = [
        'Plan for seasonal variations',
        'Adjust resources based on seasonal patterns',
        'Develop counter-seasonal strategies',
      ];
    } else {
      type = 'stable';
      description = 'Relatively stable with minimal fluctuations';
      confidence = Math.min(90, 50 + (1 - coefficientOfVariation) * 40);
      recommendations = [
        'Maintain current performance levels',
        'Look for optimization opportunities',
        'Monitor for early signs of change',
      ];
    }

    return {
      type,
      description,
      confidence: Math.round(confidence),
      recommendations,
    };
  };

  const detectSeasonality = (values: number[]): boolean => {
    // Simple seasonality detection based on autocorrelation
    if (values.length < 7) return false;

    const period = Math.floor(values.length / 3);
    const correlations: number[] = [];

    for (let lag = 1; lag <= period; lag++) {
      const pairs: Array<[number, number]> = [];
      for (let i = lag; i < values.length; i++) {
        pairs.push([values[i - lag], values[i]]);
      }

      if (pairs.length < 3) continue;

      const correlation = calculateCorrelation(pairs);
      correlations.push(correlation);
    }

    return correlations.some(r => r > 0.6);
  };

  const calculateCorrelation = (pairs: Array<[number, number]>): number => {
    const n = pairs.length;
    const sumX = pairs.reduce((sum, [x]) => sum + x, 0);
    const sumY = pairs.reduce((sum, [, y]) => sum + y, 0);
    const sumXY = pairs.reduce((sum, [x, y]) => sum + x * y, 0);
    const sumX2 = pairs.reduce((sum, [x]) => sum + x * x, 0);
    const sumY2 = pairs.reduce((sum, [, y]) => sum + y * y, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  };

  const createTrendChartData = (analysis: TrendAnalysis) => {
    const metric = availableMetrics.find(m => m.value === analysis.metric);
    const color = metric?.color || '#1976d2';

    return {
      labels: analysis.trend.map(t => format(parseISO(t.period), 'MMM dd')),
      datasets: [
        {
          label: metric?.label || 'Value',
          data: analysis.trend.map(t => t.value),
          borderColor: color,
          backgroundColor: `${color}20`,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: analysis.trend.map(t =>
            t.changePercentage && t.changePercentage > 0
              ? '#2e7d32'
              : t.changePercentage && t.changePercentage < 0
                ? '#d32f2f'
                : color
          ),
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    };
  };

  const getInsightTypeColor = (type: string) => {
    switch (type) {
      case 'growth':
        return 'success';
      case 'decline':
        return 'error';
      case 'volatile':
        return 'warning';
      case 'seasonal':
        return 'info';
      default:
        return 'default';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'growth':
        return <TrendingUpIcon />;
      case 'decline':
        return <TrendingDownIcon />;
      case 'volatile':
        return <ShowChartIcon />;
      case 'seasonal':
        return <AnalyticsIcon />;
      default:
        return <InsightsIcon />;
    }
  };

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' height='300px'>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>;
  }

  const selectedAnalysis = analyses.find(a => a.metric === selectedMetric);

  return (
    <Box>
      <Typography variant='h5' gutterBottom>
        Trend Analysis
      </Typography>

      {/* Metric Selector */}
      <Box mb={3}>
        <FormControl size='small' sx={{ minWidth: 200 }}>
          <InputLabel>Select Metric</InputLabel>
          <Select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)}>
            {availableMetrics.map(metric => (
              <MenuItem key={metric.value} value={metric.value}>
                {metric.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {selectedAnalysis && (
        <Grid container spacing={3}>
          {/* Main Chart */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  {availableMetrics.find(m => m.value === selectedMetric)?.label} Trend
                </Typography>
                <Box height={400}>
                  <Line
                    data={createTrendChartData(selectedAnalysis)}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            display: true,
                            color: 'rgba(0,0,0,0.1)',
                          },
                        },
                        x: {
                          grid: {
                            display: false,
                          },
                        },
                      },
                      plugins: {
                        tooltip: {
                          callbacks: {
                            afterLabel: context => {
                              const point = selectedAnalysis.trend[context.dataIndex];
                              if (point.changePercentage !== undefined) {
                                return `Change: ${point.changePercentage > 0 ? '+' : ''}${point.changePercentage.toFixed(1)}%`;
                              }
                              return '';
                            },
                          },
                        },
                      },
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Insights Panel */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  AI Insights
                </Typography>

                {/* Trend Type */}
                <Box display='flex' alignItems='center' gap={1} mb={2}>
                  {getInsightIcon(selectedAnalysis.insights.type)}
                  <Chip
                    label={selectedAnalysis.insights.type.toUpperCase()}
                    color={getInsightTypeColor(selectedAnalysis.insights.type) as any}
                    size='small'
                  />
                  <Typography variant='caption' color='text.secondary'>
                    {selectedAnalysis.insights.confidence}% confidence
                  </Typography>
                </Box>

                {/* Description */}
                <Typography variant='body2' paragraph>
                  {selectedAnalysis.insights.description}
                </Typography>

                {/* Recommendations */}
                {selectedAnalysis.insights.recommendations && (
                  <Box>
                    <Typography variant='subtitle2' gutterBottom>
                      Recommendations:
                    </Typography>
                    {selectedAnalysis.insights.recommendations.map((rec, index) => (
                      <Typography
                        key={index}
                        variant='caption'
                        display='block'
                        sx={{ mb: 0.5, pl: 1 }}
                      >
                        • {rec}
                      </Typography>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Summary Statistics */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  Summary Statistics
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>
                      Total
                    </Typography>
                    <Typography variant='h6'>
                      {selectedAnalysis.summary.total.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>
                      Average
                    </Typography>
                    <Typography variant='h6'>
                      {selectedAnalysis.summary.average.toFixed(1)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>
                      Peak
                    </Typography>
                    <Typography variant='h6' color='success.main'>
                      {selectedAnalysis.summary.peak.toLocaleString()}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Typography variant='caption' color='text.secondary'>
                      Lowest
                    </Typography>
                    <Typography variant='h6' color='error.main'>
                      {selectedAnalysis.summary.lowest.toLocaleString()}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Detailed Data Table */}
          <Grid size={{ xs: 12 }}>
            <Card>
              <CardContent>
                <Typography variant='h6' gutterBottom>
                  Detailed Breakdown
                </Typography>
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Period</TableCell>
                        <TableCell align='right'>Value</TableCell>
                        <TableCell align='right'>Change</TableCell>
                        <TableCell align='right'>Change %</TableCell>
                        <TableCell align='center'>Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedAnalysis.trend.map((point, index) => (
                        <TableRow key={point.period}>
                          <TableCell>{format(parseISO(point.period), 'MMM dd, yyyy')}</TableCell>
                          <TableCell align='right'>{point.value.toLocaleString()}</TableCell>
                          <TableCell align='right'>
                            {point.change !== undefined ? (
                              <Typography
                                color={
                                  point.change > 0
                                    ? 'success.main'
                                    : point.change < 0
                                      ? 'error.main'
                                      : 'text.secondary'
                                }
                              >
                                {point.change > 0 ? '+' : ''}
                                {point.change}
                              </Typography>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell align='right'>
                            {point.changePercentage !== undefined ? (
                              <Typography
                                color={
                                  point.changePercentage > 0
                                    ? 'success.main'
                                    : point.changePercentage < 0
                                      ? 'error.main'
                                      : 'text.secondary'
                                }
                              >
                                {point.changePercentage > 0 ? '+' : ''}
                                {point.changePercentage.toFixed(1)}%
                              </Typography>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell align='center'>
                            {point.changePercentage !== undefined &&
                              (point.changePercentage > 0 ? (
                                <TrendingUpIcon color='success' fontSize='small' />
                              ) : point.changePercentage < 0 ? (
                                <TrendingDownIcon color='error' fontSize='small' />
                              ) : (
                                <div style={{ width: 20, height: 20 }} />
                              ))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default TrendAnalysis;
