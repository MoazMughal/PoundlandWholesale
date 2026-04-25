import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import cacheManager from '../../utils/cacheManager';
import { getImageUrl } from '../../utils/imageImports';
import { getValidAdminToken, cleanupAuthTokens } from '../../utils/authFix';
import { getApiUrl } from '../../utils/api';
import CategoryVisibilityToggle from '../../components/CategoryVisibilityToggle';
import CategoryManagementModal from '../../components/CategoryManagementModal';
import BulkOperationsModal from '../../components/BulkOperationsModal';
import ProductTableSkeleton from '../../components/ProductTableSkeleton';
import EditProductModal from '../../components/admin/EditProductModal';
// MUI
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import '../../styles/AdminProducts.css';
import '../../styles/AdminLayout.css';
import '../../styles/admin-products-responsive-fix.css';
import '../../styles/skeleton-loader.css';

// Smart Image Component - shows product image from images array or Cloudinary fallback
const SmartProductImage = ({ product: prod, onClick }) => {
  const [imgError, setImgError] = useState(false);

  // Derive the best image URL directly from product data — no async fetch needed
  const resolveUrl = () => {
    if (prod.images && prod.images.length > 0) {
      return getImageUrl(prod.images[0]);
    }
    if (prod.asin && prod.asin.trim()) {
      return `https://res.cloudinary.com/dtuq3tvjx/image/upload/v1/products/${prod.asin.trim()}`;
    }
    return null;
  };

  const url = resolveUrl();

  const noImageBox = (
    <div
      onClick={onClick}
      title={prod.asin ? `ASIN: ${prod.asin}` : 'No image'}
      style={{
        width: 50, height: 50, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 2,
        background: '#f3f4f6', borderRadius: 4, border: '1px solid #e5e7eb',
        fontSize: '0.55rem', color: '#9ca3af', cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: '0.6rem' }}>No Image</span>
      {prod.asin && <span style={{ fontSize: '0.45rem' }}>({prod.asin.slice(0, 8)})</span>}
    </div>
  );

  if (!url || imgError) return noImageBox;

  return (
    <img
      src={url}
      alt={prod.name}
      onClick={onClick}
      onError={() => setImgError(true)}
      title="Click to edit product"
      style={{
        width: 50, height: 50, objectFit: 'contain', objectPosition: 'center',
        borderRadius: 4, border: '1px solid #e5e7eb', cursor: 'pointer',
        display: 'block', padding: 2, backgroundColor: '#fff', boxSizing: 'border-box',
      }}
    />
  );
};

const AdminProducts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToProduct } = useAdmin();
  
  // Add ref to track last fetch time and prevent rapid successive calls
  const lastFetchTimeRef = useRef(0);
  const FETCH_DEBOUNCE_MS = 1000; // 1 second debounce

  // ── Lazy-initialize from sessionStorage cache so back-navigation shows data instantly ──
  const _initFromCache = () => {
    try {
      const cached = sessionStorage.getItem('adminProductsCache');
      if (cached) {
        const { data, ts } = JSON.parse(cached);
        if (Date.now() - ts < 5 * 60 * 1000) return data; // fresh within 5 min
      }
    } catch {}
    return null;
  };
  const _cache = _initFromCache();

  const [products, setProducts] = useState(_cache?.products || []);
  const [filteredProducts, setFilteredProducts] = useState(_cache?.products || []);
  const [totalProducts, setTotalProducts] = useState(_cache?.total || 0);
  const [totalPages, setTotalPages] = useState(_cache ? Math.ceil(_cache.total / 200) : 1);
  const [loading, setLoading] = useState(!_cache); // skip loading screen if cache hit
  const [backgroundLoading, setBackgroundLoading] = useState(false); // silent refresh indicator
  const isInitialLoadRef = useRef(true); // true until first data arrives
  const [search, setSearch] = useState(() => sessionStorage.getItem('adminProductsSearch') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [filters, setFilters] = useState({ category: '', status: '', isAmazonsChoice: false });
  const searchRef = useRef(search);
  const [editingCell, setEditingCell] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showProfitModal, setShowProfitModal] = useState(false);
  const [profitEditProduct, setProfitEditProduct] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [selectedUnits, setSelectedUnits] = useState(200);
  const [productCostUpdated, setProductCostUpdated] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [editingInput, setEditingInput] = useState(null); // Track which input is being edited
  const [inputValues, setInputValues] = useState({}); // Store raw input values during editing
  
  // Configurable fee rates for Amazon calculations
  const [feeRates, setFeeRates] = useState({
    vatRate: 20,        // VAT % applied to commission, digital fee, FBA fee
    commissionRate: 15, // Amazon referral fee %
    digitalFeeRate: 2   // UK digital services fee %
  });

  // Auto-fetch profit values states
  const [showAutoFetchModal, setShowAutoFetchModal] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [selectedSourceProduct, setSelectedSourceProduct] = useState(null);
  const [loadingCategoryProducts, setLoadingCategoryProducts] = useState(false);
  const [currentFetchCategory, setCurrentFetchCategory] = useState('');
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [showCategoryManagementModal, setShowCategoryManagementModal] = useState(false);
  const [showBulkOperationsModal, setShowBulkOperationsModal] = useState(false);
  const [editModalProduct, setEditModalProduct] = useState(null);

  // Keep searchRef and sessionStorage in sync with search state
  useEffect(() => {
    searchRef.current = search;
    if (search) {
      sessionStorage.setItem('adminProductsSearch', search);
    } else {
      sessionStorage.removeItem('adminProductsSearch');
    }
  }, [search]);

  // Debounce search input — wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Add global CSS to hide number input spinners
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Hide number input spinners in Chrome, Safari, Edge */
      input[type="number"]::-webkit-outer-spin-button,
      input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      
      /* Hide number input spinners in Firefox */
      input[type="number"] {
        -moz-appearance: textfield;
      }
      
      /* Ensure text selection works properly */
      input[type="number"]:focus,
      input[type="text"]:focus {
        outline: 2px solid #007bff;
        outline-offset: -2px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Debug useEffect to monitor profitEditProduct changes
  useEffect(() => {
    if (profitEditProduct) {
      const rrpPlatform = profitEditProduct.platformComparison?.find(p => p.platform === 'RRP');
      console.log('🔍 State Debug:', {
        rrpPlatformValue: rrpPlatform?.rrpPerUnit,
        salesProceeds: profitEditProduct.profitEvaluation?.salesProceeds,
        synced: rrpPlatform?.rrpPerUnit === profitEditProduct.profitEvaluation?.salesProceeds
      });
    }
  }, [profitEditProduct?.profitEvaluation?.salesProceeds, profitEditProduct?.platformComparison]);

  // Helper function to update profit data after price or shipping change
  const updateProfitDataAfterChange = async (productId, token) => {
    try {
      console.log('🔄 Updating profit data after price/shipping change for product:', productId);
      
      // Fetch the current product data to get existing profit information and current price/shipping
      const response = await fetch(getApiUrl(`products/${productId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        console.log('⚠️ Could not fetch product data for profit update');
        return;
      }

      const productData = await response.json();
      console.log('📦 Current product data:', productData);
      
      // Check if product has profit data to update
      if (!productData.profitEvaluation && !productData.profitCalculations && !productData.platformComparison) {
        console.log('ℹ️ Product has no profit data to update');
        return;
      }

      console.log('📊 Product has profit data, updating calculations...');

      // Calculate total product cost using lowest seller price (including shipping)
      const priceInfo = getLowestPriceDisplay(productData);
      const totalProductCost = priceInfo.total;
      
      console.log('💰 Product cost calculation:', {
        adminPrice: parseFloat(productData.price) || 0,
        adminShipping: parseFloat(productData.shipping) || 0,
        lowestPrice: priceInfo.price,
        lowestShipping: priceInfo.shipping,
        totalProductCost: totalProductCost,
        isSellerPrice: priceInfo.isSellerPrice,
        sellerName: priceInfo.sellerName
      });

      // Update profit modal if it's open for this product
      if (profitEditProduct && profitEditProduct._id === productId) {
        console.log('🔄 Profit modal is open, updating modal state');

        const balanceChange = profitEditProduct.profitEvaluation?.balanceChange || 0;

        // Update the product cost in the profit evaluation - use total cost (price + shipping)
        const updatedProfitEvaluation = {
          ...profitEditProduct.profitEvaluation,
          salesProceeds: priceInfo.price, // Update sales proceeds to match lowest price
          productCost: totalProductCost // Update product cost to total (price + shipping)
        };

        // Recalculate net profit with new total product cost
        const newNetProfit = parseFloat((balanceChange - totalProductCost).toFixed(2));
        updatedProfitEvaluation.netProfit = newNetProfit;

        // Update profit calculations - use total cost as cost price
        const updatedProfitCalculations = {
          ...profitEditProduct.profitCalculations,
          costPrice: totalProductCost, // Use total cost (price + shipping) as cost price
          profitPerUnit: newNetProfit
        };

        // Update platform comparison profits and markup with new total product cost
        const updatedPlatformComparison = profitEditProduct.platformComparison.map(platform => ({
          ...platform,
          profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2)),
          markup: calculateMarkupPercentage(platform.rrpPerUnit, totalProductCost) // Use total cost
        }));

        // Calculate auto-savings percentage with new total product cost
        const autoCalculatedSavings = totalProductCost === 0 ? 0 : 
          ((balanceChange - totalProductCost) / totalProductCost) * 100;

        // Update the profit edit product state
        setProfitEditProduct({
          ...profitEditProduct,
          price: currentPrice, // Update price in modal
          shipping: currentShipping, // Update shipping in modal
          profitEvaluation: updatedProfitEvaluation,
          profitCalculations: updatedProfitCalculations,
          platformComparison: updatedPlatformComparison,
          savings: parseFloat(autoCalculatedSavings.toFixed(2))
        });

        // Set visual indicator that product cost was updated
        setProductCostUpdated(true);
        setTimeout(() => setProductCostUpdated(false), 3000);
      }

      // Always update the database with new profit calculations
      const existingEvaluation = productData.profitEvaluation || {};
      const balanceChange = existingEvaluation.balanceChange || 0;
      const newNetProfit = parseFloat((balanceChange - totalProductCost).toFixed(2));

      const updatedProfitEvaluation = {
        ...existingEvaluation,
        salesProceeds: priceInfo.price, // Update sales proceeds to match lowest price
        productCost: totalProductCost, // Update product cost to total (price + shipping)
        netProfit: newNetProfit
      };

      console.log('💰 Updated profit evaluation:', updatedProfitEvaluation);

      // Update profit calculations - use total cost as cost price
      const existingCalculations = productData.profitCalculations || {};
      const updatedProfitCalculations = {
        ...existingCalculations,
        costPrice: totalProductCost, // Use total cost (price + shipping) as cost price
        profitPerUnit: newNetProfit
      };

      // Update platform comparison if it exists - use total cost
      const updatedPlatformComparison = (productData.platformComparison || []).map(platform => ({
        ...platform,
        profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2)),
        markup: calculateMarkupPercentage(platform.rrpPerUnit, totalProductCost) // Use total cost
      }));

      // Calculate auto-savings percentage with new total product cost
      const autoCalculatedSavings = totalProductCost === 0 ? 0 : 
        ((balanceChange - totalProductCost) / totalProductCost) * 100;

      // Prepare update data
      const profitUpdateData = {
        profitEvaluation: updatedProfitEvaluation,
        profitCalculations: updatedProfitCalculations,
        savings: parseFloat(autoCalculatedSavings.toFixed(2))
      };

      if (updatedPlatformComparison.length > 0) {
        profitUpdateData.platformComparison = updatedPlatformComparison;
      }

      // Save to database
      console.log('💾 Saving profit update data to database:', profitUpdateData);
      const updateResponse = await fetch(getApiUrl(`products/${productId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profitUpdateData)
      });

      console.log('📡 Database update response status:', updateResponse.status);
      
      if (updateResponse.ok) {
        const responseData = await updateResponse.json();
        console.log('✅ Profit data automatically updated in database after price change');
        console.log('📦 Updated product data:', responseData);
        
        // Aggressive cache clearing
        cacheManager.clearAll();
        
        // Clear browser cache
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }
        
        // Clear localStorage cache
        const cacheKeys = Object.keys(localStorage).filter(key => 
          key.includes('product') || key.includes('cache') || key.includes('evaluation')
        );
        cacheKeys.forEach(key => localStorage.removeItem(key));
        
        // Don't fetch products here - let the local state update handle the display
        // await fetchProducts(); // REMOVED - this was causing the values to reset to 0
        
        // Verify the update by fetching the product again
        setTimeout(async () => {
          try {
            const verifyResponse = await fetch(getApiUrl(`products/${productId}`), {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (verifyResponse.ok) {
              const verifiedProduct = await verifyResponse.json();
              console.log('🔍 VERIFICATION - Product after update:', {
                productId,
                price: verifiedProduct.price,
                salesProceeds: verifiedProduct.profitEvaluation?.salesProceeds,
                productCost: verifiedProduct.profitEvaluation?.productCost,
                netProfit: verifiedProduct.profitEvaluation?.netProfit,
                message: 'Both price and product cost should now match the new price'
              });
            }
          } catch (error) {
            console.error('❌ Verification failed:', error);
          }
        }, 1000);
        
      } else {
        const errorData = await updateResponse.json();
        console.log('⚠️ Failed to auto-update profit data in database:', errorData);
      }

    } catch (error) {
      console.error('❌ Error updating profit data after price change:', error);
    }
  };

  // Function to fetch available categories with profit data
  const fetchAvailableCategoriesWithProfitData = async (currentProductId) => {
    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(getApiUrl(`products/admin/categories-with-profit?excludeId=${currentProductId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableCategories(data.categories);
      } else {
        console.error('Failed to fetch available categories');
        setAvailableCategories([]);
      }
    } catch (error) {
      console.error('Error fetching available categories:', error);
      setAvailableCategories([]);
    }
  };

  // Function to fetch products from same category with profit data
  const fetchCategoryProductsWithProfitData = async (category, currentProductId, exactMatch = true) => {
    try {
      setLoadingCategoryProducts(true);
      const token = localStorage.getItem('adminToken');
      
      console.log('🔍 Fetching products from category:', category, 'exactMatch:', exactMatch, 'excluding:', currentProductId);
      
      // Use the optimized endpoint for better performance
      const endpoint = exactMatch 
        ? getApiUrl(`products/admin/category/${encodeURIComponent(category)}/with-profit?excludeId=${currentProductId}&exactMatch=true`)
        : getApiUrl(`products/admin/category/${encodeURIComponent(category)}/with-profit?excludeId=${currentProductId}&exactMatch=false`);
        
      const response = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Found', data.products.length, 'products with profit data in category:', category);
        console.log('📋 Products list:', data.products.map(p => ({ name: p.name, id: p._id, hasProfit: !!p.profitEvaluation })));
        setCategoryProducts(data.products);
        setCurrentFetchCategory(category);
      } else {
        console.error('Failed to fetch category products');
        setCategoryProducts([]);
      }
    } catch (error) {
      console.error('Error fetching category products:', error);
      setCategoryProducts([]);
    } finally {
      setLoadingCategoryProducts(false);
    }
  };

  // Function to copy profit data from selected product
  const copyProfitDataFromProduct = (sourceProduct) => {
    if (!sourceProduct || !profitEditProduct) {
      console.log('❌ Copy failed: Missing source or target product');
      return;
    }

    // Check if trying to copy from same product
    if (sourceProduct._id === profitEditProduct._id) {
      console.log('⚠️ Cannot copy from the same product to itself');
      alert('⚠️ Cannot copy profit data from the same product to itself. Please select a different product.');
      return;
    }

    console.log('📋 Copying profit data from:', sourceProduct.name);
    console.log('📋 To product:', profitEditProduct.name);
    console.log('📋 Source profit data:', {
      platformComparison: sourceProduct.platformComparison,
      profitEvaluation: sourceProduct.profitEvaluation,
      profitCalculations: sourceProduct.profitCalculations
    });

    // Validate that source product has profit data
    if (!sourceProduct.profitEvaluation && !sourceProduct.platformComparison) {
      console.log('⚠️ Source product has no profit data to copy');
      alert('⚠️ The selected product has no profit data to copy. Please select a product with existing profit data.');
      return;
    }

    // Keep the current product's price as product cost
    const currentProductCost = profitEditProduct.profitEvaluation?.productCost || parseFloat(profitEditProduct.price) || 0;
    
    // Copy platform comparison data
    const copiedPlatformComparison = sourceProduct.platformComparison ? 
      sourceProduct.platformComparison.map(platform => ({
        platform: platform.platform || 'Platform',
        rrpPerUnit: parseFloat(platform.rrpPerUnit) || 0,
        units: parseInt(platform.units) || 200,
        profitFor200Units: 0, // Will be recalculated
        markup: '0%' // Will be recalculated
      })) : 
      profitEditProduct.platformComparison || [];

    // Copy profit evaluation data but keep current product cost
    const copiedProfitEvaluation = sourceProduct.profitEvaluation ? {
      salesProceeds: parseFloat(sourceProduct.profitEvaluation.salesProceeds) || 0,
      commission: parseFloat(sourceProduct.profitEvaluation.commission) || 0,
      commissionTax: parseFloat(sourceProduct.profitEvaluation.commissionTax) || 0,
      digitalServicesFee: parseFloat(sourceProduct.profitEvaluation.digitalServicesFee) || 0,
      digitalServicesTax: parseFloat(sourceProduct.profitEvaluation.digitalServicesTax) || 0,
      fbaFulfilmentFee: parseFloat(sourceProduct.profitEvaluation.fbaFulfilmentFee) || 0,
      fbaFulfilmentTax: parseFloat(sourceProduct.profitEvaluation.fbaFulfilmentTax) || 0,
      balanceChange: parseFloat(sourceProduct.profitEvaluation.balanceChange) || 0,
      productCost: currentProductCost, // Keep current product's cost
      netProfit: 0, // Will be recalculated
      monthlyProfit: parseFloat(sourceProduct.profitEvaluation.monthlyProfit) || 0,
      yearlyProfit: parseFloat(sourceProduct.profitEvaluation.yearlyProfit) || 0
    } : profitEditProduct.profitEvaluation || {};

    // Recalculate net profit with current product cost
    const balanceChange = copiedProfitEvaluation.balanceChange || 0;
    const newNetProfit = parseFloat((balanceChange - currentProductCost).toFixed(2));
    copiedProfitEvaluation.netProfit = newNetProfit;

    // Update profit calculations
    const copiedProfitCalculations = {
      profitPerUnit: newNetProfit,
      profitFor200Units: parseFloat((newNetProfit * 200).toFixed(2)),
      dealUnitsProfit: sourceProduct.profitCalculations?.dealUnitsProfit || 0,
      profitForDealUnits: sourceProduct.profitCalculations?.profitForDealUnits || 0
    };

    // Recalculate platform comparison profits and markup with current product cost
    const updatedPlatformComparison = copiedPlatformComparison.map(platform => ({
      ...platform,
      profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2)),
      markup: calculateMarkupPercentage(platform.rrpPerUnit, currentProductCost)
    }));

    // Sync Amazon platform RRP/Unit with Sales Proceeds
    const amazonPlatform = updatedPlatformComparison.find(p => p.platform === 'Amazon');
    if (amazonPlatform) {
      amazonPlatform.rrpPerUnit = copiedProfitEvaluation.salesProceeds;
      amazonPlatform.markup = calculateMarkupPercentage(copiedProfitEvaluation.salesProceeds, currentProductCost);
    }

    // Calculate auto-savings percentage
    const autoCalculatedSavings = currentProductCost === 0 ? 0 : 
      ((balanceChange - currentProductCost) / currentProductCost) * 100;

    // Update the profit edit product state
    setProfitEditProduct({
      ...profitEditProduct,
      platformComparison: updatedPlatformComparison,
      profitEvaluation: copiedProfitEvaluation,
      profitCalculations: copiedProfitCalculations,
      savings: parseFloat(autoCalculatedSavings.toFixed(2))
    });

    console.log('✅ Profit data copied and recalculated with current product cost:', currentProductCost);
    console.log('📊 Copied data summary:', {
      platformComparison: updatedPlatformComparison.length,
      profitEvaluation: copiedProfitEvaluation,
      profitCalculations: copiedProfitCalculations,
      savings: parseFloat(autoCalculatedSavings.toFixed(2))
    });
    
    // Show success message
    setSuccessMessage(`Profit data copied from "${sourceProduct.name}" and recalculated with current product cost!`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4000);
    
    // Close the auto-fetch modal
    setShowAutoFetchModal(false);
    setSelectedSourceProduct(null);
  };

  // Helper function to calculate markup percentage (moved to component level)
  const calculateMarkupPercentage = (rrpPerUnit, productCost) => {
    try {
      const rrp = parseFloat(rrpPerUnit) || 0;
      const cost = parseFloat(productCost) || 0;
      
      if (cost === 0 || rrp === 0) {
        return '0%';
      }
      
      const markupPercentage = ((rrp - cost) / cost) * 100;
      
      // Ensure the result is a valid number
      if (isNaN(markupPercentage) || !isFinite(markupPercentage)) {
        return '0%';
      }
      
      return `${markupPercentage.toFixed(1)}%`;
    } catch (error) {
      console.error('Error calculating markup percentage:', error);
      return '0%';
    }
  };

  // Effect to calculate markup - temporarily disabled to fix page loading
  /*
  useEffect(() => {
    // Markup calculation logic here
  }, []);
  */

  const currency = 'GBP';
  const currencySymbol = '£';
  const [productsPerPage, setProductsPerPage] = useState(200);

  const [categories, setCategories] = useState([
    // Categories will be loaded from API
  ]);
  
  // Add flags to prevent duplicate fetches
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const isFetchingRef = useRef(false);
  const lastFetchParamsRef = useRef(null);

  const formatPrice = (price, shipping = 0) => {
    const basePrice = parseFloat(price || 0);
    const shippingCost = parseFloat(shipping || 0);
    const totalPrice = basePrice + shippingCost;
    
    if (shippingCost > 0) {
      return (
        <span>
          <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>£{totalPrice.toFixed(2)}</span>
          <span style={{ fontSize: '0.65rem', color: '#666', marginLeft: '2px' }}>
            (£{basePrice.toFixed(2)} + £{shippingCost.toFixed(2)})
          </span>
        </span>
      );
    } else {
      return `£${basePrice.toFixed(2)}`;
    }
  };

  // Helper function to get the lowest seller price (including shipping) or admin price
  const getLowestPriceDisplay = (product) => {
    const adminPrice = parseFloat(product.price || 0);
    const adminShipping = parseFloat(product.shipping || 0);
    const adminTotal = adminPrice + adminShipping;
    
    // If no sellers, return admin price
    if (!product.sellers || product.sellers.length === 0) {
      return {
        total: adminTotal,
        price: adminPrice,
        shipping: adminShipping,
        isSellerPrice: false,
        sellerName: null
      };
    }
    
    // Find the seller with the lowest total price
    let lowestSeller = null;
    let lowestTotal = adminTotal;
    
    product.sellers.forEach(seller => {
      const sellerPrice = parseFloat(seller.sellerPrice || 0);
      const sellerShipping = parseFloat(seller.sellerShipping || 0);
      const sellerTotal = sellerPrice + sellerShipping;
      
      if (sellerTotal > 0 && sellerTotal < lowestTotal) {
        lowestTotal = sellerTotal;
        lowestSeller = {
          price: sellerPrice,
          shipping: sellerShipping,
          total: sellerTotal,
          name: seller.username || seller.name || 'Seller'
        };
      }
    });
    
    if (lowestSeller) {
      return {
        total: lowestSeller.total,
        price: lowestSeller.price,
        shipping: lowestSeller.shipping,
        isSellerPrice: true,
        sellerName: lowestSeller.name
      };
    }
    
    return {
      total: adminTotal,
      price: adminPrice,
      shipping: adminShipping,
      isSellerPrice: false,
      sellerName: null
    };
  };

  // Enhanced format price function that shows seller prices when available
  const formatPriceWithSeller = (product) => {
    const priceInfo = getLowestPriceDisplay(product);
    
    if (priceInfo.shipping > 0) {
      return (
        <span>
          <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: priceInfo.isSellerPrice ? '#28a745' : '#000' }}>
            £{priceInfo.total.toFixed(2)}
          </span>
          <span style={{ fontSize: '0.65rem', color: '#666', marginLeft: '2px' }}>
            (£{priceInfo.price.toFixed(2)} + £{priceInfo.shipping.toFixed(2)})
          </span>
          {priceInfo.isSellerPrice && (
            <div style={{ 
              fontSize: '0.6rem', 
              color: '#28a745', 
              fontWeight: '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '120px'
            }}
            title={`by ${priceInfo.sellerName}`}
            >
              by {priceInfo.sellerName}
            </div>
          )}
        </span>
      );
    }
    
    return (
      <span>
        <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: priceInfo.isSellerPrice ? '#28a745' : '#000' }}>
          £{priceInfo.price.toFixed(2)}
        </span>
        {priceInfo.isSellerPrice && (
          <div style={{ 
            fontSize: '0.6rem', 
            color: '#28a745', 
            fontWeight: '500',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '120px'
          }}
          title={`by ${priceInfo.sellerName}`}
          >
            by {priceInfo.sellerName}
          </div>
        )}
      </span>
    );
  };

  // Enhanced format shipping function that shows seller shipping when available
  const formatShippingWithSeller = (product) => {
    const priceInfo = getLowestPriceDisplay(product);
    
    return (
      <span>
        <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: priceInfo.isSellerPrice ? '#28a745' : '#000' }}>
          £{priceInfo.shipping.toFixed(2)}
        </span>
        {priceInfo.isSellerPrice && (
          <div style={{ 
            fontSize: '0.6rem', 
            color: '#28a745', 
            fontWeight: '500',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '120px'
          }}
          title={`by ${priceInfo.sellerName}`}
          >
            by {priceInfo.sellerName}
          </div>
        )}
      </span>
    );
  };

  const safeFormatNumber = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '';
    // For input fields, return the number with proper decimal formatting
    return num.toFixed(decimals);
  };

  const formatCurrency = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(decimals);
  };

  const displayNumber = (value, decimals = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(decimals);
  };

  const safeParseInput = (value) => {
    if (value === '' || value === null || value === undefined) return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Temporarily removed to fix page loading issue
  // const [isManuallyEditing, setIsManuallyEditing] = useState(false);

  // Helper functions for input handling
  const getInputValue = (inputKey, fallbackValue) => {
    // Always prefer the raw typed value if present
    if (inputValues[inputKey] !== undefined) {
      return inputValues[inputKey];
    }
    // Otherwise return the raw number (no toFixed formatting that fights typing)
    const num = parseFloat(fallbackValue);
    return isNaN(num) ? '' : String(num);
  };

  const handleInputFocus = (inputKey, currentValue) => {
    setEditingInput(inputKey);
    // Only seed if not already being tracked
    if (inputValues[inputKey] === undefined) {
      const num = parseFloat(currentValue);
      setInputValues(prev => ({
        ...prev,
        [inputKey]: isNaN(num) ? '' : String(num)
      }));
    }
  };

  const handleInputChange = (inputKey, newValue) => {
    setInputValues(prev => ({
      ...prev,
      [inputKey]: newValue
    }));
  };

  const handleInputBlur = (inputKey) => {
    setEditingInput(null);
    // Clean up the raw string — keep it until next focus so value stays stable
    setInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[inputKey];
      return newValues;
    });
  };

  useEffect(() => {
    // Skip on first mount — initial load effect already handles URL params
    if (!hasInitiallyLoaded) return;

    const urlParams = new URLSearchParams(location.search);
    const categoryFromState = location.state?.category;
    const categoryFromUrl = urlParams.get('category');
    const statusFromUrl = urlParams.get('status');
    const categoryToRestore = categoryFromState || categoryFromUrl || '';
    const statusToRestore = statusFromUrl || '';
    const amazonsChoiceFromUrl = urlParams.get('amazonsChoice') === 'true';

    setFilters(prev => {
      const newFilters = { ...prev };
      if (prev.category !== categoryToRestore) newFilters.category = categoryToRestore;
      if (prev.status !== statusToRestore) newFilters.status = statusToRestore;
      if (prev.isAmazonsChoice !== amazonsChoiceFromUrl) newFilters.isAmazonsChoice = amazonsChoiceFromUrl;
      return newFilters;
    });
  }, [location.pathname, location.search, hasInitiallyLoaded]);

  // Initial load on component mount - ONLY ONCE
  useEffect(() => {
    if (!hasInitiallyLoaded) {
      fetchCategories();

      // Apply URL params
      const urlParams = new URLSearchParams(location.search);
      const categoryFromUrl = urlParams.get('category') || location.state?.category || '';
      const statusFromUrl = urlParams.get('status') || '';
      const amazonsChoiceFromUrl = urlParams.get('amazonsChoice') === 'true';
      
      const initialFilters = {
        category: categoryFromUrl,
        status: statusFromUrl,
        isAmazonsChoice: amazonsChoiceFromUrl
      };
      
      // Set filters state
      setFilters(prev => ({
        ...prev,
        ...initialFilters
      }));
      
      setHasInitiallyLoaded(true);

      // If cache was already loaded synchronously, just do a silent background refresh
      if (_cache) {
        lastFetchParamsRef.current = JSON.stringify({ 
          page: 1, 
          perPage: productsPerPage, 
          search: '', 
          filters: initialFilters
        });
        // Pass filters directly to fetchProducts
        setTimeout(() => fetchProducts(1, productsPerPage, initialFilters), 300);
        return;
      }

      // No cache — fetch with initial filters
      // Pass filters directly to avoid state update delay
      setTimeout(() => fetchProducts(1, productsPerPage, initialFilters), 100);
    }
  }, []);

  // Handle search and filter changes - DEBOUNCED
  useEffect(() => {
    if (!hasInitiallyLoaded) return;

    // Skip if these exact params were already fetched (e.g. back-navigation restoring same filters)
    const fetchParams = JSON.stringify({ page: 1, perPage: productsPerPage, search: debouncedSearch, filters });
    if (lastFetchParamsRef.current === fetchParams) return;

    if (search !== '' || filters.category !== '') {
      cacheManager.clearAll();
    }

    setCurrentPage(1);
    fetchProducts(1);
  }, [debouncedSearch, filters.category, filters.status, filters.isAmazonsChoice]);

  // Handle page changes - only fetch if page actually changed
  useEffect(() => {
    // Skip if this is the initial load or if we're already on page 1
    if (!hasInitiallyLoaded || currentPage === 1) return;
    
    if (!loading) {
      fetchProducts(currentPage);
    }
  }, [currentPage]);

  // Re-fetch when productsPerPage changes
  useEffect(() => {
    if (!hasInitiallyLoaded) return;
    setCurrentPage(1);
    fetchProducts(1, productsPerPage);
  }, [productsPerPage]);

  // Track window resize for responsive modal
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Refresh products when page becomes visible (e.g., returning from edit page)
  // Only refresh if data is stale (more than 5 minutes old)
  const currentPageRef = useRef(currentPage);
  const hasInitiallyLoadedRef = useRef(hasInitiallyLoaded);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { hasInitiallyLoadedRef.current = hasInitiallyLoaded; }, [hasInitiallyLoaded]);

  useEffect(() => {
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    const TS_KEY = 'adminProductsLastFetch';

    const getLastFetch = () => parseInt(sessionStorage.getItem(TS_KEY) || '0', 10);
    const setLastFetch = () => sessionStorage.setItem(TS_KEY, String(Date.now()));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && hasInitiallyLoadedRef.current) {
        if (Date.now() - getLastFetch() > REFRESH_INTERVAL) {
          fetchProducts(currentPageRef.current);
          setLastFetch();
        }
      }
    };

    const handleFocus = () => {
      if (hasInitiallyLoadedRef.current) {
        if (Date.now() - getLastFetch() > REFRESH_INTERVAL) {
          fetchProducts(currentPageRef.current);
          setLastFetch();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []); // empty deps — uses refs to always see latest values


  const fetchCategories = async () => {
    try {
      // Include Excel categories for admin use and get counts
      const response = await fetch(getApiUrl('products/public/categories?includeExcel=true&includeCounts=true'));
      if (response.ok) {
        const data = await response.json();

        // Get hidden categories from localStorage
        const hiddenCategories = JSON.parse(localStorage.getItem('hiddenCategories') || '[]');

        // Also fetch Amazon's Choice counts for each category
        const token = localStorage.getItem('adminToken');
        const amazonsChoiceCountsResponse = await fetch(getApiUrl('products/admin/amazons-choice-counts'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        let amazonsChoiceCounts = {};
        if (amazonsChoiceCountsResponse.ok) {
          const countsData = await amazonsChoiceCountsResponse.json();
          amazonsChoiceCounts = countsData.counts || {};
        }

        // Filter out hidden categories, deduplicate by value, and format for display
        const seen = new Set();
        const dynamicCategories = data.categories
          .filter(cat => {
            if (seen.has(cat.value)) return false;
            seen.add(cat.value);
            return cat.value === 'all' || !hiddenCategories.includes(cat.value);
          })
          .map(cat => ({
            value: cat.value,
            label: cat.value === 'all' ? 'All Products' : cat.label,
            icon: getCategoryIcon(cat.value),
            count: cat.count || 0,
            amazonsChoiceCount: amazonsChoiceCounts[cat.label] || 0
          }));

        setCategories(dynamicCategories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Keep default categories if API fails
    }
  };

  const getCategoryIcon = (categoryValue) => {
    const iconMap = {
      'all': '📦',
      'remote': '📺',
      'electronics': '⚡',
      'strap': '⌚',
      'jewelry': '💎',
      'party': '🎉',
      'home': '🏠',
      'kitchen': '🍳',
      'automotive': '🚗',
      'tape': '📼',
      'lampshade': '💡',
      'clothing': '👕',
      'food': '🍕',
      'beauty': '💄',
      'sports': '⚽',
      'toys': '🧸',
      'books': '📚',
      'health': '🏥'
    };
    return iconMap[categoryValue] || '📂';
  };

  // Client-side filtering is now handled server-side, so we just set filteredProducts to products
  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  const fetchProducts = async (page = currentPage, perPage = productsPerPage, customFilters = null) => {
    // Use custom filters if provided, otherwise use state filters
    const activeFilters = customFilters !== null ? customFilters : filters;
    
    // Prevent duplicate fetches
    if (isFetchingRef.current) {
      console.log('⏸️ Fetch already in progress, skipping...');
      return;
    }
    
    // Check if we're fetching the same data
    const fetchParams = JSON.stringify({ page, perPage, search: debouncedSearch, filters: activeFilters });
    if (lastFetchParamsRef.current === fetchParams && products.length > 0) {
      console.log('✅ Data already loaded with same parameters, skipping fetch...');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      // Only show full loading screen on the very first load; subsequent fetches are silent
      if (isInitialLoadRef.current) {
        setLoading(true);
      } else {
        setBackgroundLoading(true);
      }
      
      // Clean up any invalid tokens first
      cleanupAuthTokens();
      
      const token = getValidAdminToken();
      if (!token) {
        alert('❌ Authentication token is invalid. Please log in again.');
        navigate('/admin/login');
        setLoading(false);
        setBackgroundLoading(false);
        isFetchingRef.current = false;
        return;
      }

      const params = new URLSearchParams({
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(activeFilters.category && { category: activeFilters.category }),
        ...(activeFilters.status && { status: activeFilters.status }),
        ...(activeFilters.isAmazonsChoice && { isAmazonsChoice: 'true' }),
        excludeSellerCopies: 'true',
        limit: perPage.toString(),
        page: page.toString()
      });

      const useFastEndpoint = !debouncedSearch && !activeFilters.category && !activeFilters.status && !activeFilters.isAmazonsChoice;

      // Add cache buster to ensure fresh data
      const cacheBuster = `_t=${Date.now()}`;
      const url = useFastEndpoint
        ? `${getApiUrl('products/admin/fast')}?${cacheBuster}&limit=${perPage}&page=${page}`
        : `${getApiUrl('products')}?${params}&${cacheBuster}`;

      console.log('🌐 Fetching from URL:', url);
      console.log('🔍 Active filters:', activeFilters);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', response.status, errorData);
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products);
      const total = data.total || data.products.length;
      setTotalProducts(total);
      setFilteredProducts(data.products);
      const totalPagesCalc = Math.ceil(total / perPage);
      setTotalPages(totalPagesCalc);

      // Save to sessionStorage cache for instant restore on back-navigation
      try {
        sessionStorage.setItem('adminProductsCache', JSON.stringify({
          data: { products: data.products, total },
          ts: Date.now()
        }));
      } catch {}
      
      // Store the fetch parameters
      lastFetchParamsRef.current = fetchParams;
      
      // Mark initial load as done — subsequent fetches won't block the UI
      isInitialLoadRef.current = false;
      sessionStorage.setItem('adminProductsLastFetch', String(Date.now()));
      
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      alert('Failed to fetch products. Please check console for details.');
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
      setBackgroundLoading(false);
      isFetchingRef.current = false;
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`products/${id}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchProducts();
        setSelectedProducts(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCleanupDuplicateCategories = async () => {
    if (!confirm('🧹 This will clean up duplicate categories by normalizing their names.\n\nFor example:\n• "electronics" and "Electronics" → "Electronics"\n• "home & garden" and "Home & Garden" → "Home & Garden"\n\nThis action cannot be undone. Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('products/admin/cleanup-duplicate-categories'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Duplicate categories cleaned up:', data);
        
        // Clear cache and refresh data
        cacheManager.clearAll();
        localStorage.setItem('categoriesUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refreshCategories'));
        
        alert(`✅ Cleanup completed!\n\n• ${data.duplicateGroups} duplicate category groups fixed\n• ${data.totalProductsUpdated} products updated\n• ${data.excelProductsUpdated} Excel products updated\n\nThe page will refresh to show the updated categories.`);
        
        // Refresh the page to show updated data
        window.location.reload();
      } else {
        const errorData = await response.json();
        alert(`❌ Error cleaning up categories: ${errorData.message}`);
      }
    } catch (error) {
      console.error('❌ Error cleaning up duplicate categories:', error);
      alert('❌ Failed to clean up duplicate categories. Please try again.');
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      // With server-side pagination, filteredProducts already contains only current page products
      setSelectedProducts(new Set(filteredProducts.map(p => p._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) {
      alert('⚠️ Please select at least one product to delete');
      return;
    }

    if (!confirm(`⚠️ Are you sure you want to delete ${selectedProducts.size} selected product(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      let successCount = 0;
      let failCount = 0;

      for (const productId of selectedProducts) {
        try {
          const response = await fetch(getApiUrl(`products/${productId}`), {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error('Error deleting product:', productId, error);
          failCount++;
        }
      }

      setSelectedProducts(new Set());
      fetchProducts();

      if (failCount === 0) {
        alert(`✅ Successfully deleted ${successCount} product(s)`);
      } else {
        alert(`⚠️ Deleted ${successCount} product(s), failed to delete ${failCount} product(s)`);
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      alert('❌ Failed to delete products');
    }
  };

  const handleBulkOperations = async (productIds, updateData, updateMode) => {
    try {
      const token = localStorage.getItem('adminToken');
      
      console.log('🔄 Sending bulk update request:', {
        productIds: productIds.length,
        updateData,
        updateMode
      });

      const response = await fetch(getApiUrl('products/admin/bulk-update'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productIds,
          updateData,
          updateMode
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Bulk update result:', result);

        // Update local state immediately for instant UI feedback
        if (updateData.status) {
          setProducts(prevProducts => 
            prevProducts.map(product => 
              productIds.includes(product._id) 
                ? { ...product, status: updateData.status }
                : product
            )
          );
          setFilteredProducts(prevProducts => 
            prevProducts.map(product => 
              productIds.includes(product._id) 
                ? { ...product, status: updateData.status }
                : product
            )
          );
        }

        // Clear selection
        setSelectedProducts(new Set());
        
        // Refresh data from server to ensure consistency
        await fetchProducts();
        
        // Clear cache
        cacheManager.clearAll();

        // Show results
        if (result.failCount === 0) {
          setSuccessMessage(`✅ Successfully updated ${result.successCount} product(s)`);
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 4000);
        } else {
          const message = `⚠️ Updated ${result.successCount} product(s), failed to update ${result.failCount} product(s)`;
          if (result.errors && result.errors.length > 0) {
            console.error('Bulk update errors:', result.errors);
          }
          alert(message);
        }
      } else {
        const errorData = await response.json();
        console.error('❌ Bulk update failed:', errorData);
        alert(`❌ Failed to update products: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error in bulk operations:', error);
      alert('❌ Failed to update products. Please try again.');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`products/${id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCellClick = (productId, field, currentValue) => {
    setEditingCell(`${productId}-${field}`);
    // Ensure ASIN, SKU, and category fields have proper initial values (empty string if null/undefined)
    const initialValue = (field === 'asin' || field === 'sku' || field === 'category') ? (currentValue || '') : currentValue;
    console.log('📝 Setting initial edit value:', { cellKey: `${productId}-${field}`, initialValue });
    setEditValues({ ...editValues, [`${productId}-${field}`]: initialValue });
  };

  const handleEditChange = (productId, field, value) => {
    console.log('🔄 handleEditChange called:', { productId, field, value });
    setEditValues({ ...editValues, [`${productId}-${field}`]: value });
  };

  const handleInputEvent = (e, productId, field) => {
    // Handle keyboard up/down arrows and direct input
    const value = e.target.value;
    handleEditChange(productId, field, value);
  };

  const handleMouseWheel = (e, productId, field) => {
    // Handle mouse wheel up/down on number inputs
    if (e.deltaY < 0) {
      // Wheel up - increment
      const currentValue = parseFloat(editValues[`${productId}-${field}`] || 0);
      const step = (field === 'price' || field === 'shipping') ? 0.01 : 1;
      const newValue = (currentValue + step).toFixed((field === 'price' || field === 'shipping') ? 2 : 0);
      handleEditChange(productId, field, newValue);
    } else if (e.deltaY > 0) {
      // Wheel down - decrement
      const currentValue = parseFloat(editValues[`${productId}-${field}`] || 0);
      const step = (field === 'price' || field === 'shipping') ? 0.01 : 1;
      const newValue = Math.max(0, currentValue - step).toFixed((field === 'price' || field === 'shipping') ? 2 : 0);
      handleEditChange(productId, field, newValue);
    }
  };

  const handleSaveEdit = async (productId, field) => {
    const cellKey = `${productId}-${field}`;
    const newValue = editValues[cellKey];

    console.log('💾 handleSaveEdit called:', { productId, field, cellKey, newValue, editValues });

    // Allow empty values for ASIN, SKU, category, status, and shipping fields, but not for price/stock
    if (newValue === undefined || (newValue === '' && field !== 'asin' && field !== 'sku' && field !== 'category' && field !== 'status' && field !== 'shipping')) {
      console.log('❌ Validation failed - empty value not allowed for field:', field);
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      let parsedValue;

      if (field === 'price' || field === 'stock' || field === 'shipping') {
        parsedValue = parseFloat(newValue) || 0; // Default to 0 if empty or invalid
      } else if (field === 'asin') {
        // Handle ASIN field - trim and convert to uppercase, allow empty string
        parsedValue = newValue ? newValue.trim().toUpperCase() : '';
      } else if (field === 'sku') {
        // Handle SKU field - trim and convert to uppercase, allow empty string
        parsedValue = newValue ? newValue.trim().toUpperCase() : '';
      } else if (field === 'category') {
        // Handle category field - trim the value
        parsedValue = newValue ? newValue.trim() : '';
      } else if (field === 'status') {
        // Handle status field - ensure it's a valid status
        parsedValue = newValue;
        console.log('🔄 Saving Status:', {
          productId,
          originalValue: newValue,
          parsedValue,
          updateData: { [field]: parsedValue }
        });
      } else {
        parsedValue = newValue;
      }

      const updateData = { [field]: parsedValue };
      if (field === 'price' || field === 'shipping') {
        updateData.currency = 'GBP';
      }

      // Debug logging for ASIN updates
      if (field === 'asin') {
        console.log('🏷️ Saving ASIN:', {
          productId,
          originalValue: newValue,
          parsedValue,
          updateData
        });
      }

      // Debug logging for SKU updates
      if (field === 'sku') {
        console.log('🏷️ Saving SKU:', {
          productId,
          originalValue: newValue,
          parsedValue,
          updateData
        });
      }

      // Debug logging for category updates
      if (field === 'category') {
        console.log('📂 Saving Category:', {
          productId,
          originalValue: newValue,
          parsedValue,
          updateData
        });
      }

      // Debug logging for shipping updates
      if (field === 'shipping') {
        console.log('🚢 Saving Shipping:', {
          productId,
          originalValue: newValue,
          parsedValue,
          updateData
        });
      }

      // Debug logging for price updates
      if (field === 'price') {
        console.log('💰 Saving Price:', {
          productId,
          originalValue: newValue,
          parsedValue,
          updateData
        });
      }

      console.log('📡 Sending update request:', {
        url: getApiUrl(`products/${productId}`),
        method: 'PUT',
        body: updateData
      });

      const response = await fetch(getApiUrl(`products/${productId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updateObject = { [field]: parsedValue };
        if (field === 'price' || field === 'shipping') {
          updateObject.currency = 'GBP';
        }

        console.log('💾 Updating local state:', {
          productId,
          field,
          parsedValue,
          updateObject,
          beforeUpdate: products.find(p => p._id === productId)?.[field]
        });

        const updatedProducts = products.map(p =>
          p._id === productId ? { ...p, ...updateObject } : p
        );

        setProducts(updatedProducts);
        setFilteredProducts(filteredProducts.map(p =>
          p._id === productId ? { ...p, ...updateObject } : p
        ));
        
        console.log('✅ Local state updated:', {
          productId,
          field,
          afterUpdate: updatedProducts.find(p => p._id === productId)?.[field]
        });
        
        // Clear the edit value for this specific field
        const cellKey = `${productId}-${field}`;
        setEditValues(prev => {
          const newEditValues = { ...prev };
          delete newEditValues[cellKey];
          return newEditValues;
        });
        setEditingCell(null);

        // Log successful ASIN update
        if (field === 'asin') {
          console.log('✅ ASIN updated successfully:', {
            productId,
            newASIN: parsedValue,
            productName: updatedProducts.find(p => p._id === productId)?.name
          });
        }

        // Log successful category update
        if (field === 'category') {
          console.log('✅ Category updated successfully:', {
            productId,
            newCategory: parsedValue,
            productName: updatedProducts.find(p => p._id === productId)?.name
          });
          
          // Show success message for category update only
          setSuccessMessage(`✅ Category updated to "${parsedValue}" successfully!`);
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
          
          // Trigger category refresh in headers since categories might have changed
          localStorage.setItem('categoriesUpdated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('refreshCategories'));
        }

        // Log successful status update
        if (field === 'status') {
          console.log('✅ Status updated successfully:', {
            productId,
            newStatus: parsedValue,
            productName: updatedProducts.find(p => p._id === productId)?.name
          });
          
          // Clear cache to ensure status changes are reflected immediately
          cacheManager.clearAll();
          
          // Only refresh for status changes, not for price/shipping changes
          // Force a refresh of the products list to show updated status
          setTimeout(() => {
            fetchProducts();
          }, 500);
        }

        // If price or shipping was updated, check if we need to update profit data (but no success message)
        if (field === 'price' || field === 'shipping') {
          console.log(`💰 ${field} field updated, calling updateProfitDataAfterChange`);
          console.log('📊 Update details:', { productId, newValue: parsedValue, field });
          // Update profit data in background without affecting UI state
          updateProfitDataAfterChange(productId, token).catch(error => {
            console.error('❌ Profit data update failed:', error);
          });
        }

        // Log successful shipping update
        if (field === 'shipping') {
          console.log('✅ Shipping updated successfully:', {
            productId,
            newShipping: parsedValue,
            productName: updatedProducts.find(p => p._id === productId)?.name,
            updatedProduct: updatedProducts.find(p => p._id === productId)
          });
          
          // Show success message for shipping update
          setSuccessMessage(`✅ Shipping cost updated to £${parsedValue.toFixed(2)} successfully!`);
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
        }

        // Log successful price update
        if (field === 'price') {
          console.log('✅ Price updated successfully:', {
            productId,
            newPrice: parsedValue,
            productName: updatedProducts.find(p => p._id === productId)?.name,
            updatedProduct: updatedProducts.find(p => p._id === productId)
          });
        }

        cacheManager.clearAll();

        const cell = document.querySelector(`[data-cell="${cellKey}"]`);
        if (cell) {
          cell.style.background = '#d4edda';
          setTimeout(() => { cell.style.background = ''; }, 1000);
        }
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);

        // Specific error message for ASIN updates
        if (field === 'asin') {
          console.error('❌ ASIN update failed:', {
            productId,
            attemptedValue: parsedValue,
            error: errorData
          });
          alert(`❌ Failed to update ASIN: ${errorData.message || 'Unknown error'}`);
        } else {
          alert(`❌ Failed to update: ${errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error updating product:', error);

      // Specific error message for ASIN updates
      if (field === 'asin') {
        console.error('❌ ASIN update error:', {
          productId,
          attemptedValue: parsedValue,
          error: error.message
        });
        alert('❌ Failed to update ASIN. Please try again.');
      } else {
        alert('❌ Failed to update. Please try again.');
      }
    }
  };

  const handleProductClick = (product, event = null) => {
    console.log('🔗 Navigating to product detail:', {
      productId: product._id,
      productName: product.name,
      currentCategory: filters.category,
      returnTo: '/admin/products'
    });

    // Notify AdminContext that we're navigating to a product
    navigateToProduct(product._id, {
      category: filters.category,
      returnTo: '/admin/products'
    });

    // Check if user wants to open in new tab (Ctrl+Click, Cmd+Click, or middle mouse button)
    const openInNewTab = event && (event.ctrlKey || event.metaKey || event.button === 1);
    
    if (openInNewTab) {
      // Open in new tab while preserving admin authentication
      const productUrl = `/product/${product._id}?returnCategory=${filters.category || ''}`;
      window.open(productUrl, '_blank');
    } else {
      // Navigate in current tab with state preservation
      navigate(`/product/${product._id}`, {
        state: {
          returnTo: '/admin/products',
          category: filters.category,
          productPreview: {
            name: product.name,
            price: product.price,
            category: product.category
          },
          // Preserve admin context
          adminNavigation: true
        }
      });
    }
  };

  const filteredAvailableProducts = [];

  const handleKeyPress = (e, productId, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleSaveEdit(productId, field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    }
  };

  const updateFiltersAndUrl = (newFilters) => {
    console.log('🔄 Updating filters and URL:', {
      oldFilters: filters,
      newFilters,
      currentUrl: location.pathname + location.search
    });

    setFilters(newFilters);

    // Update URL to reflect all filters
    const searchParams = new URLSearchParams();
    if (newFilters.category) {
      searchParams.set('category', newFilters.category);
    }
    if (newFilters.status) {
      searchParams.set('status', newFilters.status);
    }
    if (newFilters.isAmazonsChoice) {
      searchParams.set('amazonsChoice', 'true');
    }

    // Update URL without triggering a full page reload
    const newUrl = searchParams.toString()
      ? `${location.pathname}?${searchParams.toString()}`
      : location.pathname;

    console.log('🌐 New URL:', newUrl);

    navigate(newUrl, { replace: true, state: { category: newFilters.category } });
  };

  const handleCategoryFilter = (categoryValue) => {
    const newCategory = categoryValue === 'all' ? '' : categoryValue;
    updateFiltersAndUrl({ ...filters, category: newCategory });
  };

  const handleDeleteCategory = async (categoryValue, categoryLabel) => {
    const productCount = products.filter(p => p.category === categoryValue).length;
    
    if (productCount > 0) {
      const confirmMessage = `⚠️ Category "${categoryLabel}" contains ${productCount} product(s).\n\n` +
        `Options:\n` +
        `1. Move products to another category first (recommended)\n` +
        `2. Delete category and ALL its products (⚠️ PERMANENT)\n\n` +
        `Choose an option:`;
      
      const choice = confirm(confirmMessage + '\n\nClick OK to DELETE ALL PRODUCTS, Cancel to move products first');
      
      if (!choice) {
        alert('💡 Use the Category Management Modal to move products between categories first, then delete the empty category.');
        return;
      }
      
      // User chose to delete all products
      const finalConfirm = prompt(
        `🚨 FINAL WARNING 🚨\n\n` +
        `This will PERMANENTLY DELETE:\n` +
        `• Category: "${categoryLabel}"\n` +
        `• All ${productCount} products in this category\n` +
        `• Remove from all views (Admin, Amazon's Choice, Headers)\n\n` +
        `This action CANNOT be undone!\n\n` +
        `Type "DELETE ALL" to confirm:`
      );
      
      if (finalConfirm !== 'DELETE ALL') {
        alert('❌ Deletion cancelled - you must type "DELETE ALL" to confirm');
        return;
      }
      
      try {
        const token = getValidAdminToken();
        if (!token) {
          alert('❌ Authentication required. Please log in again.');
          return;
        }
        
        const response = await fetch(getApiUrl(`products/category/${encodeURIComponent(categoryValue)}`), {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          alert(`✅ Category "${categoryLabel}" deleted successfully!\n\n` +
                `📊 Products deleted: ${result.deletedCount}\n` +
                `📋 Excel products updated: ${result.excelUpdatedCount || 0}\n\n` +
                `🔄 Refreshing all views...`);
          
          // Force refresh everything
          await fetchCategories();
          await fetchProducts();
          
          // Trigger global refresh
          window.dispatchEvent(new CustomEvent('refreshCategories'));
          localStorage.setItem('categoriesUpdated', Date.now().toString());
          
          // Reload page after short delay
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          
        } else {
          const error = await response.json();
          alert(`❌ Failed to delete category: ${error.message}`);
        }
      } catch (error) {
        console.error('Error deleting category:', error);
        alert(`❌ Error deleting category: ${error.message}`);
      }
      
      return;
    }
    
    // For empty categories, offer to hide them
    const confirmMessage = `Hide the empty "${categoryLabel}" category from the category list?\n\n` +
      `Note: This will hide the category from the UI but won't delete it from the database.\n` +
      `The category can be restored later if needed.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Instead of deleting, we'll hide the category by storing it in localStorage
      const hiddenCategories = JSON.parse(localStorage.getItem('hiddenCategories') || '[]');
      if (!hiddenCategories.includes(categoryValue)) {
        hiddenCategories.push(categoryValue);
        localStorage.setItem('hiddenCategories', JSON.stringify(hiddenCategories));
      }
      
      // Show success message
      setSuccessMessage(`✅ Category "${categoryLabel}" has been hidden from the list`);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
      
      // Refresh categories to apply the filter
      await fetchCategories();
      
      // Clear any category filter if the hidden category was selected
      if (filters.category === categoryValue) {
        updateFiltersAndUrl({ ...filters, category: '' });
      }
      
      console.log('✅ Category hidden successfully:', categoryValue);
    } catch (error) {
      console.error('❌ Error hiding category:', error);
      alert('❌ Failed to hide category. Please try again.');
    }
  };

  const handleStatusFilter = (statusValue) => {
    updateFiltersAndUrl({ ...filters, status: statusValue });
  };

  const handleAmazonsChoiceFilter = () => {
    updateFiltersAndUrl({ ...filters, isAmazonsChoice: !filters.isAmazonsChoice });
  };

  // Central auto-calculation: given salePrice + fbaFee, derive all other fee fields
  const autoCalcFees = (salePrice, fbaFee, rates) => {
    const sp = parseFloat(salePrice) || 0;
    const fba = parseFloat(fbaFee) || 0;
    const vatRate = (parseFloat(rates?.vatRate) || 20) / 100;
    const commRate = (parseFloat(rates?.commissionRate) || 15) / 100;
    const digRate = (parseFloat(rates?.digitalFeeRate) || 2) / 100;

    const commission = parseFloat((sp * commRate).toFixed(2));
    const commissionTax = parseFloat((commission * vatRate).toFixed(2));
    const digitalServicesFee = parseFloat((sp * digRate).toFixed(2));
    const digitalServicesTax = parseFloat((digitalServicesFee * vatRate).toFixed(2));
    const fbaFulfilmentFee = parseFloat(fba.toFixed(2));
    const fbaFulfilmentTax = parseFloat((fba * vatRate).toFixed(2));
    const totalFees = commission + commissionTax + digitalServicesFee + digitalServicesTax + fbaFulfilmentFee + fbaFulfilmentTax;
    const balanceChange = parseFloat((sp - totalFees).toFixed(2));

    return { commission, commissionTax, digitalServicesFee, digitalServicesTax, fbaFulfilmentFee, fbaFulfilmentTax, balanceChange };
  };

  const startProfitEditing = async (product) => {
    try {
      // Always fetch the latest product data to ensure we have up-to-date profit calculations
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`products/${product._id}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const latestProduct = await response.json();
        product = latestProduct;
      }
    } catch (error) {
      // Error fetching latest product data, using current data
    }

    // Get the lowest price (including seller prices)
    const priceInfo = getLowestPriceDisplay(product);
    const totalProductCost = priceInfo.total;
    const initialUnits = product.platformUnits || 200;
    setSelectedUnits(initialUnits);

    const profitPerUnit = product.profitCalculations?.profitPerUnit || 0;
    const defaultMonthlyProfit = profitPerUnit * 30;
    const defaultYearlyProfit = profitPerUnit * 365;

    const safeParseFloat = (value, defaultValue = 0) => {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? defaultValue : parsed;
    };

    const initPlatformComparison = product.platformComparison && Array.isArray(product.platformComparison)
      ? product.platformComparison.map(platform => ({
        platform: platform.platform || 'Platform',
        rrpPerUnit: safeParseFloat(platform.rrpPerUnit, 0),
        units: safeParseFloat(platform.units, 200),
        profitFor200Units: safeParseFloat(platform.profitFor200Units, 0),
        markup: calculateMarkupPercentage(platform.rrpPerUnit, totalProductCost) // Calculate markup with current total product cost
      }))
      : [
        { platform: 'RRP', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: calculateMarkupPercentage(0, totalProductCost) },
        { platform: 'Amazon', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: calculateMarkupPercentage(0, totalProductCost) },
        { platform: 'eBay', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: calculateMarkupPercentage(0, totalProductCost) }
      ];

    const initProfitCalculations = {
      profitPerUnit: safeParseFloat(product.profitCalculations?.profitPerUnit, 0),
      profitFor200Units: safeParseFloat(product.profitCalculations?.profitFor200Units, 0),
      dealUnitsProfit: safeParseFloat(product.profitCalculations?.dealUnitsProfit, 0),
      profitForDealUnits: safeParseFloat(product.profitCalculations?.profitForDealUnits, 0)
    };

    const existingEvaluation = product.profitEvaluation;
    
    // Get the RRP platform's RRP/Unit value for syncing with Sales Proceeds
    const rrpPlatform = initPlatformComparison.find(platform => platform.platform === 'RRP');
    const rrpPlatformValue = rrpPlatform ? rrpPlatform.rrpPerUnit : 0;
    const existingSalesProceeds = safeParseFloat(existingEvaluation?.salesProceeds, 0);
    
    // Use the higher value between existing Sales Proceeds and RRP platform RRP/Unit
    // This ensures they stay in sync
    const syncedSalesProceeds = Math.max(rrpPlatformValue, existingSalesProceeds);
    
    // Update only the RRP platform's RRP/Unit to match Sales Proceeds
    if (rrpPlatform) {
      rrpPlatform.rrpPerUnit = syncedSalesProceeds;
      rrpPlatform.markup = calculateMarkupPercentage(syncedSalesProceeds, totalProductCost); // Recalculate markup after sync
    }
    
    const initProfitEvaluation = {
      salesProceeds: syncedSalesProceeds, // Use synced value
      commission: safeParseFloat(existingEvaluation?.commission, 0),
      commissionTax: safeParseFloat(existingEvaluation?.commissionTax, 0),
      digitalServicesFee: safeParseFloat(existingEvaluation?.digitalServicesFee, 0),
      digitalServicesTax: safeParseFloat(existingEvaluation?.digitalServicesTax, 0),
      fbaFulfilmentFee: safeParseFloat(existingEvaluation?.fbaFulfilmentFee, 0),
      fbaFulfilmentTax: safeParseFloat(existingEvaluation?.fbaFulfilmentTax, 0),
      balanceChange: safeParseFloat(existingEvaluation?.balanceChange, 0),
      productCost: totalProductCost, // Always use current total product cost (price + shipping)
      netProfit: 0, // Will be calculated below
      monthlyProfit: safeParseFloat(existingEvaluation?.monthlyProfit, defaultMonthlyProfit),
      yearlyProfit: safeParseFloat(existingEvaluation?.yearlyProfit, defaultYearlyProfit)
    };

    // Calculate netProfit properly: prioritize recalculation if balance change exists, then use existing netProfit
    const existingNetProfit = safeParseFloat(existingEvaluation?.netProfit, 0);
    
    if (initProfitEvaluation.balanceChange !== 0) {
      // Always recalculate from balance change if it exists (this ensures correct calculation)
      initProfitEvaluation.netProfit = initProfitEvaluation.balanceChange - initProfitEvaluation.productCost;
    } else if (existingNetProfit !== 0) {
      // Use existing net profit only if no balance change is available
      initProfitEvaluation.netProfit = existingNetProfit;
    } else {
      // Calculate balance change from sales proceeds and fees, then calculate net profit
      const calculatedBalanceChange = syncedSalesProceeds - 
        initProfitEvaluation.commission - 
        initProfitEvaluation.commissionTax - 
        initProfitEvaluation.digitalServicesFee - 
        initProfitEvaluation.digitalServicesTax - 
        initProfitEvaluation.fbaFulfilmentFee - 
        initProfitEvaluation.fbaFulfilmentTax;
      
      initProfitEvaluation.balanceChange = calculatedBalanceChange;
      initProfitEvaluation.netProfit = calculatedBalanceChange - initProfitEvaluation.productCost;
    }

    // Update profitPerUnit to match netProfit (always use calculated netProfit, not stored profitPerUnit)
    initProfitCalculations.profitPerUnit = initProfitEvaluation.netProfit;

    // Calculate auto-savings percentage: (Balance Change - Product Cost) / Product Cost * 100
    const autoCalculatedSavings = initProfitEvaluation.productCost === 0 ? 0 : 
      ((initProfitEvaluation.balanceChange - initProfitEvaluation.productCost) / initProfitEvaluation.productCost) * 100;

    setProfitEditProduct({
      _id: product._id,
      name: product.name || '',
      price: parseFloat(product.price || 0),
      shipping: parseFloat(product.shipping || 0),
      dealUnits: safeParseFloat(product.dealUnits, 1),
      description: product.description || '',
      features: Array.isArray(product.features) ? product.features : [],
      platformComparison: initPlatformComparison,
      profitCalculations: initProfitCalculations,
      profitEvaluation: initProfitEvaluation,
      savings: parseFloat(autoCalculatedSavings.toFixed(2)) // Use auto-calculated savings
    });
    setProductCostUpdated(false); // Reset visual indicator
    setShowProfitModal(true);
  };

  const testApiConnection = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl('products/admin/fast'), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('🧪 API Test - Status:', response.status);
      if (response.ok) {
        console.log('✅ API connection successful');
      } else {
        console.log('❌ API connection failed');
      }
    } catch (error) {
      console.error('❌ API test error:', error);
    }
  };

  const verifyProductData = async () => {
    if (!profitEditProduct) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(getApiUrl(`products/${profitEditProduct._id}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const productData = await response.json();
        console.log('🔍 Current product data in database:');
        console.log('- Product ID:', productData._id);
        console.log('- Product Name:', productData.name);
        console.log('- Platform Comparison:', productData.platformComparison);
        console.log('- Profit Calculations:', productData.profitCalculations);
        console.log('- Profit Evaluation:', productData.profitEvaluation);

        // Also test the public API endpoint that the product detail page uses
        const publicResponse = await fetch(getApiUrl(`products/public/${productData._id}`));
        if (publicResponse.ok) {
          const publicData = await publicResponse.json();
          console.log('🌐 Public API data (what product detail page sees):');
          console.log('- Platform Comparison:', publicData.platformComparison);
          console.log('- Profit Calculations:', publicData.profitCalculations);
          console.log('- Profit Evaluation:', publicData.profitEvaluation);
        }

        alert('✅ Product data fetched! Check browser console for details.');
      } else {
        alert('❌ Failed to fetch product data');
      }
    } catch (error) {
      console.error('❌ Error fetching product data:', error);
      alert('❌ Error fetching product data');
    }
  };

  const updateProfitData = async () => {
    if (!profitEditProduct) return;

    try {
      const token = localStorage.getItem('adminToken');

      const calculatedProfitFor200Units = (profitEditProduct.profitCalculations.profitPerUnit || 0) * 200;

      // Validate and clean the data before sending
      const cleanPlatformComparison = profitEditProduct.platformComparison.map(platform => ({
        platform: platform.platform || 'Platform',
        rrpPerUnit: parseFloat((parseFloat(platform.rrpPerUnit) || 0).toFixed(2)),
        units: parseInt(platform.units) || 200,
        profitFor200Units: parseFloat((parseFloat(platform.profitFor200Units) || 0).toFixed(2)),
        markup: platform.markup // Don't override with '0%', use the calculated value
      }));

      // Auto-calculate yearly profit based on platform units (move this calculation first)
      const profitPerUnit = parseFloat(profitEditProduct.profitEvaluation.netProfit) || 0;
      const platformUnits = profitEditProduct.platformComparison && profitEditProduct.platformComparison.length > 0 
        ? (profitEditProduct.platformComparison[0].units || 200)
        : 200;
      const autoCalculatedYearlyProfit = profitPerUnit * platformUnits;
      const autoCalculatedMonthlyProfit = (platformUnits / 12) * profitPerUnit;
      
      console.log('📊 Auto-calculating Profit Values:', {
        profitPerUnit: profitPerUnit,
        platformUnits: platformUnits,
        autoCalculatedMonthlyProfit: autoCalculatedMonthlyProfit,
        autoCalculatedYearlyProfit: autoCalculatedYearlyProfit,
        monthlyFormula: `(${platformUnits} ÷ 12) × £${profitPerUnit.toFixed(2)} = £${autoCalculatedMonthlyProfit.toFixed(2)}`,
        yearlyFormula: `${platformUnits} × £${profitPerUnit.toFixed(2)} = £${autoCalculatedYearlyProfit.toFixed(2)}`
      });

      const cleanProfitCalculations = {
        profitPerUnit: parseFloat((parseFloat(profitEditProduct.profitCalculations.profitPerUnit) || 0).toFixed(2)),
        profitFor200Units: parseFloat(calculatedProfitFor200Units.toFixed(2)),
        dealUnitsProfit: parseFloat((parseFloat(profitEditProduct.profitCalculations.dealUnitsProfit) || 0).toFixed(2)),
        profitForDealUnits: parseFloat((parseFloat(profitEditProduct.profitCalculations.profitForDealUnits) || 0).toFixed(2)),
        yearlyProfit: parseFloat(autoCalculatedYearlyProfit.toFixed(2)) // Add auto-calculated yearly profit here too
      };

      const cleanProfitEvaluation = {
        salesProceeds: parseFloat((parseFloat(profitEditProduct.profitEvaluation.salesProceeds) || 0).toFixed(2)),
        commission: parseFloat((parseFloat(profitEditProduct.profitEvaluation.commission) || 0).toFixed(2)),
        commissionTax: parseFloat((parseFloat(profitEditProduct.profitEvaluation.commissionTax) || 0).toFixed(2)),
        digitalServicesFee: parseFloat((parseFloat(profitEditProduct.profitEvaluation.digitalServicesFee) || 0).toFixed(2)),
        digitalServicesTax: parseFloat((parseFloat(profitEditProduct.profitEvaluation.digitalServicesTax) || 0).toFixed(2)),
        fbaFulfilmentFee: parseFloat((parseFloat(profitEditProduct.profitEvaluation.fbaFulfilmentFee) || 0).toFixed(2)),
        fbaFulfilmentTax: parseFloat((parseFloat(profitEditProduct.profitEvaluation.fbaFulfilmentTax) || 0).toFixed(2)),
        balanceChange: parseFloat((parseFloat(profitEditProduct.profitEvaluation.balanceChange) || 0).toFixed(2)),
        productCost: parseFloat((parseFloat(profitEditProduct.profitEvaluation.productCost) || 0).toFixed(2)),
        netProfit: parseFloat((parseFloat(profitEditProduct.profitEvaluation.netProfit) || 0).toFixed(2)),
        monthlyProfit: parseFloat(autoCalculatedMonthlyProfit.toFixed(2)), // Use auto-calculated monthly profit
        yearlyProfit: parseFloat(autoCalculatedYearlyProfit.toFixed(2)) // Use auto-calculated yearly profit
      };

      console.log('💰 PROFIT VALUES BEING SAVED:');
      console.log('- Monthly Profit:', cleanProfitEvaluation.monthlyProfit);
      console.log('- Yearly Profit:', cleanProfitEvaluation.yearlyProfit);
      console.log('- Net Profit:', cleanProfitEvaluation.netProfit);
      // Calculate auto-savings percentage: (Balance Change - Product Cost) / Product Cost * 100
      const balanceChange = cleanProfitEvaluation.balanceChange || 0;
      const productCost = cleanProfitEvaluation.productCost || 0;
      const autoCalculatedSavings = productCost === 0 ? 0 : ((balanceChange - productCost) / productCost) * 100;
      
      console.log('💰 SAVE FIELD DEBUG:', {
        balanceChange,
        productCost,
        autoCalculatedSavings: autoCalculatedSavings.toFixed(2),
        formula: `(${balanceChange} - ${productCost}) / ${productCost} * 100 = ${autoCalculatedSavings.toFixed(2)}%`
      });

      const updateData = {
        price: parseFloat(profitEditProduct.price || 0),
        shipping: parseFloat(profitEditProduct.shipping || 0),
        currency: 'GBP',
        platformComparison: cleanPlatformComparison,
        platformUnits: parseInt(selectedUnits) || 200,
        dealUnits: Math.floor((parseInt(selectedUnits) || 200) / 6),
        profitCalculations: cleanProfitCalculations,
        profitEvaluation: cleanProfitEvaluation,
        savings: parseFloat(autoCalculatedSavings.toFixed(2))
      };

      console.log('🔄 Sending profit update data:', updateData);
      console.log('🔑 Using token:', token ? 'Token exists' : 'No token');
      console.log('🎯 Product ID:', profitEditProduct._id);
      console.log('🌐 API URL:', getApiUrl(`products/${profitEditProduct._id}`));

      const response = await fetch(getApiUrl(`products/${profitEditProduct._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);

      if (response.ok) {
        const responseData = await response.json();
        console.log('✅ Update successful:', responseData);

        // Verify the data was saved correctly
        console.log('🔍 Verifying saved data:');
        console.log('- Platform Comparison:', responseData.platformComparison);
        console.log('- Profit Calculations:', responseData.profitCalculations);
        console.log('- Profit Evaluation:', responseData.profitEvaluation);

        // Specifically check monthly and yearly profit values
        if (responseData.profitEvaluation) {
          console.log('💰 SAVED PROFIT VALUES VERIFICATION:');
          console.log('- Monthly Profit saved:', responseData.profitEvaluation.monthlyProfit);
          console.log('- Yearly Profit saved:', responseData.profitEvaluation.yearlyProfit);
          console.log('- Net Profit saved:', responseData.profitEvaluation.netProfit);
        }

        // Clear all caches to ensure fresh data
        cacheManager.clearAll();

        // Clear browser cache for this product
        if ('caches' in window) {
          caches.keys().then(names => {
            names.forEach(name => {
              caches.delete(name);
            });
          });
        }

        // Clear localStorage cache if any
        const cacheKeys = Object.keys(localStorage).filter(key => key.includes('product') || key.includes('cache'));
        cacheKeys.forEach(key => localStorage.removeItem(key));

        // Force reload product data
        await fetchProducts();

        console.log('🔄 All caches cleared and product data refreshed');

        // Show modern success toast instead of basic alert
        setSuccessMessage('✅ Product updated successfully! Price and profit data saved across the entire website.');
        setShowSuccessToast(true);
        
        // Auto-hide toast after 5 seconds
        setTimeout(() => {
          setShowSuccessToast(false);
        }, 5000);
        
        setShowProfitModal(false);
        setProfitEditProduct(null);
      } else {
        const errorData = await response.text();
        console.error('❌ Save failed with status:', response.status);
        console.error('❌ Error response:', errorData);

        if (response.status === 401) {
          alert('❌ Authentication failed. Please refresh the page.');
        } else if (response.status === 404) {
          alert('❌ Product not found. It may have been deleted.');
        } else {
          alert(`❌ Failed to update profit data. Status: ${response.status}. Error: ${errorData}`);
        }
        throw new Error(`Failed to update profit data: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('❌ Error updating profit data:', error);
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        alert('❌ Network error. Please check if the server is running.');
      } else {
        alert(`❌ Failed to update profit data: ${error.message}`);
      }
    }
  };

  return (
    <>
      <style>{`
        /* CRITICAL: Force table to always show on desktop */
        @media (min-width: 769px) {
          .admin-products .products-table,
          .products-table {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .admin-products .mobile-product-cards,
          .mobile-product-cards {
            display: none !important;
          }
        }
        
        /* CRITICAL FIX: Force table display properties with highest specificity */
        .admin-products table,
        .admin-products .products-table table,
        .products-table table {
          display: table !important;
          width: 100% !important;
          table-layout: fixed !important;
          border-collapse: collapse !important;
        }
        
        .admin-products thead,
        .admin-products .products-table thead,
        .products-table thead {
          display: table-header-group !important;
        }
        
        .admin-products tbody,
        .admin-products .products-table tbody,
        .products-table tbody {
          display: table-row-group !important;
        }
        
        .admin-products tbody tr,
        .admin-products .products-table tbody tr,
        .products-table tbody tr {
          display: table-row !important;
          height: auto !important;
          min-height: 40px !important;
        }
        
        .admin-products td,
        .admin-products .products-table td,
        .products-table td {
          display: table-cell !important;
          padding: 6px 8px !important;
          vertical-align: middle !important;
        }
        
        .admin-products th,
        .admin-products .products-table th,
        .products-table th {
          display: table-cell !important;
          padding: 8px 10px !important;
          vertical-align: middle !important;
        }
        
        /* FIX: No page-level overflow constraints */
        .admin-products.admin-products-page {
          overflow: visible !important;
          height: auto !important;
          min-height: 100vh !important;
          max-height: none !important;
        }
        
        .products-table-container {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
        
        /* Table scroll: only horizontal, page handles vertical */
        .products-table {
          overflow-x: auto !important;
          overflow-y: visible !important;
          height: auto !important;
          max-height: none !important;
        }
        
        .products-table table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          min-width: 1400px;
        }
        
        /* Column widths - Optimized for better readability */
        .products-table th:nth-child(1),
        .products-table td:nth-child(1) { width: 40px; min-width: 40px; } /* Checkbox */
        .products-table th:nth-child(2),
        .products-table td:nth-child(2) { width: 60px; min-width: 60px; } /* Image */
        .products-table th:nth-child(3),
        .products-table td:nth-child(3) { width: 300px; min-width: 300px; } /* Product Name - WIDER */
        .products-table th:nth-child(4),
        .products-table td:nth-child(4) { width: 110px; min-width: 110px; } /* ASIN */
        .products-table th:nth-child(5),
        .products-table td:nth-child(5) { width: 110px; min-width: 110px; } /* SKU */
        .products-table th:nth-child(6),
        .products-table td:nth-child(6) { width: 120px; min-width: 120px; } /* Category */
        .products-table th:nth-child(7),
        .products-table td:nth-child(7) { width: 130px; min-width: 130px; } /* Price */
        .products-table th:nth-child(8),
        .products-table td:nth-child(8) { width: 130px; min-width: 130px; } /* Shipping */
        .products-table th:nth-child(9),
        .products-table td:nth-child(9) { width: 70px; min-width: 70px; } /* Stock */
        .products-table th:nth-child(10),
        .products-table td:nth-child(10) { width: 90px; min-width: 90px; } /* Status */
        .products-table th:nth-child(11),
        .products-table td:nth-child(11) { width: 100px; min-width: 100px; } /* Sellers */
        .products-table th:nth-child(12),
        .products-table td:nth-child(12) { width: 280px; min-width: 280px; } /* Actions */
        
        /* Allow product names to wrap - no horizontal scrolling needed */
        .products-table tbody td:nth-child(3) {
          white-space: normal !important;
          word-wrap: break-word;
          overflow-wrap: break-word;
          line-height: 1.4;
          padding: 8px 12px !important;
        }
        
        .products-table tbody td:nth-child(3) .product-name {
          white-space: normal !important;
          line-height: 1.4;
          overflow: visible;
          text-overflow: clip;
          display: block !important;
        }
        
        .products-table tbody tr {
          height: auto !important;
          min-height: 40px;
        }
        
        .products-table td {
          padding: 6px 8px;
          vertical-align: middle;
          overflow: visible !important;
        }
        
        /* Responsive Styles for Admin Products Page */
        @media (max-width: 768px) {
          /* Hide basket sidebar on mobile */
          .basket-sidebar,
          .basket-float,
          [class*="basket"],
          [class*="Basket"] {
            display: none !important;
          }
          
          /* Full width for admin products - page scrolls vertically, table scrolls horizontally */
          .admin-products {
            padding: 8px !important;
            overflow-x: hidden !important;
            overflow-y: visible !important;
            width: 100% !important;
            max-width: 100vw !important;
            margin: 0 !important;
          }
          
          /* Header responsive */
          .admin-products > div:first-child {
            flex-direction: column !important;
            gap: 10px !important;
            padding: 12px !important;
            width: 100% !important;
          }
          
          .admin-products > div:first-child h1 {
            font-size: 1.1rem !important;
            width: 100% !important;
          }
          
          .admin-products > div:first-child > div:last-child {
            width: 100% !important;
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          .admin-products > div:first-child button {
            width: 100% !important;
            padding: 10px 12px !important;
            font-size: 0.85rem !important;
          }
          
          /* Categories responsive */
          .filters-section {
            padding: 10px !important;
            overflow-x: auto;
            width: 100% !important;
            -webkit-overflow-scrolling: touch;
          }
          
          .filters-section > div {
            flex-wrap: nowrap !important;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            gap: 6px !important;
          }
          
          .filters-section button {
            font-size: 0.7rem !important;
            padding: 6px 10px !important;
            white-space: nowrap;
            flex-shrink: 0;
          }
          
          /* Search and filters */
          .filters {
            flex-direction: column !important;
            gap: 10px !important;
            padding: 10px !important;
            width: 100% !important;
          }
          
          .filters input,
          .filters select {
            width: 100% !important;
            font-size: 0.85rem !important;
            padding: 10px !important;
            box-sizing: border-box !important;
          }
          
          /* Table info section */
          .table-info {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 8px !important;
            padding: 10px !important;
          }
          
          /* Show table with horizontal scroll on mobile */
          .products-table {
            display: block !important;
            overflow-x: auto !important;
            overflow-y: visible !important;
            -webkit-overflow-scrolling: touch !important;
            width: 100% !important;
            max-width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Keep table visible but scrollable - MATCH inline style */
          .products-table table {
            min-width: 1200px !important;
            width: 1200px !important;
            display: table !important;
            margin: 0 !important;
            table-layout: fixed !important;
          }
          
          /* Hide mobile cards - show table instead */
          .mobile-product-cards {
            display: none !important;
          }
          
          /* Make table more readable on mobile */
          .products-table th,
          .products-table td {
            font-size: 0.65rem !important;
            padding: 6px 8px !important;
            white-space: nowrap !important;
            overflow: visible !important;
            text-overflow: clip !important;
          }
          
          /* Force specific column widths on mobile - total 1200px */
          .products-table th:nth-child(1),
          .products-table td:nth-child(1) { width: 40px !important; min-width: 40px !important; } /* Checkbox */
          
          .products-table th:nth-child(2),
          .products-table td:nth-child(2) { width: 60px !important; min-width: 60px !important; } /* Image */
          
          .products-table th:nth-child(3),
          .products-table td:nth-child(3) { width: 200px !important; min-width: 200px !important; } /* Product */
          
          .products-table th:nth-child(4),
          .products-table td:nth-child(4) { width: 100px !important; min-width: 100px !important; } /* ASIN */
          
          .products-table th:nth-child(5),
          .products-table td:nth-child(5) { width: 100px !important; min-width: 100px !important; } /* SKU */
          
          .products-table th:nth-child(6),
          .products-table td:nth-child(6) { width: 120px !important; min-width: 120px !important; } /* Category */
          
          .products-table th:nth-child(7),
          .products-table td:nth-child(7) { width: 130px !important; min-width: 130px !important; } /* Price */
          
          .products-table th:nth-child(8),
          .products-table td:nth-child(8) { width: 130px !important; min-width: 130px !important; } /* Shipping */
          
          .products-table th:nth-child(9),
          .products-table td:nth-child(9) { width: 70px !important; min-width: 70px !important; } /* Stock */
          
          .products-table th:nth-child(10),
          .products-table td:nth-child(10) { width: 90px !important; min-width: 90px !important; } /* Status */
          
          .products-table th:nth-child(11),
          .products-table td:nth-child(11) { width: 100px !important; min-width: 100px !important; } /* Sellers */
          
          .products-table th:nth-child(12),
          .products-table td:nth-child(12) { width: 160px !important; min-width: 160px !important; } /* Actions */
          
          /* Product name column - allow some wrapping on mobile */
          .products-table tbody td:nth-child(3) {
            white-space: normal !important;
            font-size: 0.65rem !important;
            line-height: 1.3 !important;
          }
          
          /* Smaller images on mobile */
          .products-table td img {
            max-width: 40px !important;
            max-height: 40px !important;
          }
          
          /* Smaller buttons on mobile */
          .products-table button {
            padding: 4px 6px !important;
            font-size: 0.6rem !important;
            white-space: nowrap;
          }
          
          /* Ensure table cells don't break */
          .products-table tbody tr {
            display: table-row !important;
          }
          
          .products-table tbody td {
            display: table-cell !important;
          }
          
          /* Pagination responsive */
          .pagination {
            flex-direction: column !important;
            gap: 10px !important;
            padding: 12px !important;
            width: 100% !important;
          }
          
          .pagination button {
            padding: 8px 12px !important;
            font-size: 0.8rem !important;
            width: 100% !important;
          }
          
          /* Profit modal responsive */
          .profit-modal-content {
            width: 95% !important;
            max-width: 95% !important;
            max-height: 90vh !important;
            padding: 15px !important;
            margin: 10px !important;
          }
          
          .profit-modal-content h4 {
            font-size: 1rem !important;
          }
          
          .profit-modal-content input,
          .profit-modal-content select {
            font-size: 0.85rem !important;
            padding: 10px !important;
          }
          
          .profit-modal-content button {
            padding: 10px !important;
            font-size: 0.85rem !important;
          }
        }
        
        /* Tablet styles */
        @media (min-width: 769px) and (max-width: 1024px) {
          .admin-products {
            padding: 12px !important;
          }
          
          .products-table table {
            min-width: 1200px;
            font-size: 0.75rem;
          }
          
          .products-table th,
          .products-table td {
            padding: 6px 8px !important;
            font-size: 0.75rem !important;
          }
          
          /* Adjust column widths for tablets */
          .products-table th:nth-child(3),
          .products-table td:nth-child(3) { width: 250px; min-width: 250px; }
          
          .products-table th:nth-child(12),
          .products-table td:nth-child(12) { width: 240px; min-width: 240px; }
          
          /* Smaller buttons on tablets */
          .products-table button {
            padding: 4px 8px !important;
            font-size: 0.7rem !important;
          }
        }
        
        /* Large desktop optimization */
        @media (min-width: 1400px) {
          .products-table table {
            min-width: 1500px;
          }
          
          /* Wider product name column on large screens */
          .products-table th:nth-child(3),
          .products-table td:nth-child(3) { width: 350px; min-width: 350px; }
          
          .products-table th:nth-child(12),
          .products-table td:nth-child(12) { width: 320px; min-width: 320px; }
        }
        
        /* Desktop - Force table visibility */
        @media (min-width: 769px) {
          /* Force table to show on desktop */
          .products-table {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          .mobile-product-cards {
            display: none !important;
          }
        }
        
        /* Mobile product cards (hidden by default) */
        .mobile-product-cards {
          display: none;
        }
        
        .mobile-product-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 10px;
          transition: all 0.2s ease;
        }
        
        .mobile-product-card:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
          transform: translateY(-1px);
        }
        
        .mobile-product-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 10px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .mobile-product-card-header > div:first-child:hover {
          background-color: rgba(0, 123, 255, 0.05);
          border-radius: 4px;
          padding: 4px;
          margin: -4px;
        }
        
        .mobile-product-card-body {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 0.75rem;
        }
        
        .mobile-product-card-actions {
          display: flex;
          gap: 6px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
        }
        
        .mobile-product-card-actions button {
          flex: 1;
          padding: 6px;
          font-size: 0.7rem;
          border-radius: 4px;
          border: none;
          cursor: pointer;
        }
      `}</style>
      
      <div className="admin-products admin-products-page" style={{
        fontSize: '0.85rem',
        width: '100%',
        maxWidth: '100vw',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        overflow: 'visible',
      }}>
      
      {/* Header Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: windowWidth <= 768 ? '10px' : '12px 16px',
        marginBottom: '12px',
        background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
        borderRadius: '8px',
        color: 'white',
        flexDirection: windowWidth <= 768 ? 'column' : 'row',
        gap: windowWidth <= 768 ? '10px' : '0',
        flexShrink: 0,
      }}>
        <div style={{ width: windowWidth <= 768 ? '100%' : 'auto', textAlign: windowWidth <= 768 ? 'center' : 'left' }}>
          <h1 style={{ margin: 0, fontSize: windowWidth <= 768 ? '1.2rem' : '1.4rem', fontWeight: 'bold' }}>
            📦 Products Management
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: windowWidth <= 768 ? '0.8rem' : '0.9rem', opacity: 0.9 }}>
            Manage your product catalog
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', width: windowWidth <= 768 ? '100%' : 'auto', flexDirection: windowWidth <= 768 ? 'column' : 'row' }}>
          <Button
            variant="contained"
            onClick={() => navigate('/admin/dashboard')}
            startIcon={<span>🏠</span>}
            sx={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', '&:hover': { background: 'rgba(255,255,255,0.3)', transform: 'translateY(-2px)' }, borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', transition: 'all 0.3s ease' }}
          >
            Dashboard
          </Button>

          <Button
            variant="contained"
            onClick={() => setShowCategoryManagementModal(true)}
            startIcon={<span>📂</span>}
            sx={{ background: 'rgba(102,126,234,0.9)', '&:hover': { background: 'rgba(102,126,234,1)', transform: 'translateY(-2px)' }, borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', transition: 'all 0.3s ease', backdropFilter: 'blur(10px)' }}
          >
            Manage Categories
          </Button>

          {selectedProducts.size > 0 && (
            <Button
              variant="contained"
              onClick={() => setShowBulkOperationsModal(true)}
              startIcon={<span>🔄</span>}
              sx={{ background: 'rgba(34,197,94,0.9)', '&:hover': { background: 'rgba(34,197,94,1)', transform: 'translateY(-2px)' }, borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', transition: 'all 0.3s ease' }}
            >
              Bulk Edit ({selectedProducts.size})
            </Button>
          )}

          <Button
            variant="contained"
            onClick={() => navigate('/admin/approval')}
            startIcon={<span>✅</span>}
            title="Review and approve pending products"
            sx={{ background: 'rgba(34,197,94,0.9)', '&:hover': { background: 'rgba(34,197,94,1)', transform: 'translateY(-2px)' }, borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', transition: 'all 0.3s ease' }}
          >
            Approval
          </Button>

          <Button
            variant="contained"
            onClick={() => navigate('/admin/products/add')}
            startIcon={<span>➕</span>}
            sx={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', '&:hover': { background: 'rgba(255,255,255,0.3)', transform: 'translateY(-2px)' }, borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', textTransform: 'none', transition: 'all 0.3s ease' }}
          >
            Add New Product
          </Button>
        </div>
      </div>



      <div className="filters-section" style={{ padding: '6px 8px', marginBottom: '6px', background: 'white', borderRadius: '6px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search by name, ID, category, brand, ASIN, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
            style={{
              padding: '6px 10px',
              fontSize: '0.75rem',
              flex: 1,
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          />
          {search && (
            <Tooltip title="Clear search">
              <IconButton
                onClick={() => setSearch('')}
                size="small"
                sx={{ background: '#ef4444', color: 'white', borderRadius: '4px', padding: '4px 8px', fontSize: '0.7rem', fontWeight: 600, '&:hover': { background: '#dc2626' } }}
              >
                ✕
              </IconButton>
            </Tooltip>
          )}
          {search && search.length >= 3 && /^[a-fA-F0-9]+$/.test(search) && (
            <small style={{
              fontSize: '0.65rem',
              color: '#667eea',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}>
              🔍 ID Search
            </small>
          )}
          {search && search.length >= 3 && /^[A-Z0-9]{10}$/.test(search.toUpperCase()) && (
            <small style={{
              fontSize: '0.65rem',
              color: '#ff9800',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}>
              🏷️ ASIN Search
            </small>
          )}
          {search && search.length >= 3 && /^[A-Z0-9-]{3,}$/.test(search.toUpperCase()) && !/^[A-Z0-9]{10}$/.test(search.toUpperCase()) && (
            <small style={{
              fontSize: '0.65rem',
              color: '#10b981',
              fontWeight: '500',
              whiteSpace: 'nowrap'
            }}>
              📦 SKU Search
            </small>
          )}
          <CategoryVisibilityToggle compact={true} />
          <Button variant="contained" size="small" onClick={() => navigate('/admin/excel-import')}
            sx={{ background: '#10b981', '&:hover': { background: '#059669' }, borderRadius: '4px', fontWeight: 600, fontSize: '0.7rem', textTransform: 'none', whiteSpace: 'nowrap', padding: '4px 10px' }}>
            📤 Upload
          </Button>
          <Button variant="contained" size="small" onClick={() => navigate('/admin/excel-manager')}
            sx={{ background: '#667eea', '&:hover': { background: '#5a67d8' }, borderRadius: '4px', fontWeight: 600, fontSize: '0.7rem', textTransform: 'none', whiteSpace: 'nowrap', padding: '4px 10px' }}>
            📊 Excel Files
          </Button>
          <button
            onClick={async () => {
              if (confirm('Mark ALL active products as Amazon Choice? This will make all products appear on the Amazon Choice page.')) {
                try {
                  const token = localStorage.getItem('adminToken');
                  const response = await fetch(getApiUrl('products/admin/mark-all-amazons-choice'), {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                  });
                  const result = await response.json();
                  alert(`✅ ${result.message}`);
                  fetchProducts(); // Refresh the list
                } catch (error) {
                  alert('❌ Failed to update products');
                }
              }
            }}
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              background: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            🏆 Mark All Amazon Choice
          </button>
        </div>

        {/* Category Quick Filter Buttons */}
        <div style={{ marginBottom: '6px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '4px' 
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: '600', color: '#374151' }}>
              📂 Categories:
            </div>
            <button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              style={{
                background: showCategoryManager ? '#ef4444' : '#6b7280',
                color: 'white',
                border: 'none',
                padding: '2px 6px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.6rem',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title={showCategoryManager ? 'Hide category management' : 'Show category management'}
            >
              <span>{showCategoryManager ? '🔧' : '⚙️'}</span>
              <span>{showCategoryManager ? 'Hide' : 'Manage'}</span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {categories.map(cat => {
              const isActive = (filters.category === cat.value || (cat.value === 'all' && !filters.category));
              const productCount = products.filter(p => cat.value === 'all' || p.category === cat.value).length;
              const amazonsChoiceCount = cat.amazonsChoiceCount || 0;
              
              return (
                <div key={cat.value} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    onClick={() => handleCategoryFilter(cat.value)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '0.65rem',
                      borderRadius: '4px',
                      border: '1px solid #667eea',
                      background: isActive ? '#667eea' : 'white',
                      color: isActive ? 'white' : '#667eea',
                      cursor: 'pointer',
                      fontWeight: '600',
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      whiteSpace: 'nowrap'
                    }}
                    title={`Total: ${cat.count || 0} products | Live on Amazon's Choice: ${amazonsChoiceCount}`}
                  >
                    <span style={{ fontSize: '0.7rem' }}>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {(isActive || showCategoryManager) && productCount > 0 && (
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.3)' : '#f3f4f6',
                        color: isActive ? 'white' : '#6b7280',
                        padding: '1px 4px',
                        borderRadius: '8px',
                        fontSize: '0.6rem',
                        fontWeight: '700'
                      }}>
                        {productCount}
                      </span>
                    )}
                    {amazonsChoiceCount > 0 && (
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.4)' : '#10b981',
                        color: isActive ? 'white' : 'white',
                        padding: '1px 4px',
                        borderRadius: '8px',
                        fontSize: '0.55rem',
                        fontWeight: '700',
                        marginLeft: '2px'
                      }}
                      title={`${amazonsChoiceCount} live on Amazon's Choice`}
                      >
                        🌟{amazonsChoiceCount}
                      </span>
                    )}
                  </button>
                  {showCategoryManager && cat.value !== 'all' && (
                    <button
                      onClick={() => handleDeleteCategory(cat.value, cat.label)}
                      style={{
                        background: productCount > 0 ? '#ef4444' : '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        padding: '2px 4px',
                        cursor: 'pointer',
                        fontSize: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        marginLeft: '2px',
                        transition: 'all 0.2s'
                      }}
                      title={productCount > 0 ? `Cannot delete "${cat.label}" category (${productCount} products) - Move products first` : `Hide "${cat.label}" category from list (empty)`}
                      onMouseEnter={(e) => {
                        if (productCount > 0) {
                          e.target.style.background = '#dc2626';
                        } else {
                          e.target.style.background = '#d97706';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (productCount > 0) {
                          e.target.style.background = '#ef4444';
                        } else {
                          e.target.style.background = '#f59e0b';
                        }
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {showCategoryManager && (
            <div style={{
              marginTop: '8px',
              padding: '8px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '4px',
              fontSize: '0.6rem',
              color: '#991b1b'
            }}>
              <strong>⚠️ Category Management Mode:</strong> Click the 🗑️ button next to any category to hide it from the list. 
              <br />
              <span style={{ fontSize: '0.55rem', opacity: 0.8 }}>
                • Red buttons = Categories with products (cannot be hidden - move products first)
                <br />
                • Orange buttons = Empty categories (can be hidden safely)
                <br />
                • Hidden categories can be restored using "📂 Manage Categories" → "🔄 Restore Hidden" tab
              </span>
            </div>
          )}
        </div>

        <div className="filters" style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={filters.status}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="filter-select"
            style={{
              padding: '4px 8px',
              fontSize: '0.7rem',
              border: '1px solid #e5e7eb',
              borderRadius: '4px',
              outline: 'none',
              fontWeight: '600',
              cursor: 'pointer',
              background: 'white'
            }}
          >
            <option value="">All Status</option>
            <option value="active">✅ Active</option>
            <option value="inactive">❌ Inactive</option>
            <option value="pending">⏳ Pending</option>
          </select>

          <Button
            variant={filters.isAmazonsChoice ? 'contained' : 'outlined'}
            size="small"
            onClick={handleAmazonsChoiceFilter}
            sx={{
              borderColor: '#ff9800', color: filters.isAmazonsChoice ? 'white' : '#ff9800',
              background: filters.isAmazonsChoice ? '#ff9800' : 'white',
              '&:hover': { background: '#f57c00', color: 'white', borderColor: '#f57c00' },
              borderRadius: '4px', fontWeight: 600, fontSize: '0.7rem', textTransform: 'none', whiteSpace: 'nowrap', padding: '3px 8px'
            }}
          >
            🏆 Amazon's Choice {filters.isAmazonsChoice && <span style={{ marginLeft: 4, background: 'rgba(255,255,255,0.3)', padding: '1px 4px', borderRadius: '8px', fontSize: '0.6rem' }}>ON</span>}
          </Button>


        </div>
      </div>

      {/* Slim progress bar for background (category switch) loads */}
      {backgroundLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 9999,
          background: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
          backgroundSize: '200% 100%',
          animation: 'progressSlide 1s linear infinite'
        }}>
          <style>{`@keyframes progressSlide { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        </div>
      )}

      {loading ? (
        <div className="loading-container" style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div className="loading-message" style={{
            textAlign: 'center',
            padding: '20px 0',
            marginBottom: '20px'
          }}>
            <div className="spinner" style={{
              display: 'inline-block',
              width: '36px',
              height: '36px',
              border: '3px solid #f3f4f6',
              borderTopColor: '#007bff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: '12px'
            }}></div>
          </div>
          <div style={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <ProductTableSkeleton rows={10} />
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state" style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div className="empty-state-icon" style={{
            fontSize: '4rem',
            marginBottom: '16px',
            opacity: 0.5
          }}>📦</div>
          <h3 style={{
            fontSize: '1.25rem',
            marginBottom: '8px',
            color: '#374151',
            fontWeight: '600'
          }}>No Products Found</h3>
          <p style={{
            fontSize: '0.95rem',
            marginBottom: '24px',
            color: '#6b7280'
          }}>
            {search ? `No products match "${search}"` : 
             filters.category ? `No products in ${categories.find(c => c.value === filters.category)?.label}` :
             filters.isAmazonsChoice ? "No Amazon's Choice products found" :
             'No products available'}
          </p>
          {(search || filters.category || filters.isAmazonsChoice) && (
            <Button
              variant="contained"
              onClick={() => {
                setSearch('');
                setFilters({ category: '', status: '', isAmazonsChoice: false });
              }}
              sx={{ background: '#007bff', '&:hover': { background: '#0056b3' }, borderRadius: '8px', fontWeight: 500, fontSize: '1rem', textTransform: 'none', padding: '10px 24px' }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="products-table-container" style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          minHeight: 0,
        }}>
          {/* Category Header */}
          {(filters.category || filters.isAmazonsChoice) && (
            <div style={{
              padding: '6px 10px',
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              borderRadius: '6px',
              marginBottom: '6px',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {filters.isAmazonsChoice && (
                  <>
                    <span style={{ fontSize: '0.9rem' }}>🏆</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>
                      Amazon's Choice Products
                    </span>
                  </>
                )}
                {filters.category && (
                  <>
                    <span style={{ fontSize: '0.9rem' }}>
                      {categories.find(c => c.value === filters.category)?.icon}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700' }}>
                      {categories.find(c => c.value === filters.category)?.label}
                    </span>
                  </>
                )}
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                {totalProducts} total products
              </div>
            </div>
          )}

          <div className="table-info" style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#374151', background: '#f9fafb', borderRadius: '4px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {selectedProducts.size > 0 && (
                <>
                  <span style={{
                    background: '#3b82f6',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.65rem',
                    fontWeight: '700'
                  }}>
                    {selectedProducts.size} selected
                  </span>
                  <button
                    onClick={handleBulkDelete}
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.65rem',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={`Delete ${selectedProducts.size} selected product(s)`}
                  >
                    🗑️ Delete Selected
                  </button>
                  <button
                    onClick={() => setShowBulkOperationsModal(true)}
                    style={{
                      padding: '3px 10px',
                      fontSize: '0.65rem',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={`Bulk edit ${selectedProducts.size} selected product(s)`}
                  >
                    🔄 Bulk Edit
                  </button>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>Per page:</span>
              {[100, 200, 500].map(n => (
                <button
                  key={n}
                  onClick={() => { setProductsPerPage(n); setCurrentPage(1); }}
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    border: `1px solid ${productsPerPage === n ? '#667eea' : '#d1d5db'}`,
                    borderRadius: '4px',
                    background: productsPerPage === n ? '#667eea' : 'white',
                    color: productsPerPage === n ? 'white' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {n}
                </button>
              ))}
              <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>· Page {currentPage}/{totalPages}</span>
            </div>
          </div>

          {/* Single scroll container — both axes, fills remaining height */}
          <div
            className="products-table"
            style={{
              overflowX: 'auto',
              overflowY: 'visible',
              WebkitOverflowScrolling: 'touch',
              fontSize: '0.8rem',
              background: 'white',
              borderRadius: '8px',
              width: '100%',
            }}
          >
            <Table
              stickyHeader
              size="small"
              style={{
                minWidth: '1200px',
                width: 'max-content',
                borderCollapse: 'collapse',
                tableLayout: 'auto',
              }}
            >
                <TableHead>
                  <TableRow sx={{ background: '#dc2626' }}>
                    <TableCell sx={{ padding: '6px 8px', width: '40px', background: '#dc2626', color: 'white' }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.size > 0 && selectedProducts.size === filteredProducts.length}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer' }}
                        title="Select all on this page"
                      />
                    </TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white', width: '60px' }}>Image</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>Product</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>ASIN</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>SKU</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>Category</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>Price</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>Shipping</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>Stock</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>Status</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>Sellers</TableCell>
                    <TableCell sx={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: 'white' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product._id} sx={{
                    borderBottom: '1px solid #e5e7eb',
                    background: selectedProducts.has(product._id) ? '#f0f9ff' : 'transparent',
                    '&:hover': { background: selectedProducts.has(product._id) ? '#e0f2fe' : '#f9fafb' }
                  }}>
                    <TableCell sx={{ padding: '4px 8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product._id)}
                        onChange={() => handleSelectProduct(product._id)}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <a 
                        href={`/product/${product._id}`}
                        style={{ 
                          display: 'block',
                          textDecoration: 'none',
                          color: 'inherit'
                        }}
                      >
                        <SmartProductImage 
                          product={product} 
                          onClick={null}
                        />
                      </a>
                    </TableCell>
                    <TableCell className="product-info" style={{ padding: '4px 8px' }}>
                      <a 
                        href={`/product/${product._id}`}
                        style={{ 
                          textDecoration: 'none',
                          color: 'inherit'
                        }}
                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                      >
                        <div
                          className="product-name"
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            marginBottom: '1px',
                            cursor: 'pointer',
                            color: '#667eea',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Click to view product details"
                        >
                          {product.name}
                          {product.isAmazonsChoice && <span style={{ fontSize: '0.7rem' }}>🏆</span>}
                        </div>
                      </a>
                      <div className="product-id" style={{ fontSize: '0.6rem', color: '#6b7280' }}>ID: {product._id.slice(-6)}</div>
                    </TableCell>
                    <TableCell
                      className="asin"
                      style={{ padding: '4px 8px', cursor: 'pointer', transition: 'background 0.2s' }}
                      data-cell={`${product._id}-asin`}
                      onClick={() => handleCellClick(product._id, 'asin', product.asin)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit ASIN"
                    >
                      {editingCell === `${product._id}-asin` ? (
                        <input
                          type="text"
                          value={editValues[`${product._id}-asin`] || ''}
                          onChange={(e) => handleEditChange(product._id, 'asin', e.target.value.toUpperCase())}
                          onBlur={() => handleSaveEdit(product._id, 'asin')}
                          onKeyDown={(e) => handleKeyPress(e, product._id, 'asin')}
                          autoFocus
                          maxLength="10"
                          style={{
                            width: '80px',
                            padding: '3px',
                            fontSize: '0.7rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            outline: 'none',
                            textTransform: 'uppercase',
                            fontFamily: 'monospace'
                          }}
                        />
                      ) : (
                        <span style={{
                          fontSize: '0.65rem',
                          fontFamily: 'monospace',
                          color: product.asin ? '#374151' : '#9ca3af',
                          fontWeight: product.asin ? '600' : '400'
                        }}>
                          {product.asin || 'No ASIN'}
                          <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="sku"
                      style={{ padding: '4px 8px', cursor: 'pointer', transition: 'background 0.2s' }}
                      data-cell={`${product._id}-sku`}
                      onClick={() => handleCellClick(product._id, 'sku', product.sku)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit SKU"
                    >
                      {editingCell === `${product._id}-sku` ? (
                        <input
                          type="text"
                          value={editValues[`${product._id}-sku`] || ''}
                          onChange={(e) => handleEditChange(product._id, 'sku', e.target.value.toUpperCase())}
                          onBlur={() => handleSaveEdit(product._id, 'sku')}
                          onKeyDown={(e) => handleKeyPress(e, product._id, 'sku')}
                          autoFocus
                          style={{
                            width: '100px',
                            padding: '3px',
                            fontSize: '0.7rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            outline: 'none',
                            textTransform: 'uppercase',
                            fontFamily: 'monospace'
                          }}
                        />
                      ) : (
                        <span style={{
                          fontSize: '0.65rem',
                          fontFamily: 'monospace',
                          color: product.sku ? '#374151' : '#9ca3af',
                          fontWeight: product.sku ? '600' : '400'
                        }}>
                          {product.sku || 'No SKU'}
                          <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell 
                      className="category"
                      style={{ 
                        padding: '4px 8px', 
                        cursor: 'pointer', 
                        transition: 'background 0.2s',
                        maxWidth: '120px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      data-cell={`${product._id}-category`}
                      onClick={() => handleCellClick(product._id, 'category', product.category)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title={`Category: ${product.category} - Click to edit`}
                    >
                      {editingCell === `${product._id}-category` ? (
                        categories.length > 0 ? (
                          <select
                            value={editValues[`${product._id}-category`] || ''}
                            onChange={(e) => {
                              console.log('📂 Category dropdown changed:', {
                                productId: product._id,
                                oldCategory: product.category,
                                newCategory: e.target.value,
                                editValues: editValues[`${product._id}-category`],
                                availableCategories: categories.map(c => c.label)
                              });
                              handleEditChange(product._id, 'category', e.target.value);
                              // Auto-save when user selects from dropdown
                              setTimeout(() => handleSaveEdit(product._id, 'category'), 100);
                            }}
                            onBlur={() => handleSaveEdit(product._id, 'category')}
                            onKeyDown={(e) => handleKeyPress(e, product._id, 'category')}
                            autoFocus
                            style={{
                              width: '120px',
                              padding: '3px',
                              fontSize: '0.65rem',
                              border: '2px solid #667eea',
                              borderRadius: '4px',
                              outline: 'none',
                              background: 'white'
                            }}
                          >
                            <option value="">Select Category</option>
                            {categories
                              .filter(cat => cat.value !== 'all') // Exclude "All Products" option
                              .map(cat => {
                                console.log('📂 Rendering category option:', cat.label, 'for product:', product._id);
                                return (
                                  <option key={cat.value} value={cat.label}>
                                    {cat.label}
                                  </option>
                                );
                              })}
                          </select>
                        ) : (
                          <div style={{
                            width: '120px',
                            padding: '3px',
                            fontSize: '0.65rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            background: 'white',
                            color: '#666'
                          }}>
                            Loading categories...
                          </div>
                        )
                      ) : (
                        <span className="category-badge" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                          {product.category}
                          <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="price"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                      data-cell={`${product._id}-price`}
                      onClick={() => handleCellClick(product._id, 'price', product.price)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit price"
                    >
                      {editingCell === `${product._id}-price` ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues[`${product._id}-price`] || ''}
                          onChange={(e) => handleEditChange(product._id, 'price', e.target.value)}
                          onInput={(e) => handleInputEvent(e, product._id, 'price')}
                          onWheel={(e) => handleMouseWheel(e, product._id, 'price')}
                          onBlur={() => handleSaveEdit(product._id, 'price')}
                          onKeyDown={(e) => handleKeyPress(e, product._id, 'price')}
                          autoFocus
                          style={{
                            width: '70px',
                            padding: '3px',
                            fontSize: '0.75rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      ) : (
                        <span>
                          {formatPriceWithSeller(product)}
                          <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="shipping"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                      data-cell={`${product._id}-shipping`}
                      onClick={() => handleCellClick(product._id, 'shipping', product.shipping || 0)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit shipping cost"
                    >
                      {editingCell === `${product._id}-shipping` ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editValues[`${product._id}-shipping`] || ''}
                          onChange={(e) => handleEditChange(product._id, 'shipping', e.target.value)}
                          onInput={(e) => handleInputEvent(e, product._id, 'shipping')}
                          onWheel={(e) => handleMouseWheel(e, product._id, 'shipping')}
                          onBlur={() => handleSaveEdit(product._id, 'shipping')}
                          onKeyDown={(e) => handleKeyPress(e, product._id, 'shipping')}
                          autoFocus
                          style={{
                            width: '60px',
                            padding: '3px',
                            fontSize: '0.75rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      ) : (
                        <span>
                          {formatShippingWithSeller(product)}
                          <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="stock"
                      style={{ padding: '4px 8px', cursor: 'pointer', transition: 'background 0.2s' }}
                      data-cell={`${product._id}-stock`}
                      onClick={() => handleCellClick(product._id, 'stock', product.stock)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit stock"
                    >
                      {editingCell === `${product._id}-stock` ? (
                        <input
                          type="number"
                          value={editValues[`${product._id}-stock`] || ''}
                          onChange={(e) => handleEditChange(product._id, 'stock', e.target.value)}
                          onInput={(e) => handleInputEvent(e, product._id, 'stock')}
                          onWheel={(e) => handleMouseWheel(e, product._id, 'stock')}
                          onBlur={() => handleSaveEdit(product._id, 'stock')}
                          onKeyDown={(e) => handleKeyPress(e, product._id, 'stock')}
                          autoFocus
                          style={{
                            width: '50px',
                            padding: '3px',
                            fontSize: '0.7rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      ) : (
                        <span className={product.stock > 10 ? 'in-stock' : 'low-stock'} style={{ fontSize: '0.7rem', padding: '2px 4px' }}>
                          {product.stock}
                          <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                        </span>
                      )}
                    </TableCell>
                    <TableCell 
                      style={{ 
                        padding: '4px 8px', 
                        cursor: 'pointer', 
                        transition: 'background 0.2s' 
                      }}
                      data-cell={`${product._id}-status`}
                      onClick={() => {
                        // Determine the current status value for editing
                        let currentStatus = product.status;
                        
                        // If no status field exists, determine it from other fields
                        if (!currentStatus) {
                          if (product.approvalStatus === 'pending') {
                            currentStatus = 'pending';
                          } else if (product.approvalStatus === 'disapproved') {
                            currentStatus = 'inactive';
                          } else if (product.approvalStatus === 'approved') {
                            // For approved products (including "Live" ones), default to active
                            currentStatus = 'active';
                          } else {
                            currentStatus = 'active'; // Default fallback
                          }
                        }
                        
                        handleCellClick(product._id, 'status', currentStatus);
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit status"
                    >
                      {editingCell === `${product._id}-status` ? (
                        <select
                          value={editValues[`${product._id}-status`] || ''}
                          onChange={(e) => {
                            handleEditChange(product._id, 'status', e.target.value);
                            // Auto-save when user selects from dropdown
                            setTimeout(() => handleSaveEdit(product._id, 'status'), 100);
                          }}
                          onBlur={() => handleSaveEdit(product._id, 'status')}
                          onKeyDown={(e) => handleKeyPress(e, product._id, 'status')}
                          autoFocus
                          style={{
                            width: '100px',
                            padding: '4px',
                            fontSize: '0.7rem',
                            border: '2px solid #667eea',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        >
                          <option value="active">✅ Active</option>
                          <option value="inactive">❌ Inactive</option>
                          <option value="pending">⏳ Pending</option>
                        </select>
                      ) : (
                        (() => {
                          // Determine status based on approval status and Amazon's Choice listing
                          const getStatusDisplay = (product) => {
                            // Priority 1: Check approval status first (most important)
                            if (product.approvalStatus === 'pending') {
                              return {
                                icon: '⏳',
                                text: 'Pending Approval',
                                color: '#f59e0b',
                                bgColor: '#fef3c7'
                              };
                            }
                            
                            // Priority 2: Check if disapproved
                            if (product.approvalStatus === 'disapproved') {
                              return {
                                icon: '🔴',
                                text: 'Disapproved',
                                color: '#dc2626',
                                bgColor: '#fee2e2'
                              };
                            }
                            
                            // Priority 3: Check status field first (most direct)
                            if (product.status === 'inactive') {
                              return {
                                icon: '❌',
                                text: 'Inactive',
                                color: '#dc2626',
                                bgColor: '#fee2e2'
                              };
                            }
                            
                            if (product.status === 'pending') {
                              return {
                                icon: '⏳',
                                text: 'Pending',
                                color: '#f59e0b',
                                bgColor: '#fef3c7'
                              };
                            }
                            
                            // Priority 4: Check if approved and live
                            if (product.approvalStatus === 'approved' && product.isAmazonsChoice) {
                              return {
                                icon: '✅',
                                text: 'Active (Live)',
                                color: '#059669',
                                bgColor: '#d1fae5'
                              };
                            }
                            
                            // Priority 5: Approved but not on Amazon's Choice yet
                            if (product.approvalStatus === 'approved') {
                              return {
                                icon: '✅',
                                text: 'Active (Approved)',
                                color: '#059669',
                                bgColor: '#d1fae5'
                              };
                            }
                            
                            // Default to active if no status specified
                            return {
                              icon: '✅',
                              text: 'Active',
                              color: '#059669',
                              bgColor: '#d1fae5'
                            };
                          };

                          const statusInfo = getStatusDisplay(product);
                          
                          return (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                backgroundColor: statusInfo.bgColor,
                                border: `1px solid ${statusInfo.color}20`,
                                fontSize: '0.65rem',
                                fontWeight: '600',
                                color: statusInfo.color,
                                minWidth: '80px',
                                justifyContent: 'center'
                              }}
                              title={`Status: ${statusInfo.text}${product.isAmazonsChoice ? ' (Listed on Amazon\'s Choice)' : ''} - Click to edit`}
                            >
                              <span style={{ fontSize: '0.7rem' }}>{statusInfo.icon}</span>
                              <span>{statusInfo.text}</span>
                              <span style={{ marginLeft: '4px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                            </div>
                          );
                        })()
                      )}
                    </TableCell>
                    <TableCell 
                      className="seller-info" 
                      style={{ 
                        padding: '4px 8px', 
                        fontSize: '0.7rem',
                        maxWidth: '100px',
                        overflow: 'hidden'
                      }}
                    >
                      {(() => {
                        const sellersCount = product.sellers?.length || 0;
                        const hasLegacySeller = product.seller?.businessName;
                        
                        if (sellersCount > 0) {
                          // Show seller names (up to 3, then show count)
                          const sellerNames = product.sellers
                            .slice(0, 3)
                            .map(s => {
                              // Handle populated seller data
                              if (s.sellerId && typeof s.sellerId === 'object') {
                                return s.sellerId.username || s.sellerId.businessName || 'Unknown';
                              }
                              // Handle direct seller data (fallback)
                              return s.username || s.businessName || 'Unknown';
                            })
                            .filter(name => name && name !== 'Unknown');
                          
                          const fullSellerText = sellerNames.join(', ') + (sellersCount > 3 ? ` +${sellersCount - 3} more` : '');
                          
                          return (
                            <div title={fullSellerText}>
                              <div style={{ fontWeight: '600', color: '#059669', marginBottom: '2px' }}>
                                {sellersCount} Seller{sellersCount > 1 ? 's' : ''}
                              </div>
                              {sellerNames.length > 0 && (
                                <div style={{ 
                                  fontSize: '0.65rem', 
                                  color: '#6b7280',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {sellerNames.join(', ')}
                                  {sellersCount > 3 && ` +${sellersCount - 3} more`}
                                </div>
                              )}
                            </div>
                          );
                        } else if (hasLegacySeller) {
                          return (
                            <div title={product.seller.businessName}>
                              <div style={{ 
                                fontWeight: '600', 
                                color: '#6b7280',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {product.seller.businessName}
                              </div>
                              <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>
                                Legacy
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                              No sellers
                            </div>
                          );
                        }
                      })()}
                    </TableCell>
                    <TableCell className="actions" style={{ padding: '4px 8px' }}>
                      <Tooltip title="Edit Product">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditModalProduct(product._id);
                          }}
                          sx={{ background: '#667eea', color: 'white', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', marginRight: '3px', '&:hover': { background: '#5a67d8' } }}
                        >
                          ✏️
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Manage Profit Details">
                        <IconButton
                          size="small"
                          onClick={() => startProfitEditing(product)}
                          sx={{ background: '#ff9800', color: 'white', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', marginRight: '3px', '&:hover': { background: '#f57c00' } }}
                        >
                          💰
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Product">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(product._id)}
                          sx={{ background: '#ef4444', color: 'white', borderRadius: '4px', padding: '2px 6px', fontSize: '0.65rem', '&:hover': { background: '#dc2626' } }}
                        >
                          🗑️
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Product Cards — REMOVED, table used on all screen sizes */}

          {filteredProducts.length === 0 && (
            <div className="no-products" style={{ padding: '30px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>No products found</h3>
              <p style={{ fontSize: '0.8rem', marginBottom: '12px' }}>Try adjusting your search or filters</p>
              <button
                onClick={() => navigate('/admin/excel-import')}
                className="add-first-product"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                ➕ Add from Excel
              </button>
            </div>
          )}

          {/* Pagination — always visible, responsive */}
          {totalPages > 1 && (
            <div className="pagination-container" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: windowWidth <= 768 ? '8px 4px' : '10px 16px',
              gap: windowWidth <= 768 ? '3px' : '8px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
              flexWrap: 'wrap',
            }}>
              {/* Per-page info */}
              <span style={{ fontSize: windowWidth <= 768 ? '0.6rem' : '0.7rem', color: '#6b7280', width: '100%', textAlign: 'center', marginBottom: '4px' }}>
                {totalProducts} products · Page {currentPage} of {totalPages}
              </span>
              <Button variant="outlined" size="small" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                sx={{ minWidth: 0, padding: windowWidth <= 768 ? '2px 5px' : '4px 8px', fontSize: windowWidth <= 768 ? '0.6rem' : '0.7rem', borderColor: '#667eea', color: currentPage === 1 ? '#9ca3af' : '#667eea', fontWeight: 600 }}>⏮</Button>
              <Button variant="outlined" size="small" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}
                sx={{ minWidth: 0, padding: windowWidth <= 768 ? '2px 5px' : '4px 8px', fontSize: windowWidth <= 768 ? '0.6rem' : '0.7rem', borderColor: '#667eea', color: currentPage === 1 ? '#9ca3af' : '#667eea', fontWeight: 600 }}>‹</Button>
              {/* Page number buttons */}
              {Array.from({ length: Math.min(windowWidth <= 768 ? 3 : 5, totalPages) }, (_, i) => {
                const visibleCount = windowWidth <= 768 ? 3 : 5;
                let page;
                if (totalPages <= visibleCount) {
                  page = i + 1;
                } else if (currentPage <= Math.floor(visibleCount / 2) + 1) {
                  page = i + 1;
                } else if (currentPage >= totalPages - Math.floor(visibleCount / 2)) {
                  page = totalPages - visibleCount + 1 + i;
                } else {
                  page = currentPage - Math.floor(visibleCount / 2) + i;
                }
                return (
                  <Button key={page} variant={currentPage === page ? 'contained' : 'outlined'} size="small"
                    onClick={() => setCurrentPage(page)}
                    sx={{
                      minWidth: 0,
                      padding: windowWidth <= 768 ? '2px 6px' : '4px 8px',
                      fontSize: windowWidth <= 768 ? '0.6rem' : '0.7rem',
                      fontWeight: 600,
                      ...(currentPage === page
                        ? { background: '#667eea', borderColor: '#667eea', color: 'white', '&:hover': { background: '#5a67d8' } }
                        : { borderColor: '#667eea', color: '#667eea' })
                    }}>
                    {page}
                  </Button>
                );
              })}
              <Button variant="outlined" size="small" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}
                sx={{ minWidth: 0, padding: windowWidth <= 768 ? '2px 5px' : '4px 8px', fontSize: windowWidth <= 768 ? '0.6rem' : '0.7rem', borderColor: '#667eea', color: currentPage === totalPages ? '#9ca3af' : '#667eea', fontWeight: 600 }}>›</Button>
              <Button variant="outlined" size="small" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                sx={{ minWidth: 0, padding: windowWidth <= 768 ? '2px 5px' : '4px 8px', fontSize: windowWidth <= 768 ? '0.6rem' : '0.7rem', borderColor: '#667eea', color: currentPage === totalPages ? '#9ca3af' : '#667eea', fontWeight: 600 }}>⏭</Button>
            </div>
          )}
        </div>
      )}

      {/* Profit Details Modal */}
      {showProfitModal && profitEditProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          zIndex: 1000,
          padding: windowWidth <= 768 ? '10px' : '20px',
          overflowY: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: windowWidth <= 768 ? '8px' : '12px',
            width: '100%',
            maxWidth: windowWidth <= 768 ? '100%' : '1200px',
            maxHeight: windowWidth <= 768 ? 'none' : '90vh',
            overflow: windowWidth <= 768 ? 'visible' : 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
            marginTop: windowWidth <= 768 ? '10px' : '0',
            marginBottom: windowWidth <= 768 ? '10px' : '0'
          }}>
            <div style={{
              padding: windowWidth <= 768 ? '15px' : '25px',
              borderBottom: '2px solid #f0f0f0',
              background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
              color: 'white',
              borderRadius: windowWidth <= 768 ? '8px 8px 0 0' : '12px 12px 0 0',
              display: 'flex',
              flexDirection: windowWidth <= 768 ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: windowWidth <= 768 ? 'flex-start' : 'center',
              gap: windowWidth <= 768 ? '15px' : '0'
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  margin: 0,
                  fontSize: window.innerWidth <= 768 ? '1.2rem' : '1.5rem',
                  fontWeight: 'bold',
                  lineHeight: '1.2'
                }}>
                  💰 Profit Details Management
                </h2>
                <p style={{
                  margin: '5px 0 0 0',
                  opacity: 0.9,
                  fontSize: window.innerWidth <= 768 ? '0.85rem' : '1rem',
                  wordBreak: 'break-word'
                }}>
                  {profitEditProduct.name}
                </p>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: window.innerWidth <= 768 ? '10px' : '15px',
                flexShrink: 0
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: window.innerWidth <= 768 ? 'flex-start' : 'flex-end'
                }}>
                  <label style={{
                    fontSize: window.innerWidth <= 768 ? '0.7rem' : '0.75rem',
                    marginBottom: '4px',
                    opacity: 0.9
                  }}>
                    Currency
                  </label>
                  <div style={{
                    padding: window.innerWidth <= 768 ? '4px 8px' : '6px 12px',
                    fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    fontWeight: '600',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white'
                  }}>
                    GBP (£)
                  </div>
                </div>
                <button
                  onClick={() => setShowProfitModal(false)}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    width: window.innerWidth <= 768 ? '35px' : '40px',
                    height: window.innerWidth <= 768 ? '35px' : '40px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    fontSize: window.innerWidth <= 768 ? '18px' : '20px',
                    fontWeight: '700',
                    flexShrink: 0
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div style={{ padding: window.innerWidth <= 768 ? '15px' : '25px' }}>
              {/* Platform Comparison Section */}
              <div style={{
                marginBottom: window.innerWidth <= 768 ? '20px' : '30px',
                padding: window.innerWidth <= 768 ? '15px' : '20px',
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
                border: '2px solid #28a745'
              }}>
                <h3 style={{
                  color: '#28a745',
                  marginBottom: window.innerWidth <= 768 ? '15px' : '20px',
                  fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem'
                }}>
                  📊 Platform Comparison
                </h3>
                
                {/* Auto-Fetch Button */}
                <div style={{
                  marginBottom: window.innerWidth <= 768 ? '15px' : '20px',
                  padding: '12px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '8px',
                  border: '2px solid #2196f3'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div>
                      <h4 style={{
                        margin: '0 0 4px 0',
                        color: '#1976d2',
                        fontSize: '0.95rem',
                        fontWeight: '600'
                      }}>
                        🚀 Quick Setup
                      </h4>
                      <p style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        color: '#424242',
                        lineHeight: '1.4'
                      }}>
                        Copy profit values from another product in the same category to save time
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        console.log('🚀 Auto Fetch button clicked');
                        if (profitEditProduct) {
                          console.log('📦 Current product:', profitEditProduct.name, 'ID:', profitEditProduct._id);
                          const category = products.find(p => p._id === profitEditProduct._id)?.category;
                          console.log('📂 Product category:', category);
                          if (category) {
                            // Reset states
                            setShowAllCategories(false);
                            setSelectedSourceProduct(null);
                            
                            console.log('🔍 Fetching products from category:', category);
                            // Fetch products from exact same category first
                            fetchCategoryProductsWithProfitData(category, profitEditProduct._id, true);
                            
                            // Also fetch available categories for "Show More" option
                            fetchAvailableCategoriesWithProfitData(profitEditProduct._id);
                            
                            setShowAutoFetchModal(true);
                          } else {
                            console.log('❌ Could not determine product category');
                            alert('⚠️ Could not determine product category');
                          }
                        } else {
                          console.log('❌ No profitEditProduct found');
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 2px 8px rgba(33, 150, 243, 0.3)',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 2px 8px rgba(33, 150, 243, 0.3)';
                      }}
                      title={`Find products in "${products.find(p => p._id === profitEditProduct._id)?.category}" category with profit data`}
                    >
                      <span style={{ fontSize: '1rem' }}>📋</span>
                      <span>Auto-Fetch Values</span>
                    </button>
                  </div>
                </div>
                {profitEditProduct.platformComparison.map((platform, index) => (
                  <div key={index} style={{
                    marginBottom: window.innerWidth <= 768 ? '15px' : '20px',
                    padding: window.innerWidth <= 768 ? '12px' : '15px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #ddd'
                  }}>
                    <div style={{
                      display: window.innerWidth <= 768 ? 'flex' : 'grid',
                      flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                      gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr 1fr 1fr 1fr auto',
                      gap: window.innerWidth <= 768 ? '12px' : '15px',
                      alignItems: window.innerWidth <= 768 ? 'stretch' : 'center'
                    }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Platform</label>
                        <select
                          value={platform.platform}
                          onChange={(e) => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms[index].platform = e.target.value;
                            setProfitEditProduct({ ...profitEditProduct, platformComparison: newPlatforms });
                          }}
                          style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem' }}
                        >
                          <option value="RRP">RRP</option>
                          <option value="Amazon">Amazon</option>
                          <option value="eBay">eBay</option>
                          <option value="Etsy">Etsy</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          RRP/Unit (£)
                          {platform.platform === 'RRP' && (
                            <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#007bff', marginLeft: '8px' }}>
                              (Auto-syncs with Sales Proceeds)
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getInputValue(`rrp-${index}`, platform.rrpPerUnit)}
                          onFocus={() => handleInputFocus(`rrp-${index}`, platform.rrpPerUnit)}
                          onChange={(e) => {
                            const inputKey = `rrp-${index}`;
                            handleInputChange(inputKey, e.target.value);
                            
                            const newValue = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            console.log(`🔧 Platform ${platform.platform} RRP/Unit changed to:`, newValue);
                            
                            // Use functional state update to ensure we get the latest state
                            setProfitEditProduct(prevState => {
                              const newPlatforms = [...prevState.platformComparison];
                              newPlatforms[index].rrpPerUnit = newValue;
                              
                              // Calculate and update markup for this platform
                              const productCost = prevState.profitEvaluation?.productCost || 0;
                              if (productCost > 0) {
                                try {
                                  newPlatforms[index].markup = calculateMarkupPercentage(newValue, productCost);
                                  console.log(`🔧 Updated markup for ${platform.platform}: ${newPlatforms[index].markup}`);
                                } catch (error) {
                                  console.error('Error calculating markup:', error);
                                  newPlatforms[index].markup = '0%';
                                }
                              } else {
                                newPlatforms[index].markup = '0%';
                              }
                              
                              let updatedEvaluation = { ...prevState.profitEvaluation };
                              
                              // Only auto-sync with Sales Proceeds if this is the Amazon platform
                              if (platform.platform === 'Amazon') {
                                console.log(`🔄 AMAZON SYNC: RRP/Unit ${newValue} → Sales Proceeds ${newValue}`);
                                updatedEvaluation.salesProceeds = newValue;
                                
                                // Also update Balance Change when Sales Proceeds changes
                                const commission = Math.abs(updatedEvaluation.commission || 0);
                                const commissionTax = Math.abs(updatedEvaluation.commissionTax || 0);
                                const digitalServicesFee = Math.abs(updatedEvaluation.digitalServicesFee || 0);
                                const digitalServicesTax = Math.abs(updatedEvaluation.digitalServicesTax || 0);
                                const fbaFulfilmentFee = Math.abs(updatedEvaluation.fbaFulfilmentFee || 0);
                                const fbaFulfilmentTax = Math.abs(updatedEvaluation.fbaFulfilmentTax || 0);
                                
                                const calculatedBalance = newValue - commission - commissionTax - digitalServicesFee - digitalServicesTax - fbaFulfilmentFee - fbaFulfilmentTax;
                                updatedEvaluation.balanceChange = calculatedBalance;
                                
                                // Also recalculate Net Profit (Balance Change - Product Cost)
                                const productCost = updatedEvaluation.productCost || 0;
                                updatedEvaluation.netProfit = parseFloat((calculatedBalance - productCost).toFixed(2));
                                
                                console.log(`🧮 Balance Change auto-calculated: ${newValue} - ${commission} - ${commissionTax} - ${digitalServicesFee} - ${digitalServicesTax} - ${fbaFulfilmentFee} - ${fbaFulfilmentTax} = ${calculatedBalance}`);
                                console.log(`🧮 Net Profit recalculated: ${calculatedBalance} - ${productCost} = ${updatedEvaluation.netProfit}`);
                              }
                              
                              // Update profit calculations with new net profit
                              const updatedProfitCalculations = {
                                ...prevState.profitCalculations,
                                profitPerUnit: updatedEvaluation.netProfit
                              };
                              
                              // Calculate auto-savings percentage
                              const autoCalculatedSavings = updatedEvaluation.productCost === 0 ? 0 : 
                                ((updatedEvaluation.balanceChange - updatedEvaluation.productCost) / updatedEvaluation.productCost) * 100;
                              
                              return {
                                ...prevState,
                                platformComparison: newPlatforms,
                                profitEvaluation: updatedEvaluation,
                                profitCalculations: updatedProfitCalculations,
                                savings: parseFloat(autoCalculatedSavings.toFixed(2))
                              };
                            });
                          }}
                          onBlur={() => handleInputBlur(`rrp-${index}`)}
                          style={{ 
                            width: '100%', 
                            padding: '10px', 
                            border: '1px solid #ddd', 
                            borderRadius: '6px', 
                            fontSize: '0.9rem',
                            // Hide number input spinners
                            MozAppearance: 'textfield',
                            WebkitAppearance: 'none',
                            appearance: 'none'
                          }}
                          onWheel={(e) => e.target.blur()} // Prevent scroll wheel changing values
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>Units</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={getInputValue(`units-${index}`, platform.units || 200)}
                          onFocus={() => handleInputFocus(`units-${index}`, platform.units || 200)}
                          onBlur={() => handleInputBlur(`units-${index}`)}
                          onChange={(e) => {
                            handleInputChange(`units-${index}`, e.target.value);
                            const newUnits = parseInt(e.target.value) || 200;
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            
                            // Auto-sync units to ALL platforms
                            newPlatforms.forEach((plt, idx) => {
                              plt.units = newUnits;
                              // Recalculate profit for each platform
                              const profitPerUnit = profitEditProduct.profitEvaluation?.netProfit || 0;
                              plt.profitFor200Units = profitPerUnit * newUnits;
                            });
                            
                            // Also update the selected units state
                            setSelectedUnits(newUnits);
                            
                            // Auto-calculate dealUnits = units ÷ 6
                            const autoDealUnits = Math.floor(newUnits / 6);
                            
                            setProfitEditProduct({ ...profitEditProduct, platformComparison: newPlatforms, dealUnits: autoDealUnits });
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '10px', 
                            border: '1px solid #ddd', 
                            borderRadius: '6px', 
                            fontSize: '0.9rem',
                            MozAppearance: 'textfield',
                            WebkitAppearance: 'none',
                            appearance: 'none'
                          }}
                          onWheel={(e) => e.target.blur()}
                          placeholder="200"
                        />
                        <small style={{ color: '#28a745', fontSize: '0.75rem', display: 'block', marginTop: '4px', fontWeight: '600' }}>
                          ✓ Auto-syncs to all platforms
                        </small>
                        <small style={{ color: '#6c757d', fontSize: '0.75rem', display: 'block', marginTop: '2px' }}>
                          Deal Units = {Math.floor((platform.units || 0) / 6)} (Units ÷ 6)
                        </small>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          Total Profit ({platform.units || 200} units) (£)
                        </label>
                        <input
                          type="text"
                          value={displayNumber(platform.profitFor200Units)}
                          readOnly
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #17a2b8',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            backgroundColor: '#e7f3ff',
                            cursor: 'not-allowed'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                          Markup %
                         
                        </label>
                        <input
                          type="text"
                          key={`markup-${index}-${platform.rrpPerUnit}-${profitEditProduct.profitEvaluation?.productCost}`}
                          value={(() => {
                            // Auto-calculate Markup percentage using EXACT same logic as Product Cost field
                            const rrpPerUnit = platform.rrpPerUnit || 0;
                            
                            // Use the EXACT same logic as the Product Cost field display
                            const productCostFormatted = safeFormatNumber(profitEditProduct.profitEvaluation?.productCost || 0);
                            const productCost = parseFloat(productCostFormatted) || 0;
                            
                            // Comprehensive debugging
                            console.log(`🔍 Markup Debug for ${platform.platform}:`, {
                              rrpPerUnit: rrpPerUnit,
                              rawProductCost: profitEditProduct.profitEvaluation?.productCost,
                              formattedProductCost: productCostFormatted,
                              parsedProductCost: productCost,
                              profitEvaluationExists: !!profitEditProduct.profitEvaluation,
                              calculation: `((${rrpPerUnit} - ${productCost}) / ${productCost}) × 100`,
                              testCalculation: rrpPerUnit > 0 && productCost > 0 ? ((rrpPerUnit - productCost) / productCost) * 100 : 'N/A'
                            });
                            
                            // Additional debugging for the exact values
                            if (platform.platform === 'Amazon') {
                              console.log(`🎯 Amazon Platform Specific Debug:`, {
                                platformObject: platform,
                                profitEditProductKeys: Object.keys(profitEditProduct),
                                profitEvaluationKeys: profitEditProduct.profitEvaluation ? Object.keys(profitEditProduct.profitEvaluation) : 'No profitEvaluation'
                              });
                            }
                            
                            if (productCost === 0 || isNaN(productCost)) {
                              console.log(`⚠️ Product cost is ${productCost} for ${platform.platform}, returning 0%`);
                              return '0%';
                            }
                            
                            if (rrpPerUnit === 0) {
                              console.log(`⚠️ RRP/Unit is 0 for ${platform.platform}, returning 0%`);
                              return '0%';
                            }
                            
                            const markupPercentage = ((rrpPerUnit - productCost) / productCost) * 100;
                            
                            console.log(`🧮 Markup result for ${platform.platform}: ${markupPercentage.toFixed(1)}%`);
                            
                            return `${markupPercentage.toFixed(1)}%`;
                          })()}
                          readOnly
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #17a2b8',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            backgroundColor: '#e7f3ff',
                            cursor: 'not-allowed',
                            color: '#0056b3'
                          }}
                          title="Auto-calculated: ((RRP/Unit - Product Cost) / Product Cost) × 100"
                        />
                      </div>
                      <div>
                        <button
                          onClick={() => {
                            const newPlatforms = [...profitEditProduct.platformComparison];
                            newPlatforms.splice(index, 1);
                            setProfitEditProduct({ ...profitEditProduct, platformComparison: newPlatforms });
                          }}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    const newPlatforms = [...profitEditProduct.platformComparison, {
                      platform: 'Platform',
                      rrpPerUnit: 0,
                      units: 200,
                      profitFor200Units: 0,
                      markup: '0%'
                    }];
                    setProfitEditProduct({ ...profitEditProduct, platformComparison: newPlatforms });
                  }}
                  style={{
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                >
                  + Add Platform
                </button>

                {/* Single Save Field */}
                <div style={{
                  marginTop: window.innerWidth <= 768 ? '15px' : '20px',
                  padding: window.innerWidth <= 768 ? '12px' : '15px',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '8px',
                  border: '2px solid #28a745'
                }}>
                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 2fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    alignItems: window.innerWidth <= 768 ? 'stretch' : 'center'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#28a745' }}>
                        Save (%)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (Auto-calculated: (Balance Change - Product Cost) / Product Cost × 100)
                        </span>
                      </label>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="number"
                          step="0.01"
                          value={(() => {
                            const balanceChange = profitEditProduct.profitEvaluation?.balanceChange || 0;
                            const productCost = profitEditProduct.profitEvaluation?.productCost || 0;
                            
                            if (productCost === 0) return '0.00';
                            
                            const savePercentage = ((balanceChange - productCost) / productCost) * 100;
                            return isNaN(savePercentage) ? '0.00' : savePercentage.toFixed(2);
                          })()}
                          readOnly
                          style={{
                            width: '100%',
                            padding: '10px 35px 10px 10px',
                            border: '2px solid #28a745',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            backgroundColor: '#e7f3ff',
                            cursor: 'not-allowed'
                          }}
                        />
                        <span style={{
                          position: 'absolute',
                          right: '12px',
                          fontSize: '0.9rem',
                          color: '#28a745',
                          fontWeight: 'bold',
                          pointerEvents: 'none'
                        }}>%</span>
                      </div>
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#155724',
                      fontStyle: 'italic',
                      padding: '10px',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                      borderRadius: '6px',
                      border: '1px solid rgba(40, 167, 69, 0.3)'
                    }}>
                      💡 Auto-calculated based on profit margin. This percentage will be displayed as "Save: X%" on the product detail page to show customers their savings.
                    </div>
                  </div>
                </div>
              </div>

              {/* Profit Calculations Section */}
              <div style={{
                marginBottom: window.innerWidth <= 768 ? '20px' : '30px',
                padding: window.innerWidth <= 768 ? '15px' : '20px',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                border: '2px solid #ffc107'
              }}>
                <h3 style={{
                  color: '#856404',
                  marginBottom: window.innerWidth <= 768 ? '15px' : '20px',
                  fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem'
                }}>
                  🧮 Profit Calculations
                </h3>
                <div style={{
                  display: window.innerWidth <= 768 ? 'flex' : 'grid',
                  flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                  gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr',
                  gap: window.innerWidth <= 768 ? '15px' : '20px'
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                      Profit Per Unit (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={safeFormatNumber(profitEditProduct.profitCalculations.profitPerUnit)}
                      readOnly
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #17a2b8',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        backgroundColor: '#e7f3ff',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Amazon FBA Revenue Calculator Section */}
              <div style={{
                marginBottom: window.innerWidth <= 768 ? '20px' : '30px',
                padding: window.innerWidth <= 768 ? '15px' : '20px',
                backgroundColor: '#f8d7da',
                borderRadius: '8px',
                border: '2px solid #dc3545'
              }}>
                <h3 style={{
                  color: '#721c24',
                  marginBottom: window.innerWidth <= 768 ? '12px' : '15px',
                  fontSize: window.innerWidth <= 768 ? '1.1rem' : '1.3rem'
                }}>
                  💼 Amazon FBA Revenue Calculator
                </h3>
                <p style={{
                  color: '#721c24',
                  marginBottom: window.innerWidth <= 768 ? '15px' : '20px',
                  fontSize: window.innerWidth <= 768 ? '0.8rem' : '0.9rem',
                  fontStyle: 'italic'
                }}>
                  Complete Amazon FBA profit analysis - all fields will be displayed in the product detail page
                </p>

                {/* Revenue Section */}
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: '#721c24', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #dc3545', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📈 Revenue
                  </h4>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    Sale Price (£)
                    <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#28a745', marginLeft: '8px' }}>
                      ✏️ Enter Amazon sale price — all fees auto-calculate
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={getInputValue('salesProceeds', profitEditProduct.profitEvaluation.salesProceeds)}
                    onFocus={() => handleInputFocus('salesProceeds', profitEditProduct.profitEvaluation.salesProceeds)}
                    onChange={(e) => {
                      handleInputChange('salesProceeds', e.target.value);
                      const newSalePrice = safeParseInput(e.target.value);
                      setProfitEditProduct(prevState => {
                        const fbaFee = prevState.profitEvaluation.fbaFulfilmentFee || 0;
                        const calc = autoCalcFees(newSalePrice, fbaFee, feeRates);
                        const productCost = prevState.profitEvaluation.productCost || 0;
                        const netProfit = parseFloat((calc.balanceChange - productCost).toFixed(2));
                        const autoSavings = productCost === 0 ? 0 : ((calc.balanceChange - productCost) / productCost) * 100;
                        return {
                          ...prevState,
                          profitEvaluation: { ...prevState.profitEvaluation, salesProceeds: newSalePrice, ...calc, netProfit },
                          profitCalculations: { ...prevState.profitCalculations, profitPerUnit: netProfit },
                          savings: parseFloat(autoSavings.toFixed(2))
                        };
                      });
                    }}
                    onBlur={() => handleInputBlur('salesProceeds')}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '2px solid #28a745',
                      borderRadius: '6px',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      backgroundColor: '#f0fff4',
                      color: '#155724'
                    }}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                  />

                  {/* Configurable Rates */}
                  <div style={{ marginTop: '15px', padding: '12px', background: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '10px', color: '#856404' }}>
                      ⚙️ Fee Rates (configurable)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#856404' }}>Commission %</label>
                        <input
                          type="number" step="0.1" min="0" max="100"
                          value={feeRates.commissionRate}
                          onChange={(e) => {
                            const newRates = { ...feeRates, commissionRate: parseFloat(e.target.value) || 0 };
                            setFeeRates(newRates);
                            setProfitEditProduct(prevState => {
                              const sp = prevState.profitEvaluation.salesProceeds || 0;
                              const fbaFee = prevState.profitEvaluation.fbaFulfilmentFee || 0;
                              const calc = autoCalcFees(sp, fbaFee, newRates);
                              const productCost = prevState.profitEvaluation.productCost || 0;
                              const netProfit = parseFloat((calc.balanceChange - productCost).toFixed(2));
                              return {
                                ...prevState,
                                profitEvaluation: { ...prevState.profitEvaluation, ...calc, netProfit },
                                profitCalculations: { ...prevState.profitCalculations, profitPerUnit: netProfit }
                              };
                            });
                          }}
                          style={{ width: '100%', padding: '5px', border: '1px solid #ffc107', borderRadius: '4px', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#856404' }}>Digital Fee %</label>
                        <input
                          type="number" step="0.1" min="0" max="100"
                          value={feeRates.digitalFeeRate}
                          onChange={(e) => {
                            const newRates = { ...feeRates, digitalFeeRate: parseFloat(e.target.value) || 0 };
                            setFeeRates(newRates);
                            setProfitEditProduct(prevState => {
                              const sp = prevState.profitEvaluation.salesProceeds || 0;
                              const fbaFee = prevState.profitEvaluation.fbaFulfilmentFee || 0;
                              const calc = autoCalcFees(sp, fbaFee, newRates);
                              const productCost = prevState.profitEvaluation.productCost || 0;
                              const netProfit = parseFloat((calc.balanceChange - productCost).toFixed(2));
                              return {
                                ...prevState,
                                profitEvaluation: { ...prevState.profitEvaluation, ...calc, netProfit },
                                profitCalculations: { ...prevState.profitCalculations, profitPerUnit: netProfit }
                              };
                            });
                          }}
                          style={{ width: '100%', padding: '5px', border: '1px solid #ffc107', borderRadius: '4px', fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#856404' }}>VAT %</label>
                        <input
                          type="number" step="0.1" min="0" max="100"
                          value={feeRates.vatRate}
                          onChange={(e) => {
                            const newRates = { ...feeRates, vatRate: parseFloat(e.target.value) || 0 };
                            setFeeRates(newRates);
                            setProfitEditProduct(prevState => {
                              const sp = prevState.profitEvaluation.salesProceeds || 0;
                              const fbaFee = prevState.profitEvaluation.fbaFulfilmentFee || 0;
                              const calc = autoCalcFees(sp, fbaFee, newRates);
                              const productCost = prevState.profitEvaluation.productCost || 0;
                              const netProfit = parseFloat((calc.balanceChange - productCost).toFixed(2));
                              return {
                                ...prevState,
                                profitEvaluation: { ...prevState.profitEvaluation, ...calc, netProfit },
                                profitCalculations: { ...prevState.profitCalculations, profitPerUnit: netProfit }
                              };
                            });
                          }}
                          style={{ width: '100%', padding: '5px', border: '1px solid #ffc107', borderRadius: '4px', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amazon Fees Section */}
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: '#721c24', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #dc3545', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💸 Amazon Fees & Taxes
                  </h4>
                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    marginBottom: window.innerWidth <= 768 ? '12px' : '15px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Commission (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6c757d', marginLeft: '8px' }}>
                          (Sale Price × {feeRates.commissionRate}% — auto-calculated)
                        </span>
                      </label>
                      <input
                        type="number"
                        readOnly
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.commission)}
                        style={{
                          width: '100%', padding: '10px', border: '1px solid #adb5bd',
                          borderRadius: '6px', fontSize: '0.9rem',
                          backgroundColor: '#e9ecef', cursor: 'not-allowed', color: '#495057'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Commission Tax (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6c757d', marginLeft: '8px' }}>
                          (Commission × {feeRates.vatRate}% VAT — auto-calculated)
                        </span>
                      </label>
                      <input
                        type="number"
                        readOnly
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.commissionTax)}
                        style={{
                          width: '100%', padding: '10px', border: '1px solid #adb5bd',
                          borderRadius: '6px', fontSize: '0.9rem',
                          backgroundColor: '#e9ecef', cursor: 'not-allowed', color: '#495057'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    marginBottom: window.innerWidth <= 768 ? '12px' : '15px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Digital Services Fee (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6c757d', marginLeft: '8px' }}>
                          (Sale Price × {feeRates.digitalFeeRate}% — auto-calculated)
                        </span>
                      </label>
                      <input
                        type="number"
                        readOnly
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.digitalServicesFee)}
                        style={{
                          width: '100%', padding: '10px', border: '1px solid #adb5bd',
                          borderRadius: '6px', fontSize: '0.9rem',
                          backgroundColor: '#e9ecef', cursor: 'not-allowed', color: '#495057'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Digital Services Tax (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6c757d', marginLeft: '8px' }}>
                          (Digital Fee × {feeRates.vatRate}% VAT — auto-calculated)
                        </span>
                      </label>
                      <input
                        type="number"
                        readOnly
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.digitalServicesTax)}
                        style={{
                          width: '100%', padding: '10px', border: '1px solid #adb5bd',
                          borderRadius: '6px', fontSize: '0.9rem',
                          backgroundColor: '#e9ecef', cursor: 'not-allowed', color: '#495057'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        FBA Fulfilment Fee (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#28a745', marginLeft: '8px' }}>
                          ✏️ Enter FBA fee — tax auto-calculated
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getInputValue('fbaFulfilmentFee', profitEditProduct.profitEvaluation.fbaFulfilmentFee)}
                        onFocus={() => handleInputFocus('fbaFulfilmentFee', profitEditProduct.profitEvaluation.fbaFulfilmentFee)}
                        onChange={(e) => {
                          handleInputChange('fbaFulfilmentFee', e.target.value);
                          const newFbaFee = safeParseInput(e.target.value);
                          setProfitEditProduct(prevState => {
                            const sp = prevState.profitEvaluation.salesProceeds || 0;
                            const calc = autoCalcFees(sp, newFbaFee, feeRates);
                            const productCost = prevState.profitEvaluation.productCost || 0;
                            const netProfit = parseFloat((calc.balanceChange - productCost).toFixed(2));
                            const autoSavings = productCost === 0 ? 0 : ((calc.balanceChange - productCost) / productCost) * 100;
                            return {
                              ...prevState,
                              profitEvaluation: { ...prevState.profitEvaluation, ...calc, netProfit },
                              profitCalculations: { ...prevState.profitCalculations, profitPerUnit: netProfit },
                              savings: parseFloat(autoSavings.toFixed(2))
                            };
                          });
                        }}
                        onBlur={() => handleInputBlur('fbaFulfilmentFee')}
                        style={{
                          width: '100%', padding: '10px',
                          border: '2px solid #28a745', borderRadius: '6px',
                          fontSize: '1rem', fontWeight: 'bold',
                          backgroundColor: '#f0fff4', color: '#155724',
                          MozAppearance: 'textfield', WebkitAppearance: 'none', appearance: 'none'
                        }}
                        onWheel={(e) => e.target.blur()}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        FBA Fulfilment Tax (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#6c757d', marginLeft: '8px' }}>
                          (FBA Fee × {feeRates.vatRate}% VAT — auto-calculated)
                        </span>
                      </label>
                      <input
                        type="number"
                        readOnly
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.fbaFulfilmentTax)}
                        style={{
                          width: '100%', padding: '10px', border: '1px solid #adb5bd',
                          borderRadius: '6px', fontSize: '0.9rem',
                          backgroundColor: '#e9ecef', cursor: 'not-allowed', color: '#495057'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: '#721c24', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #dc3545', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 Financial Summary
                  </h4>
                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    marginBottom: window.innerWidth <= 768 ? '12px' : '15px'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Balance Change (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (Auto-calculated: Sales Proceeds - All Fees)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={(() => {
                          // Auto-calculate Balance Change
                          const salesProceeds = profitEditProduct.profitEvaluation.salesProceeds || 0;
                          const commission = Math.abs(profitEditProduct.profitEvaluation.commission || 0);
                          const commissionTax = Math.abs(profitEditProduct.profitEvaluation.commissionTax || 0);
                          const digitalServicesFee = Math.abs(profitEditProduct.profitEvaluation.digitalServicesFee || 0);
                          const digitalServicesTax = Math.abs(profitEditProduct.profitEvaluation.digitalServicesTax || 0);
                          const fbaFulfilmentFee = Math.abs(profitEditProduct.profitEvaluation.fbaFulfilmentFee || 0);
                          const fbaFulfilmentTax = Math.abs(profitEditProduct.profitEvaluation.fbaFulfilmentTax || 0);
                          
                          const calculatedBalance = salesProceeds - commission - commissionTax - digitalServicesFee - digitalServicesTax - fbaFulfilmentFee - fbaFulfilmentTax;
                          
                          console.log(`🧮 Balance Change Display: ${salesProceeds} - ${commission} - ${commissionTax} - ${digitalServicesFee} - ${digitalServicesTax} - ${fbaFulfilmentFee} - ${fbaFulfilmentTax} = ${calculatedBalance}`);
                          
                          return safeFormatNumber(calculatedBalance);
                        })()}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #17a2b8',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          backgroundColor: '#e7f3ff',
                          cursor: 'not-allowed',
                          color: '#0056b3'
                        }}
                        title="Auto-calculated: Sales Proceeds - Commission - Commission Tax - Digital Services Fee - Digital Services Tax - FBA Fulfilment Fee - FBA Fulfilment Tax"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Product Price (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (Base price)
                        </span>
                        {productCostUpdated && (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            color: '#28a745',
                            marginLeft: '8px',
                            animation: 'pulse 1s infinite'
                          }}>
                            ✅ Updated!
                          </span>
                        )}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.price || 0)}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          const currentShipping = parseFloat(profitEditProduct.shipping || 0);
                          const newTotalCost = newPrice + currentShipping;
                          
                          // Update the profit evaluation
                          const updatedProfitEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            salesProceeds: newPrice,
                            productCost: newTotalCost
                          };
                          
                          // Recalculate net profit with new total cost
                          const balanceChange = updatedProfitEvaluation.balanceChange || 0;
                          const newNetProfit = parseFloat((balanceChange - newTotalCost).toFixed(2));
                          updatedProfitEvaluation.netProfit = newNetProfit;
                          
                          // Update the product
                          const updatedProduct = {
                            ...profitEditProduct,
                            price: newPrice,
                            profitEvaluation: updatedProfitEvaluation
                          };
                          
                          // Update platform comparison profits and markup with new total cost
                          const updatedPlatformComparison = profitEditProduct.platformComparison.map(platform => ({
                            ...platform,
                            profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2)),
                            markup: calculateMarkupPercentage(platform.rrpPerUnit, newTotalCost)
                          }));
                          
                          updatedProduct.platformComparison = updatedPlatformComparison;
                          
                          setProfitEditProduct(updatedProduct);
                          
                          // Set visual indicator that product cost was updated
                          setProductCostUpdated(true);
                          setTimeout(() => setProductCostUpdated(false), 3000);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: productCostUpdated ? '2px solid #28a745' : '2px solid #007bff',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          backgroundColor: productCostUpdated ? '#d4edda' : '#f8f9ff',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="Enter product price"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Shipping Cost (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (Delivery cost)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.shipping || 0)}
                        onChange={(e) => {
                          const newShipping = parseFloat(e.target.value) || 0;
                          const currentPrice = parseFloat(profitEditProduct.price || 0);
                          const newTotalCost = currentPrice + newShipping;
                          
                          // Update the profit evaluation
                          const updatedProfitEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            productCost: newTotalCost
                          };
                          
                          // Recalculate net profit with new total cost
                          const balanceChange = updatedProfitEvaluation.balanceChange || 0;
                          const newNetProfit = parseFloat((balanceChange - newTotalCost).toFixed(2));
                          updatedProfitEvaluation.netProfit = newNetProfit;
                          
                          // Update the product
                          const updatedProduct = {
                            ...profitEditProduct,
                            shipping: newShipping,
                            profitEvaluation: updatedProfitEvaluation
                          };
                          
                          // Update platform comparison profits and markup with new total cost
                          const updatedPlatformComparison = profitEditProduct.platformComparison.map(platform => ({
                            ...platform,
                            profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2)),
                            markup: calculateMarkupPercentage(platform.rrpPerUnit, newTotalCost)
                          }));
                          
                          updatedProduct.platformComparison = updatedPlatformComparison;
                          
                          setProfitEditProduct(updatedProduct);
                          
                          // Set visual indicator that product cost was updated
                          setProductCostUpdated(true);
                          setTimeout(() => setProductCostUpdated(false), 3000);
                        }}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #007bff',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          backgroundColor: '#f8f9ff',
                          transition: 'all 0.3s ease'
                        }}
                        placeholder="Enter shipping cost"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#28a745' }}>
                        Total Product Cost (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (Price + Shipping = Auto-calculated)
                        </span>
                      </label>
                      <input
                        type="text"
                        value={`£${((parseFloat(profitEditProduct.price || 0) + parseFloat(profitEditProduct.shipping || 0)).toFixed(2))}`}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '2px solid #28a745',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          backgroundColor: '#d4edda',
                          fontWeight: 'bold',
                          color: '#155724',
                          cursor: 'not-allowed'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Profit Results Section */}
                <div style={{ marginBottom: '25px' }}>
                  <h4 style={{ color: '#155724', marginBottom: '15px', fontSize: '1.1rem', borderBottom: '2px solid #28a745', paddingBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💰 Profit Analysis
                  </h4>
                  <div style={{
                    display: window.innerWidth <= 768 ? 'flex' : 'grid',
                    flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                    gridTemplateColumns: window.innerWidth <= 768 ? 'none' : '1fr 1fr 1fr',
                    gap: window.innerWidth <= 768 ? '12px' : '15px',
                    padding: window.innerWidth <= 768 ? '12px' : '15px',
                    backgroundColor: '#e6f7ee',
                    borderRadius: '8px',
                    border: '1px solid #28a745'
                  }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#155724' }}>
                        Net Profit (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#155724', marginLeft: '8px' }}>
                          (Balance Change - Product Cost)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.netProfit)}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: '1px solid #28a745',
                          borderRadius: '6px',
                          fontSize: '0.9rem',
                          backgroundColor: '#d4edda',
                          cursor: 'not-allowed',
                          fontWeight: 'bold'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#155724' }}>
                        Monthly Profit (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#155724', marginLeft: '8px' }}>
                          (Auto-calculated: (Units ÷ 12) × Profit per Unit)
                        </span>
                      </label>
                      {(() => {
                        const profitPerUnit = parseFloat(profitEditProduct.profitEvaluation.netProfit) || 0;
                        const platformUnits = profitEditProduct.platformComparison && profitEditProduct.platformComparison.length > 0 
                          ? (profitEditProduct.platformComparison[0].units || 2400)
                          : 2400;
                        const autoCalculatedMonthlyProfit = (platformUnits / 12) * profitPerUnit;
                        
                        return (
                          <div style={{
                            position: 'relative',
                            border: '2px solid #28a745',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
                            padding: '15px',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: '#155724',
                              marginBottom: '8px'
                            }}>
                              £{autoCalculatedMonthlyProfit.toFixed(2)}
                            </div>
                            <div style={{
                              fontSize: '11px',
                              color: '#155724',
                              fontWeight: 'bold',
                              background: 'rgba(255, 255, 255, 0.7)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              ({platformUnits} ÷ 12) × £{profitPerUnit.toFixed(2)} = £{autoCalculatedMonthlyProfit.toFixed(2)}
                            </div>
                            <input
                              type="hidden"
                              value={autoCalculatedMonthlyProfit}
                              onChange={(e) => {
                                const updatedEvaluation = {
                                  ...profitEditProduct.profitEvaluation,
                                  monthlyProfit: autoCalculatedMonthlyProfit
                                };
                                setProfitEditProduct({
                                  ...profitEditProduct,
                                  profitEvaluation: updatedEvaluation
                                });
                              }}
                            />
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem', color: '#155724' }}>
                        Yearly Profit (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#155724', marginLeft: '8px' }}>
                          (Auto-calculated: Platform Units × Profit per Unit)
                        </span>
                      </label>
                      {(() => {
                        const profitPerUnit = parseFloat(profitEditProduct.profitEvaluation.netProfit) || 0;
                        const platformUnits = profitEditProduct.platformComparison && profitEditProduct.platformComparison.length > 0 
                          ? (profitEditProduct.platformComparison[0].units || 2400)
                          : 2400;
                        const autoCalculatedYearlyProfit = profitPerUnit * platformUnits;
                        
                        return (
                          <div style={{
                            position: 'relative',
                            border: '3px solid #ffc107',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #fff3cd, #ffeaa7)',
                            padding: '15px',
                            textAlign: 'center'
                          }}>
                            <div style={{
                              fontSize: '24px',
                              fontWeight: 'bold',
                              color: '#856404',
                              marginBottom: '8px'
                            }}>
                              £{autoCalculatedYearlyProfit.toFixed(2)}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: '#856404',
                              fontWeight: 'bold',
                              background: 'rgba(255, 255, 255, 0.7)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'inline-block'
                            }}>
                              {platformUnits} × £{profitPerUnit.toFixed(2)} = £{autoCalculatedYearlyProfit.toFixed(2)}
                            </div>
                            <input
                              type="hidden"
                              value={autoCalculatedYearlyProfit}
                              onChange={(e) => {
                                const updatedEvaluation = {
                                  ...profitEditProduct.profitEvaluation,
                                  yearlyProfit: autoCalculatedYearlyProfit
                                };
                                setProfitEditProduct({
                                  ...profitEditProduct,
                                  profitEvaluation: updatedEvaluation
                                });
                              }}
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Help Section */}

              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                flexDirection: window.innerWidth <= 768 ? 'column' : 'row',
                justifyContent: window.innerWidth <= 768 ? 'stretch' : 'flex-end',
                gap: window.innerWidth <= 768 ? '10px' : '15px',
                paddingTop: window.innerWidth <= 768 ? '15px' : '20px',
                borderTop: '2px solid #f0f0f0'
              }}>
                <button
                  onClick={() => {
                    const productUrl = `/product/${profitEditProduct._id}`;
                    window.open(productUrl, '_blank');
                  }}
                  style={{
                    padding: window.innerWidth <= 768 ? '10px 20px' : '12px 25px',
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                    background: '#6f42c1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    order: window.innerWidth <= 768 ? 1 : 0
                  }}
                >
                  👁️ View Product
                </button>
                <button
                  onClick={() => setShowProfitModal(false)}
                  style={{
                    padding: window.innerWidth <= 768 ? '10px 20px' : '12px 25px',
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    order: window.innerWidth <= 768 ? 3 : 0
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={updateProfitData}
                  style={{
                    padding: window.innerWidth <= 768 ? '10px 20px' : '12px 25px',
                    fontSize: window.innerWidth <= 768 ? '0.9rem' : '1rem',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    order: window.innerWidth <= 768 ? 2 : 0
                  }}
                >
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAutoFetchModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '800px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 25px',
              borderBottom: '2px solid #f0f0f0',
              background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
              color: 'white',
              borderRadius: '12px 12px 0 0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 'bold' }}>
                  📋 Copy Profit Values
                </h2>
                <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                  Select a product from the same category to copy its profit configuration
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAutoFetchModal(false);
                  setSelectedSourceProduct(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '20px',
                  fontWeight: '700'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '25px' }}>
              {/* Category Filter Section */}
              <div style={{
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <div>
                    <h4 style={{
                      margin: '0 0 4px 0',
                      color: '#495057',
                      fontSize: '0.95rem',
                      fontWeight: '600'
                    }}>
                      📂 Category Filter
                    </h4>
                    <p style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: '#6c757d'
                    }}>
                      Currently showing: <strong>{currentFetchCategory}</strong> products
                    </p>
                  </div>
                  
                  {!showAllCategories ? (
                    <button
                      onClick={() => {
                        setShowAllCategories(true);
                        // Fetch all products with profit data
                        if (profitEditProduct) {
                          fetchCategoryProductsWithProfitData('all', profitEditProduct._id, false);
                        }
                      }}
                      style={{
                        background: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <span>🔍</span>
                      <span>Show All Categories</span>
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={currentFetchCategory}
                        onChange={(e) => {
                          const selectedCategory = e.target.value;
                          if (selectedCategory === 'all') {
                            fetchCategoryProductsWithProfitData('all', profitEditProduct._id, false);
                          } else {
                            fetchCategoryProductsWithProfitData(selectedCategory, profitEditProduct._id, true);
                          }
                        }}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          backgroundColor: 'white'
                        }}
                      >
                        <option value="all">All Categories</option>
                        {availableCategories.map((cat) => (
                          <option key={cat.category} value={cat.category}>
                            {cat.category} ({cat.count} products)
                          </option>
                        ))}
                      </select>
                      
                      <button
                        onClick={() => {
                          setShowAllCategories(false);
                          // Go back to original category
                          const originalCategory = products.find(p => p._id === profitEditProduct._id)?.category;
                          if (originalCategory) {
                            fetchCategoryProductsWithProfitData(originalCategory, profitEditProduct._id, true);
                          }
                        }}
                        style={{
                          background: '#6c757d',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {loadingCategoryProducts ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  minHeight: '200px',
                  flexDirection: 'column',
                  gap: '15px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #2196f3',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  <div style={{ fontSize: '0.9rem', color: '#666' }}>
                    Loading products with profit data...
                  </div>
                </div>
              ) : categoryProducts.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: '#666'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📊</div>
                  <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
                    {showAllCategories ? 'No Products Found' : `No "${currentFetchCategory}" Products Found`}
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    {showAllCategories 
                      ? 'No products in any category have profit data configured yet.'
                      : `No other products in the "${currentFetchCategory}" category have profit data configured yet.`
                    }
                  </p>
                  {!showAllCategories && (
                    <button
                      onClick={() => {
                        setShowAllCategories(true);
                        if (profitEditProduct) {
                          fetchCategoryProductsWithProfitData('all', profitEditProduct._id, false);
                        }
                      }}
                      style={{
                        marginTop: '15px',
                        background: '#17a2b8',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600'
                      }}
                    >
                      🔍 Search All Categories
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '8px',
                    border: '1px solid #ffeaa7'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '1.2rem' }}>💡</span>
                      <strong style={{ color: '#856404', fontSize: '0.9rem' }}>How it works:</strong>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#856404' }}>
                      <li>Platform comparison values will be copied exactly</li>
                      <li>Amazon fees & taxes will be copied exactly</li>
                      <li>Product cost will remain your current product's price</li>
                      <li>Net profit will be recalculated based on your product cost</li>
                    </ul>
                  </div>

                  <div style={{
                    display: 'grid',
                    gap: '15px',
                    maxHeight: '400px',
                    overflow: 'auto',
                    padding: '5px'
                  }}>
                    {showAllCategories ? (
                      // Group products by category when showing all
                      Object.entries(
                        categoryProducts.reduce((acc, product) => {
                          const cat = product.category || 'Uncategorized';
                          if (!acc[cat]) acc[cat] = [];
                          acc[cat].push(product);
                          return acc;
                        }, {})
                      ).map(([categoryName, products]) => (
                        <div key={categoryName} style={{ marginBottom: '20px' }}>
                          <h5 style={{
                            margin: '0 0 10px 0',
                            padding: '8px 12px',
                            backgroundColor: '#e9ecef',
                            borderRadius: '6px',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            color: '#495057',
                            border: '1px solid #dee2e6'
                          }}>
                            📂 {categoryName} ({products.length} products)
                          </h5>
                          {products.map((product) => (
                            <div
                              key={product._id}
                              style={{
                                border: selectedSourceProduct?._id === product._id ? '3px solid #2196f3' : '2px solid #e0e0e0',
                                borderRadius: '8px',
                                padding: '15px',
                                backgroundColor: selectedSourceProduct?._id === product._id ? '#f3f9ff' : 'white',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                marginBottom: '10px',
                                marginLeft: '15px'
                              }}
                              onClick={() => setSelectedSourceProduct(product)}
                              onMouseEnter={(e) => {
                                if (selectedSourceProduct?._id !== product._id) {
                                  e.target.style.borderColor = '#2196f3';
                                  e.target.style.backgroundColor = '#fafafa';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (selectedSourceProduct?._id !== product._id) {
                                  e.target.style.borderColor = '#e0e0e0';
                                  e.target.style.backgroundColor = 'white';
                                }
                              }}
                            >
                              {/* Product content - same as below */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '10px'
                              }}>
                                <div style={{ flex: 1 }}>
                                  <h4 style={{
                                    margin: '0 0 5px 0',
                                    fontSize: '1rem',
                                    color: '#333',
                                    fontWeight: '600'
                                  }}>
                                    {product.name}
                                  </h4>
                                  <div style={{
                                    fontSize: '0.8rem',
                                    color: '#666',
                                    marginBottom: '8px'
                                  }}>
                                    Price: £{product.price} | Category: {product.category}
                                  </div>
                                </div>
                                {selectedSourceProduct?._id === product._id && (
                                  <div style={{
                                    background: '#2196f3',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '14px',
                                    fontWeight: 'bold'
                                  }}>
                                    ✓
                                  </div>
                                )}
                              </div>

                              {/* Profit Data Preview */}
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '10px',
                                fontSize: '0.75rem'
                              }}>
                                {product.platformComparison && product.platformComparison.length > 0 && (
                                  <div style={{
                                    padding: '8px',
                                    backgroundColor: '#e8f5e9',
                                    borderRadius: '4px',
                                    border: '1px solid #c8e6c9'
                                  }}>
                                    <strong style={{ color: '#2e7d32' }}>Platforms:</strong>
                                    <div style={{ marginTop: '4px' }}>
                                      {product.platformComparison.slice(0, 2).map((platform, idx) => (
                                        <div key={idx} style={{ color: '#424242' }}>
                                          {platform.platform}: £{platform.rrpPerUnit}
                                        </div>
                                      ))}
                                      {product.platformComparison.length > 2 && (
                                        <div style={{ color: '#666', fontStyle: 'italic' }}>
                                          +{product.platformComparison.length - 2} more
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {product.profitEvaluation && (
                                  <div style={{
                                    padding: '8px',
                                    backgroundColor: '#fff3e0',
                                    borderRadius: '4px',
                                    border: '1px solid #ffcc02'
                                  }}>
                                    <strong style={{ color: '#f57c00' }}>Amazon Fees:</strong>
                                    <div style={{ marginTop: '4px', color: '#424242' }}>
                                      Commission: £{product.profitEvaluation.commission || 0}
                                      <br />
                                      FBA Fee: £{product.profitEvaluation.fbaFulfilmentFee || 0}
                                    </div>
                                  </div>
                                )}

                                {product.profitCalculations && (
                                  <div style={{
                                    padding: '8px',
                                    backgroundColor: '#f3e5f5',
                                    borderRadius: '4px',
                                    border: '1px solid #ce93d8'
                                  }}>
                                    <strong style={{ color: '#7b1fa2' }}>Profit:</strong>
                                    <div style={{ marginTop: '4px', color: '#424242' }}>
                                      Per Unit: £{product.profitCalculations.profitPerUnit || 0}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      // Show products from same category only
                      categoryProducts.map((product) => (
                        <div
                          key={product._id}
                          style={{
                            border: selectedSourceProduct?._id === product._id ? '3px solid #2196f3' : '2px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '15px',
                            backgroundColor: selectedSourceProduct?._id === product._id ? '#f3f9ff' : 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => setSelectedSourceProduct(product)}
                          onMouseEnter={(e) => {
                            if (selectedSourceProduct?._id !== product._id) {
                              e.target.style.borderColor = '#2196f3';
                              e.target.style.backgroundColor = '#fafafa';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedSourceProduct?._id !== product._id) {
                              e.target.style.borderColor = '#e0e0e0';
                              e.target.style.backgroundColor = 'white';
                            }
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '10px'
                          }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{
                                margin: '0 0 5px 0',
                                fontSize: '1rem',
                                color: '#333',
                                fontWeight: '600'
                              }}>
                                {product.name}
                              </h4>
                              <div style={{
                                fontSize: '0.8rem',
                                color: '#666',
                                marginBottom: '8px'
                              }}>
                                Price: £{product.price} | Category: {product.category}
                              </div>
                            </div>
                            {selectedSourceProduct?._id === product._id && (
                              <div style={{
                                background: '#2196f3',
                                color: 'white',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}>
                                ✓
                              </div>
                            )}
                          </div>

                          {/* Profit Data Preview */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: '10px',
                            fontSize: '0.75rem'
                          }}>
                            {product.platformComparison && product.platformComparison.length > 0 && (
                              <div style={{
                                padding: '8px',
                                backgroundColor: '#e8f5e9',
                                borderRadius: '4px',
                                border: '1px solid #c8e6c9'
                              }}>
                                <strong style={{ color: '#2e7d32' }}>Platforms:</strong>
                                <div style={{ marginTop: '4px' }}>
                                  {product.platformComparison.slice(0, 2).map((platform, idx) => (
                                    <div key={idx} style={{ color: '#424242' }}>
                                      {platform.platform}: £{platform.rrpPerUnit}
                                    </div>
                                  ))}
                                  {product.platformComparison.length > 2 && (
                                    <div style={{ color: '#666', fontStyle: 'italic' }}>
                                      +{product.platformComparison.length - 2} more
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {product.profitEvaluation && (
                              <div style={{
                                padding: '8px',
                                backgroundColor: '#fff3e0',
                                borderRadius: '4px',
                                border: '1px solid #ffcc02'
                              }}>
                                <strong style={{ color: '#f57c00' }}>Amazon Fees:</strong>
                                <div style={{ marginTop: '4px', color: '#424242' }}>
                                  Commission: £{product.profitEvaluation.commission || 0}
                                  <br />
                                  FBA Fee: £{product.profitEvaluation.fbaFulfilmentFee || 0}
                                </div>
                              </div>
                            )}

                            {product.profitCalculations && (
                              <div style={{
                                padding: '8px',
                                backgroundColor: '#f3e5f5',
                                borderRadius: '4px',
                                border: '1px solid #ce93d8'
                              }}>
                                <strong style={{ color: '#7b1fa2' }}>Profit:</strong>
                                <div style={{ marginTop: '4px', color: '#424242' }}>
                                  Per Unit: £{product.profitCalculations.profitPerUnit || 0}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {!loadingCategoryProducts && categoryProducts.length > 0 && (
              <div style={{
                padding: '20px 25px',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '15px'
              }}>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  {selectedSourceProduct ? (
                    <span style={{ color: '#2196f3', fontWeight: '600' }}>
                      ✓ Selected: {selectedSourceProduct.name}
                    </span>
                  ) : (
                    'Select a product to copy its profit configuration'
                  )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setShowAutoFetchModal(false);
                      setSelectedSourceProduct(null);
                    }}
                    style={{
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (selectedSourceProduct) {
                        copyProfitDataFromProduct(selectedSourceProduct);
                      }
                    }}
                    disabled={!selectedSourceProduct}
                    style={{
                      background: selectedSourceProduct ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : '#ccc',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      cursor: selectedSourceProduct ? 'pointer' : 'not-allowed',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>📋</span>
                    <span>Copy Values</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Toast Notification */}
      {showSuccessToast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
          color: 'white',
          padding: '20px 25px',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(40, 167, 69, 0.3)',
          zIndex: 9999,
          minWidth: '350px',
          maxWidth: '500px',
          animation: 'slideInRight 0.5s ease-out',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '15px'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              animation: 'bounce 0.6s ease-in-out'
            }}>
              ✅
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{
                margin: '0 0 5px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>
                Success!
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                opacity: 0.9,
                lineHeight: '1.4'
              }}>
                {successMessage}
              </p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ×
            </button>
          </div>
          
          {/* Progress bar */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '0 0 12px 12px',
            width: '100%',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              background: 'rgba(255, 255, 255, 0.8)',
              animation: 'progressBar 5s linear forwards',
              borderRadius: '0 0 12px 12px'
            }}></div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }

        @keyframes progressBar {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
      
      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={showCategoryManagementModal}
        onClose={() => setShowCategoryManagementModal(false)}
        onCategoriesUpdated={() => {
          console.log('🔄 Categories updated - refreshing admin products page');
          // Force refresh categories and products
          fetchCategories();
          fetchProducts();
          // Also trigger a page reload after a short delay to ensure everything updates
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }}
      />

      {/* Bulk Operations Modal */}
      <BulkOperationsModal
        isOpen={showBulkOperationsModal}
        onClose={() => setShowBulkOperationsModal(false)}
        selectedProducts={selectedProducts}
        onBulkUpdate={handleBulkOperations}
        categories={categories}
        allProducts={products}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        open={!!editModalProduct}
        productId={editModalProduct}
        onClose={() => setEditModalProduct(null)}
        onSaved={() => {
          // Invalidate cache and refresh
          sessionStorage.removeItem('adminProductsCache');
          sessionStorage.removeItem('adminProductsLastFetch');
          lastFetchParamsRef.current = null;
          fetchProducts(currentPage, productsPerPage);
        }}
      />
      </div>
    </>
  );
};

export default AdminProducts;