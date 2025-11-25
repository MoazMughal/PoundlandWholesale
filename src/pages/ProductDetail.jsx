import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { completeProductsData, getProductById } from '../data/completeProducts'
import { products } from '../data/allProducts'
import { getImageUrl } from '../utils/imageImports'
import ScrollToTop from '../components/ScrollToTop'
import PaymentModal from '../components/PaymentModal'
import apiConfig from '../config/api.config'
import { useCurrency } from '../context/CurrencyContext'

const ProductDetail = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  // Use currency from context instead of local state
  const { currency, currencyRates, currencySymbols } = useCurrency()
  const [relatedProducts, setRelatedProducts] = useState([])
  const [selectedVariations, setSelectedVariations] = useState({
    color: null,
    size: null,
    packing: null
  })
  const [productVariations, setProductVariations] = useState([])
  const [isBuyerLoggedIn, setIsBuyerLoggedIn] = useState(false)
  const [isSupplierUnlocked, setIsSupplierUnlocked] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [supplierId, setSupplierId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sellerInfo, setSellerInfo] = useState(null)

  // Function to get proper image path
  const getImageSrc = (imagePath) => {
    return getImageUrl(imagePath)
  }

  // Currency rates and symbols are now from context

  const convertPrice = (priceStr) => {
    // Extract the price number and detect original currency
    const price = parseFloat(String(priceStr).replace(/[₨£$€Rs]/g, '').trim())
    
    if (isNaN(price)) return priceStr
    
    // Detect if price is in GBP (has £ symbol)
    const isGBP = String(priceStr).includes('£')
    
    // Detect if price is in PKR (has ₨ or Rs symbol or is a plain number from database)
    const isPKR = String(priceStr).includes('?') || String(priceStr).includes('Rs') || (!isGBP && !String(priceStr).includes('$'))
    
    // Convert to target currency
    let converted
    if (isGBP) {
      // Convert from GBP to PKR first, then to target currency
      const pkrValue = price / 0.00272
      converted = pkrValue * currencyRates[currency]
    } else if (isPKR) {
      // Convert from PKR to target currency
      converted = price * currencyRates[currency]
    } else {
      // Already in target currency or unknown
      converted = price
    }
    
    return `${currencySymbols[currency]}${converted.toFixed(2)}`
  }

  // Check if user is admin
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const isAdminUser = !!adminToken;
    console.log('Admin check:', { adminToken: !!adminToken, isAdminUser });
    setIsAdmin(isAdminUser);
  }, []);

  // Fetch seller information
  const fetchSellerInfo = async (sellerId) => {
    console.log('fetchSellerInfo called with sellerId:', sellerId);
    if (!sellerId) {
      console.log('No sellerId provided');
      return;
    }
    
    try {
      const adminToken = localStorage.getItem('adminToken');
      console.log('Admin token exists:', !!adminToken);
      
      if (!adminToken) {
        console.log('No admin token, skipping seller fetch');
        return;
      }
      
      const response = await fetch(apiConfig.getApiUrl(`sellers/${sellerId}`), {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log('Seller fetch response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Seller info fetched:', data);
        setSellerInfo(data);
      } else {
        const errorText = await response.text();
        console.log('Failed to fetch seller info:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching seller info:', error);
    }
  };

  useEffect(() => {
    const fetchProduct = async () => {
      console.log('fetchProduct called')
      setLoading(true)
      
      // Try to fetch from database first using the product ID
      try {
        const response = await fetch(apiConfig.getApiUrl(`products/public/${id}`))
        if (response.ok) {
          const dbProduct = await response.json()
          console.log('Product fetched from database:', dbProduct)
          
          // Use database product data
          const productData = {
            id: dbProduct._id,
            name: dbProduct.name,
            price: `₨${dbProduct.price}`, // Store as PKR
            rrp: dbProduct.originalPrice ? `₨${dbProduct.originalPrice}` : `₨${(dbProduct.price * 1.5).toFixed(2)}`,
            rating: dbProduct.rating || 4.5,
            reviews: dbProduct.reviews || 100,
            image: dbProduct.images && dbProduct.images.length > 0 ? getImageUrl(dbProduct.images[0]) : '',
            images: dbProduct.images ? dbProduct.images.map(img => getImageUrl(img)) : [],
            category: dbProduct.category || 'General',
            brand: dbProduct.brand || '',
            markup: dbProduct.discount ? `${dbProduct.discount}%` : '250%',
            showEvaluation: dbProduct.name.toLowerCase().includes('nose ring') ||
                           dbProduct.name.toLowerCase().includes('bulb') ||
                           dbProduct.name.toLowerCase().includes('fuse') ||
                           dbProduct.name.toLowerCase().includes('lampshade') ||
                           dbProduct.name.toLowerCase().includes('lamp'),
            description: dbProduct.description || `High-quality ${dbProduct.name} available at wholesale prices.`,
            features: [
              'Amazon\'s Choice Product',
              'Fast Shipping Available',
              'Quality Guaranteed',
              'Verified Supplier',
              'Bulk Orders Welcome'
            ],
            dealInfo: {
              location: 'Pakistan',
              flag: '????',
              minOrder: '100 Unit',
              condition: 'New'
            },
            specifications: {
              'Material': 'Premium Quality',
              'Condition': 'New',
              'Origin': 'Pakistan'
            },
            platforms: [
              { name: 'RRP', price: '?420.99', grossProfit: '?328.39', markup: '354.63%' },
              { name: 'Amazon', price: '?419.00', grossProfit: '?326.40', markup: '352.48%' },
              { name: 'eBay', price: '?199.00', grossProfit: '?106.40', markup: '114.90%' }
            ],
            testimonials: [
              {
                name: 'Ahmed K.',
                location: 'Karachi, Pakistan',
                rating: 5,
                comment: 'Excellent quality product! Received exactly as described. Great for reselling on Amazon.',
                date: '2 weeks ago'
              },
              {
                name: 'Sarah M.',
                location: 'London, UK',
                rating: 5,
                comment: 'Fast shipping and good profit margins. Will order again!',
                date: '1 month ago'
              }
            ]
          }
          
          // Add profit calculations if applicable
          console.log('=== PROFIT CALCULATION DEBUG (DATABASE) ===')
          console.log('Product name:', productData.name)
          console.log('showEvaluation:', productData.showEvaluation)
          
          // Only show profit calculations for bulbs
          const isBulb = productData.name.toLowerCase().includes('bulb')
          if (productData.showEvaluation && isBulb) {
            const costPricePKR = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
            const costPriceGBP = costPricePKR * 0.00272 // Convert PKR to GBP
            console.log('Adding profit calculations, costPrice PKR:', costPricePKR, 'GBP:', costPriceGBP)
            
            // Calculate profit for bulbs only
            const sellingPrice = 3.79
            const commissionBase = -0.57
            const commissionTax = -0.12
            const digitalServiceBase = -0.04
            const digitalServiceTax = -0.02
            const fbaFeeBase = -1.46
            const fbaFeeTax = -0.30
            const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
            const changeToBalance = sellingPrice + totalFees
            const netProfit = changeToBalance - costPriceGBP
            
            productData.hasProfit = true
            productData.profitCalculations = {
              costPrice: costPriceGBP,
              sellingPrice: sellingPrice,
              profitPerUnit: netProfit,
              monthlyProfit: netProfit * 100,
              yearlyProfit: netProfit * 1200,
              monthlyProfitPKR: netProfit * 100 * 350,
              yearlyProfitPKR: netProfit * 1200 * 350
            }
            
            productData.evaluation = {
              salesProceeds: sellingPrice,
              commissionBase: commissionBase,
              commissionTax: commissionTax,
              digitalServiceBase: digitalServiceBase,
              digitalServiceTax: digitalServiceTax,
              fbaFeeBase: fbaFeeBase,
              fbaFeeTax: fbaFeeTax,
              totalFees: totalFees,
              productCost: costPriceGBP,
              netProfit: netProfit,
              changeToBalance: changeToBalance
            }
            console.log('Profit calculations added:', productData.hasProfit, productData.evaluation)
          }
          
          setProduct(productData)
          setLoading(false)
          return
        }
      } catch (error) {
        console.log('Failed to fetch from database, falling back to URL params:', error)
      }
      
      // Fallback: try to get from URL parameters (for backward compatibility)
      const nameParam = searchParams.get('name')
      const imgParam = searchParams.get('img')
      const priceParam = searchParams.get('price')
      const ratingParam = searchParams.get('rating')
      const reviewsParam = searchParams.get('reviews')
      const categoryParam = searchParams.get('category')
      const brandParam = searchParams.get('brand')
      const discountParam = searchParams.get('discount')
      
      console.log('URL params:', { nameParam, imgParam, priceParam })
      
      if (nameParam && imgParam) {
        try {
          console.log('Creating product from URL params')
          // Product opened from Amazon's Choice or other pages (URL parameters)
          const price = parseFloat(priceParam) || 29.99
          const originalPrice = price * 1.5 // Calculate original price
          
          // Process image URL (convert path to actual URL if needed)
          let processedImage = imgParam
          try {
            processedImage = imgParam.startsWith('http') ? imgParam : getImageUrl(imgParam)
          } catch (imgError) {
            console.error('Image processing error:', imgError)
            processedImage = imgParam // Use original if processing fails
          }
          console.log('Processed image:', processedImage)
        
        const productData = {
          id: id,
          name: nameParam,
          price: `₨${price}`,
          rrp: `₨${originalPrice.toFixed(2)}`,
          rating: parseFloat(ratingParam) || 4.5,
          reviews: parseInt(reviewsParam) || Math.floor(Math.random() * 2000) + 100,
          image: processedImage,
          images: [processedImage, processedImage, processedImage, processedImage],
          category: categoryParam || 'General',
          brand: brandParam || '',
          markup: discountParam ? `${discountParam}%` : '250%',
          showEvaluation: nameParam.toLowerCase().includes('nose ring') ||
                         nameParam.toLowerCase().includes('bulb') ||
                         nameParam.toLowerCase().includes('fuse') ||
                         nameParam.toLowerCase().includes('lampshade') ||
                         nameParam.toLowerCase().includes('lamp'),
          hasProfit: false, // Will be set below if showEvaluation is true
          platforms: [
            { name: 'RRP', price: '?420.99', grossProfit: '?328.39', markup: '354.63%' },
            { name: 'Amazon', price: '?419.00', grossProfit: '?326.40', markup: '352.48%' },
            { name: 'eBay', price: '?199.00', grossProfit: '?106.40', markup: '114.90%' }
          ],
          dealInfo: {
            location: 'Pakistan',
            flag: '????',
            minOrder: '100 Unit',
            condition: 'New'
          },
          specifications: {
            'Material': 'Premium Quality',
            'Condition': 'New',
            'Origin': 'Pakistan'
          },
          description: `High-quality ${nameParam} available at wholesale prices. Perfect for Amazon FBA sellers and retailers. This product has excellent reviews and consistent sales performance. Sourced from verified Pakistani suppliers with quality assurance.`,
          features: [
            'Amazon\'s Choice Product',
            'Fast Shipping Available',
            'Quality Guaranteed',
            'Verified Supplier',
            'Bulk Orders Welcome'
          ],
          testimonials: [
            {
              name: 'Ahmed K.',
              location: 'Karachi, Pakistan',
              rating: 5,
              comment: 'Excellent quality product! Received exactly as described. Great for reselling on Amazon.',
              date: '2 weeks ago'
            },
            {
              name: 'Sarah M.',
              location: 'London, UK',
              rating: 5,
              comment: 'Fast shipping and good profit margins. Will order again!',
              date: '1 month ago'
            }
          ]
        }
        
        // Add profit calculations if applicable
        console.log('=== PROFIT CALCULATION DEBUG (URL PARAMS) ===')
        console.log('Product name:', productData.name)
        console.log('Product name lowercase:', productData.name.toLowerCase())
        console.log('showEvaluation:', productData.showEvaluation)
        console.log('Has "bulb"?:', productData.name.toLowerCase().includes('bulb'))
        console.log('Has "lamp"?:', productData.name.toLowerCase().includes('lamp'))
        console.log('Has "fuse"?:', productData.name.toLowerCase().includes('fuse'))
        console.log('Has "nose ring"?:', productData.name.toLowerCase().includes('nose ring'))
        
        // Only show profit calculations for bulbs
        const isBulb = productData.name.toLowerCase().includes('bulb')
        if (productData.showEvaluation && isBulb) {
          const costPrice = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
          console.log('Adding profit calculations, costPrice:', costPrice)
          
          // Calculate profit for bulbs only
          const sellingPrice = 3.79
          const commissionBase = -0.57
          const commissionTax = -0.12
          const digitalServiceBase = -0.04
          const digitalServiceTax = -0.02
          const fbaFeeBase = -1.46
          const fbaFeeTax = -0.30
          const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
          const changeToBalance = sellingPrice + totalFees
          const netProfit = changeToBalance - costPrice
          
          productData.hasProfit = true
          productData.profitCalculations = {
            costPrice: costPrice,
            sellingPrice: sellingPrice,
            profitPerUnit: netProfit,
            monthlyProfit: netProfit * 100,
            yearlyProfit: netProfit * 1200,
            monthlyProfitPKR: netProfit * 100 * 350,
            yearlyProfitPKR: netProfit * 1200 * 350
          }
          
          productData.evaluation = {
            salesProceeds: sellingPrice,
            commissionBase: commissionBase,
            commissionTax: commissionTax,
            digitalServiceBase: digitalServiceBase,
            digitalServiceTax: digitalServiceTax,
            fbaFeeBase: fbaFeeBase,
            fbaFeeTax: fbaFeeTax,
            totalFees: totalFees,
            productCost: costPrice,
            netProfit: netProfit,
            changeToBalance: changeToBalance
          }
          console.log('Profit calculations added:', productData.hasProfit, productData.profitCalculations)
        }
        
          console.log('Setting product data:', productData)
          setProduct(productData)
          setLoading(false)
          console.log('Product set, loading false')
          return
        } catch (error) {
          console.error('Error creating product from URL params:', error)
          setLoading(false)
        }
      }
      
      console.log('No URL params, trying database...')
      console.log('Environment check:', {
        isDev: import.meta.env.DEV,
        isProd: import.meta.env.PROD,
        mode: import.meta.env.MODE,
        apiUrl: apiConfig.API_BASE_URL
      });
      
      // Check network connectivity first
      if (!navigator.onLine) {
        console.error('No internet connection');
        setLoading(false);
        return;
      }
      
      // Try to fetch from database API
      try {
        console.log('Fetching product with ID:', id);
        console.log('API URL:', apiConfig.getApiUrl('products/public?limit=5000'));
        const response = await fetch(apiConfig.getApiUrl('products/public?limit=5000'), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        console.log('Response type:', response.type);
        if (response.ok) {
          const data = await response.json()
          console.log('Total products fetched:', data.products ? data.products.length : 0);
          console.log('Looking for product ID:', id);
          
          if (!data.products || !Array.isArray(data.products)) {
            console.error('Invalid API response format:', data);
            throw new Error('Invalid API response format');
          }
          
          const foundProduct = data.products.find(p => p._id === id)
          console.log('Found product:', foundProduct ? 'YES' : 'NO');
          
          if (foundProduct) {
            // Transform database product to display format
            const shouldShowEvaluation = 
              foundProduct.name.toLowerCase().includes('nose ring') ||
              foundProduct.name.toLowerCase().includes('bulb') ||
              foundProduct.name.toLowerCase().includes('fuse') ||
              foundProduct.name.toLowerCase().includes('lampshade') ||
              foundProduct.name.toLowerCase().includes('lamp')
            
            const productImage = foundProduct.images && foundProduct.images.length > 0 
              ? getImageUrl(foundProduct.images[0]) 
              : ''
            
            const productData = {
              id: foundProduct._id,
              name: foundProduct.name,
              price: `₨${foundProduct.price}`,
              rrp: foundProduct.originalPrice ? `₨${foundProduct.originalPrice}` : '?420.99',
              rating: foundProduct.rating || 4.5,
              reviews: foundProduct.reviews || 100,
              image: productImage,
              images: foundProduct.images ? foundProduct.images.map(img => getImageUrl(img)) : [productImage, productImage, productImage, productImage],
              category: foundProduct.category,
              brand: foundProduct.brand || '',
              markup: foundProduct.discount ? `${foundProduct.discount}%` : '250%',
              showEvaluation: shouldShowEvaluation,
              seller: foundProduct.seller, // Add seller field
              platforms: [
                { name: 'RRP', price: '?420.99', grossProfit: '?328.39', markup: '354.63%' },
                { name: 'Amazon', price: '?419.00', grossProfit: '?326.40', markup: '352.48%' },
                { name: 'eBay', price: '?199.00', grossProfit: '?106.40', markup: '114.90%' }
              ],
              dealInfo: {
                location: 'Pakistan',
                flag: '????',
                minOrder: '100 Unit',
                condition: 'New'
              },
              specifications: {
                'Material': 'Premium Quality',
                'Condition': 'New',
                'Origin': 'Pakistan'
              },
              description: foundProduct.description || `High-quality ${foundProduct.name} available at wholesale prices. Perfect for Amazon FBA sellers and retailers. This product has excellent reviews and consistent sales performance. Sourced from verified Pakistani suppliers with quality assurance.`,
              features: [
                'Amazon\'s Choice Product',
                'Fast Shipping Available',
                'Quality Guaranteed',
                'Verified Supplier',
                'Bulk Orders Welcome'
              ],
              testimonials: [
                {
                  name: 'Ahmed K.',
                  location: 'Karachi, Pakistan',
                  rating: 5,
                  comment: 'Excellent quality product! Received exactly as described. Great for reselling on Amazon.',
                  date: '2 weeks ago'
                },
                {
                  name: 'Sarah M.',
                  location: 'London, UK',
                  rating: 5,
                  comment: 'Fast shipping and good profit margins. Will order again!',
                  date: '1 month ago'
                }
              ]
            }
            
            // Add profit calculations if applicable
            console.log('=== PROFIT CALCULATION DEBUG (API 1) ===')
            console.log('Product name:', foundProduct.name)
            console.log('shouldShowEvaluation:', shouldShowEvaluation)
            
            // Only show profit calculations for bulbs
            const isBulb = foundProduct.name.toLowerCase().includes('bulb')
            if (shouldShowEvaluation && isBulb) {
              const costPrice = foundProduct.price
              
              // Calculate profit for bulbs only
              const sellingPrice = 3.79
              const commissionBase = -0.57
              const commissionTax = -0.12
              const digitalServiceBase = -0.04
              const digitalServiceTax = -0.02
              const fbaFeeBase = -1.46
              const fbaFeeTax = -0.30
              const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
              const changeToBalance = sellingPrice + totalFees
              const netProfit = changeToBalance - costPrice
              
              productData.hasProfit = true
              productData.profitCalculations = {
                costPrice: costPrice,
                sellingPrice: sellingPrice,
                profitPerUnit: netProfit,
                monthlyProfit: netProfit * 100,
                yearlyProfit: netProfit * 1200,
                monthlyProfitPKR: netProfit * 100 * 350,
                yearlyProfitPKR: netProfit * 1200 * 350
              }
              
              productData.evaluation = {
                salesProceeds: sellingPrice,
                commissionBase: commissionBase,
                commissionTax: commissionTax,
                digitalServiceBase: digitalServiceBase,
                digitalServiceTax: digitalServiceTax,
                fbaFeeBase: fbaFeeBase,
                fbaFeeTax: fbaFeeTax,
                totalFees: totalFees,
                productCost: costPrice,
                netProfit: netProfit,
                changeToBalance: changeToBalance
              }
            }
            
            setProduct(productData)
            
            // Fetch seller info if product has seller and user is admin
            console.log('Product seller field:', foundProduct.seller);
            const adminToken = localStorage.getItem('adminToken');
            if (foundProduct.seller && adminToken) {
              console.log('Admin user - Fetching seller info for:', foundProduct.seller);
              await fetchSellerInfo(foundProduct.seller);
            } else if (!foundProduct.seller) {
              console.log('No seller field in product');
            } else if (!adminToken) {
              console.log('Not admin user, skipping seller fetch');
            }
            
            // Get related products
            const related = data.products
              .filter(p => p.category === foundProduct.category && p._id !== foundProduct._id)
              .slice(0, 4)
              .map(p => ({
                ...p,
                id: p._id,
                price: `₨${p.price}`,
                image: p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : ''
              }))
            setRelatedProducts(related)
            setLoading(false)
            return
          }
        }
      } catch (error) {
        console.error('Error fetching product:', error)
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          apiUrl: apiConfig.getApiUrl('products/public?limit=5000')
        })
      }
      
      // If still not found, try fetching specific product by ID
      if (!product) {
        try {
          console.log('Product not found in list, trying direct fetch...');
          const response = await fetch(apiConfig.getApiUrl(`products/public/${id}`), {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          console.log('Direct fetch response status:', response.status);
          if (response.ok) {
            const foundProduct = await response.json()
            console.log('Direct fetch result:', foundProduct);
            
            if (foundProduct) {
              const shouldShowEvaluation = 
                foundProduct.name.toLowerCase().includes('nose ring') ||
                foundProduct.name.toLowerCase().includes('bulb') ||
                foundProduct.name.toLowerCase().includes('fuse') ||
                foundProduct.name.toLowerCase().includes('lampshade') ||
                foundProduct.name.toLowerCase().includes('lamp')
              
              const productImage = foundProduct.images && foundProduct.images.length > 0 
                ? getImageUrl(foundProduct.images[0]) 
                : ''
              
              const productData = {
                id: foundProduct._id,
                name: foundProduct.name,
                price: `₨${foundProduct.price}`,
                rrp: foundProduct.originalPrice ? `₨${foundProduct.originalPrice}` : '?420.99',
                rating: foundProduct.rating || 4.5,
                reviews: foundProduct.reviews || 100,
                image: productImage,
                images: foundProduct.images ? foundProduct.images.map(img => getImageUrl(img)) : [productImage],
                category: foundProduct.category,
                brand: foundProduct.brand || '',
                markup: foundProduct.discount ? `${foundProduct.discount}%` : '250%',
                showEvaluation: shouldShowEvaluation,
                seller: foundProduct.seller,
                platforms: [
                  { name: 'RRP', price: '?420.99', grossProfit: '?328.39', markup: '354.63%' },
                  { name: 'Amazon', price: '?419.00', grossProfit: '?326.40', markup: '352.48%' },
                  { name: 'eBay', price: '?199.00', grossProfit: '?106.40', markup: '114.90%' }
                ],
                dealInfo: {
                  location: 'Pakistan',
                  flag: '????',
                  minOrder: '100 Unit',
                  condition: 'New'
                },
                specifications: {
                  'Material': 'Premium Quality',
                  'Condition': 'New',
                  'Origin': 'Pakistan'
                },
                description: foundProduct.description || `High-quality ${foundProduct.name} available at wholesale prices.`,
                features: [
                  'Amazon\'s Choice Product',
                  'Fast Shipping Available',
                  'Quality Guaranteed',
                  'Verified Supplier',
                  'Bulk Orders Welcome'
                ],
                testimonials: [
                  {
                    name: 'Ahmed K.',
                    location: 'Karachi, Pakistan',
                    rating: 5,
                    comment: 'Excellent quality product!',
                    date: '2 weeks ago'
                  }
                ]
              }
              
              // Add profit calculations if applicable - only for bulbs
              const isBulb = foundProduct.name.toLowerCase().includes('bulb')
              if (shouldShowEvaluation && isBulb) {
                const costPrice = foundProduct.price
                
                // Calculate profit for bulbs only
                const sellingPrice = 3.79
                const commissionBase = -0.57
                const commissionTax = -0.12
                const digitalServiceBase = -0.04
                const digitalServiceTax = -0.02
                const fbaFeeBase = -1.46
                const fbaFeeTax = -0.30
                const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
                const changeToBalance = sellingPrice + totalFees
                const netProfit = changeToBalance - costPrice
                
                productData.hasProfit = true
                productData.profitCalculations = {
                  costPrice: costPrice,
                  sellingPrice: sellingPrice,
                  profitPerUnit: netProfit,
                  monthlyProfit: netProfit * 100,
                  yearlyProfit: netProfit * 1200,
                  monthlyProfitPKR: netProfit * 100 * 350,
                  yearlyProfitPKR: netProfit * 1200 * 350
                }
                
                productData.evaluation = {
                  salesProceeds: sellingPrice,
                  commissionBase: commissionBase,
                  commissionTax: commissionTax,
                  digitalServiceBase: digitalServiceBase,
                  digitalServiceTax: digitalServiceTax,
                  fbaFeeBase: fbaFeeBase,
                  fbaFeeTax: fbaFeeTax,
                  totalFees: totalFees,
                  productCost: costPrice,
                  netProfit: netProfit,
                  changeToBalance: changeToBalance
                }
              }
              
              setProduct(productData)
              
              if (foundProduct.seller) {
                const adminToken = localStorage.getItem('adminToken');
                if (adminToken) {
                  await fetchSellerInfo(foundProduct.seller);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching product by ID:', error)
        }
      }
      
      setLoading(false)
    }
    
    fetchProduct()
  }, [id, searchParams])

  // Check if buyer is logged in and if supplier is unlocked
  useEffect(() => {
    const checkLoginAndUnlock = async () => {
      const token = localStorage.getItem('buyerToken')
      setIsBuyerLoggedIn(!!token)

      if (token && product?.supplierId) {
        try {
          const response = await fetch(apiConfig.getApiUrl(`buyer/check-unlock/${product.supplierId}`), {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (response.ok) {
            const data = await response.json()
            setIsSupplierUnlocked(data.isUnlocked)
          }
        } catch (error) {
          console.error('Error checking unlock status:', error)
        }
      }
    }

    if (product) {
      // Generate unique supplier ID based on product ID
      // In production, this would come from product.supplierId from database
      const uniqueSupplierId = product.supplierId || `SUPPLIER-${product.id}`
      setSupplierId(uniqueSupplierId)
      checkLoginAndUnlock()
    }
  }, [product])

  const handleContactSupplier = () => {
    if (!isBuyerLoggedIn) {
      navigate('/login/buyer')
      return
    }

    if (isSupplierUnlocked) {
      // Show supplier contact details
      alert('?? Supplier Contact:\nPhone: +92 301 6611011\nWhatsApp: +92 301 6611011\nEmail: supplier@amazongymkhana.com')
    } else {
      // Show payment modal
      setShowPaymentModal(true)
    }
  }

  const handlePaymentSuccess = () => {
    setIsSupplierUnlocked(true)
    setShowPaymentModal(false)
    alert('? Supplier unlocked! You can now contact them.')
  }
  
  // Get top deals (products with highest markup)
  const topDeals = products
    .filter(p => p.id !== product?.id)
    .sort((a, b) => {
      const markupA = parseFloat(a.markup?.replace(/[^0-9.]/g, '') || 0)
      const markupB = parseFloat(b.markup?.replace(/[^0-9.]/g, '') || 0)
      return markupB - markupA
    })
    .slice(0, 6)
  
  // Get most popular (products with most reviews)
  const mostPopular = products
    .filter(p => p.id !== product?.id)
    .sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
    .slice(0, 6)

  // Helper function to safely format numbers and filter NaN
  const safeNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) || !isFinite(num) ? 0 : num;
  };

  // Helper function to convert GBP values to selected currency
  const convertFromGBP = (gbpValue) => {
    const value = safeNumber(gbpValue);
    // Convert GBP to PKR first, then to target currency
    const pkrValue = value / 0.00272; // GBP to PKR
    const converted = pkrValue * currencyRates[currency];
    return `${currencySymbols[currency]}${converted.toFixed(2)}`;
  };

  const renderStars = (rating) => {
    // Validate and cap rating between 0 and 5
    const validRating = Math.min(Math.max(parseFloat(rating) || 0, 0), 5);
    
    const stars = []
    const fullStars = Math.floor(validRating)
    const hasHalfStar = validRating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={i} className="fas fa-star"></i>)
    }
    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt"></i>)
    }
    const emptyStars = 5 - Math.ceil(validRating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star"></i>)
    }
    return stars
  }

  console.log('Render - loading:', loading, 'product:', product ? 'exists' : 'null')

  if (loading) {
    console.log('Showing loading state')
    return (
      <div className="container mt-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading product details...</p>
        </div>
      </div>
    )
  }

  if (!product) {
    console.log('Showing product not found')
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">
          <h4>Product not found</h4>
          <p>The product you're looking for could not be loaded. This might be due to:</p>
          <ul>
            <li>Network connectivity issues</li>
            <li>The product may have been removed</li>
            <li>Server temporarily unavailable</li>
          </ul>
          <div className="mt-3">
            <Link to="/amazons-choice" className="btn btn-primary me-2">Browse Products</Link>
            <button onClick={() => window.location.reload()} className="btn btn-outline-secondary">
              Try Again
            </button>
          </div>
        </div>
        
        {/* Debug info in development */}
        {import.meta.env.DEV && (
          <div className="alert alert-info mt-3">
            <h5>Debug Info (Development Only)</h5>
            <p><strong>Product ID:</strong> {id}</p>
            <p><strong>API URL:</strong> {apiConfig.API_BASE_URL}</p>
            <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
          </div>
        )}
      </div>
    )
  }

  console.log('Rendering product details')
  return (
    <div className="product-detail-page">

      {/* Breadcrumb with Animation */}
      <div className="container mt-1 mb-0 animate__animated animate__fadeInDown">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-light p-2 rounded shadow-sm mb-0" style={{fontSize: '0.85rem'}}>
            <li className="breadcrumb-item"><Link to="/" className="text-decoration-none"><i className="fas fa-home me-1"></i>Amazon's Choice</Link></li>
            <li className="breadcrumb-item active fw-bold">{product.name}</li>
          </ol>
        </nav>
      </div>

      {/* Product Detail Section - Responsive Layout */}
      <section className="product-detail-section py-1" style={{background: '#ffffff'}}>
        <div className="container-fluid" style={{maxWidth: '1600px', padding: '0 15px'}}>
          <div className="row g-2">
            
            {/* LEFT COLUMN - Product Images Only */}
            <div className="col-12 col-lg-4 order-1 order-lg-1">
              <div className="sticky-top" style={{top: '100px', zIndex: 10}}>
                {/* Main Image */}
                <div className="position-relative mb-2" style={{background: '#fff', border: '1px solid #ddd', borderRadius: '6px', padding: '15px'}}>
                  <img 
                    src={product.images && product.images[selectedImage] ? product.images[selectedImage] : product.image} 
                    alt={product.name} 
                    className="img-fluid"
                    style={{width: '100%', height: window.innerWidth < 768 ? '250px' : '320px', objectFit: 'contain'}}
                  />
                  <div className="position-absolute top-0 start-0 m-2">
                    <span className="badge bg-danger px-2 py-1" style={{fontSize: '0.65rem'}}>
                      <i className="fas fa-fire me-1"></i>Hot Deal
                    </span>
                  </div>
                </div>

                {/* Thumbnail Images */}
                <div className="d-flex gap-2 mb-2 overflow-auto" style={{maxWidth: '100%'}}>
                  {product.images && product.images.map((img, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      style={{
                        minWidth: '60px',
                        height: '60px',
                        border: selectedImage === idx ? '2px solid #ff9900' : '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '5px',
                        cursor: 'pointer',
                        background: '#fff',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ff9900'}
                      onMouseLeave={(e) => {
                        if (selectedImage !== idx) e.currentTarget.style.borderColor = '#ddd'
                      }}
                    >
                      <img 
                        src={img}
                        alt={`${product.name} ${idx + 1}`}
                        style={{
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Money Back Guarantee */}
                <div className="alert alert-success border-0 mb-0" style={{background: 'linear-gradient(135deg, #28a745, #20c997)', borderRadius: '6px'}}>
                  <div className="text-center text-white py-2">
                    <i className="fas fa-shield-alt mb-1" style={{fontSize: '1.2rem'}}></i>
                    <div className="fw-bold mb-1" style={{fontSize: '0.8rem'}}>100% Money Back Guarantee</div>
                    <small style={{fontSize: '0.7rem', opacity: 0.95}}>Price guaranteed or full refund</small>
                  </div>
                </div>
              </div>
            </div>
            
            {/* MIDDLE COLUMN - Title, Reviews, Price, Variations, About */}
            <div className="col-12 col-lg-5 order-3 order-lg-2">
              <div className="product-middle-info">
                
                {/* Home Page Link */}
                <div className="mb-2">
                  <Link to="/" className="text-decoration-none" style={{fontSize: '0.85rem', color: '#666'}}>
                    <i className="fas fa-home me-1"></i>Amazon's Choice
                  </Link>
                  <span className="mx-2" style={{color: '#999'}}>?</span>
                  <span style={{fontSize: '0.85rem', color: '#999'}}>Product Details</span>
                </div>
                
                {/* Product Title */}
                <h1 className="fw-bold text-dark mb-2" style={{fontSize: '1.1rem', lineHeight: '1.3'}}>{product.name}</h1>
                  
                {/* Rating and Reviews */}
                <div className="d-flex align-items-center flex-wrap mb-2">
                  <div className="text-warning me-2" style={{fontSize: '0.75rem'}}>
                    {renderStars(product.rating)}
                  </div>
                  <Link to="#reviews" className="text-primary me-2" style={{fontSize: '0.75rem', textDecoration: 'none'}}>
                    {product.reviews} ratings
                  </Link>
                  {product.markup && (
                    <span className="badge bg-success px-2 py-1 me-2" style={{fontSize: '0.65rem'}}>
                      {product.markup}
                    </span>
                  )}
                  {product.hasProfit && product.profitCalculations && safeNumber(product.profitCalculations.profitPerUnit) > 0 && (
                    <span className="badge bg-primary px-2 py-1" style={{fontSize: '0.65rem'}}>
                      <i className="fas fa-coins me-1"></i>
                      Profit: {convertFromGBP(product.profitCalculations.profitPerUnit)}/unit
                    </span>
                  )}
                </div>

                <hr className="my-2" />
                  
                {/* Price Section */}
                <div className="price-section mb-2">
                  <div className="d-flex align-items-baseline gap-2 mb-1">
                    <span className="fw-bold" style={{fontSize: '1.4rem', color: '#B12704'}}>
                      {convertPrice(product.price)}
                    </span>
                    <span className="text-muted" style={{fontSize: '0.75rem'}}>/Unit ex. VAT</span>
                  </div>
                  
                  <div className="d-flex gap-2 mb-1">
                    <div>
                      <smal className="text-muted" style={{fontSize: '0.7rem'}}>RRP: </smal>
                      <span className="fw-semibold" style={{fontSize: '0.8rem'}}>{convertPrice(product.rrp)}</span>
                    </div>
                    <div>
                      <small className="text-muted" style={{fontSize: '0.7rem'}}>Save: </small>
                      <span className="fw-semibold text-danger" style={{fontSize: '0.8rem'}}>
                        {(() => {
                          const wholesale = parseFloat(product.price.replace(/[?$?]/g, ''))
                          const rrp = parseFloat(product.rrp.replace(/[?$?]/g, ''))
                          const savings = ((rrp - wholesale) / rrp * 100).toFixed(0)
                          return `${savings}%`
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                <hr className="my-2" />

                {/* Product Variations - Amazon Style */}
                <div className="product-variations mb-4 pb-4" style={{borderBottom: '1px solid #e5e7eb'}}>
                  {/* Color Variations */}
                  {product.specifications && product.specifications.Color && (
                    <div className="mb-3">
                      <div className="mb-2">
                        <span className="fw-bold" style={{fontSize: '0.95rem'}}>Colour: </span>
                        <span style={{fontSize: '0.95rem'}}>
                          {selectedVariations.color || product.specifications.Color.split(',')[0].trim()}
                        </span>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        {product.specifications.Color.split(',').map((color, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setSelectedVariations({...selectedVariations, color: color.trim()})}
                            className={`btn ${selectedVariations.color === color.trim() || (!selectedVariations.color && idx === 0) ? 'btn-dark' : 'btn-outline-secondary'}`}
                            style={{
                              fontSize: '0.85rem', 
                              padding: '10px 20px',
                              borderRadius: '8px',
                              fontWeight: '500',
                              border: selectedVariations.color === color.trim() || (!selectedVariations.color && idx === 0) ? '2px solid #232f3e' : '1px solid #ddd'
                            }}
                          >
                            {color.trim()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Size Variations */}
                  {product.specifications && product.specifications.Diameter && (
                    <div className="mb-3">
                      <div className="mb-2">
                        <span className="fw-bold" style={{fontSize: '0.95rem'}}>Size: </span>
                        <span style={{fontSize: '0.95rem'}}>
                          {selectedVariations.size || product.specifications.Diameter.split(',')[0].trim()}
                        </span>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        {product.specifications.Diameter.split(',').map((size, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setSelectedVariations({...selectedVariations, size: size.trim()})}
                            className={`btn ${selectedVariations.size === size.trim() || (!selectedVariations.size && idx === 0) ? 'btn-dark' : 'btn-outline-secondary'}`}
                            style={{
                              fontSize: '0.85rem', 
                              padding: '10px 20px',
                              borderRadius: '8px',
                              fontWeight: '500',
                              border: selectedVariations.size === size.trim() || (!selectedVariations.size && idx === 0) ? '2px solid #232f3e' : '1px solid #ddd'
                            }}
                          >
                            {size.trim()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Packing Variations */}
                  {product.specifications && product.specifications.Quantity && (
                    <div className="mb-3">
                      <div className="mb-2">
                        <span className="fw-bold" style={{fontSize: '0.95rem'}}>Packing: </span>
                        <span style={{fontSize: '0.95rem'}}>
                          {selectedVariations.packing || product.specifications.Quantity}
                        </span>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button 
                          onClick={() => setSelectedVariations({...selectedVariations, packing: product.specifications.Quantity})}
                          className={`btn ${selectedVariations.packing === product.specifications.Quantity || !selectedVariations.packing ? 'btn-dark' : 'btn-outline-secondary'}`}
                          style={{
                            fontSize: '0.85rem', 
                            padding: '10px 20px',
                            borderRadius: '8px',
                            fontWeight: '500',
                            border: selectedVariations.packing === product.specifications.Quantity || !selectedVariations.packing ? '2px solid #232f3e' : '1px solid #ddd'
                          }}
                        >
                          {product.specifications.Quantity}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Related Product Variations */}
                  {productVariations.length > 0 && (
                    <div className="mb-3">
                      <div className="fw-bold mb-3" style={{fontSize: '0.95rem'}}>
                        Other options:
                      </div>
                      <div className="row g-2">
                        {productVariations.map((variation, idx) => (
                          <div key={idx} className="col-6">
                            <Link 
                              to={`/product/${variation.id}`}
                              className="card border text-decoration-none h-100"
                              style={{
                                transition: 'all 0.2s',
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ff9900'}
                              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ddd'}
                            >
                              <div className="card-body p-2">
                                <div className="d-flex gap-2 align-items-center">
                                  <img 
                                    src={variation.image} 
                                    alt={variation.name}
                                    style={{
                                      width: '60px',
                                      height: '60px',
                                      objectFit: 'contain',
                                      borderRadius: '4px',
                                      background: '#f8f9fa'
                                    }}
                                  />
                                  <div className="flex-grow-1">
                                    <div style={{fontSize: '0.8rem', color: '#2d3748', lineHeight: '1.3', marginBottom: '4px'}}>
                                      {variation.name.substring(0, 35)}...
                                    </div>
                                    <div className="fw-bold" style={{fontSize: '0.85rem', color: '#B12704'}}>
                                      {convertPrice(variation.price)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* About this item / Description */}
                {product.description && (
                  <div className="mb-3">
                    <h2 className="fw-bold mb-2" style={{fontSize: '0.95rem'}}>About this item</h2>
                    <p style={{fontSize: '0.8rem', lineHeight: '1.5', color: '#0F1111'}}>
                      {product.description}
                    </p>
                    {product.features && (
                      <ul style={{paddingLeft: '20px', marginTop: '10px', marginBottom: 0}}>
                        {product.features.map((feature, idx) => (
                          <li key={idx} style={{fontSize: '0.8rem', color: '#0F1111', marginBottom: '6px', lineHeight: '1.4'}}>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

              </div>
            </div>

            {/* RIGHT COLUMN - Buy Box, Supplier Details */}
            <div className="col-12 col-lg-3 order-2 order-lg-3">
              <div className="d-none d-lg-block sticky-top" style={{top: '100px', zIndex: 10}}>
                <div className="border rounded p-3" style={{background: '#f7f7f7'}}>
                  
                  {/* Desktop Buy Box Content */}
                  
                  {/* Price in Buy Box */}
                  <div className="mb-2">
                    <div className="d-flex align-items-baseline gap-1">
                      <span className="fw-bold" style={{fontSize: '1.2rem', color: '#B12704'}}>
                        {convertPrice(product.price)}
                      </span>
                      <span className="text-muted" style={{fontSize: '0.7rem'}}>/Unit</span>
                    </div>
                    <small className="text-muted" style={{fontSize: '0.7rem'}}>ex. VAT</small>
                  </div>

                  {/* In Stock */}
                  <div className="mb-2">
                    <div className="text-success fw-bold" style={{fontSize: '0.85rem'}}>
                      <i className="fas fa-check-circle me-1"></i>In Stock
                    </div>
                    <small className="text-muted" style={{fontSize: '0.7rem'}}>
                      Ships from {product.dealInfo?.location || 'Pakistan'}
                    </small>
                  </div>

                  {/* Quantity Selector */}
                  <div className="mb-2">
                    <label className="form-label fw-bold mb-1" style={{fontSize: '0.75rem'}}>Quantity:</label>
                    <select className="form-select form-select-sm" style={{fontSize: '0.8rem'}}>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="5">5</option>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>



                  {/* Buy Now Button */}
                  <div className="d-grid gap-2 mb-2">
                    <button className="btn btn-danger" style={{fontSize: '0.8rem', padding: '8px'}}>
                      <i className="fas fa-bolt me-1"></i>Buy Now
                    </button>
                  </div>

                  <hr />

                  {/* Supplier Details */}
                  <div className="mb-2">
                    <h3 className="fw-bold mb-2" style={{fontSize: '0.85rem'}}>Supplier Information</h3>
                    

                    
                    {/* Show seller info for admin */}
                    {isAdmin && sellerInfo ? (
                      <div className="border rounded p-2 mb-2" style={{background: '#e8f5e9'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-check-circle text-success me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-success" style={{fontSize: '0.75rem'}}>Verified Seller</span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Seller:</strong> {sellerInfo.username}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Supplier ID:</strong> {sellerInfo.supplierId}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Email:</strong> {sellerInfo.email}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>WhatsApp:</strong> {sellerInfo.whatsappNo}
                        </div>
                        {sellerInfo.contactNo && (
                          <div className="mb-1" style={{fontSize: '0.7rem'}}>
                            <strong>Contact:</strong> {sellerInfo.contactNo}
                          </div>
                        )}
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Location:</strong> ???? {sellerInfo.city}, {sellerInfo.country}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Category:</strong> {sellerInfo.productCategory}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Status:</strong> <span className="badge bg-success" style={{fontSize: '0.65rem'}}>{sellerInfo.verificationStatus}</span>
                        </div>
                      </div>
                    ) : isAdmin && product.seller && !sellerInfo ? (
                      <div className="alert alert-info border-0 p-2 mb-2" style={{fontSize: '0.7rem'}}>
                        <i className="fas fa-spinner fa-spin me-1"></i>
                        Loading seller information...
                      </div>
                    ) : isAdmin && !product.seller ? (
                      <div className="alert alert-warning border-0 p-2 mb-2" style={{fontSize: '0.7rem'}}>
                        <i className="fas fa-exclamation-triangle me-1"></i>
                        No seller assigned to this product
                      </div>
                    ) : !isAdmin ? (
                      <>
                        <div className="mb-1">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-check-circle text-success me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold" style={{fontSize: '0.75rem'}}>Verified Seller</span>
                          </div>
                        </div>
                        
                        {product.dealInfo && (
                          <>
                            <div className="mb-1" style={{fontSize: '0.7rem'}}>
                              <strong>Location:</strong> {product.dealInfo.flag} {product.dealInfo.location}
                            </div>
                            <div className="mb-1" style={{fontSize: '0.7rem'}}>
                              <strong>Min Order:</strong> {product.dealInfo.minOrder}
                            </div>
                            <div className="mb-1" style={{fontSize: '0.7rem'}}>
                              <strong>Condition:</strong> {product.dealInfo.condition}
                            </div>
                          </>
                        )}
                        
                        {!isBuyerLoggedIn && (
                          <div className="alert alert-warning border-0 mt-2 mb-2" style={{fontSize: '0.7rem', padding: '6px'}}>
                            <i className="fas fa-lock me-1"></i>
                            Join to see full contact details
                          </div>
                        )}

                        {isBuyerLoggedIn && !isSupplierUnlocked && (
                          <div className="alert alert-info border-0 mt-2 mb-2" style={{fontSize: '0.7rem', padding: '6px'}}>
                            <i className="fas fa-lock me-1"></i>
                            Pay Rs 200 to unlock supplier contact
                          </div>
                        )}

                        {isBuyerLoggedIn && isSupplierUnlocked && (
                          <div className="alert alert-success border-0 mt-2 mb-2" style={{fontSize: '0.7rem', padding: '6px'}}>
                            <i className="fas fa-unlock me-1"></i>
                            Supplier contact unlocked!
                          </div>
                        )}
                      </>
                    ) : null}
                    
                    {/* Only show buttons for non-admin users */}
                    {!isAdmin && (
                      <div className="d-grid gap-1">
                        {isBuyerLoggedIn ? (
                          <button 
                            onClick={handleContactSupplier}
                            className={`btn ${isSupplierUnlocked ? 'btn-success' : 'btn-warning'} btn-sm`}
                            style={{fontSize: '0.7rem', padding: '6px'}}
                          >
                            <i className={`${isSupplierUnlocked ? 'fab fa-whatsapp' : 'fas fa-lock'} me-1`}></i>
                            {isSupplierUnlocked ? 'Contact Supplier' : 'Unlock Contact (Rs 200)'}
                          </button>
                        ) : (
                          <Link to="/join-now" className="btn btn-primary btn-sm" style={{fontSize: '0.7rem', padding: '6px'}}>
                            <i className="fas fa-user-plus me-1"></i>Join Now
                          </Link>
                        )}
                      </div>
                    )}
                  </div>

                  <hr />

                  {/* Total Sales */}
                  <div className="text-center">
                    <div className="fw-bold mb-1" style={{fontSize: '0.8rem'}}>Total Sales</div>
                    <div className="text-primary fw-bold" style={{fontSize: '1.1rem'}}>
                      {product.monthlyOrders}
                    </div>
                    <small className="text-muted" style={{fontSize: '0.7rem'}}>units sold this month</small>
                  </div>

                </div>
              </div>
              
              {/* Mobile Buy Box - Fixed Bottom */}
              <div className="d-block d-lg-none">
                <div className="fixed-bottom bg-white border-top p-3 shadow-lg">
                  <div className="container">
                    <div className="row align-items-center">
                      <div className="col-6">
                        <div className="fw-bold text-danger" style={{fontSize: '1.1rem'}}>
                          {convertPrice(product.price)}
                        </div>
                        <small className="text-muted">ex. VAT</small>
                      </div>
                      <div className="col-6">
                        <div className="d-grid gap-1">
                          <button className="btn btn-danger btn-sm">
                            <i className="fas fa-bolt me-1"></i>Buy Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Add padding to prevent content being hidden behind fixed bottom */}
                <div style={{height: '120px'}}></div>
              </div>
            </div>

          </div>

          {/* Below 3 Columns - Additional Content */}
          <div className="row mt-4">
            <div className="col-12">
              
              {/* Platform Comparison and Profit Evaluation Side by Side */}
              <div className="row g-3">
                {/* Platform Pricing Table - Left Side */}
                {product.platforms && (
                  <div className={product.showEvaluation && product.evaluation ? "col-lg-6" : "col-12"}>
                    <div className="mb-3">
                      <div className="fw-bold mb-2" style={{fontSize: '0.9rem', color: '#2d3748'}}>
                        <i className="fas fa-chart-line me-2"></i>Platform Comparison
                      </div>
                      <div className="table-responsive" style={{overflowX: 'auto', overflowY: 'hidden'}}>
                        <table className="table table-sm table-bordered shadow-sm mb-0" style={{fontSize: '0.75rem'}}>
                          <thead style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
                            <tr>
                              <th className="fw-bold py-2 px-2" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Platform</th>
                              <th className="fw-bold py-2 px-2 text-center" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Price</th>
                              <th className="fw-bold py-2 px-2 text-center" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Profit</th>
                              <th className="fw-bold py-2 px-2 text-center">Markup</th>
                            </tr>
                          </thead>
                          <tbody>
                            {product.platforms.map((platform, idx) => (
                              <tr key={idx} style={{background: idx % 2 === 0 ? '#f8f9fa' : 'white'}}>
                                <td className="fw-semibold py-2 px-2" style={{color: '#2d3748', fontSize: '0.75rem'}}>
                                  <i className={`fas fa-${platform.name === 'Amazon' ? 'shopping-cart' : platform.name === 'eBay' ? 'gavel' : 'store'} me-1 text-primary`} style={{fontSize: '0.7rem'}}></i>
                                  {platform.name}
                                </td>
                                <td className="fw-bold text-primary py-2 px-2 text-center" style={{fontSize: '0.75rem'}}>{convertPrice(platform.price)}</td>
                                <td className="fw-bold text-success py-2 px-2 text-center" style={{fontSize: '0.75rem'}}>{convertPrice(platform.grossProfit)}</td>
                                <td className="py-2 px-2 text-center">
                                  <span className="badge bg-info" style={{fontSize: '0.65rem', padding: '3px 6px'}}>
                                    {platform.markup}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="alert alert-info border-0 mt-2 mb-0" style={{fontSize: '0.7rem', padding: '6px 10px'}}>
                        <i className="fas fa-info-circle me-1"></i>
                        <strong>Note:</strong> Prices are estimates.
                      </div>
                    </div>

                    {/* Profit Calculations - Below Platform Comparison */}
                    {product.hasProfit && product.profitCalculations && (
                      <div className="mb-3">
                        <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}>
                          <div className="card-body p-2">
                            <div className="fw-bold mb-2 text-white" style={{fontSize: '0.85rem'}}>
                              <i className="fas fa-calculator me-2"></i>Profit Calculations
                            </div>
                            <div className="row g-1">
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Profit per Unit</div>
                                  <div className="fw-bold text-success" style={{fontSize: '0.9rem'}}>
                                    {convertFromGBP(product.profitCalculations.profitPerUnit)}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Monthly (100 units)</div>
                                  <div className="fw-bold text-primary" style={{fontSize: '0.9rem'}}>
                                    {convertFromGBP(product.profitCalculations.monthlyProfit)}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Yearly (1200 units)</div>
                                  <div className="fw-bold text-danger" style={{fontSize: '0.9rem'}}>
                                    {convertFromGBP(product.profitCalculations.yearlyProfit)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Profit Evaluation - Right Side */}
                {product.showEvaluation && product.evaluation && (
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <div className="fw-bold mb-2" style={{fontSize: '0.9rem', color: '#2d3748'}}>
                        <i className="fas fa-calculator me-2"></i>Profit Evaluation
                      </div>
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered shadow-sm mb-0" style={{fontSize: '0.75rem'}}>
                          <thead style={{background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', color: 'white'}}>
                            <tr>
                              <th className="fw-bold py-2 px-2">Description</th>
                              <th className="fw-bold py-2 px-2 text-end">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{background: '#f1f5f9'}}>
                              <td className="fw-semibold py-2 px-2">Sales Proceeds</td>
                              <td className="fw-bold py-2 px-2 text-end text-success">{convertFromGBP(product.evaluation.salesProceeds)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-3" style={{fontSize: '0.7rem'}}>Commission</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.7rem'}}>{convertFromGBP(product.evaluation.commissionBase + product.evaluation.commissionTax)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-3" style={{fontSize: '0.7rem'}}>Digital Services Fee</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.7rem'}}>{convertFromGBP(product.evaluation.digitalServiceBase + product.evaluation.digitalServiceTax)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-3" style={{fontSize: '0.7rem'}}>FBA Fulfilment Fee</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.7rem'}}>{convertFromGBP(product.evaluation.fbaFeeBase + product.evaluation.fbaFeeTax)}</td>
                            </tr>
                            <tr style={{background: '#fff3cd'}}>
                              <td className="fw-semibold py-2 px-2">Balance Change</td>
                              <td className="fw-bold py-2 px-2 text-end">{convertFromGBP(product.evaluation.changeToBalance)}</td>
                            </tr>
                            <tr>
                              <td className="fw-semibold py-2 px-2">Product Cost</td>
                              <td className="fw-bold py-2 px-2 text-end text-danger">-{convertFromGBP(product.evaluation.productCost)}</td>
                            </tr>
                            <tr style={{background: '#e6f7ee'}}>
                              <td className="fw-bold py-2 px-2" style={{fontSize: '0.85rem'}}>Net Profit</td>
                              <td className="fw-bold py-2 px-2 text-end text-success" style={{fontSize: '0.85rem'}}>{convertFromGBP(product.evaluation.netProfit)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Platform Verify Buttons - Below Main Sections */}
              <div className="card border-0 shadow-sm rounded-3 mb-3" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'}}>
                <div className="card-body p-3">
                  <div className="row align-items-center">
                    <div className="col-md-4 text-center text-md-start mb-3 mb-md-0">
                      <h4 className="text-white fw-bold mb-1" style={{fontSize: '1.1rem'}}>
                        <i className="fas fa-check-circle me-2"></i>Verify This Product
                      </h4>
                      <p className="text-white mb-0" style={{fontSize: '0.8rem', opacity: 0.9}}>
                        Check prices and availability on major platforms
                      </p>
                    </div>
                    <div className="col-md-8">
                      <div className="row g-2">
                        <div className="col-md-3 col-6">
                          <a 
                            href={`https://www.amazon.com/s?k=${encodeURIComponent(product.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-warning w-100"
                            style={{fontSize: '0.85rem', padding: '10px', fontWeight: '600'}}
                          >
                            <i className="fab fa-amazon me-2"></i>Amazon
                          </a>
                        </div>
                        <div className="col-md-3 col-6">
                          <a 
                            href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(product.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-light w-100"
                            style={{fontSize: '0.85rem', padding: '10px', fontWeight: '600', color: '#0064d2'}}
                          >
                            <i className="fab fa-ebay me-2"></i>eBay
                          </a>
                        </div>
                        <div className="col-md-3 col-6">
                          <a 
                            href={`https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(product.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-light w-100"
                            style={{fontSize: '0.85rem', padding: '10px', fontWeight: '600', color: '#ff6a00'}}
                          >
                            <i className="fas fa-globe me-2"></i>Alibaba
                          </a>
                        </div>
                        <div className="col-md-3 col-6">
                          <a 
                            href={`https://www.google.com/search?q=${encodeURIComponent(product.name + ' price')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-light w-100"
                            style={{fontSize: '0.85rem', padding: '10px', fontWeight: '600'}}
                          >
                            <i className="fab fa-google me-2"></i>Google
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Sections Below */}
          <div className="row mt-4">
            <div className="col-12">
              
              {/* Product Description and Technical Specifications Side by Side */}
              <div className="row g-3" style={{marginTop: '20px'}}>
                {/* Product Description - Left Side */}
                {product.description && (
                  <div className={product.specifications ? "col-lg-6" : "col-12"}>
                    <div className="product-description" style={{background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', height: '100%'}}>
                      <h3 style={{fontSize: '1.1rem', fontWeight: '700', marginBottom: '12px', color: '#2d3748', borderBottom: '2px solid var(--bs-primary)', paddingBottom: '8px'}}>
                        <i className="fas fa-info-circle me-2"></i>Product Description
                      </h3>
                      <p style={{fontSize: '0.9rem', lineHeight: '1.6', color: '#4a5568', marginBottom: '15px'}}>
                        {product.description}
                      </p>
                      
                      {product.features && (
                        <div>
                          <h4 style={{fontSize: '0.95rem', fontWeight: '600', marginBottom: '10px', color: '#2d3748'}}>Key Features:</h4>
                          <ul style={{paddingLeft: '20px', marginBottom: 0}}>
                            {product.features.map((feature, idx) => (
                              <li key={idx} style={{fontSize: '0.85rem', color: '#4a5568', marginBottom: '6px'}}>
                                <i className="fas fa-check-circle text-success me-2"></i>{feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Technical Specifications - Right Side */}
                {product.specifications && (
                  <div className={product.description ? "col-lg-6" : "col-12"}>
                    <div className="product-specs" style={{background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', height: '100%'}}>
                      <h3 style={{fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: '#2d3748', borderBottom: '2px solid var(--bs-primary)', paddingBottom: '8px'}}>
                        <i className="fas fa-clipboard-list me-2"></i>Technical Specifications
                      </h3>
                      <div className="table-responsive">
                        <table className="table mb-0" style={{fontSize: '0.85rem'}}>
                          <tbody>
                            {Object.entries(product.specifications).map(([key, value], idx) => (
                              <tr key={key} style={{background: idx % 2 === 0 ? '#f8f9fa' : 'white'}}>
                                <td style={{padding: '12px 15px', fontWeight: '600', color: '#4a5568', width: '35%', borderRight: '2px solid #e2e8f0'}}>
                                  <i className="fas fa-check-circle text-success me-2" style={{fontSize: '0.75rem'}}></i>
                                  {key}
                                </td>
                                <td style={{padding: '12px 15px', color: '#2d3748', fontWeight: '500'}}>{value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            
            {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="related-products" style={{marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e2e8f0'}}>
              <h3 style={{fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: '#2d3748', textAlign: 'center'}}>Related Products</h3>
              
              <div style={{background: '#fff', borderRadius: '8px', padding: '15px', marginBottom: '20px', borderLeft: '4px solid var(--bs-primary)'}}>
                <p style={{marginBottom: '8px', fontSize: '0.9rem'}}><strong>Example single unit selling on Amazon & calculation:</strong></p>
                <p style={{marginBottom: '8px', fontSize: '0.9rem'}}>
                  Cost price: <strong>{convertFromGBP(product.profitCalculations.costPrice)}</strong>
                </p>
                <p style={{marginBottom: '8px', fontSize: '0.9rem'}}>
                  After deducting all Amazon fees and product cost, your profit per unit is: 
                  <span style={{fontWeight: '800', color: '#28a745', fontSize: '1.1rem'}}>
                    {convertFromGBP(product.profitCalculations.profitPerUnit)}
                  </span>
                </p>
              </div>
              
              <table style={{width: '100%', borderCollapse: 'collapse', marginBottom: '20px', fontSize: '0.85rem'}}>
                <thead>
                  <tr>
                    <th style={{padding: '10px 12px', fontWeight: '600', color: '#4a5568', background: '#f1f5f9', textAlign: 'left'}}>Description</th>
                    <th style={{padding: '10px 12px', fontWeight: '600', color: '#4a5568', background: '#f1f5f9', textAlign: 'right'}}>Base Amount</th>
                    <th style={{padding: '10px 12px', fontWeight: '600', color: '#4a5568', background: '#f1f5f9', textAlign: 'right'}}>Tax</th>
                    <th style={{padding: '10px 12px', fontWeight: '600', color: '#4a5568', background: '#f1f5f9', textAlign: 'right'}}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: '600', color: '#2d3748', background: '#f1f5f9'}}>Sales Proceeds</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right'}}>{convertFromGBP(product.evaluation.salesProceeds)}</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right'}}>-</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: '600'}}>{convertFromGBP(product.evaluation.salesProceeds)}</td>
                  </tr>
                  <tr>
                    <td colSpan="4" style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: '600', color: '#2d3748', background: '#f1f5f9'}}>Amazon Fees</td>
                  </tr>
                  <tr>
                    <td style={{padding: '10px 12px', paddingLeft: '25px', borderBottom: '1px solid #e2e8f0', color: '#718096'}}>Commission:</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right'}}>{convertFromGBP(product.evaluation.commissionBase)}</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right'}}>{convertFromGBP(product.evaluation.commissionTax)}</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right', fontWeight: '600'}}>{convertFromGBP(product.evaluation.commissionBase + product.evaluation.commissionTax)}</td>
                  </tr>
                  <tr>
                    <td style={{padding: '10px 12px', paddingLeft: '25px', borderBottom: '1px solid #e2e8f0', color: '#718096'}}>Digital Services Fee:</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right'}}>{convertFromGBP(product.evaluation.digitalServiceBase)}</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right'}}>{convertFromGBP(product.evaluation.digitalServiceTax)}</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right', fontWeight: '600'}}>{convertFromGBP(product.evaluation.digitalServiceBase + product.evaluation.digitalServiceTax)}</td>
                  </tr>
                  <tr>
                    <td style={{padding: '10px 12px', paddingLeft: '25px', borderBottom: '1px solid #e2e8f0', color: '#718096'}}>FBA Fulfilment Fee per Unit:</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right'}}>{convertFromGBP(product.evaluation.fbaFeeBase)}</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right'}}>{convertFromGBP(product.evaluation.fbaFeeTax)}</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right', fontWeight: '600'}}>{convertFromGBP(product.evaluation.fbaFeeBase + product.evaluation.fbaFeeTax)}</td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{padding: '10px 12px', borderBottom: '2px solid #e2e8f0', fontWeight: '700', color: '#2d3748', background: '#fff3cd'}}>Change to Your Seller Account Balance</td>
                    <td style={{padding: '10px 12px', borderBottom: '2px solid #e2e8f0', fontWeight: '700', color: '#2d3748', background: '#fff3cd', textAlign: 'right'}}>{convertFromGBP(product.evaluation.changeToBalance)}</td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', fontWeight: '600', color: '#2d3748'}}>Product Cost</td>
                    <td style={{padding: '10px 12px', borderBottom: '1px solid #e2e8f0', color: '#e53e3e', textAlign: 'right', fontWeight: '600'}}>-{convertFromGBP(product.evaluation.productCost)}</td>
                  </tr>
                  <tr>
                    <td colSpan="3" style={{padding: '12px', fontWeight: '700', color: '#28a745', background: '#e6f7ee', fontSize: '1rem'}}>Net Profit</td>
                    <td style={{padding: '12px', fontWeight: '700', color: '#28a745', background: '#e6f7ee', textAlign: 'right', fontSize: '1rem'}}>{convertFromGBP(product.evaluation.netProfit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          
          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div className="related-products" style={{marginTop: '30px', paddingTop: '20px', borderTop: '2px solid #e2e8f0'}}>
              <h3 style={{fontSize: '1.1rem', fontWeight: '700', marginBottom: '15px', color: '#2d3748', textAlign: 'center'}}>Related Products</h3>
              <div className="related-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px'}}>
                {relatedProducts.map(relatedProduct => (
                  <Link 
                    key={relatedProduct.id}
                    to={`/product/${relatedProduct.id}`}
                    className="related-card"
                    style={{background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', transition: 'all 0.3s ease', cursor: 'pointer', textDecoration: 'none', color: 'inherit'}}
                  >
                    <div className="related-card-badge" style={{position: 'absolute', top: '10px', left: '10px', background: 'var(--bs-primary)', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '600', zIndex: 2}}>
                      Amazon's Choice
                    </div>
                    <img src={relatedProduct.image} alt={relatedProduct.name} style={{width: '100%', height: '160px', objectFit: 'contain', background: '#f8f9fa', padding: '15px'}} />
                    <div style={{padding: '15px'}}>
                      <h5 style={{fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: '#2d3748', lineHeight: '1.4', height: '40px', overflow: 'hidden'}}>{relatedProduct.name}</h5>
                      <div style={{color: '#ffc107', fontSize: '0.75rem', marginBottom: '8px'}}>
                        {renderStars(relatedProduct.rating)}
                      </div>
                      <div style={{color: 'var(--bs-primary)', fontWeight: '700', fontSize: '1rem'}}>{relatedProduct.price}</div>
                    </div>
                  </Link>
                ))}
              </div>
              </div>
            )}
            
            {/* Top Deals Section */}
          <div className="top-deals-section" style={{marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #e2e8f0'}}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 style={{fontSize: '1.2rem', fontWeight: '700', color: '#2d3748', marginBottom: 0}}>
                <i className="fas fa-fire text-danger me-2"></i>Top Deals - Highest Profit Margins
              </h3>
              <Link to="/latest-deals" className="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div className="row g-3">
              {topDeals.map((deal, idx) => (
                <div key={deal.id} className="col-lg-2 col-md-3 col-sm-4 col-6">
                  <Link 
                    to={`/product/${deal.id}?name=${encodeURIComponent(deal.name)}&img=${encodeURIComponent(deal.image)}&price=${parseFloat(deal.price.replace(/[?$?]/g, ''))}&rating=${deal.rating}&reviews=${deal.reviews || 100}&category=${encodeURIComponent(deal.category || 'General')}&brand=${encodeURIComponent(deal.brand || '')}&discount=${deal.markup || '250%'}`}
                    className="card border-0 shadow-sm h-100 text-decoration-none" 
                    style={{transition: 'all 0.3s ease'}}
                  >
                    <div className="position-relative">
                      <span className="badge bg-danger position-absolute top-0 end-0 m-2" style={{fontSize: '0.65rem', zIndex: 2}}>
                        {deal.markup}
                      </span>
                      <img src={deal.image} alt={deal.name} className="card-img-top" style={{height: '120px', objectFit: 'contain', padding: '10px', background: '#f8f9fa'}} />
                    </div>
                    <div className="card-body p-2">
                      <h6 className="card-title" style={{fontSize: '0.75rem', fontWeight: '600', color: '#2d3748', height: '32px', overflow: 'hidden', lineHeight: '1.3', marginBottom: '4px'}}>{deal.name}</h6>
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-primary fw-bold" style={{fontSize: '0.85rem'}}>{deal.price}</span>
                        <div className="text-warning" style={{fontSize: '0.65rem'}}>
                          {[...Array(5)].map((_, i) => (
                            <i key={i} className={`${i < Math.floor(deal.rating) ? 'fas' : 'far'} fa-star`}></i>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
          
          {/* Most Popular Section */}
          <div className="most-popular-section" style={{marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #e2e8f0'}}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h3 style={{fontSize: '1.2rem', fontWeight: '700', color: '#2d3748', marginBottom: 0}}>
                <i className="fas fa-star text-warning me-2"></i>Most Popular Products
              </h3>
              <Link to="/amazons-choice" className="btn btn-sm btn-outline-primary">View All</Link>
            </div>
            <div className="row g-3">
              {mostPopular.map((popular, idx) => (
                <div key={popular.id} className="col-lg-2 col-md-3 col-sm-4 col-6">
                  <Link 
                    to={`/product/${popular.id}?name=${encodeURIComponent(popular.name)}&img=${encodeURIComponent(popular.image)}&price=${parseFloat(popular.price.replace(/[?$?]/g, ''))}&rating=${popular.rating}&reviews=${popular.reviews || 100}&category=${encodeURIComponent(popular.category || 'General')}&brand=${encodeURIComponent(popular.brand || '')}&discount=${popular.markup || '250%'}`}
                    className="card border-0 shadow-sm h-100 text-decoration-none" 
                    style={{transition: 'all 0.3s ease'}}
                  >
                    <div className="position-relative">
                      <span className="badge bg-success position-absolute top-0 end-0 m-2" style={{fontSize: '0.65rem', zIndex: 2}}>
                        <i className="fas fa-fire me-1"></i>Popular
                      </span>
                      <img src={popular.image} alt={popular.name} className="card-img-top" style={{height: '120px', objectFit: 'contain', padding: '10px', background: '#f8f9fa'}} />
                    </div>
                    <div className="card-body p-2">
                      <h6 className="card-title" style={{fontSize: '0.75rem', fontWeight: '600', color: '#2d3748', height: '32px', overflow: 'hidden', lineHeight: '1.3', marginBottom: '4px'}}>{popular.name}</h6>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-primary fw-bold" style={{fontSize: '0.85rem'}}>{popular.price}</span>
                        <div className="text-warning" style={{fontSize: '0.65rem'}}>
                          {[...Array(5)].map((_, i) => (
                            <i key={i} className={`${i < Math.floor(popular.rating) ? 'fas' : 'far'} fa-star`}></i>
                          ))}
                        </div>
                      </div>
                      <small className="text-muted" style={{fontSize: '0.65rem'}}>
                        <i className="fas fa-users me-1"></i>{popular.reviews} reviews
                      </small>
                    </div>
                  </Link>
                </div>
              ))}
              </div>
            </div>
            
            {/* Customer Testimonials - Enhanced - MOVED TO END */}
          {product.testimonials && product.testimonials.length > 0 && (
            <div className="testimonials-section animate__animated animate__fadeInUp" style={{marginTop: '40px', paddingTop: '30px', borderTop: '2px solid #e2e8f0', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', padding: '25px', boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'}}>
              <div className="text-center mb-3">
                <h3 style={{fontSize: '1.3rem', fontWeight: '700', color: 'white', marginBottom: '8px'}}>
                  <i className="fas fa-star text-warning me-2"></i>What Our Customers Say
                </h3>
                <p style={{fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', marginBottom: 0}}>
                  Real reviews from verified buyers
                </p>
              </div>
              <div className="row g-3">
                {product.testimonials.map((testimonial, idx) => (
                  <div key={idx} className="col-md-4">
                    <div className="testimonial-card" style={{
                      background: 'white', 
                      borderRadius: '12px', 
                      padding: '20px', 
                      height: '100%', 
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                      transition: 'transform 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                      <div className="position-absolute" style={{
                        top: '-10px',
                        right: '-10px',
                        fontSize: '4rem',
                        color: '#f0f0f0',
                        opacity: 0.3,
                        fontFamily: 'Georgia, serif'
                      }}>
                        "
                      </div>
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="fw-bold" style={{fontSize: '0.95rem', color: '#2d3748'}}>{testimonial.name}</div>
                          <div className="text-muted" style={{fontSize: '0.75rem'}}>
                            <i className="fas fa-map-marker-alt me-1"></i>{testimonial.location}
                          </div>
                        </div>
                        <div className="text-warning" style={{fontSize: '0.85rem'}}>
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <i key={i} className="fas fa-star"></i>
                          ))}
                        </div>
                      </div>
                      <p style={{fontSize: '0.85rem', color: '#4a5568', marginBottom: '12px', lineHeight: '1.6', fontStyle: 'italic'}}>
                        "{testimonial.comment}"
                      </p>
                      <div className="d-flex justify-content-between align-items-center pt-2" style={{borderTop: '1px solid #e5e7eb'}}>
                        <small className="text-muted" style={{fontSize: '0.7rem'}}>
                          <i className="far fa-clock me-1"></i>{testimonial.date}
                        </small>
                        <span className="badge bg-success" style={{fontSize: '0.65rem'}}>
                          <i className="fas fa-check-circle me-1"></i>Verified
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Trust Indicators */}
              <div className="row g-2 mt-3">
                <div className="col-md-4">
                  <div className="text-center text-white">
                    <i className="fas fa-users" style={{fontSize: '1.5rem', marginBottom: '8px'}}></i>
                    <div className="fw-bold" style={{fontSize: '1.1rem'}}>1000+</div>
                    <small style={{fontSize: '0.75rem', opacity: 0.9}}>Happy Customers</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center text-white">
                    <i className="fas fa-star" style={{fontSize: '1.5rem', marginBottom: '8px'}}></i>
                    <div className="fw-bold" style={{fontSize: '1.1rem'}}>4.5/5</div>
                    <small style={{fontSize: '0.75rem', opacity: 0.9}}>Average Rating</small>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="text-center text-white">
                    <i className="fas fa-shield-alt" style={{fontSize: '1.5rem', marginBottom: '8px'}}></i>
                    <div className="fw-bold" style={{fontSize: '1.1rem'}}>100%</div>
                    <small style={{fontSize: '0.75rem', opacity: 0.9}}>Satisfaction Guarantee</small>
                  </div>
                </div>
              </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        supplierId={supplierId}
        productId={product?.id}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  )
}

export default ProductDetail
