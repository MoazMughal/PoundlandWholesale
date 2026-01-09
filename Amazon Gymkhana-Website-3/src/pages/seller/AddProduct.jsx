import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const AddProduct = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    originalPrice: '',
    category: '',
    subcategory: '',
    brand: '',
    images: [''],
    stock: '',
    weight: '',
    dimensions: ''
  })
  const [loading, setLoading] = useState(false)

  const categories = [
    'Electronics',
    'Clothing',
    'Home & Garden',
    'Sports',
    'Health',
    'Automotive',
    'Books',
    'Toys',
    'Food',
    'Other'
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleImageChange = (index, value) => {
    const newImages = [...formData.images]
    newImages[index] = value
    setFormData({
      ...formData,
      images: newImages
    })
  }

  const addImageField = () => {
    setFormData({
      ...formData,
      images: [...formData.images, '']
    })
  }

  const removeImageField = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      images: newImages.length > 0 ? newImages : ['']
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('sellerToken')
      
      // Filter out empty image URLs
      const images = formData.images.filter(img => img.trim() !== '')
      
      const productData = {
        ...formData,
        images,
        price: parseFloat(formData.price),
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : parseFloat(formData.price),
        stock: parseInt(formData.stock)
      }

      const response = await fetch('http://localhost:5000/api/products/seller/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productData)
      })

      const data = await response.json()

      if (response.ok) {
        alert('✅ Product submitted for approval!')
        navigate('/seller/products')
      } else {
        alert('❌ ' + data.message)
      }
    } catch (error) {
      console.error('Error adding product:', error)
      alert('❌ Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-md-8">
          <h2>Add New Product</h2>
          <p className="text-muted">Add a new product to your inventory (requires admin approval)</p>
        </div>
        <div className="col-md-4 text-end">
          <button className="btn btn-secondary" onClick={() => navigate('/seller/products')}>
            <i className="fas fa-arrow-left"></i> Back to Products
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header">
              <h5><i className="fas fa-plus"></i> Product Information</h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Basic Info */}
                <div className="row">
                  <div className="col-md-8 mb-3">
                    <label htmlFor="name" className="form-label">Product Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label htmlFor="brand" className="form-label">Brand</label>
                    <input
                      type="text"
                      className="form-control"
                      id="brand"
                      name="brand"
                      value={formData.brand}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label htmlFor="description" className="form-label">Description *</label>
                  <textarea
                    className="form-control"
                    id="description"
                    name="description"
                    rows="4"
                    value={formData.description}
                    onChange={handleChange}
                    required
                  ></textarea>
                </div>

                {/* Category */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="category" className="form-label">Category *</label>
                    <select
                      className="form-select"
                      id="category"
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="subcategory" className="form-label">Subcategory</label>
                    <input
                      type="text"
                      className="form-control"
                      id="subcategory"
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label htmlFor="price" className="form-label">Selling Price * ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label htmlFor="originalPrice" className="form-label">Original Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      id="originalPrice"
                      name="originalPrice"
                      value={formData.originalPrice}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label htmlFor="stock" className="form-label">Stock Quantity *</label>
                    <input
                      type="number"
                      className="form-control"
                      id="stock"
                      name="stock"
                      value={formData.stock}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                {/* Physical Properties */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="weight" className="form-label">Weight</label>
                    <input
                      type="text"
                      className="form-control"
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder="e.g., 1.5 kg"
                    />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label htmlFor="dimensions" className="form-label">Dimensions</label>
                    <input
                      type="text"
                      className="form-control"
                      id="dimensions"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleChange}
                      placeholder="e.g., 20x15x10 cm"
                    />
                  </div>
                </div>

                {/* Images */}
                <div className="mb-3">
                  <label className="form-label">Product Images</label>
                  {formData.images.map((image, index) => (
                    <div key={index} className="input-group mb-2">
                      <input
                        type="url"
                        className="form-control"
                        placeholder="Enter image URL"
                        value={image}
                        onChange={(e) => handleImageChange(index, e.target.value)}
                      />
                      {formData.images.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removeImageField(index)}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={addImageField}
                  >
                    <i className="fas fa-plus"></i> Add Another Image
                  </button>
                </div>

                {/* Submit */}
                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button 
                    type="button" 
                    className="btn btn-secondary me-md-2"
                    onClick={() => navigate('/seller/products')}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit for Approval'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Help Panel */}
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h6><i className="fas fa-info-circle"></i> Product Guidelines</h6>
            </div>
            <div className="card-body">
              <small className="text-muted">
                <ul className="list-unstyled">
                  <li className="mb-2">
                    <i className="fas fa-check text-success"></i> Use clear, descriptive product names
                  </li>
                  <li className="mb-2">
                    <i className="fas fa-check text-success"></i> Provide detailed descriptions
                  </li>
                  <li className="mb-2">
                    <i className="fas fa-check text-success"></i> Use high-quality image URLs
                  </li>
                  <li className="mb-2">
                    <i className="fas fa-check text-success"></i> Set competitive pricing
                  </li>
                  <li className="mb-2">
                    <i className="fas fa-check text-success"></i> Ensure accurate stock levels
                  </li>
                </ul>
                <hr />
                <p><strong>Approval Process:</strong></p>
                <p>Your product will be reviewed by our admin team within 24-48 hours. You'll be notified via email once approved.</p>
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddProduct