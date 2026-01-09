import { useState, useEffect } from 'react'

const Notification = ({ type = 'info', message, show, onClose, autoClose = true, duration = 5000 }) => {
  const [visible, setVisible] = useState(show)

  useEffect(() => {
    setVisible(show)
    
    if (show && autoClose) {
      const timer = setTimeout(() => {
        setVisible(false)
        if (onClose) onClose()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [show, autoClose, duration, onClose])

  if (!visible) return null

  const getIcon = () => {
    switch (type) {
      case 'success': return 'fas fa-check-circle'
      case 'error': return 'fas fa-exclamation-triangle'
      case 'warning': return 'fas fa-exclamation-circle'
      default: return 'fas fa-info-circle'
    }
  }

  const getAlertClass = () => {
    switch (type) {
      case 'success': return 'alert-success'
      case 'error': return 'alert-danger'
      case 'warning': return 'alert-warning'
      default: return 'alert-info'
    }
  }

  return (
    <div 
      className={`alert ${getAlertClass()} alert-dismissible fade show`} 
      role="alert"
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        minWidth: '300px',
        maxWidth: '500px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}
    >
      <div className="d-flex align-items-center">
        <i className={`${getIcon()} me-2`}></i>
        <div className="flex-grow-1">{message}</div>
        <button 
          type="button" 
          className="btn-close" 
          onClick={() => {
            setVisible(false)
            if (onClose) onClose()
          }}
        ></button>
      </div>
    </div>
  )
}

export default Notification