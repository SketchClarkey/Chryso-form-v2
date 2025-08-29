import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Business as BuildingIcon,
  Engineering as EquipmentIcon,
} from '@mui/icons-material';

export interface Equipment {
  id: string;
  type: 'pump' | 'tank' | 'dispenser' | 'pulseMeter';
  model?: string;
  serialNumber?: string;
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs-repair';
  lastServiceDate?: string;
  notes?: string;
}

export interface Contact {
  name: string;
  position?: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface Worksite {
  id: string;
  name: string;
  customerName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contacts: Contact[];
  equipment: Equipment[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  primaryContact?: Contact;
  fullAddress?: string;
}

interface WorksiteTableProps {
  worksites: Worksite[];
  loading: boolean;
  onEdit: (worksite: Worksite) => void;
  onDelete: (worksiteId: string) => void;
  onToggleStatus: (worksiteId: string, isActive: boolean) => void;
  onViewEquipment: (worksiteId: string) => void;
}

export function WorksiteTable({
  worksites,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewEquipment,
}: WorksiteTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWorksite, setSelectedWorksite] = useState<Worksite | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [worksiteToDelete, setWorksiteToDelete] = useState<Worksite | null>(null);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, worksite: Worksite) => {
    setAnchorEl(event.currentTarget);
    setSelectedWorksite(worksite);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWorksite(null);
  };

  const handleEdit = () => {
    if (selectedWorksite) {
      onEdit(selectedWorksite);
    }
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setWorksiteToDelete(selectedWorksite);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (worksiteToDelete) {
      onDelete(worksiteToDelete.id);
    }
    setDeleteDialogOpen(false);
    setWorksiteToDelete(null);
  };

  const handleToggleStatus = () => {
    if (selectedWorksite) {
      onToggleStatus(selectedWorksite.id, !selectedWorksite.isActive);
    }
    handleMenuClose();
  };

  const handleViewEquipment = () => {
    if (selectedWorksite) {
      onViewEquipment(selectedWorksite.id);
    }
    handleMenuClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getEquipmentConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent':
        return 'success';
      case 'good':
        return 'info';
      case 'fair':
        return 'warning';
      case 'poor':
      case 'needs-repair':
        return 'error';
      default:
        return 'default';
    }
  };

  const paginatedWorksites = worksites.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Worksite</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Equipment</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align='center'>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align='center'>
                  Loading...
                </TableCell>
              </TableRow>
            ) : paginatedWorksites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align='center'>
                  No worksites found
                </TableCell>
              </TableRow>
            ) : (
              paginatedWorksites.map(worksite => {
                const primaryContact =
                  worksite.contacts.find(c => c.isPrimary) || worksite.contacts[0];
                const needsRepairCount = worksite.equipment.filter(
                  eq => eq.condition === 'poor' || eq.condition === 'needs-repair'
                ).length;

                return (
                  <TableRow key={worksite.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BuildingIcon sx={{ color: 'text.secondary' }} />
                        <Box>
                          <Typography variant='body2' fontWeight='medium'>
                            {worksite.name}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>{worksite.customerName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2'>
                        {worksite.address.city}, {worksite.address.state}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {worksite.address.zipCode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {primaryContact ? (
                        <Box>
                          <Typography variant='body2'>{primaryContact.name}</Typography>
                          {primaryContact.position && (
                            <Typography variant='caption' color='text.secondary'>
                              {primaryContact.position}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography variant='body2' color='text.secondary'>
                          No contact
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <EquipmentIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant='body2'>{worksite.equipment.length}</Typography>
                        {needsRepairCount > 0 && (
                          <Chip
                            label={`${needsRepairCount} need repair`}
                            size='small'
                            color='error'
                            variant='outlined'
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={worksite.isActive ? 'Active' : 'Inactive'}
                        size='small'
                        color={worksite.isActive ? 'success' : 'default'}
                        variant={worksite.isActive ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant='body2' color='text.secondary'>
                        {formatDate(worksite.createdAt)}
                      </Typography>
                    </TableCell>
                    <TableCell align='center'>
                      <IconButton size='small' onClick={e => handleMenuOpen(e, worksite)}>
                        <MoreIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component='div'
        count={worksites.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon sx={{ mr: 1, fontSize: 16 }} />
          Edit Worksite
        </MenuItem>
        <MenuItem onClick={handleViewEquipment}>
          <EquipmentIcon sx={{ mr: 1, fontSize: 16 }} />
          View Equipment
        </MenuItem>
        <MenuItem onClick={handleToggleStatus}>
          {selectedWorksite?.isActive ? (
            <>
              <BlockIcon sx={{ mr: 1, fontSize: 16 }} />
              Deactivate
            </>
          ) : (
            <>
              <ActivateIcon sx={{ mr: 1, fontSize: 16 }} />
              Activate
            </>
          )}
        </MenuItem>
        <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1, fontSize: 16 }} />
          Delete Worksite
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Delete Worksite</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{worksiteToDelete?.name}</strong>? This action
            cannot be undone and will remove all associated data.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color='error' variant='contained'>
            Delete Worksite
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
