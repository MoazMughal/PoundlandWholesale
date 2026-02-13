import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/mobile-responsive.css'
import './styles/loading-animations.css'
import App from './App.jsx'
import './config/env-check.js'

// Temporarily disable Service Worker to fix asset loading issues
// TODO: Re-enable after fixing base path issues
if (false && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((error) => {
        console.log('SW registration failed: ', error)
      })
  })
}

// Clear existing service worker cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister()
    }
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
