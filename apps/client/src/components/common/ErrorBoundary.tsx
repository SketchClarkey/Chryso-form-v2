import React, { Component, ReactNode } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  AlertTitle,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import { Refresh as RefreshIcon, Bug as BugIcon, Home as HomeIcon } from '@mui/icons-material';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In a real app, you might send this to an error reporting service
    // reportError(error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            backgroundColor: 'grey.50',
          }}
        >
          <Card sx={{ maxWidth: 600, width: '100%' }}>
            <CardContent>
              <Stack spacing={3} alignItems='center' textAlign='center'>
                <BugIcon sx={{ fontSize: 64, color: 'error.main' }} />

                <Box>
                  <Typography variant='h4' gutterBottom>
                    Something went wrong
                  </Typography>
                  <Typography variant='body1' color='text.secondary'>
                    An unexpected error has occurred. Our team has been notified and is working to
                    fix it.
                  </Typography>
                </Box>

                {this.props.showDetails && this.state.error && (
                  <Alert severity='error' sx={{ width: '100%', textAlign: 'left' }}>
                    <AlertTitle>Error Details</AlertTitle>
                    <Typography variant='body2' component='pre' sx={{ whiteSpace: 'pre-wrap' }}>
                      {this.state.error.message}
                    </Typography>
                    {this.state.errorInfo && (
                      <Typography
                        variant='caption'
                        component='pre'
                        sx={{ whiteSpace: 'pre-wrap', mt: 1 }}
                      >
                        {this.state.errorInfo.componentStack}
                      </Typography>
                    )}
                  </Alert>
                )}

                <Stack direction='row' spacing={2}>
                  <Button
                    variant='contained'
                    startIcon={<RefreshIcon />}
                    onClick={this.handleRefresh}
                  >
                    Refresh Page
                  </Button>
                  <Button variant='outlined' startIcon={<HomeIcon />} onClick={this.handleGoHome}>
                    Go Home
                  </Button>
                </Stack>

                <Typography variant='caption' color='text.secondary'>
                  Error ID: {Date.now().toString(36).toUpperCase()}
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

// Hook-based error boundary for functional components
export function useErrorHandler() {
  return (error: Error, errorInfo?: React.ErrorInfo) => {
    console.error('Error caught by useErrorHandler:', error, errorInfo);

    // In a real app, report to error service
    // reportError(error, errorInfo);
  };
}
