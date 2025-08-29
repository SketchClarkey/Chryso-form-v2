import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme';
import { LoadingSpinner, LoadingOverlay, ErrorState, EmptyState } from './LoadingStates';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('LoadingStates Components', () => {
  describe('LoadingSpinner', () => {
    it('renders with default size', () => {
      render(
        <TestWrapper>
          <LoadingSpinner />
        </TestWrapper>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('renders with custom size', () => {
      render(
        <TestWrapper>
          <LoadingSpinner size={60} />
        </TestWrapper>
      );

      const spinner = screen.getByRole('progressbar');
      expect(spinner).toBeInTheDocument();
    });

    it('renders with custom color', () => {
      render(
        <TestWrapper>
          <LoadingSpinner color="secondary" />
        </TestWrapper>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('LoadingOverlay', () => {
    it('renders when open', () => {
      render(
        <TestWrapper>
          <LoadingOverlay open={true} />
        </TestWrapper>
      );

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(
        <TestWrapper>
          <LoadingOverlay open={false} />
        </TestWrapper>
      );

      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(
        <TestWrapper>
          <LoadingOverlay open={true} message="Loading data..." />
        </TestWrapper>
      );

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('ErrorState', () => {
    it('renders error message', () => {
      render(
        <TestWrapper>
          <ErrorState message="Something went wrong" />
        </TestWrapper>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(
        <TestWrapper>
          <ErrorState title="Custom Error" message="Error details" />
        </TestWrapper>
      );

      expect(screen.getByText('Custom Error')).toBeInTheDocument();
      expect(screen.getByText('Error details')).toBeInTheDocument();
    });

    it('renders retry button when onRetry provided', () => {
      const onRetry = vi.fn();
      render(
        <TestWrapper>
          <ErrorState message="Error occurred" onRetry={onRetry} />
        </TestWrapper>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders empty message', () => {
      render(
        <TestWrapper>
          <EmptyState message="No data available" />
        </TestWrapper>
      );

      expect(screen.getByText('No data available')).toBeInTheDocument();
    });

    it('renders with custom title', () => {
      render(
        <TestWrapper>
          <EmptyState title="No Results" message="Try different filters" />
        </TestWrapper>
      );

      expect(screen.getByText('No Results')).toBeInTheDocument();
      expect(screen.getByText('Try different filters')).toBeInTheDocument();
    });

    it('renders action button when provided', () => {
      render(
        <TestWrapper>
          <EmptyState 
            message="No items found" 
            action={{ 
              label: 'Add New', 
              onClick: vi.fn() 
            }} 
          />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: 'Add New' })).toBeInTheDocument();
    });
  });
});