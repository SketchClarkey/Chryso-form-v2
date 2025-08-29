import { useState, useCallback } from 'react';
import { api } from '../services/api';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface ApiState {
  loading: boolean;
  error: string | null;
}

export function useApi(options: UseApiOptions = {}) {
  const [state, setState] = useState<ApiState>({
    loading: false,
    error: null,
  });

  const request = useCallback(async (
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    config?: any
  ) => {
    setState({ loading: true, error: null });

    try {
      let response;
      
      switch (method) {
        case 'GET':
          response = await api.get(url, config);
          break;
        case 'POST':
          response = await api.post(url, data, config);
          break;
        case 'PUT':
          response = await api.put(url, data, config);
          break;
        case 'DELETE':
          response = await api.delete(url, config);
          break;
        case 'PATCH':
          response = await api.patch(url, data, config);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      setState({ loading: false, error: null });
      
      if (options.onSuccess) {
        options.onSuccess(response.data);
      }
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      setState({ loading: false, error: errorMessage });
      
      if (options.onError) {
        options.onError(error);
      } else {
        throw error;
      }
    }
  }, [options.onSuccess, options.onError]);

  const get = useCallback((url: string, config?: any) => request('GET', url, undefined, config), [request]);
  const post = useCallback((url: string, data?: any, config?: any) => request('POST', url, data, config), [request]);
  const put = useCallback((url: string, data?: any, config?: any) => request('PUT', url, data, config), [request]);
  const del = useCallback((url: string, config?: any) => request('DELETE', url, undefined, config), [request]);
  const patch = useCallback((url: string, data?: any, config?: any) => request('PATCH', url, data, config), [request]);

  return {
    ...state,
    request,
    get,
    post,
    put,
    delete: del,
    patch,
  };
}