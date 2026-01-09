// Device detection utilities

export const isMobile = () => {
  return window.innerWidth <= 768;
};

export const isTablet = () => {
  return window.innerWidth > 768 && window.innerWidth <= 1024;
};

export const isDesktop = () => {
  return window.innerWidth > 1024;
};

export const getUserAgent = () => {
  return navigator.userAgent;
};

export const getDeviceInfo = () => {
  return {
    isMobile: isMobile(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    userAgent: getUserAgent(),
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine
  };
};

export const logDeviceInfo = () => {
  const info = getDeviceInfo();
  console.log('📱 Device Info:', info);
  return info;
};

export default {
  isMobile,
  isTablet,
  isDesktop,
  getUserAgent,
  getDeviceInfo,
  logDeviceInfo
};