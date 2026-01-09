import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1) // Will be updated to match dealUnits
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Handle return navigation and URL parameters
  const urlParams = new URLSearchParams(window.location.search)
  const returnTo = urlParams.get('returnTo')
  const returnPage = urlParams.get('page')
  const returnSearch = urlParams.get('search')
  const returnCategory = urlParams.get('category')
  const returnStatus = urlParams.get('status')
  const returnPageSize = urlParams.get('pageSize')
  
  // Get product data from URL parameters (passed from Amazon's Choice)
  const urlProductName = urlParams.get('name')
  const urlProductImage = urlParams.get('img')
  const urlProductPrice = urlParams.get('price')
  const urlProductRating = urlParams.get('rating')
  const urlProductReviews = urlParams.get('reviews')
  const urlProductCategory = urlParams.get('category')
  const urlProductBrand = urlParams.get('brand')
  const urlProductDiscount = urlParams.get('discount')
  const urlBadgeText = urlParams.get('badgeText')
  const urlBadgeColor = urlParams.get('badgeColor')
  const urlBadgeIcon = urlParams.get('badgeIcon')
  const urlIsAmazonsChoice = urlParams.get('isAmazonsChoice') === 'true'

  // Update quantity to match dealUnits when product loads
  useEffect(() => {
    if (product && product.dealUnits) {
      setQuantity(product.dealUnits);
    }
  }, [product?.dealUnits]);

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
        
        // Process images properly with enhanced fallback logic
        let processedImages = [];
        
        // Priority 0: Use URL parameter image if available (from Amazon's Choice navigation)
        if (urlProductImage) {
          processedImages = [decodeURIComponent(urlProductImage)];
        }
        // Priority 1: Use existing images array
        else if (productData.images && productData.images.length > 0) {
          processedImages = productData.images.map(img => {
            // If it's already a full URL (from Excel conversion), use it directly
            if (img.startsWith('http')) {
              return img;
            }
            // Otherwise process through getImageUrl
            return getImageUrl(img);
          });
          console.log('📸 Using product.images:', processedImages);
        } 
        // Priority 2: Use single image field
        else if (productData.image) {
          // If it's already a full URL (from Excel conversion), use it directly
          if (productData.image.startsWith('http')) {
            processedImages = [productData.image];
          } else {
            processedImages = [getImageUrl(productData.image)];
          }
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
        
        // Merge URL parameters with database data (URL parameters take priority for display)
        const completeProduct = {
          ...getMockProduct(), // Start with mock data as base
          ...productData, // Override with real data
          // Override with URL parameters if available (from Amazon's Choice)
          ...(urlProductName && { name: decodeURIComponent(urlProductName) }),
          ...(urlProductPrice && { price: `£${urlProductPrice}` }),
          ...(urlProductRating && { rating: parseFloat(urlProductRating) }),
          ...(urlProductReviews && { reviews: parseInt(urlProductReviews) }),
          ...(urlProductCategory && { category: decodeURIComponent(urlProductCategory) }),
          ...(urlProductBrand && { brand: decodeURIComponent(urlProductBrand) }),
          ...(urlProductDiscount && { discount: parseInt(urlProductDiscount) }),
          ...(urlIsAmazonsChoice !== undefined && { isAmazonsChoice: urlIsAmazonsChoice }),
          images: finalImages, // Use the enhanced final images array
          // Ensure critical fields are present
          dealUnits: productData.dealUnits || Math.floor((productData.platformUnits || 200) / 12), // Calculate as platformUnits / 12
          profitEvaluation: productData.profitEvaluation || getMockProduct().profitEvaluation,
          // Add badge information from URL
          ...(urlBadgeText && { 
            badge: {
              text: decodeURIComponent(urlBadgeText),
              color: urlBadgeColor ? decodeURIComponent(urlBadgeColor) : '#ff6600',
              icon: urlBadgeIcon ? decodeURIComponent(urlBadgeIcon) : '🏆'
            }
          })
        };
        
        console.log('✅ Final Product Data:', {
          dealUnits: completeProduct.dealUnits,
          images: completeProduct.images,
          imageCount: completeProduct.images?.length || 0,
          firstImage: completeProduct.images?.[0] || 'none',
          asin: completeProduct.asin,
          hasProfitEvaluation: !!completeProduct.profitEvaluation,
          usedUrlParams: !!(urlProductName || urlProductImage)
        });
        
        setProduct(completeProduct)
      } else {
        // Fallback: Use URL parameters to create product data
        if (urlProductName && urlProductImage) {
          console.log('📦 Using URL Parameter Product Data (API Failed)');
          const urlBasedProduct = {
            ...getMockProduct(),
            id: parseInt(id),
            name: decodeURIComponent(urlProductName),
            images: [decodeURIComponent(urlProductImage)],
            price: urlProductPrice ? `£${urlProductPrice}` : getMockProduct().price,
            rating: urlProductRating ? parseFloat(urlProductRating) : getMockProduct().rating,
            reviews: urlProductReviews ? parseInt(urlProductReviews) : getMockProduct().reviews,
            category: urlProductCategory ? decodeURIComponent(urlProductCategory) : getMockProduct().category,
            brand: urlProductBrand ? decodeURIComponent(urlProductBrand) : getMockProduct().brand,
            discount: urlProductDiscount ? parseInt(urlProductDiscount) : getMockProduct().discount,
            isAmazonsChoice: urlIsAmazonsChoice,
            badge: urlBadgeText ? {
              text: decodeURIComponent(urlBadgeText),
              color: urlBadgeColor ? decodeURIComponent(urlBadgeColor) : '#ff6600',
              icon: urlBadgeIcon ? decodeURIComponent(urlBadgeIcon) : '🏆'
            } : null
          };
          setProduct(urlBasedProduct);
        } else {
          // Fallback to mock data if product not found and no URL params
          console.log('📦 Using Mock Product Data (Not Found)');
          setProduct(getMockProduct())
        }
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      
      // Fallback: Use URL parameters if available
      if (urlProductName && urlProductImage) {
        console.log('📦 Using URL Parameter Product Data (Error)');
        const urlBasedProduct = {
          ...getMockProduct(),
          id: parseInt(id),
          name: decodeURIComponent(urlProductName),
          images: [decodeURIComponent(urlProductImage)],
          price: urlProductPrice ? `£${urlProductPrice}` : getMockProduct().price,
          rating: urlProductRating ? parseFloat(urlProductRating) : getMockProduct().rating,
          reviews: urlProductReviews ? parseInt(urlProductReviews) : getMockProduct().reviews,
          category: urlProductCategory ? decodeURIComponent(urlProductCategory) : getMockProduct().category,
          brand: urlProductBrand ? decodeURIComponent(urlProductBrand) : getMockProduct().brand,
          discount: urlProductDiscount ? parseInt(urlProductDiscount) : getMockProduct().discount,
          isAmazonsChoice: urlIsAmazonsChoice,
          badge: urlBadgeText ? {
            text: decodeURIComponent(urlBadgeText),
            color: urlBadgeColor ? decodeURIComponent(urlBadgeColor) : '#ff6600',
            icon: urlBadgeIcon ? decodeURIComponent(urlBadgeIcon) : '🏆'
          } : null
        };
        setProduct(urlBasedProduct);
      } else {
        // Fallback to mock data
        console.log('📦 Using Mock Product Data (Error)');
        setProduct(getMockProduct())
      }
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
              {returnTo ? (
                <li className="breadcrumb-item">
                  <button
                    onClick={() => {
                      // Construct return URL with preserved state
                      const params = new URLSearchParams();
                      if (returnPage) params.set('page', returnPage);
                      if (returnSearch) params.set('search', returnSearch);
                      if (returnCategory && returnCategory !== 'all') params.set('category', returnCategory);
                      if (returnStatus && returnStatus !== 'all') params.set('status', returnStatus);
                      if (returnPageSize) params.set('pageSize', returnPageSize);
                      
                      const queryString = params.toString();
                      const fullReturnUrl = queryString ? `${returnTo}?${queryString}` : returnTo;
                      navigate(fullReturnUrl);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#007bff',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      font: 'inherit'
                    }}
                  >
                    ← Back to Excel Products
                  </button>
                </li>
              ) : (
                <li className="breadcrumb-item">
                  <Link to="/categories">Categories</Link>
                </li>
              )}
              <li className="breadcrumb-item active">
                {product?.name || 'Product'}
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
                      height: '450px', // Increased from 400px to 450px
                      objectFit: 'contain', 
                      backgroundColor: '#f8f9fa',
                      borderRadius: '8px',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                      transform: 'scale(1.05)', // Added zoom effect
                      padding: '10px' // Added padding to prevent clipping
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
                              objectFit: 'contain',
                              transform: 'scale(1.1)', // Added zoom for thumbnails
                              padding: '2px' // Added padding to prevent clipping
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
                <h1 className="h3 mb-3">
                  {product.name}
                  {urlProductName && (
                    <span style={{
                      fontSize: '0.6rem',
                      background: '#e3f2fd',
                      color: '#1976d2',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      marginLeft: '8px',
                      fontWeight: 'normal'
                    }}>
                      📋 From URL
                    </span>
                  )}
                  {product.isAmazonsChoice && (
                    <span style={{
                      fontSize: '0.7rem',
                      background: '#ff6600',
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      marginLeft: '8px',
                      fontWeight: 'bold'
                    }}>
                      🏆 Amazon's Choice
                    </span>
                  )}
                </h1>
                
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
                  
                  {/* Debug button for Excel products - only show in development */}
                  {process.env.NODE_ENV !== 'production' && product.asin && (
                    <div className="mt-2">
                      <button 
                        className="btn btn-warning btn-sm"
                        onClick={() => {
                          const imageUrl = `${process.env.NODE_ENV === 'production' ? 'https://generic-wholesale-backend.onrender.com' : 'http://localhost:5000'}/api/admin-excel/public/images/by-asin/${product.asin}`;
                          console.log('🧪 Testing image URL:', imageUrl);
                          window.open(imageUrl, '_blank');
                        }}
                      >
                        🧪 Test Image URL (ASIN: {product.asin})
                      </button>
                      <div style={{ 
                        background: '#f8f9fa', 
                        padding: '10px', 
                        borderRadius: '5px', 
                        marginTop: '10px',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                      }}>
                        <strong>🔧 Debug Info:</strong><br/>
                        <strong>Product Data:</strong><br/>
                        • ASIN: {product.asin || 'N/A'}<br/>
                        • Images Array: {JSON.stringify(product.images)}<br/>
                        • Image Field: {product.image || 'N/A'}<br/>
                        • Selected Image: {product.images?.[selectedImage] || 'N/A'}<br/>
                        • Environment: {process.env.NODE_ENV || 'development'}<br/>
                        <br/>
                        <strong>URL Parameters:</strong><br/>
                        • Name: {urlProductName ? decodeURIComponent(urlProductName) : 'N/A'}<br/>
                        • Image: {urlProductImage ? decodeURIComponent(urlProductImage) : 'N/A'}<br/>
                        • Price: {urlProductPrice || 'N/A'}<br/>
                        • Category: {urlProductCategory ? decodeURIComponent(urlProductCategory) : 'N/A'}<br/>
                        • Is Amazon's Choice: {urlIsAmazonsChoice ? 'Yes' : 'No'}<br/>
                        <br/>
                        <strong>Image Loading Test:</strong><br/>
                        <button 
                          onClick={() => {
                            if (product.images?.[selectedImage]) {
                              window.open(product.images[selectedImage], '_blank');
                            }
                          }}
                          style={{
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            cursor: 'pointer',
                            marginRight: '5px'
                          }}
                        >
                          🔗 Open Image URL
                        </button>
                        <button 
                          onClick={() => {
                            console.log('🔍 Product Debug Info:', {
                              product,
                              urlParams: {
                                name: urlProductName,
                                image: urlProductImage,
                                price: urlProductPrice,
                                category: urlProductCategory
                              },
                              currentImage: product.images?.[selectedImage]
                            });
                          }}
                          style={{
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            padding: '4px 8px',
                            borderRadius: '3px',
                            fontSize: '10px',
                            cursor: 'pointer'
                          }}
                        >
                          📋 Log to Console
                        </button>
                      </div>
                    </div>
                  )}
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