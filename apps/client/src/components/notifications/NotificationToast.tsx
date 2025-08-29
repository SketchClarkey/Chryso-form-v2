import { useState, useEffect, createContext, useContext } from 'react';
import {
  Snackbar,
  Alert,
  AlertTitle,
  IconButton,
  Slide,
  Stack,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { NotificationType } from '../../services/notificationService';

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  persistent?: boolean;
}

interface NotificationToastContextType {
  showToast: (notification: Omit<ToastNotification, 'id'>) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
}

const NotificationToastContext = createContext<NotificationToastContextType | undefined>(undefined);

export function useNotificationToast() {
  const context = useContext(NotificationToastContext);
  if (!context) {
    throw new Error('useNotificationToast must be used within a NotificationToastProvider');
  }
  return context;
}

interface NotificationToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
}

export function NotificationToastProvider({ 
  children, 
  maxToasts = 5 
}: NotificationToastProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = (notification: Omit<ToastNotification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastNotification = {
      ...notification,
      id,
      duration: notification.duration || (notification.type === 'error' ? 8000 : 6000),
    };

    setToasts(prevToasts => {
      const updatedToasts = [...prevToasts, newToast];
      // Keep only the latest maxToasts
      return updatedToasts.slice(-maxToasts);
    });

    // Auto-hide toast if not persistent
    if (!notification.persistent) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  };

  const showSuccess = (message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  };

  const showError = (message: string, title?: string) => {
    showToast({ type: 'error', message, title, persistent: true });
  };

  const showWarning = (message: string, title?: string) => {
    showToast({ type: 'warning', message, title });
  };

  const showInfo = (message: string, title?: string) => {
    showToast({ type: 'info', message, title });
  };

  const hideToast = (id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  };

  const hideAllToasts = () => {
    setToasts([]);
  };

  const contextValue: NotificationToastContextType = {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
    hideAllToasts,
  };

  return (
    <NotificationToastContext.Provider value={contextValue}>
      {children}
      <NotificationToastContainer toasts={toasts} onHide={hideToast} />
    </NotificationToastContext.Provider>
  );
}

interface NotificationToastContainerProps {
  toasts: ToastNotification[];
  onHide: (id: string) => void;
}

function NotificationToastContainer({ toasts, onHide }: NotificationToastContainerProps) {
  return (
    <Stack
      spacing={1}
      sx={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        maxWidth: 400,
      }}
    >
      {toasts.map((toast) => (
        <NotificationToastItem
          key={toast.id}
          toast={toast}
          onHide={onHide}
        />
      ))}
    </Stack>
  );
}

interface NotificationToastItemProps {
  toast: ToastNotification;
  onHide: (id: string) => void;
}

function NotificationToastItem({ toast, onHide }: NotificationToastItemProps) {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => onHide(toast.id), 200); // Delay to allow exit animation
  };

  const handleAction = () => {
    if (toast.action) {
      toast.action.onClick();
      handleClose();
    }
  };

  return (
    <Slide direction="left" in={open} timeout={200}>
      <Alert
        severity={toast.type}
        variant="filled"
        sx={{
          minWidth: 300,
          boxShadow: 3,
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
        action={
          <>
            {toast.action && (
              <IconButton
                size="small"
                color="inherit"
                onClick={handleAction}
                sx={{ mr: 1 }}
              >
                {toast.action.label}
              </IconButton>
            )}
            <IconButton
              size="small"
              color="inherit"
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </>
        }
      >
        {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
        {toast.message}
      </Alert>
    </Slide>
  );
}

// Hook for easy access to common toast patterns
export function useToastNotifications() {
  const { showSuccess, showError, showWarning, showInfo } = useNotificationToast();

  const showFormSaved = () => {
    showSuccess('Form saved successfully');
  };

  const showFormSubmitted = () => {
    showSuccess('Form submitted successfully');
  };

  const showFormApproved = () => {
    showSuccess('Form approved successfully');
  };

  const showFormRejected = (reason?: string) => {
    showError(reason || 'Form has been rejected', 'Form Rejected');
  };

  const showUserCreated = (userName: string) => {
    showSuccess(`User "${userName}" has been created successfully`);
  };

  const showUserUpdated = (userName: string) => {
    showSuccess(`User "${userName}" has been updated successfully`);
  };

  const showWorksiteCreated = (worksiteName: string) => {
    showSuccess(`Worksite "${worksiteName}" has been created successfully`);
  };

  const showWorksiteUpdated = (worksiteName: string) => {
    showSuccess(`Worksite "${worksiteName}" has been updated successfully`);
  };

  const showEquipmentAlert = (message: string) => {
    showWarning(message, 'Equipment Alert');
  };

  const showNetworkError = () => {
    showError('Network connection error. Please check your internet connection.', 'Connection Error');
  };

  const showValidationError = (message: string) => {
    showError(message, 'Validation Error');
  };

  const showPermissionError = () => {
    showError('You do not have permission to perform this action.', 'Permission Denied');
  };

  const showMaintenanceNotice = (message: string) => {
    showInfo(message, 'Maintenance Notice');
  };

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showFormSaved,
    showFormSubmitted,
    showFormApproved,
    showFormRejected,
    showUserCreated,
    showUserUpdated,
    showWorksiteCreated,
    showWorksiteUpdated,
    showEquipmentAlert,
    showNetworkError,
    showValidationError,
    showPermissionError,
    showMaintenanceNotice,
  };
}