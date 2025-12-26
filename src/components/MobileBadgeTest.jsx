import { useState, useEffect } from 'react'

const MobileBadgeTest = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [debugInfo, setDebugInfo] = useState({})

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    
    // Collect debug information
    setDebugInfo({
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: window.innerWidth <= 576,
      isTouch: 'ontouchstart' in window,
      devicePixelRatio: window.devicePixelRatio,
      orientation: window.screen?.orientation?.type || 'unknown'
    })
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // Check badge visibility after render
    setTimeout(() => {
      const mobileBadge = document.querySelector('.test-mobile-badge')
      const desktopBadge = document.querySelector('.test-desktop-badge')
      
      if (mobileBadge) {
        const styles = window.getComputedStyle(mobileBadge)
        console.log('🧪 Test Mobile Badge Styles:', {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          backgroundColor: styles.backgroundColor,
          color: styles.color
        })
      }
      
      if (desktopBadge) {
        const styles = window.getComputedStyle(desktopBadge)
        console.log('🧪 Test Desktop Badge Styles:', {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity
        })
      }
    }, 500)
  }, [windowWidth])

  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      margin: '20px',
      borderRadius: '10px',
      border: '2px solid #ff6600'
    }}>
      <h3 style={{ color: '#ff6600', marginBottom: '15px' }}>
        Mobile Badge Test Component
      </h3>
      
      {/* Debug Information */}
      <div style={{ 
        background: 'white', 
        padding: '10px', 
        borderRadius: '5px',
        marginBottom: '15px',
        fontSize: '12px'
      }}>
        <strong>Debug Info:</strong><br/>
        Screen: {debugInfo.windowWidth}x{debugInfo.windowHeight}px<br/>
        Is Mobile: {debugInfo.isMobile ? 'Yes' : 'No'}<br/>
        Touch Support: {debugInfo.isTouch ? 'Yes' : 'No'}<br/>
        Device Pixel Ratio: {debugInfo.devicePixelRatio}<br/>
        Platform: {debugInfo.platform}<br/>
        Orientation: {debugInfo.orientation}
      </div>

      {/* Test Product Card */}
      <div style={{
        width: '200px',
        height: '200px',
        background: 'white',
        border: '2px solid #ccc',
        borderRadius: '10px',
        position: 'relative',
        margin: '0 auto'
      }}>
        <div style={{
          width: '100%',
          height: '150px',
          background: '#f8f8f8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          borderRadius: '8px 8px 0 0'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: '#ddd',
            borderRadius: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: '#666'
          }}>
            Test Product
          </div>

          {/* Mobile Badge */}
          <div 
            className="test-mobile-badge mobile-badge-container"
            data-mobile-badge="true"
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              zIndex: 1000,
              fontSize: '10px',
              fontWeight: 'bold',
              display: windowWidth <= 576 ? 'block' : 'none',
              opacity: windowWidth <= 576 ? 1 : 0,
              visibility: windowWidth <= 576 ? 'visible' : 'hidden',
              whiteSpace: 'nowrap'
            }}
          >
            <span style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 'bold',
              boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
              border: 'none', // Remove white border
              textShadow: '0 1px 2px rgba(0,0,0,0.3)'
            }}>
              <span style={{fontSize: '8px'}}>🏆</span>
              <span>Best Seller</span>
            </span>
          </div>

          {/* Desktop Badge */}
          <div 
            className="test-desktop-badge desktop-badge-container"
            data-desktop-badge="true"
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              zIndex: 1000,
              display: windowWidth > 576 ? 'block' : 'none',
              opacity: windowWidth > 576 ? 1 : 0,
              visibility: windowWidth > 576 ? 'visible' : 'hidden'
            }}
          >
            <span style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: 'bold',
              boxShadow: '0 3px 8px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap'
            }}>
              🏆 Best Seller
            </span>
          </div>
        </div>

        <div style={{
          padding: '10px',
          fontSize: '12px',
          textAlign: 'center'
        }}>
          <strong>Test Product Name</strong><br/>
          <span style={{ color: '#ff6600', fontWeight: 'bold' }}>£19.99</span>
        </div>
      </div>

      {/* Status Indicators */}
      <div style={{ 
        marginTop: '15px', 
        textAlign: 'center',
        fontSize: '12px'
      }}>
        <div style={{ 
          color: windowWidth <= 576 ? '#28a745' : '#6c757d',
          fontWeight: 'bold'
        }}>
          Mobile Badge: {windowWidth <= 576 ? '✅ Should be visible' : '❌ Should be hidden'}
        </div>
        <div style={{ 
          color: windowWidth > 576 ? '#28a745' : '#6c757d',
          fontWeight: 'bold'
        }}>
          Desktop Badge: {windowWidth > 576 ? '✅ Should be visible' : '❌ Should be hidden'}
        </div>
      </div>
    </div>
  )
}

export default MobileBadgeTest