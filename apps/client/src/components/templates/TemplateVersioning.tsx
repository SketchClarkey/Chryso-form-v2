import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Restore as RestoreIcon,
  Compare as CompareIcon,
  GetApp as DownloadIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToastNotifications } from '../notifications/NotificationToast';

interface VersionHistoryItem {
  version: number;
  changes: string;
  modifiedBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  timestamp: string;
}

interface ITemplate {
  _id: string;
  name: string;
  version: number;
  status: string;
  versionHistory: VersionHistoryItem[];
  parentTemplate?: string;
  childTemplates?: string[];
}

interface TemplateVersioningProps {
  template: ITemplate;
  onVersionRestore?: (version: number) => void;
}

export function TemplateVersioning({
  template,
  onVersionRestore,
}: TemplateVersioningProps) {
  const { user } = useAuth();
  const toast = useToastNotifications();
  const queryClient = useQueryClient();

  const [anchorEl, setAnchorEl] = useState<{ [key: number]: HTMLElement | null }>({});
  const [restoreDialog, setRestoreDialog] = useState<{
    open: boolean;
    version?: number;
    changes?: string;
  }>({ open: false });
  const [compareDialog, setCompareDialog] = useState<{
    open: boolean;
    version1?: number;
    version2?: number;
  }>({ open: false });
  const [createVersionDialog, setCreateVersionDialog] = useState(false);
  const [versionChanges, setVersionChanges] = useState('');

  // Create new version mutation
  const createVersionMutation = useMutation({
    mutationFn: async ({ changes }: { changes: string }) => {
      const response = await api.post(`/templates/${template._id}/version`, {
        changes,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', template._id] });
      toast.showSuccess('New version created successfully');
      setCreateVersionDialog(false);
      setVersionChanges('');
    },
    onError: (err: any) => {
      toast.showError(err.response?.data?.message || 'Failed to create version');
    },
  });

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: async ({ version, changes }: { version: number; changes?: string }) => {
      const response = await api.post(`/templates/${template._id}/restore`, {
        version,
        changes,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', template._id] });
      toast.showSuccess(`Template restored to version ${variables.version}`);
      setRestoreDialog({ open: false });
      onVersionRestore?.(variables.version);
    },
    onError: (err: any) => {
      toast.showError(err.response?.data?.message || 'Failed to restore version');
    },
  });

  const handleMenuOpen = (version: number, event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(prev => ({ ...prev, [version]: event.currentTarget }));
  };

  const handleMenuClose = (version: number) => {
    setAnchorEl(prev => ({ ...prev, [version]: null }));
  };

  const handleRestoreVersion = (version: number, changes: string) => {
    setRestoreDialog({ open: true, version, changes });
  };

  const confirmRestore = () => {
    if (!restoreDialog.version) return;
    
    restoreVersionMutation.mutate({
      version: restoreDialog.version,
      changes: `Restored to version ${restoreDialog.version}`,
    });
  };

  const handleCompareVersions = (version1: number, version2?: number) => {
    setCompareDialog({
      open: true,
      version1,
      version2: version2 || template.version,
    });
  };

  const handleExportVersion = async (version: number) => {
    try {
      const response = await api.get(`/templates/${template._id}/export?version=${version}`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.name}_v${version}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.showSuccess(`Version ${version} exported successfully`);
    } catch (error) {
      toast.showError('Failed to export version');
    }
  };

  const getStatusColor = (version: number) => {
    return version === template.version ? 'primary' : 'default';
  };

  const canEdit = user?.role === 'admin' || user?.role === 'manager';

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
          <HistoryIcon />
          Version History
        </Typography>
        {canEdit && (
          <Button
            variant="outlined"
            onClick={() => setCreateVersionDialog(true)}
            disabled={createVersionMutation.isPending}
          >
            Create New Version
          </Button>
        )}
      </Box>

      <Card>
        <CardContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Current version: v{template.version}. You can restore to any previous version or compare changes.
          </Alert>

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>Changes</TableCell>
                  <TableCell>Modified By</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {template.versionHistory
                  .sort((a, b) => b.version - a.version)
                  .map((item) => (
                    <TableRow key={item.version}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          v{item.version}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 200 }} noWrap>
                          {item.changes}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {item.modifiedBy.firstName} {item.modifiedBy.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.modifiedBy.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.version === template.version ? 'Current' : 'Previous'}
                          size="small"
                          color={getStatusColor(item.version) as any}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(item.version, e)}
                        >
                          <MoreIcon />
                        </IconButton>
                        <Menu
                          anchorEl={anchorEl[item.version]}
                          open={Boolean(anchorEl[item.version])}
                          onClose={() => handleMenuClose(item.version)}
                        >
                          <MenuItem onClick={() => {
                            // View version details - would open a dialog or navigate
                            handleMenuClose(item.version);
                          }}>
                            <ViewIcon sx={{ mr: 1 }} /> View Details
                          </MenuItem>
                          
                          {item.version !== template.version && canEdit && (
                            <MenuItem onClick={() => {
                              handleRestoreVersion(item.version, item.changes);
                              handleMenuClose(item.version);
                            }}>
                              <RestoreIcon sx={{ mr: 1 }} /> Restore Version
                            </MenuItem>
                          )}
                          
                          <MenuItem onClick={() => {
                            handleCompareVersions(item.version);
                            handleMenuClose(item.version);
                          }}>
                            <CompareIcon sx={{ mr: 1 }} /> Compare with Current
                          </MenuItem>
                          
                          <MenuItem onClick={() => {
                            handleExportVersion(item.version);
                            handleMenuClose(item.version);
                          }}>
                            <DownloadIcon sx={{ mr: 1 }} /> Export Version
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          {template.versionHistory.length === 0 && (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No version history available
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Version Dialog */}
      <Dialog open={createVersionDialog} onClose={() => setCreateVersionDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Version</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Version Changes"
            fullWidth
            multiline
            rows={4}
            value={versionChanges}
            onChange={(e) => setVersionChanges(e.target.value)}
            placeholder="Describe the changes made in this version..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateVersionDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => createVersionMutation.mutate({ changes: versionChanges })}
            variant="contained"
            disabled={!versionChanges.trim() || createVersionMutation.isPending}
          >
            Create Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Version Dialog */}
      <Dialog open={restoreDialog.open} onClose={() => setRestoreDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>Restore Version</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will restore the template to version {restoreDialog.version} and create a new version. 
            Current changes will be preserved in the version history.
          </Alert>
          <Typography variant="body2" gutterBottom>
            Version {restoreDialog.version} changes:
          </Typography>
          <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 2 }}>
            "{restoreDialog.changes}"
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialog({ open: false })}>
            Cancel
          </Button>
          <Button
            onClick={confirmRestore}
            variant="contained"
            color="warning"
            disabled={restoreVersionMutation.isPending}
          >
            Restore Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Compare Versions Dialog */}
      <Dialog open={compareDialog.open} onClose={() => setCompareDialog({ open: false })} maxWidth="md" fullWidth>
        <DialogTitle>Compare Versions</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Comparing version {compareDialog.version1} with version {compareDialog.version2}
          </Alert>
          <Typography variant="body2">
            Version comparison feature would be implemented here, showing side-by-side diff of template structures.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialog({ open: false })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}