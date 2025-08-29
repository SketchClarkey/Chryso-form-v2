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
  Chip,
  Avatar,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  CheckCircle as ApprovedIcon,
  Cancel as RejectedIcon,
  Schedule as PendingIcon,
  Edit as RequestChangesIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToastNotifications } from '../notifications/NotificationToast';

interface ApprovalHistoryItem {
  _id: string;
  approver: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  action: 'approved' | 'rejected' | 'requested_changes';
  comment?: string;
  timestamp: string;
}

interface ApprovalWorkflow {
  enabled: boolean;
  approvers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
  currentApprover?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  approvalHistory: ApprovalHistoryItem[];
}

interface ITemplate {
  _id: string;
  name: string;
  status: 'draft' | 'active' | 'archived' | 'pending_approval';
  version: number;
  approvalWorkflow?: ApprovalWorkflow;
}

interface TemplateApprovalWorkflowProps {
  template: ITemplate;
  onStatusChange?: (newStatus: string, comment?: string) => void;
  canApprove?: boolean;
  canEdit?: boolean;
}

export function TemplateApprovalWorkflow({
  template,
  onStatusChange,
  canApprove = false,
  canEdit = false,
}: TemplateApprovalWorkflowProps) {
  const { user } = useAuth();
  const toast = useToastNotifications();
  const queryClient = useQueryClient();

  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    action?: 'approve' | 'reject' | 'request_changes';
  }>({ open: false });
  const [comment, setComment] = useState('');
  const [workflowDialog, setWorkflowDialog] = useState(false);

  // Update template status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, comment }: { status: string; comment?: string }) => {
      const response = await api.patch(`/templates/${template._id}/status`, {
        status,
        comment,
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['template', template._id] });
      
      // Show appropriate toast
      switch (variables.status) {
        case 'approved':
          toast.showSuccess('Template approved successfully');
          break;
        case 'rejected':
          toast.showError('Template rejected');
          break;
        case 'pending_approval':
          toast.showInfo('Template submitted for approval');
          break;
        default:
          toast.showSuccess(`Template status updated to ${variables.status}`);
      }

      onStatusChange?.(variables.status, variables.comment);
    },
    onError: (err: any) => {
      toast.showError(err.response?.data?.message || 'Failed to update template status');
    },
  });

  const handleApprovalAction = (action: 'approve' | 'reject' | 'request_changes') => {
    setApprovalDialog({ open: true, action });
    setComment('');
  };

  const confirmApprovalAction = () => {
    if (!approvalDialog.action) return;

    let status: string;
    switch (approvalDialog.action) {
      case 'approve':
        status = 'approved';
        break;
      case 'reject':
        status = 'rejected';
        break;
      case 'request_changes':
        status = 'draft';
        break;
      default:
        return;
    }

    updateStatusMutation.mutate({
      status,
      comment: comment.trim() || undefined,
    });

    setApprovalDialog({ open: false });
  };

  const submitForApproval = () => {
    updateStatusMutation.mutate({ status: 'pending_approval' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return 'success';
      case 'draft':
        return 'warning';
      case 'pending_approval':
        return 'info';
      case 'rejected':
        return 'error';
      case 'archived':
        return 'default';
      default:
        return 'default';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <ApprovedIcon color="success" />;
      case 'rejected':
        return <RejectedIcon color="error" />;
      case 'requested_changes':
        return <RequestChangesIcon color="warning" />;
      default:
        return <PendingIcon color="info" />;
    }
  };

  const canUserApprove = canApprove && template.approvalWorkflow?.enabled &&
    template.status === 'pending_approval' &&
    template.approvalWorkflow.currentApprover?._id === user?.id;

  const isAwaitingApproval = template.status === 'pending_approval' && template.approvalWorkflow?.enabled;

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Approval Workflow</Typography>
          <Chip
            label={template.status.replace('_', ' ').toUpperCase()}
            color={getStatusColor(template.status) as any}
            variant="filled"
          />
        </Box>

        <Box mb={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Template Version: {template.version}
          </Typography>
          
          {template.approvalWorkflow?.enabled ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              This template requires approval before it can be activated.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Approval workflow is not enabled for this template.
            </Alert>
          )}
        </Box>

        {/* Action Buttons */}
        <Box display="flex" gap={2} mb={3}>
          {template.status === 'draft' && canEdit && (
            <Button
              variant="contained"
              color="primary"
              onClick={submitForApproval}
              disabled={updateStatusMutation.isPending || !template.approvalWorkflow?.enabled}
            >
              Submit for Approval
            </Button>
          )}

          {canUserApprove && (
            <>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleApprovalAction('approve')}
                disabled={updateStatusMutation.isPending}
              >
                Approve
              </Button>
              <Button
                variant="outlined"
                color="warning"
                onClick={() => handleApprovalAction('request_changes')}
                disabled={updateStatusMutation.isPending}
              >
                Request Changes
              </Button>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleApprovalAction('reject')}
                disabled={updateStatusMutation.isPending}
              >
                Reject
              </Button>
            </>
          )}
        </Box>

        {/* Current Approver */}
        {isAwaitingApproval && template.approvalWorkflow?.currentApprover && (
          <Box mb={3}>
            <Typography variant="subtitle2" gutterBottom>
              Current Approver
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Avatar sx={{ width: 32, height: 32 }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={500}>
                  {template.approvalWorkflow.currentApprover.firstName} {template.approvalWorkflow.currentApprover.lastName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {template.approvalWorkflow.currentApprover.email}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* Approval History */}
        {template.approvalWorkflow?.approvalHistory && template.approvalWorkflow.approvalHistory.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Approval History
            </Typography>
            <Timeline>
              {template.approvalWorkflow.approvalHistory.map((item, index) => (
                <TimelineItem key={item._id}>
                  <TimelineOppositeContent sx={{ m: 'auto 0' }} variant="body2" color="text.secondary">
                    {new Date(item.timestamp).toLocaleDateString()}
                    <br />
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </TimelineOppositeContent>
                  <TimelineSeparator>
                    <TimelineDot>
                      {getActionIcon(item.action)}
                    </TimelineDot>
                    {index < template.approvalWorkflow.approvalHistory.length - 1 && <TimelineConnector />}
                  </TimelineSeparator>
                  <TimelineContent sx={{ py: '12px', px: 2 }}>
                    <Typography variant="h6" component="span">
                      {item.action.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      By {item.approver.firstName} {item.approver.lastName}
                    </Typography>
                    {item.comment && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        "{item.comment}"
                      </Typography>
                    )}
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          </Box>
        )}

        {/* Approvers List */}
        {template.approvalWorkflow?.enabled && template.approvalWorkflow.approvers && (
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Approvers
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              {template.approvalWorkflow.approvers.map((approver) => (
                <Chip
                  key={approver._id}
                  label={`${approver.firstName} ${approver.lastName}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </CardContent>

      {/* Approval Action Dialog */}
      <Dialog open={approvalDialog.open} onClose={() => setApprovalDialog({ open: false })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalDialog.action === 'approve' && 'Approve Template'}
          {approvalDialog.action === 'reject' && 'Reject Template'}
          {approvalDialog.action === 'request_changes' && 'Request Changes'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            fullWidth
            multiline
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              approvalDialog.action === 'approve' 
                ? 'Optional approval comment...'
                : approvalDialog.action === 'reject'
                ? 'Please provide a reason for rejection...'
                : 'Please describe the changes needed...'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog({ open: false })}>
            Cancel
          </Button>
          <Button 
            onClick={confirmApprovalAction}
            variant="contained"
            color={
              approvalDialog.action === 'approve' ? 'success' : 
              approvalDialog.action === 'reject' ? 'error' : 'warning'
            }
            disabled={updateStatusMutation.isPending}
          >
            {approvalDialog.action === 'approve' && 'Approve'}
            {approvalDialog.action === 'reject' && 'Reject'}
            {approvalDialog.action === 'request_changes' && 'Request Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}