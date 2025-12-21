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
                const response = await fetch(`http://localhost:5000/api/products/public/${option.productId}`);
                if (response.ok) {
                  const linkedProduct = await response.json();
                  productMap[option.productId] = linkedProduct;
                }
              } catch (error) {
                console.error('Error fetching linked product:', error);
              }
            }
          }
        }
      }
      
      setLinkedProducts(productMap);
    };

    fetchLinkedProducts();
  }, [product.variations]);

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
        // Extract meaningful words from product name
        const words = product.name?.split(' ').filter(word => 
          word.length > 3 && 
          !['the', 'and', 'for', 'with', 'from'].includes(word.toLowerCase())
        ) || [];
        return words[0] || 'Default';
    }
  };

  if (!product.variations || product.variations.length === 0) {
    return null;
  }

  return (
    <div className={`product-variations ${compact ? 'compact' : ''}`}>
      {product.variations.map((variation, variationIndex) => {
        const currentValue = selectedVariations[variation.type] || detectCurrentValue(variation.type);
        
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
                  value: detectCurrentValue(variation.type),
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
                  <div className="option-value">{detectCurrentValue(variation.type)}</div>
                  {!compact && (
                    <div className="option-price">£{product.price}</div>
                  )}
                </div>
              </div>

              {/* Linked product options */}
              {variation.options?.map((option, optionIndex) => {
                if (!option.productId) return null;
                
                const linkedProduct = linkedProducts[option.productId];
                const isSelected = selectedVariations[variation.type] === option.value;
                
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
                      <div className="option-value">{option.value}</div>
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