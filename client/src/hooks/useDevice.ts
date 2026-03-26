import { useState, useEffect } from 'react';

type DeviceType = 'mobile' | 'tablet' | 'desktop';
type Orientation = 'portrait' | 'landscape';

interface DeviceInfo {
  type: DeviceType;
  orientation: Orientation;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  width: number;
  height: number;
}

export function useDevice(): DeviceInfo {
  const [info, setInfo] = useState<DeviceInfo>(getDeviceInfo);

  useEffect(() => {
    const handleResize = () => setInfo(getDeviceInfo());
    window.addEventListener('resize', handleResize);
    const vv = window.visualViewport;
    if (vv) vv.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (vv) vv.removeEventListener('resize', handleResize);
    };
  }, []);

  return info;
}

function getDeviceInfo(): DeviceInfo {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  let type: DeviceType = 'desktop';
  if (w < 768) type = 'mobile';
  else if (w < 1024) type = 'tablet';

  const orientation: Orientation = w > h ? 'landscape' : 'portrait';

  return {
    type,
    orientation,
    isMobile: type === 'mobile',
    isTablet: type === 'tablet',
    isDesktop: type === 'desktop',
    isTouchDevice,
    width: w,
    height: h,
  };
}
