import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useSeller } from '../../context/SellerContext'

const EditProduct = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { seller, isLoggedIn } = useSeller()
  
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    price: '',
    seller: ''
  })

  useEffect(() => {
    if (!isLoggedIn || !seller) {
      navigate('/login/supplier')
      return
    }

    fetchProduct()
  }, [id, isLoggedIn, seller])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('sellerToken')
      
      // Use seller endpoint to get product with proper seller info visibility
      const response = await fetch(`http://localhost:5000/api/products/seller/detail/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const productData = await response.json()
        setProduct(productData)
        setFormData({
          price: productData.price || '',
          seller: seller._id // Set current seller as default
        })
      } else {
        alert('Product not found')
        navigate('/seller/admin-products')
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      alert('Error loading product')
      navigate('/seller/admin-products')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.price) {
      alert('Please enter a price')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('sellerToken')
      
      // Use the request system instead of direct update
      const response = await fetch('http://localhost:5000/api/sellers/request-admin-product-listing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adminProductId: product._id,
          productName: product.name,
          productPrice: product.price,
          sellerPrice: parseFloat(formData.price),
          notes: `Seller requested to list "${product.name}" at £${parseFloat(formData.price).toFixed(2)} via edit form`
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(`✅ Listing request submitted successfully!\n\nProduct: ${product.name}\nYour Price: £${parseFloat(formData.price).toFixed(2)}\nStatus: Pending Admin Approval\n\nYou will be notified once the admin reviews your request.`)
        navigate(location.state?.returnTo || '/seller/admin-products')
      } else {
        if (data.error === 'REQUEST_EXISTS') {
          alert('⚠️ Request Already Exists: You already have a pending or approved request for this product.')
        } else if (data.error === 'ALREADY_LISTED') {
          alert('⚠️ Already Listed: You have already listed this product.')
        } else {
          alert('❌ Error: ' + (data.message || 'Failed to submit listing request'))
        }
      }
    } catch (error) {
      console.error('Error submitting request:', error)
      alert('❌ Failed to submit listing request')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #e3e3e3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <h5 style={{ color: '#6c757d' }}>Loading Product...</h5>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h5 style={{ color: '#dc3545' }}>Product not found</h5>
          <button 
            onClick={() => navigate('/seller/admin-products')}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Back to Products
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: '20px'
    }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '15px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
          color: 'white',
          padding: '20px 30px',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '22px', fontWeight: '700' }}>
            <i className="fas fa-paper-plane" style={{ marginRight: '8px' }}></i>
            Request Product Listing
          </h2>
          <p style={{ margin: 0, opacity: 0.95, fontSize: '14px' }}>
            Submit a request to list this product with your price (requires admin approval)
          </p>
        </div>

        {/* Product Info */}
        <div style={{ padding: '20px 30px', borderBottom: '1px solid #dee2e6' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
            {product.images && product.images.length > 0 && (
              <img 
                src={product.images[0]}
                alt={product.name}
                style={{
                  width: '120px',
                  height: '120px',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}
              />
            )}
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2c3e50' }}>{product.name}</h3>
              <p style={{ margin: '0 0 5px 0', color: '#6c757d' }}>
                <strong>Category:</strong> {product.category}
              </p>
              <p style={{ margin: '0 0 5px 0', color: '#6c757d' }}>
                <strong>Brand:</strong> {product.brand || 'N/A'}
              </p>
              <p style={{ margin: '0 0 5px 0', color: '#6c757d' }}>
                <strong>Current Price:</strong> £{product.price}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              Product Price (£) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: '600',
              color: '#2c3e50'
            }}>
              Assigned Seller
            </label>
            <input
              type="text"
              value={seller.username}
              disabled
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e9ecef',
                borderRadius: '8px',
                fontSize: '16px',
                backgroundColor: '#f8f9fa',
                color: '#6c757d'
              }}
            />
            <small style={{ color: '#6c757d', fontSize: '12px' }}>
              A listing request will be submitted for admin approval
            </small>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            justifyContent: 'flex-end',
            marginTop: '30px'
          }}>
            <button
              type="button"
              onClick={() => navigate(location.state?.returnTo || '/seller/admin-products')}
              style={{
                padding: '12px 24px',
                border: '2px solid #6c757d',
                background: 'transparent',
                color: '#6c757d',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#6c757d'
                e.target.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
                e.target.style.color = '#6c757d'
              }}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '12px 24px',
                border: 'none',
                background: saving ? '#6c757d' : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                color: 'white',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {saving ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Saving...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane"></i>
                  Submit Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditProduct