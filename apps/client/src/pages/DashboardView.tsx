import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Alert } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import DashboardViewer from '../components/dashboards/DashboardViewer';

const DashboardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    return (
      <Box>
        <Alert severity="error">
          Dashboard ID not provided
        </Alert>
      </Box>
    );
  }

  const handleEdit = () => {
    navigate(`/dashboard-builder/${id}`);
  };

  return (
    <DashboardViewer
      dashboardId={id}
      editable={true}
      onEdit={handleEdit}
    />
  );
};

export default DashboardView;