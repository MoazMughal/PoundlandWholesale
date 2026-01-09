import { useNavigate, useLocation } from 'react-router-dom'
import { useSeller } from '../context/SellerContext'

const SellerStatusBar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { seller, isLoggedIn, logout } = useSeller()

  // Hide SellerStatusBar completely since Navbar already shows seller status
  return null

  return (
    <div style={{
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
      padding: '6px 0', 
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 1000
    }}>
      <div className="container-fluid">
        <div style={{
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '10px'
        }}>
          <div style={{
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px', 
            color: 'white',
            fontSize: '0.85rem'
          }}>
            <div style={{fontWeight: '600'}}>
              <i className="fas fa-user-tie"></i> Seller: {seller.username}
            </div>
            <div style={{opacity: '0.9'}}>
              ID: {seller.supplierId}
            </div>
            <div>
              <span className={`badge ${
                seller.verificationStatus === 'approved' ? 'bg-success' : 
                seller.verificationStatus === 'pending' ? 'bg-warning text-dark' : 
                'bg-danger'
              }`} style={{fontSize: '0.7rem'}}>
                {seller.verificationStatus?.toUpperCase()}
              </span>
            </div>
          </div>
          <div style={{display: 'flex', gap: '8px'}}>
            <button 
              onClick={() => navigate('/seller/dashboard')}
              style={{
                background: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                border: '1px solid rgba(255,255,255,0.3)', 
                borderRadius: '4px', 
                padding: '3px 8px', 
                fontSize: '0.75rem', 
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-tachometer-alt"></i> Dashboard
            </button>
            <button 
              onClick={() => navigate('/seller/products')}
              style={{
                background: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                border: '1px solid rgba(255,255,255,0.3)', 
                borderRadius: '4px', 
                padding: '3px 8px', 
                fontSize: '0.75rem', 
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-box"></i> Products
            </button>
            <button 
              onClick={logout}
              style={{
                background: 'rgba(255,255,255,0.2)', 
                color: 'white', 
                border: '1px solid rgba(255,255,255,0.3)', 
                borderRadius: '4px', 
                padding: '3px 8px', 
                fontSize: '0.75rem', 
                cursor: 'pointer'
              }}
            >
              <i className="fas fa-sign-out-alt"></i> Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SellerStatusBar