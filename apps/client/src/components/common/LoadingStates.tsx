import {
  Box,
  CircularProgress,
  LinearProgress,
  Typography,
  Skeleton,
  Card,
  CardContent,
  Stack,
  Fade,
  Backdrop,
} from '@mui/material';
import { ReactNode } from 'react';

// Full page loading overlay
interface FullPageLoadingProps {
  open: boolean;
  message?: string;
}

export function FullPageLoading({ open, message = 'Loading...' }: FullPageLoadingProps) {
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: theme => theme.zIndex.modal + 1,
        flexDirection: 'column',
        gap: 2,
      }}
      open={open}
    >
      <CircularProgress size={60} />
      <Typography variant='h6'>{message}</Typography>
    </Backdrop>
  );
}

// Centered loading indicator
interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  minHeight?: string | number;
}

export function LoadingSpinner({ size = 40, message, minHeight = '200px' }: LoadingSpinnerProps) {
  return (
    <Box
      display='flex'
      flexDirection='column'
      justifyContent='center'
      alignItems='center'
      minHeight={minHeight}
      gap={2}
    >
      <CircularProgress size={size} />
      {message && (
        <Typography variant='body2' color='text.secondary'>
          {message}
        </Typography>
      )}
    </Box>
  );
}

// Progressive loading bar
interface ProgressLoadingProps {
  progress?: number;
  message?: string;
  showPercentage?: boolean;
}

export function ProgressLoading({
  progress,
  message = 'Loading...',
  showPercentage = false,
}: ProgressLoadingProps) {
  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <Typography variant='body2' color='text.secondary' sx={{ flexGrow: 1 }}>
          {message}
        </Typography>
        {showPercentage && progress && (
          <Typography variant='body2' color='text.secondary'>
            {Math.round(progress)}%
          </Typography>
        )}
      </Box>
      <LinearProgress
        variant={progress !== undefined ? 'determinate' : 'indeterminate'}
        value={progress}
        sx={{ height: 6, borderRadius: 3 }}
      />
    </Box>
  );
}

// Skeleton loading for tables
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function TableSkeleton({ rows = 5, columns = 4, showHeader = true }: TableSkeletonProps) {
  return (
    <Box>
      {showHeader && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, p: 1 }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={index} variant='text' height={24} sx={{ flex: 1 }} />
          ))}
        </Box>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Box key={rowIndex} sx={{ display: 'flex', gap: 2, mb: 1, p: 1 }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant='text' height={20} sx={{ flex: 1 }} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

// Card skeleton loading
interface CardSkeletonProps {
  count?: number;
  showAvatar?: boolean;
  showActions?: boolean;
}

export function CardSkeleton({
  count = 3,
  showAvatar = false,
  showActions = false,
}: CardSkeletonProps) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {showAvatar && <Skeleton variant='circular' width={40} height={40} />}
              <Box sx={{ flex: 1 }}>
                <Skeleton variant='text' height={24} width='60%' />
                <Skeleton variant='text' height={20} width='40%' />
              </Box>
            </Box>
            <Skeleton variant='text' height={16} />
            <Skeleton variant='text' height={16} />
            <Skeleton variant='text' height={16} width='80%' />
            {showActions && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Skeleton variant='rectangular' width={80} height={32} />
                <Skeleton variant='rectangular' width={80} height={32} />
              </Box>
            )}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

// Form skeleton loading
interface FormSkeletonProps {
  fields?: number;
  showButtons?: boolean;
}

export function FormSkeleton({ fields = 6, showButtons = true }: FormSkeletonProps) {
  return (
    <Card>
      <CardContent>
        <Skeleton variant='text' height={32} width='40%' sx={{ mb: 3 }} />

        <Stack spacing={3}>
          {Array.from({ length: fields }).map((_, index) => (
            <Box key={index}>
              <Skeleton variant='text' height={20} width='30%' sx={{ mb: 1 }} />
              <Skeleton variant='rectangular' height={40} />
            </Box>
          ))}

          {showButtons && (
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              <Skeleton variant='rectangular' width={100} height={36} />
              <Skeleton variant='rectangular' width={100} height={36} />
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

// Async component wrapper with loading and error states
interface AsyncWrapperProps {
  loading: boolean;
  error?: string | Error | null;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  children: ReactNode;
  retry?: () => void;
  minHeight?: string | number;
}

export function AsyncWrapper({
  loading,
  error,
  loadingComponent,
  errorComponent,
  children,
  retry,
  minHeight = '200px',
}: AsyncWrapperProps) {
  if (loading) {
    return (
      <Fade in timeout={300}>
        <div>{loadingComponent || <LoadingSpinner minHeight={minHeight} />}</div>
      </Fade>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return (
      <Fade in timeout={300}>
        <div>
          {errorComponent || (
            <Box
              display='flex'
              flexDirection='column'
              alignItems='center'
              justifyContent='center'
              minHeight={minHeight}
              p={3}
            >
              <Typography variant='h6' color='error' gutterBottom>
                Something went wrong
              </Typography>
              <Typography variant='body2' color='text.secondary' align='center' sx={{ mb: 2 }}>
                {errorMessage}
              </Typography>
              {retry && (
                <button
                  onClick={retry}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              )}
            </Box>
          )}
        </div>
      </Fade>
    );
  }

  return (
    <Fade in timeout={300}>
      <div>{children}</div>
    </Fade>
  );
}

// Loading button component
interface LoadingButtonProps {
  loading: boolean;
  children: ReactNode;
  onClick?: () => void;
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  fullWidth?: boolean;
}

export function LoadingButton({
  loading,
  children,
  onClick,
  disabled,
  startIcon,
  ...props
}: LoadingButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: loading ? '#ccc' : '#1976d2',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: loading || disabled ? 0.6 : 1,
      }}
      {...props}
    >
      {loading ? <CircularProgress size={16} color='inherit' /> : startIcon}
      {children}
    </button>
  );
}
