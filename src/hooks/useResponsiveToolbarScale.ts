import { useState, useEffect, useMemo } from 'react';

export interface ResponsiveToolbarMetrics {
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
  isTouchDevice: boolean;
  isCompact: boolean;    // < 480px (Mobile portrait, e.g. itel A70, iPhone)
  isTablet: boolean;     // 480px - 1023px
  isDesktop: boolean;    // >= 1024px
  isLandscape: boolean;
  scaleFactor: number;   // 0.85 .. 1.2
  touchTargetMinPx: number; // 44px or 48px on touch, 36px on desktop
  buttonMinHeight: string;
  buttonMinWidth: string;
  iconSizeClass: string;
  labelSizeClass: string;
  sheetDrawerMaxHeight: string;
  sheetDrawerHeightPx: number;
  categoryChipPadding: string;
  floatingButtonSize: string;
}

export function useResponsiveToolbarScale(): ResponsiveToolbarMetrics {
  const [metrics, setMetrics] = useState<ResponsiveToolbarMetrics>(() => {
    if (typeof window === 'undefined') {
      return {
        viewportWidth: 360,
        viewportHeight: 640,
        dpr: 1,
        isTouchDevice: true,
        isCompact: true,
        isTablet: false,
        isDesktop: false,
        isLandscape: false,
        scaleFactor: 1,
        touchTargetMinPx: 44,
        buttonMinHeight: 'min-h-[44px]',
        buttonMinWidth: 'min-w-[48px]',
        iconSizeClass: 'w-4 h-4',
        labelSizeClass: 'text-[9.5px]',
        sheetDrawerMaxHeight: '72vh',
        sheetDrawerHeightPx: 420,
        categoryChipPadding: 'px-2.5 py-1.5',
        floatingButtonSize: 'min-w-[36px] min-h-[36px]',
      };
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
    const isCompact = vw < 480;
    const isTablet = vw >= 480 && vw < 1024;
    const isDesktop = vw >= 1024;
    const isLandscape = vw > vh && isTouch;

    // Scale calculation based on viewport width & touch requirements
    let scaleFactor = 1.0;
    if (isCompact) {
      scaleFactor = vw < 360 ? 0.9 : 1.0;
    } else if (isTablet) {
      scaleFactor = 1.1;
    } else {
      scaleFactor = 1.0;
    }

    const touchTargetMinPx = isTouch ? (isCompact ? 44 : 48) : 36;
    const buttonMinHeight = isTouch ? (isCompact ? 'min-h-[44px]' : 'min-h-[48px]') : 'min-h-[38px]';
    const buttonMinWidth = isTouch ? (isCompact ? 'min-w-[46px]' : 'min-w-[54px]') : 'min-w-[42px]';
    const iconSizeClass = isCompact ? 'w-4 h-4' : isTablet ? 'w-4.5 h-4.5' : 'w-4 h-4';
    const labelSizeClass = isCompact ? 'text-[9.5px]' : 'text-[10px]';
    const sheetDrawerMaxHeight = isLandscape ? '56vh' : isCompact ? '72vh' : '65vh';
    const sheetDrawerHeightPx = isLandscape ? 320 : isCompact ? 420 : 460;
    const categoryChipPadding = isTouch ? (isCompact ? 'px-2 py-1.5' : 'px-3 py-2') : 'px-2.5 py-1';
    const floatingButtonSize = isTouch ? (isCompact ? 'min-w-[36px] min-h-[36px]' : 'min-w-[40px] min-h-[40px]') : 'min-w-[30px] min-h-[30px]';

    return {
      viewportWidth: vw,
      viewportHeight: vh,
      dpr,
      isTouchDevice: !!isTouch,
      isCompact,
      isTablet,
      isDesktop,
      isLandscape,
      scaleFactor,
      touchTargetMinPx,
      buttonMinHeight,
      buttonMinWidth,
      iconSizeClass,
      labelSizeClass,
      sheetDrawerMaxHeight,
      sheetDrawerHeightPx,
      categoryChipPadding,
      floatingButtonSize,
    };
  });

  useEffect(() => {
    let timeoutId: number | undefined;

    const updateMetrics = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
      const isCompact = vw < 480;
      const isTablet = vw >= 480 && vw < 1024;
      const isDesktop = vw >= 1024;
      const isLandscape = vw > vh && isTouch;

      let scaleFactor = 1.0;
      if (isCompact) {
        scaleFactor = vw < 360 ? 0.9 : 1.0;
      } else if (isTablet) {
        scaleFactor = 1.1;
      } else {
        scaleFactor = 1.0;
      }

      const touchTargetMinPx = isTouch ? (isCompact ? 44 : 48) : 36;
      const buttonMinHeight = isTouch ? (isCompact ? 'min-h-[44px]' : 'min-h-[48px]') : 'min-h-[38px]';
      const buttonMinWidth = isTouch ? (isCompact ? 'min-w-[46px]' : 'min-w-[54px]') : 'min-w-[42px]';
      const iconSizeClass = isCompact ? 'w-4 h-4' : isTablet ? 'w-4.5 h-4.5' : 'w-4 h-4';
      const labelSizeClass = isCompact ? 'text-[9.5px]' : 'text-[10px]';
      const sheetDrawerMaxHeight = isLandscape ? '56vh' : isCompact ? '72vh' : '65vh';
      const sheetDrawerHeightPx = isLandscape ? 320 : isCompact ? 420 : 460;
      const categoryChipPadding = isTouch ? (isCompact ? 'px-2 py-1.5' : 'px-3 py-2') : 'px-2.5 py-1';
      const floatingButtonSize = isTouch ? (isCompact ? 'min-w-[36px] min-h-[36px]' : 'min-w-[40px] min-h-[40px]') : 'min-w-[30px] min-h-[30px]';

      setMetrics({
        viewportWidth: vw,
        viewportHeight: vh,
        dpr,
        isTouchDevice: !!isTouch,
        isCompact,
        isTablet,
        isDesktop,
        isLandscape,
        scaleFactor,
        touchTargetMinPx,
        buttonMinHeight,
        buttonMinWidth,
        iconSizeClass,
        labelSizeClass,
        sheetDrawerMaxHeight,
        sheetDrawerHeightPx,
        categoryChipPadding,
        floatingButtonSize,
      });
    };

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(updateMetrics, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return metrics;
}
