import express from 'express';
import Product from '../models/Product.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all unique categories from products
router.get('/', async (req, res) => {
  try {
    const { includeExcel } = req.query; // Query parameter to include Excel categories
    
    // Get distinct categories from products
    const categories = await Product.distinct('category', { status: 'active' });
    
    // Filter out empty categories and sort
    const validCategories = categories
      .filter(cat => cat && cat.trim() !== '')
      .sort()
      .map(cat => ({
        value: cat,
        label: cat.charAt(0).toUpperCase() + cat.slice(1)
      }));
    
    // Excel categories that should be hidden from public header
    const excelCategories = ['UAE Products', 'UK Products', 'Amazon10'];
    
    // Add default categories that should always be available
    let defaultCategories = [
      { value: 'remote', label: 'Remote Controls' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'strap', label: 'Watch Straps' },
      { value: 'jewelry', label: 'Jewelry' },
      { value: 'party', label: 'Party Supplies' },
      { value: 'home', label: 'Home & Decor' },
      { value: 'kitchen', label: 'Kitchen' },
      { value: 'automotive', label: 'Automotive' },
      { value: 'tape', label: 'Tape' },
      { value: 'lampshade', label: 'Lampshades' },
      { value: 'clothing', label: 'Clothing' },
      { value: 'food', label: 'Food' },
      { value: 'beauty', label: 'Beauty' },
      { value: 'sports', label: 'Sports' },
      { value: 'toys', label: 'Toys' },
      { value: 'books', label: 'Books' },
      { value: 'health', label: 'Health' }
    ];
    
    // Include Excel categories only if requested (for admin use)
    if (includeExcel === 'true') {
      defaultCategories.push(
        { value: 'UAE Products', label: 'UAE Products' },
        { value: 'UK Products', label: 'UK Products' },
        { value: 'Amazon10', label: 'Amazon 10' }
      );
    }
    
    // Merge default categories with dynamic ones, avoiding duplicates
    const allCategories = [...defaultCategories];
    
    validCategories.forEach(cat => {
      // Skip Excel categories for public API unless explicitly requested
      if (!includeExcel && excelCategories.includes(cat.value)) {
        return;
      }
      
      if (!allCategories.find(existing => existing.value.toLowerCase() === cat.value.toLowerCase())) {
        allCategories.push(cat);
      }
    });
    
    res.json({
      categories: allCategories,
      total: allCategories.length,
      includeExcel: includeExcel === 'true'
    });
    
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
});

// Create a new category (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
  try {
    const { category } = req.body;
    
    if (!category || category.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    const categoryValue = category.trim().toLowerCase();
    const categoryLabel = category.trim();
    
    // Check if category already exists in products
    const existingProduct = await Product.findOne({ category: categoryValue });
    
    if (existingProduct) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    
    // Return the new category format
    res.status(201).json({
      category: {
        value: categoryValue,
        label: categoryLabel
      },
      message: 'Category format validated'
    });
    
  } catch (error) {
    console.error('Error validating category:', error);
    res.status(500).json({ message: 'Error validating category', error: error.message });
  }
});

export default router;