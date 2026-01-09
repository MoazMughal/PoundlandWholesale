import { useState } from 'react';

const CategorySelectionModal = ({ 
  isOpen, 
  onClose, 
  categories, 
  onCategorySelect 
}) => {
  const [selectedCategory, setSelectedCategory] = useState(categories[0] || '');

  if (!isOpen || !categories || categories.length === 0) return null;

  const handleConfirm = () => {
    if (selectedCategory) {
      onCategorySelect(selectedCategory);
    }
    onClose();
  };

  const handleViewAll = () => {
    onCategorySelect(null); // null means view all
    onClose();
  };

  return (
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
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '1.4rem',
            fontWeight: 'bold',
            color: '#1f2937'
          }}>
            🌟 View Products on Amazon's Choice
          </h2>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#6b7280'
          }}>
            Your products were added to multiple categories. Choose which category to view:
          </p>
        </div>

        {/* Category Selection */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '8px'
          }}>
            Select Category:
          </label>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '2px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.9rem',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                📂 {category}
              </option>
            ))}
          </select>
        </div>

        {/* Category List Preview */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <h4 style={{
            margin: '0 0 8px 0',
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#374151'
          }}>
            All Categories ({categories.length}):
          </h4>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px'
          }}>
            {categories.map(category => (
              <span
                key={category}
                style={{
                  padding: '4px 8px',
                  background: selectedCategory === category ? '#10b981' : '#e5e7eb',
                  color: selectedCategory === category ? 'white' : '#374151',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: 'white',
              color: '#374151',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Cancel
          </button>
          
          <button
            onClick={handleViewAll}
            style={{
              padding: '10px 16px',
              border: '1px solid #6b7280',
              borderRadius: '6px',
              background: '#6b7280',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            📋 View All Products
          </button>
          
          <button
            onClick={handleConfirm}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            🌟 View Category
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategorySelectionModal;