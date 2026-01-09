import { useState, useEffect, memo } from 'react'

const ScrollToTop = () => {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!showScrollTop) return null

  return (
    <button 
      className="scroll-to-top-btn"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
    >
      <i className="fas fa-arrow-up"></i>
      
      <style jsx>{`
        .scroll-to-top-btn {
          position: fixed;
          bottom: 100px;
          right: 30px;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #ff9900, #ff6600);
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 20px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(255, 102, 0, 0.4);
          z-index: 1000;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeInUp 0.3s ease;
        }
        
        .scroll-to-top-btn:hover {
          transform: translateY(-5px);
          box-shadow: 0 6px 20px rgba(255, 102, 0, 0.6);
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
            bottom: 150px;
            right: 20px;
            width: 45px;
            height: 45px;
            font-size: 18px;
          }
        }
      `}</style>
    </button>
  )
}

export default memo(ScrollToTop)
