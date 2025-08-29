import { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Draft as DraftIcon,
  PlayArrow as InProgressIcon,
  CheckCircle as CompletedIcon,
  ThumbUp as ApprovedIcon,
  ThumbDown as RejectedIcon,
  Archive as ArchivedIcon,
  History as HistoryIcon,
  Comment as CommentIcon,
  Send as SendIcon,
  Undo as UndoIcon,
} from '@mui/icons-material';

export type FormStatus =
  | 'draft'
  | 'in-progress'
  | 'completed'
  | 'approved'
  | 'rejected'
  | 'archived';

export interface StatusHistoryItem {
  status: FormStatus;
  timestamp: string;
  userId?: string;
  userName?: string;
  comment?: string;
  rejectionReason?: string;
}

export interface FormStatusWorkflowProps {
  currentStatus: FormStatus;
  statusHistory: StatusHistoryItem[];
  canEdit: boolean;
  canApprove: boolean;
  userRole: 'admin' | 'manager' | 'technician';
  onStatusChange: (newStatus: FormStatus, comment?: string) => Promise<void>;
  completionPercentage?: number;
}

const statusConfig = {
  draft: {
    label: 'Draft',
    icon: DraftIcon,
    color: 'default' as const,
    description: 'Form is being created and can be edited freely',
    nextStates: ['in-progress', 'completed'],
  },
  'in-progress': {
    label: 'In Progress',
    icon: InProgressIcon,
    color: 'primary' as const,
    description: 'Work is being performed, form is actively being updated',
    nextStates: ['completed', 'draft'],
  },
  completed: {
    label: 'Completed',
    icon: CompletedIcon,
    color: 'success' as const,
    description: 'Service work is complete, form is ready for review',
    nextStates: ['approved', 'rejected', 'in-progress'],
  },
  approved: {
    label: 'Approved',
    icon: ApprovedIcon,
    color: 'success' as const,
    description: 'Form has been reviewed and approved by management',
    nextStates: ['archived'],
  },
  rejected: {
    label: 'Rejected',
    icon: RejectedIcon,
    color: 'error' as const,
    description: 'Form has been rejected and requires revision',
    nextStates: ['in-progress', 'draft'],
  },
  archived: {
    label: 'Archived',
    icon: ArchivedIcon,
    color: 'secondary' as const,
    description: 'Form is archived and locked from further changes',
    nextStates: [],
  },
};

const getStatusStepIndex = (status: FormStatus): number => {
  const statusOrder: FormStatus[] = ['draft', 'in-progress', 'completed', 'approved'];
  return statusOrder.indexOf(status);
};

const getAvailableActions = (
  currentStatus: FormStatus,
  userRole: string,
  canEdit: boolean,
  canApprove: boolean
): FormStatus[] => {
  const actions: FormStatus[] = [];

  if (!canEdit && !canApprove) return actions;

  switch (currentStatus) {
    case 'draft':
      if (canEdit) {
        actions.push('in-progress', 'completed');
      }
      break;
    case 'in-progress':
      if (canEdit) {
        actions.push('completed', 'draft');
      }
      break;
    case 'completed':
      if (canApprove) {
        actions.push('approved', 'rejected');
      }
      if (canEdit) {
        actions.push('in-progress');
      }
      break;
    case 'rejected':
      if (canEdit) {
        actions.push('in-progress', 'draft');
      }
      break;
    case 'approved':
      if (userRole === 'admin') {
        actions.push('archived');
      }
      break;
    default:
      break;
  }

  return actions;
};

export function FormStatusWorkflow({
  currentStatus,
  statusHistory,
  canEdit,
  canApprove,
  userRole,
  onStatusChange,
  completionPercentage = 0,
}: FormStatusWorkflowProps) {
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<FormStatus | null>(null);
  const [comment, setComment] = useState('');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const currentConfig = statusConfig[currentStatus];
  const availableActions = getAvailableActions(currentStatus, userRole, canEdit, canApprove);

  const handleActionClick = (action: FormStatus) => {
    setSelectedAction(action);
    setComment('');
    setActionDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction) return;

    try {
      setLoading(true);
      await onStatusChange(selectedAction, comment);
      setActionDialogOpen(false);
      setSelectedAction(null);
      setComment('');
    } catch (error) {
      console.error('Failed to change status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: FormStatus) => {
    const IconComponent = statusConfig[status].icon;
    return <IconComponent />;
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
          >
            <Typography variant='h6'>Form Status Workflow</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Tooltip title='View Status History'>
                <IconButton onClick={() => setHistoryDialogOpen(true)}>
                  <HistoryIcon />
                </IconButton>
              </Tooltip>
              <Chip
                icon={getStatusIcon(currentStatus)}
                label={currentConfig.label}
                color={currentConfig.color}
                variant='filled'
              />
            </Box>
          </Box>

          {/* Current Status Description */}
          <Alert severity='info' sx={{ mb: 3 }}>
            <Typography variant='body2'>{currentConfig.description}</Typography>
            {completionPercentage > 0 && currentStatus !== 'completed' && (
              <Typography variant='caption' display='block' sx={{ mt: 1 }}>
                Form completion: {completionPercentage}%
              </Typography>
            )}
          </Alert>

          {/* Status Stepper */}
          <Stepper
            activeStep={getStatusStepIndex(currentStatus)}
            orientation='horizontal'
            sx={{ mb: 3 }}
          >
            {['draft', 'in-progress', 'completed', 'approved'].map(status => {
              const config = statusConfig[status as FormStatus];
              const isCurrentStatus = status === currentStatus;
              const isRejected = currentStatus === 'rejected';

              return (
                <Step
                  key={status}
                  completed={
                    getStatusStepIndex(status as FormStatus) < getStatusStepIndex(currentStatus)
                  }
                >
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: isCurrentStatus
                            ? `${config.color}.main`
                            : isRejected && status === 'completed'
                              ? 'error.light'
                              : 'grey.300',
                          color:
                            isCurrentStatus || (isRejected && status === 'completed')
                              ? 'white'
                              : 'grey.600',
                        }}
                      >
                        {getStatusIcon(status as FormStatus)}
                      </Box>
                    )}
                  >
                    {config.label}
                  </StepLabel>
                </Step>
              );
            })}
          </Stepper>

          {/* Rejected Status Indicator */}
          {currentStatus === 'rejected' && (
            <Alert severity='error' sx={{ mb: 3 }}>
              <Typography variant='body2' fontWeight='medium'>
                Form has been rejected
              </Typography>
              {statusHistory.find(h => h.status === 'rejected')?.rejectionReason && (
                <Typography variant='body2' sx={{ mt: 1 }}>
                  Reason: {statusHistory.find(h => h.status === 'rejected')?.rejectionReason}
                </Typography>
              )}
            </Alert>
          )}

          {/* Available Actions */}
          {availableActions.length > 0 && (
            <Box>
              <Typography variant='subtitle2' gutterBottom>
                Available Actions
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {availableActions.map(action => {
                  const actionConfig = statusConfig[action];
                  return (
                    <Button
                      key={action}
                      variant='outlined'
                      startIcon={getStatusIcon(action)}
                      onClick={() => handleActionClick(action)}
                      color={actionConfig.color}
                    >
                      {action === 'approved' && 'Approve'}
                      {action === 'rejected' && 'Reject'}
                      {action === 'completed' && 'Mark Complete'}
                      {action === 'in-progress' && 'Start Progress'}
                      {action === 'draft' && 'Return to Draft'}
                      {action === 'archived' && 'Archive'}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>Confirm Status Change</DialogTitle>
        <DialogContent>
          <Typography variant='body1' sx={{ mb: 2 }}>
            Are you sure you want to change the status to{' '}
            <strong>{selectedAction && statusConfig[selectedAction].label}</strong>?
          </Typography>

          {(selectedAction === 'rejected' || selectedAction === 'approved') && (
            <TextField
              label={selectedAction === 'rejected' ? 'Rejection Reason' : 'Approval Comment'}
              multiline
              rows={3}
              fullWidth
              value={comment}
              onChange={e => setComment(e.target.value)}
              required={selectedAction === 'rejected'}
              helperText={
                selectedAction === 'rejected'
                  ? 'Please provide a reason for rejection'
                  : 'Optional comment about the approval'
              }
            />
          )}

          {selectedAction && !['rejected', 'approved'].includes(selectedAction) && (
            <TextField
              label='Optional Comment'
              multiline
              rows={2}
              fullWidth
              value={comment}
              onChange={e => setComment(e.target.value)}
              helperText='Add any additional notes about this status change'
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmAction}
            variant='contained'
            disabled={loading || (selectedAction === 'rejected' && !comment.trim())}
            startIcon={loading ? undefined : <SendIcon />}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status History Dialog */}
      <Dialog
        open={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        maxWidth='md'
        fullWidth
      >
        <DialogTitle>Status History</DialogTitle>
        <DialogContent>
          {statusHistory.length === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              No status history available
            </Typography>
          ) : (
            <Timeline>
              {statusHistory.map((item, index) => {
                const config = statusConfig[item.status];
                return (
                  <TimelineItem key={index}>
                    <TimelineOppositeContent sx={{ minWidth: 120 }}>
                      <Typography variant='caption' color='text.secondary'>
                        {formatTimestamp(item.timestamp)}
                      </Typography>
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                      <TimelineDot color={config.color}>{getStatusIcon(item.status)}</TimelineDot>
                      {index < statusHistory.length - 1 && <TimelineConnector />}
                    </TimelineSeparator>
                    <TimelineContent>
                      <Typography variant='body2' fontWeight='medium'>
                        {config.label}
                      </Typography>
                      {item.userName && (
                        <Typography variant='caption' color='text.secondary'>
                          by {item.userName}
                        </Typography>
                      )}
                      {(item.comment || item.rejectionReason) && (
                        <Typography variant='body2' sx={{ mt: 0.5, fontStyle: 'italic' }}>
                          {item.rejectionReason || item.comment}
                        </Typography>
                      )}
                    </TimelineContent>
                  </TimelineItem>
                );
              })}
            </Timeline>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
