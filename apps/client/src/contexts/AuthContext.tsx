import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: 'admin' | 'manager' | 'technician';
  worksites: Array<{
    id: string;
    name: string;
    customerName: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  }>;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
    language: string;
  };
  lastLogin?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: 'admin' | 'manager' | 'technician';
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const TOKEN_KEY = 'chryso_access_token';
const REFRESH_TOKEN_KEY = 'chryso_refresh_token';

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();

  // Get current user profile
  const {
    data: userData,
    isLoading: isUserLoading,
    error,
  } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) throw new Error('No token');

      const response = await api.get('/auth/me');
      return response.data.data.user;
    },
    enabled: !!localStorage.getItem(TOKEN_KEY) && isInitialized,
    retry: false,
    staleTime: 0,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await api.post('/auth/login', credentials);
      return response.data.data;
    },
    onSuccess: data => {
      localStorage.setItem(TOKEN_KEY, data.tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
      setUser(data.user);

      // Invalidate and refetch user data
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.setQueryData(['auth', 'me'], data.user);
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await api.post('/auth/register', data);
      return response.data.data;
    },
    onSuccess: data => {
      if (data.tokens) {
        localStorage.setItem(TOKEN_KEY, data.tokens.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.tokens.refreshToken);
        setUser(data.user);
        queryClient.setQueryData(['auth', 'me'], data.user);
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        // Continue with logout even if API call fails
        console.warn('Logout API call failed:', error);
      }
    },
    onSettled: () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
      queryClient.clear();
    },
  });

  // Token refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) throw new Error('No refresh token');

      const response = await api.post('/auth/refresh', { refreshToken });
      return response.data.data;
    },
    onSuccess: data => {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
    },
    onError: () => {
      // Refresh failed, clear tokens and redirect to login
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
      queryClient.clear();
    },
  });

  // Initialize auth state on mount
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Update user state when userData changes
  useEffect(() => {
    if (userData && !error) {
      setUser(userData);
    } else if (error && !isUserLoading) {
      // Token might be invalid, clear it
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
    }
  }, [userData, error, isUserLoading]);

  // Axios response interceptor for token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;

        if (
          error.response?.status === 401 &&
          error.response?.data?.code === 'INVALID_TOKEN' &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;

          try {
            await refreshMutation.mutateAsync();
            // Retry the original request with the new token
            const token = localStorage.getItem(TOKEN_KEY);
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [refreshMutation]);

  const login = async (credentials: LoginCredentials) => {
    return loginMutation.mutateAsync(credentials);
  };

  const register = async (data: RegisterData) => {
    return registerMutation.mutateAsync(data);
  };

  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  const refreshToken = async () => {
    return refreshMutation.mutateAsync();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading:
      isUserLoading || !isInitialized || loginMutation.isPending || registerMutation.isPending,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
