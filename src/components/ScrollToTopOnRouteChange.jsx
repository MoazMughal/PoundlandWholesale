import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const ScrollToTopOnRouteChange = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    // Instant scroll to top on route change (smooth causes mobile issues)
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0 // Safari fallback
  }, [pathname])

  return null
}

export default ScrollToTopOnRouteChange
