import { useNavigate } from 'react-router-dom'
import '../../styles/role-selection.css'

const RoleSelection = () => {
  const navigate = useNavigate()

  const roles = [
    {
      type: 'buyer',
      title: 'Buyer Login',
      icon: 'fa-shopping-cart',
      description: 'Browse and purchase wholesale products',
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      path: '/login/buyer'
    },
    {
      type: 'seller',
      title: 'Seller Login',
      icon: 'fa-store',
      description: 'Manage products and grow your business',
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      path: '/login/supplier'
    },
    {
      type: 'admin',
      title: 'Admin Login',
      icon: 'fa-crown',
      description: 'Manage platform and users',
      color: '#667eea',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      path: '/admin/login'
    }
  ]

  return (
    <div className="role-selection-container">
      <div className="role-selection-content">
        <div className="role-selection-header">
          <h1 className="role-selection-title">Choose Account Type</h1>
          <p className="role-selection-subtitle">Select your role to continue</p>
        </div>

        <div className="role-cards-container">
          {roles.map((role) => (
            <div
              key={role.type}
              className="role-card"
              onClick={() => navigate(role.path)}
              style={{ '--role-color': role.color }}
            >
              <div className="role-card-inner">
                <div 
                  className="role-icon-container"
                  style={{ background: role.gradient }}
                >
                  <i className={`fas ${role.icon} role-icon`}></i>
                </div>
                
                <h3 className="role-title">{role.title}</h3>
                <p className="role-description">{role.description}</p>
                
                <button 
                  className="role-button"
                  style={{ background: role.gradient }}
                >
                  <span>Continue</span>
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="role-selection-footer">
          <p>Don't have an account?</p>
          <button 
            className="register-link"
            onClick={() => navigate('/join-now')}
          >
            Register Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default RoleSelection
