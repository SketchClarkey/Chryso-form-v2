import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../../theme';
import { FileUploader } from './FileUploader';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

describe('FileUploader', () => {
  it('renders upload area', () => {
    const onUpload = vi.fn();
    
    render(
      <TestWrapper>
        <FileUploader onUpload={onUpload} />
      </TestWrapper>
    );

    expect(screen.getByText(/drag.*drop.*files/i)).toBeInTheDocument();
    expect(screen.getByText(/click to select/i)).toBeInTheDocument();
  });

  it('accepts custom accept types', () => {
    const onUpload = vi.fn();
    
    render(
      <TestWrapper>
        <FileUploader onUpload={onUpload} accept="image/*" />
      </TestWrapper>
    );

    const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('shows max file size info', () => {
    const onUpload = vi.fn();
    
    render(
      <TestWrapper>
        <FileUploader onUpload={onUpload} maxSize={5000000} />
      </TestWrapper>
    );

    expect(screen.getByText(/max.*5.*mb/i)).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    const onUpload = vi.fn();
    
    render(
      <TestWrapper>
        <FileUploader onUpload={onUpload} />
      </TestWrapper>
    );

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith([file]);
    });
  });

  it('shows multiple file selection when multiple=true', () => {
    const onUpload = vi.fn();
    
    render(
      <TestWrapper>
        <FileUploader onUpload={onUpload} multiple />
      </TestWrapper>
    );

    const input = screen.getByRole('button').querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('multiple');
  });

  it('disables when disabled prop is true', () => {
    const onUpload = vi.fn();
    
    render(
      <TestWrapper>
        <FileUploader onUpload={onUpload} disabled />
      </TestWrapper>
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('shows loading state', () => {
    const onUpload = vi.fn();
    
    render(
      <TestWrapper>
        <FileUploader onUpload={onUpload} loading />
      </TestWrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays upload progress', () => {
    const onUpload = vi.fn();
    
    render(
      <TestWrapper>
        <FileUploader onUpload={onUpload} progress={45} />
      </TestWrapper>
    );

    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});