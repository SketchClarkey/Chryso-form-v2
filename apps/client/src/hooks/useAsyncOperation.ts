import { useState, useCallback, useRef, useEffect } from 'react';
import { errorService, ApiError } from '../services/errorService';
import { useToastNotifications } from '../components/notifications/NotificationToast';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  success: boolean;
}

export interface AsyncOperationOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

export function useAsyncOperation<T = any>(
  operation?: () => Promise<T>,
  options: AsyncOperationOptions = {}
) {
  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation completed successfully',
    retries = 0,
    retryDelay = 1000,
    timeout = 10000,
  } = options;

  const toast = useToastNotifications();
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Execute async operation
  const execute = useCallback(
    async (customOperation?: () => Promise<T>): Promise<T | null> => {
      const op = customOperation || operation;
      if (!op) {
        throw new Error('No operation provided');
      }

      // Cleanup previous operation
      cleanup();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      setState(prev => ({
        ...prev,
        loading: true,
        error: null,
        success: false,
      }));

      try {
        // Set timeout
        if (timeout > 0) {
          timeoutRef.current = setTimeout(() => {
            abortControllerRef.current?.abort();
          }, timeout);
        }

        let result: T;
        if (retries > 0) {
          // Use retry mechanism
          result = await errorService.withRetry(op, retries + 1, retryDelay);
        } else {
          result = await op();
        }

        // Check if operation was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        setState(prev => ({
          ...prev,
          data: result,
          loading: false,
          success: true,
        }));

        if (showSuccessToast) {
          toast.showSuccess(successMessage);
        }

        return result;
      } catch (error: any) {
        // Check if operation was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return null;
        }

        const apiError = errorService.parseApiError(error);
        errorService.logApiError('async-operation', 'execute', error);

        setState(prev => ({
          ...prev,
          loading: false,
          error: apiError,
        }));

        if (showErrorToast) {
          toast.showError(errorService.getUserFriendlyMessage(apiError));
        }

        throw apiError;
      } finally {
        cleanup();
      }
    },
    [operation, retries, retryDelay, timeout, showSuccessToast, showErrorToast, successMessage, toast, cleanup]
  );

  // Reset state
  const reset = useCallback(() => {
    cleanup();
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    ...state,
    execute,
    reset,
    isRetryable: state.error ? errorService.isRetryableError(state.error) : false,
  };
}

// Specialized hook for form operations
export function useFormOperation<T = any>(options: AsyncOperationOptions = {}) {
  const defaultOptions: AsyncOperationOptions = {
    showSuccessToast: true,
    showErrorToast: true,
    ...options,
  };

  return useAsyncOperation<T>(undefined, defaultOptions);
}

// Specialized hook for data fetching
export function useDataFetching<T = any>(
  fetcher?: () => Promise<T>,
  options: AsyncOperationOptions & { autoExecute?: boolean } = {}
) {
  const { autoExecute = false, ...asyncOptions } = options;
  
  const defaultOptions: AsyncOperationOptions = {
    showSuccessToast: false,
    showErrorToast: true,
    retries: 2,
    ...asyncOptions,
  };

  const asyncOp = useAsyncOperation<T>(fetcher, defaultOptions);

  // Auto-execute on mount if enabled
  useEffect(() => {
    if (autoExecute && fetcher) {
      asyncOp.execute();
    }
  }, [autoExecute, fetcher]); // eslint-disable-line react-hooks/exhaustive-deps

  return asyncOp;
}

// Hook for managing multiple async operations
export function useMultipleAsyncOperations<T extends Record<string, any>>(
  operations: Record<keyof T, () => Promise<T[keyof T]>>,
  options: AsyncOperationOptions = {}
) {
  const [states, setStates] = useState<Record<keyof T, AsyncState<T[keyof T]>>>(() => {
    const initialStates: any = {};
    Object.keys(operations).forEach(key => {
      initialStates[key] = {
        data: null,
        loading: false,
        error: null,
        success: false,
      };
    });
    return initialStates;
  });

  const toast = useToastNotifications();

  const executeOne = useCallback(
    async <K extends keyof T>(key: K): Promise<T[K] | null> => {
      const operation = operations[key];
      if (!operation) return null;

      setStates(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          loading: true,
          error: null,
          success: false,
        },
      }));

      try {
        const result = await operation();
        
        setStates(prev => ({
          ...prev,
          [key]: {
            data: result,
            loading: false,
            error: null,
            success: true,
          },
        }));

        return result;
      } catch (error: any) {
        const apiError = errorService.parseApiError(error);
        
        setStates(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            loading: false,
            error: apiError,
          },
        }));

        if (options.showErrorToast !== false) {
          toast.showError(errorService.getUserFriendlyMessage(apiError));
        }

        throw apiError;
      }
    },
    [operations, options.showErrorToast, toast]
  );

  const executeAll = useCallback(
    async (): Promise<Partial<T>> => {
      const promises = Object.entries(operations).map(async ([key, operation]) => {
        try {
          const result = await executeOne(key as keyof T);
          return [key, result];
        } catch (error) {
          return [key, null];
        }
      });

      const results = await Promise.all(promises);
      return Object.fromEntries(results) as Partial<T>;
    },
    [operations, executeOne]
  );

  const reset = useCallback((key?: keyof T) => {
    if (key) {
      setStates(prev => ({
        ...prev,
        [key]: {
          data: null,
          loading: false,
          error: null,
          success: false,
        },
      }));
    } else {
      setStates(prev => {
        const resetStates: any = {};
        Object.keys(prev).forEach(k => {
          resetStates[k] = {
            data: null,
            loading: false,
            error: null,
            success: false,
          };
        });
        return resetStates;
      });
    }
  }, []);

  const isAnyLoading = Object.values(states).some(state => state.loading);
  const hasAnyError = Object.values(states).some(state => state.error);
  const allSuccess = Object.values(states).every(state => state.success);

  return {
    states,
    executeOne,
    executeAll,
    reset,
    isAnyLoading,
    hasAnyError,
    allSuccess,
  };
}