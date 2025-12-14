import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { completeProductsData, getProductById } from '../data/completeProducts'
import { products } from '../data/allProducts'
import { getImageUrl } from '../utils/imageImports'
import ScrollToTop from '../components/ScrollToTop'
import PaymentModal from '../components/PaymentModal'
import apiConfig from '../config/api.config'
import { useCurrency } from '../context/CurrencyContext'
import { useAdmin } from '../context/AdminContext'
import '../styles/product-detail-compact.css'

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
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isSellerLoggedIn, setIsSellerLoggedIn] = useState(false)
  const [currentSeller, setCurrentSeller] = useState(null)
  const [savingUnits, setSavingUnits] = useState(false) // Loading state for saving units
  const [quantity, setQuantity] = useState(100) // Minimum quantity is 100

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

  // Check if user is admin or seller
  useEffect(() => {
    const sellerToken = localStorage.getItem('sellerToken');
    const isSellerUser = !!sellerToken;
    
    console.log('Auth check:', { 
      adminLoggedIn: isAdminLoggedIn, 
      admin: admin,
      sellerToken: !!sellerToken, 
      isSellerUser 
    });
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
      // Fetch a mix of products - some from same category, some from different categories
      const promises = [
        // Get products from same category
        fetch(apiConfig.getApiUrl(`products/public?category=${encodeURIComponent(currentProduct.category || '')}&limit=15`)),
        // Get products from different categories for diversity
        fetch(apiConfig.getApiUrl(`products/public?limit=30&sortBy=rating&order=desc`)),
        // Get products from random categories for more diversity
        fetch(apiConfig.getApiUrl(`products/public?limit=20&sortBy=createdAt&order=desc`))
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
    console.log('fetchSellerInfo called with sellerId:', sellerId);
    if (!sellerId) {
      console.log('No sellerId provided');
      return;
    }
    
    try {
      console.log('Admin logged in:', isAdminLoggedIn);
      
      if (!isAdminLoggedIn) {
        console.log('Admin not logged in, skipping seller fetch');
        return;
      }
      
      const adminToken = localStorage.getItem('adminToken');
      
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

  // Fetch related products when product changes
  useEffect(() => {
    if (product && product.id) {
      fetchRelatedProducts(product);
    }
  }, [product]);



  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      
      // Try to fetch from database first using the product ID
      try {
        // Add cache busting to ensure fresh data
        const cacheBuster = new Date().getTime();
        const response = await fetch(apiConfig.getApiUrl(`products/public/${id}?_=${cacheBuster}`), {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        console.log('🔄 Fetching product data with cache buster:', cacheBuster);
        if (response.ok) {
          const dbProduct = await response.json()
          
          // Use database product data
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
            dealUnits: dbProduct.dealUnits || 1,
            seller: dbProduct.seller,
            sellerInfo: dbProduct.sellerInfo,
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
          
          // Add profit data from database
          console.log('=== PROFIT DATA FROM DATABASE ===')
          console.log('Product name:', productData.name)
          console.log('Product ID:', dbProduct._id)
          console.log('Raw product price from DB:', dbProduct.price)
          console.log('Processed product price:', productData.price)
          console.log('Platform Comparison:', dbProduct.platformComparison)
          console.log('Profit Calculations:', dbProduct.profitCalculations)
          console.log('Profit Evaluation:', dbProduct.profitEvaluation)
          
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
              // Update the product RRP with the value from admin panel
              productData.rrp = `₨${rrpPlatform.rrpPerUnit}`;
              console.log('✅ Updated product RRP from admin panel:', productData.rrp);
              console.log('✅ RRP Platform data:', rrpPlatform);
            }
            
            productData.platforms = dbProduct.platformComparison.map(platform => {
              const perUnitPrice = platform.rrpPerUnit;
              const units = platform.units || 200; // Use platform-specific units
              const totalPrice = perUnitPrice * units;
              const totalProfit = platform.profitFor200Units || 0; // Use stored total profit
              
              console.log(`Platform ${platform.platform}:`, {
                originalPerUnit: perUnitPrice,
                units: units,
                calculatedTotal: totalPrice,
                storedProfit: totalProfit
              });
              
              return {
                name: platform.platform,
                price: totalPrice, // Total price for specified units
                grossProfit: totalProfit, // Use stored profit calculation
                markup: platform.markup,
                units: units, // Store the unit quantity
                perUnitPrice: perUnitPrice, // Store per unit price
                isPKR: true // Mark as PKR data for proper conversion
              };
            })
            
            // Store the unit quantity for display
            productData.platformUnits = dbProduct.platformUnits || 200;
            console.log('Final converted platforms:', productData.platforms)
          }
          
          if (dbProduct.profitCalculations || dbProduct.profitEvaluation) {
            console.log('Using profit calculations from admin panel')
            console.log('Profit calculations:', dbProduct.profitCalculations)
            console.log('Profit evaluation:', dbProduct.profitEvaluation)
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
              
              // Use the converted PKR value as product cost
              let productCost = productCostPKR;
              console.log('💰 Using converted product cost:', productCost, 'PKR');
              
              // Use saved profit calculations if available, otherwise auto-calculate
              const balanceChange = dbProduct.profitEvaluation.balanceChange || 0;
              const calculatedNetProfit = balanceChange - productCost; // Formula: Net Profit = Balance Change - Product Cost
              
              // Always use the formula: Balance Change - Product Cost = Net Profit = Profit per Unit
              // This ensures consistency across all displays
              const netProfitAndProfitPerUnit = calculatedNetProfit; // Both Net Profit and Profit per Unit are the same
              
              console.log('🧮 PROFIT CALCULATIONS (FORMULA: Balance Change - Product Cost):');
              console.log('- Product Cost:', productCost, 'PKR');
              console.log('- Balance Change:', balanceChange, 'PKR');
              console.log('- Net Profit = Balance Change - Product Cost:', calculatedNetProfit, 'PKR');
              console.log('- Profit per Unit = Net Profit:', netProfitAndProfitPerUnit, 'PKR');
              console.log('- Formula applied consistently: ✅');
              
              // Admin panel values are in PKR, store them as PKR for conversion
              productData.evaluation = {
                salesProceeds: dbProduct.profitEvaluation.salesProceeds || 0, // PKR
                commissionBase: -(Math.abs(dbProduct.profitEvaluation.commission || 0)), // Negative because it's a fee, PKR
                commissionTax: -(Math.abs(dbProduct.profitEvaluation.commissionTax || 0)), // Negative because it's a fee, PKR
                digitalServiceBase: -(Math.abs(dbProduct.profitEvaluation.digitalServicesFee || 0)), // Negative because it's a fee, PKR
                digitalServiceTax: -(Math.abs(dbProduct.profitEvaluation.digitalServicesTax || 0)), // Negative because it's a fee, PKR
                fbaFeeBase: -(Math.abs(dbProduct.profitEvaluation.fbaFulfilmentFee || 0)), // Negative because it's a fee, PKR
                fbaFeeTax: -(Math.abs(dbProduct.profitEvaluation.fbaFulfilmentTax || 0)), // Negative because it's a fee, PKR
                totalFees: -((Math.abs(dbProduct.profitEvaluation.commission || 0)) + (Math.abs(dbProduct.profitEvaluation.commissionTax || 0)) + (Math.abs(dbProduct.profitEvaluation.digitalServicesFee || 0)) + (Math.abs(dbProduct.profitEvaluation.digitalServicesTax || 0)) + (Math.abs(dbProduct.profitEvaluation.fbaFulfilmentFee || 0)) + (Math.abs(dbProduct.profitEvaluation.fbaFulfilmentTax || 0))),
                productCost: productCost, // Use current product price
                netProfit: netProfitAndProfitPerUnit, // Formula: Balance Change - Product Cost
                changeToBalance: balanceChange, // PKR
                isPKR: true // Mark as PKR data for proper conversion
              }
              
              // Set profit calculations using the consistent formula
              productData.profitCalculations = {
                costPrice: costPricePKR, // Keep in PKR
                sellingPrice: dbProduct.profitEvaluation?.salesProceeds || 0, // PKR
                profitPerUnit: netProfitAndProfitPerUnit, // Formula: Balance Change - Product Cost
                monthlyProfit: dbProduct.profitCalculations?.profitFor200Units || (netProfitAndProfitPerUnit * (productData.dealUnits || 200)), // PKR - use stored value or calculate
                monthlyProfitPKR: dbProduct.profitCalculations?.profitFor200Units || 0,
                isPKR: true // Mark as PKR data for proper conversion
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
                  // Update the product RRP with the value from admin panel
                  productData.rrp = `₨${rrpPlatform.rrpPerUnit}`;
                  console.log('🔧 FORCING RRP update from admin panel:', productData.rrp);
                }
                
                productData.platforms = dbProduct.platformComparison.map(platform => {
                  const units = platform.units || 200; // Use platform-specific units
                  const totalProfit = platform.profitFor200Units || 0;
                  return {
                    name: platform.platform,
                    price: platform.rrpPerUnit,
                    grossProfit: totalProfit,
                    markup: platform.markup,
                    units: units,
                    perUnitPrice: platform.rrpPerUnit,
                    isPKR: true
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
      
      console.log('URL params:', { nameParam, imgParam, priceParam, badgeParam })
      
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
              price: (foundProduct.currency || 'GBP') === 'GBP' ? `£${foundProduct.price}` : 
                     foundProduct.currency === 'USD' ? `$${foundProduct.price}` :
                     foundProduct.currency === 'AED' ? `د.إ${foundProduct.price}` :
                     `₨${foundProduct.price}`,
              rrp: foundProduct.originalPrice ? `₨${foundProduct.originalPrice}` : '?420.99',
              rating: foundProduct.rating || 4.5,
              dealUnits: foundProduct.dealUnits || 1,
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
                price: foundProduct.currency === 'GBP' ? `£${foundProduct.price}` : 
                       foundProduct.currency === 'USD' ? `$${foundProduct.price}` :
                       foundProduct.currency === 'AED' ? `د.إ${foundProduct.price}` :
                       `₨${foundProduct.price}`, // Use the actual currency from database
                rrp: foundProduct.originalPrice ? `₨${foundProduct.originalPrice}` : '?420.99',
                rating: foundProduct.rating || 4.5,
                dealUnits: foundProduct.dealUnits || 1,
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

  // Helper function to convert PKR values to selected currency
  const convertFromPKR = (pkrValue) => {
    const value = safeNumber(pkrValue);
    // Convert PKR to target currency
    const converted = value * currencyRates[currency];
    return `${currencySymbols[currency]}${converted.toFixed(2)}`;
  };

  // Helper function to convert profit values based on data source
  const convertProfitValue = (value) => {
    if (product?.isAdminProfitData) {
      return convertFromPKR(value); // Admin data is in PKR
    } else {
      return convertFromGBP(value); // Hardcoded data is in GBP
    }
  };

  // Check if platform data has actual values (not dummy/empty data)
  const hasValidPlatformData = () => {
    if (product?.platforms && product.platforms.length > 0) {
      // Check if any platform has non-zero values
      return product.platforms.some(platform => 
        (platform.price && parseFloat(String(platform.price).replace(/[£₨$€]/g, '')) > 0) ||
        (platform.grossProfit && parseFloat(String(platform.grossProfit).replace(/[£₨$€]/g, '')) > 0)
      );
    }
    
    // For calculated data, check if we have valid RRP
    if (product?.rrp) {
      const rrpValue = parseFloat(product.rrp.replace(/[£₨$€]/g, ''));
      return !isNaN(rrpValue) && rrpValue > 0;
    }
    
    return false;
  };

  // Check if profit calculations have actual values (not dummy/empty data)
  const hasValidProfitData = () => {
    if (!product?.profitCalculations) return false;
    
    // Check if any profit calculation has non-zero values
    return (
      (product.profitCalculations.profitPerUnit && parseFloat(String(product.profitCalculations.profitPerUnit).replace(/[£₨$€]/g, '')) > 0) ||
      (product.profitCalculations.monthlyProfit && parseFloat(String(product.profitCalculations.monthlyProfit).replace(/[£₨$€]/g, '')) > 0)
    );
  };

  // Check if profit evaluation has actual values (not dummy/empty data)
  const hasValidEvaluationData = () => {
    if (!product?.evaluation) return false;
    
    // Check if any evaluation field has non-zero values
    return (
      (product.evaluation.salesProceeds && parseFloat(String(product.evaluation.salesProceeds).replace(/[£₨$€]/g, '')) > 0) ||
      (product.evaluation.netProfit && parseFloat(String(product.evaluation.netProfit).replace(/[£₨$€]/g, '')) !== 0) ||
      (product.evaluation.productCost && parseFloat(String(product.evaluation.productCost).replace(/[£₨$€]/g, '')) > 0)
    );
  };

  // Helper function to get RRP markup from Platform Comparison data
  const getRRPMarkupFromPlatforms = () => {
    try {
      const platformData = calculatePlatformData();
      if (platformData && platformData.length > 0) {
        const rrpPlatform = platformData.find(platform => 
          platform.name && platform.name.toLowerCase().includes('rrp')
        );
        if (rrpPlatform && rrpPlatform.markup) {
          console.log('✅ Found RRP markup from platforms:', rrpPlatform.markup);
          return rrpPlatform.markup;
        }
      }
      
      // Backup: try direct platform data
      if (product.platforms && product.platforms.length > 0) {
        const rrpPlatform = product.platforms.find(platform => 
          platform.name && platform.name.toLowerCase().includes('rrp')
        );
        if (rrpPlatform && rrpPlatform.markup) {
          console.log('✅ Found RRP markup from direct platforms:', rrpPlatform.markup);
          return rrpPlatform.markup;
        }
      }
    } catch (error) {
      console.error('❌ Error getting RRP markup:', error);
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
    
    // If we have admin panel platform data, use it with selected units
    if (product?.platforms && product.platforms.length > 0) {
      if (isTargetProduct) {
        console.log('✅ Using admin panel platform data with selected units:', product.platforms);
      }
      // Use stored platform data with individual units
      return product.platforms.map(platform => {
        const perUnitPrice = platform.perUnitPrice || parseFloat(String(platform.price).replace(/[£₨$€]/g, '')) / (platform.units || 200);
        const platformUnits = platform.units || 200; // Use platform-specific units
        const totalPrice = perUnitPrice * platformUnits;
        const totalProfit = platform.grossProfit || 0; // Use stored profit
        
        return {
          ...platform,
          price: totalPrice,
          grossProfit: totalProfit,
          units: platformUnits,
          description: `Total Profit: ${totalProfit} for ${platformUnits} units`
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
    
    // Calculate prices and profits for selected units
    const rrpTotal = rrpValue * selectedUnits;
    const amazonPrice = rrpValue * 0.70; // 30% less than RRP
    const amazonTotal = amazonPrice * selectedUnits;
    const ebayPrice = rrpValue * 0.75; // 25% less than RRP
    const ebayTotal = ebayPrice * selectedUnits;
    
    // Get cost price and convert to GBP if needed
    const costPriceRaw = parseFloat(product.price.replace(/[£₨$€]/g, ''));
    // Check if price is in PKR (₨) or GBP (£)
    const isPKR = product.price.includes('₨') || product.price.includes('Rs');
    const isGBP = product.price.includes('£');
    
    // Convert cost price to GBP
    let costPriceGBP;
    if (isPKR) {
      costPriceGBP = costPriceRaw * 0.00272; // Convert PKR to GBP
    } else if (isGBP) {
      costPriceGBP = costPriceRaw; // Already in GBP
    } else {
      // Assume PKR if no currency symbol
      costPriceGBP = costPriceRaw * 0.00272;
    }
    
    const costTotal = costPriceGBP * selectedUnits;
    
    // Calculate profits as total revenue (RRP * selected units)
    const rrpProfit = rrpTotal; // RRP * selected units (total revenue)
    const amazonProfit = amazonTotal; // Amazon price * selected units (total revenue)
    const ebayProfit = ebayTotal; // eBay price * selected units (total revenue)
    
    // Calculate markup percentages (Revenue vs Cost)
    const rrpMarkup = (((rrpTotal - costTotal) / costTotal) * 100).toFixed(2);
    const amazonMarkup = (((amazonTotal - costTotal) / costTotal) * 100).toFixed(2);
    const ebayMarkup = (((ebayTotal - costTotal) / costTotal) * 100).toFixed(2);
    
    return [
      { 
        name: 'RRP', 
        price: `£${rrpTotal.toFixed(2)}`, 
        grossProfit: `£${rrpProfit.toFixed(2)}`, 
        markup: `${rrpMarkup}%`,
        description: `Total Revenue: RRP × ${selectedUnits} units`
      },
      { 
        name: 'Amazon', 
        price: `£${amazonTotal.toFixed(2)}`, 
        grossProfit: `£${amazonProfit.toFixed(2)}`, 
        markup: `${amazonMarkup}%`,
        description: `Total Revenue: Amazon Price × ${selectedUnits} units`
      },
      { 
        name: 'eBay', 
        price: `£${ebayTotal.toFixed(2)}`, 
        grossProfit: `£${ebayProfit.toFixed(2)}`, 
        markup: `${ebayMarkup}%`,
        description: `Total Revenue: eBay Price × ${selectedUnits} units`
      }
    ];
  };

  // Get badge styling based on badge text
  const getBadgeStyle = (badgeText) => {
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
    <div className="product-detail-page">

      {/* Breadcrumb with Animation */}
      <div className="container mt-1 mb-0 animate__animated animate__fadeInDown">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb bg-light p-2 rounded shadow-sm mb-0" style={{fontSize: '0.85rem'}}>
            {(() => {
              console.log('🍞 Breadcrumb check:', {
                returnTo: location.state?.returnTo,
                returnCategory: returnCategory,
                locationState: location.state
              });
              return location.state?.returnTo === '/admin/products';
            })() ? (
              <>
                <li className="breadcrumb-item">
                  <span 
                    onClick={() => {
                      console.log('🔙 ProductDetail back clicked, returnCategory:', returnCategory);
                      const backUrl = `/admin/products${returnCategory ? `?category=${returnCategory}` : ''}`;
                      navigate(backUrl, {
                        state: { category: returnCategory }
                      });
                    }}
                    style={{cursor: 'pointer'}}
                    className="text-decoration-none"
                  >
                    <i className="fas fa-arrow-left me-1"></i>Back to Products
                  </span>
                </li>
                <li className="breadcrumb-item active fw-bold">{product.name}</li>
              </>
            ) : (
              <>
                <li className="breadcrumb-item"><Link to="/" className="text-decoration-none"><i className="fas fa-home me-1"></i>Amazon's Choice</Link></li>
                <li className="breadcrumb-item active fw-bold">{product.name}</li>
              </>
            )}
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
                <div className="position-relative mb-2" style={{background: '#ffffff', border: '2px solid #e5e7eb', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                  <img 
                    src={product.images && product.images[selectedImage] ? product.images[selectedImage] : product.image} 
                    alt={product.name} 
                    className="img-fluid"
                    style={{width: '100%', height: window.innerWidth < 768 ? '250px' : '320px', objectFit: 'contain'}}
                  />
                  <div className="position-absolute top-0 start-0 m-2">
                    {(() => {
                      const badgeParam = searchParams.get('badge')
                      const badgeStyle = getBadgeStyle(badgeParam)
                      return (
                        <span 
                          className="badge px-2 py-1" 
                          style={{
                            fontSize: '0.65rem',
                            backgroundColor: badgeStyle.bgColor,
                            color: badgeStyle.textColor || '#fff'
                          }}
                        >
                          <i className={`fas ${badgeStyle.icon} me-1`}></i>{badgeStyle.text}
                        </span>
                      )
                    })()}
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
                  {(() => {
                    // Use admin-set RRP markup from Platform Comparison, fallback to product.markup
                    const adminRRPMarkup = getRRPMarkupFromPlatforms();
                    const displayMarkup = adminRRPMarkup || product.markup;
                    
                    if (displayMarkup) {
                      console.log('🏷️ Badge markup - Admin RRP:', adminRRPMarkup, 'Product markup:', product.markup, 'Using:', displayMarkup);
                      return (
                        <span className="badge bg-success px-2 py-1 me-2" style={{fontSize: '0.65rem'}}>
                          {displayMarkup}
                        </span>
                      );
                    }
                    return null;
                  })()}

                </div>

                <hr className="my-2" />
                  
                {/* Price Section */}
                <div className="price-section mb-2">
                  <div className="d-flex justify-content-between align-items-start gap-3 mb-1">
                    {/* Left side - Price and RRP */}
                    <div>
                      <div className="d-flex align-items-baseline gap-2 flex-wrap">
                        <span className="fw-bold" style={{fontSize: '1.4rem', color: '#B12704'}}>
                          {convertPrice(product.price)}
                        </span>
                        <span className="text-muted" style={{fontSize: '0.75rem'}}>/Unit ex. VAT</span>
                      </div>
                      {/* RRP and Save - Right below price */}
                      <div className="d-flex gap-3 mt-1">
                        <div>
                          <small className="text-muted" style={{fontSize: '0.7rem'}}>RRP: </small>
                          <span className="fw-semibold" style={{fontSize: '0.8rem'}}>{convertPrice(product.rrp)}</span>
                        </div>
                        <div>
                          <small className="text-muted" style={{fontSize: '0.7rem'}}>Save: </small>
                          <span className="fw-semibold text-danger" style={{fontSize: '0.8rem'}}>
                            {(() => {
                              // Use the helper function to get admin-set RRP markup
                              const adminRRPMarkup = getRRPMarkupFromPlatforms();
                              if (adminRRPMarkup) {
                                console.log('✅ Save% using admin-set RRP markup:', adminRRPMarkup);
                                return adminRRPMarkup;
                              }
                              
                              // Fallback: Calculate markup the same way Platform Comparison does
                              const wholesale = parseFloat(product.price.replace(/[₨£$€Rs]/g, ''))
                              const rrp = parseFloat(product.rrp.replace(/[₨£$€Rs]/g, ''))
                              
                              console.log('🔍 Fallback calculation - wholesale:', wholesale, 'rrp:', rrp);
                              
                              // If we can parse both prices, calculate markup percentage
                              if (!isNaN(wholesale) && !isNaN(rrp) && rrp > 0 && wholesale > 0) {
                                // Calculate markup: ((RRP - Wholesale) / Wholesale) * 100
                                const markup = ((rrp - wholesale) / wholesale * 100).toFixed(0);
                                console.log('🔍 Calculated markup percentage (RRP method):', `${markup}%`);
                                return `${markup}%`;
                              }
                              
                              // If we can't parse prices, calculate savings instead
                              if (!isNaN(wholesale) && !isNaN(rrp) && rrp > 0) {
                                const savings = ((rrp - wholesale) / rrp * 100).toFixed(0)
                                console.log('🔍 Calculated savings percentage (fallback):', `${savings}%`);
                                return `${savings}%`;
                              }
                              
                              // Last resort: Default savings by product type
                              const productName = product.name.toLowerCase()
                              if (productName.includes('nose ring')) return '65%'
                              if (productName.includes('bulb')) return '70%'
                              if (productName.includes('fuse')) return '60%'
                              if (productName.includes('lampshade')) return '55%'
                              if (productName.includes('leather') && productName.includes('watch strap')) return '50%'
                              
                              console.log('🔍 Using default percentage: 50%');
                              return '50%' // Default
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right side - Profit Information */}
                    {hasValidProfitData() && product.profitCalculations.profitPerUnit && (
                      <div 
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          background: '#f9fafb',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#2d3748',
                          minWidth: '320px'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px',
                          paddingBottom: '6px',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          <span style={{fontSize: '0.8rem', fontWeight: '700', color: '#111'}}>
                            Amazon Profit Calculation
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
                              background: '#ff9900',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 10px',
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            Verify
                          </button>
                        </div>
                        <div style={{marginBottom: '4px'}}>
                          💰 Profit/unit: <span style={{color: '#059669'}}>{(() => {
                            // Use the same profit logic as AmazonsChoice for consistency
                            const productName = product.name.toLowerCase();
                            let profitPerUnit = product.profitCalculations.profitPerUnit;
                            
                            // Apply hardcoded profits for specific products (same as AmazonsChoice)
                            if (productName.includes('nose ring')) {
                              profitPerUnit = 40.14; // £40.14 converted to number
                            } else if (productName.includes('bulb')) {
                              profitPerUnit = 251.10; // £251.10 converted to number
                            } else if (productName.includes('fuse')) {
                              profitPerUnit = 455.80; // £455.80 converted to number
                            } else if (productName.includes('lampshade')) {
                              profitPerUnit = 227.80; // £227.80 converted to number
                            } else if (productName.includes('leather') && productName.includes('watch')) {
                              profitPerUnit = 586.00; // £586.00 converted to number
                            }
                            
                            console.log('🔍 ProductDetail Profit Debug:', {
                              productName: product.name,
                              originalProfitPerUnit: product.profitCalculations.profitPerUnit,
                              adjustedProfitPerUnit: profitPerUnit,
                              usedHardcoded: profitPerUnit !== product.profitCalculations.profitPerUnit
                            });
                            
                            return convertProfitValue(profitPerUnit);
                          })()}</span>
                        </div>
                        <div style={{marginBottom: '4px'}}>
                          📈 Profit/{quantity || 100} unit: <span style={{color: '#059669'}}>{(() => {
                            // Use the same profit logic as AmazonsChoice for consistency
                            const productName = product.name.toLowerCase();
                            let profitPerUnit = safeNumber(product.profitCalculations.profitPerUnit);
                            
                            // Apply hardcoded profits for specific products (same as AmazonsChoice)
                            if (productName.includes('nose ring')) {
                              profitPerUnit = 40.14;
                            } else if (productName.includes('bulb')) {
                              profitPerUnit = 251.10;
                            } else if (productName.includes('fuse')) {
                              profitPerUnit = 455.80;
                            } else if (productName.includes('lampshade')) {
                              profitPerUnit = 227.80;
                            } else if (productName.includes('leather') && productName.includes('watch')) {
                              profitPerUnit = 586.00;
                            }
                            
                            const totalProfit = profitPerUnit * (quantity || 100);
                            return convertProfitValue(totalProfit);
                          })()}</span>
                        </div>
                        <div>
                          💰 Cost of {quantity || 100} units: <span style={{color: '#059669'}}>{(() => {
                            // Use the actual product cost from evaluation, not the display price
                            const productCostPerUnit = product.evaluation?.productCost || 0;
                            const units = quantity || 100;
                            const totalCost = productCostPerUnit * units;
                            
                            console.log('💰 Cost Calculation Debug:', {
                              productCostPerUnit: productCostPerUnit,
                              units: units,
                              totalCost: totalCost,
                              formula: `${productCostPerUnit} × ${units} = ${totalCost}`
                            });
                            
                            return convertPrice(`₨${totalCost.toFixed(2)}`);
                          })()}</span>
                        </div>
                      </div>
                    )}
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
              <div className="sticky-top" style={{top: '100px', zIndex: 10}}>
                <div className="border rounded p-3 mobile-buy-box" style={{background: '#ffffff', border: '2px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', color: '#1f2937'}}>
                  
                  {/* Buy Box Content */}
                  
                  {/* Price in Buy Box */}
                  <div className="mb-2">
                    <div className="d-flex align-items-baseline gap-1">
                      <span className="fw-bold" style={{fontSize: '1.2rem', color: '#dc2626'}}>
                        {convertPrice(product.price)}
                      </span>
                      <span style={{fontSize: '0.7rem', color: '#6b7280'}}>/Unit</span>
                    </div>
                    <small style={{fontSize: '0.7rem', color: '#6b7280'}}>ex. VAT</small>
                  </div>

                  {/* In Stock */}
                  <div className="mb-2">
                    <div className="fw-bold" style={{fontSize: '0.85rem', color: '#059669'}}>
                      <i className="fas fa-check-circle me-1"></i>In Stock
                    </div>
                    <small style={{fontSize: '0.7rem', color: '#6b7280'}}>
                      Ships from {product.dealInfo?.location || 'Pakistan'}
                    </small>
                  </div>

                  {/* Quantity Selector */}
                  <div className="mb-2">
                    <label className="form-label fw-bold mb-1" style={{fontSize: '0.75rem', color: '#1f2937'}}>Quantity:</label>
                    <input 
                      type="number" 
                      className="form-control form-control-sm" 
                      style={{fontSize: '0.8rem', color: '#1f2937', backgroundColor: '#ffffff', border: '1px solid #d1d5db'}}
                      value={quantity}
                      min="100"
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
                        // Ensure value is at least 100 when user leaves the field
                        const value = parseInt(e.target.value);
                        if (isNaN(value) || value < 100) {
                          setQuantity(100);
                        }
                      }}
                      placeholder="Minimum 100 units"
                    />
                    <small style={{fontSize: '0.65rem', color: '#6b7280'}}>
                      Minimum order: 100 units
                    </small>
                  </div>



                  {/* Buy Now Button */}
                  <div className="d-grid gap-2 mb-2">
                    <button 
                      className="btn btn-danger" 
                      style={{fontSize: '0.8rem', padding: '8px'}}
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

                  <hr />

                  {/* Supplier Details */}
                  <div className="mb-2">
                    <h3 className="fw-bold mb-2" style={{fontSize: '0.85rem', color: '#1f2937'}}>Supplier Information</h3>
                    

                    
                    {/* Show seller info - full for admin and own seller, limited for others */}
                    {console.log('🔍 Seller info debug:', { 
                      isAdmin,
                      isAdminLoggedIn,
                      adminFromContext: admin,
                      isSellerLoggedIn, 
                      currentSeller: currentSeller?._id, 
                      productSeller: product.seller, 
                      productSellerInfo: product.sellerInfo,
                      sellerInfoState: sellerInfo,
                      match: product.seller === currentSeller?._id || product.seller?.toString() === currentSeller?._id?.toString()
                    })}
                    {isSellerLoggedIn && currentSeller && (product.seller === currentSeller._id || product.seller?.toString() === currentSeller._id?.toString()) ? (
                      <div className="border rounded p-2 mb-2" style={{background: '#f0f9ff'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-user text-primary me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-primary" style={{fontSize: '0.75rem'}}>Your Product</span>
                          </div>
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Supplier ID:</strong> {currentSeller.supplierId}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Location:</strong> 📍 {currentSeller.city}, {currentSeller.country}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>WhatsApp:</strong> {currentSeller.whatsappNo}
                        </div>
                        <div className="mb-1" style={{fontSize: '0.7rem'}}>
                          <strong>Status:</strong> 
                          <span className={`badge ms-1 ${currentSeller.verificationStatus === 'approved' ? 'bg-success' : 'bg-warning'}`} style={{fontSize: '0.65rem'}}>
                            {currentSeller.verificationStatus}
                          </span>
                        </div>
                        <div className="alert alert-info border-0 mt-2 mb-0" style={{fontSize: '0.65rem', padding: '4px 8px'}}>
                          <i className="fas fa-info-circle me-1"></i>
                          This is your listed product
                        </div>
                      </div>
                    ) : (isAdmin || (isSellerLoggedIn && (product.seller === currentSeller?._id || product.seller?.toString() === currentSeller?._id?.toString()))) && product.sellerInfo && product.sellerInfo.verificationStatus === 'approved' ? (
                      // Show full details to admin or product owner
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
                            href={`https://wa.me/${product.sellerInfo.whatsappNo.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-success ms-1"
                          >
                            <i className="fab fa-whatsapp me-1"></i>
                            {product.sellerInfo.whatsappNo}
                          </a>
                        </div>
                      </div>
                    ) : product.sellerInfo && product.sellerInfo.verificationStatus === 'approved' ? (
                      // Show locked content for other users
                      <div className="border rounded p-2 mb-2" style={{background: '#f8f9fa'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-lock text-warning me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-warning" style={{fontSize: '0.75rem'}}>Verified Seller - Locked</span>
                          </div>
                        </div>
                        <div className="mb-2" style={{fontSize: '0.7rem', color: '#6c757d'}}>
                          <i className="fas fa-eye-slash me-1"></i>
                          Supplier details are protected
                        </div>
                        {!isSellerLoggedIn && !isBuyerLoggedIn ? (
                          <button 
                            className="btn btn-primary btn-sm w-100"
                            style={{fontSize: '0.7rem'}}
                            onClick={() => setShowLoginModal(true)}
                          >
                            <i className="fas fa-sign-in-alt me-1"></i>
                            Join Now to View Supplier
                          </button>
                        ) : isSellerLoggedIn ? (
                          <button 
                            className="btn btn-warning btn-sm w-100"
                            style={{fontSize: '0.7rem'}}
                            onClick={() => {
                              alert('Payment required to unlock supplier details. Contact admin for pricing.');
                            }}
                          >
                            <i className="fas fa-unlock me-1"></i>
                            Pay to Unlock Supplier Details
                          </button>
                        ) : (
                          <button 
                            className="btn btn-success btn-sm w-100"
                            style={{fontSize: '0.7rem'}}
                            onClick={() => {
                              alert('Upgrade to premium to view supplier details.');
                            }}
                          >
                            <i className="fas fa-crown me-1"></i>
                            Upgrade to View Supplier
                          </button>
                        )}
                      </div>
                    ) : isAdmin && sellerInfo ? (
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
                          <strong>Location:</strong> 📍 {sellerInfo.city}, {sellerInfo.country}
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
                    ) : (
                      // Default locked state for all other users
                      <div className="border rounded p-2 mb-2" style={{background: '#f8f9fa'}}>
                        <div className="mb-2">
                          <div className="d-flex align-items-center mb-1">
                            <i className="fas fa-lock text-warning me-1" style={{fontSize: '0.75rem'}}></i>
                            <span className="fw-semibold text-warning" style={{fontSize: '0.75rem'}}>Supplier Information - Locked</span>
                          </div>
                        </div>
                        <div className="mb-2" style={{fontSize: '0.7rem', color: '#6c757d'}}>
                          <i className="fas fa-eye-slash me-1"></i>
                          Supplier details are protected
                        </div>
                        {!isSellerLoggedIn && !isBuyerLoggedIn ? (
                          <button 
                            className="btn btn-primary btn-sm w-100"
                            style={{fontSize: '0.7rem'}}
                            onClick={() => setShowLoginModal(true)}
                          >
                            <i className="fas fa-sign-in-alt me-1"></i>
                            Join Now to View Supplier
                          </button>
                        ) : (
                          <button 
                            className="btn btn-warning btn-sm w-100"
                            style={{fontSize: '0.7rem'}}
                            onClick={() => {
                              alert('Contact admin for supplier access.');
                            }}
                          >
                            <i className="fas fa-unlock me-1"></i>
                            Request Supplier Access
                          </button>
                        )}
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
                {hasValidPlatformData() && (
                  <div className={hasValidEvaluationData() ? "col-lg-6" : "col-12"}>
                    <div className="mb-3">
                      <div className="fw-bold mb-2" style={{fontSize: '0.9rem', color: '#2d3748'}}>
                        <i className="fas fa-chart-line me-2"></i>Platform Comparison
                      </div>
                      <div className="table-responsive" style={{overflowX: 'auto', overflowY: 'hidden'}}>
                        <table className="table table-sm table-bordered shadow-sm mb-0" style={{fontSize: '0.75rem'}}>
                          <thead style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white'}}>
                            <tr>
                              <th className="fw-bold py-2 px-2" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Platform</th>
                              <th className="fw-bold py-2 px-2 text-center" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>RRP/Total</th>
                              <th className="fw-bold py-2 px-2 text-center" style={{borderRight: '1px solid rgba(255,255,255,0.2)'}}>Profit (per platform units)</th>
                              <th className="fw-bold py-2 px-2 text-center">Markup</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calculatePlatformData().map((platform, idx) => (
                              <tr key={idx} style={{background: idx % 2 === 0 ? '#f8f9fa' : 'white'}}>
                                <td className="fw-semibold py-2 px-2" style={{color: '#2d3748', fontSize: '0.75rem'}}>
                                  <i className={`fas fa-${platform.name === 'Amazon' ? 'shopping-cart' : platform.name === 'eBay' ? 'gavel' : 'store'} me-1 text-primary`} style={{fontSize: '0.7rem'}}></i>
                                  {platform.name}
                                </td>
                                <td className="fw-bold text-primary py-2 px-2 text-center" style={{fontSize: '0.75rem'}}>
                                  {platform.isPKR ? convertFromPKR(platform.price) : convertPrice(platform.price)}
                                </td>
                                <td className="fw-bold text-success py-2 px-2 text-center" style={{fontSize: '0.75rem'}}>
                                  <div>{platform.isPKR ? convertFromPKR(platform.grossProfit) : convertPrice(platform.grossProfit)}</div>
                                  <div style={{fontSize: '0.6rem', color: '#6c757d', fontWeight: 'normal'}}>
                                    ({platform.units || 200} units)
                                  </div>
                                </td>
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
                    </div>

                    {/* Profit Calculations - Below Platform Comparison */}
                    {hasValidProfitData() && (
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
                                  <div className="fw-bold text-success" style={{fontSize: '0.9rem'}}>
                                    {(() => {
                                      // Use the same profit logic as AmazonsChoice for consistency
                                      const productName = product.name.toLowerCase();
                                      let profitPerUnit = product.profitCalculations.profitPerUnit;
                                      
                                      // Apply hardcoded profits for specific products (same as AmazonsChoice)
                                      if (productName.includes('nose ring')) {
                                        profitPerUnit = 40.14;
                                      } else if (productName.includes('bulb')) {
                                        profitPerUnit = 251.10;
                                      } else if (productName.includes('fuse')) {
                                        profitPerUnit = 455.80;
                                      } else if (productName.includes('lampshade')) {
                                        profitPerUnit = 227.80;
                                      } else if (productName.includes('leather') && productName.includes('watch')) {
                                        profitPerUnit = 586.00;
                                      }
                                      
                                      return convertProfitValue(profitPerUnit);
                                    })()}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Monthly Profit</div>
                                  <div className="fw-bold text-primary" style={{fontSize: '0.9rem'}}>
                                    {(() => {
                                      // Use saved monthly profit if available, otherwise calculate
                                      console.log('🔍 Monthly Profit Debug:', {
                                        hasEvaluation: !!product.evaluation,
                                        evaluationMonthlyProfit: product.evaluation?.monthlyProfit,
                                        hasProfitEvaluation: !!product.profitEvaluation,
                                        profitEvaluationMonthlyProfit: product.profitEvaluation?.monthlyProfit,
                                        productStructure: Object.keys(product)
                                      });
                                      
                                      if ((product.evaluation && product.evaluation.monthlyProfit) || (product.profitEvaluation && product.profitEvaluation.monthlyProfit)) {
                                        const savedMonthlyProfit = product.evaluation?.monthlyProfit || product.profitEvaluation?.monthlyProfit;
                                        console.log('✅ Using saved monthly profit:', savedMonthlyProfit);
                                        return convertProfitValue(savedMonthlyProfit);
                                      } else {
                                        // Use the same profit logic as AmazonsChoice for consistency
                                        const productName = product.name.toLowerCase();
                                        let profitPerUnit = safeNumber(product.profitCalculations.profitPerUnit);
                                        
                                        // Apply hardcoded profits for specific products (same as AmazonsChoice)
                                        if (productName.includes('nose ring')) {
                                          profitPerUnit = 40.14;
                                        } else if (productName.includes('bulb')) {
                                          profitPerUnit = 251.10;
                                        } else if (productName.includes('fuse')) {
                                          profitPerUnit = 455.80;
                                        } else if (productName.includes('lampshade')) {
                                          profitPerUnit = 227.80;
                                        } else if (productName.includes('leather') && productName.includes('watch')) {
                                          profitPerUnit = 586.00;
                                        }
                                        
                                        const monthlyProfit = profitPerUnit * 30; // 30 units per month (fallback)
                                        console.log('⚠️ Calculating monthly profit (no saved value):', monthlyProfit, 'from profit per unit:', profitPerUnit);
                                        return convertProfitValue(monthlyProfit);
                                      }
                                    })()}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Yearly Profit</div>
                                  <div className="fw-bold text-warning" style={{fontSize: '0.9rem'}}>
                                    {(() => {
                                      // Use saved yearly profit if available, otherwise calculate
                                      console.log('🔍 Yearly Profit Debug:', {
                                        hasEvaluation: !!product.evaluation,
                                        evaluationYearlyProfit: product.evaluation?.yearlyProfit,
                                        hasProfitEvaluation: !!product.profitEvaluation,
                                        profitEvaluationYearlyProfit: product.profitEvaluation?.yearlyProfit
                                      });
                                      
                                      if ((product.evaluation && product.evaluation.yearlyProfit) || (product.profitEvaluation && product.profitEvaluation.yearlyProfit)) {
                                        const savedYearlyProfit = product.evaluation?.yearlyProfit || product.profitEvaluation?.yearlyProfit;
                                        console.log('✅ Using saved yearly profit:', savedYearlyProfit);
                                        return convertProfitValue(savedYearlyProfit);
                                      } else {
                                        // Use the same profit logic as AmazonsChoice for consistency
                                        const productName = product.name.toLowerCase();
                                        let profitPerUnit = safeNumber(product.profitCalculations.profitPerUnit);
                                        
                                        // Apply hardcoded profits for specific products (same as AmazonsChoice)
                                        if (productName.includes('nose ring')) {
                                          profitPerUnit = 40.14;
                                        } else if (productName.includes('bulb')) {
                                          profitPerUnit = 251.10;
                                        } else if (productName.includes('fuse')) {
                                          profitPerUnit = 455.80;
                                        } else if (productName.includes('lampshade')) {
                                          profitPerUnit = 227.80;
                                        } else if (productName.includes('leather') && productName.includes('watch')) {
                                          profitPerUnit = 586.00;
                                        }
                                        
                                        const yearlyProfit = profitPerUnit * 365; // 365 units per year (fallback)
                                        console.log('⚠️ Calculating yearly profit (no saved value):', yearlyProfit, 'from profit per unit:', profitPerUnit);
                                        return convertProfitValue(yearlyProfit);
                                      }
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
                {hasValidEvaluationData() && (
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
                              <td className="fw-bold py-2 px-2 text-end text-success">{convertProfitValue(product.evaluation.salesProceeds)}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-2 ps-3" style={{fontSize: '0.7rem'}}>Commission</td>
                              <td className="py-2 px-2 text-end text-danger" style={{fontSize: '0.7rem'}}>{convertProfitValue(product.evaluation.commissionBase)}</td>
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
                              <td className="fw-semibold py-2 px-2">Balance Change</td>
                              <td className="fw-bold py-2 px-2 text-end">{convertProfitValue(product.evaluation.changeToBalance)}</td>
                            </tr>
                            <tr>
                              <td className="fw-semibold py-2 px-2">Product Cost</td>
                              <td className="fw-bold py-2 px-2 text-end text-danger">-{convertProfitValue(product.evaluation.productCost)}</td>
                            </tr>
                            <tr style={{background: '#e6f7ee'}}>
                              <td className="fw-bold py-2 px-2" style={{fontSize: '0.85rem'}}>Net Profit</td>
                              <td className="fw-bold py-2 px-2 text-end text-success" style={{fontSize: '0.85rem'}}>{convertProfitValue(product.evaluation.netProfit)}</td>
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