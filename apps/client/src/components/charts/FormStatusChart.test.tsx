import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme';
import { FormStatusChart } from './FormStatusChart';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('FormStatusChart', () => {
  const mockData = [
    { status: 'draft', count: 10 },
    { status: 'in_progress', count: 15 },
    { status: 'completed', count: 25 },
    { status: 'approved', count: 8 },
  ];

  it('renders chart with data', () => {
    render(
      <TestWrapper>
        <FormStatusChart data={mockData} />
      </TestWrapper>
    );

    // Check if chart elements are present
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(
      <TestWrapper>
        <FormStatusChart data={mockData} title="Custom Chart Title" />
      </TestWrapper>
    );

    expect(screen.getByText('Custom Chart Title')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(
      <TestWrapper>
        <FormStatusChart data={[]} />
      </TestWrapper>
    );

    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('calculates total correctly', () => {
    render(
      <TestWrapper>
        <FormStatusChart data={mockData} showTotal={true} />
      </TestWrapper>
    );

    // Total should be 10 + 15 + 25 + 8 = 58
    expect(screen.getByText(/total.*58/i)).toBeInTheDocument();
  });

  it('renders with different chart types', () => {
    render(
      <TestWrapper>
        <FormStatusChart data={mockData} type="bar" />
      </TestWrapper>
    );

    // Should render without errors
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });
});