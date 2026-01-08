import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import EnhancedImage from '../components/EnhancedImage'
import { getImageUrl } from '../utils/imageImports'
import '../styles/enhanced-images.css'
import '../styles/mobile-image-optimization.css'

// Import sample images
import noseRingImg from '../assets/main-pics/nose ring.jpg'
import spoonImg from '../assets/main-pics/Spoon.jpg'
import bulbImg from '../assets/main-pics/Light Bulb.jpg'
import watchImg from '../assets/main-pics/Black Watch.jpg'

const Product = () => {
  const { id } = useParams()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1) // Will be updated to match dealUnits

  // Update quantity to match dealUnits when product loads
  useEffect(() => {
    if (product && product.dealUnits) {
      setQuantity(product.dealUnits);
    }
  }, [product?.dealUnits]);
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      // Use proper API URL for both development and production
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? `https://generic-wholesale-backend.onrender.com/api/products/${id}`
        : `http://localhost:5000/api/products/${id}`;
        
      const response = await fetch(apiUrl)
      if (response.ok) {
        const productData = await response.json()
        console.log('🔍 Full Product Data Loaded:', productData);
        console.log('📊 Key Fields:', {
          dealUnits: productData.dealUnits,
          name: productData.name,
          images: productData.images,
          image: productData.image,
          asin: productData.asin,
          profitEvaluation: productData.profitEvaluation,
          hasAllFields: !!(productData.dealUnits && productData.profitEvaluation),
          // Debug image fields specifically
          hasImages: !!(productData.images && productData.images.length > 0),
          hasImage: !!productData.image,
          hasAsin: !!productData.asin
        });
        
        // Process images properly with enhanced fallback logic
        let processedImages = [];
        
        // Priority 1: Use existing images array
        if (productData.images && productData.images.length > 0) {
          processedImages = productData.images.map(img => getImageUrl(img));
          console.log('📸 Using product.images:', processedImages);
        } 
        // Priority 2: Use single image field
        else if (productData.image) {
          processedImages = [getImageUrl(productData.image)];
          console.log('📸 Using product.image:', processedImages);
        } 
        // Priority 3: Generate from ASIN if available
        else if (productData.asin) {
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://generic-wholesale-backend.onrender.com' 
            : 'http://localhost:5000';
          processedImages = [`${baseUrl}/api/admin-excel/public/images/by-asin/${productData.asin}`];
          console.log('📸 Using ASIN-based image:', processedImages);
        } 
        else {
          console.log('📸 No images found, will use mock images');
        }
        
        console.log('📸 Final processed images:', processedImages);
        
        // Ensure we have at least one image for the product detail page
        const finalImages = processedImages.length > 0 ? processedImages : 
          (productData.asin ? [`${process.env.NODE_ENV === 'production' ? 'https://generic-wholesale-backend.onrender.com' : 'http://localhost:5000'}/api/admin-excel/public/images/by-asin/${productData.asin}`] : getMockProduct().images);
        
        // Ensure we have all required fields, merge with defaults if needed
        const completeProduct = {
          ...getMockProduct(), // Start with mock data as base
          ...productData, // Override with real data
          images: finalImages, // Use the enhanced final images array
          // Ensure critical fields are present
          dealUnits: productData.dealUnits || Math.floor((productData.platformUnits || 200) / 12), // Calculate as platformUnits / 12
          profitEvaluation: productData.profitEvaluation || getMockProduct().profitEvaluation
        };
        
        console.log('✅ Final Product Data:', {
          dealUnits: completeProduct.dealUnits,
          images: completeProduct.images,
          imageCount: completeProduct.images?.length || 0,
          firstImage: completeProduct.images?.[0] || 'none',
          asin: completeProduct.asin,
          hasProfitEvaluation: !!completeProduct.profitEvaluation
        });
        
        setProduct(completeProduct)
      } else {
        // Fallback to mock data if product not found
        console.log('📦 Using Mock Product Data (Not Found)');
        setProduct(getMockProduct())
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      // Fallback to mock data
      console.log('📦 Using Mock Product Data (Error)');
      setProduct(getMockProduct())
    } finally {
      setLoading(false)
    }
  }

  const getMockProduct = () => ({
    id: parseInt(id),
    name: "Premium Surgical Steel Nose Ring Set - 20 Pieces",
    price: "Rs. 299",
    originalPrice: "Rs. 599",
    discount: "50% OFF",
    images: [noseRingImg, noseRingImg, noseRingImg, noseRingImg],
    rating: 4.5,
    reviews: 128,
    sold: "500+ sold this month",
    markup: "50% Profit Margin",
    description: "High-quality surgical steel nose rings perfect for wholesale and retail. This set includes 20 pieces in various designs including hoops, studs, and decorative pieces.",
    features: [
      "Surgical grade stainless steel",
      "Hypoallergenic and safe for sensitive skin",
      "20 pieces in various designs",
      "Perfect for wholesale business",
      "High profit margin potential",
      "Fast shipping across Pakistan"
    ],
    specifications: {
      "Material": "Surgical Steel 316L",
      "Gauge": "20G (0.8mm)",
      "Diameter": "6mm, 8mm, 10mm",
      "Color": "Silver, Gold, Rose Gold",
      "Package": "20 pieces per set",
      "Origin": "Imported"
    },
    supplier: {
      name: "Premium Jewelry Supplier",
      rating: 4.8,
      location: "Karachi, Pakistan",
      verified: true
    },
    dealUnits: 180, // Deal of 180 units (matches Amazon's Choice)
    platformUnits: 2400, // Units for yearly profit calculation
    profitEvaluation: {
      netProfit: 0.61,
      monthlyProfit: 122.00, // (2400 ÷ 12) × 0.61 = 200 × 0.61 = 122.00
      yearlyProfit: 1464.00, // 2400 × 0.61
      productCost: 178.20 // Total cost for the deal (matches £178.20 from image)
    }
  })

  const relatedProducts = [
    {
      id: 2,
      name: "Plastic Spoon Set",
      price: "Rs. 199",
      originalPrice: "Rs. 399",
      image: spoonImg,
      rating: 4.2,
      reviews: 89,
      markup: "45% Profit"
    },
    {
      id: 3,
      name: "LED Light Bulb",
      price: "Rs. 450",
      originalPrice: "Rs. 799",
      image: bulbImg,
      rating: 4.7,
      reviews: 234,
      markup: "40% Profit"
    },
    {
      id: 4,
      name: "Smart Watch",
      price: "Rs. 2,999",
      originalPrice: "Rs. 4,999",
      image: watchImg,
      rating: 4.3,
      reviews: 156,
      markup: "35% Profit"
    }
  ]

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={i} className="fas fa-star text-warning"></i>)
    }

    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt text-warning"></i>)
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star text-warning"></i>)
    }

    return stars
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading product details...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <h2>Product not found</h2>
          <p>The product you're looking for doesn't exist.</p>
          <Link to="/" className="btn btn-primary">Go Home</Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <section className="py-3 bg-light">
        <div className="container">
          <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
              <li className="breadcrumb-item">
                <Link to="/">Home</Link>
              </li>
              <li className="breadcrumb-item">
                <Link to="/categories">Categories</Link>
              </li>
              <li className="breadcrumb-item active">
                {product.name}
              </li>
            </ol>
          </nav>
        </div>
      </section>

      {/* Product Details */}
      <section className="section-padding">
        <div className="container">
          <div className="row">
            {/* Product Images */}
            <div className="col-lg-6 mb-4">
              <div className="product-images">
                <div className="main-image mb-3" style={{ position: 'relative' }}>
                  <EnhancedImage
                    src={product.images[selectedImage]}
                    asin={product.asin} // Pass ASIN for Excel products
                    alt={product.name}
                    eager={true}
                    style={{
                      width: '100%', 
                      height: '400px', 
                      objectFit: 'contain', 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    }}
                    onError={() => {
                      console.warn('Main image failed to load:', product.images[selectedImage], 'ASIN:', product.asin);
                    }}
                    onLoad={() => {
                      console.log('Main image loaded successfully:', product.images[selectedImage]);
                    }}
                  />
                  <div className="amazon-choice-badge position-absolute" style={{top: '15px', left: '15px'}}>
                    Amazon's Choice
                  </div>
                </div>
                
                <div className="thumbnail-images">
                  <div className="row">
                    {product.images.map((image, index) => (
                      <div key={index} className="col-3">
                        <div 
                          className={`cursor-pointer ${selectedImage === index ? 'border border-primary' : ''}`}
                          style={{
                            borderRadius: '8px',
                            overflow: 'hidden',
                            height: '80px',
                            backgroundColor: '#f8f9fa'
                          }}
                          onClick={() => setSelectedImage(index)}
                        >
                          <EnhancedImage
                            src={image}
                            asin={product.asin}
                            alt={`${product.name} ${index + 1}`}
                            eager={true}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div className="col-lg-6">
              <div className="product-info">
                <h1 className="h3 mb-3">{product.name}</h1>
                
                <div className="rating-section mb-3">
                  <div className="d-flex align-items-center">
                    <div className="rating me-2">
                      {renderStars(product.rating)}
                    </div>
                    <span className="text-muted">({product.reviews} reviews)</span>
                    <span className="text-success ms-3">{product.sold}</span>
                  </div>
                </div>

                <div className="price-section mb-4">
                  <div className="d-flex align-items-center">
                    <span className="h3 text-primary me-3">{product.price}</span>
                    <span className="text-muted text-decoration-line-through me-2">{product.originalPrice}</span>
                    <span className="badge bg-danger">{product.discount}</span>
                  </div>
                  <div className="markup-info mt-2">
                    <span className="badge bg-success">{product.markup}</span>
                  </div>
                </div>

                <div className="description mb-4">
                  <p>{product.description}</p>
                </div>

                <div className="features mb-4">
                  <h5>Key Features:</h5>
                  <ul className="list-unstyled">
                    {product.features.map((feature, index) => (
                      <li key={index} className="mb-1">
                        <i className="fas fa-check text-success me-2"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="quantity-section mb-4">
                  <label className="form-label">Quantity:</label>
                  <div className="d-flex align-items-center">
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setQuantity(Math.max(product?.dealUnits || 1, quantity - 1))}
                    >
                      -
                    </button>
                    <input 
                      type="number" 
                      className="form-control mx-2" 
                      style={{width: '80px'}}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(product?.dealUnits || 1, parseInt(e.target.value) || (product?.dealUnits || 1)))}
                    />
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="action-buttons mb-4">
                  <div className="d-grid gap-2 d-md-flex">
                    <button className="btn btn-primary btn-lg flex-fill">
                      <i className="fas fa-shopping-cart me-2"></i>
                      Add to Cart
                    </button>
                    <button className="btn btn-success btn-lg flex-fill">
                      <i className="fab fa-whatsapp me-2"></i>
                      Contact Supplier
                    </button>
                    <button className="btn btn-outline-primary">
                      <i className="fas fa-heart"></i>
                    </button>
                  </div>
                </div>

                <div className="supplier-info card">
                  <div className="card-body">
                    <h6 className="card-title">
                      Supplier Information
                      {product.supplier.verified && (
                        <i className="fas fa-check-circle text-success ms-2" title="Verified Supplier"></i>
                      )}
                    </h6>
                    <p className="mb-1"><strong>{product.supplier.name}</strong></p>
                    <p className="mb-1">
                      <i className="fas fa-star text-warning me-1"></i>
                      {product.supplier.rating} Rating
                    </p>
                    <p className="mb-0">
                      <i className="fas fa-map-marker-alt me-1"></i>
                      {product.supplier.location}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Specifications */}
      <section className="section-padding bg-light">
        <div className="container">
          <div className="row">
            <div className="col-12">
              <h3 className="mb-4">Product Specifications</h3>
              <div className="table-responsive">
                <table className="table table-striped">
                  <tbody>
                    {Object.entries(product.specifications).map(([key, value]) => (
                      <tr key={key}>
                        <td><strong>{key}</strong></td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Profit Analysis Section */}
      {product?.profitEvaluation && (
        <section className="section-padding">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-10">
                <div style={{
                  background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
                  borderRadius: '15px',
                  padding: '25px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <span style={{
                      fontSize: '24px',
                      marginRight: '10px'
                    }}>💰</span>
                    <h3 style={{
                      color: '#2c3e50',
                      margin: 0,
                      fontWeight: 'bold'
                    }}>Profit Analysis</h3>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '10px',
                        padding: '20px',
                        textAlign: 'center',
                        height: '100%'
                      }}>
                        <div style={{
                          color: '#7f8c8d',
                          fontSize: '14px',
                          marginBottom: '5px'
                        }}>Net Profit (£)</div>
                        <div style={{
                          color: '#2c3e50',
                          fontSize: '12px',
                          marginBottom: '10px'
                        }}>(Balance Change - Product Cost)</div>
                        <div style={{
                          background: 'rgba(200, 230, 201, 0.8)',
                          borderRadius: '8px',
                          padding: '15px',
                          border: '2px solid #4caf50'
                        }}>
                          <div style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#2e7d32'
                          }}>{(product.profitEvaluation.netProfit || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4 mb-3">
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '10px',
                        padding: '20px',
                        textAlign: 'center',
                        height: '100%'
                      }}>
                        <div style={{
                          color: '#7f8c8d',
                          fontSize: '14px',
                          marginBottom: '5px'
                        }}>Monthly Profit (£)</div>
                        <div style={{
                          color: '#2c3e50',
                          fontSize: '12px',
                          marginBottom: '10px'
                        }}>(Projected monthly earnings)</div>
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.8)',
                          borderRadius: '8px',
                          padding: '15px',
                          border: '1px solid #ddd'
                        }}>
                          <div style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#5d4e75'
                          }}>{(product.profitEvaluation.monthlyProfit || 0).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="col-md-4 mb-3">
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '10px',
                        padding: '20px',
                        textAlign: 'center',
                        height: '100%',
                        position: 'relative'
                      }}>
                        <div style={{
                          color: '#7f8c8d',
                          fontSize: '14px',
                          marginBottom: '5px'
                        }}>Yearly Profit (£)</div>
                        <div style={{
                          color: '#2c3e50',
                          fontSize: '12px',
                          marginBottom: '10px'
                        }}>(Projected annual earnings)</div>
                        
                        {/* Highlighted circle for yearly profit */}
                        <div style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '-10px',
                          left: '-10px',
                          bottom: '-10px',
                          border: '4px solid #000',
                          borderRadius: '15px',
                          zIndex: 1,
                          pointerEvents: 'none'
                        }}></div>
                        
                        <div style={{
                          background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                          borderRadius: '8px',
                          padding: '15px',
                          border: '2px solid #f39c12',
                          position: 'relative',
                          zIndex: 2
                        }}>
                          <div style={{
                            fontSize: '28px',
                            fontWeight: 'bold',
                            color: '#d68910'
                          }}>{(product.profitEvaluation.yearlyProfit || 0).toFixed(2)}</div>
                          <div style={{
                            fontSize: '10px',
                            color: '#b7950b',
                            marginTop: '5px',
                            fontWeight: 'bold'
                          }}>
                            RRP Units × Profit per Unit<br/>
                            {product.platformUnits || 2400} × £{((product.profitEvaluation.netProfit || 0) / (product.dealUnits || 1)).toFixed(2)} = £{((product.platformUnits || 2400) * ((product.profitEvaluation.netProfit || 0) / (product.dealUnits || 1))).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Profit Calculator Section */}
      {product?.profitEvaluation && (
        <section className="section-padding bg-light">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-lg-8">
                <div style={{
                  background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
                  borderRadius: '15px',
                  padding: '25px',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.1)',
                  border: '2px solid #4caf50'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '20px',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      fontSize: '24px',
                      marginRight: '10px'
                    }}>🧮</span>
                    <h3 style={{
                      color: '#2e7d32',
                      margin: 0,
                      fontWeight: 'bold'
                    }}>Profit Calculator</h3>
                  </div>

                  <div style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    background: 'rgba(255, 255, 255, 0.8)',
                    padding: '10px',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      fontSize: '16px',
                      color: '#2e7d32',
                      fontWeight: 'bold'
                    }}>
                      Deal of {product.dealUnits || 1} units
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      marginTop: '5px'
                    }}>
                      Per-unit calculations based on deal size from database
                    </div>
                    {/* Temporary debug info */}
                    <div style={{
                      fontSize: '10px',
                      color: '#ff0000',
                      marginTop: '5px',
                      fontWeight: 'bold',
                      background: '#ffeeee',
                      padding: '5px',
                      borderRadius: '3px'
                    }}>
                      DEBUG: dealUnits = {product.dealUnits || 'undefined'} | 
                      netProfit = {product.profitEvaluation?.netProfit || 'undefined'} | 
                      productCost = {product.profitEvaluation?.productCost || 'undefined'}
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '10px',
                        padding: '20px',
                        textAlign: 'center',
                        height: '100%',
                        border: '2px solid #4caf50'
                      }}>
                        <div style={{
                          color: '#2e7d32',
                          fontSize: '14px',
                          marginBottom: '5px',
                          fontWeight: 'bold'
                        }}>✅ Profit per Unit</div>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: '#2e7d32',
                          marginBottom: '8px'
                        }}>
                          £{((product.profitEvaluation.netProfit || 0) / (product.dealUnits || 1)).toFixed(2)}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#666',
                          background: 'rgba(76, 175, 80, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          Deal of {product.dealUnits || 1} units
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6 mb-3">
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '10px',
                        padding: '20px',
                        textAlign: 'center',
                        height: '100%',
                        border: '2px solid #ff9800'
                      }}>
                        <div style={{
                          color: '#f57c00',
                          fontSize: '14px',
                          marginBottom: '5px',
                          fontWeight: 'bold'
                        }}>💰 Cost per Unit</div>
                        <div style={{
                          fontSize: '24px',
                          fontWeight: 'bold',
                          color: '#f57c00',
                          marginBottom: '8px'
                        }}>
                          £{((product.profitEvaluation.productCost || 0) / (product.dealUnits || 1)).toFixed(2)}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          color: '#666',
                          background: 'rgba(255, 152, 0, 0.1)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          display: 'inline-block'
                        }}>
                          Deal of {product.dealUnits || 1} units
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: '8px',
                    padding: '15px',
                    marginTop: '15px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#2e7d32',
                      fontWeight: 'bold',
                      marginBottom: '5px'
                    }}>
                      📊 Deal Summary
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      Total Deal Value: £{((product.profitEvaluation.netProfit || 0) + (product.profitEvaluation.productCost || 0)).toFixed(2)} | 
                      Total Profit: £{(product.profitEvaluation.netProfit || 0).toFixed(2)} | 
                      Total Cost: £{(product.profitEvaluation.productCost || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Related Products */}
      <section className="section-padding">
        <div className="container">
          <h3 className="mb-4">Related Products</h3>
          <div className="row">
            {relatedProducts.map(product => (
              <div key={product.id} className="col-lg-4 col-md-6 mb-4">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Product