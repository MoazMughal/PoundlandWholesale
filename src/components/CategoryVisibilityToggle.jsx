import { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';

const CategoryVisibilityToggle = ({ compact = false }) => {
  const [categories, setCategories] = useState([]);
  const [hiddenCategories, setHiddenCategories] = useState(new Set());
  const [tempHiddenCategories, setTempHiddenCategories] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [renamingCategory, setRenamingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchCategories();
    loadHiddenCategories();
  }, []);

  useEffect(() => {
    // Check if there are unsaved changes
    const originalSet = new Set([...hiddenCategories]);
    const tempSet = new Set([...tempHiddenCategories]);
    const hasUnsavedChanges = originalSet.size !== tempSet.size || 
      [...originalSet].some(item => !tempSet.has(item)) ||
      [...tempSet].some(item => !originalSet.has(item));
    setHasChanges(hasUnsavedChanges);
  }, [hiddenCategories, tempHiddenCategories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      console.log('🔍 CategoryVisibilityToggle: Fetching categories...');
      
      // Include empty categories for full admin control
      const response = await fetch(getApiUrl('products/public/categories?includeCounts=true&includeEmpty=true'));
      console.log('🔍 CategoryVisibilityToggle: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔍 CategoryVisibilityToggle: Raw data received:', data);
        
        // Filter out Excel categories and system categories
        const filteredCategories = data.categories.filter(cat => {
          const shouldExclude = ['UAE Products', 'UK Products', 'Amazon10', 'all'].includes(cat.value);
          console.log(`🔍 Category ${cat.value} (${cat.label}): shouldExclude=${shouldExclude}`);
          return !shouldExclude;
        });
        console.log('🔍 CategoryVisibilityToggle: Filtered categories:', filteredCategories);
        
        setCategories(filteredCategories);
      } else {
        console.error('🔍 CategoryVisibilityToggle: Response not OK:', response.status);
        const errorText = await response.text();
        console.error('🔍 CategoryVisibilityToggle: Error response:', errorText);
      }
    } catch (error) {
      console.error('🔍 CategoryVisibilityToggle: Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHiddenCategories = () => {
    const hidden = localStorage.getItem('hiddenCategories');
    const hiddenSet = hidden ? new Set(JSON.parse(hidden)) : new Set();
    setHiddenCategories(hiddenSet);
    setTempHiddenCategories(new Set(hiddenSet));
  };

  const saveChanges = () => {
    localStorage.setItem('hiddenCategories', JSON.stringify([...tempHiddenCategories]));
    setHiddenCategories(new Set(tempHiddenCategories));
    
    // Trigger category refresh in headers
    localStorage.setItem('categoriesUpdated', Date.now().toString());
    window.dispatchEvent(new CustomEvent('refreshCategories'));
    
    setHasChanges(false);
    alert('✅ Category visibility settings saved successfully!');
  };

  const cancelChanges = () => {
    setTempHiddenCategories(new Set(hiddenCategories));
    setHasChanges(false);
  };

  const toggleCategoryVisibility = (categoryValue) => {
    const newTempSet = new Set(tempHiddenCategories);
    if (newTempSet.has(categoryValue)) {
      newTempSet.delete(categoryValue);
    } else {
      newTempSet.add(categoryValue);
    }
    setTempHiddenCategories(newTempSet);
  };

  const showAllCategories = () => {
    setTempHiddenCategories(new Set());
  };

  const hideAllCategories = () => {
    const allCategoryValues = categories.map(cat => cat.value);
    setTempHiddenCategories(new Set(allCategoryValues));
  };

  const deleteCategory = async (categoryLabel) => {
    const category = categories.find(cat => cat.label === categoryLabel);
    const hasProducts = category && category.count > 0;
    
    const confirmMessage = hasProducts 
      ? `Are you sure you want to delete the category "${categoryLabel}"? This will remove the category from ${category.count} product(s), but the products will remain active. This action cannot be undone.`
      : `Are you sure you want to permanently delete the empty category "${categoryLabel}"? This action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      setDeletingCategory(categoryLabel);
      
      const url = hasProducts 
        ? getApiUrl(`products/admin/categories/${encodeURIComponent(categoryLabel)}?force=true`)
        : getApiUrl(`products/admin/categories/${encodeURIComponent(categoryLabel)}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        
        // Refresh categories list
        await fetchCategories();
        
        // Remove from hidden categories if it was hidden
        const categoryValue = categories.find(cat => cat.label === categoryLabel)?.value;
        if (categoryValue) {
          const newTempSet = new Set(tempHiddenCategories);
          newTempSet.delete(categoryValue);
          setTempHiddenCategories(newTempSet);
          
          const newHiddenSet = new Set(hiddenCategories);
          newHiddenSet.delete(categoryValue);
          setHiddenCategories(newHiddenSet);
          localStorage.setItem('hiddenCategories', JSON.stringify([...newHiddenSet]));
        }
        
        // Trigger category refresh in headers
        localStorage.setItem('categoriesUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refreshCategories'));
        
      } else {
        const errorData = await response.json();
        alert(`❌ ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('❌ Failed to delete category. Please try again.');
    } finally {
      setDeletingCategory(null);
    }
  };

  const startRenaming = (categoryLabel) => {
    setRenamingCategory(categoryLabel);
    setNewCategoryName(categoryLabel);
  };

  const cancelRenaming = () => {
    setRenamingCategory(null);
    setNewCategoryName('');
  };

  const renameCategory = async (oldCategoryLabel) => {
    if (!newCategoryName.trim() || newCategoryName.trim() === oldCategoryLabel) {
      cancelRenaming();
      return;
    }

    try {
      const response = await fetch(getApiUrl(`products/admin/categories/${encodeURIComponent(oldCategoryLabel)}/rename`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ newCategoryName: newCategoryName.trim() })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ ${result.message}`);
        
        // Refresh categories list
        await fetchCategories();
        
        // Update hidden categories if the renamed category was hidden
        const oldCategoryValue = categories.find(cat => cat.label === oldCategoryLabel)?.value;
        if (oldCategoryValue && hiddenCategories.has(oldCategoryValue)) {
          const newCategoryValue = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-');
          
          const newTempSet = new Set(tempHiddenCategories);
          newTempSet.delete(oldCategoryValue);
          newTempSet.add(newCategoryValue);
          setTempHiddenCategories(newTempSet);
          
          const newHiddenSet = new Set(hiddenCategories);
          newHiddenSet.delete(oldCategoryValue);
          newHiddenSet.add(newCategoryValue);
          setHiddenCategories(newHiddenSet);
          localStorage.setItem('hiddenCategories', JSON.stringify([...newHiddenSet]));
        }
        
        // Trigger category refresh in headers
        localStorage.setItem('categoriesUpdated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('refreshCategories'));
        
      } else {
        const errorData = await response.json();
        alert(`❌ ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error renaming category:', error);
      alert('❌ Failed to rename category. Please try again.');
    } finally {
      cancelRenaming();
    }
  };

  if (!showPanel) {
    return (
      <button
        onClick={() => setShowPanel(true)}
        style={{
          padding: compact ? '6px 10px' : '6px 12px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: compact ? '0.7rem' : '0.8rem',
          cursor: 'pointer',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          position: 'relative'
        }}
        title="Manage category visibility in header navigation"
      >
        👁️ Header Categories
        {hasChanges && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            background: '#ef4444',
            borderRadius: '50%'
          }} />
        )}
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      right: '20px',
      transform: 'translateY(-50%)',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      padding: '16px',
      minWidth: '300px',
      maxHeight: '70vh',
      overflowY: 'auto',
      zIndex: 1000
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#333' }}>
          👁️ Header Categories
        </h3>
        <button
          onClick={() => {
            if (hasChanges) {
              if (confirm('You have unsaved changes. Do you want to discard them?')) {
                cancelChanges();
                setShowPanel(false);
              }
            } else {
              setShowPanel(false);
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.2rem',
            cursor: 'pointer',
            color: '#666',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ marginBottom: '12px', fontSize: '0.8rem', color: '#666' }}>
        Control which categories appear in the main header navigation. Double-click category names to rename them. Categories can be deleted even if they contain products.
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={showAllCategories}
          style={{
            padding: '4px 8px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Show All
        </button>
        <button
          onClick={hideAllCategories}
          style={{
            padding: '4px 8px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          Hide All
        </button>
        <button
          onClick={fetchCategories}
          disabled={loading}
          style={{
            padding: '4px 8px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.7rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: '500',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? '⏳' : '🔄'} Refresh
        </button>
      </div>

      <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            ⏳ Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            No categories found
          </div>
        ) : (
          categories.map(category => {
            const isHidden = tempHiddenCategories.has(category.value);
            const hasProducts = category.count > 0;
            const isDeleting = deletingCategory === category.label;
            const isRenaming = renamingCategory === category.label;
            
            return (
              <div
                key={category.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  marginBottom: '4px',
                  background: isHidden ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${isHidden ? '#fecaca' : '#bbf7d0'}`,
                  borderRadius: '4px',
                  fontSize: '0.8rem'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flex: 1
                }}>
                  <span style={{ fontSize: '0.9rem' }}>
                    {isHidden ? '👁️‍🗨️' : '👁️'}
                  </span>
                  
                  {isRenaming ? (
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          renameCategory(category.label);
                        } else if (e.key === 'Escape') {
                          cancelRenaming();
                        }
                      }}
                      onBlur={() => renameCategory(category.label)}
                      autoFocus
                      style={{
                        padding: '2px 6px',
                        border: '1px solid #667eea',
                        borderRadius: '3px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        minWidth: '120px'
                      }}
                    />
                  ) : (
                    <span 
                      style={{
                        fontWeight: '500',
                        color: isHidden ? '#dc2626' : '#059669',
                        cursor: 'pointer'
                      }}
                      onDoubleClick={() => startRenaming(category.label)}
                      title="Double-click to rename"
                    >
                      {category.label}
                    </span>
                  )}
                  
                  <span style={{
                    fontSize: '0.7rem',
                    color: hasProducts ? '#666' : '#ef4444',
                    background: hasProducts ? '#f3f4f6' : '#fef2f2',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    marginLeft: '4px',
                    fontWeight: hasProducts ? 'normal' : '600'
                  }}>
                    {category.count || 0} products
                  </span>
                </div>
                
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {!isRenaming && (
                    <>
                      <button
                        onClick={() => toggleCategoryVisibility(category.value)}
                        style={{
                          padding: '4px 8px',
                          background: isHidden ? '#10b981' : '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: '500',
                          minWidth: '50px'
                        }}
                      >
                        {isHidden ? 'Show' : 'Hide'}
                      </button>
                      
                      <button
                        onClick={() => startRenaming(category.label)}
                        style={{
                          padding: '4px 8px',
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: '500',
                          minWidth: '50px'
                        }}
                        title="Rename category"
                      >
                        ✏️ Rename
                      </button>
                      
                      <button
                        onClick={() => deleteCategory(category.label)}
                        disabled={isDeleting}
                        style={{
                          padding: '4px 8px',
                          background: isDeleting ? '#9ca3af' : '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: isDeleting ? 'not-allowed' : 'pointer',
                          fontWeight: '500',
                          minWidth: '50px'
                        }}
                        title={hasProducts ? `Delete category (${category.count} products will lose their category)` : "Delete empty category permanently"}
                      >
                        {isDeleting ? '⏳' : '🗑️'}
                      </button>
                    </>
                  )}
                  
                  {isRenaming && (
                    <>
                      <button
                        onClick={() => renameCategory(category.label)}
                        style={{
                          padding: '4px 8px',
                          background: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        ✅ Save
                      </button>
                      <button
                        onClick={cancelRenaming}
                        style={{
                          padding: '4px 8px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: '500'
                        }}
                      >
                        ❌ Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Save/Cancel Buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb'
      }}>
        <button
          onClick={saveChanges}
          disabled={!hasChanges}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: hasChanges ? '#10b981' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.8rem',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            fontWeight: '600'
          }}
        >
          💾 Save Changes
        </button>
        <button
          onClick={cancelChanges}
          disabled={!hasChanges}
          style={{
            flex: 1,
            padding: '8px 16px',
            background: hasChanges ? '#ef4444' : '#9ca3af',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.8rem',
            cursor: hasChanges ? 'pointer' : 'not-allowed',
            fontWeight: '600'
          }}
        >
          ↩️ Cancel
        </button>
      </div>

      <div style={{
        marginTop: '8px',
        fontSize: '0.7rem',
        color: '#666',
        textAlign: 'center'
      }}>
        {hasChanges ? '⚠️ You have unsaved changes' : '✅ All changes saved'}
      </div>
    </div>
  );
};

export default CategoryVisibilityToggle;