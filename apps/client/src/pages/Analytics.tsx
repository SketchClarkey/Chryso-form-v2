import React, { useState } from 'react';
import {
  Container,
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import AdvancedDashboard from '../components/analytics/AdvancedDashboard';
import TrendAnalysis from '../components/analytics/TrendAnalysis';
import { subDays, startOfDay, endOfDay } from 'date-fns';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const Analytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dateRange] = useState({
    start: startOfDay(subDays(new Date(), 30)),
    end: endOfDay(new Date()),
  });
  const [granularity] = useState('day');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Typography variant="h4" gutterBottom>
        Analytics & Insights
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="analytics tabs"
          >
            <Tab
              label="Dashboard"
              icon={<DashboardIcon />}
              iconPosition="start"
              id="analytics-tab-0"
              aria-controls="analytics-tabpanel-0"
            />
            <Tab
              label="Trend Analysis"
              icon={<TimelineIcon />}
              iconPosition="start"
              id="analytics-tab-1"
              aria-controls="analytics-tabpanel-1"
            />
            <Tab
              label="Performance"
              icon={<SpeedIcon />}
              iconPosition="start"
              id="analytics-tab-2"
              aria-controls="analytics-tabpanel-2"
            />
            <Tab
              label="Reports"
              icon={<AssessmentIcon />}
              iconPosition="start"
              id="analytics-tab-3"
              aria-controls="analytics-tabpanel-3"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <AdvancedDashboard />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <TrendAnalysis 
            dateRange={dateRange}
            granularity={granularity}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Performance Analytics
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Performance analytics coming soon...
            </Typography>
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Box>
            <Typography variant="h5" gutterBottom>
              Analytics Reports
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Automated analytics reports coming soon...
            </Typography>
          </Box>
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default Analytics;