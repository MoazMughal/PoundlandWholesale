import express from 'express';
import multer from 'multer';
import Product from '../models/Product.js';
import ExcelProduct from '../models/ExcelProduct.js';
import Seller from '../models/Seller.js';
import { authenticateAdmin, authenticateSeller } from '../middleware/auth.js';
import { optimizeProductImages, mobileImageOptimization, addResponsiveImages } from '../middleware/imageOptimization.js';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinary.js';
import productCache from '../utils/productCache.js';
import { fallbackProducts } from '../data/fallbackProducts.js';
import { amazonChoiceFallbackProducts, getFilteredFallbackProducts } from '../data/amazonChoiceFallback.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for product image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads/temp/products');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}_${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit per image
  },
  fileFilter: (req, file, cb) => {
    // Accept image files only
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Helper function to sync Excel products when main product is deleted
async function syncExcelProductsOnDelete(mainProductId) {
  try {
    const updateResult = await ExcelProduct.updateMany(
      { mainProductId: mainProductId },
      {
        $set: {
          isConverted: false,
          status: 'pending',
          convertedAt: null
        },
        $unset: {
          mainProductId: 1
        }
      }
    );
    
    if (updateResult.modifiedCount > 0) {
      // Updated Excel products after main product deletion
    }
    
    return updateResult;
  } catch (error) {
    console.error('âš ï¸ Failed to update Excel products after main product deletion:', error);
    throw error;
  }
}

// Helper function to get products with fallback mechanism
async function getProductsWithFallback(query = {}, options = {}) {
  try {
    // Try to get from database first
    
    const dbProducts = await Product.find(query)
      .populate(options.populate || '')
      .sort(options.sort || {})
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .select(options.select || '')
      .maxTimeMS(5000) // 5 second timeout
      .lean();
    
    // Update cache with fresh data
    if (dbProducts.length > 0) {
      const allProducts = await Product.find({ status: 'active' }).lean().maxTimeMS(10000);
      productCache.updateProducts(allProducts);
    }
    
    return {
      products: dbProducts,
      source: 'database',
      total: await Product.countDocuments(query).maxTimeMS(3000)
    };
    
  } catch (error) {
    console.error('âŒ Database query failed:', error.message);
    
    // Try cache first
    if (productCache.isFresh()) {
      // Only show cache usage in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('ðŸ“¦ Using fresh cache data');
      }
      const cacheResult = productCache.getProducts({
        ...query,
        page: options.page,
        limit: options.limit
      });
      return {
        ...cacheResult,
        source: 'cache',
        cacheAge: productCache.getCacheAge()
      };
    }
    
    // Try stale cache
    const cacheResult = productCache.getProducts({
      ...query,
      page: options.page,
      limit: options.limit
    });
    
    if (cacheResult.products.length > 0) {
      return {
        ...cacheResult,
        source: 'stale_cache',
        cacheAge: productCache.getCacheAge()
      };
    }
    
    // Quick fallback with 20 products
    
    // Generate 50 diverse quick fallback products
    const fallbackNames = [
      'Smart Watch Fitness', 'Bluetooth Headphones', 'Laptop Stand Aluminum', 'Phone Case Clear',
      'Cotton T-Shirt Premium', 'Jeans Slim Fit', 'Sneakers Comfortable', 'Backpack Travel',
      'Coffee Maker Automatic', 'Blender High Speed', 'Air Purifier HEPA', 'Desk Lamp LED',
      'Notebook Hardcover', 'Pen Set Luxury', 'Calculator Scientific', 'Bookmark Set Metal',
      'Yoga Block Foam', 'Jump Rope Speed', 'Protein Shaker Bottle', 'Exercise Mat Thick',
      'Wireless Mouse Ergonomic', 'Keyboard Compact', 'Monitor Stand Wood', 'Cable Organizer',
      'Hoodie Zip Up', 'Scarf Wool Warm', 'Hat Beanie Knit', 'Gloves Winter Touch',
      'Vase Ceramic Modern', 'Mirror Wall Round', 'Cushion Throw Soft', 'Rug Area Small',
      'Cookbook Healthy Recipes', 'Magazine Subscription', 'Puzzle 500 Piece', 'Board Game Family',
      'Tennis Ball Set', 'Basketball Indoor', 'Soccer Ball Official', 'Volleyball Beach',
      'Tablet Case Protective', 'Screen Protector Glass', 'Charger Cable Fast', 'Power Strip Surge',
      'Sunglasses UV Protection', 'Watch Band Leather', 'Earrings Stud Silver', 'Necklace Chain Gold',
      'Mug Travel Insulated', 'Plate Set Dinner', 'Bowl Mixing Steel', 'Spoon Set Serving'
    ];

    const quickFallback = Array.from({ length: 50 }, (_, i) => ({
      _id: `fallback${i.toString().padStart(2, '0')}`,
      name: fallbackNames[i] || `Quality Product ${i + 1}`,
      description: `Quality ${fallbackNames[i]?.toLowerCase() || 'product'} with great features and competitive pricing.`,
      price: Math.floor(Math.random() * 3000) + 500,
      originalPrice: Math.floor(Math.random() * 4000) + 1000,
      discount: Math.floor(Math.random() * 40) + 10,
      category: query.category || ['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports'][i % 5],
      brand: ['QualityMax', 'PremiumChoice', 'ValuePlus', 'TopBrand', 'BestSelect'][i % 5],
      images: [`https://via.placeholder.com/300x300?text=${encodeURIComponent(fallbackNames[i]?.split(' ')[0] || 'Product')}`],
      rating: 4.0 + Math.random(),
      reviews: Math.floor(Math.random() * 150) + 25,
      stock: Math.floor(Math.random() * 80) + 5,
      isAmazonsChoice: query.isAmazonsChoice || Math.random() > 0.6,
      isBestSeller: Math.random() > 0.7
    }));
    
    return {
      products: quickFallback.slice(0, options.limit || 50),
      total: 50,
      totalPages: Math.ceil(50 / (options.limit || 50)),
      currentPage: options.page || 1,
      source: 'quick_fallback'
    };
  }
}

// Cache for fast endpoint - Clear cache to force refresh
let fastProductsCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (shorter cache for testing)

// Cache version endpoint for client-side cache validation (public)
router.get('/public/cache-version', async (req, res) => {
  res.json({ 
    version: cacheTimestamp || Date.now(),
    cacheActive: !!fastProductsCache 
  });
});

// Debug endpoint to check Amazon Choice products count (public)
router.get('/public/debug/amazons-choice-count', async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments({ 
      $and: [
        {
          $or: [{ status: 'active' }, { status: { $exists: false } }]
        },
        { status: { $ne: 'inactive' } }
      ]
    });
    
    const amazonsChoiceProducts = await Product.countDocuments({ 
      $and: [
        {
          $or: [{ status: 'active' }, { status: { $exists: false } }]
        },
        { status: { $ne: 'inactive' } }
      ],
      isAmazonsChoice: true,
      approvalStatus: 'approved' // Only count approved products
    });
    
    const categoryCounts = await Product.aggregate([
      { 
        $match: { 
          $and: [
            {
              $or: [{ status: 'active' }, { status: { $exists: false } }]
            },
            { status: { $ne: 'inactive' } }
          ],
          isAmazonsChoice: true,
          approvalStatus: 'approved' // Only count approved products
        } 
      },
      { 
        $group: { 
          _id: '$category', 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      totalProducts,
      amazonsChoiceProducts,
      categoryCounts,
      percentage: totalProducts > 0 ? ((amazonsChoiceProducts / totalProducts) * 100).toFixed(2) : 0
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unique categories from database (public)
router.get('/public/categories', async (req, res) => {
  try {
    const { includeCounts, includeExcel, includeEmpty, deduplicate } = req.query;
    
    // Get unique categories from main products - ONLY from active products for public display
    const categoryFilter = includeEmpty === 'true' 
      ? { category: { $exists: true, $ne: null, $ne: '' } } // All products (admin use)
      : { 
          status: 'active', 
          approvalStatus: 'approved', // Only approved products
          category: { $exists: true, $ne: null, $ne: '' } 
        }; // Only active, approved products for public
    
    const mainCategories = await Product.distinct('category', categoryFilter);
    
    // For public display, don't include Excel categories unless specifically requested
    // Excel categories should only be included for admin use
    let excelCategories = [];
    if (includeExcel === 'true' && includeEmpty === 'true') {
      // Only include Excel categories for admin use (when includeEmpty is true)
      try {
        const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
        excelCategories = await ExcelProduct.distinct('category', {
          category: { $exists: true, $ne: null, $ne: '' }
        });
      } catch (excelError) {
        // Excel model not available - continue with main categories only
      }
    }
    
    // Combine categories - for public use, prioritize main categories
    let categories = includeEmpty === 'true' 
      ? [...new Set([...mainCategories, ...excelCategories])] // Admin: include all
      : [...new Set(mainCategories)]; // Public: only active product categories
    
    // Deduplicate case-insensitive if requested
    if (deduplicate === 'true') {
      const deduplicatedCategories = [];
      const seenCategories = new Map(); // Use Map to track both lowercase and original
      
      categories.forEach(cat => {
        let lowerCat = cat.toLowerCase();
        let normalizedCat = cat;
        
        // Special handling for party accessories variations
        if (lowerCat.includes('party') && (lowerCat.includes('accessor') || lowerCat.includes('access'))) {
          lowerCat = 'party accessories';
          normalizedCat = 'Party Accessories'; // Always use proper capitalization
        }
        
        if (!seenCategories.has(lowerCat)) {
          seenCategories.set(lowerCat, normalizedCat);
          deduplicatedCategories.push(normalizedCat);
        } else {
          // If we find a duplicate, prefer the one with better capitalization
          const existing = seenCategories.get(lowerCat);
          // Prefer the one with more proper capitalization (more uppercase letters in right places)
          if (normalizedCat.match(/^[A-Z]/) && normalizedCat.includes(' ') && normalizedCat.split(' ').every(word => word.match(/^[A-Z]/))) {
            // Replace with better capitalized version
            const index = deduplicatedCategories.indexOf(existing);
            if (index !== -1) {
              deduplicatedCategories[index] = normalizedCat;
              seenCategories.set(lowerCat, normalizedCat);
            }
          }
        }
      });
      
      categories = deduplicatedCategories;
    }
    
    let formattedCategories;
    
    if (includeCounts === 'true') {
      // Get product counts for each category using exact category names (not transformed)
      // Only count active, approved products for public display
      const countMatchCriteria = includeEmpty === 'true' 
        ? { // Admin view: count all products
            category: { $exists: true, $ne: null, $ne: '' }
          }
        : { // Public view: only active, approved products
            $and: [
              {
                $or: [
                  { status: 'active' },
                  { status: { $exists: false } }
                ]
              },
              { status: { $ne: 'inactive' } }
            ],
            approvalStatus: 'approved',
            category: { $exists: true, $ne: null, $ne: '' }
          };
      
      const categoryCounts = await Product.aggregate([
        {
          $match: countMatchCriteria
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]).exec();
      
      const countMap = {};
      categoryCounts.forEach(item => {
        countMap[item._id] = item.count;
      });
      
      // If deduplicating, we need to sum counts for similar categories
      if (deduplicate === 'true') {
        const deduplicatedCountMap = {};
        categories.forEach(cat => {
          let totalCount = 0;
          // Sum counts for all variations of this category
          Object.keys(countMap).forEach(dbCat => {
            if (dbCat.toLowerCase() === cat.toLowerCase()) {
              totalCount += countMap[dbCat];
            }
          });
          deduplicatedCountMap[cat] = totalCount;
        });
        Object.assign(countMap, deduplicatedCountMap);
      }
      
      // Category counts from database
      
      // Get total count for "All" category
      const totalCountCriteria = includeEmpty === 'true' 
        ? {} // Admin: count all products
        : { status: 'active', approvalStatus: 'approved' }; // Public: only active, approved
      
      const totalCount = await Product.countDocuments(totalCountCriteria);
      
      formattedCategories = [
        { value: 'all', label: 'All', count: totalCount },
        ...categories.map(cat => ({
          value: cat.toLowerCase().replace(/\s+/g, '-'), // Keep original logic but ensure proper URL encoding
          label: cat,
          count: countMap[cat] || 0 // Use exact category name for count lookup
        }))
      ];
      
      // Final formatted categories with counts
    } else {
      // Original format without counts
      formattedCategories = [
        { value: 'all', label: 'All' },
        ...categories.map(cat => ({
          value: cat.toLowerCase().replace(/\s+/g, '-'), // Keep original logic but ensure proper URL encoding
          label: cat
        }))
      ];
    }
    
    res.json({
      categories: formattedCategories,
      success: true
    });
    
  } catch (error) {
    console.error('âŒ Error fetching categories:', error);
    
    // Fallback categories
    const fallbackCategories = [
      { value: 'all', label: 'All' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'clothing', label: 'Clothing' },
      { value: 'home-garden', label: 'Home & Garden' },
      { value: 'books', label: 'Books' },
      { value: 'sports', label: 'Sports' }
    ];
    
    res.json({
      categories: fallbackCategories,
      source: 'fallback',
      success: false,
      error: error.message
    });
  }
});

// ============================================
// CATEGORY HIERARCHY ROUTES (subcategory dropdowns)
// ============================================

// Public: get all hierarchy entries (for navbar dropdowns)
router.get('/public/category-hierarchy', async (req, res) => {
  try {
    const CategoryHierarchy = (await import('../models/CategoryHierarchy.js')).default;
    const hierarchy = await CategoryHierarchy.find().lean();
    res.json({ success: true, hierarchy });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: upsert hierarchy for a parent category
router.put('/admin/category-hierarchy/:parent', authenticateAdmin, async (req, res) => {
  try {
    const { parent } = req.params;
    const { children } = req.body; // array of child category strings
    const CategoryHierarchy = (await import('../models/CategoryHierarchy.js')).default;
    const doc = await CategoryHierarchy.findOneAndUpdate(
      { parent: parent.trim() },
      { parent: parent.trim(), children: (children || []).map(c => c.trim()).filter(Boolean) },
      { upsert: true, new: true }
    );
    res.json({ success: true, hierarchy: doc });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: delete hierarchy entry for a parent
router.delete('/admin/category-hierarchy/:parent', authenticateAdmin, async (req, res) => {
  try {
    const CategoryHierarchy = (await import('../models/CategoryHierarchy.js')).default;
    await CategoryHierarchy.deleteOne({ parent: req.params.parent });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get Amazon's Choice product counts by category (admin only)
router.get('/admin/amazons-choice-counts', authenticateAdmin, async (req, res) => {
  try {
    // Get counts for Amazon's Choice products by category
    const amazonsChoiceCounts = await Product.aggregate([
      {
        $match: {
          isAmazonsChoice: true,
          approvalStatus: 'approved',
          status: 'active',
          category: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]).exec();

    // Convert to object map
    const counts = {};
    amazonsChoiceCounts.forEach(item => {
      counts[item._id] = item.count;
    });

    // Get total Amazon's Choice count
    const totalAmazonsChoice = await Product.countDocuments({
      isAmazonsChoice: true,
      approvalStatus: 'approved',
      status: 'active'
    });

    counts['All'] = totalAmazonsChoice;

    res.json({
      success: true,
      counts: counts,
      total: totalAmazonsChoice
    });

  } catch (error) {
    console.error('Error fetching Amazon\'s Choice counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Amazon\'s Choice counts',
      error: error.message
    });
  }
});

// Create new category (admin only)
router.post('/public/categories', authenticateAdmin, async (req, res) => {
  try {
    const { category } = req.body;
    
    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    // Normalize the category name to prevent duplicates
    const normalizedCategoryName = normalizeCategoryName(category.trim());
    
    // Check if category already exists in ACTIVE main products only
    // (Don't check Excel products or inactive products)
    const existingActiveCategory = await Product.findOne({ 
      category: { $regex: new RegExp(`^${normalizedCategoryName}$`, 'i') },
      status: 'active'
    });
    
    if (existingActiveCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category already exists in active products'
      });
    }
    
    // Check if there are any Excel products with this category that could be converted
    let hasExcelProducts = false;
    try {
      const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
      const excelProductsCount = await ExcelProduct.countDocuments({
        category: { $regex: new RegExp(`^${normalizedCategoryName}$`, 'i') }
      });
      hasExcelProducts = excelProductsCount > 0;
      
      if (hasExcelProducts) {
        console.log(`â„¹ï¸ Found ${excelProductsCount} Excel products with category "${normalizedCategoryName}"`);
        // Allow creation - Excel products can use this category
        return res.json({
          success: true,
          message: `Category "${normalizedCategoryName}" is available (found in Excel products)`,
          category: {
            value: normalizedCategoryName.toLowerCase().replace(/\s+/g, '-'),
            label: normalizedCategoryName
          },
          existsInExcel: true
        });
      }
    } catch (excelError) {
      console.log('â„¹ï¸ Excel model not available or no Excel products found');
    }
    
    // Create a placeholder product to establish the category
    const placeholderProduct = new Product({
      name: `${normalizedCategoryName} - Category Placeholder`,
      price: 0,
      category: normalizedCategoryName,
      brand: 'System',
      description: 'This is a placeholder product to establish the category. You can delete this later.',
      stock: 0,
      status: 'inactive',
      isAmazonsChoice: false,
      currency: 'GBP',
      images: []
    });
    
    await placeholderProduct.save();
    
    // Return the new category in the expected format
    const newCategory = {
      value: normalizedCategoryName.toLowerCase().replace(/\s+/g, '-'),
      label: normalizedCategoryName
    };
    
    console.log(`âœ… Category "${normalizedCategoryName}" created successfully with placeholder product`);
    
    res.json({
      success: true,
      message: `Category "${normalizedCategoryName}" created successfully`,
      category: newCategory
    });
    
  } catch (error) {
    console.error('âŒ Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
});

// Admin endpoint to rename a category (updates all products and Excel products)
router.put('/admin/categories/:categoryName/rename', authenticateAdmin, async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { newCategoryName } = req.body;
    
    if (!newCategoryName || !newCategoryName.trim()) {
      return res.status(400).json({ 
        message: 'New category name is required',
        success: false
      });
    }
    
    const trimmedNewName = newCategoryName.trim();
    
    console.log(`ðŸ·ï¸ Renaming category "${categoryName}" to "${trimmedNewName}"`);
    
    // Find the actual category name in the database (case-insensitive)
    const actualCategoryProduct = await Product.findOne({
      category: { $regex: new RegExp(`^${categoryName}$`, 'i') }
    }).select('category');
    
    let sourceCategoryName = categoryName;
    if (actualCategoryProduct) {
      sourceCategoryName = actualCategoryProduct.category;
      console.log(`ðŸ” Found actual category name: "${sourceCategoryName}" (searched for: "${categoryName}")`);
    }
    
    // Check if new category name already exists
    const existingCategory = await Product.findOne({ 
      category: { $regex: new RegExp(`^${trimmedNewName}$`, 'i') }
    });
    
    if (existingCategory && trimmedNewName.toLowerCase() !== sourceCategoryName.toLowerCase()) {
      // Category already exists - merge them instead of rejecting
      console.log(`ðŸ”„ Category "${trimmedNewName}" already exists. Merging "${sourceCategoryName}" into it.`);
      
      // Update all products with the old category to use the existing category name
      const productUpdateResult = await Product.updateMany(
        { category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') } },
        { $set: { category: existingCategory.category } } // Use the exact case from existing category
      );
      
      console.log(`âœ… Merged ${productUpdateResult.modifiedCount} products from "${sourceCategoryName}" into existing category "${existingCategory.category}"`);
      
      // Update Excel products if they exist
      let excelUpdateCount = 0;
      try {
        const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
        const excelUpdateResult = await ExcelProduct.updateMany(
          { category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') } },
          { $set: { category: existingCategory.category } }
        );
        excelUpdateCount = excelUpdateResult.modifiedCount;
        console.log(`âœ… Merged ${excelUpdateCount} Excel products from "${sourceCategoryName}" into existing category "${existingCategory.category}"`);
      } catch (excelError) {
        console.log('â„¹ï¸ No Excel products to update or Excel model not available');
      }
      
      // Clear caches to ensure updates appear everywhere
      productCache.clear();
      
      return res.json({ 
        message: `Category "${sourceCategoryName}" merged into existing category "${existingCategory.category}" successfully`,
        updatedProducts: productUpdateResult.modifiedCount,
        updatedExcelProducts: excelUpdateCount,
        oldCategoryName: sourceCategoryName,
        newCategoryName: existingCategory.category,
        merged: true,
        success: true
      });
    }
    
    // Update all products with this category (case-insensitive)
    const productUpdateResult = await Product.updateMany(
      { category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') } },
      { $set: { category: trimmedNewName } }
    );
    
    console.log(`âœ… Updated ${productUpdateResult.modifiedCount} products from "${sourceCategoryName}" to "${trimmedNewName}"`);
    
    // Update Excel products if they exist
    let excelUpdateCount = 0;
    try {
      const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
      const excelUpdateResult = await ExcelProduct.updateMany(
        { category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') } },
        { $set: { category: trimmedNewName } }
      );
      excelUpdateCount = excelUpdateResult.modifiedCount;
      console.log(`âœ… Updated ${excelUpdateCount} Excel products from "${sourceCategoryName}" to "${trimmedNewName}"`);
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products to update or Excel model not available');
    }
    
    // Clear caches to ensure updates appear everywhere
    productCache.clear();
    
    res.json({ 
      message: `Category "${sourceCategoryName}" renamed to "${trimmedNewName}" successfully`,
      updatedProducts: productUpdateResult.modifiedCount,
      updatedExcelProducts: excelUpdateCount,
      oldCategoryName: sourceCategoryName,
      newCategoryName: trimmedNewName,
      success: true
    });
    
  } catch (error) {
    console.error('âŒ Error renaming category:', error);
    res.status(500).json({ 
      message: 'Error renaming category', 
      error: error.message,
      success: false
    });
  }
});

// Admin endpoint to delete categories (smart deletion - only affects active/listed products)
router.delete('/admin/categories/:categoryName', authenticateAdmin, async (req, res) => {
  try {
    const { categoryName } = req.params;
    const { force } = req.query;
    
    console.log('ðŸ—‘ï¸ Smart category deletion for:', categoryName, force ? '(forced)' : '');
    
    // Find the actual category name in the database (case-insensitive)
    const actualCategoryProduct = await Product.findOne({
      category: { $regex: new RegExp(`^${categoryName}$`, 'i') }
    }).select('category');
    
    let sourceCategoryName = categoryName;
    if (actualCategoryProduct) {
      sourceCategoryName = actualCategoryProduct.category;
      console.log(`ðŸ” Found actual category name: "${sourceCategoryName}" (searched for: "${categoryName}")`);
    }
    
    // Find active/listed main products in this category
    const activeProducts = await Product.find({ 
      category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') },
      status: 'active' // Only active products
    });
    
    // Find all products in this category (for reporting)
    const allProducts = await Product.find({ 
      category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') }
    });
    
    // Find Excel products in this category
    let pendingExcelProducts = [];
    let listedExcelProducts = [];
    try {
      const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
      const allExcelProducts = await ExcelProduct.find({ 
        category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') }
      });
      
      pendingExcelProducts = allExcelProducts.filter(p => p.status === 'pending' || !p.isConverted);
      listedExcelProducts = allExcelProducts.filter(p => p.status === 'listed' && p.isConverted);
      
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products found or Excel model not available');
    }
    
    console.log('ðŸ“Š Category analysis:', {
      activeMainProducts: activeProducts.length,
      totalMainProducts: allProducts.length,
      pendingExcelProducts: pendingExcelProducts.length,
      listedExcelProducts: listedExcelProducts.length
    });
    
    // Smart deletion logic
    if (activeProducts.length === 0 && listedExcelProducts.length === 0) {
      // Category is empty of active/listed products - safe to delete
      console.log('âœ… Category is empty of active/listed products - proceeding with deletion');
      
      // Remove category from any remaining inactive main products
      const inactiveProducts = allProducts.filter(p => p.status !== 'active');
      if (inactiveProducts.length > 0) {
        await Product.updateMany(
          { 
            category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') },
            status: { $ne: 'active' }
          },
          { $unset: { category: "" } }
        );
        console.log(`ðŸ—‘ï¸ Removed category from ${inactiveProducts.length} inactive main products`);
      }
      
      // Leave pending Excel products untouched - they keep their category for future conversion
      console.log(`â„¹ï¸ Keeping category for ${pendingExcelProducts.length} pending Excel products`);
      
      res.json({ 
        message: `Category "${sourceCategoryName}" deleted successfully. ${activeProducts.length} active products deleted, ${pendingExcelProducts.length} pending Excel products preserved.`,
        deletedActiveProducts: activeProducts.length,
        preservedExcelProducts: pendingExcelProducts.length,
        removedFromInactiveProducts: inactiveProducts.length,
        success: true
      });
      
    } else if (force === 'true') {
      // Force deletion - delete everything including active products
      console.log('âš ï¸ Force deletion - removing all products');
      
      // Delete all active main products
      if (activeProducts.length > 0) {
        await Product.deleteMany({
          category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') },
          status: 'active'
        });
        console.log(`ðŸ—‘ï¸ Deleted ${activeProducts.length} active main products`);
      }
      
      // Remove category from inactive main products
      const inactiveProducts = allProducts.filter(p => p.status !== 'active');
      if (inactiveProducts.length > 0) {
        await Product.updateMany(
          { 
            category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') },
            status: { $ne: 'active' }
          },
          { $unset: { category: "" } }
        );
        console.log(`ðŸ—‘ï¸ Removed category from ${inactiveProducts.length} inactive main products`);
      }
      
      // Remove category from listed Excel products, leave pending ones
      if (listedExcelProducts.length > 0) {
        const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
        await ExcelProduct.updateMany(
          { 
            category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') },
            status: 'listed',
            isConverted: true
          },
          { $unset: { category: "" } }
        );
        console.log(`ðŸ—‘ï¸ Removed category from ${listedExcelProducts.length} listed Excel products`);
      }
      
      console.log(`â„¹ï¸ Preserved ${pendingExcelProducts.length} pending Excel products`);
      
      res.json({ 
        message: `Category "${sourceCategoryName}" force deleted. ${activeProducts.length} active products deleted, ${pendingExcelProducts.length} pending Excel products preserved.`,
        deletedActiveProducts: activeProducts.length,
        preservedExcelProducts: pendingExcelProducts.length,
        removedFromInactiveProducts: inactiveProducts.length,
        removedFromListedExcelProducts: listedExcelProducts.length,
        success: true
      });
      
    } else {
      // Category has active products - cannot delete without force
      const productList = activeProducts.slice(0, 5).map(p => `â€¢ ${p.name}`).join('\n');
      const moreProducts = activeProducts.length > 5 ? `\nâ€¢ ... and ${activeProducts.length - 5} more` : '';
      
      return res.status(400).json({ 
        message: `Cannot delete category "${sourceCategoryName}" because it contains ${activeProducts.length} active product(s). Use force=true to delete anyway.`,
        productCount: activeProducts.length,
        pendingExcelProducts: pendingExcelProducts.length,
        productPreview: productList + moreProducts,
        success: false
      });
    }
    
    // Clear caches to ensure updates appear everywhere
    productCache.clear();
    
  } catch (error) {
    console.error('âŒ Error deleting category:', error);
    res.status(500).json({ 
      message: 'Error deleting category', 
      error: error.message,
      success: false
    });
  }
});

// Check if ASIN already exists in database
router.get('/check-asin/:asin', authenticateAdmin, async (req, res) => {
  try {
    const { asin } = req.params;
    
    if (!asin || asin.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ASIN format. ASIN must be 10 characters long.' 
      });
    }
    
    const existingProduct = await Product.findOne({ 
      asin: asin.toUpperCase(),
      approvalStatus: { $ne: 'disapproved' } // Exclude disapproved products
    });
    
    // If product exists and is approved + Amazon's Choice, it cannot be reused
    if (existingProduct && existingProduct.approvalStatus === 'approved' && existingProduct.isAmazonsChoice) {
      return res.json({
        success: true,
        exists: true,
        blocked: true,
        message: 'This ASIN is already used by an approved Amazon\'s Choice product and cannot be reused',
        product: {
          id: existingProduct._id,
          name: existingProduct.name,
          asin: existingProduct.asin,
          isAmazonsChoice: existingProduct.isAmazonsChoice,
          approvalStatus: existingProduct.approvalStatus
        }
      });
    }
    
    res.json({
      success: true,
      exists: !!existingProduct,
      blocked: false,
      product: existingProduct ? {
        id: existingProduct._id,
        name: existingProduct.name,
        asin: existingProduct.asin,
        isAmazonsChoice: existingProduct.isAmazonsChoice,
        approvalStatus: existingProduct.approvalStatus
      } : null
    });
  } catch (error) {
    console.error('Error checking ASIN:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check ASIN' 
    });
  }
});

// Check if SKU already exists in database
router.get('/check-sku/:sku', authenticateAdmin, async (req, res) => {
  try {
    const { sku } = req.params;
    
    if (!sku || sku.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'SKU cannot be empty.' 
      });
    }
    
    // Check for existing products with this SKU
    // Only check for products that actually exist in the database
    // (disapproved products are deleted, so they won't be found)
    const existingProduct = await Product.findOne({ 
      sku: sku.toUpperCase()
    });
    
    // If product exists, check its approval status
    if (existingProduct) {
      // Block SKUs for approved products (they must be deleted first to reuse SKU)
      if (existingProduct.approvalStatus === 'approved') {
        return res.json({
          success: true,
          exists: true,
          blocked: true,
          message: 'This SKU is already used by an approved product and cannot be reused until the product is deleted',
          product: {
            id: existingProduct._id,
            name: existingProduct.name,
            sku: existingProduct.sku,
            isAmazonsChoice: existingProduct.isAmazonsChoice,
            approvalStatus: existingProduct.approvalStatus
          }
        });
      }
      
      // Block SKUs for pending products (they are awaiting approval)
      if (existingProduct.approvalStatus === 'pending') {
        return res.json({
          success: true,
          exists: true,
          blocked: true,
          message: 'This SKU is already used by a product pending approval',
          product: {
            id: existingProduct._id,
            name: existingProduct.name,
            sku: existingProduct.sku,
            approvalStatus: existingProduct.approvalStatus
          }
        });
      }
    }
    
    // SKU is available (no existing product found or product is not approved/pending)
    res.json({
      success: true,
      exists: false,
      blocked: false,
      product: null
    });
  } catch (error) {
    console.error('Error checking SKU:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check SKU' 
    });
  }
});

// Debug endpoint to check SKU values in products
router.get('/debug/sku-check', authenticateAdmin, async (req, res) => {
  try {
    const products = await Product.find({}, 'name asin sku approvalStatus').limit(10);
    
    const skuStats = {
      total: products.length,
      withSku: products.filter(p => p.sku && p.sku.trim() !== '').length,
      withoutSku: products.filter(p => !p.sku || p.sku.trim() === '').length,
      sampleProducts: products.map(p => ({
        id: p._id,
        name: p.name,
        asin: p.asin || 'No ASIN',
        sku: p.sku || 'No SKU',
        approvalStatus: p.approvalStatus
      }))
    };
    
    res.json({
      success: true,
      stats: skuStats
    });
  } catch (error) {
    console.error('Error checking SKU values:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check SKU values' 
    });
  }
});

// Get products pending approval
router.get('/pending-approval', authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      category = '',
      sortBy = 'newest',
      idsOnly = 'false'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build the query
    let query = { approvalStatus: 'pending' };

    // Add search filter
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { category: searchRegex },
        { brand: searchRegex },
        { sku: searchRegex },
        { asin: searchRegex },
        { description: searchRegex }
      ];
    }

    // Add category filter
    if (category && category !== 'all') {
      query.category = new RegExp(`^${category}$`, 'i');
    }

    // If only IDs are requested, return just the IDs
    if (idsOnly === 'true') {
      const productIds = await Product.find(query).select('_id').lean();
      return res.json({
        success: true,
        productIds: productIds.map(p => p._id.toString())
      });
    }

    // Build sort options
    let sortOptions = {};
    switch (sortBy) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'name-asc':
        sortOptions = { name: 1 };
        break;
      case 'name-desc':
        sortOptions = { name: -1 };
        break;
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'rating-high':
        sortOptions = { rating: -1 };
        break;
      case 'rating-low':
        sortOptions = { rating: 1 };
        break;
      case 'stock-high':
        sortOptions = { stock: -1 };
        break;
      case 'stock-low':
        sortOptions = { stock: 1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Get total count for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limitNum);

    // Get per-category counts (always based on full pending query without category filter)
    const baseQuery = { approvalStatus: 'pending' };
    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      baseQuery.$or = [
        { name: searchRegex }, { category: searchRegex }, { brand: searchRegex },
        { sku: searchRegex }, { asin: searchRegex }, { description: searchRegex }
      ];
    }
    const categoryAgg = await Product.aggregate([
      { $match: baseQuery },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    const categoryCounts = {};
    categoryAgg.forEach(({ _id, count }) => { if (_id) categoryCounts[_id] = count; });

    // If there's a search term, use aggregation for scoring
    let pendingProducts;
    
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const exactMatch = new RegExp(`^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      
      // Build aggregation pipeline with scoring
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            searchScore: {
              $add: [
                // Exact ASIN match (highest priority: 1000)
                { $cond: [{ $regexMatch: { input: { $ifNull: ["$asin", ""] }, regex: exactMatch } }, 1000, 0] },
                
                // Exact SKU match (priority: 900)
                { $cond: [{ $regexMatch: { input: { $ifNull: ["$sku", ""] }, regex: exactMatch } }, 900, 0] },
                
                // Exact name match (priority: 800)
                { $cond: [{ $regexMatch: { input: "$name", regex: exactMatch } }, 800, 0] },
                
                // Partial ASIN match (priority: 700)
                { $cond: [{ $regexMatch: { input: { $ifNull: ["$asin", ""] }, regex: searchRegex } }, 700, 0] },
                
                // Partial SKU match (priority: 600)
                { $cond: [{ $regexMatch: { input: { $ifNull: ["$sku", ""] }, regex: searchRegex } }, 600, 0] },
                
                // Name starts with search (priority: 500)
                { $cond: [{ $regexMatch: { input: "$name", regex: new RegExp(`^${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') } }, 500, 0] },
                
                // Partial name match (priority: 400)
                { $cond: [{ $regexMatch: { input: "$name", regex: searchRegex } }, 400, 0] },
                
                // Brand match (priority: 300)
                { $cond: [{ $regexMatch: { input: { $ifNull: ["$brand", ""] }, regex: searchRegex } }, 300, 0] },
                
                // Category match (priority: 200)
                { $cond: [{ $regexMatch: { input: "$category", regex: searchRegex } }, 200, 0] },
                
                // Description match (priority: 100)
                { $cond: [{ $regexMatch: { input: { $ifNull: ["$description", ""] }, regex: searchRegex } }, 100, 0] }
              ]
            }
          }
        },
        // Sort by search score first, then by created date
        { $sort: { searchScore: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum }
      ];
      
      pendingProducts = await Product.aggregate(pipeline);
    } else {
      // No search term - use regular sort
      let sortOptions = {};
      switch (sortBy) {
        case 'newest':
          sortOptions = { createdAt: -1 };
          break;
        case 'oldest':
          sortOptions = { createdAt: 1 };
          break;
        case 'name-asc':
          sortOptions = { name: 1 };
          break;
        case 'name-desc':
          sortOptions = { name: -1 };
          break;
        case 'price-low':
          sortOptions = { price: 1 };
          break;
        case 'price-high':
          sortOptions = { price: -1 };
          break;
        case 'rating-high':
          sortOptions = { rating: -1 };
          break;
        case 'rating-low':
          sortOptions = { rating: 1 };
          break;
        case 'stock-high':
          sortOptions = { stock: -1 };
          break;
        case 'stock-low':
          sortOptions = { stock: 1 };
          break;
        default:
          sortOptions = { createdAt: -1 };
      }
      
      pendingProducts = await Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean();
    }
    
    res.json({
      success: true,
      products: pendingProducts,
      categoryCounts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalProducts,
        pageSize: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching pending products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch pending products' 
    });
  }
});

// Approve or disapprove a product
router.post('/:id/approval', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, approvalStatus } = req.body;
    
    if (!['approve', 'disapprove'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid action. Must be "approve" or "disapprove"' 
      });
    }
    
    if (action === 'disapprove') {
      // Delete the product instead of just marking as disapproved
      const deletedProduct = await Product.findByIdAndDelete(id);
      
      if (!deletedProduct) {
        return res.status(404).json({ 
          success: false, 
          message: 'Product not found' 
        });
      }
      
      // Clear cache after deletion
      productCache.clear();
      
      return res.json({
        success: true,
        message: 'Product disapproved and removed successfully',
        product: deletedProduct
      });
    }
    
    // For approve action, update the product
    const updateData = {
      approvalStatus: 'approved',
      status: 'active',
      isAmazonsChoice: true, // Automatically add to Amazon's Choice when approved
      approvedAt: new Date(),
      approvedBy: req.admin.id
    };
    
    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!product) {
      return res.status(404).json({ 
        success: false, 
        message: 'Product not found' 
      });
    }
    
    // Sync Excel product status if this product was converted from Excel
    try {
      const excelProduct = await ExcelProduct.findOne({ mainProductId: id });
      if (excelProduct) {
        console.log('ðŸ”„ Syncing Excel product status after approval:', excelProduct.name);
        
        // Product is now approved and listed in Amazon's Choice
        await ExcelProduct.updateOne(
          { _id: excelProduct._id },
          { 
            $set: { 
              status: 'listed', // Listed and showing in Amazon's Choice
              isListed: true,
              listedAt: new Date()
            }
          }
        );
        
        console.log(`âœ… Excel product status updated to: listed (Amazon's Choice)`);
      }
    } catch (syncError) {
      console.error('âš ï¸ Error syncing Excel product status:', syncError);
      // Don't fail the approval if sync fails
    }
    
    // Clear cache after approval status change
    productCache.clear();
    
    res.json({
      success: true,
      message: 'Product approved successfully',
      product
    });
  } catch (error) {
    console.error('Error processing approval:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to process approval' 
    });
  }
});

// Admin endpoint to clear cache manually
router.post('/admin/clear-cache', authenticateAdmin, async (req, res) => {
  try {
    fastProductsCache = null;
    cacheTimestamp = Date.now();
    
    res.json({ 
      message: 'Cache cleared successfully',
      newTimestamp: cacheTimestamp
    });
  } catch (error) {
    console.error('âŒ Error clearing cache:', error);
    res.status(500).json({ message: 'Error clearing cache', error: error.message });
  }
});

// Admin endpoint to bulk mark products as Amazon Choice
router.post('/admin/mark-amazons-choice', authenticateAdmin, async (req, res) => {
  try {
    const { productIds, markAsAmazonsChoice = true } = req.body;
    
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ message: 'productIds array is required' });
    }
    
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { isAmazonsChoice: markAsAmazonsChoice } }
    );
    
    // Clear cache after update
    fastProductsCache = null;
    cacheTimestamp = Date.now();
    
    res.json({ 
      message: `Successfully updated ${result.modifiedCount} products`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('âŒ Error marking products as Amazon Choice:', error);
    res.status(500).json({ message: 'Error updating products', error: error.message });
  }
});

// Admin endpoint to mark ALL active products as Amazon Choice (emergency fix)
router.post('/admin/mark-all-amazons-choice', authenticateAdmin, async (req, res) => {
  try {
    const result = await Product.updateMany(
      { 
        $and: [
          {
            $or: [{ status: 'active' }, { status: { $exists: false } }]
          },
          { status: { $ne: 'inactive' } }
        ]
      },
      { $set: { isAmazonsChoice: true } }
    );
    
    // Clear cache after update
    fastProductsCache = null;
    cacheTimestamp = Date.now();
    
    res.json({ 
      message: `Successfully marked ${result.modifiedCount} products as Amazon Choice`,
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('âŒ Error marking all products as Amazon Choice:', error);
    res.status(500).json({ message: 'Error updating products', error: error.message });
  }
});

// Admin endpoint for bulk operations (update multiple products)
router.post('/admin/bulk-update', authenticateAdmin, async (req, res) => {
  try {
    const { productIds, updateData, updateMode = 'replace' } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ message: 'productIds array is required' });
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'updateData is required' });
    }
    
    console.log(`ðŸ”„ Bulk update request: ${productIds.length} products, mode: ${updateMode}`);
    console.log('ðŸ“ Update data:', updateData);
    
    let successCount = 0;
    let failCount = 0;
    const errors = [];
    
    for (const productId of productIds) {
      try {
        let finalUpdateData = { ...updateData };
        
        // Handle different update modes
        if (updateMode === 'add' || updateMode === 'multiply') {
          // Get current product data for mathematical operations
          const currentProduct = await Product.findById(productId);
          if (!currentProduct) {
            failCount++;
            errors.push({ productId, error: 'Product not found' });
            continue;
          }
          
          // Process numeric fields based on update mode
          Object.keys(finalUpdateData).forEach(key => {
            if (typeof finalUpdateData[key] === 'object' && finalUpdateData[key] !== null) {
              // Handle nested objects (like profitCalculations, profitEvaluation)
              Object.keys(finalUpdateData[key]).forEach(subKey => {
                const newValue = parseFloat(finalUpdateData[key][subKey]);
                const currentValue = parseFloat(currentProduct[key]?.[subKey]) || 0;
                
                if (!isNaN(newValue)) {
                  if (updateMode === 'add') {
                    finalUpdateData[key][subKey] = currentValue + newValue;
                  } else if (updateMode === 'multiply') {
                    finalUpdateData[key][subKey] = currentValue * newValue;
                  }
                }
              });
            } else {
              // Handle top-level numeric fields
              const newValue = parseFloat(finalUpdateData[key]);
              const currentValue = parseFloat(currentProduct[key]) || 0;
              
              if (!isNaN(newValue)) {
                if (updateMode === 'add') {
                  finalUpdateData[key] = currentValue + newValue;
                } else if (updateMode === 'multiply') {
                  finalUpdateData[key] = currentValue * newValue;
                }
              }
            }
          });
        }
        
        // Convert string booleans to actual booleans
        Object.keys(finalUpdateData).forEach(key => {
          if (finalUpdateData[key] === 'true') {
            finalUpdateData[key] = true;
          } else if (finalUpdateData[key] === 'false') {
            finalUpdateData[key] = false;
          }
        });
        
        // Update the product
        const result = await Product.findByIdAndUpdate(
          productId,
          { $set: finalUpdateData },
          { new: true, runValidators: true }
        );
        
        if (result) {
          successCount++;
        } else {
          failCount++;
          errors.push({ productId, error: 'Update failed' });
        }
        
      } catch (error) {
        failCount++;
        errors.push({ productId, error: error.message });
        console.error(`âŒ Error updating product ${productId}:`, error);
      }
    }
    
    // Clear cache after bulk update
    fastProductsCache = null;
    cacheTimestamp = Date.now();
    
    console.log(`âœ… Bulk update completed: ${successCount} success, ${failCount} failed`);
    
    res.json({
      message: `Bulk update completed: ${successCount} successful, ${failCount} failed`,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('âŒ Error in bulk update:', error);
    res.status(500).json({ message: 'Error performing bulk update', error: error.message });
  }
});

// Fast endpoint for 50 products (optimized)
router.get('/public/fast', mobileImageOptimization, optimizeProductImages, addResponsiveImages, async (req, res) => {
  const startTime = Date.now();
  
  try {

    // Check cache first
    if (fastProductsCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      return res.json({
        products: fastProductsCache,
        totalPages: 1,
        currentPage: 1,
        total: fastProductsCache.length,
        source: 'cache',
        responseTime: Date.now() - startTime,
        success: true,
        cacheVersion: cacheTimestamp // Use cache timestamp as version
      });
    }

    // Get diverse products from different categories
    let fastProducts;
    try {
      // Use aggregation for better diversity like the category endpoints
      fastProducts = await Product.aggregate([
        // Match active products only
        { $match: { 
          $and: [
            {
              $or: [
                { status: 'active' },
                { status: { $exists: false } }
              ]
            },
            // Ensure we don't show inactive products
            { status: { $ne: 'inactive' } }
          ]
        }},
        
        // Sample random products for diversity
        { $sample: { size: 50 } },
        
        // Project essential fields including profit data
        { $project: {
          name: 1,
          price: 1,
          shipping: 1,
          originalPrice: 1,
          discount: 1,
          category: 1,
          brand: 1,
          images: 1,
          dealUnits: 1,
          currency: 1,
          rating: 1,
          reviews: 1,
          stock: 1,
          isAmazonsChoice: 1,
          isBestSeller: 1,
          profitCalculations: 1,
          profitEvaluation: 1,
          platformComparison: 1,
          showEvaluation: 1
        }}
      ]).maxTimeMS(5000);
      
      // Cache the results (only for unfiltered requests)
      if (!isAmazonsChoice && !category) {
        fastProductsCache = products;
        cacheTimestamp = Date.now();
      }
      
    } catch (error) {
      console.error('âŒ Fast aggregation failed:', error);
      
      // Try simple query as fallback
      try {
        const fallbackQuery = {
          $or: [
            { status: 'active' },
            { status: { $exists: false } }
          ]
        };
        
        // Add filters to fallback query too
        if (isAmazonsChoice === 'true') {
          fallbackQuery.isAmazonsChoice = true;
          fallbackQuery.approvalStatus = 'approved'; // Only approved products
        }
        if (category && category !== 'all') {
          // Handle both URL-friendly values and display names in fallback too
          if (category.includes('-')) {
            const properCase = category.split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            fallbackQuery.$or = [
              ...(fallbackQuery.$or || []),
              { category: { $regex: category, $options: 'i' } },
              { category: { $regex: properCase, $options: 'i' } }
            ];
          } else {
            fallbackQuery.category = { $regex: category, $options: 'i' };
          }
        }
        
        fastProducts = await Product.find(fallbackQuery)
        .limit(50)
        .select('name price shipping category brand images dealUnits currency rating reviews isAmazonsChoice isBestSeller profitCalculations profitEvaluation platformComparison showEvaluation asin sku variations sellers sellerInfo')
        .lean()
        .maxTimeMS(3000);
        
      } catch (fallbackError) {
        console.error('âŒ All queries failed, no products available');
        fastProducts = []; // Return empty array instead of fake products
      }
    }

    const responseTime = Date.now() - startTime;

    res.json({
      products: fastProducts,
      totalPages: 1,
      currentPage: 1,
      total: fastProducts.length,
      source: 'fast',
      responseTime,
      success: true,
      cacheVersion: Date.now() // Add cache version to help with client-side cache busting
    });
    
  } catch (error) {
    console.error('âŒ Fast API error:', error);
    res.status(500).json({ 
      products: [],
      error: 'Server error',
      success: false
    });
  }
});

// Public endpoint for frontend (no auth required) - Enhanced with comprehensive fallbacks
router.get('/public', mobileImageOptimization, optimizeProductImages, addResponsiveImages, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      page = 1, 
      limit = 100, // Increased default limit for Amazon's Choice page
      search, 
      category, 
      status = 'active',
      sortBy = 'createdAt',
      order = 'desc',
      isAmazonsChoice,
      isBestSeller,
      isLatestDeal,
      showOnHome,
      source
    } = req.query;

    // Check database connection state
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        products: [],
        totalPages: 1,
        currentPage: parseInt(page),
        total: 0,
        source: 'database_disconnected',
        responseTime: Date.now() - startTime,
        success: false,
        error: 'Database connection unavailable. Please try again.'
      });
    }

    // Simplified query structure for better performance - only show active products
    let query = { 
      $and: [
        {
          $or: [
            { status: 'active' },
            { status: { $exists: false } } // Include products without status field for backward compatibility
          ]
        },
        // Ensure we don't show inactive products
        { status: { $ne: 'inactive' } }
      ]
    };
    
    // Only add complex filters if really needed
    if (!source || source !== 'excel') {
      // Simplified: just get active products, don't filter by originalAdminProductId for now
      // This reduces query complexity and improves performance
    }
    
    // If source=excel is specified, filter for Excel products (not Amazon's Choice)
    if (source === 'excel') {
      query.isAdminProduct = true; // Excel products are marked as admin products
    }
    
    // Enhanced search with relevance
    let sortOptions = { [sortBy]: order === 'desc' ? -1 : 1 };
    
    // For Amazon's Choice products without search, use random sorting that changes on each request
    if (isAmazonsChoice === 'true' && !search) {
      // Create a truly random sort that changes on each page load
      // Use current timestamp and random number for maximum randomization
      const randomSeed = Math.floor(Math.random() * 1000000) + Date.now();
      sortOptions = { 
        // Mix of random seed with product ID for true randomization on each request
        $expr: { 
          $add: [
            { $mod: [randomSeed, 1000] },
            { $mod: [{ $toInt: { $substr: [{ $toString: "$_id" }, -4, -1] } }, 997] }
          ]
        }
      };
    }
    
    if (search) {
      // Escape special regex characters to prevent MongoDB errors
      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');


      
      const escapedSearch = escapeRegex(search);
      // Use all words including short ones like G10, 4, MoD
      const searchTerms = search.toLowerCase().split(/\s+/).filter(term => term.length >= 1);
      const escapedTerms = searchTerms.map(term => escapeRegex(term));
      
      // Check if search looks like a MongoDB ObjectId (24 hex characters)
      const mongoose = await import('mongoose');
      const isValidObjectId = mongoose.default.Types.ObjectId.isValid(search);
      
      // Create comprehensive search query with escaped regex
      const searchQuery = {
        $or: [
          // Product ID search (highest priority if valid ObjectId)
          ...(isValidObjectId ? [{ _id: search }] : []),
          // Partial ID search (for shorter ID searches like "0ff613") - convert ObjectId to string
          ...(search.length >= 3 && /^[a-fA-F0-9]+$/.test(search) ? [{ 
            $expr: { 
              $regexMatch: { 
                input: { $toString: "$_id" }, 
                regex: search, 
                options: "i" 
              } 
            } 
          }] : []),
          // Exact name match (high priority)
          { name: { $regex: `^${escapedSearch}`, $options: 'i' } },
          // Contains search term
          { name: { $regex: escapedSearch, $options: 'i' } },
          // Brand match
          { brand: { $regex: escapedSearch, $options: 'i' } },
          // SKU match - ADDED FOR SKU SEARCH
          { sku: { $regex: escapedSearch, $options: 'i' } },
          // Category match
          { category: { $regex: escapedSearch, $options: 'i' } },
          // Description match
          { description: { $regex: escapedSearch, $options: 'i' } },
          // Individual word matches in name
          ...escapedTerms.map(term => ({ name: { $regex: term, $options: 'i' } })),
          // Individual word matches in description
          ...escapedTerms.map(term => ({ description: { $regex: term, $options: 'i' } }))
        ]
      };
      
      // Debug logging for ID searches (public route) - only in development
      if (process.env.NODE_ENV !== 'production' && search.length >= 3 && /^[a-fA-F0-9]+$/.test(search)) {
        console.log('ðŸ” Public ID Search Debug:', {
          searchTerm: search,
          isValidObjectId,
          route: 'public'
        });
      }
      
      // Combine with existing query â€” use $and to preserve both status filter and search
      query = {
        $and: [
          ...(query.$and || [{ $or: [{ status: 'active' }, { status: { $exists: false } }] }, { status: { $ne: 'inactive' } }]),
          searchQuery
        ]
      };
    }
    
    if (category && category !== 'all') {
      // Decode URL-encoded category first
      const decodedCategory = decodeURIComponent(category);
      
      // Handle both URL-friendly values (e.g., 'remote-controls') and display names (e.g., 'Remote Controls')
      const categoryQuery = {
        $or: [
          { category: decodedCategory }, // Exact match with decoded category
          { category: category }, // Exact match with original category
          { category: { $regex: `^${decodedCategory.replace(/-/g, ' ')}$`, $options: 'i' } }, // Convert dashes to spaces
          { category: { $regex: `^${decodedCategory.replace(/-/g, '\\s+')}$`, $options: 'i' } } // Handle multiple spaces
        ]
      };
      
      // If category looks like a URL-friendly value, also try the proper case version
      if (decodedCategory.includes('-')) {
        const properCase = decodedCategory.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        categoryQuery.$or.push({ category: properCase });
        categoryQuery.$or.push({ category: { $regex: `^${properCase}$`, $options: 'i' } });
      }
      
      // Handle special characters like & in category names
      if (decodedCategory.includes('&')) {
        // Try variations with and without spaces around &
        const withSpaces = decodedCategory.replace(/&/g, ' & ');
        const withoutSpaces = decodedCategory.replace(/\s*&\s*/g, '&');
        categoryQuery.$or.push({ category: withSpaces });
        categoryQuery.$or.push({ category: withoutSpaces });
        categoryQuery.$or.push({ category: { $regex: `^${withSpaces}$`, $options: 'i' } });
        categoryQuery.$or.push({ category: { $regex: `^${withoutSpaces}$`, $options: 'i' } });
      }
      
      query = { ...query, ...categoryQuery };
    }
    if (isAmazonsChoice === 'true') {
      query.isAmazonsChoice = true;
      query.approvalStatus = 'approved'; // Only show approved Amazon's Choice products
      // Only show products with ASIN (required for Cloudinary images)
      query.asin = { $exists: true, $ne: null, $ne: '' };
      // Only show products with images array (Cloudinary images should be in images array)
      query.images = { $exists: true, $ne: [], $ne: null };
    }
    if (isBestSeller === 'true') query.isBestSeller = true;
    if (isLatestDeal === 'true') query.isLatestDeal = true;
    if (showOnHome === 'true') query.showOnHome = true;
    
    // Filter for products with seller listings (admin products where sellers have listed themselves)
    if (req.query.hasSellerListings === 'true') {
      query.sellers = { $exists: true, $ne: [], $not: { $size: 0 } };
    }

    // Filter sellers by listing countries based on selected currency
    const currencyFilter = req.query.currency;
    if (currencyFilter && ['GBP', 'PKR', 'AED', 'USD'].includes(currencyFilter)) {
      if (req.query.hasSellerListings === 'true') {
        query['sellers'] = {
          $elemMatch: {
            $or: [
              { listingCountries: currencyFilter },          // new array field contains this currency
              { listingCountries: { $size: 0 } },           // empty array = all countries
              { listingCountries: { $exists: false } },      // legacy: no field = all countries
              { listingCountry: currencyFilter },            // legacy single-value field
              { listingCountry: { $exists: false } },        // legacy: no field
              { listingCountry: null },
              { listingCountry: '' }
            ]
          }
        };
      }
    }

    // Enhanced query execution with multiple fallback strategies
    let products;
    let querySource = 'database';
    
    try {
      
      // For Amazon's Choice products without search, use aggregation with random sampling
      // This includes category filtering - the query object already contains category filters
      if (isAmazonsChoice === 'true' && !search) {
        
        const pipeline = [
          { $match: query },
          // Add a random field to each document for better shuffling
          { $addFields: { randomField: { $rand: {} } } },
          // Sort by the random field to shuffle the results
          { $sort: { randomField: 1 } },
          { $skip: (parseInt(page) - 1) * parseInt(limit) },
          { $limit: parseInt(limit) },
          {
            $project: {
              name: 1,
              description: 1,
              price: 1,
              originalPrice: 1,
              discount: 1,
              category: 1,
              brand: 1,
              images: 1,
              rating: 1,
              reviews: 1,
              stock: 1,
              dealUnits: 1,
              currency: 1,
              isAmazonsChoice: 1,
              isBestSeller: 1,
              seller: 1,
              isAdminProduct: 1,
              sellerInfo: 1,
              profitCalculations: 1,
              profitEvaluation: 1,
              platformComparison: 1,
              showEvaluation: 1,
              asin: 1,
              sku: 1,
              variations: 1,
              sellers: 1
            }
          }
        ];
        
        products = await Product.aggregate(pipeline);
        
        // Get total count for pagination (separate query for performance)
        const totalCount = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalCount / parseInt(limit));
        
        // Process and return results
        const processedProducts = products.map(product => ({
          ...product,
          // Ensure proper price formatting
          price: parseFloat(product.price || 0),
          originalPrice: parseFloat(product.originalPrice || 0),
          rating: parseFloat(product.rating || 4.0),
          reviews: parseInt(product.reviews || 0),
          stock: parseInt(product.stock || 0),
          dealUnits: parseInt(product.dealUnits || 1)
        }));

        const responseTime = Date.now() - startTime;

        return res.json({
          products: processedProducts,
          totalPages: totalPages,
          currentPage: parseInt(page),
          total: totalCount,
          source: 'database_random',
          responseTime,
          success: true
        });
      }
      
      // Regular query for non-Amazon's Choice or when searching
      products = await Product.find(query)
        .sort(sortOptions)
        .limit(parseInt(limit))
        .select('name description price originalPrice discount category brand images rating reviews stock dealUnits currency isAmazonsChoice isBestSeller seller isAdminProduct sellerInfo profitCalculations profitEvaluation platformComparison showEvaluation asin sku variations sellers')
        .maxTimeMS(10000) // Increased timeout to 10 seconds
        .lean();
      
    } catch (queryError) {
      console.error('âŒ Database query failed:', queryError.message);
      
      // Return empty result instead of fallback products
      return res.json({
        products: [],
        totalPages: 1,
        currentPage: parseInt(page),
        total: 0,
        source: 'database_error',
        responseTime: Date.now() - startTime,
        success: false,
        error: 'Database temporarily unavailable. Please try again.'
      });
    }

    // Custom sorting for search results (relevance-based)
    if (search) {
      products = products.sort((a, b) => {
        const searchLower = search.toLowerCase();
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Exact match first
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;
        
        // Starts with search term
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
        if (bName.startsWith(searchLower) && !aName.startsWith(searchLower)) return 1;
        
        // Contains all search words
        const searchWords = searchLower.split(' ');
        const aMatches = searchWords.filter(word => aName.includes(word)).length;
        const bMatches = searchWords.filter(word => bName.includes(word)).length;
        
        if (aMatches !== bMatches) return bMatches - aMatches;
        
        // Same category as search term
        const aCategoryMatch = a.category?.toLowerCase().includes(searchLower);
        const bCategoryMatch = b.category?.toLowerCase().includes(searchLower);
        
        if (aCategoryMatch && !bCategoryMatch) return -1;
        if (bCategoryMatch && !aCategoryMatch) return 1;
        
        // Default sort by creation date
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    // Process products to include seller info only for verified sellers
    const processedProducts = products.map(product => {
      // Handle sellers array (multiple sellers who listed this admin product)
      if (product.sellers && product.sellers.length > 0) {
        // For public access, show all sellers but hide sensitive info like emails
        product.sellers = product.sellers.map(seller => {
          const { email, transactionId, paymentMethod, notes, ...publicSellerInfo } = seller;
          return publicSellerInfo;
        });
      }
      
      // Use cached sellerInfo if available, otherwise populate from seller object
      if (!product.sellerInfo && product.seller && product.seller.verificationStatus === 'approved' && !product.isAdminProduct) {
        product.sellerInfo = {
          whatsappNo: product.seller.whatsappNo,
          city: product.seller.city,
          country: product.seller.country,
          verificationStatus: product.seller.verificationStatus
        };
      }
      // Remove seller object to avoid exposing sensitive data
      delete product.seller;
      return product;
    });

    // Enhanced count handling with timeout protection
    let count;
    try {
      if (querySource === 'database' && parseInt(limit) < 200) {
        const countPromise = Product.countDocuments(query).maxTimeMS(3000);
        const countTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Count timeout')), 5000)
        );
        count = await Promise.race([countPromise, countTimeout]);
      } else {
        count = products.length;
      }
    } catch (countError) {
      console.error('âŒ Count query timeout:', countError.message);
      count = products.length;
    }

    const responseTime = Date.now() - startTime;

    res.json({
      products: processedProducts,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      total: count,
      source: querySource,
      responseTime,
      success: true
    });
    
  } catch (error) {
    console.error('âŒ Products API critical error:', error);
    
    // Return empty result instead of emergency fallback
    res.status(500).json({ 
      products: [],
      totalPages: 1,
      currentPage: parseInt(page),
      total: 0,
      source: 'error',
      error: 'Server error occurred. Please try again later.',
      success: false
    });
  }
});

// Public endpoint to get single product by ID (no auth required)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the ID is a valid MongoDB ObjectId
    const mongoose = await import('mongoose');
    if (!mongoose.default.Types.ObjectId.isValid(id)) {
      console.log(`Invalid ObjectId format: ${id} - this might be a hardcoded product ID`);
      return res.status(400).json({ 
        message: 'Product not found in database',
        error: `ID "${id}" is not a valid database ObjectId. This might be a hardcoded product.`,
        suggestion: 'Try using a valid MongoDB ObjectId (24-character hex string) or check if this is a legacy product ID.'
      });
    }
    
    const product = await Product.findById(id)
      .populate('seller', 'username email supplierId whatsappNo city country verificationStatus')
      .populate('sellers.sellerId', 'username whatsappNo city country verificationStatus businessName');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Only return if product is active
    if (product.status !== 'active') {
      return res.status(404).json({ message: 'Product not available' });
    }

    // Include seller info - always populate for seller object, cache for performance
    let productData = product.toObject();
    
    // Handle sellers array (multiple sellers who listed this admin product)
    // IMPORTANT: Merge cached data with fresh data from populated sellerId
    if (productData.sellers && productData.sellers.length > 0) {
      productData.sellers = productData.sellers.map(seller => {
        // If sellerId is populated, use fresh data from Seller model
        if (seller.sellerId && typeof seller.sellerId === 'object') {
          return {
            sellerId: seller.sellerId._id,
            username: seller.sellerId.username || seller.username,
            whatsappNo: seller.sellerId.whatsappNo || seller.whatsappNo,
            city: seller.sellerId.city || seller.city,
            country: seller.sellerId.country || seller.country,
            businessName: seller.sellerId.businessName || seller.businessName,
            sellerPrice: seller.sellerPrice,
            sellerShipping: seller.sellerShipping,
            moq: seller.moq || 1,
            listedAt: seller.listedAt,
            verificationStatus: seller.sellerId.verificationStatus,
            listingCountries: seller.listingCountries || [],
            asinAvailable: seller.asinAvailable || false,
            asinYearlyCost: seller.asinYearlyCost || 0,
            asinReviews: seller.asinReviews || 0,
            asinYearlyIncome: seller.asinYearlyIncome || 0
          };
        }
        // Fallback to cached data if sellerId not populated
        const { email, transactionId, paymentMethod, notes, ...publicSellerInfo } = seller;
        return { ...publicSellerInfo, moq: seller.moq || 1, listingCountries: seller.listingCountries || [] };
      });
    }
    
    // Always populate seller info if seller exists (for admin and seller access)
    if (!productData.sellerInfo && product.seller) {
      productData.sellerInfo = {
        username: product.seller.username,
        whatsappNo: product.seller.whatsappNo,
        city: product.seller.city,
        country: product.seller.country,
        verificationStatus: product.seller.verificationStatus
      };
    }
    
    // Keep full seller object for admin access, or just ID for others
    if (product.seller) {
      // Keep the full seller object so admin can access it
      // The frontend will handle what to display based on user permissions
      productData.seller = product.seller._id; // Keep ID for reference
      productData.sellerData = product.seller; // Keep full data for admin access
    } else {
      delete productData.seller;
      delete productData.sellerInfo;
      delete productData.sellerData;
    }
    
    res.json(productData);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } 
});

// Track a product view (public, called by buyer on product detail page)
router.post('/public/:id/view', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // Support both old field names (buyerId/buyerName) and new (viewerId/viewerName/viewerType)
    const viewerType  = req.body.viewerType  || 'guest';
    const viewerId    = req.body.viewerId    || req.body.buyerId    || null;
    const viewerName  = req.body.viewerName  || req.body.buyerName  || 'Guest';
    const viewerEmail = req.body.viewerEmail || req.body.buyerEmail || '';

    // Server-side dedup: same viewer within 30 minutes = skip
    const ProductView = (await import('../models/ProductView.js')).default;
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    const validId = viewerId && mongoose.Types.ObjectId.isValid(viewerId);
    const dupQuery = validId
      ? { productId: id, buyerId: viewerId, viewedAt: { $gte: thirtyMinsAgo } }
      : { productId: id, buyerName: viewerName, buyerEmail: viewerEmail, viewedAt: { $gte: thirtyMinsAgo } };

    const alreadyViewed = await ProductView.findOne(dupQuery).lean();
    if (alreadyViewed) return res.json({ success: true, skipped: true });

    // Increment viewCount on product
    const product = await Product.findByIdAndUpdate(
      id,
      { $inc: { viewCount: 1 } },
      { new: false }
    ).select('name').lean();

    // Save detailed view record
    await ProductView.create({
      productId: id,
      productName: product?.name || '',
      viewerType,
      buyerId: validId ? viewerId : null,
      buyerName: viewerName,
      buyerEmail: viewerEmail
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get top viewed products with buyer details
router.get('/admin/product-views', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const ProductView = (await import('../models/ProductView.js')).default;

    // Get products sorted by viewCount
    const products = await Product.find({ viewCount: { $gt: 0 } })
      .select('name category viewCount images price status')
      .sort({ viewCount: -1 })
      .limit(parseInt(limit))
      .lean();

    const totalViews = products.reduce((sum, p) => sum + (p.viewCount || 0), 0);

    // For each product, get the last 20 viewer records
    const productIds = products.map(p => p._id);
    const viewRecords = await ProductView.find({ productId: { $in: productIds } })
      .sort({ viewedAt: -1 })
      .select('productId buyerName buyerEmail viewerType viewedAt')
      .lean();

    // Group view records by productId
    const viewsByProduct = {};
    for (const v of viewRecords) {
      const key = v.productId.toString();
      if (!viewsByProduct[key]) viewsByProduct[key] = [];
      if (viewsByProduct[key].length < 20) viewsByProduct[key].push(v);
    }

    const productsWithViewers = products.map(p => ({
      ...p,
      viewers: viewsByProduct[p._id.toString()] || []
    }));

    res.json({ success: true, products: productsWithViewers, totalViews });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Log a search query (public, called by AmazonsChoice page or seller products page)
router.post('/public/search-log', async (req, res) => {
  try {
    const { query, resultsCount, buyerId, buyerName, buyerEmail, page: sourcePage } = req.body;
    if (!query || !query.trim()) return res.json({ success: true, skipped: true });

    const SearchLog = (await import('../models/SearchLog.js')).default;

    // Dedup: same buyer/guest same query within 30 seconds = skip (prevents double-fire, not re-testing)
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000);
    const dupQuery = buyerId && mongoose.Types.ObjectId.isValid(buyerId)
      ? { query: query.trim().toLowerCase(), buyerId, searchedAt: { $gte: thirtySecsAgo } }
      : { query: query.trim().toLowerCase(), buyerName: buyerName || 'Guest', searchedAt: { $gte: thirtySecsAgo } };

    const already = await SearchLog.findOne(dupQuery).lean();
    if (already) return res.json({ success: true, skipped: true });

    await SearchLog.create({
      query: query.trim().toLowerCase(),
      page: sourcePage || 'amazons-choice',
      buyerId: buyerId && mongoose.Types.ObjectId.isValid(buyerId) ? buyerId : null,
      buyerName: buyerName || 'Guest',
      buyerEmail: buyerEmail || '',
      resultsCount: resultsCount || 0
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get search analytics
router.get('/admin/search-logs', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 200 } = req.query;
    const SearchLog = (await import('../models/SearchLog.js')).default;

    // Top queries by frequency
    const topQueries = await SearchLog.aggregate([
      { $group: {
        _id: '$query',
        count: { $sum: 1 },
        avgResults: { $avg: '$resultsCount' },
        lastSearched: { $max: '$searchedAt' },
        users: { $addToSet: { name: '$buyerName', email: '$buyerEmail', page: '$page' } }
      }},
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Recent individual searches
    const recent = await SearchLog.find()
      .sort({ searchedAt: -1 })
      .limit(50)
      .select('query buyerName buyerEmail resultsCount searchedAt page')
      .lean();

    const totalSearches = await SearchLog.countDocuments();

    res.json({ success: true, topQueries, recent, totalSearches });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// â”€â”€â”€ Site Visit Tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Public: log a site visit (called on app load)
router.post('/public/site-visit', async (req, res) => {
  try {
    const SiteVisit = (await import('../models/SiteVisit.js')).default;
    const { visitorType = 'guest', visitorId, visitorName, visitorEmail, page: pg } = req.body;

    // Dedup: same visitor within 1 hour = skip (one record per visitor per hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const validId = visitorId && mongoose.Types.ObjectId.isValid(visitorId);
    const dupQ = validId
      ? { visitorId, page: pg || '/', visitedAt: { $gte: oneHourAgo } }
      : { visitorName: visitorName || 'Guest', visitorEmail: visitorEmail || '', page: pg || '/', visitedAt: { $gte: oneHourAgo } };

    const already = await SiteVisit.findOne(dupQ).lean();
    if (already) return res.json({ success: true, skipped: true });

    await SiteVisit.create({
      visitorType,
      visitorId: validId ? visitorId : null,
      visitorName: visitorName || 'Guest',
      visitorEmail: visitorEmail || '',
      page: pg || '/',
      ip: req.ip || '',
      userAgent: req.headers['user-agent'] || ''
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: get site visitor analytics
router.get('/admin/site-visits', authenticateAdmin, async (req, res) => {
  try {
    const SiteVisit = (await import('../models/SiteVisit.js')).default;
    const { days = 30, type } = req.query;

    const since = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Always exclude admin routes from all queries
    const adminExclude = { page: { $not: /^\/admin/ } };

    const baseMatch = { visitedAt: { $gte: since }, ...adminExclude };
    if (type && type !== 'all') baseMatch.visitorType = type;

    // Total visits (non-admin pages only)
    const totalVisits = await SiteVisit.countDocuments(baseMatch);

    // Visitors by type (non-admin)
    const byType = await SiteVisit.aggregate([
      { $match: { visitedAt: { $gte: since }, ...adminExclude } },
      { $group: { _id: '$visitorType', count: { $sum: 1 } } }
    ]);

    // Daily visits
    const daily = await SiteVisit.aggregate([
      { $match: baseMatch },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitedAt' } },
        count: { $sum: 1 },
        buyers:  { $sum: { $cond: [{ $eq: ['$visitorType', 'buyer']  }, 1, 0] } },
        sellers: { $sum: { $cond: [{ $eq: ['$visitorType', 'seller'] }, 1, 0] } },
        guests:  { $sum: { $cond: [{ $eq: ['$visitorType', 'guest']  }, 1, 0] } }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Top pages with per-type breakdown (non-admin only)
    const topPages = await SiteVisit.aggregate([
      { $match: { visitedAt: { $gte: since }, ...adminExclude } },
      { $group: {
        _id: '$page',
        total:   { $sum: 1 },
        buyers:  { $sum: { $cond: [{ $eq: ['$visitorType', 'buyer']  }, 1, 0] } },
        sellers: { $sum: { $cond: [{ $eq: ['$visitorType', 'seller'] }, 1, 0] } },
        guests:  { $sum: { $cond: [{ $eq: ['$visitorType', 'guest']  }, 1, 0] } }
      }},
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);

    // Recent visitors (non-admin)
    const recent = await SiteVisit.find(baseMatch)
      .sort({ visitedAt: -1 })
      .limit(50)
      .select('visitorType visitorName visitorEmail page visitedAt')
      .lean();

    res.json({ success: true, totalVisits, byType, daily, topPages, recent });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: product-views with user-type filter
router.get('/admin/product-views-filtered', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 100, viewerType } = req.query;
    const ProductView = (await import('../models/ProductView.js')).default;

    // Build match for viewer type filter
    const viewerMatch = {};
    if (viewerType && viewerType !== 'all') viewerMatch.viewerType = viewerType;

    // Get products that have views matching the filter
    const viewAgg = await ProductView.aggregate([
      ...(viewerType && viewerType !== 'all' ? [{ $match: { viewerType } }] : []),
      { $group: { _id: '$productId', filteredCount: { $sum: 1 } } },
      { $sort: { filteredCount: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const productIds = viewAgg.map(v => v._id);
    const countMap = Object.fromEntries(viewAgg.map(v => [v._id.toString(), v.filteredCount]));

    const products = await Product.find({ _id: { $in: productIds } })
      .select('name category viewCount images price status')
      .lean();

    // Get viewer records for these products (filtered by type)
    const viewRecords = await ProductView.find({
      productId: { $in: productIds },
      ...(viewerType && viewerType !== 'all' ? { viewerType } : {})
    })
      .sort({ viewedAt: -1 })
      .select('productId buyerName buyerEmail viewerType viewedAt')
      .lean();

    const viewsByProduct = {};
    for (const v of viewRecords) {
      const key = v.productId.toString();
      if (!viewsByProduct[key]) viewsByProduct[key] = [];
      if (viewsByProduct[key].length < 20) viewsByProduct[key].push(v);
    }

    const result = products
      .map(p => ({
        ...p,
        viewCount: countMap[p._id.toString()] || 0,
        viewers: viewsByProduct[p._id.toString()] || []
      }))
      .sort((a, b) => b.viewCount - a.viewCount);

    const totalViews = result.reduce((s, p) => s + p.viewCount, 0);
    res.json({ success: true, products: result, totalViews });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: search-logs with user-type filter
router.get('/admin/search-logs-filtered', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 200, viewerType } = req.query;
    const SearchLog = (await import('../models/SearchLog.js')).default;

    const match = {};
    if (viewerType === 'buyer')  { match.page = { $ne: 'seller-products' }; match.buyerName = { $ne: 'Guest' }; }
    if (viewerType === 'seller') match.page = 'seller-products';
    if (viewerType === 'guest')  match.buyerName = 'Guest';

    const topQueries = await SearchLog.aggregate([
      ...(Object.keys(match).length ? [{ $match: match }] : []),
      { $group: {
        _id: '$query',
        count: { $sum: 1 },
        avgResults: { $avg: '$resultsCount' },
        lastSearched: { $max: '$searchedAt' },
        users: { $addToSet: { name: '$buyerName', email: '$buyerEmail', page: '$page' } }
      }},
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const recent = await SearchLog.find(match)
      .sort({ searchedAt: -1 })
      .limit(50)
      .select('query buyerName buyerEmail resultsCount searchedAt page')
      .lean();

    const totalSearches = await SearchLog.countDocuments(match);

    res.json({ success: true, topQueries, recent, totalSearches });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Specific endpoint for Excel products (for sellers)
router.get('/excel-products', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 1000, 
      search, 
      category,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    let query = { 
      status: 'active',
      isAdminProduct: true // Excel products are marked as admin products
    };
    
    if (search) {
      query.$text = { $search: search };
    }
    if (category && category !== 'all') query.category = category;

    const products = await Product.find(query)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-seller'); // Don't expose seller info to public

    const count = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
      message: 'Excel products fetched successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Fast admin endpoint for dashboard
router.get('/admin/fast', authenticateAdmin, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      limit = '50',
      page = '1'
    } = req.query;

    const limitNum = parseInt(limit);
    const pageNum = parseInt(page);
    const skip = (pageNum - 1) * limitNum;

    // Get products without images for speed
    let allProducts;
    let totalCount;
    
    try {
      // Get total count for pagination
      totalCount = await Product.countDocuments({});
      
      // Get paginated products
      allProducts = await Product.find({})
        .skip(skip)
        .limit(limitNum)
        .select('name price shipping category status createdAt dealUnits currency asin sku seller sellers') // Include shipping field
        .populate('seller', 'businessName email username')
        .populate('sellers.sellerId', 'username businessName email')
        .sort({ createdAt: -1 })
        .maxTimeMS(5000) // Increased timeout for larger datasets
        .lean();
      
    } catch (error) {
      console.error('Fast admin query error:', error);
      allProducts = [];
      totalCount = 0;
    }

    const totalPages = Math.ceil(totalCount / limitNum);
    const responseTime = Date.now() - startTime;

    res.json({
      products: allProducts,
      totalPages,
      currentPage: pageNum,
      total: totalCount,
      source: 'fast_admin',
      responseTime,
      success: true
    });
    
  } catch (error) {
    console.error('âŒ Fast admin API error:', error);
    res.status(500).json({ 
      products: [],
      error: 'Server error',
      success: false
    });
  }
});

// Admin endpoint (auth required) - Optimized with ASIN search
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      category, 
      status,
      sortBy = 'createdAt',
      order = 'desc',
      excludeSellerCopies = 'false' // New parameter to exclude seller copies
    } = req.query;

    let query = {
      // Include approved and pending products, exclude disapproved
      approvalStatus: { $in: ['approved', 'pending'] }
    };
    
    // Optionally exclude seller copies (products with originalAdminProductId)
    // But for admin interface, we want to show all products that are visible to users
    if (excludeSellerCopies === 'true') {
      // More inclusive filter for admin: show admin products OR products visible in Amazon's Choice
      query.$or = [
        { isAdminProduct: true },
        { originalAdminProductId: { $exists: false } },
        { originalAdminProductId: null },
        { isAmazonsChoice: true }, // Also include Amazon's Choice products even if they're seller copies
        { status: 'active' } // Include all active products
      ];
    }
    
    // Enhanced search with relevance for admin
    let sortOptions = { [sortBy]: order === 'desc' ? -1 : 1 };
    
    if (search) {
      // Escape special regex characters to prevent MongoDB errors
      const escapeRegex = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      
      const escapedSearch = escapeRegex(search);
      // Use all words including short ones like G10, 4, MoD
      const searchTerms = search.toLowerCase().split(/\s+/).filter(term => term.length >= 1);
      const escapedTerms = searchTerms.map(term => escapeRegex(term));
      
      // Check if search looks like a MongoDB ObjectId (24 hex characters)
      const mongoose = await import('mongoose');
      const isValidObjectId = mongoose.default.Types.ObjectId.isValid(search);
      
      // Create comprehensive search query with escaped regex
      const searchQuery = {
        $or: [
          // Product ID search (highest priority if valid ObjectId)
          ...(isValidObjectId ? [{ _id: search }] : []),
          // Partial ID search (for shorter ID searches like "0ff613") - convert ObjectId to string
          ...(search.length >= 3 && /^[a-fA-F0-9]+$/.test(search) ? [{ 
            $expr: { 
              $regexMatch: { 
                input: { $toString: "$_id" }, 
                regex: search, 
                options: "i" 
              } 
            } 
          }] : []),
          // Exact name match (high priority)
          { name: { $regex: `^${escapedSearch}`, $options: 'i' } },
          // Contains search term
          { name: { $regex: escapedSearch, $options: 'i' } },
          // Brand match
          { brand: { $regex: escapedSearch, $options: 'i' } },
          // SKU match - ADDED FOR SKU SEARCH
          { sku: { $regex: escapedSearch, $options: 'i' } },
          // Category match
          { category: { $regex: escapedSearch, $options: 'i' } },
          // Description match
          { description: { $regex: escapedSearch, $options: 'i' } },
          // Individual word matches in name
          ...escapedTerms.map(term => ({ name: { $regex: term, $options: 'i' } })),
          // Individual word matches in description
          ...escapedTerms.map(term => ({ description: { $regex: term, $options: 'i' } }))
        ]
      };
      
      // Add ASIN search to the query if it looks like an ASIN
      if (search.length === 10 && /^[A-Z0-9]{10}$/i.test(search)) {
        searchQuery.$or.unshift({ asin: search.toUpperCase() });
      } else if (search.length >= 3 && /^[A-Z0-9]+$/i.test(search) && search.length < 10) {
        searchQuery.$or.unshift({ asin: { $regex: search.toUpperCase(), $options: 'i' } });
      }
      
      // Debug logging for ID and ASIN searches - only in development
      if (process.env.NODE_ENV !== 'production' && search.length >= 3 && /^[a-fA-F0-9]+$/.test(search)) {
        console.log('ðŸ” ID Search Debug:', {
          searchTerm: search,
          isValidObjectId,
          queryStructure: JSON.stringify(searchQuery, null, 2)
        });
      }
      
      // Combine with existing query
      query = { ...query, ...searchQuery };
    }
    
    if (category) {
      // Handle both URL-friendly values (e.g., 'remote-controls') and display names (e.g., 'Remote Controls')
      const categoryQuery = {
        $or: [
          { category: category }, // Exact match
          { category: { $regex: `^${category.replace(/-/g, ' ')}$`, $options: 'i' } }, // Convert dashes to spaces
          { category: { $regex: `^${category.replace(/-/g, '\\s+')}$`, $options: 'i' } } // Handle multiple spaces
        ]
      };
      
      // If category looks like a URL-friendly value, also try the proper case version
      if (category.includes('-')) {
        const properCase = category.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        categoryQuery.$or.push({ category: properCase });
      }
      
      query = { ...query, ...categoryQuery };
    }
    if (status) query.status = status;

    let adminProducts;
    try {
      // Optimized admin query with timeout
      adminProducts = await Product.find(query)
        .populate('seller', 'businessName email')
        .populate('sellers.sellerId', 'username businessName email')
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .maxTimeMS(5000) // 5 second timeout for admin
        .lean(); // Use lean for better performance
      
    } catch (queryError) {
      console.error('âŒ MongoDB Query Error:', queryError);
      
      // Fallback for admin - return empty array with error message
      return res.status(200).json({
        products: [],
        totalPages: 1,
        currentPage: parseInt(page),
        total: 0,
        error: 'Database query timeout - try reducing filters or page size',
        message: 'Query took too long, please try with fewer results'
      });
    }

    // Custom sorting for search results (relevance-based) - Admin
    if (search) {
      adminProducts = adminProducts.sort((a, b) => {
        const searchLower = search.toLowerCase();
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        
        // Exact match first
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;
        
        // Exact price match (for admin - useful for finding specific products)
        const searchPrice = parseFloat(search);
        if (!isNaN(searchPrice)) {
          if (a.price === searchPrice && b.price !== searchPrice) return -1;
          if (b.price === searchPrice && a.price !== searchPrice) return 1;
        }
        
        // Starts with search term
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
        if (bName.startsWith(searchLower) && !aName.startsWith(searchLower)) return 1;
        
        // Contains all search words
        const searchWords = searchLower.split(' ');
        const aMatches = searchWords.filter(word => aName.includes(word)).length;
        const bMatches = searchWords.filter(word => bName.includes(word)).length;
        
        if (aMatches !== bMatches) return bMatches - aMatches;
        
        // Same category as search term
        const aCategoryMatch = a.category?.toLowerCase().includes(searchLower);
        const bCategoryMatch = b.category?.toLowerCase().includes(searchLower);
        
        if (aCategoryMatch && !bCategoryMatch) return -1;
        if (bCategoryMatch && !aCategoryMatch) return 1;
        
        // Default sort by creation date
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    // Optimized count with timeout for admin
    let adminCount;
    try {
      adminCount = await Product.countDocuments(query).maxTimeMS(3000);
    } catch (countError) {
      console.error('âŒ Admin count query timeout:', countError);
      adminCount = adminProducts.length; // Use current page count as fallback
    }

    res.json({
      products: adminProducts,
      totalPages: Math.ceil(adminCount / limit),
      currentPage: page,
      total: adminCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'username email whatsappNo city country verificationStatus _id businessName phone');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Ensure admin can see all seller information
    if (product.seller) {
      // Use cached sellerInfo if available, otherwise populate from seller object
      if (!product.sellerInfo) {
        product.sellerInfo = {
          username: product.seller.username,
          email: product.seller.email,
          whatsappNo: product.seller.whatsappNo,
          city: product.seller.city,
          country: product.seller.country,
          verificationStatus: product.seller.verificationStatus,
          _id: product.seller._id,
          businessName: product.seller.businessName,
          phone: product.seller.phone
        };
      }
      
      // Keep full seller object for admin access
      product.sellerData = product.seller;
      console.log('âœ… Admin access - showing full seller info:', {
        sellerId: product.seller._id,
        username: product.seller.username,
        verificationStatus: product.seller.verificationStatus
      });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', authenticateAdmin, upload.array('images', 5), async (req, res) => {
  const tempFiles = [];
  
  try {
    // Ensure currency is always GBP for new products
    const productData = {
      ...req.body,
      currency: 'GBP',
      // Ensure numeric fields are properly converted
      price: parseFloat(req.body.price) || 0,
      shipping: parseFloat(req.body.shipping) || 0
    };
    
    // Parse features from JSON string if provided
    if (productData.features && typeof productData.features === 'string') {
      try {
        productData.features = JSON.parse(productData.features);
      } catch (parseError) {
        console.warn('âš ï¸ Failed to parse features JSON, using empty array:', parseError.message);
        productData.features = [];
      }
    } else if (!productData.features) {
      productData.features = [];
    }
    
    // Normalize category to prevent duplicates
    if (productData.category) {
      productData.category = normalizeCategoryName(productData.category);
    }
    
    console.log('ðŸ“¦ Creating product with data:', {
      name: productData.name,
      asin: productData.asin,
      sku: productData.sku,
      approvalStatus: productData.approvalStatus,
      imageFiles: req.files ? req.files.length : 0,
      fetchedImages: productData.fetchedImages ? JSON.parse(productData.fetchedImages).length : 0
    });
    
    // Handle image uploads to Cloudinary
    const imageUrls = [];
    
    // First, upload new files to Cloudinary (user-uploaded files take priority / come first)
    if (req.files && req.files.length > 0 && isCloudinaryConfigured()) {
      console.log(`ðŸ“¤ Uploading ${req.files.length} images to Cloudinary...`);
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        tempFiles.push(file.path);
        
        try {
          // Use timestamp suffix to guarantee each image gets a unique public_id
          const baseId = productData.asin || `product_${Date.now()}`;
          const publicId = i === 0 ? `${baseId}_img0_${Date.now()}` : `${baseId}_img${i}_${Date.now()}`;
          
          const cloudinaryResult = await uploadToCloudinary(file.path, publicId, 'products');
          imageUrls.push(cloudinaryResult.secure_url);
          
          console.log(`âœ… Uploaded image ${i + 1} to Cloudinary: ${cloudinaryResult.secure_url}`);
        } catch (uploadError) {
          console.error(`âŒ Failed to upload image ${i + 1} to Cloudinary:`, uploadError.message);
        }
      }
    }
    
    // Then, append any fetched images (from ASIN lookup) that weren't replaced by uploads
    if (productData.fetchedImages) {
      try {
        const fetchedImageUrls = JSON.parse(productData.fetchedImages);
        imageUrls.push(...fetchedImageUrls);
        console.log(`ðŸ“· Added ${fetchedImageUrls.length} fetched images from ASIN lookup`);
      } catch (parseError) {
        console.warn('âš ï¸ Failed to parse fetched images:', parseError.message);
      }
    }
    
    // Add all image URLs to product data
    if (imageUrls.length > 0) {
      productData.images = imageUrls;
      productData.image = imageUrls[0]; // Set first image as main image
    }
    
    // Clean up fetchedImages from productData as it's not needed in the database
    delete productData.fetchedImages;
    
    // Clean up empty string values that should be null for ObjectId fields
    if (productData.seller === '' || productData.seller === 'null' || productData.seller === 'undefined') {
      delete productData.seller;
    }

    // Block creation if ASIN already exists (any status including inactive)
    if (productData.asin && productData.asin.trim()) {
      const existingByAsin = await Product.findOne({
        asin: { $regex: new RegExp(`^${productData.asin.trim()}$`, 'i') }
      }).select('_id name status asin');

      if (existingByAsin) {
        return res.status(409).json({
          message: `A product with ASIN "${productData.asin.trim()}" already exists (${existingByAsin.status}): "${existingByAsin.name}". Each ASIN must be unique.`,
          existingProduct: {
            id: existingByAsin._id,
            name: existingByAsin.name,
            status: existingByAsin.status,
            asin: existingByAsin.asin
          }
        });
      }
    }

    const product = new Product(productData);
    await product.save();

    console.log('âœ… Product created successfully:', {
      id: product._id,
      name: product.name,
      price: product.price,
      shipping: product.shipping,
      asin: product.asin,
      sku: product.sku,
      approvalStatus: product.approvalStatus,
      images: product.images?.length || 0,
      cloudinaryImages: product.images?.filter(img => img.includes('cloudinary.com')).length || 0,
      fetchedImages: product.images?.filter(img => !img.includes('cloudinary.com')).length || 0
    });
    
    // Clear cache when new product is created
    fastProductsCache = null;
    cacheTimestamp = Date.now();
    console.log('ðŸ—‘ï¸ Cache cleared after product creation, new timestamp:', cacheTimestamp);
    console.log('ðŸ’° New product created with currency:', product.currency);
    console.log('ðŸ·ï¸ Product category normalized to:', product.category);
    
    res.status(201).json(product);
    
  } catch (error) {
    console.error('âŒ Error creating product:', error);
    res.status(400).json({ message: 'Error creating product', error: error.message });
  } finally {
    // Clean up temporary files
    tempFiles.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', filePath, cleanupError.message);
      }
    });
  }
});











// Get categories that have products with profit data (admin only)
router.get('/admin/categories-with-profit', authenticateAdmin, async (req, res) => {
  try {
    const { excludeId } = req.query;
    
    // Build aggregation pipeline to find categories with profit data
    const pipeline = [
      {
        $match: {
          $or: [
            { profitEvaluation: { $exists: true, $ne: null } },
            { profitCalculations: { $exists: true, $ne: null } },
            { platformComparison: { $exists: true, $ne: null, $not: { $size: 0 } } }
          ],
          ...(excludeId && { _id: { $ne: excludeId } })
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          sampleProducts: { $push: { name: '$name', price: '$price' } }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          sampleProducts: { $slice: ['$sampleProducts', 3] },
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ];
    
    const categories = await Product.aggregate(pipeline);
    
    res.json({
      categories,
      total: categories.length,
      success: true
    });
    
  } catch (error) {
    console.error('âŒ Error fetching categories with profit data:', error);
    res.status(500).json({ 
      message: 'Error fetching categories', 
      error: error.message,
      success: false
    });
  }
});

// Search products by ASIN (admin only) - for finding images
router.get('/admin/search-by-asin/:asin', authenticateAdmin, async (req, res) => {
  try {
    const { asin } = req.params;
    
    if (!asin || asin.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ASIN format. ASIN must be 10 characters.'
      });
    }

    // Find all products with this ASIN that have images
    const products = await Product.find({
      asin: asin.toUpperCase(),
      images: { $exists: true, $ne: [], $ne: null }
    })
    .select('_id name asin images category status')
    .limit(10)
    .lean();

    res.json({
      success: true,
      products: products,
      count: products.length
    });

  } catch (error) {
    console.error('âŒ Error searching products by ASIN:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products by ASIN',
      error: error.message
    });
  }
});

// Get products by category with profit data (admin only)
router.get('/admin/category/:category/with-profit', authenticateAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const { excludeId, exactMatch = 'true' } = req.query;
    
    // Build query to find products with profit data
    let query = {
      $or: [
        { profitEvaluation: { $exists: true, $ne: null } },
        { profitCalculations: { $exists: true, $ne: null } },
        { platformComparison: { $exists: true, $ne: null, $not: { $size: 0 } } }
      ]
    };
    
    // Add category filter
    if (category !== 'all') {
      if (exactMatch === 'true') {
        // Exact category match (case-insensitive)
        query.category = { $regex: `^${category}$`, $options: 'i' };
      } else {
        // Partial category match (case-insensitive)
        query.category = { $regex: category, $options: 'i' };
      }
    }
    
    // Exclude specific product if provided
    if (excludeId) {
      query._id = { $ne: excludeId };
    }
    
    const products = await Product.find(query)
      .select('name price category brand profitEvaluation profitCalculations platformComparison')
      .limit(50)
      .sort({ category: 1, updatedAt: -1 }) // Sort by category first, then by update time
      .lean();
    
    console.log(`âœ… Found ${products.length} products with profit data in category: ${category} (exactMatch: ${exactMatch})`);
    
    // Group products by category for better organization
    const productsByCategory = products.reduce((acc, product) => {
      const cat = product.category || 'Uncategorized';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(product);
      return acc;
    }, {});
    
    res.json({
      products,
      productsByCategory,
      total: products.length,
      category,
      exactMatch: exactMatch === 'true',
      success: true
    });
    
  } catch (error) {
    console.error('âŒ Error fetching category products with profit data:', error);
    res.status(500).json({ 
      message: 'Error fetching products', 
      error: error.message,
      success: false
    });
  }
});

// Test route to verify routing is working
router.get('/test-route', (req, res) => {
  console.log('ðŸ§ª Test route hit');
  res.json({ message: 'Test route working', timestamp: new Date().toISOString() });
});

// Move selected products to a new category (admin only) - MUST be before /:id route
router.put('/move-selected', authenticateAdmin, async (req, res) => {
  try {
    console.log('ðŸ”„ Move-selected endpoint hit');
    console.log('ðŸ”„ Request body:', req.body);
    console.log('ðŸ”„ Admin user:', req.admin?.username || req.admin?.email);
    
    const { productIds, newCategory } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      console.log('âŒ Invalid productIds:', productIds);
      return res.status(400).json({ 
        message: 'Product IDs array is required',
        success: false
      });
    }
    
    if (!newCategory || !newCategory.trim()) {
      console.log('âŒ Invalid newCategory:', newCategory);
      return res.status(400).json({ 
        message: 'New category is required',
        success: false
      });
    }
    
    const trimmedNewCategory = newCategory.trim();
    
    console.log(`ðŸ”„ Admin moving ${productIds.length} selected products to "${trimmedNewCategory}"`);
    console.log('ðŸ”„ Product IDs to move:', productIds);
    
    // Validate that all product IDs exist (include pending products for approval page)
    const productsToMove = await Product.find({ 
      _id: { $in: productIds },
      $or: [
        { status: 'active' },
        { status: 'pending' },
        { status: { $exists: false } },
        { approvalStatus: 'pending' },
        { approvalStatus: { $exists: false } }
      ]
    });
    
    console.log(`ðŸ”„ Found ${productsToMove.length} products to move:`, productsToMove.map(p => ({ id: p._id, name: p.name, category: p.category })));
    
    if (productsToMove.length === 0) {
      console.log('âŒ No products found with provided IDs');
      return res.status(404).json({ 
        message: 'No products found with the provided IDs. Products may not exist or may have been deleted.',
        updatedCount: 0,
        excelUpdatedCount: 0,
        success: false
      });
    }
    
    if (productsToMove.length !== productIds.length) {
      console.log(`âš ï¸ Warning: ${productIds.length - productsToMove.length} products were not found or not active`);
    }
    
    console.log(`ðŸ”„ Moving ${productsToMove.length} products (including pending) to category: ${trimmedNewCategory}`);
    
    // Update the selected products (include pending products)
    const moveResult = await Product.updateMany(
      { 
        _id: { $in: productsToMove.map(p => p._id) }
      },
      { $set: { category: trimmedNewCategory } }
    );
    
    console.log(`âœ… Update result:`, moveResult);
    console.log(`âœ… Modified count: ${moveResult.modifiedCount}`);
    
    // Verify the update worked
    const verifyProducts = await Product.find({ 
      _id: { $in: productsToMove.map(p => p._id) }
    }).select('_id name category');
    
    console.log('ðŸ” Verification - products after update:', verifyProducts.map(p => ({ id: p._id, name: p.name, category: p.category })));
    
    // Update related Excel products (if ExcelProduct model exists)
    let excelUpdatedCount = 0;
    try {
      const ExcelProduct = mongoose.model('ExcelProduct');
      
      // Get the original categories of the moved products
      const originalCategories = [...new Set(productsToMove.map(p => p.category))];
      
      // Update Excel products that match the moved products by name or other criteria
      for (const originalCategory of originalCategories) {
        const excelMoveResult = await ExcelProduct.updateMany(
          { category: originalCategory },
          { $set: { category: trimmedNewCategory } }
        );
        excelUpdatedCount += excelMoveResult.modifiedCount;
      }
      
      if (excelUpdatedCount > 0) {
        console.log(`ðŸ“Š Updated ${excelUpdatedCount} Excel products to category: ${trimmedNewCategory}`);
      }
      
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products to update or ExcelProduct model not found');
    }
    
    // Clear all caches to ensure updates appear everywhere
    productCache.clear();
    
    // Clear any other caches that might exist
    try {
      if (global.amazonsChoiceCache) {
        global.amazonsChoiceCache = null;
      }
      if (global.categoriesCache) {
        global.categoriesCache = null;
      }
    } catch (cacheError) {
      console.log('â„¹ï¸ Additional cache clearing completed');
    }
    
    const responseData = {
      message: `Successfully moved ${moveResult.modifiedCount} selected products to "${trimmedNewCategory}"`,
      updatedCount: moveResult.modifiedCount,
      movedCount: moveResult.modifiedCount, // Add this for frontend compatibility
      excelUpdatedCount: excelUpdatedCount,
      newCategory: trimmedNewCategory,
      movedProducts: productsToMove.map(p => ({ id: p._id, name: p.name })),
      success: true
    };
    
    console.log('ðŸ”„ Sending response:', responseData);
    
    res.json(responseData);
    
  } catch (error) {
    console.error('âŒ Error moving selected products:', error);
    res.status(500).json({ 
      message: 'Error moving selected products', 
      error: error.message,
      success: false
    });
  }
});

router.put('/:id', authenticateAdmin, upload.array('images', 5), async (req, res) => {
  const tempFiles = [];
  
  try {
    // Validate product ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('âŒ Invalid product ID format:', req.params.id);
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    
    // Get existing product
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      console.log('âŒ Product not found:', req.params.id);
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Handle image uploads to Cloudinary
    const newImageUrls = [];
    if (req.files && req.files.length > 0 && isCloudinaryConfigured()) {
      console.log(`ðŸ“¤ Uploading ${req.files.length} new images to Cloudinary...`);

      // Count how many existing images are being preserved so we offset the public_id index
      let existingCount = 0;
      if (req.body.existingImages) {
        try { existingCount = JSON.parse(req.body.existingImages).length; } catch (_) {}
      }

      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        tempFiles.push(file.path);
        
        try {
          // Use a timestamp-based suffix so new uploads never collide with existing Cloudinary assets
          const baseId = req.body.asin || existingProduct.asin || `product_${Date.now()}`;
          const slotIndex = existingCount + i; // offset by existing images
          const publicId = `${baseId}_img${slotIndex}_${Date.now()}`;
          
          const cloudinaryResult = await uploadToCloudinary(file.path, publicId, 'products');
          newImageUrls.push(cloudinaryResult.secure_url);
          
          console.log(`âœ… Uploaded image ${i + 1} to Cloudinary: ${cloudinaryResult.secure_url}`);
        } catch (uploadError) {
          console.error(`âŒ Failed to upload image ${i + 1} to Cloudinary:`, uploadError.message);
          // Continue with other images even if one fails
        }
      }
    }
    
    // Clean and validate variations data
    let cleanedVariations = req.body.variations;
    if (cleanedVariations) {
      cleanedVariations = cleanedVariations.map(variation => ({
        ...variation,
        options: variation.options.map(option => ({
          ...option,
          productId: option.productId && option.productId !== '' ? option.productId : null,
          images: option.images || [],
          price: option.price || null,
          stock: option.stock || null
        }))
      }));
    }

    // Prepare update data - only include fields that are actually being updated
    const updateData = {
      ...req.body,
      currency: 'GBP'
    };
    
    // Only update numeric fields if they are provided in the request
    if (req.body.price !== undefined) {
      updateData.price = parseFloat(req.body.price) || 0;
    }
    
    if (req.body.shipping !== undefined) {
      updateData.shipping = parseFloat(req.body.shipping) || 0;
    }
    
    // Add variations if provided
    if (cleanedVariations) {
      updateData.variations = cleanedVariations;
    }
    
    console.log('ðŸ“ Product update request:', {
      productId: req.params.id,
      requestBody: req.body,
      priceProvided: req.body.price !== undefined,
      shippingProvided: req.body.shipping !== undefined,
      updateData: {
        price: updateData.price,
        shipping: updateData.shipping,
        currency: updateData.currency
      }
    });
    
    // Parse features from JSON string if provided
    if (updateData.features && typeof updateData.features === 'string') {
      try {
        updateData.features = JSON.parse(updateData.features);
      } catch (parseError) {
        console.warn('âš ï¸ Failed to parse features JSON, keeping original:', parseError.message);
        // Keep existing features if parsing fails
        delete updateData.features;
      }
    }
    
    // Parse profitEvaluation from JSON string if provided
    if (updateData.profitEvaluation && typeof updateData.profitEvaluation === 'string') {
      try {
        updateData.profitEvaluation = JSON.parse(updateData.profitEvaluation);
      } catch (parseError) {
        console.warn('âš ï¸ Failed to parse profitEvaluation JSON, keeping original:', parseError.message);
        // Keep existing profitEvaluation if parsing fails
        delete updateData.profitEvaluation;
      }
    }
    
    // CRITICAL: Preserve approval status and Amazon's Choice flag if not explicitly provided
    // This prevents accidentally removing these flags when editing products
    if (updateData.approvalStatus === undefined && existingProduct.approvalStatus) {
      updateData.approvalStatus = existingProduct.approvalStatus;
    }
    
    if (updateData.isAmazonsChoice === undefined && existingProduct.isAmazonsChoice) {
      updateData.isAmazonsChoice = existingProduct.isAmazonsChoice;
    }
    
    if (updateData.status === undefined && existingProduct.status) {
      updateData.status = existingProduct.status;
    }
    
    // Handle images - combine existing images with new uploads
    let finalImageUrls = [];
    
    // First, add any existing images that should be preserved
    if (req.body.existingImages) {
      try {
        const existingImageUrls = JSON.parse(req.body.existingImages);
        finalImageUrls.push(...existingImageUrls);
        console.log(`ðŸ“· Preserved ${existingImageUrls.length} existing images`);
      } catch (parseError) {
        console.warn('âš ï¸ Failed to parse existing images JSON:', parseError.message);
      }
    }
    
    // Then, add any new images uploaded to Cloudinary
    if (newImageUrls.length > 0) {
      finalImageUrls.push(...newImageUrls);
      console.log(`ðŸ“¤ Added ${newImageUrls.length} new Cloudinary images`);
    }
    
    // Handle images - prioritize combined approach for FormData, fallback to direct array for JSON
    if (req.body.existingImages || newImageUrls.length > 0) {
      // FormData approach with file uploads
      updateData.images = finalImageUrls.filter(url => url && typeof url === 'string' && url.trim() !== '');
      if (updateData.images.length > 0) {
        updateData.image = updateData.images[0]; // Set first image as main image
        console.log(`âœ… Updated images via FormData. Total images: ${updateData.images.length}`);
        console.log(`ðŸ“¸ Final image URLs:`, updateData.images);
      }
    } else if (req.body.images && Array.isArray(req.body.images)) {
      // JSON approach - Frontend sent Cloudinary URLs directly (from Edit Product page without new uploads)
      updateData.images = req.body.images.filter(url => url && typeof url === 'string' && url.trim() !== '');
      if (updateData.images.length > 0) {
        updateData.image = updateData.images[0]; // Set first image as main image
        console.log(`âœ… Updated images from request body. Total images: ${updateData.images.length}`);
        console.log(`ðŸ“¸ Image URLs:`, updateData.images);
      }
    }
    
    // Normalize category to prevent duplicates
    if (updateData.category) {
      updateData.category = normalizeCategoryName(updateData.category);
      console.log('ðŸ·ï¸ Product category normalized to:', updateData.category);
    }
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log('âœ… Product updated successfully:', {
      id: product._id,
      name: product.name,
      price: product.price,
      shipping: product.shipping,
      updateDataShipping: updateData.shipping
    });

    // Clear cache when product is updated
    fastProductsCache = null;
    cacheTimestamp = Date.now();

    
    res.json(product);
    
  } catch (error) {
    console.error('âŒ Error updating product:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: validationErrors,
        error: error.message 
      });
    }
    
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid data format', 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message,
      errorType: error.name 
    });
  } finally {
    // Clean up temporary files
    tempFiles.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', filePath, cleanupError.message);
      }
    });
  }
});

// Update platform units for a product (admin only)
router.patch('/:id/platform-units', authenticateAdmin, async (req, res) => {
  try {
    const { platformUnits } = req.body;
    
    if (!platformUnits || isNaN(platformUnits) || platformUnits < 1) {
      return res.status(400).json({ message: 'Invalid platform units value' });
    }
    
    console.log('ðŸ“ Updating platform units for product:', req.params.id, 'to:', platformUnits);
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { platformUnits: parseInt(platformUnits) },
      { new: true, runValidators: true }
    );

    if (!product) {
      console.log('âŒ Product not found:', req.params.id);
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clear cache when platform units are updated
    fastProductsCache = null;
    cacheTimestamp = Date.now(); // Update timestamp to invalidate client cache
    console.log('ðŸ—‘ï¸ Cache cleared after platform units update, new timestamp:', cacheTimestamp);

    console.log('âœ… Platform units updated successfully:', product.name, 'units:', product.platformUnits);
    res.json({ 
      message: 'Platform units updated successfully', 
      platformUnits: product.platformUnits 
    });
  } catch (error) {
    console.error('âŒ Error updating platform units:', error);
    res.status(400).json({ message: 'Error updating platform units', error: error.message });
  }
});

router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update corresponding Excel products to reflect that main product is deleted
    try {
      await syncExcelProductsOnDelete(req.params.id);
    } catch (excelUpdateError) {
      console.error('âš ï¸ Excel product sync failed, but main product was deleted:', excelUpdateError);
      // Don't fail the main deletion if Excel update fails
    }

    // Clear cache when product is deleted
    fastProductsCache = null;
    cacheTimestamp = Date.now(); // Update timestamp to invalidate client cache
    console.log('ðŸ—‘ï¸ Cache cleared after product deletion, new timestamp:', cacheTimestamp);

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk import products from JSON
router.post('/bulk-import', authenticateAdmin, async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Invalid products array' });
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const productData of products) {
      try {
        // Check if product already exists
        const exists = await Product.findOne({ name: productData.name });
        if (exists) {
          skipped++;
          continue;
        }

        const product = new Product({
          name: productData.name || 'Unnamed Product',
          description: productData.description || '',
          price: parseFloat(productData.price) || 0,
          originalPrice: parseFloat(productData.originalPrice) || parseFloat(productData.price) || 0,
          discount: productData.discount || 0,
          category: productData.category || 'Uncategorized',
          subcategory: productData.subcategory || '',
          brand: productData.brand || '',
          images: Array.isArray(productData.images) ? productData.images : [productData.image || ''],
          rating: parseFloat(productData.rating) || 4.0,
          reviews: parseInt(productData.reviews) || 0,
          stock: parseInt(productData.stock) || 50,
          isAmazonsChoice: true, // All imported products are Amazon's Choice
          isBestSeller: productData.isBestSeller || false,
          status: 'active'
        });

        await product.save();
        imported++;
      } catch (err) {
        errors.push({ name: productData.name, error: err.message });
      }
    }

    res.json({
      message: 'Bulk import completed',
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin bulk import with seller assignment
router.post('/admin/bulk-import', authenticateAdmin, async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Invalid products array' });
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const productData of products) {
      try {
        // Check if product already exists by ASIN or name
        const exists = await Product.findOne({ 
          $or: [
            { asin: productData.asin },
            { name: productData.name }
          ]
        });
        
        if (exists) {
          skipped++;
          continue;
        }

        const product = new Product({
          name: productData.name || 'Unnamed Product',
          asin: productData.asin || '',
          description: productData.description || '',
          price: parseFloat(productData.price) || 0,
          originalPrice: parseFloat(productData.originalPrice) || parseFloat(productData.price) || 0,
          discount: productData.discount || 0,
          category: productData.category || 'Uncategorized',
          subcategory: productData.subcategory || '',
          brand: productData.brand || '',
          images: Array.isArray(productData.images) ? productData.images : [productData.image || ''],
          rating: parseFloat(productData.rating) || 4.0,
          reviews: parseInt(productData.reviews) || 0,
          stock: parseInt(productData.stock) || 0,
          marketplace: productData.marketplace || 'UK',
          currency: productData.currency || 'GBP',
          isAdminProduct: productData.isAdminProduct || true,
          isAmazonsChoice: productData.isAmazonsChoice || false,
          isBestSeller: productData.isBestSeller || false,
          isLatestDeal: productData.isLatestDeal || false,
          showOnHome: productData.showOnHome || false,
          status: productData.status || 'active',
          approvalStatus: productData.approvalStatus || 'approved',
          seller: productData.seller || null,
          listedBy: productData.listedBy || 'admin',
          listedAt: new Date()
        });

        await product.save();
        imported++;
      } catch (err) {
        errors.push({ name: productData.name, error: err.message });
      }
    }

    res.json({
      message: 'Bulk import completed',
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Seller product routes

// Get seller's own products
router.get('/seller/my-products', authenticateSeller, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    
    let query = { seller: req.seller._id };
    if (status) query.approvalStatus = status;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add new product by seller
router.post('/seller/add', authenticateSeller, async (req, res) => {
  try {
    if (!req.seller.canListProducts) {
      return res.status(403).json({ 
        message: 'You need to complete payment before listing products' 
      });
    }

    // CRITICAL FIX: Always fetch fresh seller data and cache it
    const Seller = (await import('../models/Seller.js')).default;
    const seller = await Seller.findById(req.seller._id);
    
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // Enhanced seller info for caching using fresh database data
    const enhancedSellerInfo = {
      username: seller.username,
      email: seller.email,
      whatsappNo: seller.whatsappNo,
      city: seller.city,
      country: seller.country,
      verificationStatus: seller.verificationStatus,
      _id: seller._id
    };

    const productData = {
      ...req.body,
      seller: req.seller._id,
      sellerInfo: enhancedSellerInfo, // Cache seller info
      isAdminProduct: false,
      approvalStatus: 'pending',
      status: 'pending'
    };

    const product = new Product(productData);
    await product.save();

    console.log('âœ… New seller product created with cached seller info:', {
      productId: product._id,
      sellerId: seller._id,
      sellerUsername: seller.username,
      sellerInfoCached: !!product.sellerInfo
    });

    res.status(201).json({
      message: 'Product submitted for approval',
      product
    });
  } catch (error) {
    console.error('âŒ Error creating seller product:', error);
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
});

// Update seller's product
router.put('/seller/:id', authenticateSeller, async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      seller: req.seller._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or you do not have permission to edit this product' });
    }

    // Prevent sellers from editing admin products
    if (product.isAdminProduct && !product.originalAdminProductId) {
      return res.status(403).json({ 
        message: 'Cannot edit admin products. Only admin can modify these products.' 
      });
    }

    // Prevent editing seller copies of admin products (they should edit their own copy)
    if (product.originalAdminProductId) {
      return res.status(403).json({ 
        message: 'This is a copy of an admin product. Changes to the original will not affect your listing.' 
      });
    }

    if (product.approvalStatus === 'approved') {
      return res.status(400).json({ 
        message: 'Cannot edit approved products. Contact admin for changes.' 
      });
    }

    // CRITICAL FIX: Always fetch fresh seller data and cache it
    const Seller = (await import('../models/Seller.js')).default;
    const seller = await Seller.findById(req.seller._id);
    
    if (!seller) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    // Enhanced seller info for caching using fresh database data
    const enhancedSellerInfo = {
      username: seller.username,
      email: seller.email,
      whatsappNo: seller.whatsappNo,
      city: seller.city,
      country: seller.country,
      verificationStatus: seller.verificationStatus,
      _id: seller._id
    };

    // Update product with seller info caching
    Object.assign(product, req.body);
    product.sellerInfo = enhancedSellerInfo; // Always cache fresh seller info
    await product.save();

    console.log('âœ… Seller product updated with cached seller info:', {
      productId: product._id,
      sellerId: seller._id,
      sellerUsername: seller.username,
      sellerInfoCached: !!product.sellerInfo
    });

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('âŒ Error updating seller product:', error);
    res.status(400).json({ message: 'Error updating product', error: error.message });
  }
});

// Delete seller's product
router.delete('/seller/:id', authenticateSeller, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      seller: req.seller._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// List admin products for sellers to add to their inventory
router.get('/admin/available', authenticateSeller, async (req, res) => {
  try {
    // Remove payment check - allow all sellers to browse products

    const { page = 1, limit = 100, search, category } = req.query;
    
    let query = { 
      isAdminProduct: true, 
      status: 'active',
      approvalStatus: 'approved'
    };
    
    let products;
    let totalProducts;
    
    if (search && search.trim()) {
      // Enhanced search functionality with multiple fields and prioritization
      const searchTerm = search.trim();
      const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      
      // Create multiple search conditions with different priorities
      const searchConditions = [
        // Priority 1: Exact ASIN match (highest priority)
        { asin: { $regex: new RegExp(`^${searchTerm}$`, 'i') } },
        
        // Priority 2: Exact SKU match
        { sku: { $regex: new RegExp(`^${searchTerm}$`, 'i') } },
        
        // Priority 3: ASIN starts with search term
        { asin: { $regex: new RegExp(`^${searchTerm}`, 'i') } },
        
        // Priority 4: SKU starts with search term
        { sku: { $regex: new RegExp(`^${searchTerm}`, 'i') } },
        
        // Priority 5: Product name starts with search term
        { name: { $regex: new RegExp(`^${searchTerm}`, 'i') } },
        
        // Priority 6: ASIN contains search term
        { asin: searchRegex },
        
        // Priority 7: SKU contains search term
        { sku: searchRegex },
        
        // Priority 8: Product name contains search term
        { name: searchRegex },
        
        // Priority 9: Brand contains search term
        { brand: searchRegex },
        
        // Priority 10: Category contains search term
        { category: searchRegex },
        
        // Priority 11: Description contains search term (if exists)
        { description: searchRegex }
      ];
      
      // Apply category filter if specified
      if (category && category !== 'all') {
        const categoryName = category.replace(/-/g, ' ');
        query.category = new RegExp(`^${categoryName}$`, 'i');
      }
      
      // Use aggregation pipeline for advanced search with scoring
      const pipeline = [
        {
          $match: {
            ...query,
            $or: searchConditions
          }
        },
        {
          $addFields: {
            searchScore: {
              $sum: [
                // Exact ASIN match (score: 100)
                { $cond: [{ $regexMatch: { input: "$asin", regex: new RegExp(`^${searchTerm}$`, 'i') } }, 100, 0] },
                
                // Exact SKU match (score: 95)
                { $cond: [{ $regexMatch: { input: "$sku", regex: new RegExp(`^${searchTerm}$`, 'i') } }, 95, 0] },
                
                // ASIN starts with (score: 90)
                { $cond: [{ $regexMatch: { input: "$asin", regex: new RegExp(`^${searchTerm}`, 'i') } }, 90, 0] },
                
                // SKU starts with (score: 85)
                { $cond: [{ $regexMatch: { input: "$sku", regex: new RegExp(`^${searchTerm}`, 'i') } }, 85, 0] },
                
                // Name starts with (score: 80)
                { $cond: [{ $regexMatch: { input: "$name", regex: new RegExp(`^${searchTerm}`, 'i') } }, 80, 0] },
                
                // ASIN contains (score: 70)
                { $cond: [{ $regexMatch: { input: "$asin", regex: searchRegex } }, 70, 0] },
                
                // SKU contains (score: 65)
                { $cond: [{ $regexMatch: { input: "$sku", regex: searchRegex } }, 65, 0] },
                
                // Name contains (score: 60)
                { $cond: [{ $regexMatch: { input: "$name", regex: searchRegex } }, 60, 0] },
                
                // Brand contains (score: 50)
                { $cond: [{ $regexMatch: { input: "$brand", regex: searchRegex } }, 50, 0] },
                
                // Category contains (score: 40)
                { $cond: [{ $regexMatch: { input: "$category", regex: searchRegex } }, 40, 0] },
                
                // Description contains (score: 30)
                { $cond: [{ $regexMatch: { input: "$description", regex: searchRegex } }, 30, 0] },
                
                // Boost for Amazon's Choice products
                { $cond: ["$isAmazonsChoice", 10, 0] },
                
                // Boost for products with images
                { $cond: [{ $gt: [{ $size: { $ifNull: ["$images", []] } }, 0] }, 5, 0] }
              ]
            }
          }
        },
        {
          $sort: { 
            searchScore: -1,  // Primary sort by relevance score
            isAmazonsChoice: -1,  // Secondary sort by Amazon's Choice
            createdAt: -1  // Tertiary sort by newest
          }
        },
        {
          $skip: (parseInt(page) - 1) * parseInt(limit)
        },
        {
          $limit: parseInt(limit)
        }
      ];
      
      products = await Product.aggregate(pipeline);
      
      // Get total count for pagination
      const countPipeline = [
        {
          $match: {
            ...query,
            $or: searchConditions
          }
        },
        {
          $count: "total"
        }
      ];
      
      const countResult = await Product.aggregate(countPipeline);
      totalProducts = countResult.length > 0 ? countResult[0].total : 0;
      
    } else {
      // No search term - use existing logic
      if (category && category !== 'all') {
        const categoryName = category.replace(/-/g, ' ');
        query.category = new RegExp(`^${categoryName}$`, 'i');
      }

      totalProducts = await Product.countDocuments(query);

      if (!category || category === 'all') {
        // For "all" category, use aggregation pipeline for random sampling
        const pipeline = [
          { $match: query },
          { $sample: { size: Math.min(parseInt(limit), totalProducts) } }
        ];
        
        if (parseInt(page) > 1) {
          products = await Product.find(query)
            .sort({ _id: 1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));
        } else {
          products = await Product.aggregate(pipeline);
        }
      } else {
        products = await Product.find(query)
          .sort({ createdAt: -1 })
          .limit(parseInt(limit))
          .skip((parseInt(page) - 1) * parseInt(limit));
      }
    }

    res.json({
      products,
      totalPages: Math.ceil(totalProducts / parseInt(limit)),
      currentPage: parseInt(page),
      totalProducts,
      limit: parseInt(limit),
      searchTerm: search || null
    });
  } catch (error) {
    console.error('Error fetching admin products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Search suggestions endpoint for admin products
router.get('/admin/search-suggestions', authenticateSeller, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    
    const searchTerm = q.trim();
    const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    
    // Get suggestions from different fields
    const suggestions = await Product.aggregate([
      {
        $match: {
          isAdminProduct: true,
          status: 'active',
          approvalStatus: 'approved',
          $or: [
            { asin: searchRegex },
            { sku: searchRegex },
            { name: searchRegex },
            { brand: searchRegex }
          ]
        }
      },
      {
        $project: {
          suggestions: [
            {
              $cond: [
                { $regexMatch: { input: "$asin", regex: searchRegex } },
                { text: "$asin", type: "asin", score: 100 },
                null
              ]
            },
            {
              $cond: [
                { $regexMatch: { input: "$sku", regex: searchRegex } },
                { text: "$sku", type: "sku", score: 95 },
                null
              ]
            },
            {
              $cond: [
                { $regexMatch: { input: "$name", regex: searchRegex } },
                { text: "$name", type: "name", score: 80 },
                null
              ]
            },
            {
              $cond: [
                { $regexMatch: { input: "$brand", regex: searchRegex } },
                { text: "$brand", type: "brand", score: 70 },
                null
              ]
            }
          ]
        }
      },
      {
        $unwind: "$suggestions"
      },
      {
        $match: {
          "suggestions": { $ne: null }
        }
      },
      {
        $group: {
          _id: "$suggestions.text",
          type: { $first: "$suggestions.type" },
          score: { $first: "$suggestions.score" }
        }
      },
      {
        $sort: { score: -1, _id: 1 }
      },
      {
        $limit: 8
      },
      {
        $project: {
          _id: 0,
          text: "$_id",
          type: 1
        }
      }
    ]);
    
    res.json({ suggestions });
  } catch (error) {
    console.error('Error fetching search suggestions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin routes for managing seller products

// Get products by seller ID for admin (add this endpoint)
router.get('/admin/seller/:sellerId', authenticateAdmin, async (req, res) => {
  try {
    const { sellerId } = req.params;
    
    const products = await Product.find({ seller: sellerId })
      .populate('seller', 'username email supplierId whatsappNo city country verificationStatus')
      .select('name price stock category marketplace currency approvalStatus status isAmazonsChoice createdAt images originalProductId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Error fetching seller products:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all seller listings for admin (both seller-created products and seller listings on admin products)
// Get all seller listings for admin (both seller-created products and seller listings on admin products)
// FIX: Optimized for M0 cluster with proper seller information
router.get('/admin/all-seller-listings', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = 'approved' } = req.query; // Reduced default to 10
    
    // ULTRA-OPTIMIZED: Fetch only what we need with minimal fields
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Only fetch approved seller products (not pending/rejected - those come from listing requests)
    if (status === 'approved' || status === 'all') {
      // PARALLEL QUERIES: Fetch both types at once with minimal fields
      const [sellerProducts, adminProductsWithSellers] = await Promise.all([
        // 1. Seller-created products (minimal fields, no populate)
        Product.find({
          isAdminProduct: false,
          approvalStatus: 'approved'
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .select('name price stock category images createdAt seller')
          .lean()
          .maxTimeMS(20000),
        
        // 2. Admin products with sellers (minimal fields)
        Product.find({
          isAdminProduct: true,
          'sellers.0': { $exists: true }
        })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .select('name price stock category images createdAt sellers')
          .lean()
          .maxTimeMS(20000)
      ]);
      
      // FAST: Get seller info in one batch query
      const sellerIds = [
        ...sellerProducts.map(p => p.seller).filter(Boolean),
        ...adminProductsWithSellers.flatMap(p => p.sellers?.map(s => s.sellerId) || [])
      ];
      
      const sellers = await Seller.find({ _id: { $in: sellerIds } })
        .select('username email supplierId whatsappNo city country verificationStatus')
        .lean()
        .maxTimeMS(10000);
      
      const sellerMap = {};
      sellers.forEach(s => {
        sellerMap[s._id.toString()] = s;
      });
      
      // Build listings array
      const allListings = [];
      
      // Add seller-created products
      sellerProducts.forEach(product => {
        const sellerInfo = sellerMap[product.seller?.toString()] || {};
        allListings.push({
          ...product,
          listingType: 'seller_created',
          seller: sellerInfo,
          sellerUsername: sellerInfo.username || 'Unknown',
          sellerEmail: sellerInfo.email || 'unknown'
        });
      });
      
      // Add admin product listings
      adminProductsWithSellers.forEach(product => {
        if (product.sellers && product.sellers.length > 0) {
          product.sellers.forEach(sellerEntry => {
            const sellerInfo = sellerMap[sellerEntry.sellerId?.toString()] || {};
            allListings.push({
              ...product,
              _id: `${product._id}_${sellerEntry.sellerId}`,
              originalProductId: product._id,
              listingType: 'admin_product_listing',
              seller: sellerInfo,
              sellerUsername: sellerInfo.username || sellerEntry.username || 'Unknown',
              sellerEmail: sellerInfo.email || sellerEntry.email || 'unknown',
              sellerPrice: sellerEntry.sellerPrice || sellerEntry.price,
              sellerStock: sellerEntry.stock,
              moq: sellerEntry.moq || 1,
              listedAt: sellerEntry.listedAt
            });
          });
        }
      });
      
      // Get total count (fast count query)
      const [sellerProductCount, adminProductCount] = await Promise.all([
        Product.countDocuments({
          isAdminProduct: false,
          approvalStatus: 'approved'
        }).maxTimeMS(10000),
        Product.countDocuments({
          isAdminProduct: true,
          'sellers.0': { $exists: true }
        }).maxTimeMS(10000)
      ]);
      
      const totalCount = sellerProductCount + adminProductCount;
      
      res.json({
        products: allListings,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        currentPage: parseInt(page),
        total: totalCount
      });
    } else {
      // Empty response for other statuses
      res.json({
        products: [],
        totalPages: 0,
        currentPage: parseInt(page),
        total: 0
      });
    }
  } catch (error) {
    console.error('âŒ Error fetching all seller listings:', error);
    
    // Better error handling for timeout errors
    if (error.message.includes('timeout') || error.name === 'MongoNetworkTimeoutError') {
      return res.status(504).json({ 
        message: 'Request timeout - please try again',
        error: 'Query took too long to execute',
        suggestion: 'Try reducing the limit parameter or contact support'
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/admin/approve/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: 'approved',
        status: 'active',
        isAmazonsChoice: true, // Automatically add to Amazon's Choice when approved
        approvedBy: req.admin._id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('seller', 'username email');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log(`âœ… Product approved and added to Amazon's Choice: ${product.name}`);

    // Clear cache when product approval status changes
    fastProductsCache = null;
    cacheTimestamp = Date.now(); // Update timestamp to invalidate client cache
    console.log('ðŸ—‘ï¸ Cache cleared after product approval, new timestamp:', cacheTimestamp);

    res.json({ message: 'Product approved and added to Amazon\'s Choice successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Seller bulk list products
router.post('/seller/bulk-list', authenticateSeller, async (req, res) => {
  try {
    const { products } = req.body;
    console.log('Bulk list request from seller:', req.seller.username, 'Products count:', products?.length);
    
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: 'Invalid products array' });
    }

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const productData of products) {
      try {
        console.log('Processing product:', productData.name, 'ASIN:', productData.asin);
        console.log('Product data marketplace:', productData.marketplace);
        console.log('Product data has rawData:', !!productData.rawData);
        if (productData.rawData && productData.rawData.marketplace) {
          console.log('RawData marketplace:', productData.rawData.marketplace);
        }
        console.log('All product data keys:', Object.keys(productData));
        console.log('Seller info:', { 
          username: req.seller.username, 
          city: req.seller.city, 
          country: req.seller.country,
          whatsappNo: req.seller.whatsappNo,
          verificationStatus: req.seller.verificationStatus 
        });
        
        // Check if seller already has this product (by name or ASIN if available)
        let existsQuery;
        if (productData.asin) {
          existsQuery = {
            $or: [
              { name: productData.name, seller: req.seller._id },
              { asin: productData.asin, seller: req.seller._id }
            ]
          };
        } else {
          existsQuery = { name: productData.name, seller: req.seller._id };
        }
        
        const exists = await Product.findOne(existsQuery);
        console.log('Product exists check:', !!exists);
        
        if (exists) {
          console.log('Product already exists, skipping:', productData.name);
          skipped++;
          continue;
        }

        // Clean product data to avoid conflicts
        const cleanProductData = { ...productData };
        delete cleanProductData.rawData; // Remove rawData to avoid conflicts
        
        const product = new Product({
          ...cleanProductData,
          seller: req.seller._id,
          isAdminProduct: false,
          listedBy: 'seller',
          listedAt: new Date(),
          // Set approval status based on seller verification
          approvalStatus: req.seller.verificationStatus === 'approved' ? 'approved' : 'pending',
          status: req.seller.verificationStatus === 'approved' ? 'active' : 'pending',
          // Cache seller info for performance
          sellerInfo: {
            businessName: req.seller.username,
            whatsappNo: req.seller.whatsappNo,
            city: req.seller.city || 'Not specified',
            country: req.seller.country || 'Not specified',
            verificationStatus: req.seller.verificationStatus
          }
        });

        await product.save();
        console.log('Product saved successfully:', productData.name);
        console.log('Saved product sellerInfo:', product.sellerInfo);
        console.log('Saved product seller ID:', product.seller);
        console.log('Saved product marketplace:', product.marketplace);
        imported++;
      } catch (err) {
        console.error('Error saving product:', productData.name, err.message);
        errors.push({ name: productData.name, error: err.message });
      }
    }

    console.log('Bulk listing completed:', { imported, skipped, errors: errors.length });
    res.json({
      message: 'Bulk listing completed',
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update seller product stock and price
router.put('/seller/update-inventory/:id', authenticateSeller, async (req, res) => {
  try {
    const { price, stock, sellerPrice } = req.body;
    const productId = req.params.id;

    console.log('ðŸ”„ Seller updating inventory:', {
      productId,
      sellerId: req.seller._id,
      price,
      stock,
      sellerPrice
    });

    // Find the product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if seller has listed this product
    const query = {
      _id: productId,
      $or: [
        { seller: req.seller._id }, // Primary seller (backward compatibility)
        { 'sellers.sellerId': req.seller._id } // Seller in sellers array
      ]
    };

    const productWithSeller = await Product.findOne(query);
    if (!productWithSeller) {
      return res.status(403).json({ message: 'You can only update products you have listed' });
    }

    // Update the product
    const updateData = {};
    
    // Update stock if provided
    if (stock !== undefined) {
      updateData.stock = parseInt(stock);
    }

    // Update main price if provided (for primary seller)
    if (price !== undefined && product.seller && product.seller.toString() === req.seller._id.toString()) {
      updateData.price = parseFloat(price);
    }

    // Update seller price in sellers array if seller is in the array
    const sellerIndex = product.sellers?.findIndex(s => s.sellerId.toString() === req.seller._id.toString());
    if (sellerIndex !== -1 && sellerPrice !== undefined) {
      updateData[`sellers.${sellerIndex}.sellerPrice`] = parseFloat(sellerPrice) || null;
    }

    // Update seller price in sellerInfo if this is the primary seller
    if (product.seller && product.seller.toString() === req.seller._id.toString() && sellerPrice !== undefined) {
      updateData['sellerInfo.sellerPrice'] = parseFloat(sellerPrice) || null;
    }

    // Apply updates
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true }
    );

    console.log('âœ… Product inventory updated:', {
      productId,
      sellerId: req.seller._id,
      updatedFields: updateData
    });

    res.json({
      message: 'Product inventory updated successfully',
      product: {
        _id: updatedProduct._id,
        name: updatedProduct.name,
        price: updatedProduct.price,
        stock: updatedProduct.stock,
        sellerPrice: sellerPrice
      }
    });

  } catch (error) {
    console.error('âŒ Error updating product inventory:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get seller's listed products with detailed info
router.get('/seller/listed-products', authenticateSeller, async (req, res) => {
  try {
    const { page = 1, limit = 50, status, marketplace, search, category } = req.query;
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // cap at 100
    const skip = (pageNum - 1) * limitNum;

    const sellerId = req.seller._id;

    // Build filters
    const searchFilter = search ? {
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { asin: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ]
    } : {};
    const categoryFilter = category ? { category: { $regex: category, $options: 'i' } } : {};

    const baseQuery = {
      'sellers.sellerId': sellerId,
      approvalStatus: 'approved',
      ...(marketplace && { marketplace }),
      ...searchFilter,
      ...categoryFilter
    };

    // Run seller fetch + counts + products all in parallel
    const [seller, totalApproved, products] = await Promise.all([
      Seller.findById(sellerId)
        .select('username email whatsappNo city country verificationStatus productListingRequests')
        .lean()
        .maxTimeMS(8000),
      Product.countDocuments(baseQuery).maxTimeMS(5000),
      Product.find(baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('name price stock category marketplace currency approvalStatus status isAmazonsChoice createdAt images asin sku sellers shipping')
        .lean()
        .maxTimeMS(15000)
    ]);

    // Listing requests from seller doc (no extra DB call)
    const allRequests = seller?.productListingRequests || [];
    const pendingRequests = allRequests.filter(r => r.status === 'pending_approval');
    const rejectedRequests = allRequests.filter(r => r.status === 'rejected');

    const counts = {
      total: totalApproved + pendingRequests.length + rejectedRequests.length,
      pending: pendingRequests.length,
      approved: totalApproved,
      rejected: rejectedRequests.length
    };

    // Process products â€” attach seller-specific info
    const processedProducts = products.map(product => {
      const sellerEntry = product.sellers?.find(
        s => s.sellerId.toString() === sellerId.toString()
      );
      return {
        ...product,
        sellerInfo: {
          username: seller.username,
          email: seller.email,
          whatsappNo: seller.whatsappNo,
          city: seller.city,
          country: seller.country,
          verificationStatus: seller.verificationStatus,
          _id: seller._id,
          ...(sellerEntry?.sellerPrice && {
            sellerPrice: sellerEntry.sellerPrice,
            sellerShipping: sellerEntry.sellerShipping || 0
          })
        },
        sellerMoq: sellerEntry?.moq || 1
      };
    });

    // Handle pending/rejected listing requests only when that tab is active
    let transformedRequests = [];
    const requestsToInclude = status === 'pending' ? pendingRequests
      : status === 'rejected' ? rejectedRequests
      : status === 'approved' ? []
      : [...pendingRequests, ...rejectedRequests]; // 'all'

    if (requestsToInclude.length > 0 && status !== 'approved') {
      const productIds = requestsToInclude.map(r => r.productId).filter(Boolean);
      const adminProducts = await Product.find({ _id: { $in: productIds } })
        .select('name category marketplace images asin')
        .lean()
        .maxTimeMS(8000);

      const adminProductMap = {};
      adminProducts.forEach(p => { adminProductMap[p._id.toString()] = p; });

      transformedRequests = requestsToInclude.map(request => {
        const adminProduct = adminProductMap[request.productId?.toString()];
        if (!adminProduct) return null;
        return {
          _id: `request_${request._id}`,
          name: request.productName || adminProduct.name,
          price: request.sellerPrice,
          shipping: request.sellerShipping || 0,
          stock: 0,
          category: adminProduct.category,
          marketplace: adminProduct.marketplace || 'UK',
          currency: 'GBP',
          approvalStatus: request.status === 'pending_approval' ? 'pending' : 'rejected',
          status: 'inactive',
          isAmazonsChoice: false,
          createdAt: request.submittedAt,
          images: adminProduct.images,
          asin: adminProduct.asin,
          isListingRequest: true,
          originalRequestId: request._id,
          rejectionReason: request.rejectionReason,
          rejectedAt: request.rejectedAt,
          sellerMoq: request.moq || 1,
          sellerInfo: { username: seller.username, _id: seller._id }
        };
      }).filter(Boolean);
    }

    // For non-approved tabs, combine and paginate in memory (small sets)
    let finalProducts = processedProducts;
    let totalPages = Math.ceil(totalApproved / limitNum);

    if (status !== 'approved' && transformedRequests.length > 0) {
      const combined = [...processedProducts, ...transformedRequests]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const totalItems = status === 'pending' ? pendingRequests.length
        : status === 'rejected' ? rejectedRequests.length
        : counts.total;
      finalProducts = combined.slice(0, limitNum);
      totalPages = Math.ceil(totalItems / limitNum);
    }

    res.json({
      products: finalProducts,
      counts,
      total: totalApproved,
      page: pageNum,
      totalPages
    });
  } catch (error) {
    console.error('âŒ Error fetching seller listed products:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
      products: [],
      counts: { total: 0, pending: 0, approved: 0, rejected: 0 }
    });
  }
});

// DEPRECATED: Direct listing route - now requires admin approval
// Use /sellers/request-admin-product-listing instead
router.post('/seller/list-admin-product', authenticateSeller, async (req, res) => {
  try {
    console.log('âš ï¸ DEPRECATED: Direct listing attempt blocked via products route - admin approval required');
    
    return res.status(403).json({
      success: false,
      message: 'Direct product listing is no longer allowed. Please use the request system instead.',
      error: 'DIRECT_LISTING_DISABLED',
      redirectTo: '/sellers/request-admin-product-listing',
      instructions: 'All product listings now require admin approval. Please submit a request instead.'
    });
  } catch (error) {
    console.error('Deprecated list admin product error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reject seller product
router.put('/admin/reject/:id', authenticateAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: 'rejected',
        status: 'inactive',
        rejectionReason: reason
      },
      { new: true }
    ).populate('seller', 'username email');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clear cache when product is rejected
    fastProductsCache = null;
    cacheTimestamp = Date.now(); // Update timestamp to invalidate client cache
    console.log('ðŸ—‘ï¸ Cache cleared after product rejection, new timestamp:', cacheTimestamp);

    res.json({ message: 'Product rejected', product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get product images separately for better performance
router.get('/public/images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id)
      .select('images')
      .lean();
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ images: product.images || [] });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete all products in a category (admin only) - Enhanced with comprehensive updates
router.delete('/category/:categoryValue', authenticateAdmin, async (req, res) => {
  try {
    const { categoryValue } = req.params;
    
    console.log(`ðŸ—‘ï¸ Admin deleting all products in category: ${categoryValue}`);
    
    // Find all products in this category
    const productsToDelete = await Product.find({ category: categoryValue });
    
    if (productsToDelete.length === 0) {
      return res.json({ 
        message: 'No products found in this category',
        deletedCount: 0,
        excelUpdatedCount: 0
      });
    }
    
    console.log(`ðŸ—‘ï¸ Found ${productsToDelete.length} products to delete in category: ${categoryValue}`);
    
    // Get product IDs for Excel sync
    const productIds = productsToDelete.map(p => p._id);
    
    // Update related Excel products first (if ExcelProduct model exists)
    let excelUpdatedCount = 0;
    try {
      // Check if any Excel products are linked to these main products
      const ExcelProduct = mongoose.model('ExcelProduct');
      
      // Update Excel products that were converted from these main products
      const excelUpdateResult = await ExcelProduct.updateMany(
        { mainProductId: { $in: productIds } },
        {
          $set: {
            isConverted: false,
            status: 'pending',
            convertedAt: null
          },
          $unset: {
            mainProductId: 1
          }
        }
      );
      
      excelUpdatedCount = excelUpdateResult.modifiedCount;
      
      if (excelUpdatedCount > 0) {
        console.log(`ðŸ“Š Updated ${excelUpdatedCount} Excel products after category deletion`);
      }
      
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products to update or ExcelProduct model not found');
    }
    
    // Delete all products in the category
    const deleteResult = await Product.deleteMany({ category: categoryValue });
    
    console.log(`âœ… Deleted ${deleteResult.deletedCount} products from category: ${categoryValue}`);
    
    // Clear all caches to ensure updates appear everywhere
    productCache.clear();
    
    // Clear any other caches that might exist
    try {
      // Clear Amazon's Choice cache if it exists
      if (global.amazonsChoiceCache) {
        global.amazonsChoiceCache = null;
      }
      
      // Clear categories cache if it exists
      if (global.categoriesCache) {
        global.categoriesCache = null;
      }
    } catch (cacheError) {
      console.log('â„¹ï¸ Additional cache clearing completed');
    }
    
    res.json({
      message: `Successfully deleted category "${categoryValue}" with ${deleteResult.deletedCount} products`,
      deletedCount: deleteResult.deletedCount,
      excelUpdatedCount: excelUpdatedCount,
      categoryValue: categoryValue,
      success: true
    });
    
  } catch (error) {
    console.error('âŒ Error deleting products by category:', error);
    res.status(500).json({ 
      message: 'Error deleting products by category', 
      error: error.message,
      success: false
    });
  }
});

// Rename a category (admin only) - Updates all products and Excel products
router.put('/category/:oldCategoryValue/rename', authenticateAdmin, async (req, res) => {
  try {
    const { oldCategoryValue } = req.params;
    const { newCategoryName } = req.body;
    
    if (!newCategoryName || !newCategoryName.trim()) {
      return res.status(400).json({ 
        message: 'New category name is required',
        success: false
      });
    }
    
    const trimmedNewName = newCategoryName.trim();
    
    console.log(`ðŸ·ï¸ Admin renaming category: "${oldCategoryValue}" â†’ "${trimmedNewName}"`);
    
    // Check if the new category name already exists (case-insensitive)
    const existingCategory = await Product.findOne({ 
      category: { $regex: `^${trimmedNewName}$`, $options: 'i' }
    });
    
    if (existingCategory && existingCategory.category.toLowerCase() !== oldCategoryValue.toLowerCase()) {
      return res.status(400).json({
        message: `Category "${trimmedNewName}" already exists. Please choose a different name.`,
        success: false,
        existingCategory: existingCategory.category
      });
    }
    
    // Find all products in the old category
    const productsToUpdate = await Product.find({ category: oldCategoryValue });
    
    if (productsToUpdate.length === 0) {
      return res.json({ 
        message: 'No products found in this category',
        updatedCount: 0,
        excelUpdatedCount: 0,
        success: true
      });
    }
    
    console.log(`ðŸ·ï¸ Found ${productsToUpdate.length} products to rename in category: ${oldCategoryValue}`);
    
    // Update all products in the category
    const updateResult = await Product.updateMany(
      { category: oldCategoryValue },
      { $set: { category: trimmedNewName } }
    );
    
    console.log(`âœ… Updated ${updateResult.modifiedCount} products to new category: ${trimmedNewName}`);
    
    // Update related Excel products (if ExcelProduct model exists)
    let excelUpdatedCount = 0;
    try {
      const ExcelProduct = mongoose.model('ExcelProduct');
      
      // Update Excel products with the old category name
      const excelUpdateResult = await ExcelProduct.updateMany(
        { category: oldCategoryValue },
        { $set: { category: trimmedNewName } }
      );
      
      excelUpdatedCount = excelUpdateResult.modifiedCount;
      
      if (excelUpdatedCount > 0) {
        console.log(`ðŸ“Š Updated ${excelUpdatedCount} Excel products to new category: ${trimmedNewName}`);
      }
      
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products to update or ExcelProduct model not found');
    }
    
    // Clear all caches to ensure updates appear everywhere
    productCache.clear();
    
    // Clear any other caches that might exist
    try {
      if (global.amazonsChoiceCache) {
        global.amazonsChoiceCache = null;
      }
      if (global.categoriesCache) {
        global.categoriesCache = null;
      }
    } catch (cacheError) {
      console.log('â„¹ï¸ Additional cache clearing completed');
    }
    
    res.json({
      message: `Successfully renamed category "${oldCategoryValue}" to "${trimmedNewName}" (${updateResult.modifiedCount} products updated)`,
      updatedCount: updateResult.modifiedCount,
      excelUpdatedCount: excelUpdatedCount,
      oldCategoryValue: oldCategoryValue,
      newCategoryName: trimmedNewName,
      success: true
    });
    
  } catch (error) {
    console.error('âŒ Error renaming category:', error);
    res.status(500).json({ 
      message: 'Error renaming category', 
      error: error.message,
      success: false
    });
  }
});

// Move all products from one category to another (admin only)
router.put('/admin/categories/:oldCategoryValue/move', authenticateAdmin, async (req, res) => {
  try {
    const { oldCategoryValue } = req.params;
    const { newCategory, onlyActive = false } = req.body;
    
    if (!newCategory || !newCategory.trim()) {
      return res.status(400).json({ 
        message: 'New category is required',
        success: false
      });
    }
    
    const trimmedNewCategory = newCategory.trim();
    
    console.log(`ðŸ”„ Admin moving products: "${oldCategoryValue}" â†’ "${trimmedNewCategory}" (onlyActive: ${onlyActive})`);
    
    // First, find the actual category name in the database (case-insensitive)
    const actualCategoryName = await Product.findOne({
      category: { $regex: new RegExp(`^${oldCategoryValue}$`, 'i') }
    }).select('category');
    
    let sourceCategory = oldCategoryValue;
    if (actualCategoryName) {
      sourceCategory = actualCategoryName.category;
      console.log(`ðŸ” Found actual category name: "${sourceCategory}" (searched for: "${oldCategoryValue}")`);
    } else {
      console.log(`âš ï¸ No products found with category matching: "${oldCategoryValue}"`);
    }
    
    // Build query based on onlyActive parameter
    let query = { category: sourceCategory };
    if (onlyActive) {
      query.$or = [
        { status: 'active' },
        { status: { $exists: false } }
      ];
    }
    
    // Find products to move
    const productsToMove = await Product.find(query);
    
    if (productsToMove.length === 0) {
      return res.json({ 
        message: onlyActive ? `No active products found in source category "${sourceCategory}"` : `No products found in source category "${sourceCategory}"`,
        movedCount: 0,
        excelUpdatedCount: 0,
        searchedCategory: oldCategoryValue,
        actualCategory: sourceCategory,
        success: true
      });
    }
    
    console.log(`ðŸ”„ Found ${productsToMove.length} products to move from category: ${sourceCategory}`);
    
    // Update products
    const moveResult = await Product.updateMany(
      query,
      { $set: { category: trimmedNewCategory } }
    );
    
    console.log(`âœ… Moved ${moveResult.modifiedCount} products to category: ${trimmedNewCategory}`);
    
    // Update related Excel products (if ExcelProduct model exists)
    let excelUpdatedCount = 0;
    try {
      const ExcelProduct = mongoose.model('ExcelProduct');
      
      // Update Excel products with the old category name (case-insensitive)
      const excelMoveResult = await ExcelProduct.updateMany(
        { category: { $regex: new RegExp(`^${sourceCategory}$`, 'i') } },
        { $set: { category: trimmedNewCategory } }
      );
      
      excelUpdatedCount = excelMoveResult.modifiedCount;
      
      if (excelUpdatedCount > 0) {
        console.log(`ðŸ“Š Updated ${excelUpdatedCount} Excel products to category: ${trimmedNewCategory}`);
      }
      
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products to update or ExcelProduct model not found');
    }
    
    // Clear all caches to ensure updates appear everywhere
    productCache.clear();
    
    // Clear any other caches that might exist
    try {
      if (global.amazonsChoiceCache) {
        global.amazonsChoiceCache = null;
      }
      if (global.categoriesCache) {
        global.categoriesCache = null;
      }
    } catch (cacheError) {
      console.log('â„¹ï¸ Additional cache clearing completed');
    }
    
    res.json({
      message: `Successfully moved ${moveResult.modifiedCount} ${onlyActive ? 'active ' : ''}products from "${sourceCategory}" to "${trimmedNewCategory}"`,
      movedCount: moveResult.modifiedCount,
      excelUpdatedCount: excelUpdatedCount,
      searchedCategory: oldCategoryValue,
      actualCategory: sourceCategory,
      newCategory: trimmedNewCategory,
      onlyActive: onlyActive,
      success: true
    });
    
  } catch (error) {
    console.error('âŒ Error moving products between categories:', error);
    res.status(500).json({ 
      message: 'Error moving products between categories', 
      error: error.message,
      success: false
    });
  }
});

// Normalize category name to prevent duplicates during Excel import
function normalizeCategoryName(categoryName) {
  if (!categoryName) return '';
  
  const normalized = categoryName.trim();
  
  // Define category mapping to prevent duplicates
  const categoryMappings = {
    // Clothing variations
    'clothing': 'Clothing',
    'cloth': 'Clothing',
    'clothes': 'Clothing',
    
    // Automotive variations
    'automotive': 'Automotive',
    'automotives': 'Automotive',
    'auto': 'Automotive',
    
    // Remote control variations
    'remote': 'Remote Controls',
    'remotes': 'Remote Controls',
    'remote-controls': 'Remote Controls',
    'remote control': 'Remote Controls',
    'remote controls': 'Remote Controls',
    
    // Watch strap variations
    'watch strap': 'Watch Strap',
    'watchstrap': 'Watch Strap',
    'watch-strap': 'Watch Strap',
    'watch straps': 'Watch Strap',
    
    // Lampshade variations
    'lampshade': 'Lampshades',
    'lamp shade': 'Lampshades',
    'lamp-shade': 'Lampshades',
    
    // Car bulb variations
    'car bulb': 'Car Bulb',
    'carbulb': 'Car Bulb',
    'car-bulb': 'Car Bulb',
    'car bulbs': 'Car Bulb',
    
    // Electronics variations
    'electronic': 'Electronics',
    'electronics': 'Electronics',
    
    // Home variations
    'home': 'Home & Garden',
    'home & garden': 'Home & Garden',
    'home and garden': 'Home & Garden',
    'home-garden': 'Home & Garden',
    'home & decore': 'Home & Garden',
    'home decor': 'Home & Garden',
    
    // Accessories variations
    'accessory': 'Accessories',
    'accessories': 'Accessories',
    'accessorie': 'Accessories'
  };
  
  // Check for exact match (case-insensitive)
  const lowerNormalized = normalized.toLowerCase();
  if (categoryMappings[lowerNormalized]) {
    return categoryMappings[lowerNormalized];
  }
  
  // Return original with proper capitalization
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// Add category normalization middleware for Excel imports
router.use('/excel-import', (req, res, next) => {
  if (req.body && req.body.category) {
    req.body.category = normalizeCategoryName(req.body.category);
  }
  next();
});

// Fix Party Accessories category variations (admin only)
router.post('/admin/fix-party-accessories-category', authenticateAdmin, async (req, res) => {
  try {
    console.log('ðŸŽ‰ Fixing Party Accessories category variations...');
    
    const partyVariations = [
      'party-accessories',
      'party accessories', 
      'Party-accessories',
      'PARTY ACCESSORIES',
      'Party accessory',
      'party accessory',
      'Party-accessory', 
      'party-accessory',
      'Partyaccessories',
      'partyaccessories'
    ];
    
    // Update all party variations to "Party Accessories" in main products
    const mainUpdateResult = await Product.updateMany(
      { category: { $in: partyVariations } },
      { $set: { category: 'Party Accessories' } }
    );
    
    console.log(`âœ… Fixed ${mainUpdateResult.modifiedCount} main products`);
    
    // Update Excel products
    let excelUpdated = 0;
    try {
      const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
      const excelUpdateResult = await ExcelProduct.updateMany(
        { category: { $in: partyVariations } },
        { $set: { category: 'Party Accessories' } }
      );
      excelUpdated = excelUpdateResult.modifiedCount;
      console.log(`âœ… Fixed ${excelUpdated} Excel products`);
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products to update');
    }
    
    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();
    
    res.json({
      success: true,
      message: 'Successfully fixed Party Accessories category variations',
      updatedMainProducts: mainUpdateResult.modifiedCount,
      updatedExcelProducts: excelUpdated,
      totalUpdated: mainUpdateResult.modifiedCount + excelUpdated,
      fixedVariations: partyVariations
    });
    
  } catch (error) {
    console.error('âŒ Error fixing Party Accessories category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix Party Accessories category',
      error: error.message
    });
  }
});

// Clean up duplicate categories (admin only)
router.post('/admin/cleanup-duplicate-categories', authenticateAdmin, async (req, res) => {
  try {
    console.log('ðŸ§¹ Starting duplicate category cleanup...');
    
    // SPECIAL CASE: Fix Party Accessories variations first
    const partyVariations = [
      'party-accessories',
      'party accessories',
      'Party-accessories',
      'PARTY ACCESSORIES',
      'Party accessory',
      'party accessory',
      'Party-accessory',
      'party-accessory',
      'Partyaccessories',
      'partyaccessories'
    ];
    
    // Update all party variations to "Party Accessories"
    const partyUpdateResult = await Product.updateMany(
      { category: { $in: partyVariations } },
      { $set: { category: 'Party Accessories' } }
    );
    
    console.log(`ðŸŽ‰ Fixed ${partyUpdateResult.modifiedCount} Party Accessories products`);
    
    // Also update Excel products
    let partyExcelUpdated = 0;
    try {
      const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
      const partyExcelResult = await ExcelProduct.updateMany(
        { category: { $in: partyVariations } },
        { $set: { category: 'Party Accessories' } }
      );
      partyExcelUpdated = partyExcelResult.modifiedCount;
      console.log(`ðŸ“Š Fixed ${partyExcelUpdated} Party Accessories Excel products`);
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products to update for Party Accessories');
    }
    
    // Get all unique categories from products
    const allCategories = await Product.distinct('category');
    
    // Group categories by their normalized form
    const categoryGroups = {};
    const duplicateGroups = [];
    
    for (const category of allCategories) {
      const normalized = normalizeCategoryName(category);
      
      if (!categoryGroups[normalized]) {
        categoryGroups[normalized] = [];
      }
      categoryGroups[normalized].push(category);
    }
    
    // Find groups with duplicates
    for (const [normalized, categories] of Object.entries(categoryGroups)) {
      if (categories.length > 1) {
        duplicateGroups.push({
          normalized,
          duplicates: categories
        });
      }
    }
    
    console.log(`ðŸ” Found ${duplicateGroups.length} groups with duplicate categories`);
    
    let totalUpdated = partyUpdateResult.modifiedCount;
    const updateResults = [{
      normalizedCategory: 'Party Accessories',
      originalCategories: partyVariations,
      productsUpdated: partyUpdateResult.modifiedCount
    }];
    
    // Process each duplicate group
    for (const group of duplicateGroups) {
      const { normalized, duplicates } = group;
      
      // Skip if already processed (Party Accessories)
      if (normalized === 'Party Accessories' || duplicates.includes('Party Accessories')) {
        continue;
      }
      
      console.log(`ðŸ”„ Processing group: ${normalized}`);
      console.log(`   Duplicates: ${duplicates.join(', ')}`);
      
      // Update all products in this group to use the normalized category name
      const updateResult = await Product.updateMany(
        { category: { $in: duplicates } },
        { $set: { category: normalized } }
      );
      
      totalUpdated += updateResult.modifiedCount;
      
      updateResults.push({
        normalizedCategory: normalized,
        originalCategories: duplicates,
        productsUpdated: updateResult.modifiedCount
      });
      
      console.log(`âœ… Updated ${updateResult.modifiedCount} products to "${normalized}"`);
    }
    
    // Also update Excel products if they exist
    let excelUpdated = partyExcelUpdated;
    try {
      const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
      
      for (const group of duplicateGroups) {
        const { normalized, duplicates } = group;
        
        // Skip if already processed (Party Accessories)
        if (normalized === 'Party Accessories' || duplicates.includes('Party Accessories')) {
          continue;
        }
        
        const excelUpdateResult = await ExcelProduct.updateMany(
          { category: { $in: duplicates } },
          { $set: { category: normalized } }
        );
        
        excelUpdated += excelUpdateResult.modifiedCount;
      }
      
      console.log(`ðŸ“Š Updated ${excelUpdated} Excel products total`);
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products to update or Excel model not available');
    }
    
    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();
    
    res.json({
      success: true,
      message: `Successfully cleaned up duplicate categories. Fixed Party Accessories variations.`,
      totalProductsUpdated: totalUpdated,
      excelProductsUpdated: excelUpdated,
      partyAccessoriesFixed: partyUpdateResult.modifiedCount,
      duplicateGroups: duplicateGroups.length,
      updateResults: updateResults
    });
    
  } catch (error) {
    console.error('âŒ Error cleaning up duplicate categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clean up duplicate categories',
      error: error.message
    });
  }
});

// Debug endpoint for category filtering (public)
router.get('/public/debug/category/:categoryValue', async (req, res) => {
  try {
    const { categoryValue } = req.params;
    
    // Test the exact query logic used in the main products endpoint
    const categoryQuery = {
      $or: [
        { category: categoryValue }, // Exact match
        { category: { $regex: `^${categoryValue.replace(/-/g, ' ')}$`, $options: 'i' } }, // Convert dashes to spaces
        { category: { $regex: `^${categoryValue.replace(/-/g, '\\s+')}$`, $options: 'i' } } // Handle multiple spaces
      ]
    };
    
    // If category looks like a URL-friendly value, also try the proper case version
    if (categoryValue.includes('-')) {
      const properCase = categoryValue.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
      categoryQuery.$or.push({ category: properCase });
    }
    
    const query = {
      $and: [
        {
          $or: [
            { status: 'active' },
            { status: { $exists: false } }
          ]
        },
        // Ensure we don't show inactive products
        { status: { $ne: 'inactive' } }
      ],
      isAmazonsChoice: true,
      approvalStatus: 'approved', // Only approved products
      ...categoryQuery
    };
    
    const products = await Product.find(query).limit(10);
    const totalCount = await Product.countDocuments(query);
    
    // Also get all categories to show available options
    const allCategories = await Product.distinct('category');
    const matchingCategories = allCategories.filter(cat => 
      cat.toLowerCase().includes(categoryValue.toLowerCase()) ||
      categoryValue.toLowerCase().includes(cat.toLowerCase())
    );
    
    res.json({
      debug: true,
      searchedFor: categoryValue,
      query: query,
      totalFound: totalCount,
      sampleProducts: products.map(p => ({
        id: p._id,
        name: p.name,
        category: p.category,
        isAmazonsChoice: p.isAmazonsChoice,
        status: p.status
      })),
      allCategories: allCategories.sort(),
      matchingCategories: matchingCategories,
      suggestions: matchingCategories.length > 0 ? matchingCategories : ['No matching categories found']
    });
    
  } catch (error) {
    console.error('âŒ Debug endpoint error:', error);
    res.status(500).json({ 
      debug: true,
      error: error.message,
      searchedFor: req.params.categoryValue
    });
  }
});

// Delete all Party-Accessories products and related categories (admin only)
router.delete('/admin/delete-party-accessories', authenticateAdmin, async (req, res) => {
  try {
    console.log('ðŸ—‘ï¸ Deleting all Party-Accessories products...');
    
    const partyVariations = [
      'Party accessories',
      'party accessories',
      'Party-accessories',
      'party-accessories',
      'Party Accessories',
      'PARTY ACCESSORIES',
      'Party accessory',
      'party accessory',
      'Party-accessory',
      'party-accessory',
      'Partyaccessories',
      'partyaccessories',
      'Party',
      'party'
    ];
    
    // Delete from main Product collection
    const mainProductsResult = await Product.deleteMany({
      $or: [
        { category: { $in: partyVariations } },
        { category: { $regex: /party/i } }
      ]
    });
    
    console.log(`âœ… Deleted ${mainProductsResult.deletedCount} products from Product collection`);
    
    // Delete from ExcelProduct collection
    let excelProductsResult = { deletedCount: 0 };
    try {
      const ExcelProduct = require('../models/ExcelProduct');
      excelProductsResult = await ExcelProduct.deleteMany({
        $or: [
          { category: { $in: partyVariations } },
          { category: { $regex: /party/i } }
        ]
      });
      console.log(`âœ… Deleted ${excelProductsResult.deletedCount} products from ExcelProduct collection`);
    } catch (excelError) {
      console.log('â„¹ï¸ No Excel products to delete or Excel model not available');
    }
    
    // Clear cache
    productCache.clear();
    
    res.json({
      success: true,
      message: 'Successfully deleted all Party-Accessories products',
      deletedFromProducts: mainProductsResult.deletedCount,
      deletedFromExcelProducts: excelProductsResult.deletedCount,
      totalDeleted: mainProductsResult.deletedCount + excelProductsResult.deletedCount,
      note: 'You can now create new Party-Accessories products from approval page'
    });
    
  } catch (error) {
    console.error('âŒ Error deleting Party-Accessories products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Party-Accessories products',
      error: error.message
    });
  }
});

// Debug endpoint for Party-Accessories products (admin only)
router.get('/admin/debug/party-accessories', authenticateAdmin, async (req, res) => {
  try {
    console.log('ðŸŽ‰ Debugging Party-Accessories products...');
    
    // Find all products with Party-related categories
    const partyVariations = [
      'Party accessories',
      'party accessories',
      'Party-accessories',
      'party-accessories',
      'Party Accessories',
      'PARTY ACCESSORIES',
      'Party accessory',
      'party accessory',
      'Party-accessory',
      'party-accessory',
      'Partyaccessories',
      'partyaccessories',
      'Party',
      'party'
    ];
    
    // Get all products with any Party-related category
    const allPartyProducts = await Product.find({
      category: { $in: partyVariations }
    }).select('name category approvalStatus status isAmazonsChoice images asin createdAt');
    
    // Get products with regex match (case-insensitive)
    const regexPartyProducts = await Product.find({
      category: { $regex: /party/i }
    }).select('name category approvalStatus status isAmazonsChoice images asin createdAt');
    
    // Combine and deduplicate
    const allProductsMap = new Map();
    [...allPartyProducts, ...regexPartyProducts].forEach(p => {
      allProductsMap.set(p._id.toString(), p);
    });
    const allProducts = Array.from(allProductsMap.values());
    
    // Group by category name
    const categoryGroups = {};
    allProducts.forEach(product => {
      const cat = product.category || 'No Category';
      if (!categoryGroups[cat]) {
        categoryGroups[cat] = [];
      }
      categoryGroups[cat].push(product);
    });
    
    // Count by status
    const statusCounts = {
      total: allProducts.length,
      approved: allProducts.filter(p => p.approvalStatus === 'approved').length,
      pending: allProducts.filter(p => p.approvalStatus === 'pending').length,
      disapproved: allProducts.filter(p => p.approvalStatus === 'disapproved').length,
      noApprovalStatus: allProducts.filter(p => !p.approvalStatus).length,
      isAmazonsChoice: allProducts.filter(p => p.isAmazonsChoice === true).length,
      hasImages: allProducts.filter(p => p.images && p.images.length > 0).length,
      hasAsin: allProducts.filter(p => p.asin && p.asin.trim()).length,
      liveOnAmazonsChoice: allProducts.filter(p => 
        p.approvalStatus === 'approved' && 
        p.isAmazonsChoice === true && 
        p.images && p.images.length > 0 &&
        p.asin && p.asin.trim()
      ).length
    };
    
    // Get approved products that should be on Amazon's Choice
    const approvedProducts = allProducts.filter(p => p.approvalStatus === 'approved');
    
    // Get products that are live on Amazon's Choice
    const liveProducts = allProducts.filter(p => 
      p.approvalStatus === 'approved' && 
      p.isAmazonsChoice === true &&
      p.images && p.images.length > 0 &&
      p.asin && p.asin.trim()
    );
    
    // Get products that are approved but NOT showing on Amazon's Choice
    const approvedButNotLive = approvedProducts.filter(p => 
      !p.isAmazonsChoice || 
      !p.images || p.images.length === 0 ||
      !p.asin || !p.asin.trim()
    );
    
    res.json({
      success: true,
      summary: {
        totalPartyProducts: allProducts.length,
        uniqueCategoryNames: Object.keys(categoryGroups).length,
        categoryNames: Object.keys(categoryGroups).sort(),
        statusCounts: statusCounts
      },
      categoryBreakdown: Object.keys(categoryGroups).sort().map(catName => ({
        categoryName: catName,
        productCount: categoryGroups[catName].length,
        approved: categoryGroups[catName].filter(p => p.approvalStatus === 'approved').length,
        pending: categoryGroups[catName].filter(p => p.approvalStatus === 'pending').length,
        liveOnAmazonsChoice: categoryGroups[catName].filter(p => 
          p.approvalStatus === 'approved' && 
          p.isAmazonsChoice === true &&
          p.images && p.images.length > 0 &&
          p.asin && p.asin.trim()
        ).length
      })),
      approvedProducts: approvedProducts.map(p => ({
        id: p._id,
        name: p.name,
        category: p.category,
        approvalStatus: p.approvalStatus,
        isAmazonsChoice: p.isAmazonsChoice,
        hasImages: p.images && p.images.length > 0,
        imageCount: p.images ? p.images.length : 0,
        hasAsin: p.asin && p.asin.trim() ? true : false,
        asin: p.asin,
        status: p.status,
        createdAt: p.createdAt
      })),
      liveProducts: liveProducts.map(p => ({
        id: p._id,
        name: p.name,
        category: p.category,
        asin: p.asin,
        imageCount: p.images.length
      })),
      approvedButNotLive: approvedButNotLive.map(p => ({
        id: p._id,
        name: p.name,
        category: p.category,
        approvalStatus: p.approvalStatus,
        isAmazonsChoice: p.isAmazonsChoice,
        hasImages: p.images && p.images.length > 0,
        hasAsin: p.asin && p.asin.trim() ? true : false,
        reason: !p.isAmazonsChoice ? 'Missing isAmazonsChoice flag' :
                (!p.images || p.images.length === 0) ? 'No images' :
                (!p.asin || !p.asin.trim()) ? 'No ASIN' : 'Unknown'
      })),
      recommendations: [
        statusCounts.total > 0 && Object.keys(categoryGroups).length > 1 
          ? `âš ï¸ Found ${Object.keys(categoryGroups).length} different category names. Run consolidation endpoint.`
          : 'âœ… Category names are consistent.',
        approvedButNotLive.length > 0
          ? `âš ï¸ ${approvedButNotLive.length} approved products not showing on Amazon's Choice. Check missing fields.`
          : 'âœ… All approved products are live on Amazon\'s Choice.',
        statusCounts.pending > 0
          ? `â„¹ï¸ ${statusCounts.pending} products pending approval.`
          : 'âœ… No products pending approval.'
      ]
    });
    
  } catch (error) {
    console.error('âŒ Error debugging Party-Accessories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug Party-Accessories products',
      error: error.message
    });
  }
});

// Public endpoint to get a single product by ID (no auth required)
router.get('/public/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate product ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid product ID format' 
      });
    }

    // Find the product and populate seller information
    const product = await Product.findById(id)
      .populate('seller', 'username email whatsappNo city country verificationStatus _id')
      .populate('sellers.sellerId', 'username whatsappNo city country verificationStatus businessName')
      .lean();
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    console.log('ðŸ” Product seller info debug (public):', {
      productId: id,
      hasSeller: !!product.seller,
      hasSellerInfo: !!product.sellerInfo,
      sellersCount: product.sellers?.length || 0,
      sellerVerificationStatus: product.seller?.verificationStatus
    });

    // For public access, show all verified sellers in the sellers array
    if (product.sellers && product.sellers.length > 0) {
      // Filter to show only verified sellers and merge fresh data from populated sellerId
      product.sellers = product.sellers
        .filter(seller => seller.verificationStatus === 'approved')
        .map(seller => {
          if (seller.sellerId && typeof seller.sellerId === 'object') {
            return {
              ...seller,
              whatsappNo: seller.sellerId.whatsappNo || seller.whatsappNo,
              username: seller.sellerId.username || seller.username,
              city: seller.sellerId.city || seller.city,
              country: seller.sellerId.country || seller.country,
              listingCountries: seller.listingCountries || []
            };
          }
          return { ...seller, listingCountries: seller.listingCountries || [] };
        });
      console.log(`âœ… Showing ${product.sellers.length} verified sellers (public access)`);
    }

    // For backward compatibility, handle legacy seller field
    if (product.seller && (product.seller.verificationStatus === 'approved' || product.isAdminProduct)) {
      // Use cached sellerInfo if available, otherwise populate from seller object
      if (!product.sellerInfo) {
        product.sellerInfo = {
          username: product.seller.username,
          whatsappNo: product.seller.whatsappNo,
          city: product.seller.city,
          country: product.seller.country,
          verificationStatus: product.seller.verificationStatus,
          _id: product.seller._id
        };
        console.log('âœ… Added legacy seller info for verified seller (public access)');
      }
    } else {
      // Remove seller info for unverified sellers in public access
      delete product.sellerInfo;
      delete product.seller;
      console.log('âŒ Legacy seller info hidden for unverified seller (public access)');
    }

    res.json({
      success: true,
      ...product
    });
  } catch (error) {
    console.error('âŒ Error fetching product by ID:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// Seller endpoint to get a single product by ID (seller can see their own info)
router.get('/seller/detail/:id', authenticateSeller, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate product ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid product ID format' 
      });
    }

    // Find the product and populate seller information
    const product = await Product.findById(id)
      .populate('seller', 'username email whatsappNo city country verificationStatus _id')
      .lean();
    
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: 'Product not found' 
      });
    }

    console.log('ðŸ” Product seller info debug (seller access):', {
      productId: id,
      requestingSellerId: req.seller._id.toString(),
      productSellerId: product.seller?._id?.toString(),
      isOwnProduct: product.seller?._id?.toString() === req.seller._id.toString(),
      hasSeller: !!product.seller,
      hasSellerInfo: !!product.sellerInfo,
      sellersCount: product.sellers?.length || 0
    });

    // Show all sellers in the sellers array (sellers can see all sellers)
    if (product.sellers && product.sellers.length > 0) {
      // For seller access, show all sellers but hide emails for others
      product.sellers = product.sellers.map(seller => {
        if (seller.sellerId?.toString() === req.seller._id.toString()) {
          // Current seller can see their own full info
          return seller;
        } else {
          // Hide email for other sellers
          const { email, ...sellerWithoutEmail } = seller;
          return sellerWithoutEmail;
        }
      });
      console.log(`âœ… Showing ${product.sellers.length} sellers (seller access)`);
    }

    // Check if this seller owns the product (legacy field)
    const isOwnProduct = product.seller && product.seller._id.toString() === req.seller._id.toString();
    
    if (isOwnProduct) {
      // Seller can see their own full info
      if (!product.sellerInfo) {
        product.sellerInfo = {
          username: product.seller.username,
          email: product.seller.email,
          whatsappNo: product.seller.whatsappNo,
          city: product.seller.city,
          country: product.seller.country,
          verificationStatus: product.seller.verificationStatus,
          _id: product.seller._id
        };
      }
      console.log('âœ… Showing full seller info to product owner');
    } else if (product.seller && product.seller.verificationStatus === 'approved') {
      // For other sellers' products, only show limited info if verified
      if (!product.sellerInfo) {
        product.sellerInfo = {
          username: product.seller.username,
          whatsappNo: product.seller.whatsappNo,
          city: product.seller.city,
          country: product.seller.country,
          verificationStatus: product.seller.verificationStatus,
          _id: product.seller._id
        };
      } else {
        // Remove email from cached info for other sellers
        delete product.sellerInfo.email;
      }
      console.log('âœ… Showing limited seller info for verified seller');
    } else {
      // Hide seller info for unverified sellers or if no seller
      delete product.sellerInfo;
      delete product.seller;
      console.log('âŒ Seller info hidden for unverified seller');
    }

    res.json({
      success: true,
      ...product
    });
  } catch (error) {
    console.error('âŒ Error fetching product by ID (seller):', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

// DEPRECATED: Direct seller update route - now requires admin approval
// Use /sellers/request-admin-product-listing instead
router.put('/seller-update/:id', authenticateSeller, async (req, res) => {
  try {
    console.log('âš ï¸ DEPRECATED: Direct seller update attempt blocked - admin approval required');
    
    return res.status(403).json({
      success: false,
      message: 'Direct product updates are no longer allowed. Please use the request system instead.',
      error: 'DIRECT_UPDATE_DISABLED',
      redirectTo: '/sellers/request-admin-product-listing',
      instructions: 'All product listings now require admin approval. Please submit a new request instead of editing existing products.'
    });
  } catch (error) {
    console.error('Deprecated seller update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
