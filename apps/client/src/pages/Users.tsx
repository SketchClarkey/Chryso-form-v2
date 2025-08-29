import { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { UserTable, type User } from '../components/users/UserTable';
import { UserForm } from '../components/users/UserForm';
import { userService, type Worksite } from '../services/userService';

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [worksites, setWorksites] = useState<Worksite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Load users and worksites in parallel
        const [usersData, worksitesData] = await Promise.all([
          userService.getUsers(),
          userService.getWorksites(),
        ]);

        setUsers(usersData);
        setWorksites(worksitesData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        console.error('Error loading data:', err);
        
        // Fallback to mock data if API fails
        const mockUsers: User[] = [
          {
            id: '1',
            email: 'admin@example.com',
            firstName: 'John',
            lastName: 'Admin',
            fullName: 'John Admin',
            role: 'admin',
            worksites: [],
            emailVerified: true,
            isActive: true,
            lastLogin: '2024-01-15T10:30:00Z',
            createdAt: '2024-01-01T08:00:00Z',
          },
          {
            id: '2',
            email: 'manager@example.com',
            firstName: 'Jane',
            lastName: 'Manager',
            fullName: 'Jane Manager',
            role: 'manager',
            worksites: [
              { id: '1', name: 'Main Office' },
              { id: '2', name: 'Construction Site A' },
            ],
            emailVerified: true,
            isActive: true,
            lastLogin: '2024-01-14T16:45:00Z',
            createdAt: '2024-01-02T09:00:00Z',
          },
          {
            id: '3',
            email: 'tech@example.com',
            firstName: 'Bob',
            lastName: 'Technician',
            fullName: 'Bob Technician',
            role: 'technician',
            worksites: [
              { id: '2', name: 'Construction Site A' },
            ],
            emailVerified: false,
            isActive: true,
            lastLogin: undefined,
            createdAt: '2024-01-10T12:00:00Z',
          },
        ];

        const mockWorksites: Worksite[] = [
          { id: '1', name: 'Main Office' },
          { id: '2', name: 'Construction Site A' },
          { id: '3', name: 'Construction Site B' },
          { id: '4', name: 'Warehouse' },
        ];

        setUsers(mockUsers);
        setWorksites(mockWorksites);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormError('');
    setFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormError('');
    setFormOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      setError(errorMessage);
      console.error('Error deleting user:', err);
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const updatedUser = await userService.toggleUserStatus(userId, isActive);
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId ? updatedUser : user
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user status';
      setError(errorMessage);
      console.error('Error toggling user status:', err);
    }
  };

  const handleAssignWorksites = async (userId: string) => {
    try {
      // For now, just open a simple prompt for worksite IDs
      // In a real app, this would open a proper dialog
      const worksiteIds = prompt('Enter worksite IDs (comma-separated):');
      if (worksiteIds) {
        const ids = worksiteIds.split(',').map(id => id.trim());
        const updatedUser = await userService.assignWorksites(userId, ids);
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId ? updatedUser : user
          )
        );
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign worksites';
      setError(errorMessage);
      console.error('Error assigning worksites:', err);
    }
  };

  const handleFormSubmit = async (userData: any) => {
    try {
      setFormLoading(true);
      setFormError('');
      
      let savedUser: User;
      
      if (editingUser) {
        // Update existing user
        savedUser = await userService.updateUser(editingUser.id, userData);
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === editingUser.id ? savedUser : user
          )
        );
      } else {
        // Create new user
        savedUser = await userService.createUser(userData);
        setUsers(prevUsers => [...prevUsers, savedUser]);
      }
      
      setFormOpen(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save user';
      setFormError(errorMessage);
      console.error('Error saving user:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingUser(null);
    setFormError('');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Users
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateUser}
        >
          Add User
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <UserTable
        users={users}
        loading={loading}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onToggleStatus={handleToggleUserStatus}
        onAssignWorksites={handleAssignWorksites}
      />

      <UserForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        user={editingUser}
        worksites={worksites}
        loading={formLoading}
        error={formError}
      />
    </Box>
  );
}