import React, { useState } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { Box, Container, Breadcrumbs, Link, Typography } from '@mui/material';
import ReportList from '../components/reports/ReportList';
import ReportBuilder from '../components/reports/ReportBuilder';
import ReportViewer from '../components/reports/ReportViewer';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();

  const handleCreateNew = () => {
    navigate('/reports/new');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Routes>
        <Route 
          path="/" 
          element={<ReportList onCreateNew={handleCreateNew} />} 
        />
        <Route 
          path="/new" 
          element={<ReportBuilderPage />} 
        />
        <Route 
          path="/:id/edit" 
          element={<ReportBuilderPage />} 
        />
        <Route 
          path="/:id/view" 
          element={<ReportViewerPage />} 
        />
      </Routes>
    </Container>
  );
};

const ReportBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <Box>
      <Box mb={2}>
        <Breadcrumbs>
          <Link
            color="inherit"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/reports');
            }}
          >
            Reports
          </Link>
          <Typography color="text.primary">
            {id ? 'Edit Report' : 'New Report'}
          </Typography>
        </Breadcrumbs>
      </Box>
      <ReportBuilder reportId={id} />
    </Box>
  );
};

const ReportViewerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  if (!id) {
    navigate('/reports');
    return null;
  }

  const handleEdit = () => {
    navigate(`/reports/${id}/edit`);
  };

  return (
    <Box>
      <Box mb={2}>
        <Breadcrumbs>
          <Link
            color="inherit"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate('/reports');
            }}
          >
            Reports
          </Link>
          <Typography color="text.primary">View Report</Typography>
        </Breadcrumbs>
      </Box>
      <ReportViewer reportId={id} onEdit={handleEdit} />
    </Box>
  );
};

export default ReportsPage;