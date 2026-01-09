import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const ClearStorage = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Clear all localStorage
    localStorage.clear()
    
    // Show success message
    alert('Storage cleared successfully! You can now login.')
    
    // Redirect to home
    navigate('/')
  }, [navigate])

  return (
    <div className="container text-center py-5">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Clearing storage...</span>
      </div>
      <p className="mt-3">Clearing storage...</p>
    </div>
  )
}

export default ClearStorage
