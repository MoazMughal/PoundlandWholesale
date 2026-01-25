import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import cacheManager from '../../utils/cacheManager';
import { getImageUrl } from '../../utils/imageImports';
import { getValidAdminToken, cleanupAuthTokens } from '../../utils/authFix';
import { getApiUrl } from '../../utils/api';
import CategoryVisibilityToggle from '../../components/CategoryVisibilityToggle';
import CategoryManagementModal from '../../components/CategoryManagementModal';
import BulkOperationsModal from '../../components/BulkOperationsModal';
import '../../styles/AdminProducts.css';
import '../../styles/AdminLayout.css';

// Helper function to get current product's variation value
const getCurrentProductVariationValue = (product, variationType) => {
  const productName = product.name?.toLowerCase() || '';
  
  switch (variationType) {
    case 'color':
      if (productName.includes('red')) return 'Red';
      if (productName.includes('blue')) return 'Blue';
      if (productName.includes('green')) return 'Green';
      if (productName.includes('black')) return 'Black';
      if (productName.includes('white')) return 'White';
      if (productName.includes('yellow')) return 'Yellow';
      if (productName.includes('orange')) return 'Orange';
      if (productName.includes('pink')) return 'Pink';
      if (productName.includes('purple')) return 'Purple';
      if (productName.includes('brown')) return 'Brown';
      if (productName.includes('grey') || productName.includes('gray')) return 'Grey';
      if (productName.includes('silver')) return 'Silver';
      if (productName.includes('gold')) return 'Gold';
      if (productName.includes('clear')) return 'Clear';
      return 'Default';
      
    case 'size':
      if (productName.includes('small')) return 'Small';
      if (productName.includes('medium')) return 'Medium';
      if (productName.includes('large')) return 'Large';
      if (productName.includes('xl')) return 'XL';
      if (productName.includes('xxl')) return 'XXL';
      return 'Standard';
      
    case 'style':
      if (productName.includes('classic')) return 'Classic';
      if (productName.includes('modern')) return 'Modern';
      if (productName.includes('vintage')) return 'Vintage';
      if (productName.includes('premium')) return 'Premium';
      if (productName.includes('deluxe')) return 'Deluxe';
      if (productName.includes('basic')) return 'Basic';
      if (productName.includes('dinosaur')) return 'Dinosaur';
      if (productName.includes('dolphin')) return 'Dolphin';
      if (productName.includes('shark')) return 'Shark';
      return 'Default';
      
    default:
      // For unknown variation types, try to detect color first, then extract meaningful words
      if (productName.includes('red')) return 'Red';
      if (productName.includes('blue')) return 'Blue';
      if (productName.includes('green')) return 'Green';
      if (productName.includes('black')) return 'Black';
      if (productName.includes('white')) return 'White';
      if (productName.includes('yellow')) return 'Yellow';
      if (productName.includes('orange')) return 'Orange';
      if (productName.includes('pink')) return 'Pink';
      if (productName.includes('purple')) return 'Purple';
      if (productName.includes('brown')) return 'Brown';
      if (productName.includes('grey') || productName.includes('gray')) return 'Grey';
      if (productName.includes('silver')) return 'Silver';
      if (productName.includes('gold')) return 'Gold';
      if (productName.includes('clear')) return 'Clear';
      
      // If no color found, extract meaningful words from product name
      const words = product.name?.split(' ').filter(word => 
        word.length > 3 && 
        !['the', 'and', 'for', 'with', 'from', 'strap', 'watch'].includes(word.toLowerCase())
      ) || [];
      return words[0] || 'Default';
  }
};

// Component to show linked product preview in admin
const LinkedProductPreview = ({ productId }) => {
  const [productData, setProductData] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(getApiUrl(`products/public/${productId}`));
        if (response.ok) {
          const data = await response.json();
          setProductData(data);
        }
      } catch (error) {
        console.error('Error fetching product preview:', error);
      }
    };

    if (productId) {
      fetchProduct();
    }
  }, [productId]);

  if (!productData) {
    return <span style={{ fontSize: '0.6rem', color: '#999' }}>...</span>;
  }

  const imageUrl = productData.images?.[0] || productData.image;

  return imageUrl ? (
    <img
      src={getImageUrl(imageUrl)}
      alt="Preview"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'contain'
      }}
      onError={(e) => {
        e.target.style.display = 'none';
      }}
    />
  ) : (
    <span style={{ fontSize: '0.6rem', color: '#999' }}>No img</span>
  );
};

// Smart Image Component - Fetches from Cloudinary or existing products
const SmartProductImage = ({ product, onClick }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  useEffect(() => {
    // Prevent multiple fetches for the same product
    if (hasAttemptedFetch) return;

    const fetchImage = async () => {
      // If product already has images, use them
      if (product.images && product.images.length > 0) {
        setImageUrl(product.images[0]);
        setHasAttemptedFetch(true);
        return;
      }

      // If no images but has ASIN, try to fetch from Cloudinary
      if (product.asin && product.asin.trim()) {
        setLoading(true);
        
        // Try Cloudinary first
        const cloudinaryUrl = `https://res.cloudinary.com/dtuq3tvjx/image/upload/v1/products/${product.asin}`;
        
        try {
          const response = await fetch(cloudinaryUrl, { method: 'HEAD' });
          if (response.ok) {
            setImageUrl(cloudinaryUrl);
            setLoading(false);
            setHasAttemptedFetch(true);
            return;
          }
        } catch (err) {
          // Silently fail - Cloudinary image not found
        }

        // If Cloudinary fails, try to find from other products with same ASIN
        try {
          const token = localStorage.getItem('adminToken');
          const searchResponse = await fetch(
            `http://localhost:5000/api/products/admin/search-by-asin/${product.asin}`,
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          if (searchResponse.ok) {
            const data = await searchResponse.json();
            if (data.products && data.products.length > 0) {
              // Find first product with images
              const productWithImage = data.products.find(p => 
                p.images && p.images.length > 0 && p._id !== product._id
              );
              
              if (productWithImage) {
                setImageUrl(productWithImage.images[0]);
                setLoading(false);
                setHasAttemptedFetch(true);
                return;
              }
            }
          }
        } catch (err) {
          // Silently fail - search failed
        }

        setLoading(false);
        setError(true);
        setHasAttemptedFetch(true);
      } else {
        // No ASIN, mark as attempted
        setHasAttemptedFetch(true);
      }
    };

    fetchImage();
  }, [product._id, product.asin, product.images, hasAttemptedFetch]);

  if (loading) {
    return (
      <div
        style={{
          width: '50px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f3f4f6',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          fontSize: '0.6rem',
          color: '#9ca3af'
        }}
      >
        ⏳
      </div>
    );
  }

  if (imageUrl) {
    return (
      <>
        <img
          src={getImageUrl(imageUrl)}
          alt={product.name}
          style={{
            width: '50px',
            height: '50px',
            objectFit: 'cover',
            borderRadius: '4px',
            border: '1px solid #e5e7eb',
            cursor: 'pointer',
            display: 'block'
          }}
          onClick={onClick}
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) {
              e.target.nextSibling.style.display = 'flex';
            }
          }}
          title="Click to view product details"
        />
        <div
          style={{
            width: '50px',
            height: '50px',
            display: 'none',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f3f4f6',
            borderRadius: '4px',
            border: '1px solid #e5e7eb',
            fontSize: '0.6rem',
            color: '#9ca3af',
            cursor: 'pointer',
            flexDirection: 'column',
            gap: '2px'
          }}
          onClick={onClick}
          title="Image failed to load - Click to edit product"
        >
          <span>No Image</span>
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        width: '50px',
        height: '50px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
        fontSize: '0.6rem',
        color: '#9ca3af',
        cursor: 'pointer',
        flexDirection: 'column',
        gap: '2px'
      }}
      onClick={onClick}
      title={product.asin ? `No image found for ASIN: ${product.asin}` : 'No image - Click to edit product'}
    >
      <span>No Image</span>
      {product.asin && <span style={{ fontSize: '0.5rem' }}>({product.asin})</span>}
    </div>
  );
};

const AdminProducts = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToProduct } = useAdmin();

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: '', status: '', isAmazonsChoice: false });
  const [editingCell, setEditingCell] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalPages, setTotalPages] = useState(1); // Add totalPages state
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

  // Helper function to update profit data after price change
  const updateProfitDataAfterPriceChange = async (productId, newPrice, token) => {
    try {
      console.log('🔄 Updating profit data after price change for product:', productId, 'New price:', newPrice);
      
      // Fetch the current product data to get existing profit information
      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
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

      // Update profit modal if it's open for this product
      if (profitEditProduct && profitEditProduct._id === productId) {
        console.log('🔄 Profit modal is open, updating modal state');

        // Update the product cost in the profit evaluation - UPDATE BOTH PRICE AND COST
        const updatedProfitEvaluation = {
          ...profitEditProduct.profitEvaluation,
          salesProceeds: newPrice, // Update sales proceeds to match new price
          productCost: newPrice // Also update product cost to match new price
        };

        // Recalculate net profit with new product cost (same as new price)
        const newProductCost = newPrice; // Product cost = new price
        const newNetProfit = parseFloat((balanceChange - newProductCost).toFixed(2));
        updatedProfitEvaluation.netProfit = newNetProfit;

        // Update profit calculations - use new price as cost price
        const updatedProfitCalculations = {
          ...profitEditProduct.profitCalculations,
          costPrice: newProductCost, // Use new price as cost price
          profitPerUnit: newNetProfit
        };

        // Update platform comparison profits and markup with new product cost
        const updatedPlatformComparison = profitEditProduct.platformComparison.map(platform => ({
          ...platform,
          profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2)),
          markup: calculateMarkupPercentage(platform.rrpPerUnit, newProductCost) // Use new price as product cost
        }));

        // Calculate auto-savings percentage with new product cost
        const autoCalculatedSavings = newProductCost === 0 ? 0 : 
          ((balanceChange - newProductCost) / newProductCost) * 100;

        // Update the profit edit product state
        setProfitEditProduct({
          ...profitEditProduct,
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
      const newProductCost = newPrice; // Set product cost to match new price
      const newNetProfit = parseFloat((balanceChange - newProductCost).toFixed(2));

      const updatedProfitEvaluation = {
        ...existingEvaluation,
        salesProceeds: newPrice, // Update sales proceeds to match new price
        productCost: newProductCost, // Update product cost to match new price
        netProfit: newNetProfit
      };

      console.log('💰 Updated profit evaluation:', updatedProfitEvaluation);

      // Update profit calculations - use new price as cost price
      const existingCalculations = productData.profitCalculations || {};
      const updatedProfitCalculations = {
        ...existingCalculations,
        costPrice: newProductCost, // Use new price as product cost
        profitPerUnit: newNetProfit
      };

      // Update platform comparison if it exists - use new price as product cost
      const updatedPlatformComparison = (productData.platformComparison || []).map(platform => ({
        ...platform,
        profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2)),
        markup: calculateMarkupPercentage(platform.rrpPerUnit, newProductCost) // Use new price as product cost
      }));

      // Calculate auto-savings percentage with new product cost
      const autoCalculatedSavings = newProductCost === 0 ? 0 : 
        ((balanceChange - newProductCost) / newProductCost) * 100;

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
      const updateResponse = await fetch(`http://localhost:5000/api/products/${productId}`, {
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
        
        // Force refresh products list
        await fetchProducts();
        
        // Verify the update by fetching the product again
        setTimeout(async () => {
          try {
            const verifyResponse = await fetch(`http://localhost:5000/api/products/${productId}`, {
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
        
        // Show success message
        setSuccessMessage('✅ Price updated! Both product price and product cost updated in Amazon FBA Revenue Calculator.');
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
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
      
      const response = await fetch(`http://localhost:5000/api/products/admin/categories-with-profit?excludeId=${currentProductId}`, {
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
        ? `http://localhost:5000/api/products/admin/category/${encodeURIComponent(category)}/with-profit?excludeId=${currentProductId}&exactMatch=true`
        : `http://localhost:5000/api/products/admin/category/${encodeURIComponent(category)}/with-profit?excludeId=${currentProductId}&exactMatch=false`;
        
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

  // Variations management state
  const [showVariationsModal, setShowVariationsModal] = useState(false);
  const [variationsEditProduct, setVariationsEditProduct] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [variationSearchQuery, setVariationSearchQuery] = useState('');

  // Helper functions for linked product configuration
  const getLinkedProductVariationType = (productId) => {
    // Find if this product is linked in any variation and return its type
    for (const variation of variationsEditProduct?.variations || []) {
      const option = variation.options?.find(opt => opt.productId === productId);
      if (option) {
        return variation.type;
      }
    }
    return 'style'; // default
  };

  const getLinkedProductVariationName = (productId) => {
    // Find if this product is linked in any variation and return its custom name
    for (const variation of variationsEditProduct?.variations || []) {
      const option = variation.options?.find(opt => opt.productId === productId);
      if (option) {
        return option.customName || '';
      }
    }
    return '';
  };

  const updateLinkedProductConfig = (productId, field, value) => {
    // Update the configuration for a linked product
    const updatedVariations = [...(variationsEditProduct.variations || [])];

    // Ensure we have at least one variation
    if (updatedVariations.length === 0) {
      updatedVariations.push({ type: 'style', name: 'Style', options: [] });
    }

    // Find or create the option for this product
    let optionIndex = updatedVariations[0].options?.findIndex(opt => opt.productId === productId);

    if (optionIndex === -1) {
      // Create new option
      if (!updatedVariations[0].options) {
        updatedVariations[0].options = [];
      }
      updatedVariations[0].options.push({
        value: '', // Start with empty value for user to fill
        productId: productId,
        type: 'style',
        customName: 'Style', // Auto-set based on type
        images: [],
        price: null,
        stock: null
      });
      optionIndex = updatedVariations[0].options.length - 1;
    }

    // Update the field
    if (field === 'type') {
      updatedVariations[0].options[optionIndex].type = value;
    } else if (field === 'name') {
      updatedVariations[0].options[optionIndex].customName = value;
    } else if (field === 'value') {
      updatedVariations[0].options[optionIndex].value = value;
    }

    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const toggleLinkedProduct = (productId) => {
    console.log('🔗 Toggling link for product:', productId);

    // Get current variations or create default
    let updatedVariations = [...(variationsEditProduct.variations || [])];

    // Ensure we have at least one variation with proper structure
    if (updatedVariations.length === 0) {
      updatedVariations = [{
        type: 'style',
        name: 'any',
        options: []
      }];
    }

    // Ensure the first variation has options array
    if (!updatedVariations[0].options) {
      updatedVariations[0].options = [];
    }

    const isCurrentlyLinked = updatedVariations[0].options.some(option => option.productId === productId);
    console.log('🔗 Currently linked?', isCurrentlyLinked);

    if (isCurrentlyLinked) {
      // Remove the product
      updatedVariations[0].options = updatedVariations[0].options.filter(option => option.productId !== productId);
      console.log('🔗 Removed product from links');
    } else {
      // Add the product
      const linkedProduct = availableProducts.find(p => p._id === productId);
      if (linkedProduct) {
        updatedVariations[0].options.push({
          value: linkedProduct.name.split(' ')[0] || 'Option',
          productId: productId,
          type: 'style',
          customName: '',
          images: linkedProduct.images || [],
          price: linkedProduct.price,
          stock: linkedProduct.stock
        });
        console.log('🔗 Added product to links:', linkedProduct.name);
      }
    }

    console.log('🔗 Updated variations:', updatedVariations);

    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const removeLinkedProduct = (productId) => {
    // Remove a product from variations
    const updatedVariations = [...(variationsEditProduct.variations || [])];

    if (updatedVariations.length > 0 && updatedVariations[0].options) {
      updatedVariations[0].options = updatedVariations[0].options.filter(option => option.productId !== productId);
    }

    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const currency = 'GBP';
  const currencySymbol = '£';
  const productsPerPage = 200;

  const [categories, setCategories] = useState([
    // Categories will be loaded from API
  ]);

  const formatPrice = (price) => {
    return `£${parseFloat(price || 0).toFixed(2)}`;
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
    // If this input is being edited, return the raw input value
    if (editingInput === inputKey && inputValues[inputKey] !== undefined) {
      return inputValues[inputKey];
    }
    // Otherwise return the formatted fallback value
    return safeFormatNumber(fallbackValue) || '';
  };

  const handleInputFocus = (inputKey, currentValue) => {
    setEditingInput(inputKey);
    // setIsManuallyEditing(true); // Temporarily disabled
    setInputValues(prev => ({
      ...prev,
      [inputKey]: safeFormatNumber(currentValue) || ''
    }));
  };

  const handleInputChange = (inputKey, newValue) => {
    setInputValues(prev => ({
      ...prev,
      [inputKey]: newValue
    }));
  };

  const handleInputBlur = (inputKey) => {
    setEditingInput(null);
    // setIsManuallyEditing(false); // Temporarily disabled
    // Clean up the input value from state
    setInputValues(prev => {
      const newValues = { ...prev };
      delete newValues[inputKey];
      return newValues;
    });
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const categoryFromState = location.state?.category;
    const categoryFromUrl = urlParams.get('category');
    const statusFromUrl = urlParams.get('status');
    const categoryToRestore = categoryFromState || categoryFromUrl || '';
    const statusToRestore = statusFromUrl || '';
    const amazonsChoiceFromUrl = urlParams.get('amazonsChoice') === 'true';

    console.log('🔄 Category restoration:', {
      categoryFromState,
      categoryFromUrl,
      statusFromUrl,
      categoryToRestore,
      statusToRestore,
      amazonsChoiceFromUrl,
      currentCategory: filters.category,
      currentStatus: filters.status,
      locationSearch: location.search,
      locationState: location.state
    });

    setFilters(prev => {
      const newFilters = { ...prev };
      if (prev.category !== categoryToRestore) {
        console.log('📂 Updating category from', prev.category, 'to', categoryToRestore);
        newFilters.category = categoryToRestore;
      }
      if (prev.status !== statusToRestore) {
        console.log('📊 Updating status from', prev.status, 'to', statusToRestore);
        newFilters.status = statusToRestore;
      }
      if (prev.isAmazonsChoice !== amazonsChoiceFromUrl) {
        console.log('⭐ Updating Amazon\'s Choice from', prev.isAmazonsChoice, 'to', amazonsChoiceFromUrl);
        newFilters.isAmazonsChoice = amazonsChoiceFromUrl;
      }
      return newFilters;
    });
  }, [location.pathname, location.search, location.state?.category]);

  useEffect(() => {
    // Clear cache to ensure fresh data
    cacheManager.clearAll();
    setCurrentPage(1); // Reset to first page when filters change
    fetchProducts(1);
    fetchCategories();
  }, [search, filters]);

  // Initial load on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle page changes
  useEffect(() => {
    if (currentPage > 1) { // Only fetch if not initial load (page 1 is handled by filters useEffect)
      fetchProducts(currentPage);
    }
  }, [currentPage]);

  // Track window resize for responsive modal
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Refresh products when page becomes visible (e.g., returning from edit page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Page is now visible, refresh products to get latest data
        fetchProducts(currentPage);
      }
    };

    const handleFocus = () => {
      // Window regained focus, refresh products
      fetchProducts(currentPage);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [currentPage]);

  const fetchCategories = async () => {
    try {
      // Include Excel categories for admin use and get counts
      const response = await fetch(getApiUrl('products/public/categories?includeExcel=true&includeCounts=true'));
      if (response.ok) {
        const data = await response.json();

        // Get hidden categories from localStorage
        const hiddenCategories = JSON.parse(localStorage.getItem('hiddenCategories') || '[]');

        // Also fetch Amazon's Choice counts for each category
        const amazonsChoiceCountsResponse = await fetch(getApiUrl('products/admin/amazons-choice-counts'));
        let amazonsChoiceCounts = {};
        if (amazonsChoiceCountsResponse.ok) {
          const countsData = await amazonsChoiceCountsResponse.json();
          amazonsChoiceCounts = countsData.counts || {};
        }

        // Filter out hidden categories and format for display
        const dynamicCategories = data.categories
          .filter(cat => cat.value === 'all' || !hiddenCategories.includes(cat.value))
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

  const fetchProducts = async (page = currentPage) => {
    try {
      setLoading(true);
      
      // Clean up any invalid tokens first
      cleanupAuthTokens();
      
      const token = getValidAdminToken();
      if (!token) {
        alert('❌ Authentication token is invalid. Please log in again.');
        navigate('/admin/login');
        return;
      }

      const params = new URLSearchParams({
        ...(search && { search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.status && { status: filters.status }),
        ...(filters.isAmazonsChoice && { isAmazonsChoice: 'true' }),
        excludeSellerCopies: 'true', // Re-enable with improved server-side filtering
        limit: productsPerPage.toString(), // Use productsPerPage instead of hardcoded 50
        page: page.toString() // Add pagination
      });

      console.log('🔍 Products fetch params:', {
        search,
        category: filters.category,
        status: filters.status,
        isAmazonsChoice: filters.isAmazonsChoice,
        page,
        limit: productsPerPage
      });

      const useFastEndpoint = !search && !filters.category && !filters.status && !filters.isAmazonsChoice;

      // Add cache buster to ensure fresh data
      const cacheBuster = `_t=${Date.now()}`;
      const url = useFastEndpoint
        ? `http://localhost:5000/api/products/admin/fast?${cacheBuster}&limit=${productsPerPage}&page=${page}`
        : `http://localhost:5000/api/products?${params}&${cacheBuster}`;

      console.log('🌐 Fetching from URL:', url);

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
      console.log('📊 Received products:', data.products.length, 'Total:', data.total);
      setProducts(data.products);
      setTotalProducts(data.total || data.products.length);
      setFilteredProducts(data.products);
      
      // Update pagination info
      const totalPagesCalc = Math.ceil((data.total || data.products.length) / productsPerPage);
      setTotalPages(totalPagesCalc);
      console.log(`📊 Admin Products: Page ${page}/${totalPagesCalc}, showing ${data.products.length} of ${data.total || data.products.length} products`);
      
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      alert('Failed to fetch products. Please check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
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
      const response = await fetch('http://localhost:5000/api/products/admin/cleanup-duplicate-categories', {
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
          const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
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

      const response = await fetch('http://localhost:5000/api/products/admin/bulk-update', {
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

        // Clear selection and refresh
        setSelectedProducts(new Set());
        fetchProducts();
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
      const response = await fetch(`http://localhost:5000/api/products/${id}`, {
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

  const handleSaveEdit = async (productId, field) => {
    const cellKey = `${productId}-${field}`;
    const newValue = editValues[cellKey];

    console.log('💾 handleSaveEdit called:', { productId, field, cellKey, newValue, editValues });

    // Allow empty values for ASIN, SKU, and category fields, but not for price/stock
    if (newValue === undefined || (newValue === '' && field !== 'asin' && field !== 'sku' && field !== 'category')) {
      console.log('❌ Validation failed - empty value not allowed for field:', field);
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      let parsedValue;

      if (field === 'price' || field === 'stock') {
        parsedValue = parseFloat(newValue);
      } else if (field === 'asin') {
        // Handle ASIN field - trim and convert to uppercase, allow empty string
        parsedValue = newValue ? newValue.trim().toUpperCase() : '';
      } else if (field === 'sku') {
        // Handle SKU field - trim and convert to uppercase, allow empty string
        parsedValue = newValue ? newValue.trim().toUpperCase() : '';
      } else if (field === 'category') {
        // Handle category field - trim the value
        parsedValue = newValue ? newValue.trim() : '';
      } else {
        parsedValue = newValue;
      }

      const updateData = { [field]: parsedValue };
      if (field === 'price') {
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

      const response = await fetch(`http://localhost:5000/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const updateObject = { [field]: parsedValue };
        if (field === 'price') {
          updateObject.currency = 'GBP';
        }

        const updatedProducts = products.map(p =>
          p._id === productId ? { ...p, ...updateObject } : p
        );

        setProducts(updatedProducts);
        setFilteredProducts(filteredProducts.map(p =>
          p._id === productId ? { ...p, ...updateObject } : p
        ));
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
          
          // Show success message for category update
          setSuccessMessage(`✅ Category updated to "${parsedValue}" successfully!`);
          setShowSuccessToast(true);
          setTimeout(() => setShowSuccessToast(false), 3000);
          
          // Trigger category refresh in headers since categories might have changed
          localStorage.setItem('categoriesUpdated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('refreshCategories'));
        }

        // If price was updated, check if we need to update profit data
        if (field === 'price') {
          console.log('💰 Price field updated, calling updateProfitDataAfterPriceChange');
          console.log('📊 Price update details:', { productId, newPrice: parsedValue, field });
          // Always update profit data when price changes, regardless of modal state
          await updateProfitDataAfterPriceChange(productId, parsedValue, token);
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

  // Variations management functions
  const handleVariationsClick = async (product) => {
    console.log('🎨 Opening variations modal for product:', product.name);
    console.log('🎨 Product variations:', product.variations);

    // Initialize variations if they don't exist
    const productWithVariations = {
      ...product,
      variations: product.variations || []
    };

    console.log('🎨 Initialized product with variations:', productWithVariations);

    setVariationsEditProduct(productWithVariations);
    setShowVariationsModal(true);

    // Fetch available products from the same category for variations
    try {
      const response = await fetch(`http://localhost:5000/api/products/public?category=${encodeURIComponent(product.category)}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        // Filter out the current product and only show products without variations or with different variation types
        const filtered = data.products.filter(p => p._id !== product._id);
        setAvailableProducts(filtered);
      }
    } catch (error) {
      console.error('Error fetching available products:', error);
      setAvailableProducts([]);
    }
  };

  const addVariation = () => {
    console.log('🎨 Adding new variation');
    console.log('🎨 Current variationsEditProduct:', variationsEditProduct);

    const newVariation = {
      type: 'style', // Default to 'style'
      name: 'Style', // Auto-set name based on type
      options: [
        // Add current product as the first option with empty value (user will fill it)
        {
          value: '',
          productId: null, // null indicates current product
          images: variationsEditProduct.images || [],
          price: variationsEditProduct.price || null,
          stock: variationsEditProduct.stock || null
        }
      ]
    };

    console.log('🎨 New variation to add:', newVariation);

    const updatedProduct = {
      ...variationsEditProduct,
      variations: [...(variationsEditProduct.variations || []), newVariation]
    };

    console.log('🎨 Updated product with new variation:', updatedProduct);

    setVariationsEditProduct(updatedProduct);
  };

  const updateVariation = (variationIndex, field, value) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];

    // Auto-set the name based on the type only when type changes
    if (field === 'type') {
      const nameMap = {
        'color': 'Color',
        'size': 'Size',
        'style': 'Style'
      };

      updatedVariations[variationIndex] = {
        ...updatedVariations[variationIndex],
        [field]: value,
        name: nameMap[value] || value // Auto-set name based on type
      };
    } else {
      // For other fields (including 'name'), just update the field directly
      updatedVariations[variationIndex] = {
        ...updatedVariations[variationIndex],
        [field]: value
      };
    }

    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const addVariationOption = (variationIndex) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];

    // Ensure the variation exists and has an options array
    if (!updatedVariations[variationIndex]) {
      console.error('Variation at index', variationIndex, 'does not exist');
      return;
    }

    if (!updatedVariations[variationIndex].options) {
      updatedVariations[variationIndex].options = [];
    }

    updatedVariations[variationIndex].options.push({
      value: '',
      productId: null,
      images: [],
      price: null,
      stock: null
    });

    console.log('Added variation option. Updated variations:', updatedVariations);

    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const updateVariationOption = (variationIndex, optionIndex, field, value) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];

    // Ensure the variation and option exist
    if (!updatedVariations[variationIndex]) {
      console.error('Variation at index', variationIndex, 'does not exist');
      return;
    }

    if (!updatedVariations[variationIndex].options) {
      updatedVariations[variationIndex].options = [];
    }

    if (!updatedVariations[variationIndex].options[optionIndex]) {
      console.error('Option at index', optionIndex, 'does not exist in variation', variationIndex);
      return;
    }

    updatedVariations[variationIndex].options[optionIndex] = {
      ...updatedVariations[variationIndex].options[optionIndex],
      [field]: value
    };

    console.log('Updated variation option:', { variationIndex, optionIndex, field, value });

    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const removeVariation = (variationIndex) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];
    updatedVariations.splice(variationIndex, 1);

    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const removeVariationOption = (variationIndex, optionIndex) => {
    const updatedVariations = [...(variationsEditProduct.variations || [])];
    updatedVariations[variationIndex].options.splice(optionIndex, 1);

    setVariationsEditProduct({
      ...variationsEditProduct,
      variations: updatedVariations
    });
  };

  const saveVariations = async () => {
    try {
      console.log('🎨 Saving variations for product:', variationsEditProduct._id);

      // Check if token exists
      const token = localStorage.getItem('adminToken');
      if (!token) {
        alert('❌ Authentication token not found. Please log in again.');
        return;
      }

      // Clean the variations data before sending
      const cleanedVariations = (variationsEditProduct.variations || [])
        .filter(variation => variation.type && variation.name) // Only include valid variations
        .map(variation => {
          // Ensure current product is always included as first option
          let options = variation.options || [];
          
          // Find current product option
          const currentProductOptionIndex = options.findIndex(option => 
            !option.productId || option.productId === null || option.productId === variationsEditProduct._id
          );
          
          let currentProductOption = null;
          if (currentProductOptionIndex !== -1) {
            currentProductOption = options[currentProductOptionIndex];
            // Remove it from its current position
            options.splice(currentProductOptionIndex, 1);
            console.log('🎨 Found existing current product option:', currentProductOption);
          }
          
          // If no current product option exists, create one with detected value
          if (!currentProductOption) {
            // Only use auto-detection as last resort
            const detectedValue = getCurrentProductVariationValue(variationsEditProduct, variation.type);
            currentProductOption = {
              value: detectedValue,
              productId: null,
              images: variationsEditProduct.images || [],
              price: variationsEditProduct.price || null,
              stock: variationsEditProduct.stock || null
            };
            console.log('🎨 Created new current product option with auto-detected value (fallback):', detectedValue);
          } else if (!currentProductOption.value || currentProductOption.value.trim() === '') {
            // If existing option has no value, detect it as fallback
            const detectedValue = getCurrentProductVariationValue(variationsEditProduct, variation.type);
            currentProductOption.value = detectedValue;
            console.log('🎨 Updated existing current product option with auto-detected value (fallback):', detectedValue);
          } else {
            console.log('🎨 Preserving manually entered value:', currentProductOption.value);
          }
          
          console.log('🎨 Current product option before processing:', {
            value: currentProductOption.value,
            productId: currentProductOption.productId,
            hasValue: !!(currentProductOption.value && currentProductOption.value.trim() !== '')
          });
          
          // Only include current product option if it has a value
          const finalOptions = [];
          if (currentProductOption.value && currentProductOption.value.trim() !== '') {
            finalOptions.push({
              value: currentProductOption.value.trim(),
              productId: null, // Always null for current product
              images: currentProductOption.images || [],
              price: currentProductOption.price || null,
              stock: currentProductOption.stock || null
            });
          }
          
          // Add other options (linked products)
          options
            .filter(option => option.value && option.value.trim() !== '') // Only include options with values
            .forEach(option => {
              finalOptions.push({
                value: option.value.trim(),
                productId: option.productId && option.productId !== '' && option.productId !== 'null' ? option.productId : null,
                images: option.images || [],
                price: option.price || null,
                stock: option.stock || null
              });
            });
          
          return {
            type: variation.type,
            name: variation.name,
            options: finalOptions
          };
        })
        .filter(variation => variation.options.length > 0); // Only include variations with options

      console.log('🎨 FINAL CLEANED VARIATIONS TO SAVE:', JSON.stringify(cleanedVariations, null, 2));
      
      // Specifically check current product options
      cleanedVariations.forEach((variation, index) => {
        console.log(`🎨 Variation ${index + 1} (${variation.type}):`);
        variation.options.forEach((option, optIndex) => {
          console.log(`  Option ${optIndex + 1}:`, {
            value: option.value,
            productId: option.productId,
            isCurrentProduct: option.productId === null,
            isLinkedProduct: option.productId !== null
          });
        });
      });

      console.log('🎨 Cleaned variations data:', JSON.stringify(cleanedVariations, null, 2));
      
      // Debug: Check if current product option is included
      cleanedVariations.forEach((variation, index) => {
        console.log(`🎨 Variation ${index + 1} (${variation.type}):`, variation);
        variation.options.forEach((option, optIndex) => {
          console.log(`  Option ${optIndex + 1}:`, {
            value: option.value,
            productId: option.productId,
            isCurrentProduct: option.productId === null
          });
        });
      });

      // Check if there are any linked products (productId references)
      const hasLinkedProducts = cleanedVariations.some(variation =>
        variation.options.some(option => option.productId)
      );

      if (hasLinkedProducts) {
        // Use bidirectional endpoint when there are linked products
        console.log('🔗 Found linked products, using bidirectional endpoint...');
        const bidirectionalResponse = await fetch(`http://localhost:5000/api/products/variations/bidirectional/${variationsEditProduct._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            variations: cleanedVariations,
            currentProduct: {
              id: variationsEditProduct._id,
              name: variationsEditProduct.name,
              category: variationsEditProduct.category
            }
          })
        });

        if (bidirectionalResponse.ok) {
          const result = await bidirectionalResponse.json();
          console.log('✅ Bidirectional variations result:', result);
          alert(`✅ Variations updated successfully! Updated ${result.linkedProducts} linked products.`);

          // Trigger refresh for product detail pages
          localStorage.setItem('variationsUpdated', variationsEditProduct._id);
          setTimeout(() => localStorage.removeItem('variationsUpdated'), 1000);

          setShowVariationsModal(false);
          fetchProducts(); // Refresh the products list
          return;
        } else {
          const errorData = await bidirectionalResponse.text();
          console.error('❌ Bidirectional update failed:', errorData);
          alert(`❌ Failed to save variations: ${errorData}`);
          return;
        }
      } else {
        // Use simple update when no linked products
        console.log('🔄 No linked products, using simple update...');
        const simpleResponse = await fetch(`http://localhost:5000/api/products/${variationsEditProduct._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            variations: cleanedVariations
          })
        });

        if (simpleResponse.ok) {
          const result = await simpleResponse.json();
          console.log('✅ Simple variations update successful:', result);
          alert('✅ Variations updated successfully!');

          // Trigger refresh for product detail pages
          localStorage.setItem('variationsUpdated', variationsEditProduct._id);
          setTimeout(() => localStorage.removeItem('variationsUpdated'), 1000);

          setShowVariationsModal(false);
          fetchProducts(); // Refresh the products list
          return;
        } else {
          const errorData = await simpleResponse.text();
          console.error('❌ Simple update failed:', errorData);
          alert(`❌ Failed to save variations: ${errorData}`);
          return;
        }
      }
    } catch (error) {
      console.error('Error saving variations:', error);
      if (error.message.includes('401')) {
        alert('❌ Authentication failed. Please log in again.');
      } else {
        alert('❌ Failed to save variations. Please try again.');
      }
    }
  };

  const filteredAvailableProducts = availableProducts.filter(product =>
    product.name.toLowerCase().includes(variationSearchQuery.toLowerCase())
  );

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
        
        const response = await fetch(`http://localhost:5000/api/products/category/${encodeURIComponent(categoryValue)}`, {
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

  const startProfitEditing = async (product) => {
    try {
      // Always fetch the latest product data to ensure we have up-to-date profit calculations
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`http://localhost:5000/api/products/${product._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const latestProduct = await response.json();
        product = latestProduct;
      }
    } catch (error) {
      // Error fetching latest product data, using current data
    }

    const productPrice = parseFloat(product.price) || 0;
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
        markup: calculateMarkupPercentage(platform.rrpPerUnit, productPrice) // Calculate markup with current product price
      }))
      : [
        { platform: 'RRP', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: calculateMarkupPercentage(0, productPrice) },
        { platform: 'Amazon', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: calculateMarkupPercentage(0, productPrice) },
        { platform: 'eBay', rrpPerUnit: 0, units: 200, profitFor200Units: 0, markup: calculateMarkupPercentage(0, productPrice) }
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
      rrpPlatform.markup = calculateMarkupPercentage(syncedSalesProceeds, productPrice); // Recalculate markup after sync
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
      productCost: productPrice, // Always use current product price as product cost
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
      const response = await fetch('http://localhost:5000/api/products/admin/fast', {
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
      const response = await fetch(`http://localhost:5000/api/products/${profitEditProduct._id}`, {
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
        const publicResponse = await fetch(`http://localhost:5000/api/products/public/${productData._id}`);
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
        price: parseFloat(cleanProfitEvaluation.productCost), // Update main product price to match product cost
        currency: 'GBP',
        platformComparison: cleanPlatformComparison,
        platformUnits: parseInt(selectedUnits) || 200,
        profitCalculations: cleanProfitCalculations,
        profitEvaluation: cleanProfitEvaluation,
        savings: parseFloat(autoCalculatedSavings.toFixed(2)) // Save the auto-calculated savings percentage
      };

      console.log('🔄 Sending profit update data:', updateData);
      console.log('🔑 Using token:', token ? 'Token exists' : 'No token');
      console.log('🎯 Product ID:', profitEditProduct._id);
      console.log('🌐 API URL:', `http://localhost:5000/api/products/${profitEditProduct._id}`);

      const response = await fetch(`http://localhost:5000/api/products/${profitEditProduct._id}`, {
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
        /* Responsive Styles for Admin Products Page */
        @media (max-width: 768px) {
          .admin-products {
            padding: 0 !important;
          }
          
          /* Header responsive */
          .admin-products > div:first-child {
            flex-direction: column !important;
            gap: 10px !important;
            padding: 10px !important;
          }
          
          .admin-products > div:first-child > div:last-child {
            width: 100% !important;
            flex-direction: column !important;
          }
          
          .admin-products > div:first-child button {
            width: 100% !important;
            padding: 8px 12px !important;
            font-size: 0.8rem !important;
          }
          
          /* Categories responsive */
          .filters-section {
            padding: 8px !important;
          }
          
          .filters-section > div {
            flex-wrap: wrap !important;
          }
          
          .filters-section button {
            font-size: 0.6rem !important;
            padding: 3px 6px !important;
          }
          
          /* Search and filters */
          .filters {
            flex-direction: column !important;
            gap: 8px !important;
          }
          
          .filters input,
          .filters select {
            width: 100% !important;
            font-size: 0.75rem !important;
          }
          
          /* Table responsive - hide on mobile, show cards */
          .products-table {
            display: none !important;
          }
          
          .mobile-product-cards {
            display: block !important;
          }
          
          /* Profit modal responsive */
          .profit-modal-content {
            width: 95% !important;
            max-height: 90vh !important;
            padding: 15px !important;
          }
          
          .profit-modal-content h4 {
            font-size: 0.9rem !important;
          }
          
          .profit-modal-content input {
            font-size: 0.8rem !important;
            padding: 8px !important;
          }
        }
        
        @media (min-width: 769px) and (max-width: 1024px) {
          /* Tablet styles */
          .admin-products {
            font-size: 0.8rem !important;
          }
          
          .products-table th,
          .products-table td {
            padding: 3px 6px !important;
            font-size: 0.65rem !important;
          }
        }
        
        @media (min-width: 769px) {
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
      
      <div className="admin-products" style={{ fontSize: '0.85rem', width: '100%', margin: 0, padding: 0, overflowX: 'hidden' }}>
      
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
        gap: windowWidth <= 768 ? '10px' : '0'
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
          <button
            onClick={() => setShowCategoryManagementModal(true)}
            style={{
              background: 'rgba(102, 126, 234, 0.9)',
              border: '2px solid rgba(102, 126, 234, 0.3)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(102, 126, 234, 1)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(102, 126, 234, 0.9)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>📂</span>
            Manage Categories
          </button>
          
          <button
            onClick={handleCleanupDuplicateCategories}
            style={{
              background: 'rgba(255, 193, 7, 0.9)',
              border: '2px solid rgba(255, 193, 7, 0.3)',
              color: '#212529',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 193, 7, 1)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255, 193, 7, 0.9)';
              e.target.style.transform = 'translateY(0)';
            }}
            title="Clean up duplicate categories (e.g., 'electronics' and 'Electronics')"
          >
            <span style={{ fontSize: '1.1rem' }}>🧹</span>
            Fix Duplicates
          </button>
          <button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              cacheManager.clearAll();
              // Clear all browser caches
              if ('caches' in window) {
                caches.keys().then(names => {
                  names.forEach(name => caches.delete(name));
                });
              }
              // Clear localStorage
              Object.keys(localStorage).filter(key => 
                key.includes('product') || key.includes('cache') || key.includes('evaluation')
              ).forEach(key => localStorage.removeItem(key));
              
              // Force refresh
              window.location.reload();
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '10px 15px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              e.target.style.transform = 'translateY(0)';
            }}
            title="Clear all caches and refresh data"
          >
            🔄 Force Refresh
          </button>
          {selectedProducts.size > 0 && (
            <button
              onClick={() => setShowBulkOperationsModal(true)}
              style={{
                background: 'rgba(34, 197, 94, 0.9)',
                border: '2px solid rgba(34, 197, 94, 0.3)',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(34, 197, 94, 1)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(34, 197, 94, 0.9)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>🔄</span>
              Bulk Edit ({selectedProducts.size})
            </button>
          )}
          <button
            onClick={() => navigate('/admin/approval')}
            style={{
              background: 'rgba(34, 197, 94, 0.9)',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(34, 197, 94, 1)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(34, 197, 94, 0.9)';
              e.target.style.transform = 'translateY(0)';
            }}
            title="Review and approve pending products"
          >
            <span style={{ fontSize: '1.1rem' }}>✅</span>
            Approval
          </button>
          <button
            onClick={() => navigate('/admin/products/add')}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>➕</span>
            Add New Product
          </button>
        </div>
      </div>



      <div className="filters-section" style={{ padding: '6px 8px', marginBottom: '6px', background: 'white', borderRadius: '6px' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Search by name, ID, category, brand, ASIN..."
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
          <CategoryVisibilityToggle compact={true} />
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            🏠 Dashboard
          </button>
          <button
            onClick={() => navigate('/admin/excel-import')}
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            📤 Upload
          </button>
          <button
            onClick={() => navigate('/admin/excel-manager')}
            style={{
              padding: '6px 10px',
              fontSize: '0.7rem',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
          >
            📊 Excel Files
          </button>
          <button
            onClick={async () => {
              if (confirm('Mark ALL active products as Amazon Choice? This will make all products appear on the Amazon Choice page.')) {
                try {
                  const token = localStorage.getItem('adminToken');
                  const response = await fetch('http://localhost:5000/api/products/admin/mark-all-amazons-choice', {
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
                    {(isActive || showCategoryManager) && (
                      <span style={{
                        background: isActive ? 'rgba(255,255,255,0.3)' : (productCount > 0 ? '#f3f4f6' : '#fef2f2'),
                        color: isActive ? 'white' : (productCount > 0 ? '#6b7280' : '#ef4444'),
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

          <button
            onClick={handleAmazonsChoiceFilter}
            style={{
              padding: '4px 8px',
              fontSize: '0.7rem',
              borderRadius: '4px',
              border: '1px solid #ff9800',
              background: filters.isAmazonsChoice ? '#ff9800' : 'white',
              color: filters.isAmazonsChoice ? 'white' : '#ff9800',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            🏆 Amazon's Choice
            {filters.isAmazonsChoice && (
              <span style={{
                background: 'rgba(255,255,255,0.3)',
                padding: '1px 4px',
                borderRadius: '8px',
                fontSize: '0.6rem',
                fontWeight: '700'
              }}>
                ON
              </span>
            )}
          </button>

          <div style={{
            fontSize: '0.65rem',
            color: '#6b7280',
            marginLeft: 'auto',
            padding: '4px 8px',
            background: '#fef3c7',
            borderRadius: '4px',
            border: '1px solid #fbbf24',
            fontWeight: '600'
          }}>
            💡 Click Price/Stock to edit
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: '15px'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '5px solid #f3f3f3',
            borderTop: '5px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ fontSize: '1rem', color: '#666' }}>
            Loading products{filters.category ? ` in ${categories.find(c => c.value === filters.category)?.label}` : ''}
            {filters.isAmazonsChoice ? ` (Amazon's Choice)` : ''}...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <div className="products-table-container">
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

          <div className="table-info" style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#374151', background: '#f9fafb', borderRadius: '4px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: '600' }}>
                {filters.isAmazonsChoice && filters.category
                  ? `🏆 Amazon's Choice - ${categories.find(c => c.value === filters.category)?.label}: ${totalProducts}`
                  : filters.isAmazonsChoice
                    ? `🏆 Amazon's Choice: ${totalProducts}`
                    : filters.category
                      ? `📂 ${categories.find(c => c.value === filters.category)?.label}: ${totalProducts}`
                      : `📦 Showing: ${totalProducts}`}
              </span>
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
            <span style={{ fontSize: '0.65rem', color: '#6b7280' }}>
              Page {currentPage}/{totalPages}
            </span>
          </div>

          <div className="products-table" style={{ fontSize: '0.8rem' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: '#dc2626' }}>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', width: '40px', color: 'white' }}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.size > 0 && selectedProducts.size === filteredProducts.length}
                      onChange={handleSelectAll}
                      style={{ cursor: 'pointer' }}
                      title="Select all on this page"
                    />
                  </th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white', width: '60px' }}>Image</th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}>Product</th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}>ASIN</th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}>SKU</th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}>Category</th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}>Price</th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}>Stock</th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}>Status</th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}>Seller</th>
                  <th style={{ padding: '6px 8px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product._id} style={{ borderBottom: '1px solid #e5e7eb', background: selectedProducts.has(product._id) ? '#f0f9ff' : 'transparent' }}>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product._id)}
                        onChange={() => handleSelectProduct(product._id)}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                      <SmartProductImage 
                        product={product} 
                        onClick={(e) => handleProductClick(product, e)}
                      />
                    </td>
                    <td className="product-info" style={{ padding: '4px 8px' }}>
                      <div
                        className="product-name"
                        onClick={(e) => handleProductClick(product, e)}
                        onMouseDown={(e) => {
                          // Handle middle mouse button click
                          if (e.button === 1) {
                            e.preventDefault();
                            handleProductClick(product, e);
                          }
                        }}
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
                      <div className="product-id" style={{ fontSize: '0.6rem', color: '#6b7280' }}>ID: {product._id.slice(-6)}</div>
                    </td>
                    <td
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
                    </td>
                    <td
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
                    </td>
                    <td 
                      className="category"
                      style={{ padding: '4px 8px', cursor: 'pointer', transition: 'background 0.2s' }}
                      data-cell={`${product._id}-category`}
                      onClick={() => handleCellClick(product._id, 'category', product.category)}
                      onMouseEnter={(e) => e.target.style.background = '#f0f0ff'}
                      onMouseLeave={(e) => e.target.style.background = ''}
                      title="Click to edit category"
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
                    </td>
                    <td
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
                          {formatPrice(product.price)}
                          <span style={{ marginLeft: '3px', fontSize: '0.55rem', color: '#999' }}>✏️</span>
                        </span>
                      )}
                    </td>
                    <td
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
                    </td>
                    <td style={{ padding: '4px 8px' }}>
                      {(() => {
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
                          
                          // Priority 3: Check if approved and live
                          if (product.approvalStatus === 'approved' && product.isAmazonsChoice) {
                            return {
                              icon: '✅',
                              text: 'Live',
                              color: '#059669',
                              bgColor: '#d1fae5'
                            };
                          }
                          
                          // Priority 4: Approved but not on Amazon's Choice yet
                          if (product.approvalStatus === 'approved') {
                            return {
                              icon: '✅',
                              text: 'Approved',
                              color: '#059669',
                              bgColor: '#d1fae5'
                            };
                          }
                          
                          // Fallback: Check old status field for backward compatibility
                          if (product.status === 'pending') {
                            return {
                              icon: '⏳',
                              text: 'Pending Approval',
                              color: '#f59e0b',
                              bgColor: '#fef3c7'
                            };
                          }
                          
                          if (product.status === 'inactive') {
                            return {
                              icon: '🔴',
                              text: 'Inactive',
                              color: '#dc2626',
                              bgColor: '#fee2e2'
                            };
                          }
                          
                          if (product.status === 'active') {
                            return {
                              icon: '✅',
                              text: 'Active',
                              color: '#059669',
                              bgColor: '#d1fae5'
                            };
                          }
                          
                          // Default case
                          return {
                            icon: '⚪',
                            text: 'Unknown',
                            color: '#6b7280',
                            bgColor: '#f3f4f6'
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
                            title={`Status: ${statusInfo.text}${product.isAmazonsChoice ? ' (Listed on Amazon\'s Choice)' : ''}`}
                          >
                            <span style={{ fontSize: '0.7rem' }}>{statusInfo.icon}</span>
                            <span>{statusInfo.text}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="seller-info" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>
                      {product.seller?.businessName || 'Direct'}
                    </td>
                    <td className="actions" style={{ padding: '4px 8px' }}>
                      <button
                        onClick={() => {
                          const editUrl = `/admin/products/edit/${product._id}${filters.category ? `?returnCategory=${filters.category}` : ''}`;
                          navigate(editUrl, {
                            state: { category: filters.category }
                          });
                        }}
                        className="edit-btn"
                        title="Edit Product"
                        style={{ padding: '2px 6px', fontSize: '0.65rem', marginRight: '3px' }}
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => startProfitEditing(product)}
                        className="profit-btn"
                        title="Manage Profit Details"
                        style={{ padding: '2px 6px', fontSize: '0.65rem', marginRight: '3px', background: '#ff9800', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                      >
                        💰
                      </button>
                      <button
                        onClick={() => handleVariationsClick(product)}
                        className="variations-btn"
                        title="Manage Product Variations"
                        style={{ padding: '2px 6px', fontSize: '0.65rem', marginRight: '3px', background: '#6f42c1', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                      >
                        🎨
                      </button>
                      <button
                        onClick={() => handleDelete(product._id)}
                        className="delete-btn"
                        title="Delete Product"
                        style={{ padding: '2px 6px', fontSize: '0.65rem' }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Product Cards (shown on mobile only) */}
          <div className="mobile-product-cards">
            {filteredProducts.map(product => (
              <div key={product._id} className="mobile-product-card">
                <div className="mobile-product-card-header">
                  <div 
                    style={{ flex: 1, cursor: 'pointer' }}
                    onClick={(e) => handleProductClick(product, e)}
                    onMouseDown={(e) => {
                      // Handle middle mouse button click
                      if (e.button === 1) {
                        e.preventDefault();
                        handleProductClick(product, e);
                      }
                    }}
                  >
                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: 4, color: '#007bff' }}>
                      {product.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#666' }}>
                      {product.category}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedProducts.has(product._id)}
                    onChange={() => handleProductSelection(product._id)}
                    onClick={(e) => e.stopPropagation()} // Prevent triggering product click
                    style={{ transform: 'scale(1.2)' }}
                  />
                </div>
                
                <div 
                  className="mobile-product-card-body"
                  onClick={(e) => handleProductClick(product, e)}
                  onMouseDown={(e) => {
                    // Handle middle mouse button click
                    if (e.button === 1) {
                      e.preventDefault();
                      handleProductClick(product, e);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ color: '#666', fontSize: '0.65rem' }}>Price</div>
                    <div style={{ fontWeight: 'bold', color: '#059669' }}>£{product.price}</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: '0.65rem' }}>Stock</div>
                    <div style={{ fontWeight: 'bold' }}>{product.stock}</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: '0.65rem' }}>ASIN</div>
                    <div style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>{product.asin || '-'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#666', fontSize: '0.65rem' }}>SKU</div>
                    <div style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>{product.sku || '-'}</div>
                  </div>
                </div>
                
                <div className="mobile-product-card-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering product click
                      navigate(`/admin/products/edit/${product._id}${filters.category ? `?returnCategory=${filters.category}` : ''}`);
                    }}
                    style={{ background: '#667eea', color: 'white' }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering product click
                      startProfitEditing(product);
                    }}
                    style={{ background: '#ff9800', color: 'white' }}
                  >
                    💰 Profit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering product click
                      handleDeleteProduct(product._id);
                    }}
                    style={{ background: '#ef4444', color: 'white' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '10px',
              gap: '6px',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
              marginTop: '10px'
            }}>
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  border: '1px solid #667eea',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#667eea',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                ⏮
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  border: '1px solid #667eea',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  color: currentPage === 1 ? '#9ca3af' : '#667eea',
                  borderRadius: '4px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                ←
              </button>

              <div style={{
                padding: '4px 12px',
                fontSize: '0.7rem',
                color: '#374151',
                fontWeight: '600',
                background: 'white',
                border: '1px solid #667eea',
                borderRadius: '4px',
                minWidth: '80px',
                textAlign: 'center'
              }}>
                {currentPage} / {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  border: '1px solid #667eea',
                  background: currentPage === totalPages ? '#f3f4f6' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#667eea',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                →
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  border: '1px solid #667eea',
                  background: currentPage === totalPages ? '#f3f4f6' : 'white',
                  color: currentPage === totalPages ? '#9ca3af' : '#667eea',
                  borderRadius: '4px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                ⏭
              </button>
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
                          key={`rrp-${index}-${platform.rrpPerUnit}`}
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
                          value={platform.units || 200}
                          onChange={(e) => {
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
                            
                            setProfitEditProduct({ ...profitEditProduct, platformComparison: newPlatforms });
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
                    Sales Proceeds (£)
                    <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#007bff', marginLeft: '8px' }}>
                      (Auto-populated from Amazon Platform RRP/Unit)
                    </span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    key={`sales-proceeds-${profitEditProduct.profitEvaluation.salesProceeds}`}
                    value={safeFormatNumber(profitEditProduct.profitEvaluation.salesProceeds) || ''}
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
                    title="This value is automatically populated from Amazon Platform RRP/Unit"
                  />
                  
                  {/* Debug sync button */}
                  <button
                    type="button"
                    onClick={() => {
                      const rrpPlatform = profitEditProduct.platformComparison?.find(p => p.platform === 'RRP');
                      if (rrpPlatform) {
                        console.log('🔧 Manual sync test: RRP Platform has', rrpPlatform.rrpPerUnit, 'Sales Proceeds has', profitEditProduct.profitEvaluation.salesProceeds);
                        setProfitEditProduct(prevState => ({
                          ...prevState,
                          profitEvaluation: {
                            ...prevState.profitEvaluation,
                            salesProceeds: rrpPlatform.rrpPerUnit
                          }
                        }));
                      }
                    }}
                    style={{
                      marginTop: '5px',
                      padding: '5px 10px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Sync from RRP (Debug)
                  </button>
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
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (Amazon referral fee)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getInputValue('commission', profitEditProduct.profitEvaluation.commission)}
                        onFocus={() => handleInputFocus('commission', profitEditProduct.profitEvaluation.commission)}
                        onChange={(e) => {
                          handleInputChange('commission', e.target.value);
                          const newValue = safeParseInput(e.target.value);
                          
                          setProfitEditProduct(prevState => {
                            const updatedEvaluation = {
                              ...prevState.profitEvaluation,
                              commission: newValue
                            };
                            
                            // Auto-calculate Balance Change
                            const salesProceeds = updatedEvaluation.salesProceeds || 0;
                            const commission = Math.abs(newValue);
                            const commissionTax = Math.abs(updatedEvaluation.commissionTax || 0);
                            const digitalServicesFee = Math.abs(updatedEvaluation.digitalServicesFee || 0);
                            const digitalServicesTax = Math.abs(updatedEvaluation.digitalServicesTax || 0);
                            const fbaFulfilmentFee = Math.abs(updatedEvaluation.fbaFulfilmentFee || 0);
                            const fbaFulfilmentTax = Math.abs(updatedEvaluation.fbaFulfilmentTax || 0);
                            
                            const calculatedBalance = salesProceeds - commission - commissionTax - digitalServicesFee - digitalServicesTax - fbaFulfilmentFee - fbaFulfilmentTax;
                            updatedEvaluation.balanceChange = calculatedBalance;
                            
                            // Also recalculate Net Profit (Balance Change - Product Cost)
                            const productCost = updatedEvaluation.productCost || 0;
                            updatedEvaluation.netProfit = parseFloat((calculatedBalance - productCost).toFixed(2));
                            
                            console.log(`🧮 Balance Change recalculated (Commission changed): ${calculatedBalance}`);
                            console.log(`🧮 Net Profit recalculated: ${calculatedBalance} - ${productCost} = ${updatedEvaluation.netProfit}`);
                            
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
                              profitEvaluation: updatedEvaluation,
                              profitCalculations: updatedProfitCalculations,
                              savings: parseFloat(autoCalculatedSavings.toFixed(2))
                            };
                          });
                        }}
                        onBlur={() => handleInputBlur('commission')}
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
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Commission Tax (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (VAT on commission)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getInputValue('commissionTax', profitEditProduct.profitEvaluation.commissionTax)}
                        onFocus={() => handleInputFocus('commissionTax', profitEditProduct.profitEvaluation.commissionTax)}
                        onChange={(e) => {
                          handleInputChange('commissionTax', e.target.value);
                          const newValue = safeParseInput(e.target.value);
                          
                          setProfitEditProduct(prevState => {
                            const updatedEvaluation = {
                              ...prevState.profitEvaluation,
                              commissionTax: newValue
                            };
                            
                            // Auto-calculate Balance Change
                            const salesProceeds = updatedEvaluation.salesProceeds || 0;
                            const commission = Math.abs(updatedEvaluation.commission || 0);
                            const commissionTax = Math.abs(newValue);
                            const digitalServicesFee = Math.abs(updatedEvaluation.digitalServicesFee || 0);
                            const digitalServicesTax = Math.abs(updatedEvaluation.digitalServicesTax || 0);
                            const fbaFulfilmentFee = Math.abs(updatedEvaluation.fbaFulfilmentFee || 0);
                            const fbaFulfilmentTax = Math.abs(updatedEvaluation.fbaFulfilmentTax || 0);
                            
                            const calculatedBalance = salesProceeds - commission - commissionTax - digitalServicesFee - digitalServicesTax - fbaFulfilmentFee - fbaFulfilmentTax;
                            updatedEvaluation.balanceChange = calculatedBalance;
                            
                            // Also recalculate Net Profit (Balance Change - Product Cost)
                            const productCost = updatedEvaluation.productCost || 0;
                            updatedEvaluation.netProfit = parseFloat((calculatedBalance - productCost).toFixed(2));
                            
                            console.log(`🧮 Balance Change recalculated (Commission Tax changed): ${calculatedBalance}`);
                            console.log(`🧮 Net Profit recalculated: ${calculatedBalance} - ${productCost} = ${updatedEvaluation.netProfit}`);
                            
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
                              profitEvaluation: updatedEvaluation,
                              profitCalculations: updatedProfitCalculations,
                              savings: parseFloat(autoCalculatedSavings.toFixed(2))
                            };
                          });
                        }}
                        onBlur={() => handleInputBlur('commissionTax')}
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
                        placeholder="0.00"
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
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (UK digital services tax)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getInputValue('digitalServicesFee', profitEditProduct.profitEvaluation.digitalServicesFee)}
                        onFocus={() => handleInputFocus('digitalServicesFee', profitEditProduct.profitEvaluation.digitalServicesFee)}
                        onChange={(e) => {
                          handleInputChange('digitalServicesFee', e.target.value);
                          const newValue = safeParseInput(e.target.value);
                          
                          setProfitEditProduct(prevState => {
                            const updatedEvaluation = {
                              ...prevState.profitEvaluation,
                              digitalServicesFee: newValue
                            };
                            
                            // Auto-calculate Balance Change
                            const salesProceeds = updatedEvaluation.salesProceeds || 0;
                            const commission = Math.abs(updatedEvaluation.commission || 0);
                            const commissionTax = Math.abs(updatedEvaluation.commissionTax || 0);
                            const digitalServicesFee = Math.abs(newValue);
                            const digitalServicesTax = Math.abs(updatedEvaluation.digitalServicesTax || 0);
                            const fbaFulfilmentFee = Math.abs(updatedEvaluation.fbaFulfilmentFee || 0);
                            const fbaFulfilmentTax = Math.abs(updatedEvaluation.fbaFulfilmentTax || 0);
                            
                            const calculatedBalance = salesProceeds - commission - commissionTax - digitalServicesFee - digitalServicesTax - fbaFulfilmentFee - fbaFulfilmentTax;
                            updatedEvaluation.balanceChange = calculatedBalance;
                            
                            // Also recalculate Net Profit (Balance Change - Product Cost)
                            const productCost = updatedEvaluation.productCost || 0;
                            updatedEvaluation.netProfit = parseFloat((calculatedBalance - productCost).toFixed(2));
                            
                            console.log(`🧮 Balance Change recalculated (Digital Services Fee changed): ${calculatedBalance}`);
                            console.log(`🧮 Net Profit recalculated: ${calculatedBalance} - ${productCost} = ${updatedEvaluation.netProfit}`);
                            
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
                              profitEvaluation: updatedEvaluation,
                              profitCalculations: updatedProfitCalculations,
                              savings: parseFloat(autoCalculatedSavings.toFixed(2))
                            };
                          });
                        }}
                        onBlur={() => handleInputBlur('digitalServicesFee')}
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
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        Digital Services Tax (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (VAT on digital services)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getInputValue('digitalServicesTax', profitEditProduct.profitEvaluation.digitalServicesTax)}
                        onFocus={() => handleInputFocus('digitalServicesTax', profitEditProduct.profitEvaluation.digitalServicesTax)}
                        onChange={(e) => {
                          handleInputChange('digitalServicesTax', e.target.value);
                          const newValue = safeParseInput(e.target.value);
                          
                          setProfitEditProduct(prevState => {
                            const updatedEvaluation = {
                              ...prevState.profitEvaluation,
                              digitalServicesTax: newValue
                            };
                            
                            // Auto-calculate Balance Change
                            const salesProceeds = updatedEvaluation.salesProceeds || 0;
                            const commission = Math.abs(updatedEvaluation.commission || 0);
                            const commissionTax = Math.abs(updatedEvaluation.commissionTax || 0);
                            const digitalServicesFee = Math.abs(updatedEvaluation.digitalServicesFee || 0);
                            const digitalServicesTax = Math.abs(newValue);
                            const fbaFulfilmentFee = Math.abs(updatedEvaluation.fbaFulfilmentFee || 0);
                            const fbaFulfilmentTax = Math.abs(updatedEvaluation.fbaFulfilmentTax || 0);
                            
                            const calculatedBalance = salesProceeds - commission - commissionTax - digitalServicesFee - digitalServicesTax - fbaFulfilmentFee - fbaFulfilmentTax;
                            updatedEvaluation.balanceChange = calculatedBalance;
                            
                            // Also recalculate Net Profit (Balance Change - Product Cost)
                            const productCost = updatedEvaluation.productCost || 0;
                            updatedEvaluation.netProfit = parseFloat((calculatedBalance - productCost).toFixed(2));
                            
                            console.log(`🧮 Balance Change recalculated (Digital Services Tax changed): ${calculatedBalance}`);
                            console.log(`🧮 Net Profit recalculated: ${calculatedBalance} - ${productCost} = ${updatedEvaluation.netProfit}`);
                            
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
                              profitEvaluation: updatedEvaluation,
                              profitCalculations: updatedProfitCalculations,
                              savings: parseFloat(autoCalculatedSavings.toFixed(2))
                            };
                          });
                        }}
                        onBlur={() => handleInputBlur('digitalServicesTax')}
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
                        placeholder="0.00"
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
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (Amazon FBA storage & shipping)
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
                          const newValue = safeParseInput(e.target.value);
                          
                          setProfitEditProduct(prevState => {
                            const updatedEvaluation = {
                              ...prevState.profitEvaluation,
                              fbaFulfilmentFee: newValue
                            };
                            
                            // Auto-calculate Balance Change
                            const salesProceeds = updatedEvaluation.salesProceeds || 0;
                            const commission = Math.abs(updatedEvaluation.commission || 0);
                            const commissionTax = Math.abs(updatedEvaluation.commissionTax || 0);
                            const digitalServicesFee = Math.abs(updatedEvaluation.digitalServicesFee || 0);
                            const digitalServicesTax = Math.abs(updatedEvaluation.digitalServicesTax || 0);
                            const fbaFulfilmentFee = Math.abs(newValue);
                            const fbaFulfilmentTax = Math.abs(updatedEvaluation.fbaFulfilmentTax || 0);
                            
                            const calculatedBalance = salesProceeds - commission - commissionTax - digitalServicesFee - digitalServicesTax - fbaFulfilmentFee - fbaFulfilmentTax;
                            updatedEvaluation.balanceChange = calculatedBalance;
                            
                            // Also recalculate Net Profit (Balance Change - Product Cost)
                            const productCost = updatedEvaluation.productCost || 0;
                            updatedEvaluation.netProfit = parseFloat((calculatedBalance - productCost).toFixed(2));
                            
                            console.log(`🧮 Balance Change recalculated (FBA Fulfilment Fee changed): ${calculatedBalance}`);
                            console.log(`🧮 Net Profit recalculated: ${calculatedBalance} - ${productCost} = ${updatedEvaluation.netProfit}`);
                            
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
                              profitEvaluation: updatedEvaluation,
                              profitCalculations: updatedProfitCalculations,
                              savings: parseFloat(autoCalculatedSavings.toFixed(2))
                            };
                          });
                        }}
                        onBlur={() => handleInputBlur('fbaFulfilmentFee')}
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
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        FBA Fulfilment Tax (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (VAT on FBA fees)
                        </span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={getInputValue('fbaFulfilmentTax', profitEditProduct.profitEvaluation.fbaFulfilmentTax)}
                        onFocus={() => handleInputFocus('fbaFulfilmentTax', profitEditProduct.profitEvaluation.fbaFulfilmentTax)}
                        onChange={(e) => {
                          handleInputChange('fbaFulfilmentTax', e.target.value);
                          const newValue = safeParseInput(e.target.value);
                          
                          setProfitEditProduct(prevState => {
                            const updatedEvaluation = {
                              ...prevState.profitEvaluation,
                              fbaFulfilmentTax: newValue
                            };
                            
                            // Auto-calculate Balance Change
                            const salesProceeds = updatedEvaluation.salesProceeds || 0;
                            const commission = Math.abs(updatedEvaluation.commission || 0);
                            const commissionTax = Math.abs(updatedEvaluation.commissionTax || 0);
                            const digitalServicesFee = Math.abs(updatedEvaluation.digitalServicesFee || 0);
                            const digitalServicesTax = Math.abs(updatedEvaluation.digitalServicesTax || 0);
                            const fbaFulfilmentFee = Math.abs(updatedEvaluation.fbaFulfilmentFee || 0);
                            const fbaFulfilmentTax = Math.abs(newValue);
                            
                            const calculatedBalance = salesProceeds - commission - commissionTax - digitalServicesFee - digitalServicesTax - fbaFulfilmentFee - fbaFulfilmentTax;
                            updatedEvaluation.balanceChange = calculatedBalance;
                            
                            // Also recalculate Net Profit (Balance Change - Product Cost)
                            const productCost = updatedEvaluation.productCost || 0;
                            updatedEvaluation.netProfit = parseFloat((calculatedBalance - productCost).toFixed(2));
                            
                            console.log(`🧮 Balance Change recalculated (FBA Fulfilment Tax changed): ${calculatedBalance}`);
                            console.log(`🧮 Net Profit recalculated: ${calculatedBalance} - ${productCost} = ${updatedEvaluation.netProfit}`);
                            
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
                              profitEvaluation: updatedEvaluation,
                              profitCalculations: updatedProfitCalculations,
                              savings: parseFloat(autoCalculatedSavings.toFixed(2))
                            };
                          });
                        }}
                        onBlur={() => handleInputBlur('fbaFulfilmentTax')}
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
                        placeholder="0.00"
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
                        Product Cost (£)
                        <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                          (Manually editable)
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
                        value={safeFormatNumber(profitEditProduct.profitEvaluation.productCost)}
                        onChange={(e) => {
                          const newProductCost = parseFloat(e.target.value) || 0;
                          
                          // Update the profit evaluation
                          const updatedProfitEvaluation = {
                            ...profitEditProduct.profitEvaluation,
                            productCost: newProductCost
                          };
                          
                          // Recalculate net profit with new product cost
                          const balanceChange = updatedProfitEvaluation.balanceChange || 0;
                          const newNetProfit = parseFloat((balanceChange - newProductCost).toFixed(2));
                          updatedProfitEvaluation.netProfit = newNetProfit;
                          
                          // Update the product
                          const updatedProduct = {
                            ...profitEditProduct,
                            price: newProductCost, // Also update the main product price
                            profitEvaluation: updatedProfitEvaluation
                          };
                          
                          // Update platform comparison profits and markup with new product cost
                          const updatedPlatformComparison = profitEditProduct.platformComparison.map(platform => ({
                            ...platform,
                            profitFor200Units: parseFloat((newNetProfit * (platform.units || 200)).toFixed(2)),
                            markup: calculateMarkupPercentage(platform.rrpPerUnit, newProductCost)
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
                        placeholder="Enter product cost"
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

      {/* Variations Management Modal */}
      {showVariationsModal && variationsEditProduct && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '2px solid #6f42c1',
              paddingBottom: '10px'
            }}>
              <h2 style={{
                margin: 0,
                color: '#6f42c1',
                fontSize: '1.4rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🎨 Product Variations Management
              </h2>
              <button
                onClick={() => setShowVariationsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#666',
                  padding: '5px'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9ff', borderRadius: '8px', border: '1px solid #e0e6ff' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#6f42c1', fontSize: '1.1rem' }}>
                Product: {variationsEditProduct.name}
              </h3>
              <p style={{ margin: '0 0 10px 0', color: '#666', fontSize: '0.9rem' }}>
                Category: {variationsEditProduct.category} | Price: £{variationsEditProduct.price}
              </p>

            </div>

            {/* Simple Configuration Interface */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.1rem' }}>
                1st Product (Current): {variationsEditProduct.name}
              </h3>

              <div style={{
                border: '2px solid #6f42c1',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px',
                backgroundColor: '#f8f9ff'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6f42c1', display: 'block', marginBottom: '4px' }}>
                      Type:
                    </label>
                    <select
                      value={variationsEditProduct.variations?.[0]?.type || 'style'}
                      onChange={(e) => {
                        const updatedVariations = [...(variationsEditProduct.variations || [])];
                        const typeNameMap = {
                          'style': 'Style',
                          'color': 'Color', 
                          'size': 'Size'
                        };
                        
                        if (updatedVariations.length === 0) {
                          updatedVariations.push({ 
                            type: e.target.value, 
                            name: typeNameMap[e.target.value] || e.target.value, 
                            options: [{ value: '', productId: null }] 
                          });
                        } else {
                          updatedVariations[0].type = e.target.value;
                          updatedVariations[0].name = typeNameMap[e.target.value] || e.target.value; // Auto-set name based on type
                        }
                        setVariationsEditProduct({ ...variationsEditProduct, variations: updatedVariations });
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="style">Style</option>
                      <option value="color">Color</option>
                      <option value="size">Size</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#6f42c1', display: 'block', marginBottom: '4px' }}>
                      Value for this product:
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        // Find current product option value
                        const currentOption = variationsEditProduct.variations?.[0]?.options?.find(option => 
                          option.productId === null || option.productId === variationsEditProduct._id
                        );
                        const value = currentOption?.value || '';
                        console.log('🎨 Input field value:', {
                          currentOption,
                          value,
                          allOptions: variationsEditProduct.variations?.[0]?.options
                        });
                        return value;
                      })()}
                      onChange={(e) => {
                        console.log('🎨 Current product value input changed to:', e.target.value);
                        const updatedVariations = [...(variationsEditProduct.variations || [])];
                        if (updatedVariations.length === 0) {
                          updatedVariations.push({ type: 'style', name: 'Style', options: [{ value: e.target.value, productId: null }] });
                        } else {
                          if (!updatedVariations[0].options) {
                            updatedVariations[0].options = [];
                          }
                          // Find or create current product option
                          const currentOptionIndex = updatedVariations[0].options.findIndex(option => 
                            option.productId === null || option.productId === variationsEditProduct._id
                          );
                          if (currentOptionIndex !== -1) {
                            console.log('🎨 Updating existing current product option at index:', currentOptionIndex);
                            updatedVariations[0].options[currentOptionIndex].value = e.target.value;
                          } else {
                            console.log('🎨 Creating new current product option with value:', e.target.value);
                            updatedVariations[0].options.push({ value: e.target.value, productId: null });
                          }
                        }
                        console.log('🎨 Updated variations:', updatedVariations);
                        setVariationsEditProduct({ ...variationsEditProduct, variations: updatedVariations });
                      }}
                      placeholder="e.g., Samsung, Blue, 12mm"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                {variationsEditProduct.variations?.[0]?.type && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#28a745',
                    fontWeight: '500',
                    marginTop: '8px',
                    padding: '4px 8px',
                    backgroundColor: '#d4edda',
                    borderRadius: '4px'
                  }}>
                    Will display: "{variationsEditProduct.variations[0].type.charAt(0).toUpperCase() + variationsEditProduct.variations[0].type.slice(1)}: {(() => {
                      const currentOption = variationsEditProduct.variations?.[0]?.options?.find(option => 
                        option.productId === null || option.productId === variationsEditProduct._id
                      );
                      return currentOption?.value || '[Enter value above]';
                    })()}"
                  </div>
                )}
              </div>

              {/* Linked Products Section */}
              <h3 style={{ margin: '15px 0 10px 0', color: '#333', fontSize: '1.1rem' }}>
                Linked Products (2nd, 3rd, etc.)
              </h3>

              <div style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                backgroundColor: '#f8f9fa'
              }}>
                <input
                  type="text"
                  value={variationSearchQuery}
                  onChange={(e) => setVariationSearchQuery(e.target.value)}
                  placeholder="Search products to link as variations..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    marginBottom: '15px'
                  }}
                />

                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {filteredAvailableProducts.length > 0 ? (
                    filteredAvailableProducts.slice(0, 8).map((product, index) => {
                      const isLinked = variationsEditProduct.variations?.[0]?.options?.some(option => option.productId === product._id);
                      const linkedOption = variationsEditProduct.variations?.[0]?.options?.find(option => option.productId === product._id);

                      return (
                        <div key={product._id} style={{
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          padding: '12px',
                          marginBottom: '10px',
                          backgroundColor: 'white'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px'
                          }}>
                            <div>
                              <h5 style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>
                                {index + 2}nd Product: {product.name}
                              </h5>
                              <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#666' }}>
                                Price: £{product.price}
                              </p>
                            </div>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: '#f8f9fa'
                            }}>
                              <LinkedProductPreview productId={product._id} />
                            </div>
                          </div>

                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 2fr auto',
                            gap: '10px',
                            alignItems: 'end'
                          }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>
                                Type:
                              </label>
                              <select
                                value={linkedOption?.type || 'style'}
                                onChange={(e) => {
                                  updateLinkedProductConfig(product._id, 'type', e.target.value);
                                  // Auto-set the name based on type
                                  const nameMap = { 'style': 'Style', 'color': 'Color', 'size': 'Size' };
                                  updateLinkedProductConfig(product._id, 'name', nameMap[e.target.value] || e.target.value);
                                  console.log('🎨 Updated type for', product.name, 'to', e.target.value);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <option value="style">Style</option>
                                <option value="color">Color</option>
                                <option value="size">Size</option>
                              </select>
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>
                                Value for this product:
                              </label>
                              <input
                                type="text"
                                value={linkedOption?.value || ''}
                                onChange={(e) => {
                                  updateLinkedProductConfig(product._id, 'value', e.target.value);
                                  console.log('🎨 Updated value for', product.name, 'to', e.target.value);
                                }}
                                placeholder="e.g., Samsung, Blue, 12mm"
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  border: '1px solid #ddd',
                                  borderRadius: '4px',
                                  fontSize: '0.8rem'
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>
                                Link Status:
                              </label>
                              <button
                                onClick={() => {
                                  toggleLinkedProduct(product._id);
                                  // Force re-render to update button states
                                  setTimeout(() => {
                                    console.log('🔄 Button state updated');
                                  }, 100);
                                }}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: isLinked ? '2px solid #28a745' : '2px solid #6c757d',
                                  borderRadius: '6px',
                                  fontSize: '0.8rem',
                                  fontWeight: '600',
                                  backgroundColor: isLinked ? '#28a745' : '#6c757d',
                                  color: 'white',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isLinked ? '0 2px 8px rgba(40, 167, 69, 0.3)' : '0 2px 8px rgba(108, 117, 125, 0.3)'
                                }}
                                onMouseEnter={(e) => {
                                  if (!isLinked) {
                                    e.target.style.backgroundColor = '#5a6268';
                                    e.target.style.transform = 'translateY(-1px)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isLinked) {
                                    e.target.style.backgroundColor = '#6c757d';
                                    e.target.style.transform = 'translateY(0)';
                                  }
                                }}
                              >
                                {isLinked ? (
                                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <span>✓</span>
                                    <span>Linked</span>
                                  </span>
                                ) : (
                                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                    <span>🔗</span>
                                    <span>Link</span>
                                  </span>
                                )}
                              </button>
                            </div>

                            <div>
                              {isLinked && (
                                <button
                                  onClick={() => removeLinkedProduct(product._id)}
                                  style={{
                                    padding: '6px 8px',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Preview for linked product */}
                          {isLinked && linkedOption?.type && linkedOption?.value && (
                            <div style={{
                              fontSize: '0.7rem',
                              color: '#17a2b8',
                              fontWeight: '500',
                              marginTop: '8px',
                              padding: '4px 8px',
                              backgroundColor: '#d1ecf1',
                              borderRadius: '4px'
                            }}>
                              This product will display: "{linkedOption.type.charAt(0).toUpperCase() + linkedOption.type.slice(1)}: {linkedOption.value}"
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                      No products found in this category
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #eee',
              paddingTop: '15px',
              gap: '15px'
            }}>
              <div style={{ display: 'flex', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowVariationsModal(false)}
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

                {/* Always show save button, but change based on linked products */}
                {(() => {
                  const linkedCount = variationsEditProduct.variations?.[0]?.options?.filter(opt => opt.productId)?.length || 0;
                  console.log('🔗 Linked products count:', linkedCount);

                  if (linkedCount > 0) {
                    return (
                      <>
                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('adminToken');
                              if (!token) {
                                alert('❌ Authentication token not found. Please log in again.');
                                return;
                              }

                              const cleanedVariations = (variationsEditProduct.variations || [])
                                .filter(variation => variation.type && variation.name)
                                .map(variation => ({
                                  type: variation.type,
                                  name: variation.name,
                                  options: []
                                }));

                              const response = await fetch(`http://localhost:5000/api/products/variations/independent/${variationsEditProduct._id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ variations: cleanedVariations })
                              });

                              if (response.ok) {
                                alert('✅ Current product variations saved (links removed)!');
                                setShowVariationsModal(false);
                                fetchProducts();
                              } else {
                                alert('❌ Failed to save variations.');
                              }
                            } catch (error) {
                              alert('❌ Failed to save variations. Please try again.');
                            }
                          }}
                          style={{
                            background: '#ffc107',
                            color: '#212529',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}
                        >
                          💾 Save Current Only
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('adminToken');
                              if (!token) {
                                alert('❌ Authentication token not found. Please log in again.');
                                return;
                              }

                              const cleanedVariations = (variationsEditProduct.variations || [])
                                .filter(variation => variation.type && variation.name)
                                .map(variation => {
                                  // Check if there's already a manually entered value for the current product
                                  const existingCurrentOption = variation.options?.find(option => 
                                    !option.productId || option.productId === null || option.productId === variationsEditProduct._id
                                  );
                                  
                                  // Use manually entered value if it exists, otherwise auto-detect
                                  let currentProductValue;
                                  if (existingCurrentOption && existingCurrentOption.value && existingCurrentOption.value.trim() !== '') {
                                    currentProductValue = existingCurrentOption.value;
                                    console.log('🎨 Using manually entered value:', currentProductValue);
                                  } else {
                                    currentProductValue = getCurrentProductVariationValue(variationsEditProduct, variation.type);
                                    console.log('🎨 Using auto-detected value:', currentProductValue);
                                  }
                                  
                                  const options = [];
                                  
                                  // Add current product option first (with null productId)
                                  if (currentProductValue) {
                                    options.push({
                                      value: currentProductValue,
                                      productId: null, // Current product
                                      type: variation.type,
                                      customName: '',
                                      images: variationsEditProduct.images || [],
                                      price: variationsEditProduct.price || null,
                                      stock: variationsEditProduct.stock || null
                                    });
                                  }
                                  
                                  // Add linked product options
                                  const linkedOptions = (variation.options || [])
                                    .filter(option => option.productId) // Only linked products
                                    .map(option => ({
                                      value: option.value.trim(),
                                      productId: option.productId,
                                      type: option.type || variation.type,
                                      customName: option.customName || '',
                                      images: option.images || [],
                                      price: option.price || null,
                                      stock: option.stock || null
                                    }));
                                  
                                  options.push(...linkedOptions);
                                  
                                  return {
                                    type: variation.type,
                                    name: variation.name,
                                    options: options
                                  };
                                });

                              console.log('🎨 Saving variations with linked products:', cleanedVariations);

                              // Use enhanced bidirectional endpoint to update both current and linked products
                              const response = await fetch(`http://localhost:5000/api/products/variations/enhanced/${variationsEditProduct._id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                  variations: cleanedVariations,
                                  currentProduct: {
                                    id: variationsEditProduct._id,
                                    name: variationsEditProduct.name,
                                    category: variationsEditProduct.category
                                  }
                                })
                              });

                              if (response.ok) {
                                const result = await response.json();
                                alert(`✅ All variations saved! Updated ${result.linkedProducts || 0} linked products with their own variation settings.`);
                                setShowVariationsModal(false);
                                fetchProducts();
                              } else {
                                const errorData = await response.text();
                                alert(`❌ Failed to save variations: ${errorData}`);
                              }
                            } catch (error) {
                              console.error('Error saving variations:', error);
                              alert('❌ Failed to save variations. Please try again.');
                            }
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(40, 167, 69, 0.3)'
                          }}
                        >
                          🔗 Save All + Link {linkedCount} Product{linkedCount > 1 ? 's' : ''}
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Remove all ${linkedCount} linked product(s)? This will only keep the current product configuration.`)) {
                              const updatedVariations = [...(variationsEditProduct.variations || [])];
                              if (updatedVariations[0]) {
                                updatedVariations[0].options = [];
                              }
                              setVariationsEditProduct({
                                ...variationsEditProduct,
                                variations: updatedVariations
                              });
                            }
                          }}
                          style={{
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}
                        >
                          🗑️ Remove All Links
                        </button>
                      </>
                    );
                  } else {
                    return (
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('adminToken');
                            if (!token) {
                              alert('❌ Authentication token not found. Please log in again.');
                              return;
                            }

                            const cleanedVariations = (variationsEditProduct.variations || [])
                              .filter(variation => variation.type && variation.name)
                              .map(variation => ({
                                type: variation.type,
                                name: variation.name,
                                options: []
                              }));

                            const response = await fetch(`http://localhost:5000/api/products/variations/independent/${variationsEditProduct._id}`, {
                              method: 'PUT',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                              },
                              body: JSON.stringify({ variations: cleanedVariations })
                            });

                            if (response.ok) {
                              alert('✅ Variations updated successfully!');
                              setShowVariationsModal(false);
                              fetchProducts();
                            } else {
                              alert('❌ Failed to save variations.');
                            }
                          } catch (error) {
                            alert('❌ Failed to save variations. Please try again.');
                          }
                        }}
                        style={{
                          background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          fontWeight: '600'
                        }}
                      >
                        💾 Save Independent Variations
                      </button>
                    );
                  }
                })()}
              </div>

              {/* Show linked products count with better styling */}
              {(() => {
                const linkedCount = variationsEditProduct.variations?.[0]?.options?.filter(opt => opt.productId)?.length || 0;
                if (linkedCount > 0) {
                  return (
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#28a745',
                      fontWeight: '700',
                      padding: '10px 16px',
                      backgroundColor: '#d4edda',
                      borderRadius: '6px',
                      border: '2px solid #28a745',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>🔗</span>
                      <span>{linkedCount} Product{linkedCount > 1 ? 's' : ''} Linked</span>
                    </div>
                  );
                } else {
                  return (
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#6c757d',
                      fontWeight: '600',
                      padding: '10px 16px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      border: '2px solid #dee2e6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap'
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
                      <span>No Links Yet</span>
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Auto-Fetch Profit Values Modal */}
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
      </div>
    </>
  );
};

export default AdminProducts;