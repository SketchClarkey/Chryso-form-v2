import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface TrendData {
  date: string;
  created: number;
  completed: number;
  total: number;
}

interface FormTrendsChartProps {
  data: TrendData[];
  title: string;
}

export function FormTrendsChart({ data, title }: FormTrendsChartProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card>
      <CardContent>
        <Typography variant='h6' gutterBottom>
          {title}
        </Typography>
        <Box sx={{ height: 300, width: '100%' }}>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' tickFormatter={formatDate} tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip
                labelFormatter={value => formatDate(value)}
                formatter={(value: number, name: string) => [
                  value,
                  name === 'created' ? 'Created' : name === 'completed' ? 'Completed' : 'Total',
                ]}
              />
              <Area
                type='monotone'
                dataKey='total'
                stackId='1'
                stroke='#8884d8'
                fill='#8884d8'
                fillOpacity={0.3}
              />
              <Line
                type='monotone'
                dataKey='created'
                stroke='#2196f3'
                strokeWidth={2}
                dot={{ fill: '#2196f3', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type='monotone'
                dataKey='completed'
                stroke='#4caf50'
                strokeWidth={2}
                dot={{ fill: '#4caf50', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}
