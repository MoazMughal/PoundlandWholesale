import { useEffect } from 'react'
import './SuccessToast.css'

const SuccessToast = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  return (
    <div className="success-toast-overlay">
      <div className="success-toast">
        <div className="success-toast-icon">
          <i className="fas fa-check-circle"></i>
        </div>
        <div className="success-toast-content">
          <h4 className="success-toast-title">Success!</h4>
          <p className="success-toast-message">{message}</p>
        </div>
        <button className="success-toast-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  )
}

export default SuccessToast
