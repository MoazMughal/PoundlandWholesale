import { useState, useEffect, memo } from 'react'

const ScrollToTop = () => {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      // Multiple ways to get scroll position for better compatibility
      const scrollPosition = Math.max(
        window.pageYOffset || 0,
        document.documentElement.scrollTop || 0,
        document.body.scrollTop || 0,
        window.scrollY || 0
      )
      
      const shouldShow = scrollPosition > 50
      setShowScrollTop(shouldShow)
    }

    // Add multiple scroll listeners for better compatibility
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    
    // Check initial scroll position immediately
    handleScroll()
    
    // Also check periodically to ensure it works
    const interval = setInterval(handleScroll, 1000)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
      clearInterval(interval)
    }
  }, [])

  const scrollToTop = () => {
    // Enhanced scroll to top with multiple methods for Amazon's Choice compatibility
    const scrollToTopInstant = () => {
      // Try multiple scroll methods
      if (window.scrollTo) {
        window.scrollTo(0, 0)
      }
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
      }
      if (document.body) {
        document.body.scrollTop = 0
      }
      // Also try setting pageYOffset if available
      try {
        window.pageYOffset = 0
      } catch (e) {
        // Ignore if not writable
      }
    }
    
    try {
      // Try smooth scroll first
      window.scrollTo({ 
        top: 0, 
        left: 0,
        behavior: 'smooth' 
      })
      
      // Check if smooth scroll worked after a short delay
      setTimeout(() => {
        const currentScroll = Math.max(
          window.pageYOffset || 0,
          document.documentElement.scrollTop || 0,
          document.body.scrollTop || 0,
          window.scrollY || 0
        )
        
        if (currentScroll > 10) {
          // Smooth scroll didn't work, use instant scroll
          scrollToTopInstant()
        }
      }, 500)
      
    } catch (error) {
      // Immediate fallback for older browsers or compatibility issues
      scrollToTopInstant()
    }
  }

  if (!showScrollTop) return null

  return (
    <button 
      className="scroll-to-top-btn"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        scrollToTop()
      }}
      onMouseDown={(e) => e.preventDefault()}
      aria-label="Scroll to top"
      title="Scroll to top"
      type="button"
    >
      <i className="fas fa-arrow-up"></i>
      
      <style jsx>{`
        .scroll-to-top-btn {
          position: fixed !important;
          bottom: 90px !important; /* Position above WhatsApp button (WhatsApp is at 30px + 50px height + 10px gap) */
          right: 30px !important;
          width: 50px !important;
          height: 50px !important;
          background: linear-gradient(135deg, #ff9900, #ff6600) !important;
          color: white !important;
          border: 2px solid #fff !important; /* Add white border for visibility */
          border-radius: 50% !important;
          font-size: 20px !important;
          cursor: pointer !important;
          box-shadow: 0 4px 15px rgba(255, 102, 0, 0.8) !important; /* Stronger shadow */
          z-index: 9999 !important; /* Much higher z-index to ensure visibility */
          transition: all 0.3s ease !important;
          display: flex !important; /* Force display */
          align-items: center !important;
          justify-content: center !important;
          animation: fadeInUp 0.3s ease !important;
          opacity: 1 !important; /* Force opacity */
          visibility: visible !important; /* Force visibility */
          pointer-events: auto !important; /* Ensure it's clickable */
          transform: none !important; /* Reset any transforms */
          margin: 0 !important; /* Reset margins */
          padding: 0 !important; /* Reset padding */
        }
        
        .scroll-to-top-btn:hover {
          transform: translateY(-3px); /* Reduced movement for subtlety */
          box-shadow: 0 6px 20px rgba(255, 102, 0, 0.6);
          background: linear-gradient(135deg, #ff6600, #ff3300); /* Slightly different gradient on hover */
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @media (max-width: 768px) {
          .scroll-to-top-btn {
            bottom: 85px !important; /* Position above WhatsApp button on mobile (WhatsApp is at 20px + 45px height + 20px gap) */
            right: 20px !important;
            width: 45px !important;
            height: 45px !important;
            font-size: 18px !important;
            display: flex !important; /* Force display on mobile */
            opacity: 1 !important; /* Force opacity on mobile */
            visibility: visible !important; /* Force visibility on mobile */
            pointer-events: auto !important; /* Ensure it's clickable on mobile */
            border: 2px solid #fff !important; /* White border for visibility on mobile */
            box-shadow: 0 4px 15px rgba(255, 102, 0, 0.8) !important; /* Stronger shadow on mobile */
            z-index: 9999 !important; /* Much higher z-index for mobile */
            transform: none !important; /* Reset any transforms on mobile */
            margin: 0 !important; /* Reset margins on mobile */
            padding: 0 !important; /* Reset padding on mobile */
          }
        }
      `}</style>
    </button>
  )
}

export default memo(ScrollToTop)
