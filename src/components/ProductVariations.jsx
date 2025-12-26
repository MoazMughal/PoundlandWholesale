import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils/imageImports';
import '../styles/ProductVariations.css';

// Component to fetch and display linked product image
const LinkedProductImage = ({ productId, size = '40px' }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductImage = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/products/public/${productId}`);
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
        width: size,
        height: size,
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
        width: size,
        height: size,
        objectFit: 'contain',
        borderRadius: '4px'
      }}
      onError={(e) => {
        e.target.src = '/placeholder-image.jpg';
      }}
    />
  );
};

const ProductVariations = ({ 
  product, 
  selectedVariations, 
  onVariationChange, 
  onProductChange,
  showImages = true,
  compact = false 
}) => {
  const navigate = useNavigate();
  const [linkedProducts, setLinkedProducts] = useState({});

  // Fetch linked product details
  useEffect(() => {
    const fetchLinkedProducts = async () => {
      
      const productMap = {};
      
      if (product.variations) {
        for (const variation of product.variations) {
          for (const option of variation.options || []) {
            if (option.productId && !productMap[option.productId]) {
              try {
                // Add cache busting to ensure fresh data
                const cacheBuster = new Date().getTime();
                const response = await fetch(`http://localhost:5000/api/products/public/${option.productId}?_=${cacheBuster}`, {
                  cache: 'no-cache',
                  headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                  }
                });
                if (response.ok) {
                  const linkedProduct = await response.json();
                  productMap[option.productId] = linkedProduct;
                  
                }
              } catch (error) {
                console.error('❌ ProductVariations: Error fetching linked product:', error);
              }
            }
          }
        }
      }

      setLinkedProducts(productMap);
    };

    fetchLinkedProducts();
  }, [product.variations, product.id]); // Add product.id as dependency to refetch when product changes

  // Handle variation selection
  const handleVariationSelect = (variationType, option) => {
    const newSelections = {
      ...selectedVariations,
      [variationType]: option.value
    };

    // Update selected variations
    onVariationChange(newSelections);

    // If this option has a linked product, navigate to it
    if (option.productId && onProductChange) {
      onProductChange(option.productId);
    }
  };

  // Auto-detect current product's variation value
  const detectCurrentValue = (variationType) => {
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
        // Check for colors first
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

  if (!product.variations || product.variations.length === 0) {
    console.log('🎨 No variations found for product:', product.name);
    return null;
  }

  console.log('🎨 ProductVariations component loaded:', {
    productId: product._id || product.id,
    productName: product.name,
    hasVariations: !!product.variations,
    variationsCount: product.variations?.length || 0,
    variations: product.variations
  });

  return (
    <div className={`product-variations ${compact ? 'compact' : ''}`}>
      {product.variations.map((variation, variationIndex) => {
        // Filter out invalid options (options without productId that don't exist)
        const validOptions = variation.options?.filter(option => {
          if (!option.productId) return false; // Skip options without productId
          return linkedProducts[option.productId]; // Only show if linked product exists
        }) || [];

        // Don't render variation if no valid options
        if (validOptions.length === 0) {
          
          return null;
        }

        // Check if current product has a saved option in this variation
        // Look for options with null productId (current product) or matching product ID
        let currentProductOption = variation.options?.find(option => {
          // Check for null, undefined, empty string, or matching product ID
          return !option.productId || 
                 option.productId === null || 
                 option.productId === '' ||
                 option.productId === product._id || 
                 option.productId === product.id;
        });
        
        // If no current product option exists, check if any option might be for current product
        if (!currentProductOption && variation.options?.length > 0) {
          // Try to find an option that might be the current product
          currentProductOption = variation.options.find(option => 
            !option.productId || 
            option.productId === product._id || 
            option.productId === product.id ||
            option.productId === ''
          );
          
          // If still not found, use the first option as fallback
          if (!currentProductOption) {
            currentProductOption = variation.options[0];
          }
        }
        
        console.log('🎨 ProductVariations Debug:', {
          productId: product._id || product.id,
          productName: product.name,
          variationType: variation.type,
          variationName: variation.name,
          totalOptions: variation.options?.length || 0,
          allOptions: variation.options?.map(opt => ({ 
            value: opt.value, 
            productId: opt.productId,
            isCurrentProduct: !opt.productId || opt.productId === product._id || opt.productId === product.id
          })),
          foundCurrentOption: !!currentProductOption,
          currentOptionValue: currentProductOption?.value,
          currentOptionProductId: currentProductOption?.productId
        });
        
        // Use saved value if exists, otherwise try to extract from product name, otherwise default
        let currentValue = selectedVariations[variation.type] || currentProductOption?.value;
        
        console.log('🎨 Current value determination:', {
          selectedVariations: selectedVariations[variation.type],
          currentProductOptionValue: currentProductOption?.value,
          initialCurrentValue: currentValue
        });
        
        // Only use product name extraction if NO saved value exists at all
        if (!currentValue || currentValue.trim() === '') {
          const productName = product.name?.toLowerCase() || '';
          console.log('🎨 No saved value found, trying to extract from product name:', productName);
          
          if (variation.type === 'style') {
            if (productName.includes('samsung')) currentValue = 'Samsung';
            else if (productName.includes('lg')) currentValue = 'LG';
            else if (productName.includes('sony')) currentValue = 'Sony';
            else if (productName.includes('panasonic')) currentValue = 'Panasonic';
            else if (productName.includes('philips')) currentValue = 'Philips';
            else if (productName.includes('hitachi')) currentValue = 'Hitachi';
            else if (productName.includes('toshiba')) currentValue = 'Toshiba';
            else if (productName.includes('sharp')) currentValue = 'Sharp';
            else currentValue = 'Default';
          } else if (variation.type === 'color') {
            if (productName.includes('black')) currentValue = 'Black';
            else if (productName.includes('white')) currentValue = 'White';
            else if (productName.includes('blue')) currentValue = 'Blue';
            else if (productName.includes('red')) currentValue = 'Red';
            else if (productName.includes('silver')) currentValue = 'Silver';
            else if (productName.includes('gold')) currentValue = 'Gold';
            else currentValue = 'Default';
          } else {
            currentValue = 'Default';
          }
          
          console.log('🎨 Extracted value from product name:', currentValue);
        } else {
          console.log('🎨 Using saved value:', currentValue);
        }
        
        return (
          <div key={variationIndex} className="variation-group">
            <div className="variation-label">
              <span className="variation-name">{variation.name}:</span>
              <span className="variation-value">{currentValue}</span>
            </div>
            
            <div className="variation-options">
              {/* Current product option */}
              <div
                className={`variation-option current ${!selectedVariations[variation.type] ? 'selected' : ''}`}
                onClick={() => handleVariationSelect(variation.type, { 
                  value: currentValue,
                  productId: null 
                })}
              >
                {showImages && (
                  <div className="option-image">
                    <img 
                      src={getImageUrl(product.images?.[0] || product.image)} 
                      alt={product.name}
                      onError={(e) => {
                        e.target.src = '/placeholder-image.jpg';
                      }}
                    />
                  </div>
                )}
                <div className="option-content">
                  <div className="option-value">{currentValue}</div>
                  {!compact && (
                    <div className="option-price">£{product.price}</div>
                  )}
                </div>
              </div>

              {/* Linked product options - only show valid ones */}
              {validOptions.map((option, optionIndex) => {
                const linkedProduct = linkedProducts[option.productId];
                const isSelected = selectedVariations[variation.type] === option.value;

                // Just use the option value directly without auto-detection
                const displayValue = option.value;

                return (
                  <div
                    key={optionIndex}
                    className={`variation-option linked ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleVariationSelect(variation.type, option)}
                  >
                    {showImages && (
                      <div className="option-image">
                        <LinkedProductImage 
                          productId={option.productId} 
                          size={compact ? '30px' : '40px'} 
                        />
                      </div>
                    )}
                    <div className="option-content">
                      <div className="option-value">{displayValue}</div>
                      {!compact && linkedProduct && (
                        <div className="option-price">£{linkedProduct.price}</div>
                      )}
                      {linkedProduct && (
                        <div className="option-link-indicator">
                          <span>🔗</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductVariations;