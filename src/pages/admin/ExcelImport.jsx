import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

const ExcelImport = () => {
  const [excelData, setExcelData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [editedData, setEditedData] = useState({});
  const [currency, setCurrency] = useState('PKR');
  const navigate = useNavigate();

  // Currency conversion - Manual rates
  const currencyRates = { PKR: 1, USD: 0.00353, GBP: 0.00272, AED: 0.01310 };
  const currencySymbols = { PKR: 'Rs', USD: '$', GBP: '£', AED: 'د.إ' };
  
  const formatPrice = (price) => {
    const converted = price * currencyRates[currency];
    return `${currencySymbols[currency]}${converted.toFixed(2)}`;
  };

  // Load Excel file on mount
  useEffect(() => {
    loadExcelFile();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = excelData.filter(item => 
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.asin?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(excelData);
    }
  }, [searchQuery, excelData]);

  const loadExcelFile = async () => {
    try {
      setLoading(true);
      // Try to load from public folder
      const response = await fetch('/Products.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      setExcelData(data);
      setFilteredData(data);
    } catch (error) {
      console.error('Error loading Excel file:', error);
      alert('Could not load Products.xlsx. Please ensure the file is in the public folder.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setExcelData(jsonData);
        setFilteredData(jsonData);
        alert(`✅ Loaded ${jsonData.length} products from Excel`);
      } catch (error) {
        console.error('Error reading Excel:', error);
        alert('❌ Error reading Excel file');
      } finally {
        setLoading(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  const toggleSelectProduct = (index) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProducts(newSelected);
  };

  const selectAll = () => {
    if (selectedProducts.size === filteredData.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredData.map((_, idx) => idx)));
    }
  };

  const handlePriceChange = (index, newPrice) => {
    setEditedData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        price: newPrice
      }
    }));
  };

  const handleStockChange = (index, newStock) => {
    setEditedData(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        stock: newStock
      }
    }));
  };

  const getProductPrice = (item, index) => {
    return editedData[index]?.price ?? (item.price || item.Price || item['Admin Price'] || 0);
  };

  const getProductStock = (item, index) => {
    return editedData[index]?.stock ?? (item.stock || item.Stock || 100);
  };

  const addToPage = async (pageType) => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product');
      return;
    }

    const selectedItems = Array.from(selectedProducts).map(idx => ({
      item: filteredData[idx],
      index: idx
    }));
    
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const productsToAdd = selectedItems.map(({ item, index }) => ({
        name: item.title || item.Title || 'Untitled Product',
        asin: item.asin || item.ASIN || '',
        price: parseFloat(getProductPrice(item, index)),
        originalPrice: parseFloat(item.originalPrice || item['Original Price'] || 0),
        category: item.category || item.Category || 'General',
        description: item.description || item.Description || '',
        brand: item.brand || item.Brand || '',
        stock: parseInt(getProductStock(item, index)),
        rating: parseFloat(item.rating || item.Rating || 4.5),
        reviews: parseInt(item.reviews || item.Reviews || 0),
        discount: parseInt(item.discount || item.Discount || 0),
        isAmazonsChoice: pageType === 'amazons-choice',
        isBestSeller: pageType === 'best-sellers',
        isLatestDeal: pageType === 'latest-deals',
        status: 'active',
        images: []
      }));

      const response = await fetch('http://localhost:5000/api/products/bulk-import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ products: productsToAdd })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`✅ Added ${result.imported} products to ${pageType}!\nSkipped: ${result.skipped}`);
        setSelectedProducts(new Set());
      } else {
        throw new Error('Failed to add products');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ Failed to add products');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh'}}>
        <div style={{textAlign: 'center'}}>
          <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
          <div style={{fontSize: '1.2rem', fontWeight: '600'}}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{padding: '20px', fontSize: '0.85rem'}}>
      {/* Header */}
      <header style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #e5e7eb'}}>
        <div>
          <h1 style={{fontSize: '1.5rem', margin: 0, marginBottom: '5px'}}>📊 Excel Products Import</h1>
          <p style={{fontSize: '0.8rem', color: '#6b7280', margin: 0}}>Manage products from Excel file</p>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <select 
              value={currency} 
              onChange={(e) => setCurrency(e.target.value)}
              style={{padding: '4px 8px', borderRadius: '4px', border: '1px solid #667eea', fontSize: '0.75rem', fontWeight: '600', cursor: 'pointer'}}
            >
              <option value="PKR">Rs</option>
              <option value="USD">$</option>
              <option value="GBP">£</option>
            </select>
          </div>
          <label style={{padding: '6px 12px', background: '#667eea', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600'}}>
            📁 Upload Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{display: 'none'}} />
          </label>
          <button onClick={() => navigate('/admin/dashboard')} style={{padding: '6px 12px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'}}>
            ← Back
          </button>
        </div>
      </header>

      {/* Search & Actions */}
      <div style={{background: 'white', padding: '15px', borderRadius: '8px', marginBottom: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
        <div style={{display: 'flex', gap: '10px', marginBottom: '12px'}}>
          <input
            type="text"
            placeholder="🔍 Search by ASIN or Title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{flex: 1, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.85rem'}}
          />
          <button 
            onClick={selectAll}
            style={{padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer'}}
          >
            {selectedProducts.size === filteredData.length ? '☑️ Deselect All' : '☐ Select All'}
          </button>
        </div>

        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
          <button 
            onClick={() => addToPage('amazons-choice')}
            disabled={selectedProducts.size === 0}
            style={{padding: '6px 12px', background: '#ff9900', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: selectedProducts.size === 0 ? 'not-allowed' : 'pointer', opacity: selectedProducts.size === 0 ? 0.5 : 1}}
          >
            🏆 Add to Amazon's Choice ({selectedProducts.size})
          </button>
          <button 
            onClick={() => addToPage('best-sellers')}
            disabled={selectedProducts.size === 0}
            style={{padding: '6px 12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: selectedProducts.size === 0 ? 'not-allowed' : 'pointer', opacity: selectedProducts.size === 0 ? 0.5 : 1}}
          >
            🔥 Add to Best Sellers ({selectedProducts.size})
          </button>
          <button 
            onClick={() => addToPage('latest-deals')}
            disabled={selectedProducts.size === 0}
            style={{padding: '6px 12px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: selectedProducts.size === 0 ? 'not-allowed' : 'pointer', opacity: selectedProducts.size === 0 ? 0.5 : 1}}
          >
            ⚡ Add to Latest Deals ({selectedProducts.size})
          </button>
          <button 
            onClick={() => addToPage('home')}
            disabled={selectedProducts.size === 0}
            style={{padding: '6px 12px', background: '#059669', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', cursor: selectedProducts.size === 0 ? 'not-allowed' : 'pointer', opacity: selectedProducts.size === 0 ? 0.5 : 1}}
          >
            🏠 Add to Home ({selectedProducts.size})
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div style={{background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden'}}>
        <div style={{padding: '10px 15px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '0.75rem', color: '#6b7280'}}>
          Showing {filteredData.length} products
        </div>
        
        <div style={{overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem'}}>
            <thead style={{position: 'sticky', top: 0, background: '#f9fafb', zIndex: 10}}>
              <tr>
                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid #e5e7eb'}}>
                  <input 
                    type="checkbox" 
                    checked={selectedProducts.size === filteredData.length && filteredData.length > 0}
                    onChange={selectAll}
                    style={{cursor: 'pointer'}}
                  />
                </th>
                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid #e5e7eb'}}>ASIN</th>
                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid #e5e7eb'}}>Title</th>
                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid #e5e7eb'}}>Price (PKR) ✏️</th>
                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid #e5e7eb'}}>Category</th>
                <th style={{padding: '10px', textAlign: 'left', fontWeight: '600', fontSize: '0.75rem', borderBottom: '2px solid #e5e7eb'}}>Stock ✏️</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => (
                <tr 
                  key={index} 
                  style={{
                    borderBottom: '1px solid #f3f4f6',
                    background: selectedProducts.has(index) ? '#eff6ff' : 'white',
                    cursor: 'pointer'
                  }}
                  onClick={() => toggleSelectProduct(index)}
                >
                  <td style={{padding: '8px 10px'}}>
                    <input 
                      type="checkbox" 
                      checked={selectedProducts.has(index)}
                      onChange={() => toggleSelectProduct(index)}
                      style={{cursor: 'pointer'}}
                    />
                  </td>
                  <td style={{padding: '8px 10px', fontSize: '0.75rem', fontFamily: 'monospace', color: '#6b7280'}}>
                    {item.asin || item.ASIN || 'N/A'}
                  </td>
                  <td style={{padding: '8px 10px', fontSize: '0.8rem', maxWidth: '400px'}}>
                    {item.title || item.Title || 'Untitled'}
                  </td>
                  <td style={{padding: '8px 10px'}} onClick={(e) => e.stopPropagation()}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                      <span style={{fontSize: '0.75rem', color: '#6b7280'}}>Rs</span>
                      <input
                        type="number"
                        value={getProductPrice(item, index)}
                        onChange={(e) => handlePriceChange(index, e.target.value)}
                        style={{
                          width: '80px',
                          padding: '4px 6px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: '#059669'
                        }}
                      />
                    </div>
                  </td>
                  <td style={{padding: '8px 10px', fontSize: '0.75rem'}}>
                    <span style={{background: '#f3f4f6', padding: '2px 8px', borderRadius: '4px'}}>
                      {item.category || item.Category || 'General'}
                    </span>
                  </td>
                  <td style={{padding: '8px 10px'}} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number"
                      value={getProductStock(item, index)}
                      onChange={(e) => handleStockChange(index, e.target.value)}
                      style={{
                        width: '60px',
                        padding: '4px 6px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        textAlign: 'center'
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredData.length === 0 && (
        <div style={{textAlign: 'center', padding: '40px', color: '#6b7280'}}>
          <div style={{fontSize: '3rem', marginBottom: '10px'}}>📄</div>
          <h3 style={{fontSize: '1rem', marginBottom: '8px'}}>No products found</h3>
          <p style={{fontSize: '0.85rem'}}>Upload an Excel file or adjust your search</p>
        </div>
      )}
    </div>
  );
};

export default ExcelImport;
