import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { completeProductsData, getProductById } from '../data/completeProducts'
import { products } from '../data/allProducts'
import { getImageUrl } from '../utils/imageImports'
import PaymentModal from '../components/PaymentModal'
import PaymentUploadModal from '../components/PaymentUploadModal'
import SellerInformation from '../components/SellerInformation'
import ImageZoomModal from '../components/ImageZoomModal'
import apiConfig from '../config/api.config'
import { useCurrency } from '../context/CurrencyContext'
import { useAdmin } from '../context/AdminContext'
import { useBuyer } from '../context/BuyerContext'
import { useSeller } from '../context/SellerContext'
import { useBasket } from '../context/BasketContext'
import '../styles/product-detail-compact.css'
import '../styles/product-detail-enhanced.css'

// Component to fetch and display linked product image
import { ProductDetailSkeleton } from '../components/SkeletonLoaders'

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
      alt="Product Image"
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
  const { currency, currencyRates, currencySymbols, formatPrice } = useCurrency()
  const { admin, isLoggedIn: isAdminLoggedIn } = useAdmin()
  const { buyer, isLoggedIn: isBuyerLoggedIn } = useBuyer()
  const { seller, isLoggedIn: isSellerLoggedIn } = useSeller()
  const { addToBasket, isInBasket } = useBasket()
  const [relatedProducts, setRelatedProducts] = useState([])
  const [topDealsFromDB, setTopDealsFromDB] = useState([])
  const [mostPopularFromDB, setMostPopularFromDB] = useState([])
  const [isSupplierUnlocked, setIsSupplierUnlocked] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [supplierId, setSupplierId] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sellerInfo, setSellerInfo] = useState(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPaymentUploadModal, setShowPaymentUploadModal] = useState(false)
  const [currentSeller, setCurrentSeller] = useState(null)
  const [savingUnits, setSavingUnits] = useState(false) // Loading state for saving units
  const [quantity, setQuantity] = useState(1) // Set MOQ to 1
  const [showZoomModal, setShowZoomModal] = useState(false)

  // Initialize quantity to 1 (MOQ) when product loads, but allow independent changes
  useEffect(() => {
    if (product && quantity === 1) {
      // Keep quantity at 1 as MOQ, but allow user to change it
      setQuantity(1);
    }
  }, [product]);

  // Function to check if product is available for purchase
  const hasStock = () => {
    if (!product) return false;
    
    // Check if admin has stock
    const adminStock = product.stock || 0;
    
    // Check if any seller has listed this product
    const hasSellers = product.sellers && product.sellers.length > 0;
    
    // Logic:
    // 1. If any seller has listed the product → Show quantity & Buy button (regardless of stock)
    // 2. If admin has stock and no sellers → Show quantity & Buy button
    // 3. If admin has NO stock and NO sellers → Show "Out of Stock"
    const isAvailable = hasSellers || adminStock > 0;
    
    console.log('📦 Product Availability Check:', {
      adminStock,
      hasSellers,
      sellersCount: product.sellers?.length || 0,
      isAvailable,
      logic: hasSellers 
        ? 'Seller listed - showing as available' 
        : adminStock > 0 
          ? 'Admin has stock - showing as available'
          : 'No sellers and no admin stock - out of stock'
    });
    
    return isAvailable;
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

  // Function to get the lowest price from all sellers (including shipping)
  const getLowestPrice = () => {
    if (!product) return 0;
    
    // Parse the main product price and shipping, handling currency symbols
    const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
    const mainShipping = parseFloat(product.shipping) || 0;
    const mainTotal = mainPrice + mainShipping;
    
    if (!product.sellers || product.sellers.length === 0) {
      return mainTotal;
    }
    
    const sellerTotals = product.sellers
      .map(seller => {
        const price = parseFloat(seller.sellerPrice);
        const shipping = parseFloat(seller.sellerShipping) || 0;
        const total = (isNaN(price) ? mainPrice : price) + shipping;
        return total;
      })
      .filter(total => total > 0);
    
    const allTotals = [mainTotal, ...sellerTotals];
    const result = Math.min(...allTotals);
    
    // Final safety check to ensure we never return NaN
    return isNaN(result) ? mainTotal : result;
  };

  // Function to get price breakdown for the lowest price
  const getLowestPriceBreakdown = () => {
    if (!product) return { total: 0, price: 0, shipping: 0, isSellerPrice: false };
    
    const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
    const mainShipping = parseFloat(product.shipping) || 0;
    const mainTotal = mainPrice + mainShipping;
    
    if (!product.sellers || product.sellers.length === 0) {
      return { 
        total: mainTotal, 
        price: mainPrice, 
        shipping: mainShipping, 
        isSellerPrice: false 
      };
    }
    
    // Find the seller with the lowest total price
    let lowestSeller = null;
    let lowestTotal = mainTotal;
    
    product.sellers.forEach(seller => {
      const price = parseFloat(seller.sellerPrice);
      const shipping = parseFloat(seller.sellerShipping) || 0;
      const total = (isNaN(price) ? mainPrice : price) + shipping;
      
      if (total < lowestTotal) {
        lowestTotal = total;
        lowestSeller = {
          price: isNaN(price) ? mainPrice : price,
          shipping: shipping,
          total: total
        };
      }
    });
    
    if (lowestSeller) {
      return {
        total: lowestSeller.total,
        price: lowestSeller.price,
        shipping: lowestSeller.shipping,
        isSellerPrice: true
      };
    }
    
    return { 
      total: mainTotal, 
      price: mainPrice, 
      shipping: mainShipping, 
      isSellerPrice: false 
    };
  };

  // Function to check if there's a lower seller price than the main product price (including shipping)
  const hasLowerSellerPrice = () => {
    if (!product || !product.sellers || product.sellers.length === 0) return false;
    
    const mainPrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
    const mainShipping = parseFloat(product.shipping) || 0;
    const mainTotal = mainPrice + mainShipping;
    const lowestPrice = getLowestPrice();
    
    return lowestPrice < mainTotal;
  };

  // Function to handle Buy Now with WhatsApp quotation
  const handleBuyNow = () => {
    // Check if user is logged in
    if (!isBuyerLoggedIn && !isSellerLoggedIn && !isAdminLoggedIn) {
      setShowLoginModal(true);
      return;
    }

    // Get user information
    const userInfo = buyer || seller || admin;
    
    // For buyer, prioritize name field, then construct from firstName/lastName
    let userName = 'User';
    if (isBuyerLoggedIn && buyer) {
      userName = buyer.name || 
                 (buyer.firstName && buyer.lastName ? `${buyer.firstName} ${buyer.lastName}` : '') ||
                 buyer.email?.split('@')[0] || 
                 'Buyer';
    } else if (isSellerLoggedIn && seller) {
      userName = seller.username || seller.businessName || seller.name || 'Seller';
    } else if (isAdminLoggedIn && admin) {
      userName = admin.username || admin.name || 'Admin';
    }
    
    const userEmail = buyer?.email || seller?.email || admin?.email || '';
    const userPhone = buyer?.phone || buyer?.whatsappNo || seller?.whatsappNo || '';
    const userType = isBuyerLoggedIn ? 'Buyer' : isSellerLoggedIn ? 'Seller' : 'Admin';

    // Debug log to verify buyer information
    console.log('🔍 Buy Now - User Info:', {
      isBuyerLoggedIn,
      buyer,
      userName,
      userEmail,
      userPhone,
      userType
    });

    // Get seller information (the one who listed the product)
    let sellerWhatsApp = '';
    let sellerName = '';
    
    // Check if there are sellers for this product
    if (product.sellers && product.sellers.length > 0) {
      // Get the seller with the lowest price
      const breakdown = getLowestPriceBreakdown();
      if (breakdown.isSellerPrice) {
        // Find the seller with the lowest price
        const lowestSeller = product.sellers.find(s => {
          const price = parseFloat(s.sellerPrice) || 0;
          const shipping = parseFloat(s.sellerShipping) || 0;
          return (price + shipping) === breakdown.total;
        });
        
        if (lowestSeller) {
          sellerWhatsApp = lowestSeller.whatsappNo;
          sellerName = lowestSeller.username;
        }
      }
    }
    
    // If no seller found from sellers array, use product's seller info
    if (!sellerWhatsApp && product.sellerInfo) {
      sellerWhatsApp = product.sellerInfo.whatsappNo;
      sellerName = product.sellerInfo.username;
    }

    // If still no seller WhatsApp, show error
    if (!sellerWhatsApp) {
      alert('❌ Seller contact information not available. Please contact support.');
      return;
    }

    // Check if user is trying to buy their own product
    if (isSellerLoggedIn && seller && product.sellers) {
      const isOwnProduct = product.sellers.some(s => 
        s.sellerId?.toString() === seller._id?.toString() || 
        s.sellerId?.toString() === seller.id?.toString()
      );
      
      if (isOwnProduct) {
        alert('❌ You cannot buy your own product!');
        return;
      }
    }

    // Get product details
    const productName = product.name || 'Product';
    const productPrice = getLowestPrice();
    const breakdown = getLowestPriceBreakdown();
    const totalPrice = breakdown.total;
    const unitPrice = breakdown.price;
    const shippingCost = breakdown.shipping;
    const orderQuantity = quantity || 1;
    const totalAmount = totalPrice * orderQuantity;

    // Format WhatsApp message
    const message = `
🛍️ *QUOTATION REQUEST*

📦 *Product Details:*
• Product: ${productName}
• Unit Price: £${unitPrice.toFixed(2)}
• Shipping: £${shippingCost.toFixed(2)}
• Total per Unit: £${totalPrice.toFixed(2)}
• Quantity: ${orderQuantity} units
• *Total Amount: £${totalAmount.toFixed(2)}*

👤 *Buyer Information:*
• Name: ${userName}
• Type: ${userType}
• Email: ${userEmail}
${userPhone ? `• Phone: ${userPhone}` : ''}

📝 *Message:*
Hello ${sellerName}, I'm interested in purchasing this product. Please confirm availability and provide further details.

---
_This quotation was generated from PoundlandWholesale.com_
    `.trim();

    // Clean WhatsApp number (remove spaces, dashes, etc.)
    const cleanWhatsApp = sellerWhatsApp.replace(/[^0-9+]/g, '');
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in new tab
    window.open(whatsappUrl, '_blank');
  };

  // Function to refresh product data (for seller price updates)
  const refreshProductData = async () => {
    console.log('🔄 Refreshing product data...')
    try {
      const cacheBuster = new Date().getTime();
      const sellerToken = localStorage.getItem('sellerToken');
      let apiEndpoint = `products/public/${id}?_=${cacheBuster}`;
      let headers = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Expires': '0'
      };
      
      if (sellerToken) {
        apiEndpoint = `products/seller/detail/${id}?_=${cacheBuster}`;
        headers.Authorization = `Bearer ${sellerToken}`;
      }
      
      console.log(`📡 Fetching fresh data from: ${apiEndpoint}`)
      const response = await fetch(apiConfig.getApiUrl(apiEndpoint), {
        cache: 'no-store',
        headers
      });

      if (response.ok) {
        const dbProduct = await response.json();
        console.log('✅ Fresh product data received:', dbProduct)
        console.log('   - Sellers array:', dbProduct.sellers)
        console.log('   - SellerInfo:', dbProduct.sellerInfo)
        
        // Update the product state with fresh data, preserving existing structure
        setProduct(prevProduct => ({
          ...prevProduct,
          sellers: dbProduct.sellers || [],
          sellerInfo: dbProduct.sellerInfo,
          sellerData: dbProduct.sellerData,
          seller: dbProduct.seller,
          // Update any other seller-related fields
          price: dbProduct.price || prevProduct.price,
          shipping: dbProduct.shipping || prevProduct.shipping
        }));
        
        console.log('✅ Product state updated with fresh data')
      } else {
        console.error('❌ Failed to refresh product data:', response.status)
      }
    } catch (error) {
      console.error('❌ Error refreshing product data:', error)
    }
  }

  // Function to handle seller price updates  // Function to handle seller price updates
  const handleUpdateSellerPrice = async (newPrice) => {
    try {
      const token = localStorage.getItem('sellerToken');
      const response = await fetch(apiConfig.getApiUrl(`sellers/update-inventory/${product.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          price: parseFloat(newPrice)
        })
      });

      const data = await response.json();

      if (response.ok) {
        console.log('✅ Seller price updated successfully');
        // Refresh product data to show updated prices
        await refreshProductData();
        return true;
      } else {
        throw new Error(data.message || 'Failed to update price');
      }
    } catch (error) {
      console.error('❌ Error updating seller price:', error);
      throw error;
    }
  };

  const convertPrice = (priceStr) => {
    // Extract the price number and detect original currency
    const price = parseFloat(String(priceStr).replace(/[₨£$€Rs]/g, '').trim())
    
    if (isNaN(price)) return priceStr
    
    // Detect if price is in GBP (has £ symbol)
    const isGBP = String(priceStr).includes('£')
    
    // Detect if price is in PKR (has ₨ or Rs symbol or is a plain number from database)
    const isPKR = String(priceStr).includes('₨') || String(priceStr).includes('Rs') || (!isGBP && !String(priceStr).includes('$') && !String(priceStr).includes('€'))
    
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

  // Function to convert total price (price + shipping)
  const convertTotalPrice = (priceStr, shipping = 0) => {
    const basePrice = parseFloat(String(priceStr).replace(/[₨£$€Rs]/g, '').trim()) || 0;
    const shippingCost = parseFloat(shipping) || 0;
    const totalPrice = basePrice + shippingCost;
    
    if (shippingCost > 0) {
      const convertedTotal = convertPrice(`£${totalPrice.toFixed(2)}`);
      const convertedBase = convertPrice(`£${basePrice.toFixed(2)}`);
      const convertedShipping = convertPrice(`£${shippingCost.toFixed(2)}`);
      
      return (
        <div>
          <span style={{ fontWeight: 'bold', color: '#28a745' }}>{convertedTotal}</span>
          <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
            {convertedBase} + {convertedShipping} shipping
          </div>
        </div>
      );
    } else {
      return convertPrice(priceStr);
    }
  }

  // Check if user is admin or seller
  useEffect(() => {
    const sellerToken = localStorage.getItem('sellerToken');
    const isSellerUser = !!sellerToken;
    
    setIsAdmin(isAdminLoggedIn);
    
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
          price: p.currency === 'GBP' ? `£${parseFloat(p.price || 0).toFixed(2)}` : p.currency === 'USD' ? `${parseFloat(p.price || 0).toFixed(2)}` : p.currency === 'AED' ? `د.إ${parseFloat(p.price || 0).toFixed(2)}` : `₨${parseFloat(p.price || 0).toFixed(2)}`, rawPrice: parseFloat(p.price || 0), image: p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : '',
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
          price: p.currency === 'GBP' ? `£${parseFloat(p.price || 0).toFixed(2)}` : p.currency === 'USD' ? `${parseFloat(p.price || 0).toFixed(2)}` : p.currency === 'AED' ? `د.إ${parseFloat(p.price || 0).toFixed(2)}` : `₨${parseFloat(p.price || 0).toFixed(2)}`, rawPrice: parseFloat(p.price || 0), image: p.images && p.images.length > 0 ? getImageUrl(p.images[0]) : '',
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
          
          const productData = {
            id: dbProduct._id,
            name: dbProduct.name,
            price: (dbProduct.currency || 'GBP') === 'GBP' ? `£${dbProduct.price}` : 
                   dbProduct.currency === 'USD' ? `$${dbProduct.price}` :
                   dbProduct.currency === 'AED' ? `د.إ${dbProduct.price}` :
                   `₨${dbProduct.price}`, // Default to GBP if currency not set
            shipping: dbProduct.shipping || 0, // Add shipping field
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
            sellers: dbProduct.sellers || [], // Add sellers array for multiple sellers support
            save: parseFloat(dbProduct.savings) || 0, // Add the single savings field
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
          
          // Special debugging for the specific product
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
          shipping: 0, // Default shipping for URL-based products
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
              shipping: foundProduct.shipping || 0, // Add shipping field
              rrp: foundProduct.originalPrice ? `₨${foundProduct.originalPrice}` : '?420.99',
              rating: foundProduct.rating || 4.5,
              dealUnits: Math.floor((foundProduct.platformUnits || 200) / 12), // Calculate as platformUnits / 12
              seller: foundProduct.seller,
              sellerInfo: foundProduct.sellerInfo,
              sellers: foundProduct.sellers || [], // Add sellers array for multiple sellers support
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
                shipping: foundProduct.shipping || 0, // Add shipping field
                rrp: foundProduct.originalPrice ? `₨${foundProduct.originalPrice}` : '?420.99',
                rating: foundProduct.rating || 4.5,
                dealUnits: Math.floor((foundProduct.platformUnits || 200) / 12), // Calculate as platformUnits / 12
                seller: foundProduct.seller,
                sellerInfo: foundProduct.sellerInfo,
                sellers: foundProduct.sellers || [], // Add sellers array for multiple sellers support
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

  // Listen for product updates from admin panel
  useEffect(() => {
    const handleProductUpdate = (event) => {
      if (event.key === 'productUpdated' && event.newValue === id) {
        console.log('🔄 Product updated, refreshing...');
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
              console.log('🔐 Using seller endpoint for product refresh');
            } else {
              console.log('🌐 Using public endpoint for product refresh');
            }
            
            const response = await fetch(apiConfig.getApiUrl(apiEndpoint), {
              cache: 'no-cache',
              headers
            });
            
            if (response.ok) {
              const dbProduct = await response.json();
              console.log('✅ Product refreshed after update:', dbProduct);
              // Update the product state with fresh data
              setProduct(prevProduct => ({
                ...prevProduct,
                ...dbProduct
              }));
            }
          } catch (error) {
            console.error('❌ Error refreshing product after update:', error);
          }
        };
        
        fetchProduct();
        // Clear the flag
        localStorage.removeItem('productUpdated');
      }
    };

    window.addEventListener('storage', handleProductUpdate);
    
    return () => {
      window.removeEventListener('storage', handleProductUpdate);
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
    alert('✅ Supplier unlocked! You can now contact them.')
  }
  
  // Use database products if available, fallback to hardcoded for backward compatibility
  // topDeals and mostPopular are now handled directly by topDealsFromDB and mostPopularFromDB state

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
    // Use formatPrice for currency conversion
    const numValue = safeNumber(value);
    return formatPrice(numValue);
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
    
    // Get product cost price in GBP for calculations (including shipping)
    const getProductCostGBP = () => {
      const costPriceRaw = parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0);
      const shippingCost = parseFloat(product?.shipping) || 0;
      const totalCostRaw = costPriceRaw + shippingCost;
      const isPKR = product?.price?.includes('₨') || product?.price?.includes('Rs');
      const isGBP = product?.price?.includes('£');
      
      if (isPKR) {
        return totalCostRaw * 0.00272; // Convert PKR to GBP (price + shipping)
      } else if (isGBP) {
        return totalCostRaw; // Already in GBP (price + shipping)
      } else {
        // Assume PKR if no currency symbol
        return totalCostRaw * 0.00272;
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
        const perUnitPrice = platform.perUnitPrice || parseFloat(String(platform.price).replace(/[£₨$€]/g, '')) / (platform.units || 1);
        const platformUnits = platform.units || quantity || 1; // Use platform-specific units or current quantity
        
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
    
    const selectedUnits = quantity || 1; // Use current quantity selection
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
      <>
        {/* Enhanced loading UI with skeleton */}
        <div style={{
          background: 'linear-gradient(135deg, #fff5f0 0%, #ffebe0 100%)',
          minHeight: '100vh',
          paddingTop: '20px',
          paddingBottom: '40px'
        }}>
          {/* Loading header message */}
          <div className="container mb-4">
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: 'linear-gradient(135deg, #ff6600 0%, #ff8533 100%)',
              borderRadius: '16px',
              boxShadow: '0 8px 24px rgba(255, 102, 0, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Shimmer effect */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                animation: 'shimmer 2s infinite'
              }} />
              
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{
                  fontSize: '2rem',
                  marginBottom: '10px',
                  display: 'inline-block',
                  animation: 'bounce 2s ease-in-out infinite'
                }}>
                  📦
                </div>
                <div style={{
                  fontSize: '1.2rem',
                  fontWeight: '700',
                  color: 'white',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                }}>
                  Loading Product Details...
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  marginTop: '5px'
                }}>
                  Preparing the best deal for you
                </div>
              </div>
            </div>
          </div>
          
          {/* Skeleton loader */}
          <ProductDetailSkeleton />
        </div>
        
        {/* Add animations */}
        <style jsx>{`
          @keyframes shimmer {
            0% { left: -100%; }
            100% { left: 100%; }
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
        `}</style>
      </>
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
                {/* Zoomed Out Main Image Container */}
                <div className="position-relative mb-2" style={{
                  background: '#ffffff', 
                  border: 'none',
                  borderRadius: '8px', 
                  padding: '20px', // Increased padding to create space around image
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.3s ease',
                  minHeight: 'auto', // Remove fixed height constraint
                  maxHeight: 'none', // Remove height limit
                  height: 'auto', // Let container adapt to image
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'visible', // Prevent cropping
                  width: '100%'
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)'}
                >
                  <img 
                    src={product.images && product.images[selectedImage] ? product.images[selectedImage] : product.image} 
                    alt={product.name} 
                    className="img-fluid"
                    onClick={() => setShowZoomModal(true)}
                    style={{
                      maxWidth: '85%', // Zoom out - show more of the image from all sides
                      maxHeight: 'none', // Remove height constraint - let image show at natural size
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      objectPosition: 'center',
                      padding: '0px',
                      margin: '0 auto',
                      display: 'block',
                      backgroundColor: 'transparent',
                      transition: 'transform 0.3s ease',
                      cursor: 'zoom-in'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                    }}
                    onLoad={(e) => {
                      console.log('🖼️ Image loaded:', {
                        src: e.target.src,
                        naturalWidth: e.target.naturalWidth,
                        naturalHeight: e.target.naturalHeight,
                        displayWidth: e.target.offsetWidth,
                        displayHeight: e.target.offsetHeight,
                        objectFit: window.getComputedStyle(e.target).objectFit
                      });
                    }}
                    onError={(e) => {
                      console.error('❌ Image failed to load:', e.target.src);
                    }}
                  />
                  
                  {/* Zoom Icon Indicator */}
                  <div 
                    className="position-absolute"
                    style={{
                      bottom: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backdropFilter: 'blur(4px)'
                    }}
                    onClick={() => setShowZoomModal(true)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    
                  </div>
                  
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

                {/* Smaller Thumbnail Images - Zoomed Out */}
                <div className="d-flex gap-1 mb-2 overflow-auto pb-1" style={{maxWidth: '100%'}}>
                  {product.images && product.images.map((img, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      style={{
                        minWidth: '50px', // Smaller thumbnails
                        minHeight: '50px', // Smaller thumbnails
                        maxWidth: '60px', // Smaller max size
                        maxHeight: '60px', // Smaller max size
                        border: selectedImage === idx ? '2px solid #ff9900' : '1px solid #e1e5e9',
                        borderRadius: '6px',
                        padding: '1px', // Minimal padding for maximum image space
                        cursor: 'pointer',
                        background: '#fff',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedImage === idx ? '0 2px 6px rgba(255, 153, 0, 0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'visible', // Prevent cropping
                        flexShrink: 0 // Prevent shrinking
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
                          maxWidth: '90%', // Zoom out - show more of the image
                          maxHeight: '90%', // Zoom out - show more of the image
                          width: 'auto',
                          height: 'auto',
                          objectFit: 'contain', // Ensure full image visibility
                          objectPosition: 'center',
                          borderRadius: '4px',
                          backgroundColor: '#ffffff',
                          padding: '0px' // No padding on image itself
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
            
            {/* Compact MIDDLE COLUMN - Title, Reviews, Price */}
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
                    {product.reviews} reviews
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
                          {(() => {
                            const breakdown = getLowestPriceBreakdown();
                            return convertPrice(`£${breakdown.total.toFixed(2)}`);
                          })()}
                        </span>
                        {hasLowerSellerPrice() && (
                          <span style={{
                            fontSize: '0.9rem',
                            color: '#999',
                            textDecoration: 'line-through',
                            marginLeft: '8px',
                            fontWeight: '500'
                          }}>
                            {convertTotalPrice(product.price, product.shipping)}
                          </span>
                        )}
                        <span className="text-muted" style={{
                          fontSize: '0.75rem',
                          fontWeight: '500'
                        }}>/Unit (DDP to Amazon Warehouse)</span>
                      </div>
                      
                      {/* Price Breakdown - Always show */}
                      {(() => {
                        const breakdown = getLowestPriceBreakdown();
                        
                        // Always show breakdown with calculator icon and styling
                        return (
                          <div style={{
                            fontSize: '0.8rem', 
                            color: '#6b7280', 
                            marginTop: '8px',
                            marginBottom: '8px',
                            padding: '4px 8px',
                            background: 'rgba(107, 114, 128, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(107, 114, 128, 0.2)'
                          }}>
                            <i className="fas fa-calculator" style={{ fontSize: '0.7rem', marginRight: '6px' }}></i>
                            {formatPrice(breakdown.price)} + {formatPrice(breakdown.shipping)} shipping
                          </div>
                        );
                      })()}
                      
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
                                  return formatPrice(amazonRRPPerUnit);
                                }
                                
                                // Fallback to RRP platform if Amazon not found
                                const rrpPlatform = product.platforms.find(platform => 
                                  platform.name && platform.name.toLowerCase().includes('rrp')
                                );
                                
                                if (rrpPlatform && rrpPlatform.perUnitPrice) {
                                  const savedRRPPerUnit = parseFloat(rrpPlatform.perUnitPrice);
                                  console.log('🏷️ RRP Display - Using fallback RRP per unit:', savedRRPPerUnit);
                                  return formatPrice(savedRRPPerUnit);
                                }
                              }
                              
                              // Fallback to product.rrp if no saved platform data
                              const fallbackRRP = parseFloat(product.rrp.replace(/[₨£$€Rs د.إ]/g, ''));
                              console.log('🏷️ RRP Display - Using fallback RRP:', fallbackRRP);
                              return formatPrice(fallbackRRP);
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
                            Amazon/Ebay Average Monthly Sale Profit Calculation
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
                            {formatPrice(safeNumber(product.profitCalculations.profitPerUnit))}
                          </span>
                        </div>
                        <div style={{marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span style={{color: '#565959'}}>📈 Profit/{product.dealUnits || 200}:</span>
                          <span style={{color: '#059669', fontWeight: '800', fontSize: '0.75rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>
                            {formatPrice(product.profitEvaluation?.netProfit ? product.profitEvaluation.netProfit : (safeNumber(product.profitCalculations.profitPerUnit) * (product.dealUnits || 200)))}
                          </span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span style={{color: '#565959'}}>💰 Total cost/{product.dealUnits || 200}:</span>
                          <span style={{color: '#B12704', fontWeight: '800', fontSize: '0.75rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}}>{(() => {
                            // Use profitEvaluation productCost if available, otherwise calculate from price
                            if (product.profitEvaluation?.productCost) {
                              // Use the fixed productCost from evaluation (already calculated for dealUnits)
                              return formatPrice(product.profitEvaluation.productCost);
                            }
                            
                            // Fallback calculation: dealUnits × unit price
                            const priceString = product.price || '£0';
                            const unitPrice = parseFloat(priceString.replace(/[₨£$€]/g, '').trim()) || 0;
                            const totalCost = unitPrice * (product.dealUnits || 200);
                            
                            return formatPrice(totalCost);
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
                    padding: '8px'
                  }}>
                    {/* Main Price Display */}
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="d-flex align-items-baseline gap-1">
                        <span className="fw-bold" style={{
                          fontSize: '1.1rem', 
                          color: '#B12704',
                          fontWeight: '700',
                          letterSpacing: '-0.3px'
                        }}>
                          {(() => {
                            const breakdown = getLowestPriceBreakdown();
                            const basePrice = breakdown.price > 0 ? breakdown.price : parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                            const shippingCost = breakdown.shipping > 0 ? breakdown.shipping : parseFloat(product.shipping) || 0;
                            const totalPrice = basePrice + shippingCost;
                            return convertPrice(`£${totalPrice.toFixed(2)}`);
                          })()}
                        </span>
                        <span style={{fontSize: '0.65rem', color: '#565959', fontWeight: '500'}}>/Unit</span>
                      </div>
                      {hasLowerSellerPrice() && (
                        <span style={{
                          fontSize: '0.75rem',
                          color: '#999',
                          textDecoration: 'line-through',
                          fontWeight: '400'
                        }}>
                          {(() => {
                            const basePrice = parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                            const shippingCost = parseFloat(product.shipping) || 0;
                            const totalPrice = basePrice + shippingCost;
                            return convertPrice(`£${totalPrice.toFixed(2)}`);
                          })()}
                        </span>
                      )}
                    </div>
                    
                    {/* Price Breakdown */}
                    <div style={{
                      fontSize: '0.7rem', 
                      color: '#6b7280', 
                      padding: '4px 6px',
                      background: 'rgba(107, 114, 128, 0.08)',
                      borderRadius: '4px',
                      border: '1px solid rgba(107, 114, 128, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}>
                      <div className="d-flex align-items-center">
                        <i className="fas fa-calculator" style={{ fontSize: '0.6rem', marginRight: '6px', color: '#6b7280' }}></i>
                        <span>Price Breakdown:</span>
                      </div>
                      <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {(() => {
                          const breakdown = getLowestPriceBreakdown();
                          const basePrice = breakdown.price > 0 ? breakdown.price : parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                          const shippingCost = breakdown.shipping > 0 ? breakdown.shipping : parseFloat(product.shipping) || 0;
                          return `${formatPrice(basePrice)} + ${formatPrice(shippingCost)} shipping`;
                        })()}
                      </span>
                    </div>
                    
                    {/* DDP Notice */}
                    <div style={{
                      fontSize: '0.6rem', 
                      color: '#565959', 
                      fontWeight: '500',
                      marginTop: '6px',
                      textAlign: 'center'
                    }}>
                      (DDP to Amazon Warehouse)
                    </div>
                  </div>

                  {/* Compact In Stock Status */}
                  {/* Stock Status Display */}
                  <div className="mb-2" style={{
                    background: hasStock() 
                      ? 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)' 
                      : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                    border: hasStock() ? '1px solid #0ea5e9' : '1px solid #ef4444',
                    borderRadius: '6px',
                    padding: '6px 8px'
                  }}>
                    <div className="fw-bold d-flex align-items-center mb-1" style={{
                      fontSize: '0.7rem', 
                      color: hasStock() ? '#0369a1' : '#dc2626'
                    }}>
                      <i className={`fas ${hasStock() ? 'fa-check-circle' : 'fa-times-circle'} me-1`} style={{color: hasStock() ? '#059669' : '#dc2626', fontSize: '0.6rem'}}></i>
                      {hasStock() ? 'Available for Purchase' : 'Currently Out of Stock'}
                    </div>
                    {hasStock() ? (
                      <small style={{fontSize: '0.6rem', color: '#0369a1', fontWeight: '500'}}>
                        <i className="fas fa-shipping-fast me-1"></i>
                        {product.sellers && product.sellers.length > 0 
                          ? `Listed by ${product.sellers.length} seller${product.sellers.length > 1 ? 's' : ''}`
                          : 'Delivery in 15 days to Amazon Warehouse'
                        }
                      </small>
                    ) : (
                      <small style={{fontSize: '0.6rem', color: '#991b1b', fontWeight: '500'}}>
                        <i className="fas fa-info-circle me-1"></i>
                        Contact us for availability updates
                      </small>
                    )}
                  </div>

                  {/* Stock Status Check */}
                  {hasStock() ? (
                    <>
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
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
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
                              maxWidth: '80px',
                              padding: '4px',
                              height: '24px',
                              fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                            }}
                            value={quantity}
                            min="1"
                            step="1"
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || value === '0') {
                                setQuantity('');
                              } else {
                                setQuantity(parseInt(value));
                              }
                            }}
                            onBlur={(e) => {
                              const value = parseInt(e.target.value);
                              if (isNaN(value) || value < 1) {
                                setQuantity(1);
                              }
                              e.target.style.borderColor = '#e1e5e9';
                              e.target.style.boxShadow = 'none';
                            }}
                            onFocus={(e) => {
                              e.target.style.borderColor = '#ff9900';
                              e.target.style.boxShadow = '0 0 0 2px rgba(255, 153, 0, 0.1)';
                            }}
                            placeholder="1"
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
                          MOQ: 1 unit • Changes affect Platform Comparison gross profit
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
                            handleBuyNow();
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
                          <i className="fas fa-bolt me-1"></i>Buy Now - <span style={{fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>{quantity || 1}</span> Units
                        </button>
                        
                        <button 
                          className="enhanced-btn" 
                          style={{
                            fontSize: '0.65rem', 
                            padding: '6px 10px',
                            background: product && isInBasket(product.id || product._id) 
                              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                              : 'linear-gradient(135deg, #232f3e 0%, #1a1a1a 100%)',
                            color: '#ffffff !important',
                            border: product && isInBasket(product.id || product._id) 
                              ? '1px solid #10b981' 
                              : '1px solid #ff9900',
                            borderRadius: '6px',
                            fontWeight: '600',
                            letterSpacing: '0.2px',
                            boxShadow: '0 2px 6px rgba(35, 47, 62, 0.25)'
                          }}
                          onClick={() => {
                            // Add to cart functionality
                            if (product) {
                              addToBasket(product);
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (product && isInBasket(product.id || product._id)) {
                              e.target.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
                              e.target.style.borderColor = '#10b981';
                            } else {
                              e.target.style.background = 'linear-gradient(135deg, #ff9900 0%, #ff7700 100%)';
                              e.target.style.borderColor = '#ffffff';
                            }
                            e.target.style.transform = 'translateY(-1px)';
                            e.target.style.boxShadow = '0 4px 12px rgba(255, 153, 0, 0.35)';
                          }}
                          onMouseLeave={(e) => {
                            if (product && isInBasket(product.id || product._id)) {
                              e.target.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                              e.target.style.borderColor = '#10b981';
                            } else {
                              e.target.style.background = 'linear-gradient(135deg, #232f3e 0%, #1a1a1a 100%)';
                              e.target.style.borderColor = '#ff9900';
                            }
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 2px 6px rgba(35, 47, 62, 0.25)';
                          }}
                        >
                          <i className={product && isInBasket(product.id || product._id) ? 'fas fa-check me-1' : 'fas fa-shopping-cart me-1'}></i>
                          {product && isInBasket(product.id || product._id) ? 'In Basket' : 'Add to Cart'}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* Out of Stock Message */
                    <div className="mb-2" style={{
                      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                      border: '1px solid #ef4444',
                      borderRadius: '6px',
                      padding: '12px',
                      textAlign: 'center'
                    }}>
                      <div className="fw-bold d-flex align-items-center justify-content-center mb-1" style={{
                        fontSize: '0.8rem', 
                        color: '#dc2626'
                      }}>
                        <i className="fas fa-exclamation-circle me-2" style={{fontSize: '1rem'}}></i>
                        Out of Stock
                      </div>
                      <small style={{fontSize: '0.65rem', color: '#991b1b', fontWeight: '500'}}>
                        This product is currently unavailable. Please check back later or contact us for more information.
                      </small>
                    </div>
                  )}

                  <hr />

                  {/* Seller Information is now handled by the SellerInformation component below */}

                    {/* All duplicate seller information sections have been removed */}
                    {/* Seller information is now handled by the SellerInformation component below */}

                  <hr />

                                    {/* New Seller Information Component - Open to All Users */}
                  <SellerInformation 
                    product={product}
                    isSellerLoggedIn={isSellerLoggedIn}
                    currentSeller={currentSeller}
                    isAdmin={isAdmin}
                    onUpdatePrice={handleUpdateSellerPrice}
                    onRefreshProduct={refreshProductData}
                  />

                  

                 

                </div>
              </div>
              
              {/* Mobile Buy Box - Show as regular content on mobile, keep fixed on very small screens */}
              <div className="d-block d-lg-none mt-3">
                <div className="d-none d-sm-block">
                  {/* Regular mobile layout for tablets and larger phones */}
                  <div className="border rounded p-3 mb-3" style={{background: '#ffffff', border: '2px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', color: '#1f2937'}}>
                    <div className="text-center">
                      <div className="fw-bold mb-2" style={{fontSize: '1.2rem', color: '#dc2626'}}>
                        {convertPrice(`£${getLowestPrice()}`)}
                      </div>
                      {(() => {
                        const breakdown = getLowestPriceBreakdown();
                        const shippingCost = breakdown.shipping || parseFloat(product.shipping) || 0;
                        const basePrice = breakdown.price || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                        
                        // Always show breakdown - even if shipping is 0
                        return (
                          <div style={{
                            fontSize: '0.75rem', 
                            color: '#6b7280', 
                            marginTop: '-8px', 
                            marginBottom: '8px',
                            padding: '2px 6px',
                            background: 'rgba(107, 114, 128, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(107, 114, 128, 0.2)'
                          }}>
                            <i className="fas fa-calculator" style={{ fontSize: '0.65rem', marginRight: '4px' }}></i>
                            £{basePrice.toFixed(2)} + £{shippingCost.toFixed(2)} shipping
                          </div>
                        );
                      })()}
                      {hasLowerSellerPrice() && (
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#999',
                          textDecoration: 'line-through',
                          fontWeight: '400',
                          marginTop: '2px'
                        }}>
                          {convertTotalPrice(product.price, product.shipping)}
                        </div>
                      )}
                      <small className="d-block mb-3" style={{color: '#6b7280'}}>ex. VAT</small>
                      <div className="d-grid">
                        {hasStock() ? (
                          <button 
                            className="btn btn-danger"
                            style={{backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#ffffff'}}
                            onClick={() => {
                              handleBuyNow();
                            }}
                          >
                            <i className="fas fa-bolt me-1"></i>Buy Now
                          </button>
                        ) : (
                          <button 
                            className="btn btn-secondary"
                            style={{backgroundColor: '#6b7280', borderColor: '#6b7280', color: '#ffffff', cursor: 'not-allowed'}}
                            disabled
                          >
                            <i className="fas fa-times-circle me-1"></i>Out of Stock
                          </button>
                        )}
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
                            {convertPrice(`£${getLowestPrice()}`)}
                          </div>
                          {(() => {
                            const breakdown = getLowestPriceBreakdown();
                            const shippingCost = breakdown.shipping || parseFloat(product.shipping) || 0;
                            const basePrice = breakdown.price || parseFloat(String(product.price).replace(/[£₨$€]/g, '')) || 0;
                            
                            // Always show breakdown - even if shipping is 0
                            return (
                              <div style={{
                                fontSize: '0.65rem', 
                                color: '#6b7280', 
                                marginTop: '2px',
                                padding: '1px 4px',
                                background: 'rgba(107, 114, 128, 0.1)',
                                borderRadius: '3px',
                                border: '1px solid rgba(107, 114, 128, 0.2)'
                              }}>
                                <i className="fas fa-calculator" style={{ fontSize: '0.55rem', marginRight: '3px' }}></i>
                                £{basePrice.toFixed(2)} + £{shippingCost.toFixed(2)} shipping
                              </div>
                            );
                          })()}
                          {hasLowerSellerPrice() && (
                            <div style={{
                              fontSize: '0.7rem',
                              color: '#999',
                              textDecoration: 'line-through',
                              fontWeight: '400'
                            }}>
                              {convertTotalPrice(product.price, product.shipping)}
                            </div>
                          )}
                          <small className="text-muted">ex. VAT</small>
                        </div>
                        <div className="col-6">
                          <div className="d-grid gap-1">
                            {hasStock() ? (
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => {
                                  handleBuyNow();
                                }}
                              >
                                <i className="fas fa-bolt me-1"></i>Buy Now
                              </button>
                            ) : (
                              <button 
                                className="btn btn-secondary btn-sm"
                                style={{cursor: 'not-allowed'}}
                                disabled
                              >
                                <i className="fas fa-times-circle me-1"></i>Out of Stock
                              </button>
                            )}
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
                              
                              // Get product cost for display (including shipping)
                              const getProductCostGBP = () => {
                                const costPriceRaw = parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0);
                                const shippingCost = parseFloat(product?.shipping) || 0;
                                const totalCostRaw = costPriceRaw + shippingCost;
                                const isPKR = product?.price?.includes('₨') || product?.price?.includes('Rs');
                                const isGBP = product?.price?.includes('£');
                                
                                if (isPKR) {
                                  return totalCostRaw * 0.00272; // Convert PKR to GBP (price + shipping)
                                } else if (isGBP) {
                                  return totalCostRaw; // Already in GBP (price + shipping)
                                } else {
                                  // Assume PKR if no currency symbol
                                  return totalCostRaw * 0.00272;
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
                                    rrpPerUnit: platform.perUnitPrice || parseFloat(String(platform.price).replace(/[£₨$€]/g, '')) / (platform.units || 1),
                                    productCost: parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0),
                                    productPrice: product?.price,
                                    calculationFormula: `((${platform.perUnitPrice || 'RRP'} - ${parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0)}) / ${parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0)}) × 100`,
                                    expectedResult: platform.perUnitPrice ? (((platform.perUnitPrice - parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0)) / parseFloat(product?.price?.replace(/[£₨$€]/g, '') || 0)) * 100).toFixed(1) + '%' : 'N/A'
                                  });
                                }
                                
                                // Calculate per unit price and total profit correctly
                                const perUnitPrice = platform.perUnitPrice || parseFloat(String(platform.price).replace(/[£₨$€]/g, '')) / (platform.units || 1);
                                const platformUnits = platform.units || quantity || 1;
                                
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
                                      {formatPrice(safeNumber(perUnitPrice))}
                                    </td>
                                    <td className="fw-bold text-danger py-2 px-2 text-center" style={{fontSize: '0.8rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                      {formatPrice(safeNumber(productCostGBP))}
                                    </td>
                                    <td className="fw-bold py-2 px-2 text-center" style={{fontSize: '0.8rem', color: '#2d3748', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                      ✕ {platformUnits}
                                    </td>
                                    <td className="fw-bold py-2 px-2 text-center" style={{fontSize: '0.8rem', color: '#059669', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                      = {formatPrice(safeNumber(totalGrossProfit))}
                                      <div style={{fontSize: '0.6rem', color: '#666', marginTop: '2px', fontStyle: 'italic'}}>
                                        ({formatPrice(safeNumber(perUnitPrice))} - {formatPrice(safeNumber(productCostGBP))}) × {platformUnits}
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
                              <i className="fas fa-calculator me-2"></i>Profit Calculations based on Avg.Monthly Amazon/Ebay Sale
                            </div>
                            <div className="row g-1 mb-2">
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Profit per Unit</div>
                                  <div className="fw-bold text-success" style={{fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                    {formatPrice(safeNumber(product.profitCalculations.profitPerUnit))}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Monthly Profit</div>
                                  <div className="fw-bold text-primary" style={{fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                    {formatPrice((() => {
                                      const monthlyValue = product.evaluation?.monthlyProfit || product.profitCalculations?.monthlyProfit || (product.profitCalculations?.profitPerUnit * 30) || 0;
                                      console.log('📊 Monthly Profit Display Debug:', {
                                        evaluationMonthly: product.evaluation?.monthlyProfit,
                                        calculationsMonthly: product.profitCalculations?.monthlyProfit,
                                        fallbackCalculation: product.profitCalculations?.profitPerUnit * 30,
                                        finalValue: monthlyValue
                                      });
                                      return safeNumber(monthlyValue);
                                    })())}
                                  </div>
                                </div>
                              </div>
                              <div className="col-md-4">
                                <div className="bg-white rounded p-2">
                                  <div className="text-muted mb-1" style={{fontSize: '0.7rem'}}>Yearly Profit</div>
                                  <div className="fw-bold text-warning" style={{fontSize: '1rem', fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: '800'}}>
                                    {formatPrice((() => {
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
                                        const units = platformData[0].units || quantity || 1;
                                        
                                        if (profitPerUnit > 0 && units > 0) {
                                          const yearlyProfit = profitPerUnit * units;
                                          console.log('✅ Using Platform Units Calculation:', {
                                            profitPerUnit: profitPerUnit,
                                            units: units,
                                            yearlyProfit: yearlyProfit,
                                            formula: `${units} × ${profitPerUnit.toFixed(2)} = ${yearlyProfit.toFixed(2)}`
                                          });
                                          return safeNumber(yearlyProfit);
                                        }
                                      }
                                      
                                      // PRIORITY 2: Use saved yearly profit values
                                      if (product.evaluation?.yearlyProfit && product.evaluation.yearlyProfit > 0) {
                                        console.log('📊 Using Saved Evaluation Yearly Profit:', product.evaluation.yearlyProfit);
                                        return safeNumber(product.evaluation.yearlyProfit);
                                      }
                                      
                                      if (product.profitCalculations?.yearlyProfit && product.profitCalculations.yearlyProfit > 0) {
                                        console.log('📊 Using Saved Calculations Yearly Profit:', product.profitCalculations.yearlyProfit);
                                        return safeNumber(product.profitCalculations.yearlyProfit);
                                      }
                                      
                                      // PRIORITY 3: Fallback calculation (365 days)
                                      if (profitPerUnit > 0) {
                                        const fallbackYearly = profitPerUnit * 365;
                                        console.log('📊 Using Fallback Calculation (365 days):', {
                                          profitPerUnit: profitPerUnit,
                                          fallbackYearly: fallbackYearly,
                                          formula: `${profitPerUnit.toFixed(2)} × 365 = ${fallbackYearly.toFixed(2)}`
                                        });
                                        return safeNumber(fallbackYearly);
                                      }
                                      
                                      console.log('❌ No valid data for yearly profit calculation');
                                      return 0;
                                    })())}
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
                        <i className="fas fa-calculator me-2"></i>Amazon FBA Revenue Calculator /  Unit Sale
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
                          <div className="dropdown w-100">
                            <button 
                              className="btn btn-warning w-100 dropdown-toggle"
                              type="button" 
                              data-bs-toggle="dropdown" 
                              aria-expanded="false"
                              style={{fontSize: '0.85rem', padding: '10px', fontWeight: '600'}}
                            >
                              <i className="fab fa-amazon me-2"></i>Amazon
                            </button>
                            <ul className="dropdown-menu w-100">
                              <li>
                                <a 
                                  className="dropdown-item" 
                                  href={`https://www.amazon.com/s?k=${encodeURIComponent(product.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="fas fa-flag-usa me-2"></i>Amazon USA (.com)
                                </a>
                              </li>
                              <li>
                                <a 
                                  className="dropdown-item" 
                                  href={`https://www.amazon.co.uk/s?k=${encodeURIComponent(product.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="fas fa-flag me-2" style={{color: '#012169'}}></i>Amazon UK (.co.uk)
                                </a>
                              </li>
                              <li>
                                <a 
                                  className="dropdown-item" 
                                  href={`https://www.amazon.de/s?k=${encodeURIComponent(product.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="fas fa-flag me-2" style={{color: '#000'}}></i>Amazon Germany (.de)
                                </a>
                              </li>
                              <li>
                                <a 
                                  className="dropdown-item" 
                                  href={`https://www.amazon.ae/s?k=${encodeURIComponent(product.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="fas fa-flag me-2" style={{color: '#ce1126'}}></i>Amazon UAE (.ae)
                                </a>
                              </li>
                            </ul>
                          </div>
                        </div>
                        <div className="col-md-3 col-6">
                          <div className="dropdown w-100">
                            <button 
                              className="btn btn-light w-100 dropdown-toggle"
                              type="button" 
                              data-bs-toggle="dropdown" 
                              aria-expanded="false"
                              style={{fontSize: '0.85rem', padding: '10px', fontWeight: '600', color: '#0064d2'}}
                            >
                              <i className="fab fa-ebay me-2"></i>eBay
                            </button>
                            <ul className="dropdown-menu w-100">
                              <li>
                                <a 
                                  className="dropdown-item" 
                                  href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(product.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="fas fa-flag-usa me-2"></i>eBay USA (.com)
                                </a>
                              </li>
                              <li>
                                <a 
                                  className="dropdown-item" 
                                  href={`https://www.ebay.co.uk/sch/i.html?_nkw=${encodeURIComponent(product.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="fas fa-flag me-2" style={{color: '#012169'}}></i>eBay UK (.co.uk)
                                </a>
                              </li>
                              <li>
                                <a 
                                  className="dropdown-item" 
                                  href={`https://www.ebay.de/sch/i.html?_nkw=${encodeURIComponent(product.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="fas fa-flag me-2" style={{color: '#000'}}></i>eBay Germany (.de)
                                </a>
                              </li>
                              <li>
                                <a 
                                  className="dropdown-item" 
                                  href={`https://www.ebay.ae/sch/i.html?_nkw=${encodeURIComponent(product.name)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <i className="fas fa-flag me-2" style={{color: '#ce1126'}}></i>eBay UAE (.ae)
                                </a>
                              </li>
                            </ul>
                          </div>
                        </div>
                        <div className="col-md-3 col-6">
                          <a 
                            href={`https://www.daraz.pk/catalog/?q=${encodeURIComponent(product.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-light w-100"
                            style={{fontSize: '0.85rem', padding: '10px', fontWeight: '600', color: '#f85606'}}
                          >
                            <i className="fas fa-shopping-cart me-2"></i>Daraz
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
                    <img 
                      src={relatedProduct.image} 
                      alt={relatedProduct.name} 
                      className="w-100" 
                      style={{
                        height: 'auto',
                        minHeight: '160px',
                        maxHeight: '200px',
                        objectFit: 'contain',
                        background: '#ffffff',
                        padding: '15px'
                      }} 
                    />
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
              {topDealsFromDB.map((deal, idx) => (
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
                      <img 
                        src={deal.image} 
                        alt={deal.name} 
                        className="card-img-top w-100" 
                        style={{
                          height: 'auto',
                          minHeight: '200px', // Increased for better image display
                          maxHeight: 'none',
                          maxWidth: '100%', // Full width for all devices - show complete image
                          width: 'auto',
                          objectFit: 'contain',
                          padding: '5px', // Reduced padding for larger image display
                          background: '#ffffff'
                        }} 
                      />
                    </div>
                    <div className="card-body p-2">
                      <h6 className="card-title" style={{fontSize: '0.75rem', fontWeight: '600', color: '#2d3748', height: '32px', overflow: 'hidden', lineHeight: '1.3', marginBottom: '4px'}}>{deal.name}</h6>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-primary fw-bold" style={{fontSize: '0.85rem'}}>{formatPrice(deal.rawPrice || 0)}</span>
                        <div className="text-warning" style={{fontSize: '0.65rem'}}>
                          {[...Array(5)].map((_, i) => (
                            <i key={i} className={`${i < Math.floor(deal.rating) ? 'fas' : 'far'} fa-star`}></i>
                          ))}
                        </div>
                      </div>
                      <small className="text-success" style={{fontSize: '0.65rem'}}>
                        <i className="fas fa-percentage me-1"></i>High Profit
                      </small>
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
              {mostPopularFromDB.map((popular, idx) => (
                <div key={popular.id} className="col-lg-2 col-md-3 col-sm-4 col-6">
                  <Link 
                    to={`/product/${popular.id}?name=${encodeURIComponent(popular.name)}&img=${encodeURIComponent(popular.image)}&price=${parseFloat(popular.price.replace(/[?$?]/g, ''))}&rating=${popular.rating}&reviews=${popular.reviews || 100}&category=${encodeURIComponent(popular.category || 'General')}&brand=${encodeURIComponent(popular.brand || '')}&discount=${popular.markup || '250%'}`}
                    className="card border-0 shadow-sm h-100 text-decoration-none" 
                    style={{transition: 'all 0.3s ease'}}
                  >
                    <div className="position-relative">
                      <span className="badge bg-success position-absolute top-0 end-0 m-2" style={{fontSize: '0.65rem', zIndex: 2}}>
                        <i className="fas fa-star me-1"></i>Popular
                      </span>
                      <img 
                        src={popular.image} 
                        alt={popular.name} 
                        className="card-img-top w-100" 
                        style={{
                          height: 'auto',
                          minHeight: '200px', // Increased for better image display
                          maxHeight: 'none',
                          maxWidth: '100%', // Full width for all devices - show complete image
                          width: 'auto',
                          objectFit: 'contain',
                          padding: '5px', // Reduced padding for larger image display
                          background: '#ffffff'
                        }} 
                      />
                    </div>
                    <div className="card-body p-2">
                      <h6 className="card-title" style={{fontSize: '0.75rem', fontWeight: '600', color: '#2d3748', height: '32px', overflow: 'hidden', lineHeight: '1.3', marginBottom: '4px'}}>{popular.name}</h6>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="text-primary fw-bold" style={{fontSize: '0.85rem'}}>{formatPrice(popular.rawPrice || 0)}</span>
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
        </div>
      </section>

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

      {/* Image Zoom Modal */}
      {product && (
        <ImageZoomModal
          isOpen={showZoomModal}
          onClose={() => setShowZoomModal(false)}
          images={product.images || [product.image]}
          initialIndex={selectedImage}
        />
      )}
    </div>
  )
}

export default ProductDetail
