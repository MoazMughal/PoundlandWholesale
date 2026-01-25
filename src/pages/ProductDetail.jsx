import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { completeProductsData, getProductById } from '../data/completeProducts'
import { products } from '../data/allProducts'
import { getImageUrl } from '../utils/imageImports'
import ScrollToTop from '../components/ScrollToTop'
import PaymentModal from '../components/PaymentModal'
import PaymentUploadModal from '../components/PaymentUploadModal'
import ProductVariations from '../components/ProductVariations'
import apiConfig from '../config/api.config'
import { useCurrency } from '../context/CurrencyContext'
import { useAdmin } from '../context/AdminContext'
import '../styles/product-detail-compact.css'
import '../styles/product-detail-enhanced.css'

// Component to fetch and display linked product image
const LinkedProductImage = ({ productId }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductImage = async () => {
      try {
        const response = await fetch(apiConfig.getApiUrl(`products/public/${productId}`));
        if (response.ok) {
          const productData = await response.json();
          const image = productData.images?.[0] || productData.image;
          if (image) {
            setImageUrl(getImageUrl(image));
          }
        }
      } catch (error) {
        console.error('Error fetching linked product image:', error);
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchProductImage();
    }
  }, [productId]);

  if (loading) {
    return (
      <div style={{
        width: '40px',
        height: '40px',
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '4px',
        fontSize: '0.6rem',
        color: '#999'
      }}>
        ...
      </div>
    );
  }

  return (
    <img 
      src={imageUrl || '/placeholder-image.jpg'} 
      alt="Variation"
      style={{
        width: '40px',
        height: '40px',
        objectFit: 'contain',
        borderRadius: '4px',
        marginBottom: '4px'
      }}
      onError={(e) => {
        e.target.src = '/placeholder-image.jpg';
      }}
    />
  );
};

const ProductDetail = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  // Get return category from URL params or location state
  const returnCategory = location.state?.category || searchParams.get('returnCategory') || ''
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  // Use currency from context instead of local state
  const { currency, currencyRates, currencySymbols } = useCurrency()
  const { admin, isLoggedIn: isAdminLoggedIn } = useAdmin()
  const [relatedProducts, setRelatedProducts] = useState([])
  const [topDealsFromDB, setTopDealsFromDB] = useState([])
  const [mostPopularFromDB, setMostPopularFromDB] = useState([])
  const [selectedVariations, setSelectedVariations] = useState({})
  const [productVariations, setProductVariations] = useState([])
  const [isBuyerLoggedIn, setIsBuyerLoggedIn] = useState(false)
  const [isSupplierUnlocked, setIsSupplierUnlocked] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [supplierId, setSupplierId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sellerInfo, setSellerInfo] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPaymentUploadModal, setShowPaymentUploadModal] = useState(false)
  const [isSellerLoggedIn, setIsSellerLoggedIn] = useState(false)
  const [currentSeller, setCurrentSeller] = useState(null)
  const [savingUnits, setSavingUnits] = useState(false) // Loading state for saving units
  const [quantity, setQuantity] = useState(200) // Will be updated to match dealUnits

  // Update quantity to match dealUnits when product loads
  useEffect(() => {
    if (product && product.dealUnits) {
      setQuantity(product.dealUnits);
    }
  }, [product?.dealUnits]);

  // Variation change handlers
  const handleVariationChange = (newSelections) => {
    setSelectedVariations(newSelections);
  };

  const handleProductChange = (productId) => {
    // Navigate to the linked product with cache busting
    const cacheBuster = new Date().getTime();
    navigate(`/product/${productId}?_=${cacheBuster}`, {
      state: { 
        returnTo: location.pathname,
        category: product?.category 
      }
    });
  };

  // Function to get proper image path
  const getImageSrc = (imagePath) => {
    return getImageUrl(imagePath)
  }

  // Currency rates and symbols are now from context

  // Function to calculate markup fallback when admin markup is missing or 0
  const calculateMarkupFallback = (perUnitPrice, totalProfit, units) => {
    try {
      console.log('🔧 calculateMarkupFallback called with:', {
        perUnitPrice,
        totalProfit,
        units,
        productPrice: product?.price
      });
      
      // Get product cost price in GBP
      const costPriceRaw = parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0);
      const isPKR = product?.price?.includes('₨') || product?.price?.includes('Rs');
      const costPriceGBP = isPKR ? costPriceRaw * 0.00272 : costPriceRaw;
      const totalCost = costPriceGBP * units;
      
      console.log('🔧 Markup calculation details:', {
        costPriceRaw,
        isPKR,
        costPriceGBP,
        totalCost,
        perUnitPrice,
        units
      });
      
      // Calculate markup as (Revenue - Cost) / Cost * 100
      const totalRevenue = perUnitPrice * units;
      if (totalCost > 0) {
        const markup = (((totalRevenue - totalCost) / totalCost) * 100).toFixed(2);
        console.log('✅ Calculated markup:', markup + '%');
        return `${markup}%`;
      }
    } catch (error) {
      console.error('Error calculating markup fallback:', error);
    }
    console.log('❌ Returning 0% markup');
    return '0%';
  };

  const convertPrice = (priceStr) => {
    // Extract the price number and detect original currency
    const price = parseFloat(String(priceStr).replace(/[₨£$€Rs]/g, '').trim())
    
    if (isNaN(price)) return priceStr
    
    // Detect if price is in GBP (has £ symbol)
    const isGBP = String(priceStr).includes('£')
    
    // Detect if price is in PKR (has ₨ or Rs symbol or is a plain number from database)
    const isPKR = String(priceStr).includes('?') || String(priceStr).includes('Rs') || (!isGBP && !String(priceStr).includes('$'))
    
    // Since all products are stored in GBP, show them as GBP by default
    if (currency === 'GBP') {
      return `£${price.toFixed(2)}`
    }
    
    // Only convert if user explicitly selects a different currency
    let converted
    if (currency === 'PKR') {
      converted = price / 0.00272 // Convert GBP to PKR
    } else if (currency === 'USD') {
      converted = price * 1.27 // Convert GBP to USD
    } else if (currency === 'AED') {
      converted = price * 4.63 // Convert GBP to AED
    } else {
      converted = price
    }
    
    return `${currencySymbols[currency]}${converted.toFixed(2)}`
  }

  // Check if user is admin or seller
  useEffect(() => {
    const sellerToken = localStorage.getItem('sellerToken');
    const isSellerUser = !!sellerToken;
    
    setIsAdmin(isAdminLoggedIn);
    setIsSellerLoggedIn(isSellerUser);
    
    // Get current seller info if logged in
    if (isSellerUser) {
      fetchCurrentSeller(sellerToken);
    }
  }, [isAdminLoggedIn, admin]);

  // Fetch current seller information
  const fetchCurrentSeller = async (token) => {
    try {
      const response = await fetch(apiConfig.getApiUrl('sellers/profile'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const sellerData = await response.json();
        setCurrentSeller(sellerData);
      }
    } catch (error) {
      console.error('Error fetching current seller:', error);
    }
  };

  // Fetch related products from database
  const fetchRelatedProducts = async (currentProduct) => {
    try {
      // Fetch Amazon's Choice products with different sorting
      const promises = [
        // Get Amazon's Choice products sorted by profit (for Top Deals)
        fetch(apiConfig.getApiUrl(`products/public?isAmazonsChoice=true&limit=30&sortBy=price&order=desc`)),
        // Get Amazon's Choice products sorted by reviews (for Most Popular)
        fetch(apiConfig.getApiUrl(`products/public?isAmazonsChoice=true&limit=30&sortBy=reviews&order=desc`)),
        // Get products from same category
        fetch(apiConfig.getApiUrl(`products/public?isAmazonsChoice=true&category=${encodeURIComponent(currentProduct.category || '')}&limit=20`))
      ];
      
      const responses = await Promise.all(promises);
      const [sameCategoryResponse, diverseResponse, randomResponse] = responses;
      
      let allProducts = [];
      
      // Combine products from all requests
      if (sameCategoryResponse.ok) {
        const sameCategoryData = await sameCategoryResponse.json();
        allProducts = [...allProducts, ...(sameCategoryData.products || [])];
      }
      
      if (diverseResponse.ok) {
        const diverseData = await diverseResponse.json();
        allProducts = [...allProducts, ...(diverseData.products || [])];
      }
      
      if (randomResponse.ok) {
        const randomData = await randomResponse.json();
        allProducts = [...allProducts, ...(randomData.products || [])];
      }
      
      // Remove duplicates and current product
      const uniqueProducts = allProducts.filter((product, index, self) => 
        product._id !== currentProduct.id && 
        index === self.findIndex(p => p._id === product._id)
      );
      
      // Get top deals (mix of high-rated and diverse products)
      const topDeals = uniqueProducts
        .sort((a, b) => {
          // Prioritize products from same category, then by rating and price
          const categoryMatchA = a.category === currentProduct.category ? 1 : 0;
          const categoryMatchB = b.category === currentProduct.category ? 1 : 0;
          
          if (categoryMatchA !== categoryMatchB) {
            return categoryMatchB - categoryMatchA;
          }
          
          // Then sort by rating and price
          const ratingDiff = (b.rating || 0) - (a.rating || 0);
          if (Math.abs(ratingDiff) > 0.5) return ratingDiff;
          return (b.price || 0) - (a.price || 0);
        })
        .slice(0, 6)
        .map(p => ({
          id: p._id,
          name: p.name,
          price: p.currency === 'GBP' ? `£${p.price}` : 
                 p.currency === 'USD' ? `$${p.price}` :
                 p.currency === 'AED' ? `د.إ${p.price}` :
                 `₨${p.price}`,
          image: p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : '',
          rating: p.rating || 4.0,
          reviews: p.reviews || 0,
          category: p.category,
          brand: p.brand || '',
          markup: `${Math.floor((p.price || 100) / 10 + 150)}%` // Calculate markup based on price
        }));

      // Get most popular (mix products from all categories, no category preference)
      const mostPopular = uniqueProducts
        .filter(p => (p.rating || 0) >= 3.0) // Include more products by lowering rating threshold
        .sort((a, b) => {
          // Score based purely on rating and reviews, no category preference for diversity
          const scoreA = (a.rating || 0) + Math.log(Math.max(a.reviews || 1, 1)) * 0.2;
          const scoreB = (b.rating || 0) + Math.log(Math.max(b.reviews || 1, 1)) * 0.2;
          
          return scoreB - scoreA;
        })
        // Ensure category diversity by grouping and selecting from different categories
        .reduce((acc, product) => {
          const categoryCount = acc.filter(p => p.category === product.category).length;
          // Limit products per category to ensure diversity (max 2 per category)
          if (categoryCount < 2) {
            acc.push(product);
          }
          return acc;
        }, [])
        .slice(0, 6)
        .map(p => ({
          id: p._id,
          name: p.name,
          price: p.currency === 'GBP' ? `£${p.price}` : 
                 p.currency === 'USD' ? `$${p.price}` :
                 p.currency === 'AED' ? `د.إ${p.price}` :
                 `₨${p.price}`,
          image: p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : '',
          rating: p.rating || 4.0,
          reviews: p.reviews || 0,
          category: p.category,
          brand: p.brand || '',
          markup: 'Popular'
        }));

      setTopDealsFromDB(topDeals);
      setMostPopularFromDB(mostPopular);
      
      console.log('✅ Related products fetched from database:', {
        totalProducts: uniqueProducts.length,
        topDeals: topDeals.length,
        mostPopular: mostPopular.length,
        currentCategory: currentProduct.category,
        categories: [...new Set(uniqueProducts.map(p => p.category))]
      });
      
    } catch (error) {
      console.error('Error fetching related products:', error);
      // Fallback to empty arrays
      setTopDealsFromDB([]);
      setMostPopularFromDB([]);
    }
  };

  // Fetch seller information
  const fetchSellerInfo = async (sellerId) => {
    console.log('🔍 fetchSellerInfo called with:', {
      sellerId,
      isAdminLoggedIn,
      hasAdminToken: !!localStorage.getItem('adminToken')
    });
    
    if (!sellerId) {
      console.log('❌ No sellerId provided');
      return;
    }
    
    try {
      if (!isAdminLoggedIn) {
        console.log('❌ Admin not logged in');
        return;
      }
      
      const adminToken = localStorage.getItem('adminToken');
      console.log('🔑 Admin token exists:', !!adminToken);
      
      const url = apiConfig.getApiUrl(`sellers/${sellerId}`);
      console.log('📡 Fetching seller info from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Seller info fetched:', data);
        setSellerInfo(data);
      } else {
        const errorText = await response.text();
        console.log('❌ Failed to fetch seller info:', response.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching seller info:', error);
    }
  };

  // Fetch related products when product changes
  useEffect(() => {
    if (product && product.id) {
      fetchRelatedProducts(product);
    }
  }, [product]);



  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      // Reset selected variations when switching to a new product
      console.log('🔄 Resetting selected variations for new product:', id)
      setSelectedVariations({})
      
      // Try to fetch from database first using the product ID
      try {
        // Add cache busting to ensure fresh data
        const cacheBuster = new Date().getTime();
        console.log('🔄 Fetching product with cache buster:', cacheBuster);
        
        // Determine which endpoint to use based on user type
        const sellerToken = localStorage.getItem('sellerToken');
        let apiEndpoint = `products/public/${id}?_=${cacheBuster}`;
        let headers = {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        };
        
        // Use seller endpoint if seller is logged in
        if (sellerToken) {
          apiEndpoint = `products/seller/detail/${id}?_=${cacheBuster}`;
          headers.Authorization = `Bearer ${sellerToken}`;
          console.log('🔐 Using seller endpoint for authenticated seller');
        } else {
          console.log('🌐 Using public endpoint');
        }
        
        const response = await fetch(apiConfig.getApiUrl(apiEndpoint), {
          cache: 'no-cache',
          headers
        })

        if (response.ok) {
          const dbProduct = await response.json()
          
          // Use database product data
          console.log('💰 SAVE FIELD DEBUG:', {
            dbProductSave: dbProduct.savings,
            saveType: typeof dbProduct.savings,
            parsedSave: parseFloat(dbProduct.savings) || 0
          });
          
          console.log('🎨 VARIATIONS DEBUG:', {
            hasVariations: !!dbProduct.variations,
            variationsLength: dbProduct.variations?.length || 0,
            variations: dbProduct.variations
          });
          
          const productData = {
            id: dbProduct._id,
            name: dbProduct.name,
            price: (dbProduct.currency || 'GBP') === 'GBP' ? `£${dbProduct.price}` : 
                   dbProduct.currency === 'USD' ? `$${dbProduct.price}` :
                   dbProduct.currency === 'AED' ? `د.إ${dbProduct.price}` :
                   `₨${dbProduct.price}`, // Default to GBP if currency not set
            rrp: dbProduct.name.toLowerCase().includes('nose ring') ? '£3.49' : (dbProduct.originalPrice ? `₨${dbProduct.originalPrice}` : `₨${(dbProduct.price * 1.5).toFixed(2)}`),
            rating: dbProduct.rating || 4.5,
            reviews: dbProduct.reviews || 100,
            image: dbProduct.images && dbProduct.images.length > 0 ? getImageUrl(dbProduct.images[0]) : '',
            images: dbProduct.images ? dbProduct.images.map(img => getImageUrl(img)) : [],
            category: dbProduct.category || 'General',
            brand: dbProduct.brand || '',
            markup: dbProduct.discount ? `${dbProduct.discount}%` : '250%',
            dealUnits: Math.floor((dbProduct.platformUnits || 200) / 12), // Calculate as platformUnits / 12
            seller: dbProduct.seller,
            sellerInfo: dbProduct.sellerInfo,
            save: parseFloat(dbProduct.savings) || 0, // Add the single savings field
            variations: dbProduct.variations || [], // Add variations from database
            showEvaluation: dbProduct.name.toLowerCase().includes('nose ring') ||
                           dbProduct.name.toLowerCase().includes('bulb') ||
                           dbProduct.name.toLowerCase().includes('fuse') ||
                           dbProduct.name.toLowerCase().includes('lampshade') ||
                           dbProduct.name.toLowerCase().includes('lamp') ||
                           (dbProduct.profitCalculations || dbProduct.profitEvaluation), // Show if admin panel data exists
            description: dbProduct.description || `High-quality ${dbProduct.name} available at wholesale prices.`,
            features: dbProduct.features && dbProduct.features.length > 0 ? dbProduct.features : [
              'Amazon\'s Choice Product',
              'Fast Shipping Available',
              'Quality Guaranteed',
              'Verified Supplier',
              'Bulk Orders Welcome'
            ],
            dealInfo: {
              location: 'International',
              flag: '🌍',
              minOrder: `${dbProduct.dealUnits || Math.floor((dbProduct.platformUnits || 200) / 12)} Unit`,
              condition: 'New'
            },
            specifications: {
              'Material': 'Premium Quality',
              'Condition': 'New',
              'Origin': 'International'
            },
            platforms: [
              { name: 'RRP', price: '?420.99', grossProfit: '?328.39', markup: '354.63%' },
              { name: 'Amazon', price: '?419.00', grossProfit: '?326.40', markup: '352.48%' },
              { name: 'eBay', price: '?199.00', grossProfit: '?106.40', markup: '114.90%' }
            ],
            testimonials: [
              {
                name: 'Ahmed Khan',
                location: 'Karachi, Pakistan',
                rating: 5,
                comment: 'Excellent quality product! Received exactly as described. Great for reselling on Amazon. Very satisfied with the purchase and profit margins.',
                date: '2 weeks ago'
              },
              {
                name: 'Muhammad Raza',
                location: 'Lahore, Pakistan',
                rating: 5,
                comment: 'Fast shipping and good profit margins. The product quality exceeded my expectations. Will definitely order again for my business!',
                date: '1 month ago'
              },
              {
                name: 'Ali Hassan',
                location: 'Islamabad, Pakistan',
                rating: 5,
                comment: 'Perfect for wholesale business. Great communication from seller and quick delivery. Highly recommended for resellers!',
                date: '3 weeks ago'
              },
              {
                name: 'Bilal Ahmed',
                location: 'Faisalabad, Pakistan',
                rating: 4,
                comment: 'Good value for money. Product matches the description. Shipping was a bit slow but overall satisfied with quality.',
                date: '1 month ago'
              },
              {
                name: 'Usman Malik',
                location: 'Multan, Pakistan',
                rating: 5,
                comment: 'Outstanding service! The products are exactly what I needed for my online store. Will be a repeat customer for sure.',
                date: '2 months ago'
              },
              {
                name: 'Hamza Tariq',
                location: 'Rawalpindi, Pakistan',
                rating: 5,
                comment: 'Fantastic wholesale prices and excellent quality. My customers love these products. Thank you for great service!',
                date: '1 week ago'
              }
            ]
          }
          
          // Add profit data from database
          
          // Special debugging for the specific product (check multiple variations)
          const isTargetProduct = productData.name.toLowerCase().includes('professional smart remote') || 
                                  productData.name.toLowerCase().includes('smart remote') ||
                                  dbProduct._id === '691464c42da932427c2a4e6b';
          
          console.log('🔍 Target product check:', {
            productName: productData.name,
            productId: dbProduct._id,
            isTargetProduct: isTargetProduct
          });
          
          if (isTargetProduct) {
            console.log('🔍 DEBUGGING PROFESSIONAL SMART REMOTE - FRESH DATA:')
            console.log('- Product ID:', dbProduct._id)
            console.log('- Fetch timestamp:', new Date().toISOString())
            console.log('- Has platformComparison?', !!dbProduct.platformComparison)
            console.log('- platformComparison length:', dbProduct.platformComparison?.length)
            console.log('- Has profitCalculations?', !!dbProduct.profitCalculations)
            console.log('- Has profitEvaluation?', !!dbProduct.profitEvaluation)
            console.log('- Raw platformComparison:', JSON.stringify(dbProduct.platformComparison, null, 2))
            console.log('- Raw profitCalculations:', JSON.stringify(dbProduct.profitCalculations, null, 2))
            console.log('- Raw profitEvaluation:', JSON.stringify(dbProduct.profitEvaluation, null, 2))
            
            // Check if data matches what was saved
            if (dbProduct.platformComparison && dbProduct.platformComparison.length > 0) {
              console.log('✅ Platform comparison data found in database!')
              dbProduct.platformComparison.forEach((platform, idx) => {
                console.log(`Platform ${idx + 1}:`, {
                  name: platform.platform,
                  rrpPerUnit: platform.rrpPerUnit,
                  profitFor200Units: platform.profitFor200Units,
                  markup: platform.markup
                })
              })
            } else {
              console.log('❌ No platform comparison data found in database')
            }
          }
          
          // Use profit data from admin panel if available
          if (dbProduct.platformComparison && dbProduct.platformComparison.length > 0) {
            console.log('Using platform comparison from admin panel:', dbProduct.platformComparison)
            
            // Extract RRP from platform comparison data
            const rrpPlatform = dbProduct.platformComparison.find(platform => 
              platform.platform.toLowerCase() === 'rrp'
            );
            
            if (rrpPlatform && rrpPlatform.rrpPerUnit) {
              // Update the product RRP with the value from admin panel (already in GBP)
              const rrpInGBP = parseFloat(rrpPlatform.rrpPerUnit);
              productData.rrp = `£${rrpInGBP.toFixed(2)}`;
              console.log('✅ Updated product RRP from admin panel:', productData.rrp);
              console.log('✅ RRP Platform data:', rrpPlatform);
            }
            
            productData.platforms = dbProduct.platformComparison.map(platform => {
              const perUnitPriceGBP = parseFloat(platform.rrpPerUnit) || 0; // Already in GBP from admin panel
              const units = parseInt(platform.units) || 200; // Use platform-specific units
              const totalPriceGBP = perUnitPriceGBP * units;
              const totalProfitGBP = parseFloat(platform.profitFor200Units) || 0; // Already in GBP from admin panel
              
              console.log(`Platform ${platform.platform}:`, {
                perUnitPriceGBP: perUnitPriceGBP,
                units: units,
                totalPriceGBP: totalPriceGBP.toFixed(2),
                totalProfitGBP: totalProfitGBP.toFixed(2)
              });
              
              console.log(`🔍 Platform ${platform.platform} markup debug:`, {
                originalMarkup: platform.markup,
                markupType: typeof platform.markup,
                isEmpty: !platform.markup,
                isZeroPercent: platform.markup === '0%',
                isZero: platform.markup === '0',
                willUseFallback: !(platform.markup && platform.markup !== '0%' && platform.markup !== '0')
              });
              
              return {
                name: platform.platform,
                price: parseFloat(totalPriceGBP.toFixed(2)), // Total price for specified units in GBP
                grossProfit: parseFloat(totalProfitGBP.toFixed(2)), // Use stored profit calculation in GBP
                markup: (platform.markup && platform.markup !== '0%' && platform.markup !== '0') ? platform.markup : calculateMarkupFallback(perUnitPriceGBP, totalProfitGBP, units),
                units: units, // Store the unit quantity
                perUnitPrice: parseFloat(perUnitPriceGBP.toFixed(2)), // Store per unit price in GBP
                isPKR: false // Mark as GBP data for proper display
              };
            })
            
            // Store the unit quantity for display
            productData.platformUnits = dbProduct.platformUnits || 200;
            console.log('Final converted platforms:', productData.platforms)
          }
          
          if (dbProduct.profitCalculations || dbProduct.profitEvaluation) {
            console.log('🎯 PROFIT DATA DETECTED IN DATABASE:')
            console.log('- Has profitCalculations:', !!dbProduct.profitCalculations)
            console.log('- Has profitEvaluation:', !!dbProduct.profitEvaluation)
            console.log('- Has platformComparison:', !!dbProduct.platformComparison)
            console.log('- Profit calculations:', dbProduct.profitCalculations)
            console.log('- Profit evaluation:', dbProduct.profitEvaluation)
            console.log('- Platform comparison:', dbProduct.platformComparison)
            productData.hasProfit = true
            productData.showEvaluation = true
            
            // Prepare for profit calculations (will be set after auto-calculation)
            const costPricePKR = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
            
            // Mark that this data is from admin panel for proper display
            productData.isAdminProfitData = true;
            
            // Use admin panel profit evaluation
            if (dbProduct.profitEvaluation) {
              // Get the actual price and currency from the database
              const actualPrice = parseFloat(dbProduct.price) || 0;
              const actualCurrency = dbProduct.currency || 'GBP';
              
              // Convert to PKR for internal calculations
              let productCostPKR;
              if (actualCurrency === 'PKR') {
                productCostPKR = actualPrice;
              } else {
                // Convert from actual currency to PKR using the same rates as admin
                const currencyRates = {
                  PKR: 1,
                  USD: 0.00353,   // 1 USD = 283.32 PKR
                  GBP: 0.00272,   // 1 GBP = 367.74 PKR
                  AED: 0.01310    // 1 AED = 76.37 PKR
                };
                productCostPKR = actualPrice / currencyRates[actualCurrency];
              }
              
              console.log('🔍 PRODUCT COST LOGIC DEBUG (FIXED):');
              console.log('- Actual product price:', actualPrice, actualCurrency);
              console.log('- Converted to PKR:', productCostPKR);
              console.log('- Saved product cost (PKR):', dbProduct.profitEvaluation.productCost);
              
              // Use the saved product cost from admin panel (already in correct currency)
              let productCost = parseFloat(dbProduct.profitEvaluation.productCost) || 0;
              console.log('💰 Using saved product cost from admin panel:', productCost, 'GBP');
              
              // Use saved profit calculations if available, otherwise auto-calculate
              const balanceChange = parseFloat(dbProduct.profitEvaluation.balanceChange) || 0;
              const calculatedNetProfit = balanceChange - productCost; // Formula: Net Profit = Balance Change - Product Cost
              
              // Always use the formula: Balance Change - Product Cost = Net Profit = Profit per Unit
              // This ensures consistency across all displays
              const netProfitAndProfitPerUnit = parseFloat(calculatedNetProfit.toFixed(2)); // Both Net Profit and Profit per Unit are the same, rounded to 2 decimals
              
              console.log('🧮 PROFIT CALCULATIONS (FORMULA: Balance Change - Product Cost):');
              console.log('- Product Cost:', productCost, 'PKR');
              console.log('- Balance Change:', balanceChange, 'PKR');
              console.log('- Net Profit = Balance Change - Product Cost:', calculatedNetProfit, 'PKR');
              console.log('- Profit per Unit = Net Profit:', netProfitAndProfitPerUnit, 'PKR');
              console.log('- Formula applied consistently: ✅');
              
              // Admin panel values are in GBP, store them as GBP for display
              productData.evaluation = {
                salesProceeds: parseFloat((dbProduct.profitEvaluation.salesProceeds || 0).toFixed(2)), // GBP
                commissionBase: -(Math.abs(parseFloat((dbProduct.profitEvaluation.commission || 0).toFixed(2)))), // Negative because it's a fee, GBP
                commissionTax: -(Math.abs(parseFloat((dbProduct.profitEvaluation.commissionTax || 0).toFixed(2)))), // Negative because it's a fee, GBP
                digitalServiceBase: -(Math.abs(parseFloat((dbProduct.profitEvaluation.digitalServicesFee || 0).toFixed(2)))), // Negative because it's a fee, GBP
                digitalServiceTax: -(Math.abs(parseFloat((dbProduct.profitEvaluation.digitalServicesTax || 0).toFixed(2)))), // Negative because it's a fee, GBP
                fbaFeeBase: -(Math.abs(parseFloat((dbProduct.profitEvaluation.fbaFulfilmentFee || 0).toFixed(2)))), // Negative because it's a fee, GBP
                fbaFeeTax: -(Math.abs(parseFloat((dbProduct.profitEvaluation.fbaFulfilmentTax || 0).toFixed(2)))), // Negative because it's a fee, GBP
                totalFees: -((Math.abs(parseFloat((dbProduct.profitEvaluation.commission || 0).toFixed(2)))) + (Math.abs(parseFloat((dbProduct.profitEvaluation.commissionTax || 0).toFixed(2)))) + (Math.abs(parseFloat((dbProduct.profitEvaluation.digitalServicesFee || 0).toFixed(2)))) + (Math.abs(parseFloat((dbProduct.profitEvaluation.digitalServicesTax || 0).toFixed(2)))) + (Math.abs(parseFloat((dbProduct.profitEvaluation.fbaFulfilmentFee || 0).toFixed(2)))) + (Math.abs(parseFloat((dbProduct.profitEvaluation.fbaFulfilmentTax || 0).toFixed(2))))),
                productCost: parseFloat(productCost.toFixed(2)), // Use saved product cost from admin panel
                netProfit: netProfitAndProfitPerUnit, // Formula: Balance Change - Product Cost
                changeToBalance: parseFloat(balanceChange.toFixed(2)), // GBP
                monthlyProfit: parseFloat((dbProduct.profitEvaluation.monthlyProfit || 0).toFixed(2)), // GBP
                yearlyProfit: parseFloat((dbProduct.profitEvaluation.yearlyProfit || 0).toFixed(2)), // GBP
                isPKR: false // Mark as GBP data for proper display
              }
              
              // Set profit calculations using the consistent formula
              productData.profitCalculations = {
                costPrice: parseFloat(productCost.toFixed(2)), // Use saved product cost from admin panel (GBP)
                sellingPrice: parseFloat((dbProduct.profitEvaluation?.salesProceeds || 0).toFixed(2)), // GBP
                profitPerUnit: netProfitAndProfitPerUnit, // Formula: Balance Change - Product Cost
                monthlyProfit: parseFloat((dbProduct.profitEvaluation?.monthlyProfit || 0).toFixed(2)), // Use saved monthly profit from admin panel
                yearlyProfit: parseFloat((dbProduct.profitEvaluation?.yearlyProfit || 0).toFixed(2)), // Use saved yearly profit from admin panel
                monthlyProfitPKR: 0, // Not needed anymore
                isPKR: false // Mark as GBP data for proper display
              }
              
              console.log('✅ CONSISTENT PROFIT VALUES APPLIED:');
              console.log('- Amazon FBA Calculator Net Profit:', netProfitAndProfitPerUnit, 'PKR');
              console.log('- Profit Calculations Profit per Unit:', netProfitAndProfitPerUnit, 'PKR');
              console.log('- Values are identical: ✅');
              console.log('- Formula: Balance Change (' + balanceChange + ') - Product Cost (' + productCost + ') = ' + netProfitAndProfitPerUnit);
              
              console.log('✅ Admin profit calculations applied (PKR) with auto-calculated values:', productData.profitCalculations)
              
              // Mark that this data is from admin panel for proper display
              productData.isAdminProfitData = true;
              console.log('✅ Admin profit evaluation applied (PKR):', productData.evaluation)
              
              // Special debugging for target product
              if (isTargetProduct) {
                console.log('🎯 FINAL EVALUATION FOR TARGET PRODUCT:');
                console.log('- productCost used:', productCost);
                console.log('- Full evaluation object:', productData.evaluation);
              }
            } else if (dbProduct.profitCalculations) {
              // Handle case where there are profit calculations but no profit evaluation
              productData.profitCalculations = {
                costPrice: costPricePKR, // Keep in PKR
                sellingPrice: 0, // No evaluation data
                profitPerUnit: dbProduct.profitCalculations.profitPerUnit || 0, // Use stored value
                monthlyProfit: dbProduct.profitCalculations.profitFor200Units || 0, // PKR
                monthlyProfitPKR: dbProduct.profitCalculations.profitFor200Units || 0,
                isPKR: true // Mark as PKR data for proper conversion
              }
              
              console.log('✅ Admin profit calculations applied (PKR) without evaluation:', productData.profitCalculations)
            }
            
            console.log('🎯 Final product data with admin profit details:', {
              hasProfit: productData.hasProfit,
              showEvaluation: productData.showEvaluation,
              platforms: productData.platforms,
              profitCalculations: productData.profitCalculations,
              evaluation: productData.evaluation
            })
            
            // Special check for Professional Smart Remote
            if (productData.name.toLowerCase().includes('professional smart remote')) {
              console.log('🎯 PROFESSIONAL SMART REMOTE FINAL CHECK:')
              console.log('- hasProfit:', productData.hasProfit)
              console.log('- showEvaluation:', productData.showEvaluation)
              console.log('- isAdminProfitData:', productData.isAdminProfitData)
              console.log('- platforms count:', productData.platforms?.length)
              console.log('- platforms data:', productData.platforms)
              console.log('- profitCalculations:', productData.profitCalculations)
              console.log('- evaluation:', productData.evaluation)
              
              // Detailed condition checks
              console.log('🔍 DISPLAY CONDITION CHECKS:')
              console.log('- product.platforms exists?', !!productData.platforms)
              console.log('- product.platforms.length > 0?', productData.platforms?.length > 0)
              console.log('- product.hasProfit?', !!productData.hasProfit)
              console.log('- product.profitCalculations exists?', !!productData.profitCalculations)
              console.log('- product.showEvaluation?', !!productData.showEvaluation)
              console.log('- product.evaluation exists?', !!productData.evaluation)
              
              console.log('🎯 FINAL DISPLAY DECISIONS:')
              console.log('- Will show platform comparison?', !!(productData.platforms && productData.platforms.length > 0))
              console.log('- Will show profit calculations?', !!(productData.hasProfit && productData.profitCalculations))
              console.log('- Will show profit evaluation?', !!(productData.showEvaluation && productData.evaluation))
              
              // Force display for debugging if data exists but flags are wrong
              if (dbProduct.platformComparison && dbProduct.platformComparison.length > 0 && !productData.platforms) {
                console.log('🔧 FORCING platform display - data exists but not showing')
                
                // Extract RRP from platform comparison data
                const rrpPlatform = dbProduct.platformComparison.find(platform => 
                  platform.platform.toLowerCase() === 'rrp'
                );
                
                if (rrpPlatform && rrpPlatform.rrpPerUnit) {
                  // Update the product RRP with the value from admin panel (already in GBP)
                  productData.rrp = `£${parseFloat(rrpPlatform.rrpPerUnit).toFixed(2)}`;
                  console.log('🔧 FORCING RRP update from admin panel:', productData.rrp);
                }
                
                productData.platforms = dbProduct.platformComparison.map(platform => {
                  const units = platform.units || 200; // Use platform-specific units
                  const perUnitPriceGBP = parseFloat(platform.rrpPerUnit) || 0; // Already in GBP
                  const totalPriceGBP = perUnitPriceGBP * units;
                  const totalProfitGBP = parseFloat(platform.profitFor200Units) || 0; // Already in GBP
                  return {
                    name: platform.platform,
                    price: parseFloat(totalPriceGBP.toFixed(2)),
                    grossProfit: parseFloat(totalProfitGBP.toFixed(2)),
                    markup: (platform.markup && platform.markup !== '0%' && platform.markup !== '0') ? platform.markup : calculateMarkupFallback(perUnitPriceGBP, totalProfitGBP, units),
                    units: units,
                    perUnitPrice: parseFloat(perUnitPriceGBP.toFixed(2)),
                    isPKR: false // Already in GBP
                  };
                })
                
                // Store the unit quantity for display
                productData.platformUnits = dbProduct.platformUnits || 200;
              }
              
              if ((dbProduct.profitCalculations || dbProduct.profitEvaluation) && !productData.hasProfit) {
                console.log('🔧 FORCING profit display - data exists but hasProfit is false')
                productData.hasProfit = true
                productData.showEvaluation = true
              }
            }
          }
          
          // Check product type for profit calculations - ONLY if no admin panel data exists
          const hasAdminProfitData = (dbProduct.profitCalculations || dbProduct.profitEvaluation);
          console.log('🔍 Has admin profit data:', hasAdminProfitData);
          
          if (!hasAdminProfitData) {
            console.log('📝 No admin profit data found, using hardcoded calculations for specific products');
            
            const isBulb = productData.name.toLowerCase().includes('bulb')
            const isNoseRing = productData.name.toLowerCase().includes('nose ring')
            const isFuse = productData.name.toLowerCase().includes('fuse')
            const isLeatherWatchStrap = (productData.name.toLowerCase().includes('leather') && 
                                         (productData.name.toLowerCase().includes('watch strap') || 
                                          productData.name.toLowerCase().includes('watch band')))
            const isLampshade = productData.name.toLowerCase().includes('lampshade') || 
                                productData.name.toLowerCase().includes('lamp shade')
            
            if (productData.showEvaluation && isBulb) {
            const costPricePKR = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
            const costPriceGBP = costPricePKR * 0.00272 // Convert PKR to GBP
            console.log('Adding bulb profit calculations, costPrice PKR:', costPricePKR, 'GBP:', costPriceGBP)
            
            // Calculate profit for bulbs
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
              monthlyProfit: netProfit * 200,
              monthlyProfitPKR: netProfit * 200 * 350
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
            console.log('Bulb profit calculations added:', productData.hasProfit, productData.evaluation)
          } else if (isLeatherWatchStrap) {
            const costPricePKR = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
            const costPriceGBP = costPricePKR * 0.00272 // Convert PKR to GBP
            console.log('Adding watch strap profit calculations, costPrice PKR:', costPricePKR, 'GBP:', costPriceGBP)
            
            // Calculate profit for watch straps
            const sellingPrice = 5.79
            const commissionBase = -0.87
            const commissionTax = -0.18
            const digitalServiceBase = -0.05
            const digitalServiceTax = -0.01
            const fbaFeeBase = -1.46
            const fbaFeeTax = -0.29
            const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
            const changeToBalance = sellingPrice + totalFees
            const netProfit = changeToBalance - costPriceGBP
            
            productData.hasProfit = true
            productData.showEvaluation = true
            productData.profitCalculations = {
              costPrice: costPriceGBP,
              sellingPrice: sellingPrice,
              profitPerUnit: netProfit,
              monthlyProfit: netProfit * 200,
              monthlyProfitPKR: netProfit * 200 * 350
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
            console.log('Leather watch strap profit calculations added:', productData.hasProfit, productData.evaluation)
          } else if (isLampshade) {
            const costPricePKR = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
            const costPriceGBP = costPricePKR * 0.00272 // Convert PKR to GBP
            console.log('Adding lampshade profit calculations, costPrice PKR:', costPricePKR, 'GBP:', costPriceGBP)
            
            // Calculate profit for lampshades
            const sellingPrice = 5.86
            const commissionBase = -0.76
            const commissionTax = -0.15
            const digitalServiceBase = -0.08
            const digitalServiceTax = -0.01
            const fbaFeeBase = -3.10
            const fbaFeeTax = -0.62
            const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
            const changeToBalance = sellingPrice + totalFees
            const netProfit = changeToBalance - costPriceGBP
            
            productData.hasProfit = true
            productData.showEvaluation = true
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
            console.log('Lampshade profit calculations added:', productData.hasProfit, productData.evaluation)
          } else if (isNoseRing) {
            const costPricePKR = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
            const costPriceGBP = costPricePKR * 0.00272 // Convert PKR to GBP
            console.log('Adding nose ring profit calculations, costPrice PKR:', costPricePKR, 'GBP:', costPriceGBP)
            
            // Calculate profit for nose rings - Updated values
            const sellingPrice = 2.99
            const commissionBase = -0.60
            const commissionTax = -0.12
            const digitalServiceBase = -0.04
            const digitalServiceTax = -0.01
            const fbaFeeBase = -1.46
            const fbaFeeTax = -0.29
            const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
            const changeToBalance = sellingPrice + totalFees
            const netProfit = changeToBalance - costPriceGBP
            
            productData.hasProfit = true
            productData.showEvaluation = true
            productData.profitCalculations = {
              costPrice: costPriceGBP,
              sellingPrice: sellingPrice,
              profitPerUnit: netProfit,
              monthlyProfit: netProfit * 200,
              monthlyProfitPKR: netProfit * 200 * 350
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
            console.log('Nose ring profit calculations added:', productData.hasProfit, productData.evaluation)
          } else if (isFuse) {
            const costPricePKR = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
            const costPriceGBP = costPricePKR * 0.00272 // Convert PKR to GBP
            console.log('Adding fuse profit calculations, costPrice PKR:', costPricePKR, 'GBP:', costPriceGBP)
            
            // Calculate profit for fuses
            const sellingPrice = 4.99
            const commissionBase = -0.75
            const commissionTax = -0.15
            const digitalServiceBase = -0.05
            const digitalServiceTax = -0.01
            const fbaFeeBase = -1.46
            const fbaFeeTax = -0.29
            const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
            const changeToBalance = sellingPrice + totalFees
            const netProfit = changeToBalance - costPriceGBP
            
            productData.hasProfit = true
            productData.showEvaluation = true
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
            console.log('Fuse profit calculations added:', productData.hasProfit, productData.evaluation)
          }
          } else {
            console.log('✅ Using admin panel profit data, skipping hardcoded calculations');
          }
          
          // Final debugging before setting product
          if (isTargetProduct) {
            console.log('🚀 SETTING FINAL PRODUCT DATA:')
            console.log('- Final productData.hasProfit:', productData.hasProfit)
            console.log('- Final productData.showEvaluation:', productData.showEvaluation)
            console.log('- Final productData.platforms:', productData.platforms)
            console.log('- Final productData.profitCalculations:', productData.profitCalculations)
            console.log('- Final productData.evaluation:', productData.evaluation)
          }
          
          console.log('🎨 Final productData with variations:', {
            hasVariations: !!productData.variations,
            variationsLength: productData.variations?.length || 0,
            variations: productData.variations,
            productId: productData.id,
            productName: productData.name
          });
          
          // Debug: Log the complete variation structure
          if (productData.variations && productData.variations.length > 0) {
            productData.variations.forEach((variation, index) => {
              console.log(`🎨 Variation ${index + 1}:`, {
                type: variation.type,
                name: variation.name,
                options: variation.options.map(option => ({
                  value: option.value,
                  productId: option.productId,
                  hasProductId: !!option.productId
                }))
              });
            });
          }
          
          // Determine current product's variation values from the variation data
          if (productData.variations && productData.variations.length > 0) {
            const currentVariations = {};
            
            productData.variations.forEach(variation => {
              console.log(`🎨 Processing variation: ${variation.type} (${variation.name})`);
              
              // Method 1: Check if current product is explicitly linked as one of the variation options
              const currentProductOption = variation.options.find(option => 
                option.productId === productData.id
              );
              
              if (currentProductOption) {
                currentVariations[variation.type] = currentProductOption.value;
                console.log(`🎨 Method 1 - Found explicit variation ${variation.type}: ${currentProductOption.value} for current product`);
                return; // Move to next variation
              }
              
              // Method 2: If current product is not linked, it might be the "base" product
              // In this case, we need to determine what value this base product represents
              
              // Check if there's an option without productId (represents the current/base product)
              const baseOption = variation.options.find(option => !option.productId);
              if (baseOption) {
                currentVariations[variation.type] = baseOption.value;
                console.log(`🎨 Method 2 - Using base variation ${variation.type}: ${baseOption.value} for current product`);
                return; // Move to next variation
              }
              
              // Method 3: If no base option exists, try to determine from product name or other clues
              // This is a fallback method when the variation setup isn't complete
              const productNameLower = productData.name.toLowerCase();
              let detectedValue = null;
              
              if (variation.type === 'color') {
                // Enhanced color detection to match backend logic
                if (productNameLower.includes('amber')) detectedValue = 'Orange'; // Amber bulbs are typically orange
                else if (productNameLower.includes('orange')) detectedValue = 'Orange';
                else if (productNameLower.includes('clear')) detectedValue = 'Clear';
                else if (productNameLower.includes('red')) detectedValue = 'Red';
                else if (productNameLower.includes('blue')) detectedValue = 'Blue';
                else if (productNameLower.includes('green')) detectedValue = 'Green';
                else if (productNameLower.includes('black')) detectedValue = 'Black';
                else if (productNameLower.includes('white')) detectedValue = 'White';
                else if (productNameLower.includes('yellow')) detectedValue = 'Yellow';
                else if (productNameLower.includes('pink')) detectedValue = 'Pink';
                else if (productNameLower.includes('purple')) detectedValue = 'Purple';
                else if (productNameLower.includes('brown')) detectedValue = 'Brown';
                else if (productNameLower.includes('grey') || productNameLower.includes('gray')) detectedValue = 'Grey';
                else if (productNameLower.includes('silver')) detectedValue = 'Silver';
                else if (productNameLower.includes('gold')) detectedValue = 'Gold';
              } else if (variation.type === 'size') {
                if (productNameLower.includes('small')) detectedValue = 'Small';
                else if (productNameLower.includes('medium')) detectedValue = 'Medium';
                else if (productNameLower.includes('large')) detectedValue = 'Large';
                else if (productNameLower.includes('xl')) detectedValue = 'XL';
                else if (productNameLower.includes('xxl')) detectedValue = 'XXL';
              } else if (variation.type === 'style') {
                if (productNameLower.includes('classic')) detectedValue = 'Classic';
                else if (productNameLower.includes('modern')) detectedValue = 'Modern';
                else if (productNameLower.includes('vintage')) detectedValue = 'Vintage';
                else if (productNameLower.includes('premium')) detectedValue = 'Premium';
                else if (productNameLower.includes('deluxe')) detectedValue = 'Deluxe';
                else if (productNameLower.includes('basic')) detectedValue = 'Basic';
              }
              
              // If we detected a value, check if it exists in the variation options
              if (detectedValue) {
                const matchingOption = variation.options.find(option => 
                  option.value.toLowerCase() === detectedValue.toLowerCase()
                );
                if (matchingOption) {
                  currentVariations[variation.type] = detectedValue;
                  console.log(`🎨 Method 3 - Detected variation ${variation.type}: ${detectedValue} from product name`);
                } else {
                  console.log(`🎨 Detected value ${detectedValue} not found in options:`, variation.options.map(o => o.value));
                }
              } else {
                console.log(`🎨 Could not detect variation value for ${variation.type} from product name: ${productData.name}`);
              }
            });
            
            // Set the determined variations as the initial selection
            if (Object.keys(currentVariations).length > 0) {
              console.log('🎨 Setting determined variations:', currentVariations);
              setSelectedVariations(currentVariations);
            } else {
              console.log('🎨 No specific variations determined, will show variation names');
            }
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
      const badgeParam = searchParams.get('badge')
      const badgeTextParam = searchParams.get('badgeText')
      const badgeColorParam = searchParams.get('badgeColor')
      const badgeIconParam = searchParams.get('badgeIcon')
      
      console.log('URL params:', { nameParam, imgParam, priceParam, badgeParam, badgeTextParam, badgeColorParam })
      
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
          rrp: nameParam.toLowerCase().includes('nose ring') ? '£3.49' : `₨${originalPrice.toFixed(2)}`,
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
            location: 'International',
            flag: '🌍',
            minOrder: `${Math.floor(200 / 12)} Unit`, // Default calculation for URL params
            condition: 'New'
          },
          specifications: {
            'Material': 'Premium Quality',
            'Condition': 'New',
            'Origin': 'International'
          },
          description: `High-quality ${nameParam} available at wholesale prices. Perfect for Amazon FBA sellers and retailers. This product has excellent reviews and consistent sales performance. Sourced from verified international suppliers with quality assurance.`,
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
              location: 'Karachi',
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
        console.log('Has "watch strap"?:', productData.name.toLowerCase().includes('watch strap'))
        console.log('Has "leather watch strap"?:', productData.name.toLowerCase().includes('leather') && productData.name.toLowerCase().includes('watch strap'))
        console.log('Has "lampshade"?:', productData.name.toLowerCase().includes('lampshade'))
        
        // Check product type for profit calculations
        const isBulb = productData.name.toLowerCase().includes('bulb')
        const isNoseRing = productData.name.toLowerCase().includes('nose ring')
        const isFuse = productData.name.toLowerCase().includes('fuse')
        const isLeatherWatchStrap = (productData.name.toLowerCase().includes('leather') && 
                                     (productData.name.toLowerCase().includes('watch strap') || 
                                      productData.name.toLowerCase().includes('watch band')))
        const isLampshade = productData.name.toLowerCase().includes('lampshade') || 
                            productData.name.toLowerCase().includes('lamp shade')
        
        if (productData.showEvaluation && isBulb) {
          const costPrice = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
          console.log('Adding bulb profit calculations, costPrice:', costPrice)
          
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
          console.log('Bulb profit calculations added:', productData.hasProfit, productData.profitCalculations)
        } else if (isLeatherWatchStrap) {
          const costPrice = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
          console.log('Adding watch strap profit calculations, costPrice:', costPrice)
          
          // Calculate profit for watch straps
          const sellingPrice = 5.79
          const commissionBase = -0.87
          const commissionTax = -0.18
          const digitalServiceBase = -0.05
          const digitalServiceTax = -0.01
          const fbaFeeBase = -1.46
          const fbaFeeTax = -0.29
          const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
          const changeToBalance = sellingPrice + totalFees
          const netProfit = changeToBalance - costPrice
          
          productData.hasProfit = true
          productData.showEvaluation = true
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
          console.log('Leather watch strap profit calculations added:', productData.hasProfit, productData.profitCalculations)
        } else if (isLampshade) {
          const costPrice = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
          console.log('Adding lampshade profit calculations, costPrice:', costPrice)
          
          // Calculate profit for lampshades
          const sellingPrice = 5.86
          const commissionBase = -0.76
          const commissionTax = -0.15
          const digitalServiceBase = -0.08
          const digitalServiceTax = -0.01
          const fbaFeeBase = -3.10
          const fbaFeeTax = -0.62
          const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
          const changeToBalance = sellingPrice + totalFees
          const netProfit = changeToBalance - costPrice
          
          productData.hasProfit = true
          productData.showEvaluation = true
          productData.profitCalculations = {
            costPrice: costPrice,
            sellingPrice: sellingPrice,
            profitPerUnit: netProfit,
            monthlyProfit: netProfit * 200,
            monthlyProfitPKR: netProfit * 200 * 350
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
          console.log('Lampshade profit calculations added:', productData.hasProfit, productData.profitCalculations)
        } else if (isNoseRing) {
          const costPrice = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
          console.log('Adding nose ring profit calculations, costPrice:', costPrice)
          
          // Calculate profit for nose rings - Updated values
          const sellingPrice = 2.99
          const commissionBase = -0.60
          const commissionTax = -0.12
          const digitalServiceBase = -0.04
          const digitalServiceTax = -0.01
          const fbaFeeBase = -1.46
          const fbaFeeTax = -0.29
          const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
          const changeToBalance = sellingPrice + totalFees
          const netProfit = changeToBalance - costPrice
          
          productData.hasProfit = true
          productData.showEvaluation = true
          productData.profitCalculations = {
            costPrice: costPrice,
            sellingPrice: sellingPrice,
            profitPerUnit: netProfit,
            monthlyProfit: netProfit * 200,
            monthlyProfitPKR: netProfit * 200 * 350
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
          console.log('Nose ring profit calculations added:', productData.hasProfit, productData.profitCalculations)
        } else if (isFuse) {
          const costPrice = parseFloat(productData.price.replace(/[₨£$€]/g, '').trim())
          console.log('Adding fuse profit calculations, costPrice:', costPrice)
          
          // Calculate profit for fuses
          const sellingPrice = 4.99
          const commissionBase = -0.75
          const commissionTax = -0.15
          const digitalServiceBase = -0.05
          const digitalServiceTax = -0.01
          const fbaFeeBase = -1.46
          const fbaFeeTax = -0.29
          const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
          const changeToBalance = sellingPrice + totalFees
          const netProfit = changeToBalance - costPrice
          
          productData.hasProfit = true
          productData.showEvaluation = true
          productData.profitCalculations = {
            costPrice: costPrice,
            sellingPrice: sellingPrice,
            profitPerUnit: netProfit,
            monthlyProfit: netProfit * 200,
            monthlyProfitPKR: netProfit * 200 * 350
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
          console.log('Fuse profit calculations added:', productData.hasProfit, productData.profitCalculations)
        }
        
          console.log('🚀 FINAL PRODUCT DATA BEING SET:')
          console.log('- Product ID:', productData.id)
          console.log('- Product Name:', productData.name)
          console.log('- Has platforms:', !!productData.platforms)
          console.log('- Platforms length:', productData.platforms?.length)
          console.log('- Platforms data:', productData.platforms)
          console.log('- Has profitCalculations:', !!productData.profitCalculations)
          console.log('- ProfitCalculations data:', productData.profitCalculations)
          console.log('- Has evaluation:', !!productData.evaluation)
          console.log('- Evaluation data:', productData.evaluation)
          console.log('- hasProfit flag:', productData.hasProfit)
          console.log('- showEvaluation flag:', productData.showEvaluation)
          console.log('- isAdminProfitData flag:', productData.isAdminProfitData)
          
          // Test validation functions immediately
          console.log('🧪 TESTING VALIDATION FUNCTIONS:')
          const testProduct = productData;
          console.log('- hasValidPlatformData result:', !!(testProduct?.platforms && testProduct.platforms.length > 0))
          console.log('- hasValidProfitData result:', !!(testProduct?.profitCalculations))
          console.log('- hasValidEvaluationData result:', !!(testProduct?.evaluation))
          
          // Force show profit sections if data exists (for debugging)
          if (testProduct?.platforms && testProduct.platforms.length > 0) {
            console.log('🔧 FORCING platform display - data exists');
            productData.forceShowPlatforms = true;
          }
          if (testProduct?.profitCalculations) {
            console.log('🔧 FORCING profit calculations display - data exists');
            productData.forceShowProfitCalculations = true;
          }
          if (testProduct?.evaluation) {
            console.log('🔧 FORCING evaluation display - data exists');
            productData.forceShowEvaluation = true;
          }
          
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
              price: (foundProduct.currency || 'GBP') === 'GBP' ? `£${foundProduct.price}` : 
                     foundProduct.currency === 'USD' ? `$${foundProduct.price}` :
                     foundProduct.currency === 'AED' ? `د.إ${foundProduct.price}` :
                     `₨${foundProduct.price}`,
              rrp: foundProduct.originalPrice ? `₨${foundProduct.originalPrice}` : '?420.99',
              rating: foundProduct.rating || 4.5,
              dealUnits: Math.floor((foundProduct.platformUnits || 200) / 12), // Calculate as platformUnits / 12
              seller: foundProduct.seller,
              sellerInfo: foundProduct.sellerInfo,
              reviews: foundProduct.reviews || 100,
              image: productImage,
              images: foundProduct.images ? foundProduct.images.map(img => getImageUrl(img)) : [productImage, productImage, productImage, productImage],
              category: foundProduct.category,
              brand: foundProduct.brand || '',
              markup: foundProduct.discount ? `${foundProduct.discount}%` : '250%',
              showEvaluation: shouldShowEvaluation,
              platforms: [
                { name: 'RRP', price: '?420.99', grossProfit: '?328.39', markup: '354.63%' },
                { name: 'Amazon', price: '?419.00', grossProfit: '?326.40', markup: '352.48%' },
                { name: 'eBay', price: '?199.00', grossProfit: '?106.40', markup: '114.90%' }
              ],
              dealInfo: {
                location: 'International',
                flag: '🌍',
                minOrder: `${foundProduct.dealUnits || Math.floor((foundProduct.platformUnits || 200) / 12)} Unit`,
                condition: 'New'
              },
              specifications: {
                'Material': 'Premium Quality',
                'Condition': 'New',
                'Origin': 'International'
              },
              description: foundProduct.description || `High-quality ${foundProduct.name} available at wholesale prices. Perfect for Amazon FBA sellers and retailers. This product has excellent reviews and consistent sales performance. Sourced from verified international suppliers with quality assurance.`,
              features: foundProduct.features && foundProduct.features.length > 0 ? foundProduct.features : [
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
            
            // Check product type for profit calculations
            const isBulb = foundProduct.name.toLowerCase().includes('bulb')
            const isNoseRing = foundProduct.name.toLowerCase().includes('nose ring')
            const isFuse = foundProduct.name.toLowerCase().includes('fuse')
            const isLeatherWatchStrap = (foundProduct.name.toLowerCase().includes('leather') && 
                                         (foundProduct.name.toLowerCase().includes('watch strap') || 
                                          foundProduct.name.toLowerCase().includes('watch band')))
            const isLampshade = foundProduct.name.toLowerCase().includes('lampshade') || 
                                foundProduct.name.toLowerCase().includes('lamp shade')
            
            if (shouldShowEvaluation && isBulb) {
              const costPrice = foundProduct.price
              
              // Calculate profit for bulbs
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
            } else if (isLeatherWatchStrap) {
              const costPrice = foundProduct.price
              
              // Calculate profit for leather watch straps
              const sellingPrice = 5.79
              const commissionBase = -0.87
              const commissionTax = -0.18
              const digitalServiceBase = -0.05
              const digitalServiceTax = -0.01
              const fbaFeeBase = -1.46
              const fbaFeeTax = -0.29
              const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
              const changeToBalance = sellingPrice + totalFees
              const netProfit = changeToBalance - costPrice
              
              productData.hasProfit = true
              productData.showEvaluation = true
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
            } else if (isLampshade) {
              const costPrice = foundProduct.price
              
              // Calculate profit for lampshades
              const sellingPrice = 5.86
              const commissionBase = -0.76
              const commissionTax = -0.15
              const digitalServiceBase = -0.08
              const digitalServiceTax = -0.01
              const fbaFeeBase = -3.10
              const fbaFeeTax = -0.62
              const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
              const changeToBalance = sellingPrice + totalFees
              const netProfit = changeToBalance - costPrice
              
              productData.hasProfit = true
              productData.showEvaluation = true
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
            } else if (isNoseRing) {
              const costPrice = foundProduct.price
              
              // Calculate profit for nose rings - Updated values
              const sellingPrice = 2.99
              const commissionBase = -0.60
              const commissionTax = -0.12
              const digitalServiceBase = -0.04
              const digitalServiceTax = -0.01
              const fbaFeeBase = -1.46
              const fbaFeeTax = -0.29
              const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
              const changeToBalance = sellingPrice + totalFees
              const netProfit = changeToBalance - costPrice
              
              productData.hasProfit = true
              productData.showEvaluation = true
              productData.profitCalculations = {
                costPrice: costPrice,
                sellingPrice: sellingPrice,
                profitPerUnit: netProfit,
                monthlyProfit: netProfit * 200,
                monthlyProfitPKR: netProfit * 200 * 350
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
            } else if (isFuse) {
              const costPrice = foundProduct.price
              
              // Calculate profit for fuses
              const sellingPrice = 4.99
              const commissionBase = -0.75
              const commissionTax = -0.15
              const digitalServiceBase = -0.05
              const digitalServiceTax = -0.01
              const fbaFeeBase = -1.46
              const fbaFeeTax = -0.29
              const totalFees = commissionBase + commissionTax + digitalServiceBase + digitalServiceTax + fbaFeeBase + fbaFeeTax
              const changeToBalance = sellingPrice + totalFees
              const netProfit = changeToBalance - costPrice
              
              productData.hasProfit = true
              productData.showEvaluation = true
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
            if (foundProduct.seller && isAdminLoggedIn) {
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
                price: (p.currency || 'GBP') === 'GBP' ? `£${p.price}` : 
                       p.currency === 'USD' ? `$${p.price}` :
                       p.currency === 'AED' ? `د.إ${p.price}` :
                       `₨${p.price}`,
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
          
          // Determine which endpoint to use based on user type
          const sellerToken = localStorage.getItem('sellerToken');
          let apiEndpoint = `products/public/${id}`;
          let headers = {
            'Content-Type': 'application/json',
          };
          
          // Use seller endpoint if seller is logged in
          if (sellerToken) {
            apiEndpoint = `products/seller/detail/${id}`;
            headers.Authorization = `Bearer ${sellerToken}`;
            console.log('🔐 Using seller endpoint for direct fetch');
          } else {
            console.log('🌐 Using public endpoint for direct fetch');
          }
          
          const response = await fetch(apiConfig.getApiUrl(apiEndpoint), {
            method: 'GET',
            headers,
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
                price: foundProduct.currency === 'GBP' ? `£${foundProduct.price}` : 
                       foundProduct.currency === 'USD' ? `$${foundProduct.price}` :
                       foundProduct.currency === 'AED' ? `د.إ${foundProduct.price}` :
                       `₨${foundProduct.price}`, // Use the actual currency from database
                rrp: foundProduct.originalPrice ? `₨${foundProduct.originalPrice}` : '?420.99',
                rating: foundProduct.rating || 4.5,
                dealUnits: Math.floor((foundProduct.platformUnits || 200) / 12), // Calculate as platformUnits / 12
                seller: foundProduct.seller,
                sellerInfo: foundProduct.sellerInfo,
                reviews: foundProduct.reviews || 100,
                image: productImage,
                images: foundProduct.images ? foundProduct.images.map(img => getImageUrl(img)) : [productImage],
                category: foundProduct.category,
                brand: foundProduct.brand || '',
                markup: foundProduct.discount ? `${foundProduct.discount}%` : '250%',
                showEvaluation: shouldShowEvaluation,
                platforms: [
                  { name: 'RRP', price: '?420.99', grossProfit: '?328.39', markup: '354.63%' },
                  { name: 'Amazon', price: '?419.00', grossProfit: '?326.40', markup: '352.48%' },
                  { name: 'eBay', price: '?199.00', grossProfit: '?106.40', markup: '114.90%' }
                ],
                dealInfo: {
                  location: 'International',
                  flag: '🌍',
                  minOrder: `${foundProduct.dealUnits || Math.floor((foundProduct.platformUnits || 200) / 12)} Unit`,
                  condition: 'New'
                },
                specifications: {
                  'Material': 'Premium Quality',
                  'Condition': 'New',
                  'Origin': 'International'
                },
                description: foundProduct.description || `High-quality ${foundProduct.name} available at wholesale prices.`,
                features: foundProduct.features && foundProduct.features.length > 0 ? foundProduct.features : [
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
              
              if (foundProduct.seller && isAdminLoggedIn) {
                await fetchSellerInfo(foundProduct.seller);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching product by ID:', error)
          
          // If database fetch fails and ID looks like a hardcoded product ID, try fallback
          if (id && (id.startsWith('prod-') || !id.match(/^[0-9a-fA-F]{24}$/))) {
            console.log('Database fetch failed for custom ID, trying hardcoded data fallback...');
            
            try {
              // Try to get product from hardcoded data
              const hardcodedProduct = getProductById(id);
              if (hardcodedProduct) {
                console.log('Found hardcoded product:', hardcodedProduct.name);
                setProduct(hardcodedProduct);
                setLoading(false);
                return;
              }
            } catch (fallbackError) {
              console.error('Fallback to hardcoded data also failed:', fallbackError);
            }
          }
        }
      }
      
      setLoading(false)
    }
    
    fetchProduct()
  }, [id, searchParams])

  // Listen for variation updates from admin panel
  useEffect(() => {
    const handleVariationUpdate = (event) => {
      if (event.key === 'variationsUpdated' && event.newValue === id) {
        console.log('🔄 Variations updated for current product, refreshing...');
        // Force refresh the product data
        const fetchProduct = async () => {
          try {
            const cacheBuster = new Date().getTime();
            
            // Determine which endpoint to use based on user type
            const sellerToken = localStorage.getItem('sellerToken');
            let apiEndpoint = `products/public/${id}?_=${cacheBuster}`;
            let headers = {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            };
            
            // Use seller endpoint if seller is logged in
            if (sellerToken) {
              apiEndpoint = `products/seller/detail/${id}?_=${cacheBuster}`;
              headers.Authorization = `Bearer ${sellerToken}`;
              console.log('🔐 Using seller endpoint for variation refresh');
            } else {
              console.log('🌐 Using public endpoint for variation refresh');
            }
            
            const response = await fetch(apiConfig.getApiUrl(apiEndpoint), {
              cache: 'no-cache',
              headers
            });
            
            if (response.ok) {
              const dbProduct = await response.json();
              console.log('✅ Product refreshed after variation update:', dbProduct.variations);
              // Update the product state with fresh data
              setProduct(prevProduct => ({
                ...prevProduct,
                variations: dbProduct.variations
              }));
            }
          } catch (error) {
            console.error('❌ Error refreshing product after variation update:', error);
          }
        };
        
        fetchProduct();
        // Clear the flag
        localStorage.removeItem('variationsUpdated');
      }
    };

    window.addEventListener('storage', handleVariationUpdate);
    
    return () => {
      window.removeEventListener('storage', handleVariationUpdate);
    };
  }, [id])

  // Check if buyer is logged in and if supplier is unlocked
  useEffect(() => {
    const checkLoginAndUnlock = async () => {
      const token = localStorage.getItem('buyerToken')
      setIsBuyerLoggedIn(!!token)

      if (token) {
        try {
          // Check buyer's payment verification status
          const response = await fetch('/api/buyer/payment-verification-status', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.hasVerification && data.status === 'approved') {
              setIsSupplierUnlocked(true);
            }
          }
        } catch (error) {
          console.error('Error checking payment verification status:', error);
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
  
  // Use database products if available, fallback to hardcoded for backward compatibility
  const topDeals = topDealsFromDB.length > 0 ? topDealsFromDB : products
    .filter(p => p.id !== product?.id)
    .sort((a, b) => {
      const markupA = parseFloat(a.markup?.replace(/[^0-9.]/g, '') || 0)
      const markupB = parseFloat(b.markup?.replace(/[^0-9.]/g, '') || 0)
      return markupB - markupA
    })
    .slice(0, 6)
  
  // Use database products if available, fallback to hardcoded for backward compatibility
  const mostPopular = mostPopularFromDB.length > 0 ? mostPopularFromDB : products
    .filter(p => p.id !== product?.id)
    .sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
    .slice(0, 6)

  // Helper function to safely format numbers and filter NaN
  const safeNumber = (value) => {
    const num = parseFloat(value);
    return isNaN(num) || !isFinite(num) ? 0 : parseFloat(num.toFixed(2));
  };

  // Helper function to convert GBP values to selected currency
  const convertFromGBP = (gbpValue) => {
    const value = safeNumber(gbpValue);
    // Convert GBP to PKR first, then to target currency
    const pkrValue = value / 0.00272; // GBP to PKR
    const converted = pkrValue * currencyRates[currency];
    return `${currencySymbols[currency]}${converted.toFixed(2)}`;
  };

  // Helper function to convert PKR values to selected currency
  const convertFromPKR = (pkrValue) => {
    const value = safeNumber(pkrValue);
    // Since data is saved in GBP, just format it as GBP
    return `£${value.toFixed(2)}`;
  };

  // Helper function to convert profit values based on data source
  const convertProfitValue = (value) => {
    // Since you're saving data in GBP, always format as GBP with proper decimal precision
    const numValue = safeNumber(value);
    return `£${numValue.toFixed(2)}`;
  };

  // Check if platform data has actual values (not dummy/empty data)
  const hasValidPlatformData = () => {
    console.log('🔍 Checking platform data validity:', {
      hasPlatforms: !!product?.platforms,
      platformsLength: product?.platforms?.length,
      platforms: product?.platforms,
      hasRRP: !!product?.rrp,
      rrp: product?.rrp
    });
    
    if (product?.platforms && product.platforms.length > 0) {
      // Check if any platform has non-zero values
      const isValid = product.platforms.some(platform => {
        const priceValue = parseFloat(String(platform.price || 0).replace(/[£₨$€]/g, ''));
        const profitValue = parseFloat(String(platform.grossProfit || 0).replace(/[£₨$€]/g, ''));
        const perUnitValue = parseFloat(String(platform.perUnitPrice || 0));
        
        console.log(`Platform ${platform.name} validation:`, {
          price: platform.price,
          priceValue,
          grossProfit: platform.grossProfit,
          profitValue,
          perUnitPrice: platform.perUnitPrice,
          perUnitValue,
          isValid: priceValue > 0 || profitValue > 0 || perUnitValue > 0
        });
        
        return priceValue > 0 || profitValue > 0 || perUnitValue > 0;
      });
      console.log('✅ Platform data validity result (from platforms):', isValid);
      return isValid;
    }
    
    // For calculated data, check if we have valid RRP
    if (product?.rrp) {
      const rrpValue = parseFloat(product.rrp.replace(/[£₨$€]/g, ''));
      const isValid = !isNaN(rrpValue) && rrpValue > 0;
      console.log('✅ Platform data validity result (from RRP):', isValid);
      return isValid;
    }
    
    console.log('❌ No valid platform data found');
    return false;
  };

  // Check if profit calculations have actual values (not dummy/empty data)
  const hasValidProfitData = () => {
    console.log('🔍 Checking profit data validity:', {
      hasProfitCalculations: !!product?.profitCalculations,
      profitCalculations: product?.profitCalculations,
      profitPerUnit: product?.profitCalculations?.profitPerUnit,
      monthlyProfit: product?.profitCalculations?.monthlyProfit
    });
    
    if (!product?.profitCalculations) return false;
    
    // Check if any profit calculation has non-zero values
    const isValid = (
      (product.profitCalculations.profitPerUnit && parseFloat(String(product.profitCalculations.profitPerUnit).replace(/[£₨$€]/g, '')) > 0) ||
      (product.profitCalculations.profitFor200Units && parseFloat(String(product.profitCalculations.profitFor200Units).replace(/[£₨$€]/g, '')) > 0) ||
      (product.profitCalculations.monthlyProfit && parseFloat(String(product.profitCalculations.monthlyProfit).replace(/[£₨$€]/g, '')) > 0)
    );
    
    console.log('✅ Profit data validity result:', isValid);
    return isValid;
  };

  // Check if profit evaluation has actual values (not dummy/empty data)
  const hasValidEvaluationData = () => {
    console.log('🔍 Checking evaluation data validity:', {
      hasEvaluation: !!product?.evaluation,
      evaluation: product?.evaluation,
      salesProceeds: product?.evaluation?.salesProceeds,
      netProfit: product?.evaluation?.netProfit,
      productCost: product?.evaluation?.productCost
    });
    
    if (!product?.evaluation) return false;
    
    // Check if any evaluation field has non-zero values
    const isValid = (
      (product.evaluation.salesProceeds && parseFloat(String(product.evaluation.salesProceeds).replace(/[£₨$€]/g, '')) > 0) ||
      (product.evaluation.netProfit && parseFloat(String(product.evaluation.netProfit).replace(/[£₨$€]/g, '')) !== 0) ||
      (product.evaluation.productCost && parseFloat(String(product.evaluation.productCost).replace(/[£₨$€]/g, '')) > 0)
    );
    
    console.log('✅ Evaluation data validity result:', isValid);
    return isValid;
  };

  // Helper function to get Amazon markup from Platform Comparison data
  const getAmazonMarkupFromPlatforms = () => {
    try {
      const platformData = calculatePlatformData();
      if (platformData && platformData.length > 0) {
        // Look for Amazon platform
        const amazonPlatform = platformData.find(platform => 
          platform.name && platform.name.toLowerCase().includes('amazon')
        );
        
        if (amazonPlatform && amazonPlatform.markup) {
          console.log('✅ Found Amazon markup from platforms:', amazonPlatform.markup);
          return amazonPlatform.markup;
        }
      }
      
      // Backup: try direct platform data
      if (product.platforms && product.platforms.length > 0) {
        const amazonPlatform = product.platforms.find(platform => 
          platform.name && platform.name.toLowerCase().includes('amazon')
        );
        
        if (amazonPlatform && amazonPlatform.markup) {
          console.log('✅ Found Amazon markup from direct platforms:', amazonPlatform.markup);
          return amazonPlatform.markup;
        }
      }
    } catch (error) {
      console.error('❌ Error getting Amazon markup:', error);
    }
    return null;
  };

  // Calculate platform comparison data dynamically
  const calculatePlatformData = () => {
    // Debug logging for platform data
    const isTargetProduct = product?.name?.toLowerCase().includes('professional smart remote') || 
                           product?.name?.toLowerCase().includes('smart remote');
    
    if (isTargetProduct) {
      console.log('🔍 calculatePlatformData called for target product');
      console.log('- product?.platforms:', product?.platforms);
      console.log('- product?.platforms length:', product?.platforms?.length);
      console.log('- product name:', product?.name);
      console.log('- selectedUnits:', selectedUnits);
    }
    
    // Get product cost price in GBP for calculations
    const getProductCostGBP = () => {
      const costPriceRaw = parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0);
      const isPKR = product?.price?.includes('₨') || product?.price?.includes('Rs');
      const isGBP = product?.price?.includes('£');
      
      if (isPKR) {
        return costPriceRaw * 0.00272; // Convert PKR to GBP
      } else if (isGBP) {
        return costPriceRaw; // Already in GBP
      } else {
        // Assume PKR if no currency symbol
        return costPriceRaw * 0.00272;
      }
    };
    
    const productCostGBP = getProductCostGBP();
    
    // If we have admin panel platform data, use it with new formula
    if (product?.platforms && product.platforms.length > 0) {
      if (isTargetProduct) {
        console.log('✅ Using admin panel platform data with new formula:', product.platforms);
      }
      // Use stored platform data with formula: (Platform Price - Product Cost) × Unit Sales/Year = Gross Profit
      return product.platforms.map(platform => {
        const perUnitPrice = platform.perUnitPrice || parseFloat(String(platform.price).replace(/[£₨$€]/g, '')) / (platform.units || 200);
        const platformUnits = platform.units || quantity || 200; // Use platform-specific units or current quantity
        
        // Formula: (Platform Price - Product Cost) × Unit Sales/Year = Gross Profit
        const grossProfitPerUnit = perUnitPrice - productCostGBP;
        const totalGrossProfit = grossProfitPerUnit * platformUnits;
        
        console.log(`Platform ${platform.name} calculation:`, {
          perUnitPrice: perUnitPrice,
          productCostGBP: productCostGBP,
          grossProfitPerUnit: grossProfitPerUnit,
          platformUnits: platformUnits,
          totalGrossProfit: totalGrossProfit,
          formula: `(${perUnitPrice} - ${productCostGBP}) × ${platformUnits} = ${totalGrossProfit}`
        });
        
        return {
          ...platform,
          price: perUnitPrice, // Show per unit price
          grossProfit: totalGrossProfit, // Use new formula result
          units: platformUnits,
          perUnitPrice: perUnitPrice,
          description: `Gross Profit: £${totalGrossProfit.toFixed(2)} for ${platformUnits} units`
        };
      });
    }
    
    if (isTargetProduct) {
      console.log('⚠️ No admin platform data found, using fallback calculation');
    }
    // Fallback to dynamic calculation if no admin data
    if (!product || !product.rrp) {
      if (isTargetProduct) {
        console.log('❌ No product or RRP data for fallback calculation');
      }
      return [];
    }
    
    // Extract RRP value (in GBP)
    const rrpValue = parseFloat(product.rrp.replace(/[£₨$€]/g, ''));
    if (isNaN(rrpValue)) return [];
    
    // Calculate platform prices
    const amazonPrice = rrpValue * 0.70; // 30% less than RRP
    const ebayPrice = rrpValue * 0.75; // 25% less than RRP
    
    // Formula: (Platform Price - Product Cost) × Unit Sales/Year = Gross Profit
    const rrpGrossProfitPerUnit = rrpValue - productCostGBP;
    const amazonGrossProfitPerUnit = amazonPrice - productCostGBP;
    const ebayGrossProfitPerUnit = ebayPrice - productCostGBP;
    
    const selectedUnits = quantity || 200; // Use current quantity selection
    const rrpTotalGrossProfit = rrpGrossProfitPerUnit * selectedUnits;
    const amazonTotalGrossProfit = amazonGrossProfitPerUnit * selectedUnits;
    const ebayTotalGrossProfit = ebayGrossProfitPerUnit * selectedUnits;
    
    // Calculate markup percentages: ((Platform Price - Product Cost) / Product Cost) × 100
    const rrpMarkup = productCostGBP > 0 ? (((rrpValue - productCostGBP) / productCostGBP) * 100).toFixed(2) : '0';
    const amazonMarkup = productCostGBP > 0 ? (((amazonPrice - productCostGBP) / productCostGBP) * 100).toFixed(2) : '0';
    const ebayMarkup = productCostGBP > 0 ? (((ebayPrice - productCostGBP) / productCostGBP) * 100).toFixed(2) : '0';
    
    return [
      { 
        name: 'RRP', 
        price: rrpValue,
        grossProfit: rrpTotalGrossProfit, 
        markup: `${rrpMarkup}%`,
        units: selectedUnits,
        perUnitPrice: rrpValue,
        description: `Gross Profit: £${rrpTotalGrossProfit.toFixed(2)} for ${selectedUnits} units`
      },
      { 
        name: 'Amazon', 
        price: amazonPrice,
        grossProfit: amazonTotalGrossProfit, 
        markup: `${amazonMarkup}%`,
        units: selectedUnits,
        perUnitPrice: amazonPrice,
        description: `Gross Profit: £${amazonTotalGrossProfit.toFixed(2)} for ${selectedUnits} units`
      },
      { 
        name: 'eBay', 
        price: ebayPrice,
        grossProfit: ebayTotalGrossProfit, 
        markup: `${ebayMarkup}%`,
        units: selectedUnits,
        perUnitPrice: ebayPrice,
        description: `Gross Profit: £${ebayTotalGrossProfit.toFixed(2)} for ${selectedUnits} units`
      }
    ];
  };

  // Get badge styling based on badge text or URL parameters
  const getBadgeStyle = (badgeText) => {
    // Check if we have unique badge info from URL parameters
    const badgeTextParam = searchParams.get('badgeText')
    const badgeColorParam = searchParams.get('badgeColor')
    const badgeIconParam = searchParams.get('badgeIcon')
    
    if (badgeTextParam && badgeColorParam) {
      // Use the unique badge passed from AmazonsChoice page
      return { 
        bgColor: badgeColorParam, 
        textColor: '#fff', 
        icon: 'fa-star', // Use a generic icon for FontAwesome compatibility
        text: badgeTextParam 
      }
    }
    
    if (!badgeText) {
      return { bgColor: '#dc3545', icon: 'fa-fire', text: 'Hot Deal' }
    }
    
    if (badgeText.includes('Best Seller')) {
      return { bgColor: '#ffd700', textColor: '#111', icon: 'fa-trophy', text: badgeText }
    } else if (badgeText.includes('Selling Fast')) {
      return { bgColor: '#ff6b6b', textColor: '#fff', icon: 'fa-bolt', text: badgeText }
    } else if (badgeText.includes("Amazon's Choice")) {
      return { bgColor: '#667eea', textColor: '#fff', icon: 'fa-star', text: badgeText }
    } else {
      // Default to Hot Deal for any other badge
      return { bgColor: '#dc3545', textColor: '#fff', icon: 'fa-fire', text: 'Hot Deal' }
    }
  }

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
    <div className="product-detail-page" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>

      {/* Compact Breadcrumb */}
      <div className="container mt-1 mb-1 animate__animated animate__fadeInDown">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb p-2 rounded mb-0" style={{
            fontSize: '0.8rem',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid #dee2e6'
          }}>
            {(() => {
              console.log('🍞 Breadcrumb check:', {
                returnTo: location.state?.returnTo,
                returnCategory: returnCategory,
                locationState: location.state
              });
              return location.state?.returnTo === '/admin/products' || location.state?.returnTo === '/admin/seller-listings';
            })() ? (
              <>
                <li className="breadcrumb-item">
                  <span 
                    onClick={() => {
                      const returnTo = location.state?.returnTo;
                      console.log('🔙 ProductDetail back clicked, returnTo:', returnTo, 'returnCategory:', returnCategory);
                      
                      if (returnTo === '/admin/seller-listings') {
                        navigate('/admin/seller-listings');
                      } else {
                        const backUrl = `/admin/products${returnCategory ? `?category=${returnCategory}` : ''}`;
                        navigate(backUrl, {
                          state: { category: returnCategory }
                        });
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      color: '#0066c0',
                      fontWeight: '500',
                      transition: 'color 0.2s ease'
                    }}
                    className="text-decoration-none"
                    onMouseEnter={(e) => e.target.style.color = '#ff9900'}
                    onMouseLeave={(e) => e.target.style.color = '#0066c0'}
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    {location.state?.returnTo === '/admin/seller-listings' ? 'Back to Seller Listings' : 'Back to Products'}
                  </span>
                </li>
                <li className="breadcrumb-item active" style={{fontWeight: '600', color: '#232f3e'}}>{product.name}</li>
              </>
            ) : (
              <>
                <li className="breadcrumb-item">
                  <Link to="/" className="text-decoration-none" style={{
                    color: '#0066c0',
                    fontWeight: '500',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#ff9900'}
                  onMouseLeave={(e) => e.target.style.color = '#0066c0'}
                  >
                    <i className="fas fa-home me-2"></i>Amazon's Choice
                  </Link>
                </li>
                <li className="breadcrumb-item active" style={{fontWeight: '600', color: '#232f3e'}}>{product.name}</li>
              </>
            )}
          </ol>
        </nav>
      </div>

      {/* Compact Product Detail Section */}
      <section className="product-detail-section py-1" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)'
      }}>
        <div className="container-fluid" style={{maxWidth: '1400px', padding: '0 10px'}}>
          <div className="row g-2">
            
            {/* Compact LEFT COLUMN - Product Images */}
            <div className="col-12 col-lg-4 order-1 order-lg-1">
              <div className="sticky-top" style={{top: '80px', zIndex: 10}}>
                {/* Compact Main Image Container */}
                <div className="position-relative mb-2" style={{
                  background: '#ffffff', 
                  border: '1px solid #e1e5e9', 
                  borderRadius: '8px', 
                  padding: '10px', 
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'}
                >
                  <img 
                    src={product.images && product.images[selectedImage] ? product.images[selectedImage] : product.image} 
                    alt={product.name} 
                    className="img-fluid"
                    style={{
                      width: '100%', 
                      height: window.innerWidth < 768 ? '220px' : '280px', // Increased height
                      objectFit: 'contain',
                      borderRadius: '4px',
                      transform: 'scale(1.08)', // Added zoom effect
                      padding: '8px' // Added padding to prevent clipping
                    }}
                  />
                  {/* Compact Badge */}
                  <div className="position-absolute top-0 start-0 m-1">
                    {(() => {
                      const badgeParam = searchParams.get('badge')
                      const isFromAmazonsChoice = searchParams.get('isAmazonsChoice') === 'true'
                      const badgeTextParam = searchParams.get('badgeText')
                      const badgeColorParam = searchParams.get('badgeColor')
                      
                      if (isFromAmazonsChoice && badgeTextParam && badgeColorParam) {
                        // Show only the unique badge when coming from Amazon's Choice page
                        return (
                          <span 
                            className="badge px-2 py-1"
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: '600',
                              backgroundColor: badgeColorParam,
                              color: '#fff',
                              borderRadius: '4px',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                              letterSpacing: '0.3px'
                            }}
                          >
                            <i className="fas fa-star me-1"></i>{badgeTextParam}
                          </span>
                        )
                      } else {
                        // Single badge (original logic)
                        const badgeStyle = getBadgeStyle(badgeParam)
                        return (
                          <span 
                            className="badge px-2 py-1" 
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: '600',
                              backgroundColor: badgeStyle.bgColor,
                              color: badgeStyle.textColor || '#fff',
                              borderRadius: '4px',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                              letterSpacing: '0.3px'
                            }}
                          >
                            <i className={`fas ${badgeStyle.icon} me-1`}></i>{badgeStyle.text}
                          </span>
                        )
                      }
                    })()}
                  </div>
                </div>

                {/* Compact Thumbnail Images */}
                <div className="d-flex gap-1 mb-2 overflow-auto pb-1" style={{maxWidth: '100%'}}>
                  {product.images && product.images.map((img, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      style={{
                        minWidth: '45px',
                        height: '45px',
                        border: selectedImage === idx ? '2px solid #ff9900' : '1px solid #e1e5e9',
                        borderRadius: '6px',
                        padding: '3px',
                        cursor: 'pointer',
                        background: '#fff',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedImage === idx ? '0 2px 6px rgba(255, 153, 0, 0.2)' : '0 1px 3px rgba(0,0,0,0.06)'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedImage !== idx) {
                          e.currentTarget.style.borderColor = '#ff9900';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 153, 0, 0.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedImage !== idx) {
                          e.currentTarget.style.borderColor = '#e1e5e9';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.08)';
                        }
                      }}
                    >
                      <img 
                        src={img}
                        alt={`${product.name} ${idx + 1}`}
                        style={{
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain',
                          borderRadius: '6px',
                          transform: 'scale(1.1)', // Added zoom for thumbnails
                          padding: '2px' // Added padding to prevent clipping
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Compact Money Back Guarantee */}
                <div className="border-0 mb-0" style={{
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', 
                  borderRadius: '6px',
                  boxShadow: '0 2px 6px rgba(40, 167, 69, 0.2)'
                }}>
                  <div className="text-center text-white py-2 px-2">
                    <i className="fas fa-shield-alt mb-1" style={{fontSize: '1rem'}}></i>
                    <div className="fw-bold mb-1" style={{fontSize: '0.7rem', letterSpacing: '0.3px'}}>100% Money Back Guarantee</div>
                    <small style={{fontSize: '0.6rem', opacity: 0.95, fontWeight: '500'}}>Price guaranteed or full refund</small>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Compact MIDDLE COLUMN - Title, Reviews, Price, Variations */}
            <div className="col-12 col-lg-5 order-3 order-lg-2">
              <div className="product-middle-info" style={{
                background: '#ffffff',
                borderRadius: '8px',
                padding: '12px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                border: '1px solid #e1e5e9'
              }}>
                
                {/* Compact Product Title */}
                <h1 className="fw-bold text-dark mb-2" style={{
                  fontSize: '1rem', 
                  lineHeight: '1.3',
                  fontWeight: '700',
                  color: '#232f3e',
                  letterSpacing: '-0.3px'
                }}>{product.name}</h1>
                  
                {/* Compact Rating and Reviews Section */}
                <div className="d-flex align-items-center flex-wrap mb-2 pb-2" style={{borderBottom: '1px solid #e1e5e9'}}>
                  <div className="text-warning me-2" style={{fontSize: '0.7rem'}}>
                    {renderStars(product.rating)}
                  </div>
                  <Link to="#reviews" className="me-2" style={{
                    fontSize: '0.7rem', 
                    textDecoration: 'none',
                    color: '#0066c0',
                    fontWeight: '500',
                    transition: 'color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.target.style.color = '#ff9900'}
                  onMouseLeave={(e) => e.target.style.color = '#0066c0'}
                  >
                    {product.reviews} ratings
                  </Link>
                  {(() => {
                    // Use Amazon markup from Platform Comparison, fallback to product.markup
                    const amazonMarkup = getAmazonMarkupFromPlatforms();
                    const displayMarkup = amazonMarkup || product.markup;
                    
                    if (displayMarkup) {
                      console.log('🏷️ Badge markup - Amazon:', amazonMarkup, 'Product markup:', product.markup, 'Using:', displayMarkup);
                      return (
                        <span className="badge px-2 py-1 me-2" style={{
                          fontSize: '0.6rem',
                          fontWeight: '600',
                          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                          color: '#fff',
                          borderRadius: '4px',
                          boxShadow: '0 1px 3px rgba(40, 167, 69, 0.2)',
                          letterSpacing: '0.3px'
                        }}>
                          {displayMarkup}
                        </span>
                      );
                    }
                    return null;
                  })()}

                </div>
                  
                {/* Enhanced Price Section */}
                <div className="price-section mb-3" style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                  border: '1px solid #e1e5e9',
                  borderRadius: '8px',
                  padding: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-2">
                    {/* Left side - Enhanced Price and RRP */}
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-baseline gap-2 flex-wrap mb-2">
                        <span className="fw-bold" style={{
                          fontSize: '1.6rem', 
                          color: '#B12704',
                          fontWeight: '800',
                          letterSpacing: '-0.5px',
                          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}>
                          {convertPrice(product.price)}
                        </span>
                        <span className="text-muted" style={{
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>/Unit (DDP to Amazon Warehouse)</span>
                      </div>
                      {/* Enhanced RRP and Save Section */}
                      <div className="d-flex gap-3 align-items-center flex-wrap">
                        <div className="d-flex align-items-center gap-1">
                          <small className="text-muted" style={{fontSize: '0.65rem', fontWeight: '500'}}>RRP:</small>
                          <span className="fw-bold text-primary" style={{
                            fontSize: '0.85rem',
                            fontWeight: '700',
                            fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                          }}>
                            {(() => {
                              // FIXED RRP LOGIC: Use Amazon Platform RRP values from admin panel
                              console.log('🏷️ RRP Display - Checking saved platform data');
                              console.log('🏷️ Product platforms:', product?.platforms);
                              
                              // First, check if we have saved platform data from admin panel
                              if (product?.platforms && product.platforms.length > 0) {
                                // Find Amazon platform from saved admin data (prioritize Amazon over RRP)
                                const amazonPlatform = product.platforms.find(platform => 
                                  platform.name && platform.name.toLowerCase().includes('amazon')
                                );
                                
                                console.log('🏷️ RRP Display - Found saved Amazon platform:', amazonPlatform);
                                
                                if (amazonPlatform && amazonPlatform.perUnitPrice) {
                                  // Use the saved Amazon per unit price from admin panel
                                  const amazonRRPPerUnit = parseFloat(amazonPlatform.perUnitPrice);
                                  console.log('🏷️ RRP Display - Using Amazon RRP per unit:', amazonRRPPerUnit);
                                  return `£${amazonRRPPerUnit.toFixed(2)}`;
                                }
                                
                                // Fallback to RRP platform if Amazon not found
                                const rrpPlatform = product.platforms.find(platform => 
                                  platform.name && platform.name.toLowerCase().includes('rrp')
                                );
                                
                                if (rrpPlatform && rrpPlatform.perUnitPrice) {
                                  const savedRRPPerUnit = parseFloat(rrpPlatform.perUnitPrice);
                                  console.log('🏷️ RRP Display - Using fallback RRP per unit:', savedRRPPerUnit);
                                  return `£${savedRRPPerUnit.toFixed(2)}`;
                                }
                              }
                              
                              // Fallback to product.rrp if no saved platform data
                              const fallbackRRP = parseFloat(product.rrp.replace(/[₨£$€Rs]/g, '')).toFixed(2);
                              console.log('🏷️ RRP Display - Using fallback RRP:', fallbackRRP);
                              return `£${fallbackRRP}`;
                            })()}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                          <small className="text-muted" style={{fontSize: '0.65rem', fontWeight: '500'}}>Save:</small>
                          <span className="fw-bold" style={{
                            fontSize: '0.75rem',
                            color: '#B12704',
                            background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid #ff9900',
                            fontWeight: '700'
                          }}>
                            {(() => {
                              // FIXED SAVE % LOGIC: Use saved values from admin panel
                              console.log('💰 Save % Display - Checking saved data');
                              console.log('💰 Product savings field:', product.savings);
                              console.log('💰 Product save field:', product.save);
                              
                              // First priority: Use the saved savings field from admin panel
                              if (product.savings !== undefined && product.savings !== null && product.savings !== '') {
                                const saveValue = parseFloat(product.savings);
                                if (!isNaN(saveValue) && saveValue > 0) {
                                  console.log('💰 Save % Display - Using saved savings field:', saveValue);
                                  return `${Math.round(saveValue)}%`;
                                }
                              }
                              
                              // Second priority: Use the save field from admin panel
                              if (product.save !== undefined && product.save !== null && product.save !== '') {
                                const saveValue = parseFloat(product.save);
                                if (!isNaN(saveValue) && saveValue > 0) {
                                  console.log('💰 Save % Display - Using saved save field:', saveValue);
                                  return `${Math.round(saveValue)}%`;
                                }
                              }
                              
                              // Third priority: Calculate from saved platform RRP if available (prioritize Amazon)
                              if (product?.platforms && product.platforms.length > 0) {
                                // First try Amazon platform
                                const amazonPlatform = product.platforms.find(platform => 
                                  platform.name && platform.name.toLowerCase().includes('amazon')
                                );
                                
                                if (amazonPlatform && amazonPlatform.perUnitPrice) {
                                  const amazonRRPPerUnit = parseFloat(amazonPlatform.perUnitPrice);
                                  const wholesalePerUnit = parseFloat(product.price.replace(/[₨£$€Rs]/g, '')) || 0;
                                  
                                  if (amazonRRPPerUnit > 0 && wholesalePerUnit > 0 && amazonRRPPerUnit > wholesalePerUnit) {
                                    const savings = ((amazonRRPPerUnit - wholesalePerUnit) / amazonRRPPerUnit * 100);
                                    console.log('💰 Save % Display - Calculated from Amazon RRP:', savings);
                                    return `${Math.round(savings)}%`;
                                  }
                                }
                                
                                // Fallback to RRP platform
                                const rrpPlatform = product.platforms.find(platform => 
                                  platform.name && platform.name.toLowerCase().includes('rrp')
                                );
                                
                                if (rrpPlatform && rrpPlatform.perUnitPrice) {
                                  const rrpPerUnit = parseFloat(rrpPlatform.perUnitPrice);
                                  const wholesalePerUnit = parseFloat(product.price.replace(/[₨£$€Rs]/g, '')) || 0;
                                  
                                  if (rrpPerUnit > 0 && wholesalePerUnit > 0 && rrpPerUnit > wholesalePerUnit) {
                                    const savings = ((rrpPerUnit - wholesalePerUnit) / rrpPerUnit * 100);
                                    console.log('💰 Save % Display - Calculated from platform RRP:', savings);
                                    return `${Math.round(savings)}%`;
                                  }
                                }
                              }
                              
                              // Fallback calculation using product.rrp
                              const wholesale = parseFloat(product.price.replace(/[₨£$€Rs]/g, '')) || 0;
                              const rrp = parseFloat(product.rrp.replace(/[₨£$€Rs]/g, '')) || 0;
                              
                              if (wholesale > 0 && rrp > 0 && rrp > wholesale) {
                                const savings = ((rrp - wholesale) / rrp * 100);
                                console.log('💰 Save % Display - Fallback calculation:', savings);
                                return `${Math.round(savings)}%`;
                              }
                              
                              console.log('💰 Save % Display - No valid data found, returning 0%');
                              return '0%';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compact Right side - Profit Information */}
                    {hasValidProfitData() && product.profitCalculations.profitPerUnit && (
                      <div 
                        style={{
                          border: '1px solid #e1e5e9',
                          borderRadius: '6px',
                          padding: '8px 10px',
                          background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
                          fontSize: '0.65rem',
                          fontWeight: '600',
                          color: '#232f3e',
                          minWidth: '200px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                          paddingBottom: '4px',
                          borderBottom: '1px solid #e1e5e9'
                        }}>
                          <span style={{
                            fontSize: '0.7rem', 
                            fontWeight: '700', 
                            color: '#232f3e',
                            letterSpacing: '0.2px'
                          }}>
                            Amazon Deal Profit Calculation
                          </span>
                          <button
                            onClick={() => {
                              // Scroll to existing Platform Comparison section
                              setTimeout(() => {
                                const platformSection = document.querySelector('.table-responsive');
                                if (platformSection) {
                                  platformSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }, 100);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #ff9900 0%, #ff7700 100%)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '3px 6px',
                              fontSize: '0.6rem',
                              fontWeight: '600',
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(255, 153, 0, 0.2)',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'translateY(-1px)';
                              e.target.style.boxShadow = '0 2px 6px rgba(255, 153, 0, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = '0 1px 3px rgba(255, 153, 0, 0.2)';
                            }}
                          >
                            Verify
                          </button>
                        </div>
                        <div style={{marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span style={{color: '#565959'}}>💰 Profit/unit:</span>
                          <span style={{color: '#059669', fontWeight: '800', fontSize: '0.75rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>
                            £{safeNumber(product.profitCalculations.profitPerUnit).toFixed(2)}
                          </span>
                        </div>
                        <div style={{marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span style={{color: '#565959'}}>📈 Profit/{quantity}:</span>
                          <span style={{color: '#059669', fontWeight: '800', fontSize: '0.75rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>
                            £{(product.profitEvaluation?.netProfit ? (product.profitEvaluation.netProfit / (product.dealUnits || 1)) * quantity : (safeNumber(product.profitCalculations.profitPerUnit) * quantity)).toFixed(2)}
                          </span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span style={{color: '#565959'}}>💰 Total cost/{quantity}:</span>
                          <span style={{color: '#B12704', fontWeight: '800', fontSize: '0.75rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>{(() => {
                            // Use profitEvaluation productCost if available, otherwise calculate from price
                            if (product.profitEvaluation?.productCost) {
                              // Calculate proportional cost based on current quantity vs dealUnits
                              const costPerUnit = product.profitEvaluation.productCost / (product.dealUnits || 1);
                              return `£${(costPerUnit * quantity).toFixed(2)}`;
                            }
                            
                            // Fallback calculation: quantity × unit price
                            const priceString = product.price || '£0';
                            const unitPrice = parseFloat(priceString.replace(/[₨£$€]/g, '').trim()) || 0;
                            const totalCost = unitPrice * quantity;
                            
                            console.log('💰 Cost Calculation:', {
                              originalPrice: product.price,
                              unitPrice: unitPrice,
                              quantity: quantity,
                              totalCost: totalCost,
                              formula: `${quantity} × ${unitPrice} = ${totalCost}`
                            });
                            
                            return `£${totalCost.toFixed(2)}`;
                          })()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Compact Divider */}
                <div style={{
                  height: '1px',
                  background: 'linear-gradient(90deg, transparent 0%, #e1e5e9 50%, transparent 100%)',
                  margin: '8px 0'
                }}></div>

                {/* Compact Product Variations - Always Show */}
                <div className="product-variations mb-2 pb-2" style={{
                  borderBottom: '1px solid #e1e5e9',
                  background: 'linear-gradient(135deg, #fafbfc 0%, #ffffff 100%)',
                  borderRadius: '6px',
                  padding: '8px',
                  border: '1px solid #e1e5e9'
                }}>
                  <h3 style={{
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    color: '#232f3e',
                    marginBottom: '6px',
                    letterSpacing: '0.2px'
                  }}>Product Options</h3>
                  
                  {/* Enhanced Product Variations Component */}
                  <ProductVariations
                    product={product}
                    selectedVariations={selectedVariations}
                    onVariationChange={handleVariationChange}
                    onProductChange={handleProductChange}
                    showImages={true}
                    compact={false}
                  />

                  {/* Fallback to old specifications-based variations for backward compatibility */}
                  {(!product.variations || product.variations.length === 0) && product.specifications && product.specifications.Color && (
                    <div className="mb-2">
                      <div className="mb-1">
                        <span className="fw-bold" style={{
                          fontSize: '0.7rem',
                          color: '#232f3e',
                          letterSpacing: '0.2px'
                        }}>Colour: </span>
                        <span style={{
                          fontSize: '0.7rem',
                          color: '#565959',
                          fontWeight: '500'
                        }}>
                          {selectedVariations.color || product.specifications.Color.split(',')[0].trim()}
                        </span>
                      </div>
                      <div className="d-flex gap-1 flex-wrap">
                        {product.specifications.Color.split(',').map((color, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setSelectedVariations({...selectedVariations, color: color.trim()})}
                            style={{
                              fontSize: '0.65rem', 
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              border: selectedVariations.color === color.trim() || (!selectedVariations.color && idx === 0) ? 
                                '1px solid #232f3e' : '1px solid #e1e5e9',
                              background: selectedVariations.color === color.trim() || (!selectedVariations.color && idx === 0) ? 
                                '#232f3e' : '#ffffff',
                              color: selectedVariations.color === color.trim() || (!selectedVariations.color && idx === 0) ? 
                                '#ffffff' : '#232f3e',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: selectedVariations.color === color.trim() || (!selectedVariations.color && idx === 0) ? 
                                '0 2px 6px rgba(35, 47, 62, 0.2)' : '0 1px 3px rgba(0,0,0,0.06)'
                            }}
                            onMouseEnter={(e) => {
                              if (!(selectedVariations.color === color.trim() || (!selectedVariations.color && idx === 0))) {
                                e.target.style.borderColor = '#232f3e';
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = '0 2px 6px rgba(35, 47, 62, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!(selectedVariations.color === color.trim() || (!selectedVariations.color && idx === 0))) {
                                e.target.style.borderColor = '#e1e5e9';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                              }
                            }}
                          >
                            {color.trim()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show message when no variations exist */}
                  {(!product.variations || product.variations.length === 0) && (!product.specifications || (!product.specifications.Color && !product.specifications.Diameter)) && (
                    <div style={{
                      textAlign: 'center',
                      padding: '12px',
                      color: '#666',
                      fontSize: '0.7rem',
                      fontStyle: 'italic'
                    }}>
                      No product variations available
                    </div>
                  )}

                  {/* Fallback to old specifications-based size variations for backward compatibility */}
                  {(!product.variations || product.variations.length === 0) && product.specifications && product.specifications.Diameter && (
                    <div className="mb-2">
                      <div className="mb-1">
                        <span className="fw-bold" style={{
                          fontSize: '0.7rem',
                          color: '#232f3e',
                          letterSpacing: '0.2px'
                        }}>Size: </span>
                        <span style={{
                          fontSize: '0.7rem',
                          color: '#565959',
                          fontWeight: '500'
                        }}>
                          {selectedVariations.size || product.specifications.Diameter.split(',')[0].trim()}
                        </span>
                      </div>
                      <div className="d-flex gap-1 flex-wrap">
                        {product.specifications.Diameter.split(',').map((size, idx) => (
                          <button 
                            key={idx}
                            onClick={() => setSelectedVariations({...selectedVariations, size: size.trim()})}
                            style={{
                              fontSize: '0.65rem', 
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              border: selectedVariations.size === size.trim() || (!selectedVariations.size && idx === 0) ? 
                                '1px solid #232f3e' : '1px solid #e1e5e9',
                              background: selectedVariations.size === size.trim() || (!selectedVariations.size && idx === 0) ? 
                                '#232f3e' : '#ffffff',
                              color: selectedVariations.size === size.trim() || (!selectedVariations.size && idx === 0) ? 
                                '#ffffff' : '#232f3e',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              boxShadow: selectedVariations.size === size.trim() || (!selectedVariations.size && idx === 0) ? 
                                '0 2px 6px rgba(35, 47, 62, 0.2)' : '0 1px 3px rgba(0,0,0,0.06)'
                            }}
                            onMouseEnter={(e) => {
                              if (!(selectedVariations.size === size.trim() || (!selectedVariations.size && idx === 0))) {
                                e.target.style.borderColor = '#232f3e';
                                e.target.style.transform = 'translateY(-1px)';
                                e.target.style.boxShadow = '0 2px 6px rgba(35, 47, 62, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!(selectedVariations.size === size.trim() || (!selectedVariations.size && idx === 0))) {
                                e.target.style.borderColor = '#e1e5e9';
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
                              }
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

            {/* Compact RIGHT COLUMN - Buy Box, Supplier Details */}
            <div className="col-12 col-lg-3 order-2 order-lg-3">
              <div className="sticky-top" style={{top: '80px', zIndex: 10}}>
                <div className="enhanced-card mobile-buy-box" style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #fafbfc 100%)', 
                  border: '1px solid #e1e5e9', 
                  borderRadius: '8px',
                  padding: '10px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)', 
                  color: '#232f3e'
                }}>
                  
                  {/* Compact Buy Box Header */}
                  <div className="mb-2 pb-2" style={{borderBottom: '1px solid #e1e5e9'}}>
                    <h3 style={{
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      color: '#232f3e',
                      margin: 0,
                      letterSpacing: '0.2px'
                    }}>Purchase Details</h3>
                  </div>
                  
                  {/* Compact Price in Buy Box */}
                  <div className="mb-2" style={{
                    background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)',
                    border: '1px solid #ff9900',
                    borderRadius: '6px',
                    padding: '6px 8px'
                  }}>
                    <div className="d-flex align-items-baseline gap-1 mb-1">
                      <span className="fw-bold" style={{
                        fontSize: '1rem', 
                        color: '#B12704',
                        fontWeight: '700',
                        letterSpacing: '-0.3px'
                      }}>
                        {convertPrice(product.price)}
                      </span>
                      <span style={{fontSize: '0.6rem', color: '#565959', fontWeight: '500'}}>/Unit</span>
                    </div>
                    <small style={{fontSize: '0.6rem', color: '#565959', fontWeight: '500'}}>
                      (DDP to Amazon Warehouse)
                    </small>
                  </div>

                  {/* Compact In Stock Status */}
                  <div className="mb-2" style={{
                    background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                    border: '1px solid #0ea5e9',
                    borderRadius: '6px',
                    padding: '6px 8px'
                  }}>
                    <div className="fw-bold d-flex align-items-center mb-1" style={{
                      fontSize: '0.7rem', 
                      color: '#0369a1'
                    }}>
                      <i className="fas fa-check-circle me-1" style={{color: '#059669', fontSize: '0.6rem'}}></i>
                      In Stock & Ready to Ship
                    </div>
                    <small style={{fontSize: '0.6rem', color: '#0369a1', fontWeight: '500'}}>
                      <i className="fas fa-shipping-fast me-1"></i>
                      Delivery in 15 days to Amazon Warehouse
                    </small>
                  </div>

                  {/* Compact Quantity Selector */}
                  <div className="mb-2" style={{
                    background: 'linear-gradient(135deg, #fafbfc 0%, #ffffff 100%)',
                    border: '1px solid #e1e5e9',
                    borderRadius: '6px',
                    padding: '8px'
                  }}>
                    <label className="form-label fw-bold mb-1" style={{
                      fontSize: '0.7rem', 
                      color: '#232f3e',
                      letterSpacing: '0.2px'
                    }}>Quantity:</label>
                    <div className="d-flex align-items-center gap-1 mb-1">
                      <button
                        onClick={() => setQuantity(Math.max(product?.dealUnits || 200, quantity - 1))}
                        style={{
                          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                          border: '1px solid #e1e5e9',
                          borderRadius: '4px',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#232f3e'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = '#ff9900';
                          e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = '#e1e5e9';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        −
                      </button>
                      <input 
                        type="number" 
                        className="form-control text-center" 
                        style={{
                          fontSize: '0.8rem', 
                          color: '#232f3e', 
                          backgroundColor: '#ffffff', 
                          border: '1px solid #e1e5e9',
                          borderRadius: '4px',
                          fontWeight: '700',
                          maxWidth: '60px',
                          padding: '4px',
                          height: '24px',
                          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                        value={quantity}
                        min={product?.dealUnits || 200}
                        step="1"
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow user to type freely, including clearing the field
                          if (value === '' || value === '0') {
                            setQuantity('');
                          } else {
                            setQuantity(parseInt(value));
                          }
                        }}
                        onBlur={(e) => {
                          // Ensure value is at least dealUnits when user leaves the field
                          const minQuantity = product?.dealUnits || 200;
                          const value = parseInt(e.target.value);
                          if (isNaN(value) || value < minQuantity) {
                            setQuantity(minQuantity);
                          }
                          // Reset styling
                          e.target.style.borderColor = '#e1e5e9';
                          e.target.style.boxShadow = 'none';
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#ff9900';
                          e.target.style.boxShadow = '0 0 0 2px rgba(255, 153, 0, 0.1)';
                        }}
                        placeholder="200"
                      />
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        style={{
                          background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                          border: '1px solid #e1e5e9',
                          borderRadius: '4px',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          color: '#232f3e'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = '#ff9900';
                          e.target.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = '#e1e5e9';
                          e.target.style.transform = 'scale(1)';
                        }}
                      >
                        +
                      </button>
                    </div>
                    <small style={{
                      fontSize: '0.6rem', 
                      color: '#565959',
                      fontWeight: '500'
                    }}>
                      <i className="fas fa-info-circle me-1"></i>
                      Min: {product?.dealUnits || 200} units • Changes affect Platform Comparison gross profit
                    </small>
                  </div>

                  {/* Compact Buy Now Button */}
                  <div className="d-grid gap-1 mb-2">
                    <button 
                      className="enhanced-btn" 
                      style={{
                        fontSize: '0.7rem', 
                        padding: '8px 12px',
                        background: 'linear-gradient(135deg, #ff9900 0%, #ff7700 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '700',
                        letterSpacing: '0.3px',
                        boxShadow: '0 2px 6px rgba(255, 153, 0, 0.25)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onClick={() => {
                        const buyerToken = localStorage.getItem('buyerToken');
                        if (!buyerToken) {
                          setShowLoginModal(true);
                        } else {
                          // Handle buy logic for logged in users
                          alert('Buy functionality will be implemented soon!');
                        }
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(255, 153, 0, 0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 6px rgba(255, 153, 0, 0.25)';
                      }}
                    >
                      <i className="fas fa-bolt me-1"></i>Buy Now - <span style={{fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>{quantity || 200}</span> Units
                    </button>
                    
                    <button 
                      className="enhanced-btn" 
                      style={{
                        fontSize: '0.65rem', 
                        padding: '6px 10px',
                        background: 'linear-gradient(135deg, #232f3e 0%, #1a1a1a 100%)',
                        color: '#ffffff !important',
                        border: '1px solid #ff9900',
                        borderRadius: '6px',
                        fontWeight: '600',
                        letterSpacing: '0.2px',
                        boxShadow: '0 2px 6px rgba(35, 47, 62, 0.25)'
                      }}
                      onClick={() => {
                        // Add to cart functionality
                        alert('Add to cart functionality will be implemented soon!');
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #ff9900 0%, #ff7700 100%)';
                        e.target.style.borderColor = '#ffffff';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(255, 153, 0, 0.35)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(135deg, #232f3e 0%, #1a1a1a 100%)';
                        e.target.style.borderColor = '#ff9900';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 6px rgba(35, 47, 62, 0.25)';
                      }}
                    >
                      <i className="fas fa-shopping-cart me-1"></i>Add to Cart
                    </button>
                  </div>

                  <hr />

                  {/* Supplier Details */}
                  <div className="mb-2">
                    <h3 className="fw-bold mb-2" style={{fontSize: '0.85rem', color: '#1f2937'}}>Seller Information</h3>
                    

                    
                    {/* Debug Information - Shows current state */}
                    {console.log('🔍 Seller Debug - Detailed:', {
                      isSellerLoggedIn,
                      currentSeller: currentSeller,
                      currentSellerId: currentSeller?._id,
                      currentSellerIdString: currentSeller?._id?.toString(),
                      productSellerInfo: product.sellerInfo,
                      productSeller: product.seller,
                      productSellerString: product.seller?.toString(),
                      productSellerIdString: product.seller?._id?.toString(),
                      // Detailed sellerInfo checks
                      sellerInfoSellerId: product.sellerInfo?.sellerId,
                      sellerInfoSellerIdString: product.sellerInfo?.sellerId?.toString(),
                      sellerInfoId: product.sellerInfo?._id,
                      sellerInfoIdString: product.sellerInfo?._id?.toString(),
                      // Ownership checks
                      ownershipViaSellerInfo1: product.sellerInfo?.sellerId?.toString() === currentSeller?._id?.toString(),
                      ownershipViaSellerInfo2: product.sellerInfo?._id?.toString() === currentSeller?._id?.toString(),
                      ownershipViaProductSeller1: product.seller === currentSeller?._id,
                      ownershipViaProductSeller2: product.seller?.toString() === currentSeller?._id?.toString(),
                      ownershipViaProductSeller3: product.seller?._id?.toString() === currentSeller?._id?.toString()
                    })}

                    {/* Supplier Information for Admin and Seller */}
                    {/* Show for Admin if any seller data exists */}
                    {isAdmin && (product.sellerInfo || product.sellerData || product.seller || (product.sellers && product.sellers.length > 0)) && (
                      <div className="border rounded p-2 mb-2" style={{background: '#e8f5e9'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-check-circle text-success me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-success" style={{fontSize: '0.75rem'}}>
                              Seller Information (Admin View)
                            </span>
                          </div>
                        </div>
                        
                        {/* Show all sellers if multiple sellers exist */}
                        {product.sellers && product.sellers.length > 0 ? (
                          <div>
                            <div style={{fontSize: '0.7rem', marginBottom: '8px'}}>
                              <strong>Total Sellers:</strong> {product.sellers.length}
                            </div>
                            {product.sellers.map((sellerEntry, index) => (
                              <div key={index} className="border rounded p-2 mb-2" style={{background: '#f8f9fa'}}>
                                <div style={{fontSize: '0.7rem'}}>
                                  <strong>Seller {index + 1}:</strong> {sellerEntry.username}
                                </div>
                                <div style={{fontSize: '0.7rem'}}>
                                  <strong>Email:</strong> {sellerEntry.email}
                                </div>
                                <div style={{fontSize: '0.7rem'}}>
                                  <strong>Location:</strong> 📍 {sellerEntry.city}, {sellerEntry.country}
                                </div>
                                <div style={{fontSize: '0.7rem'}}>
                                  <strong>WhatsApp:</strong> 
                                  <a 
                                    href={`https://wa.me/${sellerEntry.whatsappNo?.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-success ms-1"
                                  >
                                    <i className="fab fa-whatsapp me-1"></i>
                                    {sellerEntry.whatsappNo}
                                  </a>
                                </div>
                                <div style={{fontSize: '0.7rem'}}>
                                  <strong>Status:</strong> 
                                  <span className="badge bg-success ms-1" style={{fontSize: '0.65rem'}}>
                                    {sellerEntry.verificationStatus}
                                  </span>
                                </div>
                                <div style={{fontSize: '0.7rem'}}>
                                  <strong>Listed:</strong> {new Date(sellerEntry.listedAt).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Fallback to single seller info
                          (() => {
                            const sellerData = product.sellerData || product.sellerInfo || (product.seller && typeof product.seller === 'object' ? product.seller : null);
                            if (!sellerData) {
                              return (
                                <div style={{fontSize: '0.7rem'}}>
                                  <strong>Seller ID:</strong> {product.seller}<br/>
                                  <small className="text-muted">Loading seller information...</small>
                                </div>
                              );
                            }
                            
                            return (
                              <>
                                <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                  <strong>Seller:</strong> {sellerData.username}
                                </div>
                                {sellerData.supplierId && (
                                  <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                    <strong>Supplier ID:</strong> {sellerData.supplierId}
                                  </div>
                                )}
                                {sellerData.email && (
                                  <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                    <strong>Email:</strong> {sellerData.email}
                                  </div>
                                )}
                                <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                  <strong>Location:</strong> 📍 {sellerData.city}, {sellerData.country}
                                </div>
                                <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                  <strong>WhatsApp:</strong> 
                                  <a 
                                    href={`https://wa.me/${sellerData.whatsappNo?.replace(/[^0-9]/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-success ms-1"
                                  >
                                    <i className="fab fa-whatsapp me-1"></i>
                                    {sellerData.whatsappNo}
                                  </a>
                                </div>
                                <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                  <strong>Status:</strong> 
                                  <span className="badge bg-success ms-1" style={{fontSize: '0.65rem'}}>
                                    {sellerData.verificationStatus}
                                  </span>
                                </div>
                              </>
                            );
                          })()
                        )}
                      </div>
                    )}

                    {/* TEST: Show seller info if ANY ownership condition is met */}
                    {isSellerLoggedIn && currentSeller && (
                      (product.sellerInfo && (
                        product.sellerInfo.sellerId?.toString() === currentSeller._id?.toString() ||
                        product.sellerInfo._id?.toString() === currentSeller._id?.toString()
                      )) ||
                      (product.seller && (
                        product.seller === currentSeller._id ||
                        product.seller?.toString() === currentSeller._id?.toString() ||
                        product.seller?._id?.toString() === currentSeller._id?.toString()
                      )) ||
                      (product.sellers && product.sellers.some(s => s.sellerId?.toString() === currentSeller._id?.toString()))
                    ) && !isAdmin && (
                      <div className="border rounded p-2 mb-2" style={{background: '#e8f5e9'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-check-circle text-success me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-success" style={{fontSize: '0.75rem'}}>
                              ✅ TEST: Your Product (Ownership Detected)
                            </span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Current Seller ID:</strong> {currentSeller._id?.toString()}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Product Seller:</strong> {product.seller?.toString() || 'N/A'}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Product Seller ID:</strong> {product.seller?._id?.toString() || 'N/A'}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>SellerInfo Seller ID:</strong> {product.sellerInfo?.sellerId?.toString() || 'N/A'}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>SellerInfo ID:</strong> {product.sellerInfo?._id?.toString() || 'N/A'}
                        </div>
                        <div className="alert alert-success border-0 mt-2 mb-0" style={{fontSize: '0.65rem', padding: '4px 8px'}}>
                          <i className="fas fa-info-circle me-1"></i>
                          TEST: This should show if you own this product
                        </div>
                      </div>
                    )}

                    {/* Show for Seller viewing their own product (via sellerInfo) */}
                    {isSellerLoggedIn && currentSeller && (
                      (product.sellerInfo && (
                        product.sellerInfo.sellerId?.toString() === currentSeller._id?.toString() ||
                        product.sellerInfo._id?.toString() === currentSeller._id?.toString()
                      )) ||
                      (product.sellerData && product.sellerData._id?.toString() === currentSeller._id?.toString())
                    ) && !isAdmin && (
                      <div className="border rounded p-2 mb-2" style={{background: '#f0f9ff'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-user text-primary me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-primary" style={{fontSize: '0.75rem'}}>Your Listed Product</span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Seller:</strong> {product.sellerInfo.username || currentSeller.username}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Supplier ID:</strong> {currentSeller.supplierId}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Email:</strong> {product.sellerInfo.email || currentSeller.email}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Location:</strong> 📍 {product.sellerInfo.city || currentSeller.city}, {product.sellerInfo.country || currentSeller.country}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>WhatsApp:</strong> 
                          <a 
                            href={`https://wa.me/${(product.sellerInfo.whatsappNo || currentSeller.whatsappNo)?.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary ms-1"
                          >
                            <i className="fab fa-whatsapp me-1"></i>
                            {product.sellerInfo.whatsappNo || currentSeller.whatsappNo}
                          </a>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Status:</strong> 
                          <span className={`badge ms-1 ${(product.sellerInfo.verificationStatus || currentSeller.verificationStatus) === 'approved' ? 'bg-success' : 'bg-warning'}`} style={{fontSize: '0.65rem'}}>
                            {product.sellerInfo.verificationStatus || currentSeller.verificationStatus}
                          </span>
                        </div>
                        <div className="alert alert-info border-0 mt-2 mb-0" style={{fontSize: '0.65rem', padding: '4px 8px'}}>
                          <i className="fas fa-info-circle me-1"></i>
                          You have listed this product - you can see your seller information
                        </div>
                      </div>
                    )}

                    {/* Show for Seller viewing their own product */}
                    {isSellerLoggedIn && currentSeller && product.sellers && 
                     product.sellers.some(s => s.sellerId.toString() === currentSeller._id.toString()) && 
                     !isAdmin && (
                      <div className="border rounded p-2 mb-2" style={{background: '#f0f9ff'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-user text-primary me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-primary" style={{fontSize: '0.75rem'}}>Your Listed Product</span>
                          </div>
                        </div>
                        {(() => {
                          const mySellerEntry = product.sellers.find(s => s.sellerId.toString() === currentSeller._id.toString());
                          return (
                            <>
                              <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                <strong>Your Username:</strong> {mySellerEntry?.username || currentSeller.username}
                              </div>
                              <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                <strong>Email:</strong> {mySellerEntry?.email || currentSeller.email}
                              </div>
                              <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                <strong>Location:</strong> 📍 {mySellerEntry?.city || currentSeller.city}, {mySellerEntry?.country || currentSeller.country}
                              </div>
                              <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                <strong>WhatsApp:</strong> 
                                <a 
                                  href={`https://wa.me/${(mySellerEntry?.whatsappNo || currentSeller.whatsappNo)?.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary ms-1"
                                >
                                  <i className="fab fa-whatsapp me-1"></i>
                                  {mySellerEntry?.whatsappNo || currentSeller.whatsappNo}
                                </a>
                              </div>
                              <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                <strong>Status:</strong> 
                                <span className={`badge ms-1 ${(mySellerEntry?.verificationStatus || currentSeller.verificationStatus) === 'approved' ? 'bg-success' : 'bg-warning'}`} style={{fontSize: '0.65rem'}}>
                                  {mySellerEntry?.verificationStatus || currentSeller.verificationStatus}
                                </span>
                              </div>
                              <div className="mb-1" style={{fontSize: '0.7rem'}}>
                                <strong>Listed On:</strong> {new Date(mySellerEntry?.listedAt).toLocaleDateString()}
                              </div>
                              <div className="alert alert-info border-0 mt-2 mb-0" style={{fontSize: '0.65rem', padding: '4px 8px'}}>
                                <i className="fas fa-info-circle me-1"></i>
                                You have listed this product
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    
                    {/* Show for Seller viewing their own product (via product.seller) */}
                    {isSellerLoggedIn && currentSeller && (
                      (product.seller && (
                        product.seller === currentSeller._id || 
                        product.seller?.toString() === currentSeller._id?.toString() ||
                        product.seller._id?.toString() === currentSeller._id?.toString()
                      )) ||
                      (product.sellerData && product.sellerData._id?.toString() === currentSeller._id?.toString())
                    ) && (
                      <div className="border rounded p-2 mb-2" style={{background: '#f0f9ff'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-user text-primary me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-primary" style={{fontSize: '0.75rem'}}>Your Product</span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Seller:</strong> {product.sellerInfo?.username || currentSeller.username}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Supplier ID:</strong> {currentSeller.supplierId}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Email:</strong> {product.sellerInfo?.email || currentSeller.email}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Location:</strong> 📍 {product.sellerInfo?.city || currentSeller.city}, {product.sellerInfo?.country || currentSeller.country}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>WhatsApp:</strong> 
                          <a 
                            href={`https://wa.me/${(product.sellerInfo?.whatsappNo || currentSeller.whatsappNo)?.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary ms-1"
                          >
                            <i className="fab fa-whatsapp me-1"></i>
                            {product.sellerInfo?.whatsappNo || currentSeller.whatsappNo}
                          </a>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Status:</strong> 
                          <span className={`badge ms-1 ${(product.sellerInfo?.verificationStatus || currentSeller.verificationStatus) === 'approved' ? 'bg-success' : 'bg-warning'}`} style={{fontSize: '0.65rem'}}>
                            {product.sellerInfo?.verificationStatus || currentSeller.verificationStatus}
                          </span>
                        </div>
                        <div className="alert alert-info border-0 mt-2 mb-0" style={{fontSize: '0.65rem', padding: '4px 8px'}}>
                          <i className="fas fa-info-circle me-1"></i>
                          This is your product - you can see your full seller information
                        </div>
                      </div>
                    )}
                    
                    {/* Case 3: Admin loading seller info */}
                    {isAdmin && product.seller && !sellerInfo && !product.sellerInfo && 
                     !(isSellerLoggedIn && currentSeller && product.seller && 
                       (product.seller === currentSeller._id || product.seller?.toString() === currentSeller._id?.toString())) && (
                      <div className="alert alert-info border-0 p-2 mb-2" style={{fontSize: '0.7rem'}}>
                        <i className="fas fa-spinner fa-spin me-1"></i>
                        Loading seller information...
                      </div>
                    )}
                    
                  
                    
                    {/* Case 5: Verified seller info for buyers (unlocked) */}
                    {!isAdmin && !isSellerLoggedIn && product.sellerInfo && product.sellerInfo.verificationStatus === 'approved' && isSupplierUnlocked && (
                      <div className="border rounded p-2 mb-2" style={{background: '#e8f5e9'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-check-circle text-success me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-success" style={{fontSize: '0.75rem'}}>Verified Seller</span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Location:</strong> 📍 {product.sellerInfo.city}, {product.sellerInfo.country}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>WhatsApp:</strong> 
                          <a 
                            href={`https://wa.me/${product.sellerInfo.whatsappNo?.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success ms-1"
                          >
                            <i className="fab fa-whatsapp me-1"></i>
                            {product.sellerInfo.whatsappNo}
                          </a>
                        </div>
                      </div>
                    )}
                      </div>
                    

                    
                    {/* PRIORITY: Show seller info for ANY logged-in seller on ANY product with seller data */}
                    {isSellerLoggedIn && currentSeller && (product.seller || product.sellerInfo || product.sellerData) && 
                     !isAdmin && (
                      <div className="border rounded p-2 mb-2" style={{background: '#fff3cd'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-user text-warning me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-warning" style={{fontSize: '0.75rem'}}>
                              Seller Information (Debug Mode)
                            </span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Your ID:</strong> {currentSeller._id}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Product Seller ID:</strong> {product.seller?.toString() || 'N/A'}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Product SellerInfo:</strong> {JSON.stringify(product.sellerInfo) || 'N/A'}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Product SellerData:</strong> {JSON.stringify(product.sellerData) || 'N/A'}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Match Check:</strong> {product.seller?.toString() === currentSeller._id?.toString() ? '✅ MATCH' : '❌ NO MATCH'}
                        </div>
                        {(product.seller?.toString() === currentSeller._id?.toString()) && (
                          <div>
                            <div className="mb-1" style={{fontSize: '0.7rem'}}>
                              <strong>Seller:</strong> {currentSeller.username}
                            </div>
                            <div className="mb-1" style={{fontSize: '0.7rem'}}>
                              <strong>Email:</strong> {currentSeller.email}
                            </div>
                            <div className="mb-1" style={{fontSize: '0.7rem'}}>
                              <strong>WhatsApp:</strong> {currentSeller.whatsappNo}
                            </div>
                            <div className="alert alert-success border-0 mt-2 mb-0" style={{fontSize: '0.65rem', padding: '4px 8px'}}>
                              <i className="fas fa-check-circle me-1"></i>
                              This is your product!
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DEBUG: Log ownership check details */}
                    {isSellerLoggedIn && currentSeller && console.log('🔍 Seller Ownership Debug:', {
                      currentSellerId: currentSeller._id,
                      currentSellerIdString: currentSeller._id?.toString(),
                      productSeller: product.seller,
                      productSellerString: product.seller?.toString(),
                      productSellerInfo: product.sellerInfo,
                      productSellerInfoSellerId: product.sellerInfo?.sellerId,
                      productSellerInfoSellerIdString: product.sellerInfo?.sellerId?.toString(),
                      productSellerInfoId: product.sellerInfo?._id,
                      productSellerInfoIdString: product.sellerInfo?._id?.toString(),
                      productSellerData: product.sellerData,
                      productSellerDataId: product.sellerData?._id,
                      // Main ownership checks
                      ownershipCheck1: product.seller === currentSeller._id,
                      ownershipCheck2: product.seller?.toString() === currentSeller._id?.toString(),
                      ownershipCheck3: product.seller?._id?.toString() === currentSeller._id?.toString(),
                      ownershipCheck4: product.sellerInfo?.sellerId?.toString() === currentSeller._id?.toString(),
                      ownershipCheck5: product.sellerInfo?._id?.toString() === currentSeller._id?.toString(),
                      ownershipCheck6: product.sellerData?._id?.toString() === currentSeller._id?.toString(),
                      finalOwnership: (
                        (product.seller && (
                          product.seller === currentSeller._id || 
                          product.seller?.toString() === currentSeller._id?.toString() || 
                          product.seller._id?.toString() === currentSeller._id?.toString()
                        )) ||
                        (product.sellers && product.sellers.some(s => s.sellerId?.toString() === currentSeller._id?.toString())) ||
                        (product.sellerInfo && (
                          product.sellerInfo.sellerId?.toString() === currentSeller._id?.toString() || 
                          product.sellerInfo._id?.toString() === currentSeller._id?.toString()
                        )) ||
                        (product.sellerData && product.sellerData._id?.toString() === currentSeller._id?.toString())
                      )
                    })}

                    {/* Locked state for users who don't have access (including sellers who don't own this product) */}
                    {!isAdmin && 
                     !isSellerLoggedIn && // Only show for non-sellers (buyers and guests)
                     !(product.sellerInfo && product.sellerInfo.verificationStatus === 'approved' && isSupplierUnlocked) && 
                     (product.seller || product.sellerInfo) && ( // Only show if there is a seller
                      <div className="border rounded p-2 mb-2" style={{background: '#f8f9fa'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-lock text-warning me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-warning" style={{fontSize: '0.75rem'}}>Seller Information - Locked</span>
                          </div>
                        </div>
                        <div className="mb-2" style={{fontSize: '0.7rem', color: '#6c757d'}}>
                          <i className="fas fa-eye-slash me-1"></i>
                          Seller details are protected
                        </div>
                        {!isSellerLoggedIn && !isBuyerLoggedIn ? (
                          <button 
                            className="btn btn-primary btn-sm w-100"
                            style={{fontSize: '0.7rem'}}
                            onClick={() => setShowLoginModal(true)}
                          >
                            <i className="fas fa-sign-in-alt me-1"></i>
                            Join Now to View Seller
                          </button>
                        ) : isSellerLoggedIn ? (
                          <button 
                            className="btn btn-warning btn-sm w-100"
                            style={{fontSize: '0.7rem'}}
                            onClick={() => {
                              alert('Payment required to unlock seller details. Contact admin for pricing.');
                            }}
                          >
                            <i className="fas fa-unlock me-1"></i>
                            Pay to Unlock Seller Details
                          </button>
                        ) : (
                          <button 
                            className="btn btn-success btn-sm w-100"
                            style={{fontSize: '0.7rem'}}
                            onClick={() => {
                              setShowPaymentUploadModal(true);
                            }}
                          >
                            <i className="fas fa-crown me-1"></i>
                            Upgrade to View Seller
                          </button>
                        )}
                      </div>
                    )}

                    {/* Show seller info when seller is logged in and viewing their own product */}
                    {isSellerLoggedIn && currentSeller && product.sellerInfo && (
                      <div className="border rounded p-2 mb-2" style={{background: '#e8f5e9'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-check-circle text-success me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-success" style={{fontSize: '0.75rem'}}>
                              Your Product - Seller Information
                            </span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Seller:</strong> {product.sellerInfo.username || currentSeller.username}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Email:</strong> {product.sellerInfo.email || currentSeller.email}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Location:</strong> 📍 {product.sellerInfo.city || currentSeller.city}, {product.sellerInfo.country || currentSeller.country}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>WhatsApp:</strong> 
                          <a 
                            href={`https://wa.me/${(product.sellerInfo.whatsappNo || currentSeller.whatsappNo)?.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success ms-1"
                          >
                            <i className="fab fa-whatsapp me-1"></i>
                            {product.sellerInfo.whatsappNo || currentSeller.whatsappNo}
                          </a>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Verification:</strong> 
                          <span className={`ms-1 ${product.sellerInfo.verificationStatus === 'approved' ? 'text-success' : 'text-warning'}`}>
                            <i className={`fas ${product.sellerInfo.verificationStatus === 'approved' ? 'fa-check-circle' : 'fa-clock'} me-1`}></i>
                            {product.sellerInfo.verificationStatus === 'approved' ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* COMPREHENSIVE: Show seller info for product owner */}
                    {isSellerLoggedIn && currentSeller && (product.seller || product.sellerInfo || product.sellerData) && 
                     !isAdmin && 
                     (
                       // Direct seller ID match
                       (product.seller === currentSeller._id) ||
                       (product.seller?.toString() === currentSeller._id?.toString()) ||
                       // SellerInfo matches
                       (product.sellerInfo?.sellerId?.toString() === currentSeller._id?.toString()) ||
                       (product.sellerInfo?._id?.toString() === currentSeller._id?.toString()) ||
                       // SellerData matches
                       (product.sellerData?._id?.toString() === currentSeller._id?.toString())
                     ) && (
                      <div className="border rounded p-2 mb-2" style={{background: '#e8f5e9'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-check-circle text-success me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-success" style={{fontSize: '0.75rem'}}>
                              Your Product - Seller Information
                            </span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Seller:</strong> {product.sellerData?.username || product.sellerInfo?.username || currentSeller.username}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Seller ID:</strong> {currentSeller._id}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Email:</strong> {product.sellerData?.email || product.sellerInfo?.email || currentSeller.email}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Location:</strong> 📍 {product.sellerData?.city || product.sellerInfo?.city || currentSeller.city}, {product.sellerData?.country || product.sellerInfo?.country || currentSeller.country}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>WhatsApp:</strong> 
                          <a 
                            href={`https://wa.me/${(product.sellerData?.whatsappNo || product.sellerInfo?.whatsappNo || currentSeller.whatsappNo)?.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success ms-1"
                          >
                            <i className="fab fa-whatsapp me-1"></i>
                            {product.sellerData?.whatsappNo || product.sellerInfo?.whatsappNo || currentSeller.whatsappNo}
                          </a>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Status:</strong> 
                          <span className={`badge ms-1 ${(product.sellerData?.verificationStatus || product.sellerInfo?.verificationStatus || currentSeller.verificationStatus) === 'approved' ? 'bg-success' : 'bg-warning'}`} style={{fontSize: '0.65rem'}}>
                            {product.sellerData?.verificationStatus || product.sellerInfo?.verificationStatus || currentSeller.verificationStatus}
                          </span>
                        </div>
                        <div className="alert alert-success border-0 mt-2 mb-0" style={{fontSize: '0.65rem', padding: '4px 8px'}}>
                          <i className="fas fa-info-circle me-1"></i>
                          This is your product - you can always see your seller information
                        </div>
                      </div>
                    )}

                    {/* FALLBACK: Ensure sellers always see their own information if not shown above */}
                    {isSellerLoggedIn && currentSeller && (product.seller || product.sellerInfo) && 
                     !isAdmin && 
                     // Check if this seller owns the product but wasn't shown above
                     (
                       (product.seller && (
                         product.seller === currentSeller._id || 
                         product.seller?.toString() === currentSeller._id?.toString() || 
                         product.seller._id?.toString() === currentSeller._id?.toString()
                       )) ||
                       (product.sellers && product.sellers.some(s => s.sellerId?.toString() === currentSeller._id?.toString())) ||
                       (product.sellerInfo && (
                         product.sellerInfo.sellerId?.toString() === currentSeller._id?.toString() || 
                         product.sellerInfo._id?.toString() === currentSeller._id?.toString()
                       )) ||
                       (product.sellerData && product.sellerData._id?.toString() === currentSeller._id?.toString())
                     ) && (
                      <div className="border rounded p-2 mb-2" style={{background: '#f0f9ff'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-user text-primary me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-primary" style={{fontSize: '0.75rem'}}>Your Product (Fallback)</span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Seller:</strong> {currentSeller.username}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Email:</strong> {currentSeller.email}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Location:</strong> 📍 {currentSeller.city}, {currentSeller.country}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>WhatsApp:</strong> 
                          <a 
                            href={`https://wa.me/${currentSeller.whatsappNo?.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary ms-1"
                          >
                            <i className="fab fa-whatsapp me-1"></i>
                            {currentSeller.whatsappNo}
                          </a>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Status:</strong> 
                          <span className={`badge ms-1 ${currentSeller.verificationStatus === 'approved' ? 'bg-success' : 'bg-warning'}`} style={{fontSize: '0.65rem'}}>
                            {currentSeller.verificationStatus}
                          </span>
                        </div>
                        <div className="alert alert-success border-0 mt-2 mb-0" style={{fontSize: '0.65rem', padding: '4px 8px'}}>
                          <i className="fas fa-check-circle me-1"></i>
                          This is your product - you can always see your seller information
                        </div>
                      </div>
                    )}

                    {/* Case 4: No seller information available */}
                    {!product.seller && (
                      <div className="alert alert-info border-0 p-2 mb-2" style={{fontSize: '0.7rem'}}>
                        <i className="fas fa-info-circle me-1"></i>
                        No seller information available for this product
                      </div>
                    )}
                  </div>

                  <hr />

                  {/* Total Sales */}
                  <div className="text-center">
                    <div className="fw-bold mb-1" style={{fontSize: '0.8rem', color: '#1f2937'}}>Total Sales</div>
                    <div className="fw-bold" style={{fontSize: '1.1rem', color: '#2563eb'}}>
                      {product.monthlyOrders}
                    </div>
                    <small style={{fontSize: '0.7rem', color: '#6b7280'}}>units sold this month</small>
                  </div>

                </div>
              </div>
              
              {/* Mobile Buy Box - Show as regular content on mobile, keep fixed on very small screens */}
              <div className="d-block d-lg-none mt-3">
                <div className="d-none d-sm-block">
                  {/* Regular mobile layout for tablets and larger phones */}
                  <div className="border rounded p-3 mb-3" style={{background: '#ffffff', border: '2px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', color: '#1f2937'}}>
                    <div className="text-center">
                      <div className="fw-bold mb-2" style={{fontSize: '1.2rem', color: '#dc2626'}}>
                        {convertPrice(product.price)}
                      </div>
                      <small className="d-block mb-3" style={{color: '#6b7280'}}>ex. VAT</small>
                      <div className="d-grid">
                        <button 
                          className="btn btn-danger"
                          style={{backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#ffffff'}}
                          onClick={() => {
                            const buyerToken = localStorage.getItem('buyerToken');
                            if (!buyerToken) {
                              setShowLoginModal(true);
                            } else {
                              // Handle buy logic for logged in users
                              alert('Buy functionality will be implemented soon!');
                            }
                          }}
                        >
                          <i className="fas fa-bolt me-1"></i>Buy Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Fixed bottom bar only for very small screens */}
                <div className="d-block d-sm-none">
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
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                const buyerToken = localStorage.getItem('buyerToken');
                                if (!buyerToken) {
                                  setShowLoginModal(true);
                                } else {
                                  // Handle buy logic for logged in users
                                  alert('Buy functionality will be implemented soon!');
                                }
                              }}
                            >
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

          </div>

          {/* Below 3 Columns - Additional Content */}
          <div className="row mt-4">
            <div className="col-12">
              
              {/* Platform Comparison and Profit Evaluation Side by Side */}
              <div className="row g-3">
                {/* Platform Pricing Table - Left Side */}
                {(hasValidPlatformData() || product?.forceShowPlatforms || (product?.platforms && product.platforms.length > 0)) && (
                  <div className={(hasValidEvaluationData() || product?.forceShowEvaluation || product?.evaluation) ? "col-lg-6" : "col-12"}>
                    <div className="mb-3">
                      <div className="fw-bold mb-2" style={{fontSize: '0.9rem', color: '#2d3748'}}>
                        <i className="fas fa-chart-line me-2"></i>Platform Comparison
                      </div>
                      
                      {/* Formula Explanation */}
                      <div className="alert alert-info py-2 px-3 mb-3" style={{fontSize: '0.7rem', background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)', border: '1px solid #90caf9', borderRadius: '6px'}}>
                        <div className="d-flex align-items-center">
                          <i className="fas fa-calculator me-2 text-primary"></i>
                          <strong>Formula:</strong>
                          <span className="ms-2" style={{fontFamily: 'monospace', background: '#fff', padding: '2px 6px', borderRadius: '3px', border: '1px solid #ddd'}}>
                            (Platform Price - Product Cost) × Unit Sale/Year = Gross Profit
                          </span>
                        </div>
                      </div>
                      
                      <div className="table-responsive" style={{overflowX: 'auto', overflowY: 'hidden'}}>
                        <table className="table table-sm table-bordered shadow-sm mb-0" style={{fontSize: '0.75rem'}}>
                          <thead style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
                            <tr>
                              <th className="fw-bold py-2 px-2" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Platform</th>
                              <th className="fw-bold py-2 px-2 text-center" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Platform Price</th>
                              <th className="fw-bold py-2 px-2 text-center" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Product Cost</th>
                              <th className="fw-bold py-2 px-2 text-center" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Unit Sale/Year</th>
                              <th className="fw-bold py-2 px-2 text-center" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Gross Profit</th>
                              <th className="fw-bold py-2 px-2 text-center">Markup</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const platformData = calculatePlatformData();
                              console.log('🎯 PLATFORM DATA FOR DISPLAY:', platformData);
                              
                              // Get product cost for display
                              const getProductCostGBP = () => {
                                const costPriceRaw = parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0);
                                const isPKR = product?.price?.includes('₨') || product?.price?.includes('Rs');
                                const isGBP = product?.price?.includes('£');
                                
                                if (isPKR) {
                                  return costPriceRaw * 0.00272; // Convert PKR to GBP
                                } else if (isGBP) {
                                  return costPriceRaw; // Already in GBP
                                } else {
                                  // Assume PKR if no currency symbol
                                  return costPriceRaw * 0.00272;
                                }
                              };
                              
                              const productCostGBP = getProductCostGBP();
                              
                              return platformData.map((platform, idx) => {
                                console.log(`🔍 Platform ${idx + 1} (${platform.name}):`, {
                                  rawPrice: platform.price,
                                  rawProfit: platform.grossProfit,
                                  isPKR: platform.isPKR,
                                  units: platform.units,
                                  markup: platform.markup,
                                  markupType: typeof platform.markup,
                                  markupEmpty: !platform.markup,
                                  markupIsZero: platform.markup === '0%' || platform.markup === '0',
                                  convertedPrice: platform.isPKR ? convertFromPKR(platform.price) : convertPrice(platform.price),
                                  convertedProfit: platform.isPKR ? convertFromPKR(platform.grossProfit) : convertPrice(platform.grossProfit)
                                });
                                
                                // Enhanced markup debugging
                                if (!platform.markup || platform.markup === '0%' || platform.markup === '0') {
                                  console.log(`⚠️ Platform ${platform.name} has no/zero markup:`, {
                                    markup: platform.markup,
                                    willUseFallback: true,
                                    productPrice: product?.price,
                                    hasProduct: !!product
                                  });
                                }
                                
                                // Special debugging for Amazon markup
                                if (platform.name === 'Amazon') {
                                  console.log(`🔍 AMAZON MARKUP DETAILED DEBUG:`, {
                                    platformMarkup: platform.markup,
                                    rrpPerUnit: platform.perUnitPrice || parseFloat(String(platform.price).replace(/[£₨$€]/g, '')) / (platform.units || 200),
                                    productCost: parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0),
                                    productPrice: product?.price,
                                    calculationFormula: `((${platform.perUnitPrice || 'RRP'} - ${parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0)}) / ${parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0)}) × 100`,
                                    expectedResult: platform.perUnitPrice ? (((platform.perUnitPrice - parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0)) / parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0)) * 100).toFixed(1) + '%' : 'N/A'
                                  });
                                }
                                
                                // Calculate per unit price and total profit correctly
                                const perUnitPrice = platform.perUnitPrice || parseFloat(String(platform.price).replace(/[£₨$€]/g, '')) / (platform.units || 200);
                                const platformUnits = platform.units || quantity || 200;
                                
                                // Formula: (Platform Price - Product Cost) × Unit Sales/Year = Gross Profit
                                const grossProfitPerUnit = perUnitPrice - productCostGBP;
                                const totalGrossProfit = grossProfitPerUnit * platformUnits;
                                
                                return (
                                  <tr key={idx} style={{background: idx % 2 === 0 ? '#f8f9fa' : 'white'}}>
                                    <td className="fw-semibold py-2 px-2" style={{color: '#2d3748', fontSize: '0.75rem'}}>
                                      <i className={`fas fa-${platform.name === 'Amazon' ? 'shopping-cart' : platform.name === 'eBay' ? 'gavel' : 'store'} me-1 text-primary`} style={{fontSize: '0.7rem'}}></i>
                                      {platform.name}
                                    </td>
                                    <td className="fw-bold text-primary py-2 px-2 text-center" style={{fontSize: '0.8rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                      £{safeNumber(perUnitPrice).toFixed(2)}
                                    </td>
                                    <td className="fw-bold text-danger py-2 px-2 text-center" style={{fontSize: '0.8rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                      £{safeNumber(productCostGBP).toFixed(2)}
                                    </td>
                                    <td className="fw-bold py-2 px-2 text-center" style={{fontSize: '0.8rem', color: '#2d3748', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                      ✕ {platformUnits}
                                    </td>
                                    <td className="fw-bold py-2 px-2 text-center" style={{fontSize: '0.8rem', color: '#059669', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                      = £{safeNumber(totalGrossProfit).toFixed(2)}
                                      <div style={{fontSize: '0.6rem', color: '#666', marginTop: '2px', fontStyle: 'italic'}}>
                                        (£{safeNumber(perUnitPrice).toFixed(2)} - £{safeNumber(productCostGBP).toFixed(2)}) × {platformUnits}
                                      </div>
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                      <span className="badge bg-info" style={{fontSize: '0.65rem', padding: '3px 6px'}}>
                                        {platform.markup || 'N/A'}
                                      </span>
                                      {(!platform.markup || platform.markup === '0%') && (
                                        <div style={{fontSize: '0.5rem', color: '#666', marginTop: '2px'}}>
                                          (No data)
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Single Savings Field Display */}
                      {product.savings && product.savings > 0 && (
                        <div className="mt-3">
                          <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}>
                            <div className="card-body p-2">
                              <div className="text-center">
                                <div className="text-white mb-1" style={{fontSize: '0.8rem', fontWeight: '600'}}>
                                  💰 Total Savings
                                </div>
                                <div className="text-white" style={{fontSize: '1.4rem', fontWeight: '800', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>
                                  £{safeNumber(product.savings).toFixed(2)}
                                </div>
                                <div className="text-white" style={{fontSize: '0.7rem', opacity: 0.9}}>
                                  Save on your purchase
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Profit Calculations - Below Platform Comparison */}
                    {(hasValidProfitData() || product?.forceShowProfitCalculations || product?.profitCalculations) && (
                      <div className="mb-3">
                        <div className="card border-0 shadow-sm" style={{background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'}}>
                          <div className="card-body p-2">
                            <div className="fw-bold mb-2 text-white" style={{fontSize: '0.85rem'}}>
                              <i className="fas fa-calculator me-2"></i>Profit Calculations
                            </div>
                            <div className="row g-1 mb-2">
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Profit per Unit</div>
                                  <div className="fw-bold text-success" style={{fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                    £{safeNumber(product.profitCalculations.profitPerUnit).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Monthly Profit</div>
                                  <div className="fw-bold text-primary" style={{fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                    £{(() => {
                                      const monthlyValue = product.evaluation?.monthlyProfit || product.profitCalculations?.monthlyProfit || (product.profitCalculations?.profitPerUnit * 30) || 0;
                                      console.log('📊 Monthly Profit Display Debug:', {
                                        evaluationMonthly: product.evaluation?.monthlyProfit,
                                        calculationsMonthly: product.profitCalculations?.monthlyProfit,
                                        fallbackCalculation: product.profitCalculations?.profitPerUnit * 30,
                                        finalValue: monthlyValue
                                      });
                                      return safeNumber(monthlyValue).toFixed(2);
                                    })()}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Yearly Profit</div>
                                  <div className="fw-bold text-warning" style={{fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                    £{(() => {
                                      // PRIORITY 1: Auto-calculate yearly profit based on platform units
                                      const platformData = calculatePlatformData();
                                      const profitPerUnit = product.profitCalculations?.profitPerUnit || product.evaluation?.netProfit || 0;
                                      
                                      console.log('📊 Yearly Profit Calculation Debug:', {
                                        hasPlatformData: !!platformData,
                                        platformDataLength: platformData?.length,
                                        profitPerUnit: profitPerUnit,
                                        platformData: platformData
                                      });
                                      
                                      // If we have platform data with units, use it for calculation
                                      if (platformData && platformData.length > 0) {
                                        // Use the first platform's units (they should all be the same due to auto-sync)
                                        const units = platformData[0].units || quantity || 200;
                                        
                                        if (profitPerUnit > 0 && units > 0) {
                                          const yearlyProfit = profitPerUnit * units;
                                          console.log('✅ Using Platform Units Calculation:', {
                                            profitPerUnit: profitPerUnit,
                                            units: units,
                                            yearlyProfit: yearlyProfit,
                                            formula: `${units} × £${profitPerUnit.toFixed(2)} = £${yearlyProfit.toFixed(2)}`
                                          });
                                          return safeNumber(yearlyProfit).toFixed(2);
                                        }
                                      }
                                      
                                      // PRIORITY 2: Use saved yearly profit values
                                      if (product.evaluation?.yearlyProfit && product.evaluation.yearlyProfit > 0) {
                                        console.log('📊 Using Saved Evaluation Yearly Profit:', product.evaluation.yearlyProfit);
                                        return safeNumber(product.evaluation.yearlyProfit).toFixed(2);
                                      }
                                      
                                      if (product.profitCalculations?.yearlyProfit && product.profitCalculations.yearlyProfit > 0) {
                                        console.log('📊 Using Saved Calculations Yearly Profit:', product.profitCalculations.yearlyProfit);
                                        return safeNumber(product.profitCalculations.yearlyProfit).toFixed(2);
                                      }
                                      
                                      // PRIORITY 3: Fallback calculation (365 days)
                                      if (profitPerUnit > 0) {
                                        const fallbackYearly = profitPerUnit * 365;
                                        console.log('📊 Using Fallback Calculation (365 days):', {
                                          profitPerUnit: profitPerUnit,
                                          fallbackYearly: fallbackYearly,
                                          formula: `${profitPerUnit.toFixed(2)} × 365 = £${fallbackYearly.toFixed(2)}`
                                        });
                                        return safeNumber(fallbackYearly).toFixed(2);
                                      }
                                      
                                      console.log('❌ No valid data for yearly profit calculation');
                                      return '0.00';
                                    })()}
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
                {(hasValidEvaluationData() || product?.forceShowEvaluation || product?.evaluation) && (
                  <div className="col-lg-6">
                    <div className="mb-3">
                      <div className="fw-bold mb-2" style={{fontSize: '0.9rem', color: '#2d3748'}}>
                        <i className="fas fa-calculator me-2"></i>Amazon FBA Revenue Calculator
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
                              <td className="fw-bold py-2 px-2 text-end text-success" style={{fontSize: '0.85rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>{(() => {
                                console.log('🔍 Sales Proceeds Debug:', {
                                  rawValue: product.evaluation.salesProceeds,
                                  isAdminProfitData: product?.isAdminProfitData,
                                  convertedValue: convertProfitValue(product.evaluation.salesProceeds)
                                });
                                return convertProfitValue(product.evaluation.salesProceeds);
                              })()}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-3" style={{fontSize: '0.7rem'}}>Commission</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.75rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '700'}}>{convertProfitValue(product.evaluation.commissionBase)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-4" style={{fontSize: '0.65rem', color: '#666'}}>Commission Tax</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.65rem', color: '#666'}}>{convertProfitValue(product.evaluation.commissionTax)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-3" style={{fontSize: '0.7rem'}}>Digital Services Fee</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.7rem'}}>{convertProfitValue(product.evaluation.digitalServiceBase)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-4" style={{fontSize: '0.65rem', color: '#666'}}>Digital Services Tax</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.65rem', color: '#666'}}>{convertProfitValue(product.evaluation.digitalServiceTax)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-3" style={{fontSize: '0.7rem'}}>FBA Fulfilment Fee</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.7rem'}}>{convertProfitValue(product.evaluation.fbaFeeBase)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-4" style={{fontSize: '0.65rem', color: '#666'}}>FBA Fulfilment Tax</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.65rem', color: '#666'}}>{convertProfitValue(product.evaluation.fbaFeeTax)}</td>
                            </tr>
                            <tr style={{background: '#fff3cd'}}>
                              <td className="fw-semibold py-2 px-2">Balance Change (Amazon Received)</td>
                              <td className="fw-bold py-2 px-2 text-end" style={{fontSize: '0.85rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>{convertProfitValue(product.evaluation.changeToBalance)}</td>
                            </tr>
                            <tr>
                              <td className="fw-semibold py-2 px-2">Product Cost</td>
                              <td className="fw-bold py-2 px-2 text-end text-danger" style={{fontSize: '0.85rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>-{convertProfitValue(product.evaluation.productCost)}</td>
                            </tr>
                            <tr style={{background: '#e6f7ee'}}>
                              <td className="fw-bold py-2 px-2" style={{fontSize: '0.85rem'}}>Net Profit</td>
                              <td className="fw-bold py-2 px-2 text-end text-success" style={{fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>{convertProfitValue(product.evaluation.netProfit)}</td>
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
              
              {/* Profit Analysis Section */}
              {product?.profitEvaluation && (
                <div className="row g-3" style={{marginTop: '20px'}}>
                  <div className="col-12">
                    <div style={{
                      background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)',
                      borderRadius: '15px',
                      padding: '20px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '15px'
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
              )}
              
              {/* Profit Calculator Section */}
              {product?.profitEvaluation && (
                <div className="row g-3" style={{marginTop: '20px'}}>
                  <div className="col-12">
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
                        marginBottom: '10px',
                        background: 'rgba(255, 255, 255, 0.8)',
                        padding: '8px',
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
                              marginBottom: '4px'
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
                              marginBottom: '4px'
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
              )}
            
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
              <Link to={`/?cat=${encodeURIComponent(product?.category || '')}`} className="btn btn-sm btn-outline-primary">View All</Link>
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
              <Link to="/" className="btn btn-sm btn-outline-primary">View All</Link>
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
            <div className="testimonials-section animate__animated animate__fadeInUp" style={{marginTop: '50px', paddingTop: '40px', marginBottom: '30px', borderTop: '2px solid #e2e8f0', background: 'linear-gradient(135deg, #ff6600 0%, #ff9933 50%, #ffcc66 100%)', borderRadius: '16px', padding: '35px 25px', boxShadow: '0 10px 30px rgba(255, 102, 0, 0.3)'}}>
              <div className="text-center mb-5">
                <h3 style={{fontSize: '1.5rem', fontWeight: '700', color: 'white', marginBottom: '10px', textShadow: '0 2px 4px rgba(0,0,0,0.3)'}}>
                  <i className="fas fa-star text-warning me-2"></i>What Our Customers Say
                </h3>
                <p style={{fontSize: '0.9rem', color: 'rgba(255,255,255,0.95)', marginBottom: 0, fontWeight: '500'}}>
                  Real reviews from verified buyers worldwide
                </p>
              </div>
              <div className="row g-4">
                {product.testimonials.map((testimonial, idx) => (
                  <div key={idx} className="col-md-4">
                    <div className="testimonial-card" style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #fff8f0 100%)', 
                      borderRadius: '12px', 
                      padding: '25px', 
                      height: '100%', 
                      boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '2px solid rgba(255, 102, 0, 0.2)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 102, 0, 0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.15)';
                    }}
                    >
                      <div className="position-absolute" style={{
                        top: '-10px',
                        right: '-10px',
                        fontSize: '4rem',
                        color: '#ff6600',
                        opacity: 0.1,
                        fontFamily: 'Georgia, serif'
                      }}>
                        "
                      </div>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <div className="fw-bold" style={{fontSize: '1rem', color: '#2d3748'}}>{testimonial.name}</div>
                          <div className="text-muted" style={{fontSize: '0.8rem'}}>
                            <i className="fas fa-map-marker-alt me-1" style={{color: '#ff6600'}}></i>{testimonial.location}
                          </div>
                        </div>
                        <div className="text-warning" style={{fontSize: '0.9rem'}}>
                          {[...Array(testimonial.rating)].map((_, i) => (
                            <i key={i} className="fas fa-star"></i>
                          ))}
                        </div>
                      </div>
                      <p style={{fontSize: '0.875rem', color: '#4a5568', marginBottom: '20px', lineHeight: '1.7', fontStyle: 'italic'}}>
                        "{testimonial.comment}"
                      </p>
                      <div className="d-flex justify-content-between align-items-center pt-3" style={{borderTop: '2px solid #ffe5cc'}}>
                        <small className="text-muted" style={{fontSize: '0.75rem'}}>
                          <i className="far fa-clock me-1"></i>{testimonial.date}
                        </small>
                        <span className="badge" style={{fontSize: '0.7rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '4px 8px'}}>
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

      {/* Payment Upload Modal */}
      <PaymentUploadModal
        show={showPaymentUploadModal}
        onClose={() => setShowPaymentUploadModal(false)}
        productId={product?._id || product?.id}
        productName={product?.name}
      />

      {/* Login Modal */}
      {showLoginModal && (
        <div 
          className="modal show d-block" 
          style={{backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999}}
          onClick={() => setShowLoginModal(false)}
        >
          <div 
            className="modal-dialog modal-dialog-centered" 
            style={{maxWidth: '400px'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content" style={{borderRadius: '12px', overflow: 'hidden'}}>
              <div className="modal-header" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', padding: '20px', border: 'none'}}>
                <h5 className="modal-title" style={{fontSize: '18px', fontWeight: '700', margin: 0}}>
                  <i className="fas fa-sign-in-alt me-2"></i>Login Required
                </h5>
                <button 
                  type="button" 
                  onClick={() => setShowLoginModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700'
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body" style={{padding: '30px', textAlign: 'center'}}>
                <div style={{marginBottom: '20px'}}>
                  <i className="fas fa-shopping-cart" style={{fontSize: '48px', color: '#667eea', marginBottom: '15px'}}></i>
                  <h6 style={{fontSize: '16px', fontWeight: '600', marginBottom: '10px', color: '#111'}}>
                    Please login to buy products
                  </h6>
                  <p style={{fontSize: '14px', color: '#6b7280', marginBottom: '0'}}>
                    You need to be logged in as a buyer to purchase products from our marketplace.
                  </p>
                </div>
                
                <div style={{display: 'flex', gap: '10px', marginTop: '25px'}}>
                  <button
                    onClick={() => {
                      setShowLoginModal(false);
                      navigate('/login/buyer');
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#667eea',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#5568d3'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                  >
                    <i className="fas fa-sign-in-alt me-2"></i>Login
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowLoginModal(false);
                      navigate('/register/buyer');
                    }}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#10b981'}
                  >
                    <i className="fas fa-user-plus me-2"></i>Sign Up
                  </button>
                </div>
                
                <div style={{marginTop: '20px', padding: '15px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb'}}>
                  <p style={{fontSize: '12px', color: '#6b7280', margin: '0'}}>
                    <i className="fas fa-info-circle me-1"></i>
                    New to our platform? Sign up to access wholesale prices and exclusive deals.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductDetail