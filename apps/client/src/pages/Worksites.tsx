import { useState, useEffect } from 'react';
import { Typography, Button, Box, Alert, CircularProgress } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { WorksiteTable, type Worksite } from '../components/worksites/WorksiteTable';
import { WorksiteForm } from '../components/worksites/WorksiteForm';
import { worksiteService } from '../services/worksiteService';

export function Worksites() {
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingWorksite, setEditingWorksite] = useState<Worksite | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    const loadWorksites = async () => {
      try {
        setLoading(true);
        setError('');

        const worksitesData = await worksiteService.getWorksites();
        setWorksites(worksitesData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load worksites';
        setError(errorMessage);
        console.error('Error loading worksites:', err);

        // Fallback to mock data if API fails
        const mockWorksites: Worksite[] = [
          {
            id: '1',
            name: 'Main Office Building',
            customerName: 'Acme Corporation',
            address: {
              street: '123 Business Ave',
              city: 'Business City',
              state: 'CA',
              zipCode: '90210',
              country: 'United States',
            },
            contacts: [
              {
                name: 'John Smith',
                position: 'Facility Manager',
                phone: '555-0123',
                email: 'john.smith@acme.com',
                isPrimary: true,
              },
            ],
            equipment: [
              {
                id: 'pump-001',
                type: 'pump',
                model: 'Grundfos CR1-15',
                serialNumber: 'GF12345',
                condition: 'good',
                lastServiceDate: '2024-01-15',
                notes: 'Recently serviced',
              },
              {
                id: 'tank-001',
                type: 'tank',
                model: 'Steel Tank 500L',
                serialNumber: 'ST67890',
                condition: 'excellent',
                notes: 'New installation',
              },
            ],
            isActive: true,
            createdAt: '2024-01-01T08:00:00Z',
            updatedAt: '2024-01-15T12:00:00Z',
          },
          {
            id: '2',
            name: 'Construction Site Alpha',
            customerName: 'BuildCorp Inc.',
            address: {
              street: '456 Construction Blvd',
              city: 'Builder Town',
              state: 'TX',
              zipCode: '75001',
              country: 'United States',
            },
            contacts: [
              {
                name: 'Sarah Johnson',
                position: 'Site Supervisor',
                phone: '555-0456',
                email: 'sarah.j@buildcorp.com',
                isPrimary: true,
              },
            ],
            equipment: [
              {
                id: 'dispenser-001',
                type: 'dispenser',
                model: 'ChemDisp Pro 200',
                serialNumber: 'CD98765',
                condition: 'needs-repair',
                notes: 'Pump mechanism needs replacement',
              },
            ],
            isActive: true,
            createdAt: '2024-01-10T10:00:00Z',
            updatedAt: '2024-01-20T14:30:00Z',
          },
        ];

        setWorksites(mockWorksites);
      } finally {
        setLoading(false);
      }
    };

    loadWorksites();
  }, []);

  const handleCreateWorksite = () => {
    setEditingWorksite(null);
    setFormError('');
    setFormOpen(true);
  };

  const handleEditWorksite = (worksite: Worksite) => {
    setEditingWorksite(worksite);
    setFormError('');
    setFormOpen(true);
  };

  const handleDeleteWorksite = async (worksiteId: string) => {
    try {
      await worksiteService.deleteWorksite(worksiteId);
      setWorksites(prevWorksites => prevWorksites.filter(worksite => worksite.id !== worksiteId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete worksite';
      setError(errorMessage);
      console.error('Error deleting worksite:', err);
    }
  };

  const handleToggleWorksiteStatus = async (worksiteId: string, isActive: boolean) => {
    try {
      const updatedWorksite = await worksiteService.toggleWorksiteStatus(worksiteId, isActive);
      setWorksites(prevWorksites =>
        prevWorksites.map(worksite => (worksite.id === worksiteId ? updatedWorksite : worksite))
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update worksite status';
      setError(errorMessage);
      console.error('Error toggling worksite status:', err);
    }
  };

  const handleViewEquipment = (worksiteId: string) => {
    // For now, just log the action
    // In a real app, this could open a dedicated equipment management dialog
    console.log('View equipment for worksite:', worksiteId);
  };

  const handleFormSubmit = async (worksiteData: any) => {
    try {
      setFormLoading(true);
      setFormError('');

      let savedWorksite: Worksite;

      if (editingWorksite) {
        // Update existing worksite
        savedWorksite = await worksiteService.updateWorksite(editingWorksite.id, worksiteData);
        setWorksites(prevWorksites =>
          prevWorksites.map(worksite =>
            worksite.id === editingWorksite.id ? savedWorksite : worksite
          )
        );
      } else {
        // Create new worksite
        savedWorksite = await worksiteService.createWorksite(worksiteData);
        setWorksites(prevWorksites => [...prevWorksites, savedWorksite]);
      }

      setFormOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save worksite';
      setFormError(errorMessage);
      console.error('Error saving worksite:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingWorksite(null);
    setFormError('');
  };

  if (loading) {
    return (
      <Box display='flex' justifyContent='center' alignItems='center' minHeight='400px'>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display='flex' justifyContent='space-between' alignItems='center' mb={3}>
        <Typography variant='h4' gutterBottom>
          Worksites
        </Typography>
        <Button variant='contained' startIcon={<AddIcon />} onClick={handleCreateWorksite}>
          Add Worksite
        </Button>
      </Box>

      {error && (
        <Alert severity='error' sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <WorksiteTable
        worksites={worksites}
        loading={loading}
        onEdit={handleEditWorksite}
        onDelete={handleDeleteWorksite}
        onToggleStatus={handleToggleWorksiteStatus}
        onViewEquipment={handleViewEquipment}
      />

      <WorksiteForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        worksite={editingWorksite}
        loading={formLoading}
        error={formError}
      />
    </Box>
  );
}
