import { useState, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import PWAService from '../services/pwaService';

interface MobileState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  isPWA: boolean;
  hasTouch: boolean;
  isStandalone: boolean;
}

export function useMobile(): MobileState {
  const theme = useTheme();
  const pwaService = PWAService.getInstance();
  
  // Media queries
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() =>
    pwaService.getOrientation()
  );
  
  const [isPWA] = useState(() => pwaService.isPWAInstalled());
  const [hasTouch] = useState(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0);
  const [isStandalone] = useState(() => 
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    // Listen for orientation changes
    pwaService.onOrientationChange(setOrientation);
  }, [pwaService]);

  return {
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    isPWA,
    hasTouch,
    isStandalone,
  };
}

// Hook specifically for detecting if mobile components should be used
export function useMobileComponents(): boolean {
  const { isMobile, hasTouch, isPWA } = useMobile();
  
  // Use mobile components if:
  // - Device is mobile sized
  // - Device has touch capability and is PWA
  return isMobile || (hasTouch && isPWA);
}

// Hook for mobile-optimized behavior
export function useMobileBehavior() {
  const { isMobile, hasTouch, isStandalone } = useMobile();
  const pwaService = PWAService.getInstance();

  const vibrate = (pattern: number | number[] = 50) => {
    if (isMobile && hasTouch) {
      pwaService.vibrate(pattern);
    }
  };

  const share = async (data: { title?: string; text?: string; url?: string }) => {
    if (isMobile) {
      return await pwaService.share(data);
    }
    return false;
  };

  const requestWakeLock = async () => {
    if (isMobile && isStandalone) {
      return await pwaService.requestWakeLock();
    }
    return null;
  };

  return {
    vibrate,
    share,
    requestWakeLock,
    isMobile,
    hasTouch,
    isStandalone,
  };
}