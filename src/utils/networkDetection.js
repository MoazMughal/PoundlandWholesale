// Network detection and adaptive loading utilities

/**
 * Detect network connection quality
 * @returns {Object} Network information
 */
export const getNetworkInfo = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  const networkInfo = {
    effectiveType: '4g', // Default to good connection
    downlink: 10, // Default to 10 Mbps
    rtt: 100, // Default to 100ms
    saveData: false
  };
  
  if (connection) {
    networkInfo.effectiveType = connection.effectiveType || '4g';
    networkInfo.downlink = connection.downlink || 10;
    networkInfo.rtt = connection.rtt || 100;
    networkInfo.saveData = connection.saveData || false;
  }
  
  return networkInfo;
};

/**
 * Determine if connection is slow
 * @returns {boolean} True if connection is slow
 */
export const isSlowConnection = () => {
  const network = getNetworkInfo();
  
  // Consider slow if:
  // - Effective type is 2g or slow-2g
  // - Downlink is less than 1.5 Mbps
  // - RTT is greater than 300ms
  // - Save data mode is enabled
  return (
    network.effectiveType === 'slow-2g' ||
    network.effectiveType === '2g' ||
    network.downlink < 1.5 ||
    network.rtt > 300 ||
    network.saveData
  );
};

/**
 * Get optimal image loading settings based on network
 * @returns {Object} Loading configuration
 */
export const getOptimalLoadingConfig = () => {
  const isMobile = window.innerWidth <= 768;
  const isSlowNet = isSlowConnection();
  const network = getNetworkInfo();
  
  return {
    // Timeout settings
    timeout: isSlowNet ? 15000 : isMobile ? 8000 : 10000,
    
    // Retry settings
    retries: isSlowNet ? 1 : 2,
    
    // Concurrent loading
    concurrentLimit: isSlowNet ? 2 : isMobile ? 3 : 5,
    
    // Batch delay
    batchDelay: isSlowNet ? 200 : isMobile ? 100 : 50,
    
    // Priority loading
    priorityCount: isSlowNet ? 5 : isMobile ? 10 : 20,
    
    // Image quality
    quality: isSlowNet ? 'low' : isMobile ? 'medium' : 'high',
    
    // Loading strategy
    strategy: isSlowNet ? 'sequential' : 'parallel',
    
    // Network info for debugging
    networkInfo: {
      effectiveType: network.effectiveType,
      downlink: network.downlink,
      rtt: network.rtt,
      saveData: network.saveData,
      isMobile,
      isSlowNet
    }
  };
};

/**
 * Monitor network changes
 * @param {Function} callback - Called when network changes
 * @returns {Function} Cleanup function
 */
export const monitorNetworkChanges = (callback) => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (connection) {
    const handleChange = () => {
      callback(getOptimalLoadingConfig());
    };
    
    connection.addEventListener('change', handleChange);
    
    return () => {
      connection.removeEventListener('change', handleChange);
    };
  }
  
  return () => {}; // No-op cleanup if no connection API
};

export default {
  getNetworkInfo,
  isSlowConnection,
  getOptimalLoadingConfig,
  monitorNetworkChanges
};