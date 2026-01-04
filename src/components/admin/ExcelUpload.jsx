import { useState, useEffect } from 'react';
import '../../styles/ExcelUpload.css';

const ExcelUpload = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [editingImage, setEditingImage] = useState(null);
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    fetchPendingProducts();
    fetchCategories();
  }, [currentPage, searchQuery, categoryFilter]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/products/public/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories([
          { value: 'all', label: 'All Categories' },
          ...data.categories
        ]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 40,
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== 'all' && { category: categoryFilter })
      });

      const response = await fetch(`http://localhost:5000/api/admin/excel/pending-products?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingProducts(data.products);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching pending products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = ['.xlsx', '.xls', '.csv'];
      const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
      
      if (allowedTypes.includes(fileExtension)) {
        setFile(selectedFile);
        setUploadResult(null);
      } else {
        alert('Please select a valid Excel file (.xlsx, .xls, .csv)');
        e.target.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('adminToken');
      
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:5000/api/admin/excel/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setUploadResult(result.data);
        setFile(null);
        document.getElementById('fileInput').value = '';
        fetchPendingProducts(); // Refresh the list
        alert(`✅ Successfully uploaded ${result.data.inserted} products! ${result.data.duplicates} duplicates were skipped.`);
      } else {
        alert(`❌ Upload failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Upload failed. Please try again.');
    } finally {
      setUploading(false);
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
    if (selectedProducts.size === pendingProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(pendingProducts.map(p => p._id)));
    }
  };

  const handleListProducts = async () => {
    if (selectedProducts.size === 0) {
      alert('Please select at least one product to list');
      return;
    }

    if (!confirm(`Are you sure you want to list ${selectedProducts.size} selected products? They will appear on Amazon's Choice page.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch('http://localhost:5000/api/admin/excel/list-products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productIds: Array.from(selectedProducts)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        alert(`✅ Successfully listed ${result.data.listed} products!`);
        setSelectedProducts(new Set());
        fetchPendingProducts();
      } else {
        alert(`❌ Failed to list products: ${result.message}`);
      }
    } catch (error) {
      console.error('Error listing products:', error);
      a