import { useState, useEffect } from 'react';

const BulkOperationsModal = ({ 
  isOpen, 
  onClose, 
  selectedProducts, 
  onBulkUpdate, 
  categories = [],
  allProducts = []
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [bulkData, setBulkData] = useState({
    // Basic operations
    status: '',
    category: '',
    isAmazonsChoice: '',
    isBestSeller: '',
    isLatestDeal: '',
    showOnHome: '',
    
    // Pricing
    price: '',
    originalPrice: '',
    rrp: '',
    discount: '',
    
    // Inventory
    stock: '',
    dealUnits: '',
    
    // Product info
    brand: '',
    description: '',
    
    // Seller info
    seller: '',
    sellerInfo: '',
    
    // Profit calculations
    profitCalculations: {
      profitPerUnit: '',
      profitFor200Units: '',
      dealUnitsProfit: '',
      profitForDealUnits: '',
      monthlyProfit: '',
      yearlyProfit: ''
    },
    
    // Profit evaluation
    profitEvaluation: {
      salesProceeds: '',
      commission: '',
      commissionTax: '',
      digitalServicesFee: '',
      digitalServicesTax: '',
      fbaFulfilmentFee: '',
      fbaFulfilmentTax: '',
      balanceChange: '',
      productCost: '',
      netProfit: '',
      monthlyProfit: '',
      yearlyProfit: ''
    },
    
    // Platform comparison
    platformComparison: {
      platform: '',
      rrpPerUnit: '',
      units: '',
      profitFor200Units: '',
      markup: ''
    },
    
    // Admin fields
    isAdminProduct: '',
    rating: '',
    reviews: ''
  });

  const [loading, setLoading] = useState(false);
  const [updateMode, setUpdateMode] = useState('replace'); // 'replace', 'add', 'multiply'

  const tabs = [
    { id: 'basic', label: '📋 Basic', icon: '📋' },
    { id: 'pricing', label: '💰 Pricing', icon: '💰' },
    { id: 'inventory', label: '📦 Inventory', icon: '📦' },
    { id: 'product', label: '🏷️ Product Info', icon: '🏷️' },
    { id: 'seller', label: '👤 Seller', icon: '👤' },
    { id: 'profit', label: '📊 Profit', icon: '📊' },
    { id: 'admin', label: '⚙️ Admin', icon: '⚙️' }
  ];

  const handleInputChange = (field, value, section = null) => {
    if (section) {
      setBulkData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value
        }
      }));
    } else {
      setBulkData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedProducts.size === 0) {
      alert('⚠️ Please select at least one product to update');
      return;
    }

    // Filter out empty values
    const updateData = {};
    Object.keys(bulkData).forEach(key => {
      if (typeof bulkData[key] === 'object' && bulkData[key] !== null) {
        const sectionData = {};
        Object.keys(bulkData[key]).forEach(subKey => {
          if (bulkData[key][subKey] !== '' && bulkData[key][subKey] !== null) {
            sectionData[subKey] = bulkData[key][subKey];
          }
        });
        if (Object.keys(sectionData).length > 0) {
          updateData[key] = sectionData;
        }
      } else if (bulkData[key] !== '' && bulkData[key] !== null) {
        updateData[key] = bulkData[key];
      }
    });

    if (Object.keys(updateData).length === 0) {
      alert('⚠️ Please fill in at least one field to update');
      return;
    }

    const confirmMessage = `Update ${selectedProducts.size} selected products with the following changes?\n\n${
      Object.keys(updateData).map(key => {
        if (typeof updateData[key] === 'object') {
          return `${key}: ${Object.keys(updateData[key]).map(subKey => `${subKey}: ${updateData[key][subKey]}`).join(', ')}`;
        }
        return `${key}: ${updateData[key]}`;
      }).join('\n')
    }`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      await onBulkUpdate(Array.from(selectedProducts), updateData, updateMode);
      onClose();
      // Reset form
      setBulkData({
        status: '',
        category: '',
        isAmazonsChoice: '',
        isBestSeller: '',
        isLatestDeal: '',
        showOnHome: '',
        price: '',
        originalPrice: '',
        rrp: '',
        discount: '',
        stock: '',
        dealUnits: '',
        brand: '',
        description: '',
        seller: '',
        sellerInfo: '',
        profitCalculations: {
          profitPerUnit: '',
          profitFor200Units: '',
          dealUnitsProfit: '',
          profitForDealUnits: '',
          monthlyProfit: '',
          yearlyProfit: ''
        },
        profitEvaluation: {
          salesProceeds: '',
          commission: '',
          commissionTax: '',
          digitalServicesFee: '',
          digitalServicesTax: '',
          fbaFulfilmentFee: '',
          fbaFulfilmentTax: '',
          balanceChange: '',
          productCost: '',
          netProfit: '',
          monthlyProfit: '',
          yearlyProfit: ''
        },
        platformComparison: {
          platform: '',
          rrpPerUnit: '',
          units: '',
          profitFor200Units: '',
          markup: ''
        },
        isAdminProduct: '',
        rating: '',
        reviews: ''
      });
    } catch (error) {
      console.error('Bulk update error:', error);
      alert('❌ Failed to update products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
                🔄 Bulk Operations
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
                Update {selectedProducts.size} selected products
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '1rem'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Update Mode Selector */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            Update Mode:
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {[
              { value: 'replace', label: '🔄 Replace', desc: 'Replace existing values' },
              { value: 'add', label: '➕ Add', desc: 'Add to existing values (numbers only)' },
              { value: 'multiply', label: '✖️ Multiply', desc: 'Multiply existing values (numbers only)' }
            ].map(mode => (
              <label key={mode.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="updateMode"
                  value={mode.value}
                  checked={updateMode === mode.value}
                  onChange={(e) => setUpdateMode(e.target.value)}
                />
                <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>{mode.label}</span>
                <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>({mode.desc})</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          background: '#f9fafb',
          overflowX: 'auto'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                border: 'none',
                background: activeTab === tab.id ? 'white' : 'transparent',
                color: activeTab === tab.id ? '#667eea' : '#6b7280',
                borderBottom: activeTab === tab.id ? '2px solid #667eea' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          padding: '20px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {activeTab === 'basic' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Status
                </label>
                <select
                  value={bulkData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Keep current</option>
                  <option value="active">✅ Active</option>
                  <option value="inactive">❌ Inactive</option>
                  <option value="pending">⏳ Pending</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Category
                </label>
                <select
                  value={bulkData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Keep current</option>
                  {categories.filter(cat => cat.value !== 'all').map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Amazon's Choice
                </label>
                <select
                  value={bulkData.isAmazonsChoice}
                  onChange={(e) => handleInputChange('isAmazonsChoice', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Keep current</option>
                  <option value="true">🏆 Yes</option>
                  <option value="false">❌ No</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Best Seller
                </label>
                <select
                  value={bulkData.isBestSeller}
                  onChange={(e) => handleInputChange('isBestSeller', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Keep current</option>
                  <option value="true">⭐ Yes</option>
                  <option value="false">❌ No</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Latest Deal
                </label>
                <select
                  value={bulkData.isLatestDeal}
                  onChange={(e) => handleInputChange('isLatestDeal', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Keep current</option>
                  <option value="true">🔥 Yes</option>
                  <option value="false">❌ No</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Show on Home
                </label>
                <select
                  value={bulkData.showOnHome}
                  onChange={(e) => handleInputChange('showOnHome', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Keep current</option>
                  <option value="true">🏠 Yes</option>
                  <option value="false">❌ No</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Price (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bulkData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="Enter new price"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Original Price (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bulkData.originalPrice}
                  onChange={(e) => handleInputChange('originalPrice', e.target.value)}
                  placeholder="Enter original price"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  RRP (£)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bulkData.rrp}
                  onChange={(e) => handleInputChange('rrp', e.target.value)}
                  placeholder="Enter RRP"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Discount (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={bulkData.discount}
                  onChange={(e) => handleInputChange('discount', e.target.value)}
                  placeholder="Enter discount %"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Stock
                </label>
                <input
                  type="number"
                  value={bulkData.stock}
                  onChange={(e) => handleInputChange('stock', e.target.value)}
                  placeholder="Enter stock quantity"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Deal Units
                </label>
                <input
                  type="number"
                  value={bulkData.dealUnits}
                  onChange={(e) => handleInputChange('dealUnits', e.target.value)}
                  placeholder="Enter deal units"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'product' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Brand
                </label>
                <input
                  type="text"
                  value={bulkData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="Enter brand name"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Description
                </label>
                <textarea
                  value={bulkData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter product description"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'seller' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Seller
                </label>
                <input
                  type="text"
                  value={bulkData.seller}
                  onChange={(e) => handleInputChange('seller', e.target.value)}
                  placeholder="Enter seller name"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Seller Info
                </label>
                <textarea
                  value={bulkData.sellerInfo}
                  onChange={(e) => handleInputChange('sellerInfo', e.target.value)}
                  placeholder="Enter seller information"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'profit' && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  📊 Profit Calculations
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                      Profit Per Unit (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkData.profitCalculations.profitPerUnit}
                      onChange={(e) => handleInputChange('profitPerUnit', e.target.value, 'profitCalculations')}
                      placeholder="Enter profit per unit"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                      Monthly Profit (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkData.profitCalculations.monthlyProfit}
                      onChange={(e) => handleInputChange('monthlyProfit', e.target.value, 'profitCalculations')}
                      placeholder="Enter monthly profit"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                  💰 Profit Evaluation
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                      Sales Proceeds (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkData.profitEvaluation.salesProceeds}
                      onChange={(e) => handleInputChange('salesProceeds', e.target.value, 'profitEvaluation')}
                      placeholder="Enter sales proceeds"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                      Product Cost (£)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={bulkData.profitEvaluation.productCost}
                      onChange={(e) => handleInputChange('productCost', e.target.value, 'profitEvaluation')}
                      placeholder="Enter product cost"
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '0.8rem'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Is Admin Product
                </label>
                <select
                  value={bulkData.isAdminProduct}
                  onChange={(e) => handleInputChange('isAdminProduct', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                >
                  <option value="">Keep current</option>
                  <option value="true">✅ Yes</option>
                  <option value="false">❌ No</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Rating
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={bulkData.rating}
                  onChange={(e) => handleInputChange('rating', e.target.value)}
                  placeholder="Enter rating (0-5)"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '4px', color: '#374151' }}>
                  Reviews Count
                </label>
                <input
                  type="number"
                  value={bulkData.reviews}
                  onChange={(e) => handleInputChange('reviews', e.target.value)}
                  placeholder="Enter reviews count"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            {selectedProducts.size} products selected
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                border: '1px solid #d1d5db',
                background: 'white',
                color: '#374151',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleBulkUpdate}
              disabled={loading}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: loading ? '#9ca3af' : '#667eea',
                color: 'white',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Updating...
                </>
              ) : (
                <>
                  🔄 Update Products
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkOperationsModal;