import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { useMobile, useMobileComponents, useMobileBehavior } from './useMobile';
import theme from '../theme';
import PWAService from '../services/pwaService';

// Mock PWAService
vi.mock('../services/pwaService');

// Mock matchMedia
const mockMatchMedia = vi.fn();
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

// Mock screen orientation
const mockScreenOrientation = {
  type: 'portrait-primary',
};
Object.defineProperty(screen, 'orientation', {
  writable: true,
  value: mockScreenOrientation,
});

// Mock PWAService instance
const mockPWAService = {
  getOrientation: vi.fn(() => 'portrait' as const),
  onOrientationChange: vi.fn(),
  isPWAInstalled: vi.fn(() => false),
  vibrate: vi.fn(() => true),
  share: vi.fn(() => Promise.resolve(true)),
  requestWakeLock: vi.fn(() => Promise.resolve(null)),
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>{children}</ThemeProvider>
);

describe('useMobile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(PWAService.getInstance).mockReturnValue(mockPWAService as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects mobile device correctly', () => {
    // Mock mobile screen size
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes('max-width: 899.95px'), // Mobile breakpoint
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMobile(), {
      wrapper: TestWrapper,
    });

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('detects desktop device correctly', () => {
    // Mock desktop screen size
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes('min-width: 1200px'), // Desktop breakpoint
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { result } = renderHook(() => useMobile(), {
      wrapper: TestWrapper,
    });

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('detects tablet device correctly', () => {
    // Mock tablet screen size
    mockMatchMedia.mockImplementation((query: string) => {
      if (query.includes('max-width: 899.95px')) return { matches: false };
      if (query.includes('max-width: 1199.95px')) return { matches: true };
      if (query.includes('min-width: 1200px')) return { matches: false };
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    });

    const { result } = renderHook(() => useMobile(), {
      wrapper: TestWrapper,
    });

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('gets orientation from PWA service', () => {
    mockMatchMedia.mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { result } = renderHook(() => useMobile(), {
      wrapper: TestWrapper,
    });

    expect(result.current.orientation).toBe('portrait');
    expect(mockPWAService.getOrientation).toHaveBeenCalled();
  });

  it('detects touch capability', () => {
    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      value: {},
    });

    const { result } = renderHook(() => useMobile(), {
      wrapper: TestWrapper,
    });

    expect(result.current.hasTouch).toBe(true);
  });
});

describe('useMobileComponents', () => {
  beforeEach(() => {
    vi.mocked(PWAService.getInstance).mockReturnValue(mockPWAService as any);
  });

  it('returns true for mobile devices', () => {
    mockMatchMedia.mockReturnValue({
      matches: true, // Mobile
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const { result } = renderHook(() => useMobileComponents(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBe(true);
  });

  it('returns true for touch devices with PWA', () => {
    mockMatchMedia.mockReturnValue({
      matches: false, // Not mobile
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    mockPWAService.isPWAInstalled.mockReturnValue(true);

    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      value: {},
    });

    const { result } = renderHook(() => useMobileComponents(), {
      wrapper: TestWrapper,
    });

    expect(result.current).toBe(true);
  });
});

describe('useMobileBehavior', () => {
  beforeEach(() => {
    vi.mocked(PWAService.getInstance).mockReturnValue(mockPWAService as any);
    mockMatchMedia.mockReturnValue({
      matches: true, // Mobile
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
  });

  it('provides vibrate function', () => {
    const { result } = renderHook(() => useMobileBehavior(), {
      wrapper: TestWrapper,
    });

    result.current.vibrate(100);
    expect(mockPWAService.vibrate).toHaveBeenCalledWith(100);
  });

  it('provides share function', async () => {
    const { result } = renderHook(() => useMobileBehavior(), {
      wrapper: TestWrapper,
    });

    const shareData = { title: 'Test', text: 'Test content' };
    await result.current.share(shareData);
    expect(mockPWAService.share).toHaveBeenCalledWith(shareData);
  });

  it('provides requestWakeLock function', async () => {
    const { result } = renderHook(() => useMobileBehavior(), {
      wrapper: TestWrapper,
    });

    await result.current.requestWakeLock();
    expect(mockPWAService.requestWakeLock).toHaveBeenCalled();
  });
});
