export interface ErrorDetails {
  message: string;
  code?: string;
  status?: number;
  timestamp: Date;
  url?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
  stackTrace?: string;
  context?: Record<string, any>;
}

export interface ApiError {
  message: string;
  code?: string;
  status: number;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface NetworkError {
  message: string;
  isOffline: boolean;
  retryable: boolean;
}

class ErrorService {
  private errorQueue: ErrorDetails[] = [];
  private isReporting = false;

  // Report error to monitoring service
  async reportError(error: ErrorDetails): Promise<void> {
    try {
      this.errorQueue.push(error);

      if (!this.isReporting) {
        await this.flushErrorQueue();
      }
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  }

  private async flushErrorQueue(): Promise<void> {
    if (this.errorQueue.length === 0 || this.isReporting) return;

    this.isReporting = true;

    try {
      const errors = [...this.errorQueue];
      this.errorQueue = [];

      // In a real app, send to error reporting service
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeader(),
        },
        body: JSON.stringify({ errors }),
      });

      console.log('Errors reported successfully:', errors.length);
    } catch (err) {
      console.error('Failed to flush error queue:', err);
      // Re-add errors to queue for retry
      this.errorQueue.unshift(...this.errorQueue);
    } finally {
      this.isReporting = false;
    }
  }

  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Parse API errors
  parseApiError(error: any): ApiError {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      return {
        message: data?.message || data?.error || `Server error (${status})`,
        code: data?.code,
        status,
        details: data?.details,
      };
    } else if (error.request) {
      // Network error
      return {
        message: 'Network connection error. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    } else {
      // Other error
      return {
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        status: 0,
      };
    }
  }

  // Parse validation errors
  parseValidationErrors(error: any): ValidationError[] {
    const errors: ValidationError[] = [];

    if (error.response?.data?.errors) {
      const validationErrors = error.response.data.errors;

      // Handle different validation error formats
      if (Array.isArray(validationErrors)) {
        // Array format: [{ field, message, value }]
        errors.push(...validationErrors);
      } else if (typeof validationErrors === 'object') {
        // Object format: { field: message }
        Object.entries(validationErrors).forEach(([field, message]) => {
          errors.push({
            field,
            message: Array.isArray(message) ? message[0] : String(message),
          });
        });
      }
    }

    return errors;
  }

  // Check if error is retryable
  isRetryableError(error: ApiError): boolean {
    if (error.status === 0) return true; // Network error
    if (error.status >= 500 && error.status < 600) return true; // Server error
    if (error.status === 408) return true; // Request timeout
    if (error.status === 429) return true; // Too many requests
    return false;
  }

  // Get user-friendly error message
  getUserFriendlyMessage(error: ApiError): string {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect to the server. Please check your internet connection and try again.';

      case 'UNAUTHORIZED':
        return 'Your session has expired. Please log in again.';

      case 'FORBIDDEN':
        return 'You do not have permission to perform this action.';

      case 'NOT_FOUND':
        return 'The requested resource was not found.';

      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';

      case 'RATE_LIMITED':
        return 'Too many requests. Please wait a moment and try again.';

      case 'MAINTENANCE':
        return 'The system is currently under maintenance. Please try again later.';

      default:
        if (error.status >= 500) {
          return 'A server error occurred. Our team has been notified and is working to fix it.';
        }
        return error.message;
    }
  }

  // Log client-side error
  logError(
    error: Error | string,
    context?: Record<string, any>,
    level: 'error' | 'warning' | 'info' = 'error'
  ): void {
    const errorDetails: ErrorDetails = {
      message: error instanceof Error ? error.message : error,
      timestamp: new Date(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      stackTrace: error instanceof Error ? error.stack : undefined,
      context,
    };

    // Console log for development
    if (level === 'error') {
      console.error('Error logged:', errorDetails);
    } else if (level === 'warning') {
      console.warn('Warning logged:', errorDetails);
    } else {
      console.info('Info logged:', errorDetails);
    }

    // Report to monitoring service
    if (level === 'error') {
      this.reportError(errorDetails);
    }
  }

  // Log API error with context
  logApiError(endpoint: string, method: string, error: any, requestData?: any): ApiError {
    const apiError = this.parseApiError(error);

    this.logError(new Error(apiError.message), {
      type: 'api_error',
      endpoint,
      method,
      status: apiError.status,
      code: apiError.code,
      requestData,
      responseData: error.response?.data,
    });

    return apiError;
  }

  private getCurrentUserId(): string | undefined {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId;
      }
    } catch (err) {
      // Ignore token parsing errors
    }
    return undefined;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  // Retry mechanism for failed requests
  async withRetry<T>(fn: () => Promise<T>, maxRetries = 3, backoffMs = 1000): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const apiError = this.parseApiError(error);

        if (!this.isRetryableError(apiError) || attempt === maxRetries) {
          throw error;
        }

        // Exponential backoff
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));

        console.log(`Retrying request (attempt ${attempt + 1}/${maxRetries})`);
      }
    }

    throw lastError;
  }

  // Handle uncaught promise rejections
  setupGlobalErrorHandling(): void {
    window.addEventListener('unhandledrejection', event => {
      this.logError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandled_promise_rejection' }
      );

      // Prevent default browser error console
      event.preventDefault();
    });

    window.addEventListener('error', event => {
      this.logError(event.error || new Error(event.message), {
        type: 'uncaught_exception',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });
  }
}

export const errorService = new ErrorService();

// Initialize global error handling
errorService.setupGlobalErrorHandling();
