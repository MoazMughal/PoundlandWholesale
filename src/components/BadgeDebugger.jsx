import { useState, useEffect } from 'react'

const BadgeDebugger = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [badgeRotation, setBadgeRotation] = useState(0)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setBadgeRotation(prev => prev + 1)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const getProductBadge = (index) => {
    const additionalBadges = [
      { text: 'Best Seller', color: '#e74c3c', icon: '🏆', priority: 'high' },
      { text: 'Top Rated', color: '#f39c12', icon: '⭐', priority: 'high' },
      { text: 'Crazy Low', color: '#e67e22', icon: '🔥', priority: 'urgent' },
      { text: 'Very Popular', color: '#9b59b6', icon: '💎', priority: 'medium' },
      { text: 'Limited Time', color: '#3498db', icon: '⚡', priority: 'urgent' },
      { text: 'Hot Deal', color: '#e91e63', icon: '💥', priority: 'high' },
      { text: 'Trending', color: '#1abc9c', icon: '📈', priority: 'medium' },
      { text: 'New Arrival', color: '#27ae60', icon: '✨', priority: 'medium' }
    ]
    
    const amazonChoice = { text: "Amazon's Choice", color: '#ff6600', icon: '✓', priority: 'standard' }
    const alternativeBadge = additionalBadges[index % additionalBadges.length]
    
    return badgeRotation % 2 === 0 ? amazonChoice : alternativeBadge
  }

  const testBadges = [0, 1, 2, 3, 4, 5, 6, 7].map(index => getProductBadge(index))

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '15px',
      borderRadius: '10px',
      zIndex: 9999,
      fontSize: '12px',
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#ff6600' }}>Badge Debugger</h4>
      <div>Window Width: {windowWidth}px</div>
      <div>Is Mobile: {windowWidth <= 576 ? 'Yes' : 'No'}</div>
      <div>Badge Rotation: {badgeRotation}</div>
      
      <div style={{ marginTop: '10px' }}>
        <strong>Current Badges:</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px' }}>
          {testBadges.map((badge, index) => (
            <div key={index} style={{
              backgroundColor: badge.color,
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}>
              <span style={{ fontSize: '8px' }}>{badge.icon}</span>
              <span>{badge.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '10px' }}>
        <strong>Test Badge (should change color):</strong>
        <div style={{ marginTop: '5px' }}>
          <div 
            className="dynamic-mobile-badge"
            data-badge-color={testBadges[0].color}
            style={{
              backgroundColor: testBadges[0].color,
              color: 'white',
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 'bold',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              '--badge-bg': testBadges[0].color
            }}
          >
            <span>{testBadges[0].icon}</span>
            <span>{testBadges[0].text}</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '10px', opacity: 0.7 }}>
        Click anywhere to close this debugger
      </div>
    </div>
  )
}

export default BadgeDebugger