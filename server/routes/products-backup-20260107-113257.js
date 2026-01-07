import express from 'express';
import Product from '../models/Product.js';
import ExcelProduct from '../models/ExcelProduct.js';
import { authenticateAdmin, authenticateSeller } from '../middleware/auth.js';
import productCache from '../utils/productCache.js';
import { fallbackProducts } from '../data/fallbackProducts.js';
import { amazonChoiceFallbackProducts, getFilteredFallbackProducts } from '../data/amazonChoiceFallback.js';
import mongoose from 'mongoose';

const router = express.Router();

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
      console.log(`📊 Updated ${updateResult.modifiedCount} Excel products after main product deletion`);
    }
    
    return updateResult;
  } catch (error) {
    console.error('⚠️ Failed to update Excel products after main product deletion:', error);
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
    console.error('❌ Database query failed:', error.message);
    
    // Try cache first
    if (productCache.isFresh()) {
      // Only show cache usage in development
      if (process.env.NODE_ENV !== 'production') {
        console.log('📦 Using fresh cache data');
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
      $or: [{ status: 'active' }, { status: { $exists: false } }] 
    });
    
    const amazonsChoiceProducts = await Product.countDocuments({ 
      $or: [{ status: 'active' }, { status: { $exists: false } }],
      isAmazonsChoice: true 
    });
    
    const categoryCounts = await Product.aggregate([
      { 
        $match: { 
          $or: [{ status: 'active' }, { status: { $exists: false } }],
          isAmazonsChoice: true 
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
    const { includeCounts, includeExcel, includeEmpty } = req.query;
    
    // Get unique categories from main products
    const categoryFilter = includeEmpty === 'true' 
      ? { category: { $exists: true, $ne: null, $ne: '' } } // All products
      : { status: 'active', category: { $exists: true, $ne: null, $ne: '' } }; // Only active products
    
    const mainCategories = await Product.distinct('category', categoryFilter);
    
    // Also get categories from Excel products if requested
    let excelCategories = [];
    if (includeExcel === 'true') {
      try {
        const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
        excelCategories = await ExcelProduct.distinct('category', {
          category: { $exists: true, $ne: null, $ne: '' }
        });
        console.log('📂 Excel categories found:', excelCategories);
      } catch (excelError) {
        console.log('ℹ️ Excel model not available');
      }
    }
    
    // Combine and deduplicate categories
    const categories = [...new Set([...mainCategories, ...excelCategories])];
    console.log('📂 Combined categories:', categories);
    
    let formattedCategories;
    
    if (includeCounts === 'true') {
      // Get product counts for each category using exact category names (not transformed)
      const categoryCounts = await Product.aggregate([
        {
          $match: {
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
      
      const countMap = {};
      categoryCounts.forEach(item => {
        countMap[item._id] = item.count;
      });
      
      console.log('📊 Category counts from database:', countMap);
      
      // Get total count for "All" category
      const totalCount = await Product.countDocuments({ status: 'active' });
      
      formattedCategories = [
        { value: 'all', label: 'All', count: totalCount },
        ...categories.map(cat => ({
          value: cat.toLowerCase().replace(/\s+/g, '-'),
          label: cat,
          count: countMap[cat] || 0 // Use exact category name for count lookup
        }))
      ];
      
      console.log('📊 Final formatted categories with counts:', formattedCategories);
    } else {
      // Original format without counts
      formattedCategories = [
        { value: 'all', label: 'All' },
        ...categories.map(cat => ({
          value: cat.toLowerCase().replace(/\s+/g, '-'),
          label: cat
        }))
      ];
    }
    
    res.json({
      categories: formattedCategories,
      success: true
    });
    
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    
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
    
    const categoryName = category.trim();
    
    // Check if category already exists in ACTIVE main products only
    // (Don't check Excel products or inactive products)
    const existingActiveCategory = await Product.findOne({ 
      category: { $regex: new RegExp(`^${categoryName}$`, 'i') },
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
        category: { $regex: new RegExp(`^${categoryName}$`, 'i') }
      });
      hasExcelProducts = excelProductsCount > 0;
      
      if (hasExcelProducts) {
        console.log(`ℹ️ Found ${excelProductsCount} Excel products with category "${categoryName}"`);
        // Allow creation - Excel products can use this category
        return res.json({
          success: true,
          message: `Category "${categoryName}" is available (found in Excel products)`,
          category: {
            value: categoryName.toLowerCase().replace(/\s+/g, '-'),
            label: categoryName
          },
          existsInExcel: true
        });
      }
    } catch (excelError) {
      console.log('ℹ️ Excel model not available or no Excel products found');
    }
    
    // Create a placeholder product to establish the category
    const placeholderProduct = new Product({
      name: `${categoryName} - Category Placeholder`,
      price: 0,
      category: categoryName,
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
      value: categoryName.toLowerCase().replace(/\s+/g, '-'),
      label: categoryName
    };
    
    console.log(`✅ Category "${categoryName}" created successfully with placeholder product`);
    
    res.json({
      success: true,
      message: `Category "${categoryName}" created successfully`,
      category: newCategory
    });
    
  } catch (error) {
    console.error('❌ Error creating category:', error);
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
    
    console.log(`🏷️ Renaming category "${categoryName}" to "${trimmedNewName}"`);
    
    // Find the actual category name in the database (case-insensitive)
    const actualCategoryProduct = await Product.findOne({
      category: { $regex: new RegExp(`^${categoryName}$`, 'i') }
    }).select('category');
    
    let sourceCategoryName = categoryName;
    if (actualCategoryProduct) {
      sourceCategoryName = actualCategoryProduct.category;
      console.log(`🔍 Found actual category name: "${sourceCategoryName}" (searched for: "${categoryName}")`);
    }
    
    // Check if new category name already exists
    const existingCategory = await Product.findOne({ 
      category: { $regex: new RegExp(`^${trimmedNewName}$`, 'i') }
    });
    
    if (existingCategory && trimmedNewName.toLowerCase() !== sourceCategoryName.toLowerCase()) {
      return res.status(400).json({ 
        message: `Category "${trimmedNewName}" already exists. Please choose a different name.`,
        success: false
      });
    }
    
    // Update all products with this category (case-insensitive)
    const productUpdateResult = await Product.updateMany(
      { category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') } },
      { $set: { category: trimmedNewName } }
    );
    
    console.log(`✅ Updated ${productUpdateResult.modifiedCount} products from "${sourceCategoryName}" to "${trimmedNewName}"`);
    
    // Update Excel products if they exist
    let excelUpdateCount = 0;
    try {
      const ExcelProduct = (await import('../models/ExcelProduct.js')).default;
      const excelUpdateResult = await ExcelProduct.updateMany(
        { category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') } },
        { $set: { category: trimmedNewName } }
      );
      excelUpdateCount = excelUpdateResult.modifiedCount;
      console.log(`✅ Updated ${excelUpdateCount} Excel products from "${sourceCategoryName}" to "${trimmedNewName}"`);
    } catch (excelError) {
      console.log('ℹ️ No Excel products to update or Excel model not available');
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
    console.error('❌ Error renaming category:', error);
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
    
    console.log('🗑️ Smart category deletion for:', categoryName, force ? '(forced)' : '');
    
    // Find the actual category name in the database (case-insensitive)
    const actualCategoryProduct = await Product.findOne({
      category: { $regex: new RegExp(`^${categoryName}$`, 'i') }
    }).select('category');
    
    let sourceCategoryName = categoryName;
    if (actualCategoryProduct) {
      sourceCategoryName = actualCategoryProduct.category;
      console.log(`🔍 Found actual category name: "${sourceCategoryName}" (searched for: "${categoryName}")`);
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
      console.log('ℹ️ No Excel products found or Excel model not available');
    }
    
    console.log('📊 Category analysis:', {
      activeMainProducts: activeProducts.length,
      totalMainProducts: allProducts.length,
      pendingExcelProducts: pendingExcelProducts.length,
      listedExcelProducts: listedExcelProducts.length
    });
    
    // Smart deletion logic
    if (activeProducts.length === 0 && listedExcelProducts.length === 0) {
      // Category is empty of active/listed products - safe to delete
      console.log('✅ Category is empty of active/listed products - proceeding with deletion');
      
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
        console.log(`🗑️ Removed category from ${inactiveProducts.length} inactive main products`);
      }
      
      // Leave pending Excel products untouched - they keep their category for future conversion
      console.log(`ℹ️ Keeping category for ${pendingExcelProducts.length} pending Excel products`);
      
      res.json({ 
        message: `Category "${sourceCategoryName}" deleted successfully. ${activeProducts.length} active products deleted, ${pendingExcelProducts.length} pending Excel products preserved.`,
        deletedActiveProducts: activeProducts.length,
        preservedExcelProducts: pendingExcelProducts.length,
        removedFromInactiveProducts: inactiveProducts.length,
        success: true
      });
      
    } else if (force === 'true') {
      // Force deletion - delete everything including active products
      console.log('⚠️ Force deletion - removing all products');
      
      // Delete all active main products
      if (activeProducts.length > 0) {
        await Product.deleteMany({
          category: { $regex: new RegExp(`^${sourceCategoryName}$`, 'i') },
          status: 'active'
        });
        console.log(`🗑️ Deleted ${activeProducts.length} active main products`);
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
        console.log(`🗑️ Removed category from ${inactiveProducts.length} inactive main products`);
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
        console.log(`🗑️ Removed category from ${listedExcelProducts.length} listed Excel products`);
      }
      
      console.log(`ℹ️ Preserved ${pendingExcelProducts.length} pending Excel products`);
      
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
      const productList = activeProducts.slice(0, 5).map(p => `• ${p.name}`).join('\n');
      const moreProducts = activeProducts.length > 5 ? `\n• ... and ${activeProducts.length - 5} more` : '';
      
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
    console.error('❌ Error deleting category:', error);
    res.status(500).json({ 
      message: 'Error deleting category', 
      error: error.message,
      success: false
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
    console.error('❌ Error clearing cache:', error);
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
    console.error('❌ Error marking products as Amazon Choice:', error);
    res.status(500).json({ message: 'Error updating products', error: error.message });
  }
});

// Admin endpoint to mark ALL active products as Amazon Choice (emergency fix)
router.post('/admin/mark-all-amazons-choice', authenticateAdmin, async (req, res) => {
  try {
    const result = await Product.updateMany(
      { 
        $or: [{ status: 'active' }, { status: { $exists: false } }]
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
    console.error('❌ Error marking all products as Amazon Choice:', error);
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
    
    console.log(`🔄 Bulk update request: ${productIds.length} products, mode: ${updateMode}`);
    console.log('📝 Update data:', updateData);
    
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
        console.error(`❌ Error updating product ${productId}:`, error);
      }
    }
    
    // Clear cache after bulk update
    fastProductsCache = null;
    cacheTimestamp = Date.now();
    
    console.log(`✅ Bulk update completed: ${successCount} success, ${failCount} failed`);
    
    res.json({
      message: `Bulk update completed: ${successCount} successful, ${failCount} failed`,
      successCount,
      failCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({ message: 'Error performing bulk update', error: error.message });
  }
});

// Fast endpoint for 50 products (optimized)
router.get('/public/fast', async (req, res) => {
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
    let products;
    try {
      // Use aggregation for better diversity like the category endpoints
      products = await Product.aggregate([
        // Match active products
        { $match: { 
          $or: [
            { status: 'active' },
            { status: { $exists: false } }
          ]
        }},
        
        // Sample random products for diversity
        { $sample: { size: 50 } },
        
        // Project essential fields including profit data
        { $project: {
          name: 1,
          price: 1,
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
      console.error('❌ Fast aggregation failed:', error);
      
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
        
        products = await Product.find(fallbackQuery)
        .limit(50)
        .select('name price category brand images dealUnits currency rating reviews isAmazonsChoice isBestSeller profitCalculations profitEvaluation platformComparison showEvaluation asin variations')
        .lean()
        .maxTimeMS(3000);
        
      } catch (fallbackError) {
        console.error('❌ All queries failed, no products available');
        products = []; // Return empty array instead of fake products
      }
    }

    const responseTime = Date.now() - startTime;

    res.json({
      products,
      totalPages: 1,
      currentPage: 1,
      total: products.length,
      source: 'fast',
      responseTime,
      success: true,
      cacheVersion: Date.now() // Add cache version to help with client-side cache busting
    });
    
  } catch (error) {
    console.error('❌ Fast API error:', error);
    res.status(500).json({ 
      products: [],
      error: 'Server error',
      success: false
    });
  }
});

// Public endpoint for frontend (no auth required) - Enhanced with comprehensive fallbacks
router.get('/public', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      page = 1, 
      limit = 20, // Reduced from 200 to 20 for better performance
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

    // Simplified query structure for better performance
    let query = { 
      $or: [
        { status: 'active' },
        { status: { $exists: false } } // Include products without status field for backward compatibility
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
      const escapeRegex = (str) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };
      
      const escapedSearch = escapeRegex(search);
      const searchTerms = search.toLowerCase().split(' ').filter(term => term.length > 2);
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
        console.log('🔍 Public ID Search Debug:', {
          searchTerm: search,
          isValidObjectId,
          route: 'public'
        });
      }
      
      // Combine with existing query
      query = { ...query, ...searchQuery };
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
      
      console.log('🔍 Category filtering for:', decodedCategory, 'Query options:', categoryQuery.$or.length);
      
      query = { ...query, ...categoryQuery };
    }
    if (isAmazonsChoice === 'true') query.isAmazonsChoice = true;
    if (isBestSeller === 'true') query.isBestSeller = true;
    if (isLatestDeal === 'true') query.isLatestDeal = true;
    if (showOnHome === 'true') query.showOnHome = true;

    // Enhanced query execution with multiple fallback strategies
    let products;
    let querySource = 'database';
    
    try {
      
      // For Amazon's Choice products without search, use aggregation with random sampling
      if (isAmazonsChoice === 'true' && !search) {
        console.log('🎲 Using random sampling for Amazon\'s Choice products');
        
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
              variations: 1
            }
          }
        ];
        
        products = await Product.aggregate(pipeline);
        
        // Get total count for pagination (separate query for performance)
        const totalCount = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalCount / parseInt(limit));
        
        console.log(`✅ Random sampling successful: ${products.length} products (showing different order each time)`);
        
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
        .select('name description price originalPrice discount category brand images rating reviews stock dealUnits currency isAmazonsChoice isBestSeller seller isAdminProduct sellerInfo profitCalculations profitEvaluation platformComparison showEvaluation asin variations')
        .maxTimeMS(10000) // Increased timeout to 10 seconds
        .lean();
      
    } catch (queryError) {
      console.error('❌ Database query failed:', queryError.message);
      
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
      console.error('❌ Count query timeout:', countError.message);
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
    console.error('❌ Products API critical error:', error);
    
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
      .populate('seller', 'username whatsappNo city country verificationStatus');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Debug variations
    console.log('🎨 Product variations debug:', {
      productId: id,
      hasVariations: !!product.variations,
      variationsLength: product.variations?.length || 0,
      variations: product.variations
    });
    
    // Only return if product is active
    if (product.status !== 'active') {
      return res.status(404).json({ message: 'Product not available' });
    }

    // Include seller info only for verified sellers and only if product is from seller
    let productData = product.toObject();
    
    // Use cached sellerInfo if available, otherwise populate from seller object
    if (!productData.sellerInfo && product.seller && product.seller.verificationStatus === 'approved') {
      productData.sellerInfo = {
        whatsappNo: product.seller.whatsappNo,
        city: product.seller.city,
        country: product.seller.country,
        verificationStatus: product.seller.verificationStatus
      };
    }
    
    // Keep seller ID for admin access, but remove full seller object for security
    if (product.seller) {
      productData.seller = product.seller._id; // Keep only the ID
    } else {
      delete productData.seller;
      delete productData.sellerInfo;
    }
    
    res.json(productData);
  } catch (error) {
    console.error('Error fetching product by ID:', error);
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
    let products;
    let totalCount;
    
    try {
      // Get total count for pagination
      totalCount = await Product.countDocuments({});
      
      // Get paginated products
      products = await Product.find({})
        .skip(skip)
        .limit(limitNum)
        .select('name price category status createdAt dealUnits currency asin') // Minimal fields for speed including ASIN
        .sort({ createdAt: -1 })
        .maxTimeMS(5000) // Increased timeout for larger datasets
        .lean();
      
    } catch (error) {
      console.error('Fast admin query error:', error);
      products = [];
      totalCount = 0;
    }

    const totalPages = Math.ceil(totalCount / limitNum);
    const responseTime = Date.now() - startTime;

    res.json({
      products,
      totalPages,
      currentPage: pageNum,
      total: totalCount,
      source: 'fast_admin',
      responseTime,
      success: true
    });
    
  } catch (error) {
    console.error('❌ Fast admin API error:', error);
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

    let query = {};
    
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
      const searchTerms = search.toLowerCase().split(' ').filter(term => term.length > 2);
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
        console.log('🔍 ID Search Debug:', {
          searchTerm: search,
          isValidObjectId,
          queryStructure: JSON.stringify(searchQuery, null, 2)
        });
      }
      
      // Debug logging for ASIN searches
      if (search.length >= 3 && /^[A-Z0-9]+$/i.test(search)) {
        console.log('🏷️ ASIN Search Debug:', {
          searchTerm: search,
          isExactASIN: search.length === 10,
          upperCaseSearch: search.toUpperCase()
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

    console.log('🔍 Products query debug:', {
      search,
      category,
      status,
      excludeSellerCopies,
      finalQuery: JSON.stringify(query, null, 2)
    });

    let products;
    try {
      // Optimized admin query with timeout
      products = await Product.find(query)
        .populate('seller', 'businessName email')
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .maxTimeMS(5000) // 5 second timeout for admin
        .lean(); // Use lean for better performance
    } catch (queryError) {
      console.error('❌ MongoDB Query Error:', queryError);
      
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
      products = products.sort((a, b) => {
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
    let count;
    try {
      count = await Product.countDocuments(query).maxTimeMS(3000);
    } catch (countError) {
      console.error('❌ Admin count query timeout:', countError);
      count = products.length; // Use current page count as fallback
    }

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

router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'businessName email phone');
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', authenticateAdmin, async (req, res) => {
  try {
    // Ensure currency is always GBP for new products
    const productData = {
      ...req.body,
      currency: 'GBP'
    };
    
    const product = new Product(productData);
    await product.save();
    
    // Clear cache when new product is created
    fastProductsCache = null;
    cacheTimestamp = Date.now(); // Update timestamp to invalidate client cache
    console.log('🗑️ Cache cleared after product creation, new timestamp:', cacheTimestamp);
    console.log('💰 New product created with currency:', product.currency);
    
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
});

// Debug endpoint to check variations on a product
router.get('/variations/debug/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      productId: product._id,
      productName: product.name,
      hasVariations: !!product.variations,
      variationsCount: product.variations?.length || 0,
      variations: product.variations || [],
      linkedProducts: []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching variations', error: error.message });
  }
});

// Clean up broken variation links
router.post('/variations/cleanup', authenticateAdmin, async (req, res) => {
  try {
    console.log('🧹 Cleaning up broken variation links...');
    
    const products = await Product.find({ variations: { $exists: true, $ne: [] } });
    let cleanedCount = 0;

    for (const product of products) {
      let hasChanges = false;
      const cleanedVariations = [];

      for (const variation of product.variations) {
        const cleanedOptions = [];
        
        for (const option of variation.options) {
          if (option.productId) {
            // Check if linked product exists
            const linkedProduct = await Product.findById(option.productId);
            if (linkedProduct) {
              cleanedOptions.push(option);
            } else {
              console.log(`🗑️ Removing broken link: ${product.name} -> ${option.productId}`);
              hasChanges = true;
            }
          } else {
            cleanedOptions.push(option);
          }
        }

        if (cleanedOptions.length > 0) {
          cleanedVariations.push({
            ...variation,
            options: cleanedOptions
          });
        } else if (variation.options.length > 0) {
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await Product.findByIdAndUpdate(product._id, { variations: cleanedVariations });
        cleanedCount++;
      }
    }

    res.json({
      message: `Cleaned up ${cleanedCount} products with broken variation links`,
      cleanedCount
    });

  } catch (error) {
    console.error('❌ Error cleaning up variations:', error);
    res.status(500).json({ message: 'Error cleaning up variations', error: error.message });
  }
});

// Test endpoint to verify route is working
router.get('/variations/test/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.json({ 
      message: 'Route is working', 
      productId: req.params.id,
      productName: product?.name,
      hasVariations: !!product?.variations,
      variationsCount: product?.variations?.length || 0,
      variations: product?.variations || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Independent variations update endpoint (each product maintains its own variation settings)
router.put('/variations/independent/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log('🎨 Updating independent variations for product:', req.params.id);
    console.log('🎨 Request body:', JSON.stringify(req.body, null, 2));
    const { variations } = req.body;
    
    // Validate product ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    // Clean the variations data before sending
    const cleanedVariations = (variations || [])
      .filter(variation => variation.type && variation.name) // Only include valid variations
      .map(variation => ({
        type: variation.type,
        name: variation.name,
        options: variation.options
          .filter(option => option.value && option.value.trim() !== '') // Only include options with values
          .map(option => ({
            value: option.value.trim(),
            productId: option.productId && option.productId !== '' && option.productId !== 'null' ? option.productId : null,
            images: option.images || [],
            price: option.price || null,
            stock: option.stock || null
          }))
      }))
      .filter(variation => variation.options.length > 0); // Only include variations with options

    console.log('🎨 Cleaned variations data:', JSON.stringify(cleanedVariations, null, 2));

    // Update only the current product with its own variations
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { variations: cleanedVariations },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    console.log('✅ Product updated with independent variations:', updatedProduct.variations?.length || 0);

    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();

    console.log('✅ Independent variations updated successfully');
    res.json({
      message: 'Independent variations updated successfully',
      product: updatedProduct,
      variationsCount: cleanedVariations.length
    });

  } catch (error) {
    console.error('❌ Error updating independent variations:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message
    });
  }
});

// Enhanced bidirectional variations update endpoint with individual product configurations
router.put('/variations/enhanced/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log('🎨 Enhanced bidirectional variations update for product:', req.params.id);
    console.log('🎨 Request body:', JSON.stringify(req.body, null, 2));
    const { variations, currentProduct } = req.body;
    
    // Validate product ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    // Update the current product with variations
    console.log('💾 Saving variations to current product:', JSON.stringify(variations, null, 2));
    
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { variations: variations },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    console.log('✅ Current product updated. Variations saved:', updatedProduct.variations?.length || 0);

    // Process linked products with individual configurations
    let linkedProductsUpdated = 0;
    
    for (const variation of variations) {
      for (const option of variation.options || []) {
        if (option.productId && option.productId !== req.params.id) {
          try {
            console.log(`🔍 Processing linked product: ${option.productId}`);
            const linkedProduct = await Product.findById(option.productId);
            
            if (linkedProduct) {
              console.log(`✅ Found linked product: ${linkedProduct.name}`);
              
              // Create individual variation configuration for this linked product
              const linkedProductVariations = [{
                type: option.type || variation.type,
                name: option.customName || 'Custom',
                options: [
                  // Add the linked product itself as current product option (productId: null)
                  {
                    value: option.value, // Use the manually entered value for this linked product
                    productId: null, // This represents the current product (linked product)
                    images: linkedProduct.images || [],
                    price: linkedProduct.price || null,
                    stock: linkedProduct.stock || null
                  },
                  // Add the original product as a linked option
                  {
                    value: getCurrentProductVariationValueFromOptions(variation.options, req.params.id, updatedProduct.name, option.type || variation.type), // Use manually entered value if available
                    productId: req.params.id,
                    images: updatedProduct.images || [],
                    price: updatedProduct.price || null,
                    stock: updatedProduct.stock || null
                  }
                ]
              }];
              
              console.log(`📋 Setting individual variations for ${linkedProduct.name}:`, linkedProductVariations);
              
              // Update the linked product with its own variation configuration
              await Product.findByIdAndUpdate(
                option.productId,
                { variations: linkedProductVariations },
                { new: true, runValidators: true }
              );
              
              linkedProductsUpdated++;
              console.log(`✅ Updated ${linkedProduct.name} with individual variation settings`);
            }
          } catch (error) {
            console.error(`❌ Error updating linked product ${option.productId}:`, error);
          }
        }
      }
    }

    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();

    console.log(`✅ Enhanced bidirectional variations updated successfully. Updated ${linkedProductsUpdated} linked products.`);
    res.json({
      message: 'Enhanced bidirectional variations updated successfully',
      product: updatedProduct,
      linkedProducts: linkedProductsUpdated
    });

  } catch (error) {
    console.error('❌ Error updating enhanced bidirectional variations:', error);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message
    });
  }
});

// Helper function to detect variation value from product name
function detectVariationValue(productName, variationType) {
  const nameLower = productName.toLowerCase();
  
  if (variationType === 'color') {
    if (nameLower.includes('red')) return 'Red';
    if (nameLower.includes('blue')) return 'Blue';
    if (nameLower.includes('green')) return 'Green';
    if (nameLower.includes('black')) return 'Black';
    if (nameLower.includes('white')) return 'White';
    if (nameLower.includes('yellow')) return 'Yellow';
    if (nameLower.includes('orange')) return 'Orange';
    if (nameLower.includes('pink')) return 'Pink';
    if (nameLower.includes('purple')) return 'Purple';
    if (nameLower.includes('brown')) return 'Brown';
    if (nameLower.includes('grey') || nameLower.includes('gray')) return 'Grey';
    if (nameLower.includes('silver')) return 'Silver';
    if (nameLower.includes('gold')) return 'Gold';
    if (nameLower.includes('clear')) return 'Clear';
    return 'Default';
  } else if (variationType === 'size') {
    if (nameLower.includes('small')) return 'Small';
    if (nameLower.includes('medium')) return 'Medium';
    if (nameLower.includes('large')) return 'Large';
    if (nameLower.includes('xl')) return 'XL';
    if (nameLower.includes('xxl')) return 'XXL';
    return 'Standard';
  } else if (variationType === 'style') {
    if (nameLower.includes('classic')) return 'Classic';
    if (nameLower.includes('modern')) return 'Modern';
    if (nameLower.includes('vintage')) return 'Vintage';
    if (nameLower.includes('premium')) return 'Premium';
    if (nameLower.includes('deluxe')) return 'Deluxe';
    if (nameLower.includes('basic')) return 'Basic';
    if (nameLower.includes('dinosaur')) return 'Dinosaur';
    if (nameLower.includes('dolphin')) return 'Dolphin';
    if (nameLower.includes('shark')) return 'Shark';
    return 'Default';
  }
  
  return 'Default';
}

// Helper function to get current product's variation value from options (prioritizes manual entry)
function getCurrentProductVariationValueFromOptions(options, currentProductId, productName, variationType) {
  // First, try to find manually entered value for current product
  const currentProductOption = options?.find(option => 
    !option.productId || 
    option.productId === null || 
    option.productId === '' ||
    option.productId === currentProductId
  );
  
  if (currentProductOption && currentProductOption.value && currentProductOption.value.trim() !== '') {
    console.log(`🎯 Using manually entered value for current product: "${currentProductOption.value}"`);
    return currentProductOption.value;
  }
  
  // Fallback to auto-detection only if no manual value exists
  const detectedValue = detectVariationValue(productName, variationType);
  console.log(`🎯 Using auto-detected value as fallback: "${detectedValue}"`);
  return detectedValue;
}

// Bidirectional variations update endpoint
router.put('/variations/bidirectional/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log('🎨 Updating bidirectional variations for product:', req.params.id);
    console.log('🎨 Request body:', JSON.stringify(req.body, null, 2));
    const { variations, currentProduct } = req.body;
    
    // Validate product ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID format' });
    }

    // Update the current product with variations
    console.log('💾 Saving variations to current product:', JSON.stringify(variations, null, 2));
    
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { variations: variations },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    console.log('✅ Current product updated. Variations saved:', updatedProduct.variations?.length || 0);

    // Create bidirectional links for all linked products
    const linkedProductIds = [];
    variations.forEach(variation => {
      variation.options.forEach(option => {
        if (option.productId && option.productId !== req.params.id) {
          linkedProductIds.push({
            productId: option.productId,
            variationType: variation.type,
            variationName: variation.name,
            optionValue: option.value
          });
        }
      });
    });

    console.log('🔗 Found linked products to update:', linkedProductIds);

    // Update each linked product to include the current product as a variation
    for (const linkedInfo of linkedProductIds) {
      try {
        console.log(`🔍 Processing linked product: ${linkedInfo.productId}`);
        const linkedProduct = await Product.findById(linkedInfo.productId);
        if (linkedProduct) {
          console.log(`✅ Found linked product: ${linkedProduct.name}`);
          let linkedVariations = linkedProduct.variations || [];
          console.log(`📋 Current variations on ${linkedProduct.name}:`, linkedVariations);
          
          // Find the corresponding variation from the current product to get the manually entered value
          const currentVariation = variations.find(v => v.type === linkedInfo.variationType);
          
          // Find or create the variation type
          let variationIndex = linkedVariations.findIndex(v => v.type === linkedInfo.variationType);
          if (variationIndex === -1) {
            console.log(`➕ Creating new variation type: ${linkedInfo.variationType}`);
            // Create new variation type
            linkedVariations.push({
              type: linkedInfo.variationType,
              name: linkedInfo.variationName,
              options: []
            });
            variationIndex = linkedVariations.length - 1;
          } else {
            console.log(`🔄 Using existing variation type: ${linkedInfo.variationType}`);
          }

          // Check if current product is already in the options
          const existingOptionIndex = linkedVariations[variationIndex].options.findIndex(
            opt => opt.productId && opt.productId.toString() === req.params.id
          );

          if (existingOptionIndex === -1) {
            // First, ensure the linked product has a current product option (productId: null)
            const currentProductOptionIndex = linkedVariations[variationIndex].options.findIndex(
              opt => !opt.productId || opt.productId === null
            );
            
            if (currentProductOptionIndex === -1) {
              // Add current product option for the linked product itself
              const linkedProductValue = detectVariationValue(linkedProduct.name, linkedInfo.variationType);
              linkedVariations[variationIndex].options.push({
                value: linkedProductValue,
                productId: null, // Current product (linked product)
                images: linkedProduct.images || [],
                price: linkedProduct.price || null,
                stock: linkedProduct.stock || null
              });
              console.log(`🎯 Added current product option for ${linkedProduct.name}: "${linkedProductValue}"`);
            }
            
            // Then add the original product as a linked option
            let optionValue = getCurrentProductVariationValueFromOptions(currentVariation?.options, req.params.id, updatedProduct.name, linkedInfo.variationType);
            
            console.log(`🎨 Setting variation value: ${updatedProduct.name} → ${optionValue} (manual or detected)`);

            linkedVariations[variationIndex].options.push({
              value: optionValue,
              productId: req.params.id,
              images: updatedProduct.images || [],
              price: updatedProduct.price || null,
              stock: updatedProduct.stock || null
            });

            // Update the linked product
            const updatedLinkedProduct = await Product.findByIdAndUpdate(
              linkedInfo.productId,
              { variations: linkedVariations },
              { new: true, runValidators: true }
            );

            console.log(`✅ Added bidirectional link: ${linkedProduct.name} ↔ ${currentProduct.name}`);
            console.log(`📋 Final variations on ${linkedProduct.name}:`, updatedLinkedProduct.variations);
          } else {
            // Update existing option with latest data
            linkedVariations[variationIndex].options[existingOptionIndex] = {
              ...linkedVariations[variationIndex].options[existingOptionIndex],
              images: updatedProduct.images || [],
              price: updatedProduct.price || null,
              stock: updatedProduct.stock || null
            };

            const updatedLinkedProduct = await Product.findByIdAndUpdate(
              linkedInfo.productId,
              { variations: linkedVariations },
              { new: true, runValidators: true }
            );

            console.log(`🔄 Updated bidirectional link: ${linkedProduct.name} ↔ ${currentProduct.name}`);
            console.log(`📋 Updated variations on ${linkedProduct.name}:`, updatedLinkedProduct.variations);
          }
        }
      } catch (error) {
        console.error(`❌ Error updating linked product ${linkedInfo.productId}:`, error);
      }
    }

    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();

    console.log('✅ Bidirectional variations updated successfully');
    res.json({
      message: 'Bidirectional variations updated successfully',
      product: updatedProduct,
      linkedProducts: linkedProductIds.length
    });

  } catch (error) {
    console.error('❌ Error updating bidirectional variations:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    res.status(500).json({ 
      message: 'Internal server error', 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Get categories that have products with profit data (admin only)
router.get('/admin/categories-with-profit', authenticateAdmin, async (req, res) => {
  try {
    const { excludeId } = req.query;
    
    console.log('🔍 Fetching categories with profit data, excluding:', excludeId);
    
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
    
    console.log(`✅ Found ${categories.length} categories with profit data`);
    
    res.json({
      categories,
      total: categories.length,
      success: true
    });
    
  } catch (error) {
    console.error('❌ Error fetching categories with profit data:', error);
    res.status(500).json({ 
      message: 'Error fetching categories', 
      error: error.message,
      success: false
    });
  }
});

// Get products by category with profit data (admin only)
router.get('/admin/category/:category/with-profit', authenticateAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const { excludeId, exactMatch = 'true' } = req.query;
    
    console.log('🔍 Fetching products with profit data from category:', category, 'exactMatch:', exactMatch, 'excluding:', excludeId);
    
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
    
    console.log(`✅ Found ${products.length} products with profit data in category: ${category} (exactMatch: ${exactMatch})`);
    
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
    console.error('❌ Error fetching category products with profit data:', error);
    res.status(500).json({ 
      message: 'Error fetching products', 
      error: error.message,
      success: false
    });
  }
});

// Move selected products to a new category (admin only) - MUST be before /:id route
router.put('/move-selected', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔄 Move-selected endpoint hit');
    console.log('🔄 Request body:', req.body);
    console.log('🔄 Admin user:', req.admin?.username || req.admin?.email);
    
    const { productIds, newCategory } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      console.log('❌ Invalid productIds:', productIds);
      return res.status(400).json({ 
        message: 'Product IDs array is required',
        success: false
      });
    }
    
    if (!newCategory || !newCategory.trim()) {
      console.log('❌ Invalid newCategory:', newCategory);
      return res.status(400).json({ 
        message: 'New category is required',
        success: false
      });
    }
    
    const trimmedNewCategory = newCategory.trim();
    
    console.log(`🔄 Admin moving ${productIds.length} selected products to "${trimmedNewCategory}"`);
    console.log('🔄 Product IDs to move:', productIds);
    
    // Validate that all product IDs exist and are active
    const productsToMove = await Product.find({ 
      _id: { $in: productIds },
      $or: [
        { status: 'active' },
        { status: { $exists: false } }
      ]
    });
    
    console.log(`🔄 Found ${productsToMove.length} products to move:`, productsToMove.map(p => ({ id: p._id, name: p.name, category: p.category })));
    
    if (productsToMove.length === 0) {
      console.log('❌ No active products found with provided IDs');
      return res.json({ 
        message: 'No active products found with the provided IDs',
        updatedCount: 0,
        excelUpdatedCount: 0,
        success: true
      });
    }
    
    if (productsToMove.length !== productIds.length) {
      console.log(`⚠️ Warning: ${productIds.length - productsToMove.length} products were not found or not active`);
    }
    
    console.log(`🔄 Moving ${productsToMove.length} active products to category: ${trimmedNewCategory}`);
    
    // Update the selected products
    const moveResult = await Product.updateMany(
      { 
        _id: { $in: productsToMove.map(p => p._id) },
        $or: [
          { status: 'active' },
          { status: { $exists: false } }
        ]
      },
      { $set: { category: trimmedNewCategory } }
    );
    
    console.log(`✅ Update result:`, moveResult);
    console.log(`✅ Modified count: ${moveResult.modifiedCount}`);
    
    // Verify the update worked
    const verifyProducts = await Product.find({ 
      _id: { $in: productsToMove.map(p => p._id) }
    }).select('_id name category');
    
    console.log('🔍 Verification - products after update:', verifyProducts.map(p => ({ id: p._id, name: p.name, category: p.category })));
    
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
        console.log(`📊 Updated ${excelUpdatedCount} Excel products to category: ${trimmedNewCategory}`);
      }
      
    } catch (excelError) {
      console.log('ℹ️ No Excel products to update or ExcelProduct model not found');
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
      console.log('ℹ️ Additional cache clearing completed');
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
    
    console.log('🔄 Sending response:', responseData);
    
    res.json(responseData);
    
  } catch (error) {
    console.error('❌ Error moving selected products:', error);
    res.status(500).json({ 
      message: 'Error moving selected products', 
      error: error.message,
      success: false
    });
  }
});

router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log('📝 Updating product:', req.params.id);
    console.log('📝 Update data keys:', Object.keys(req.body));
    console.log('📝 Platform comparison:', req.body.platformComparison);
    console.log('📝 Profit calculations:', req.body.profitCalculations);
    console.log('📝 Profit evaluation:', req.body.profitEvaluation);
    console.log('💰 Save field:', req.body.save);
    console.log('🎨 Variations:', req.body.variations);
    
    // Log ASIN updates specifically
    if (req.body.asin !== undefined) {
      console.log('🏷️ ASIN update:', {
        productId: req.params.id,
        newASIN: req.body.asin,
        asinType: typeof req.body.asin
      });
    }
    
    // Validate product ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('❌ Invalid product ID format:', req.params.id);
      return res.status(400).json({ message: 'Invalid product ID format' });
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

    // Ensure currency is always GBP
    const updateData = {
      ...req.body,
      currency: 'GBP',
      ...(cleanedVariations && { variations: cleanedVariations })
    };
    
    console.log('🔍 Searching for product with ID:', req.params.id);
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      console.log('❌ Product not found:', req.params.id);
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clear cache when product is updated to ensure Amazon Choice page shows latest prices
    fastProductsCache = null;
    cacheTimestamp = Date.now(); // Update timestamp to invalidate client cache
    console.log('🗑️ Cache cleared after product update, new timestamp:', cacheTimestamp);

    console.log('✅ Product updated successfully:', product.name);
    console.log('💰 Updated profit data:', {
      platformComparison: product.platformComparison?.length || 0,
      profitCalculations: !!product.profitCalculations,
      profitEvaluation: !!product.profitEvaluation
    });
    res.json(product);
  } catch (error) {
    console.error('❌ Error updating product:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Update data that failed:', req.body);
    
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
  }
});

// Update platform units for a product (admin only)
router.patch('/:id/platform-units', authenticateAdmin, async (req, res) => {
  try {
    const { platformUnits } = req.body;
    
    if (!platformUnits || isNaN(platformUnits) || platformUnits < 1) {
      return res.status(400).json({ message: 'Invalid platform units value' });
    }
    
    console.log('📝 Updating platform units for product:', req.params.id, 'to:', platformUnits);
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { platformUnits: parseInt(platformUnits) },
      { new: true, runValidators: true }
    );

    if (!product) {
      console.log('❌ Product not found:', req.params.id);
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clear cache when platform units are updated
    fastProductsCache = null;
    cacheTimestamp = Date.now(); // Update timestamp to invalidate client cache
    console.log('🗑️ Cache cleared after platform units update, new timestamp:', cacheTimestamp);

    console.log('✅ Platform units updated successfully:', product.name, 'units:', product.platformUnits);
    res.json({ 
      message: 'Platform units updated successfully', 
      platformUnits: product.platformUnits 
    });
  } catch (error) {
    console.error('❌ Error updating platform units:', error);
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
      console.error('⚠️ Excel product sync failed, but main product was deleted:', excelUpdateError);
      // Don't fail the main deletion if Excel update fails
    }

    // Clear cache when product is deleted
    fastProductsCache = null;
    cacheTimestamp = Date.now(); // Update timestamp to invalidate client cache
    console.log('🗑️ Cache cleared after product deletion, new timestamp:', cacheTimestamp);

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

    const productData = {
      ...req.body,
      seller: req.seller._id,
      isAdminProduct: false,
      approvalStatus: 'pending',
      status: 'pending'
    };

    const product = new Product(productData);
    await product.save();

    res.status(201).json({
      message: 'Product submitted for approval',
      product
    });
  } catch (error) {
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

    Object.assign(product, req.body);
    await product.save();

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
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

    const { page = 1, limit = 20, search, category } = req.query;
    
    let query = { 
      isAdminProduct: true, 
      status: 'active',
      approvalStatus: 'approved'
    };
    
    if (search) {
      query.$text = { $search: search };
    }
    if (category && category !== 'all') query.category = category;

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

// Admin routes for managing seller products

// Get all seller products for admin review
router.get('/admin/seller-products', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    
    let query = { 
      isAdminProduct: false,
      approvalStatus: status
    };

    const products = await Product.find(query)
      .populate('seller', 'username email supplierId')
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

// Approve seller product
router.put('/admin/approve/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        approvalStatus: 'approved',
        status: 'active',
        approvedBy: req.admin._id,
        approvedAt: new Date()
      },
      { new: true }
    ).populate('seller', 'username email');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clear cache when product approval status changes
    fastProductsCache = null;
    cacheTimestamp = Date.now(); // Update timestamp to invalidate client cache
    console.log('🗑️ Cache cleared after product approval, new timestamp:', cacheTimestamp);

    res.json({ message: 'Product approved successfully', product });
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
    const { price, stock } = req.body;
    
    const product = await Product.findOne({
      _id: req.params.id,
      seller: req.seller._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or you do not have permission to edit this product' });
    }

    // Update only price and stock
    if (price !== undefined) product.price = parseFloat(price);
    if (stock !== undefined) product.stock = parseInt(stock);
    
    await product.save();

    res.json({ 
      message: 'Product inventory updated successfully', 
      product: {
        _id: product._id,
        name: product.name,
        price: product.price,
        stock: product.stock
      }
    });
  } catch (error) {
    res.status(400).json({ message: 'Error updating product inventory', error: error.message });
  }
});

// Get seller's listed products with detailed info
router.get('/seller/listed-products', authenticateSeller, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, marketplace } = req.query;
    
    let query = { 
      seller: req.seller._id,
      isAdminProduct: false // Only seller's own products
    };
    
    if (status) query.approvalStatus = status;
    if (marketplace) query.marketplace = marketplace;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('name price stock category marketplace currency approvalStatus status isAmazonsChoice createdAt images asin dealUnits');

    const count = await Product.countDocuments(query);

    // Get counts by status
    const statusCounts = await Product.aggregate([
      { $match: { seller: req.seller._id, isAdminProduct: false } },
      { $group: { _id: '$approvalStatus', count: { $sum: 1 } } }
    ]);

    const counts = {
      total: count,
      pending: statusCounts.find(s => s._id === 'pending')?.count || 0,
      approved: statusCounts.find(s => s._id === 'approved')?.count || 0,
      rejected: statusCounts.find(s => s._id === 'rejected')?.count || 0
    };

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count,
      counts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Seller lists an admin product (with payment)
router.post('/seller/list-admin-product', authenticateSeller, async (req, res) => {
  try {
    const { adminProductId, paymentTransactionId } = req.body;

    if (!req.seller.canListProducts) {
      return res.status(403).json({ 
        message: 'You need to complete verification before listing products' 
      });
    }

    // Find the admin product
    const adminProduct = await Product.findById(adminProductId);
    if (!adminProduct || !adminProduct.isAdminProduct) {
      return res.status(404).json({ message: 'Admin product not found' });
    }

    // Check if seller already has this product
    const existingProduct = await Product.findOne({
      seller: req.seller._id,
      originalAdminProductId: adminProductId
    });

    if (existingProduct) {
      return res.status(400).json({ message: 'You already have this product in your inventory' });
    }

    // Create a copy for the seller
    const sellerProduct = new Product({
      name: adminProduct.name,
      description: adminProduct.description,
      price: adminProduct.price,
      originalPrice: adminProduct.originalPrice,
      discount: adminProduct.discount,
      category: adminProduct.category,
      subcategory: adminProduct.subcategory,
      brand: adminProduct.brand,
      images: adminProduct.images,
      rating: adminProduct.rating,
      reviews: adminProduct.reviews,
      stock: adminProduct.stock,
      monthlyProfit: adminProduct.monthlyProfit,
      yearlyProfit: adminProduct.yearlyProfit,
      isAmazonsChoice: adminProduct.isAmazonsChoice,
      isBestSeller: adminProduct.isBestSeller,
      seller: req.seller._id,
      isAdminProduct: false,
      originalAdminProductId: adminProductId,
      paymentTransactionId: paymentTransactionId,
      approvalStatus: 'approved', // Auto-approve since it's from admin products
      status: 'active',
      listedAt: new Date()
    });

    await sellerProduct.save();

    res.json({ 
      message: 'Product successfully added to your inventory',
      product: sellerProduct
    });
  } catch (error) {
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
    console.log('🗑️ Cache cleared after product rejection, new timestamp:', cacheTimestamp);

    res.json({ message: 'Product rejected', product });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create sample admin products (for testing)
router.post('/admin/create-samples', async (req, res) => {
  try {
    const sampleProducts = [
      {
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 2500,
        originalPrice: 3000,
        discount: 17,
        category: 'electronics',
        brand: 'TechPro',
        images: ['https://via.placeholder.com/300x300?text=Headphones'],
        rating: 4.5,
        reviews: 150,
        stock: 50,
        isAdminProduct: true,
        isAmazonsChoice: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Smart Watch Series 5',
        description: 'Advanced smartwatch with health monitoring features',
        price: 8000,
        originalPrice: 10000,
        discount: 20,
        category: 'electronics',
        brand: 'SmartTech',
        images: ['https://via.placeholder.com/300x300?text=SmartWatch'],
        rating: 4.7,
        reviews: 200,
        stock: 30,
        isAdminProduct: true,
        isAmazonsChoice: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'LED Desk Lamp',
        description: 'Adjustable LED desk lamp with USB charging port',
        price: 1500,
        originalPrice: 2000,
        discount: 25,
        category: 'home',
        brand: 'LightPro',
        images: ['https://via.placeholder.com/300x300?text=DeskLamp'],
        rating: 4.3,
        reviews: 80,
        stock: 100,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      }
    ];

    // Check if products already exist
    const existingCount = await Product.countDocuments({ isAdminProduct: true });
    if (existingCount > 0) {
      return res.json({ message: 'Sample products already exist', count: existingCount });
    }

    const createdProducts = await Product.insertMany(sampleProducts);
    res.json({ 
      message: 'Sample admin products created successfully', 
      count: createdProducts.length,
      products: createdProducts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Debug route to check admin products
router.get('/admin/count', async (req, res) => {
  try {
    const count = await Product.countDocuments({ isAdminProduct: true });
    const products = await Product.find({ isAdminProduct: true }).limit(5);
    
    res.json({ 
      message: 'Admin products count',
      count: count,
      sampleProducts: products.map(p => ({ name: p.name, category: p.category, price: p.price }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add 30 more diverse products
router.post('/admin/add-diverse-products', async (req, res) => {
  try {
    const diverseProducts = [
      // Electronics - 10 products
      {
        name: 'Wireless Gaming Headset RGB',
        description: 'Professional gaming headset with 7.1 surround sound, RGB lighting, and noise-canceling microphone.',
        price: 4500,
        originalPrice: 6500,
        discount: 31,
        category: 'Electronics',
        subcategory: 'Gaming',
        brand: 'GameMax',
        images: ['https://images.unsplash.com/photo-1599669454699-248893623440?w=400'],
        rating: 4.6,
        reviews: 180,
        stock: 35,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: '4K Webcam with Auto Focus',
        description: 'Ultra HD webcam with auto focus, built-in microphone, and wide-angle lens for streaming and video calls.',
        price: 3200,
        originalPrice: 4800,
        discount: 33,
        category: 'Electronics',
        subcategory: 'Accessories',
        brand: 'StreamPro',
        images: ['https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400'],
        rating: 4.4,
        reviews: 95,
        stock: 60,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Portable SSD 1TB External Drive',
        description: 'High-speed portable SSD with USB 3.2 Gen 2 interface, perfect for data backup and transfer.',
        price: 8500,
        originalPrice: 12000,
        discount: 29,
        category: 'Electronics',
        subcategory: 'Storage',
        brand: 'DataMax',
        images: ['https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400'],
        rating: 4.8,
        reviews: 220,
        stock: 25,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Smartphone Car Mount Magnetic',
        description: 'Universal magnetic car mount with 360-degree rotation and strong magnetic hold for all smartphones.',
        price: 1200,
        originalPrice: 1800,
        discount: 33,
        category: 'Electronics',
        subcategory: 'Automotive',
        brand: 'CarTech',
        images: ['https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400'],
        rating: 4.3,
        reviews: 140,
        stock: 80,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Bluetooth Mechanical Keyboard',
        description: 'Compact mechanical keyboard with blue switches, RGB backlighting, and wireless connectivity.',
        price: 5500,
        originalPrice: 7500,
        discount: 27,
        category: 'Electronics',
        subcategory: 'Accessories',
        brand: 'KeyPro',
        images: ['https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400'],
        rating: 4.7,
        reviews: 165,
        stock: 40,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Wireless Charging Pad 15W',
        description: 'Fast wireless charging pad compatible with all Qi-enabled devices, with LED indicator.',
        price: 2200,
        originalPrice: 3200,
        discount: 31,
        category: 'Electronics',
        subcategory: 'Accessories',
        brand: 'ChargeFast',
        images: ['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400'],
        rating: 4.5,
        reviews: 110,
        stock: 70,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'USB-C Hub 7-in-1 Adapter',
        description: 'Multi-port USB-C hub with HDMI, USB 3.0, SD card reader, and PD charging support.',
        price: 3800,
        originalPrice: 5200,
        discount: 27,
        category: 'Electronics',
        subcategory: 'Accessories',
        brand: 'HubMax',
        images: ['https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400'],
        rating: 4.4,
        reviews: 85,
        stock: 55,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Smart Home Security Camera',
        description: '1080p WiFi security camera with night vision, motion detection, and mobile app control.',
        price: 6500,
        originalPrice: 9000,
        discount: 28,
        category: 'Electronics',
        subcategory: 'Security',
        brand: 'SecureHome',
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
        rating: 4.6,
        reviews: 195,
        stock: 30,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Portable Bluetooth Speaker 20W',
        description: 'Waterproof portable speaker with 20W output, 12-hour battery, and bass boost technology.',
        price: 3500,
        originalPrice: 5000,
        discount: 30,
        category: 'Electronics',
        subcategory: 'Audio',
        brand: 'BassMax',
        images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400'],
        rating: 4.5,
        reviews: 130,
        stock: 45,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Smart LED Strip Lights 5M',
        description: 'WiFi-controlled RGB LED strip lights with music sync, timer, and smartphone app control.',
        price: 2800,
        originalPrice: 4000,
        discount: 30,
        category: 'Electronics',
        subcategory: 'Lighting',
        brand: 'LightSmart',
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
        rating: 4.3,
        reviews: 175,
        stock: 65,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },

      // Clothing & Fashion - 8 products
      {
        name: 'Premium Cotton Hoodie Unisex',
        description: 'Comfortable cotton blend hoodie with kangaroo pocket and adjustable drawstring hood.',
        price: 2500,
        originalPrice: 3500,
        discount: 29,
        category: 'Clothing',
        subcategory: 'Hoodies',
        brand: 'ComfortWear',
        images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400'],
        rating: 4.4,
        reviews: 120,
        stock: 90,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Leather Wallet RFID Blocking',
        description: 'Genuine leather wallet with RFID blocking technology and multiple card slots.',
        price: 1800,
        originalPrice: 2800,
        discount: 36,
        category: 'Clothing',
        subcategory: 'Accessories',
        brand: 'LeatherCraft',
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'],
        rating: 4.6,
        reviews: 200,
        stock: 75,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Sports Running Shoes Lightweight',
        description: 'Breathable running shoes with cushioned sole and lightweight design for comfort.',
        price: 4200,
        originalPrice: 6000,
        discount: 30,
        category: 'Clothing',
        subcategory: 'Footwear',
        brand: 'RunFast',
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
        rating: 4.5,
        reviews: 155,
        stock: 50,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Denim Jacket Classic Blue',
        description: 'Classic blue denim jacket with button closure and chest pockets, perfect for casual wear.',
        price: 3200,
        originalPrice: 4500,
        discount: 29,
        category: 'Clothing',
        subcategory: 'Jackets',
        brand: 'DenimStyle',
        images: ['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400'],
        rating: 4.3,
        reviews: 90,
        stock: 60,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Silk Scarf Luxury Pattern',
        description: 'Premium silk scarf with elegant pattern, perfect accessory for any outfit.',
        price: 1500,
        originalPrice: 2200,
        discount: 32,
        category: 'Clothing',
        subcategory: 'Accessories',
        brand: 'SilkLux',
        images: ['https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400'],
        rating: 4.7,
        reviews: 85,
        stock: 100,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Baseball Cap Adjustable',
        description: 'Classic baseball cap with adjustable strap and embroidered logo, one size fits all.',
        price: 800,
        originalPrice: 1200,
        discount: 33,
        category: 'Clothing',
        subcategory: 'Hats',
        brand: 'CapStyle',
        images: ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400'],
        rating: 4.2,
        reviews: 110,
        stock: 120,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Yoga Leggings High Waist',
        description: 'High-waist yoga leggings with moisture-wicking fabric and four-way stretch.',
        price: 1800,
        originalPrice: 2600,
        discount: 31,
        category: 'Clothing',
        subcategory: 'Activewear',
        brand: 'YogaFit',
        images: ['https://images.unsplash.com/photo-1506629905607-d405d7d3b0d2?w=400'],
        rating: 4.6,
        reviews: 140,
        stock: 80,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Formal Dress Shirt White',
        description: 'Classic white formal dress shirt with French cuffs and mother-of-pearl buttons.',
        price: 2200,
        originalPrice: 3200,
        discount: 31,
        category: 'Clothing',
        subcategory: 'Shirts',
        brand: 'FormalWear',
        images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400'],
        rating: 4.4,
        reviews: 95,
        stock: 70,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },

      // Home & Garden - 6 products
      {
        name: 'Indoor Plant Pot Set Ceramic',
        description: 'Set of 3 ceramic plant pots with drainage holes and saucers, perfect for indoor plants.',
        price: 1800,
        originalPrice: 2600,
        discount: 31,
        category: 'Home & Garden',
        subcategory: 'Planters',
        brand: 'GreenHome',
        images: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400'],
        rating: 4.5,
        reviews: 125,
        stock: 85,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Aromatherapy Essential Oil Diffuser',
        description: 'Ultrasonic essential oil diffuser with LED lights, timer, and auto shut-off feature.',
        price: 2800,
        originalPrice: 4000,
        discount: 30,
        category: 'Home & Garden',
        subcategory: 'Wellness',
        brand: 'AromaMax',
        images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'],
        rating: 4.6,
        reviews: 160,
        stock: 55,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Memory Foam Pillow Ergonomic',
        description: 'Ergonomic memory foam pillow with cooling gel layer and breathable bamboo cover.',
        price: 3500,
        originalPrice: 5000,
        discount: 30,
        category: 'Home & Garden',
        subcategory: 'Bedding',
        brand: 'SleepWell',
        images: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400'],
        rating: 4.7,
        reviews: 180,
        stock: 40,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Wall Clock Modern Minimalist',
        description: 'Modern minimalist wall clock with silent movement and elegant wooden frame.',
        price: 1500,
        originalPrice: 2200,
        discount: 32,
        category: 'Home & Garden',
        subcategory: 'Decor',
        brand: 'TimeStyle',
        images: ['https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400'],
        rating: 4.3,
        reviews: 75,
        stock: 90,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Bamboo Cutting Board Set',
        description: 'Set of 3 bamboo cutting boards in different sizes with juice grooves and handles.',
        price: 2200,
        originalPrice: 3200,
        discount: 31,
        category: 'Home & Garden',
        subcategory: 'Kitchen',
        brand: 'BambooChef',
        images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'],
        rating: 4.5,
        reviews: 135,
        stock: 65,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Vacuum Storage Bags Set',
        description: 'Set of 6 vacuum storage bags in various sizes for clothes, bedding, and seasonal items.',
        price: 1200,
        originalPrice: 1800,
        discount: 33,
        category: 'Home & Garden',
        subcategory: 'Storage',
        brand: 'SpaceSaver',
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
        rating: 4.4,
        reviews: 200,
        stock: 100,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },

      // Books & Education - 3 products
      {
        name: 'Programming Guide Complete Set',
        description: 'Comprehensive programming guide covering Python, JavaScript, and web development fundamentals.',
        price: 2500,
        originalPrice: 3500,
        discount: 29,
        category: 'Books',
        subcategory: 'Technology',
        brand: 'TechBooks',
        images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400'],
        rating: 4.8,
        reviews: 250,
        stock: 45,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Notebook Set Leather Bound',
        description: 'Set of 3 leather-bound notebooks with lined pages, perfect for journaling and note-taking.',
        price: 1800,
        originalPrice: 2600,
        discount: 31,
        category: 'Books',
        subcategory: 'Stationery',
        brand: 'WriteWell',
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'],
        rating: 4.5,
        reviews: 120,
        stock: 80,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Educational Puzzle World Map',
        description: '1000-piece educational puzzle featuring detailed world map with country names and capitals.',
        price: 1200,
        originalPrice: 1800,
        discount: 33,
        category: 'Books',
        subcategory: 'Educational',
        brand: 'LearnFun',
        images: ['https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400'],
        rating: 4.6,
        reviews: 95,
        stock: 60,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },

      // Sports & Fitness - 3 products
      {
        name: 'Resistance Bands Set 5 Levels',
        description: 'Complete resistance bands set with 5 resistance levels, handles, and door anchor.',
        price: 2200,
        originalPrice: 3200,
        discount: 31,
        category: 'Sports',
        subcategory: 'Fitness',
        brand: 'FitMax',
        images: ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400'],
        rating: 4.5,
        reviews: 165,
        stock: 70,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Yoga Mat Non-Slip Premium',
        description: 'Premium non-slip yoga mat with extra thickness and carrying strap, eco-friendly material.',
        price: 1800,
        originalPrice: 2600,
        discount: 31,
        category: 'Sports',
        subcategory: 'Yoga',
        brand: 'YogaPro',
        images: ['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400'],
        rating: 4.7,
        reviews: 190,
        stock: 85,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Water Bottle Insulated 750ml',
        description: 'Stainless steel insulated water bottle that keeps drinks cold for 24h and hot for 12h.',
        price: 1500,
        originalPrice: 2200,
        discount: 32,
        category: 'Sports',
        subcategory: 'Hydration',
        brand: 'HydroMax',
        images: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400'],
        rating: 4.6,
        reviews: 140,
        stock: 95,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      }
    ];

    // Check if diverse products already exist
    const existingDiverseCount = await Product.countDocuments({ 
      isAdminProduct: true,
      $or: [
        { name: { $regex: 'Gaming Headset', $options: 'i' } },
        { name: { $regex: 'Webcam', $options: 'i' } },
        { name: { $regex: 'Hoodie', $options: 'i' } }
      ]
    });
    
    if (existingDiverseCount > 0) {
      return res.json({ 
        message: 'Diverse products already exist', 
        count: existingDiverseCount,
        note: 'Use /admin/count to see current product count'
      });
    }

    const createdProducts = await Product.insertMany(diverseProducts);
    res.json({ 
      message: '30 diverse products added successfully', 
      count: createdProducts.length,
      categories: {
        electronics: 10,
        clothing: 8,
        home: 6,
        books: 3,
        sports: 3
      },
      products: createdProducts.map(p => ({ 
        name: p.name, 
        category: p.category, 
        price: p.price 
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Initialize sample Excel products (no auth required for setup)
router.post('/admin/init-samples', async (req, res) => {
  try {
    // Check if we already have diverse products
    const electronicsCount = await Product.countDocuments({ 
      isAdminProduct: true,
      category: { $regex: 'Electronics', $options: 'i' }
    });
    
    if (electronicsCount > 50) {
      return res.json({ 
        message: 'Diverse products already exist', 
        electronicsCount,
        note: 'Electronics products found in database'
      });
    }

    const diverseProducts = [
      // Electronics - 15 products
      {
        name: 'Premium Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
        price: 2500,
        originalPrice: 3500,
        discount: 29,
        category: 'Electronics',
        brand: 'TechPro',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'],
        rating: 4.5,
        reviews: 150,
        stock: 50,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Smart Fitness Watch',
        description: 'Advanced smartwatch with health monitoring and GPS tracking.',
        price: 8000,
        originalPrice: 12000,
        discount: 33,
        category: 'Electronics',
        brand: 'SmartTech',
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'],
        rating: 4.7,
        reviews: 200,
        stock: 30,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Wireless Gaming Mouse RGB',
        description: 'High-precision wireless gaming mouse with RGB lighting.',
        price: 2200,
        originalPrice: 3000,
        discount: 27,
        category: 'Electronics',
        brand: 'GamePro',
        images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'],
        rating: 4.6,
        reviews: 95,
        stock: 60,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Bluetooth Speaker Portable',
        description: 'Compact portable Bluetooth speaker with excellent sound quality.',
        price: 1800,
        originalPrice: 2500,
        discount: 28,
        category: 'Electronics',
        brand: 'SoundMax',
        images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400'],
        rating: 4.2,
        reviews: 85,
        stock: 40,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Power Bank 20000mAh Fast Charging',
        description: 'High-capacity power bank with fast charging technology.',
        price: 3000,
        originalPrice: 4000,
        discount: 25,
        category: 'Electronics',
        brand: 'PowerMax',
        images: ['https://images.unsplash.com/photo-1609592806596-4d8b5b1d7e7e?w=400'],
        rating: 4.4,
        reviews: 120,
        stock: 75,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: '4K Webcam with Auto Focus',
        description: 'Ultra HD webcam with auto focus and built-in microphone.',
        price: 3200,
        originalPrice: 4800,
        discount: 33,
        category: 'Electronics',
        brand: 'StreamPro',
        images: ['https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=400'],
        rating: 4.4,
        reviews: 95,
        stock: 60,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Wireless Charging Pad 15W',
        description: 'Fast wireless charging pad compatible with all Qi-enabled devices.',
        price: 2200,
        originalPrice: 3200,
        discount: 31,
        category: 'Electronics',
        brand: 'ChargeFast',
        images: ['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400'],
        rating: 4.5,
        reviews: 110,
        stock: 70,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'USB-C Hub 7-in-1 Adapter',
        description: 'Multi-port USB-C hub with HDMI and USB 3.0 ports.',
        price: 3800,
        originalPrice: 5200,
        discount: 27,
        category: 'Electronics',
        brand: 'HubMax',
        images: ['https://images.unsplash.com/photo-1625842268584-8f3296236761?w=400'],
        rating: 4.4,
        reviews: 85,
        stock: 55,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Smart Security Camera 1080p',
        description: 'WiFi security camera with night vision and motion detection.',
        price: 6500,
        originalPrice: 9000,
        discount: 28,
        category: 'Electronics',
        brand: 'SecureHome',
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
        rating: 4.6,
        reviews: 195,
        stock: 30,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Mechanical Keyboard RGB Backlit',
        description: 'Compact mechanical keyboard with blue switches and RGB lighting.',
        price: 5500,
        originalPrice: 7500,
        discount: 27,
        category: 'Electronics',
        brand: 'KeyPro',
        images: ['https://images.unsplash.com/photo-1541140532154-b024d705b90a?w=400'],
        rating: 4.7,
        reviews: 165,
        stock: 40,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },

      // Clothing - 10 products
      {
        name: 'Premium Cotton Hoodie Unisex',
        description: 'Comfortable cotton blend hoodie with kangaroo pocket.',
        price: 2500,
        originalPrice: 3500,
        discount: 29,
        category: 'Clothing',
        brand: 'ComfortWear',
        images: ['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400'],
        rating: 4.4,
        reviews: 120,
        stock: 90,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Leather Wallet RFID Blocking',
        description: 'Genuine leather wallet with RFID blocking technology.',
        price: 1800,
        originalPrice: 2800,
        discount: 36,
        category: 'Clothing',
        brand: 'LeatherCraft',
        images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400'],
        rating: 4.6,
        reviews: 200,
        stock: 75,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Running Shoes Lightweight',
        description: 'Breathable running shoes with cushioned sole.',
        price: 4200,
        originalPrice: 6000,
        discount: 30,
        category: 'Clothing',
        brand: 'RunFast',
        images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400'],
        rating: 4.5,
        reviews: 155,
        stock: 50,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Denim Jacket Classic Blue',
        description: 'Classic blue denim jacket with button closure.',
        price: 3200,
        originalPrice: 4500,
        discount: 29,
        category: 'Clothing',
        brand: 'DenimStyle',
        images: ['https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400'],
        rating: 4.3,
        reviews: 90,
        stock: 60,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Cotton T-Shirt Premium',
        description: '100% cotton premium t-shirt, comfortable and breathable.',
        price: 1200,
        originalPrice: 1800,
        discount: 33,
        category: 'Clothing',
        brand: 'ComfortWear',
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'],
        rating: 4.1,
        reviews: 65,
        stock: 150,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Baseball Cap Adjustable',
        description: 'Classic baseball cap with adjustable strap.',
        price: 800,
        originalPrice: 1200,
        discount: 33,
        category: 'Clothing',
        brand: 'CapStyle',
        images: ['https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400'],
        rating: 4.2,
        reviews: 110,
        stock: 120,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Yoga Leggings High Waist',
        description: 'High-waist yoga leggings with moisture-wicking fabric.',
        price: 1800,
        originalPrice: 2600,
        discount: 31,
        category: 'Clothing',
        brand: 'YogaFit',
        images: ['https://images.unsplash.com/photo-1506629905607-d405d7d3b0d2?w=400'],
        rating: 4.6,
        reviews: 140,
        stock: 80,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Formal Dress Shirt White',
        description: 'Classic white formal dress shirt with French cuffs.',
        price: 2200,
        originalPrice: 3200,
        discount: 31,
        category: 'Clothing',
        brand: 'FormalWear',
        images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400'],
        rating: 4.4,
        reviews: 95,
        stock: 70,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Silk Scarf Luxury Pattern',
        description: 'Premium silk scarf with elegant pattern.',
        price: 1500,
        originalPrice: 2200,
        discount: 32,
        category: 'Clothing',
        brand: 'SilkLux',
        images: ['https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400'],
        rating: 4.7,
        reviews: 85,
        stock: 100,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Winter Gloves Touchscreen',
        description: 'Warm winter gloves with touchscreen fingertips.',
        price: 1000,
        originalPrice: 1500,
        discount: 33,
        category: 'Clothing',
        brand: 'WarmWear',
        images: ['https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=400'],
        rating: 4.3,
        reviews: 75,
        stock: 85,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },

      // Home & Garden - 15 products
      {
        name: 'LED Desk Lamp with USB Port',
        description: 'Adjustable LED desk lamp with built-in USB charging port.',
        price: 1500,
        originalPrice: 2200,
        discount: 32,
        category: 'Home & Garden',
        brand: 'LightPro',
        images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'],
        rating: 4.3,
        reviews: 80,
        stock: 100,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Ceramic Plant Pot Set of 3',
        description: 'Set of 3 ceramic plant pots with drainage holes.',
        price: 1800,
        originalPrice: 2600,
        discount: 31,
        category: 'Home & Garden',
        brand: 'GreenHome',
        images: ['https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400'],
        rating: 4.5,
        reviews: 125,
        stock: 85,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Essential Oil Diffuser Ultrasonic',
        description: 'Ultrasonic essential oil diffuser with LED lights.',
        price: 2800,
        originalPrice: 4000,
        discount: 30,
        category: 'Home & Garden',
        brand: 'AromaMax',
        images: ['https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400'],
        rating: 4.6,
        reviews: 160,
        stock: 55,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Memory Foam Pillow Ergonomic',
        description: 'Ergonomic memory foam pillow with cooling gel layer.',
        price: 3500,
        originalPrice: 5000,
        discount: 30,
        category: 'Home & Garden',
        brand: 'SleepWell',
        images: ['https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400'],
        rating: 4.7,
        reviews: 180,
        stock: 40,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Modern Wall Clock Minimalist',
        description: 'Modern minimalist wall clock with silent movement.',
        price: 1500,
        originalPrice: 2200,
        discount: 32,
        category: 'Home & Garden',
        brand: 'TimeStyle',
        images: ['https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400'],
        rating: 4.3,
        reviews: 75,
        stock: 90,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Bamboo Cutting Board Set',
        description: 'Set of 3 bamboo cutting boards in different sizes.',
        price: 2200,
        originalPrice: 3200,
        discount: 31,
        category: 'Home & Garden',
        brand: 'BambooChef',
        images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'],
        rating: 4.5,
        reviews: 135,
        stock: 65,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Vacuum Storage Bags Set',
        description: 'Set of 6 vacuum storage bags for clothes and bedding.',
        price: 1200,
        originalPrice: 1800,
        discount: 33,
        category: 'Home & Garden',
        brand: 'SpaceSaver',
        images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
        rating: 4.4,
        reviews: 200,
        stock: 100,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Coffee Mug Set Ceramic 4-Pack',
        description: 'Set of 4 ceramic coffee mugs with elegant design.',
        price: 1600,
        originalPrice: 2400,
        discount: 33,
        category: 'Home & Garden',
        brand: 'CoffeePro',
        images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=400'],
        rating: 4.4,
        reviews: 90,
        stock: 80,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Throw Blanket Soft Fleece',
        description: 'Ultra-soft fleece throw blanket perfect for couch.',
        price: 2000,
        originalPrice: 3000,
        discount: 33,
        category: 'Home & Garden',
        brand: 'CozyHome',
        images: ['https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400'],
        rating: 4.6,
        reviews: 150,
        stock: 70,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      },
      {
        name: 'Picture Frame Set Wood 5-Pack',
        description: 'Set of 5 wooden picture frames in various sizes.',
        price: 1800,
        originalPrice: 2700,
        discount: 33,
        category: 'Home & Garden',
        brand: 'FrameArt',
        images: ['https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400'],
        rating: 4.2,
        reviews: 65,
        stock: 95,
        isAdminProduct: true,
        status: 'active',
        approvalStatus: 'approved'
      }
    ];

    const createdProducts = await Product.insertMany(diverseProducts);
    res.json({ 
      message: 'Diverse products created successfully', 
      count: createdProducts.length,
      categories: {
        Electronics: createdProducts.filter(p => p.category === 'Electronics').length,
        Clothing: createdProducts.filter(p => p.category === 'Clothing').length,
        'Home & Garden': createdProducts.filter(p => p.category === 'Home & Garden').length
      },
      products: createdProducts.map(p => ({ name: p.name, price: p.price, category: p.category }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove sample products (temporary endpoint)
router.delete('/admin/remove-samples', async (req, res) => {
  try {
    // Remove the sample products I added
    const sampleNames = [
      'Premium Wireless Headphones', 'Smart Fitness Watch', 'Wireless Gaming Mouse RGB',
      'Bluetooth Speaker Portable', 'Power Bank 20000mAh Fast Charging', '4K Webcam with Auto Focus',
      'Wireless Charging Pad 15W', 'USB-C Hub 7-in-1 Adapter', 'Smart Security Camera 1080p',
      'Mechanical Keyboard RGB Backlit', 'Premium Cotton Hoodie Unisex', 'Leather Wallet RFID Blocking',
      'Running Shoes Lightweight', 'Denim Jacket Classic Blue', 'Cotton T-Shirt Premium',
      'Baseball Cap Adjustable', 'Yoga Leggings High Waist', 'Formal Dress Shirt White',
      'Silk Scarf Luxury Pattern', 'Winter Gloves Touchscreen', 'LED Desk Lamp with USB Port',
      'Ceramic Plant Pot Set of 3', 'Essential Oil Diffuser Ultrasonic', 'Memory Foam Pillow Ergonomic',
      'Modern Wall Clock Minimalist', 'Bamboo Cutting Board Set', 'Vacuum Storage Bags Set',
      'Coffee Mug Set Ceramic 4-Pack', 'Throw Blanket Soft Fleece', 'Picture Frame Set Wood 5-Pack'
    ];

    const result = await Product.deleteMany({
      name: { $in: sampleNames },
      isAdminProduct: true
    });

    res.json({
      message: 'Sample products removed successfully',
      deletedCount: result.deletedCount,
      removedProducts: sampleNames
    });
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

// Helper endpoint to create bidirectional variation links between products
router.post('/variations/link', authenticateAdmin, async (req, res) => {
  try {
    const { productIds, variationType, variationName } = req.body;
    
    if (!productIds || productIds.length < 2) {
      return res.status(400).json({ message: 'At least 2 products are required to create variations' });
    }

    if (!variationType || !variationName) {
      return res.status(400).json({ message: 'Variation type and name are required' });
    }

    console.log(`🔗 Creating bidirectional links for ${productIds.length} products`);
    
    // Get all products
    const products = await Product.find({ _id: { $in: productIds } });
    
    if (products.length !== productIds.length) {
      return res.status(404).json({ message: 'Some products not found' });
    }

    // Create variation options for each product
    const variationOptions = products.map(product => ({
      value: product.name.length > 20 ? `${product.name.substring(0, 20)}...` : product.name,
      productId: product._id,
      images: product.images || [],
      price: product.price || null,
      stock: product.stock || null
    }));

    // Update each product with the complete variation set
    for (const product of products) {
      let variations = product.variations || [];
      
      // Find or create the variation type
      let variationIndex = variations.findIndex(v => v.type === variationType);
      
      if (variationIndex === -1) {
        // Create new variation
        variations.push({
          type: variationType,
          name: variationName,
          options: variationOptions
        });
      } else {
        // Update existing variation
        variations[variationIndex].options = variationOptions;
      }

      await Product.findByIdAndUpdate(product._id, { variations });
      console.log(`✅ Updated variations for: ${product.name}`);
    }

    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();

    res.json({
      message: `Successfully created bidirectional variations for ${products.length} products`,
      variationType,
      variationName,
      linkedProducts: products.length,
      productNames: products.map(p => p.name)
    });

  } catch (error) {
    console.error('❌ Error creating variation links:', error);
    res.status(500).json({ message: 'Error creating variation links', error: error.message });
  }
});

// Helper endpoint to remove all variations from a product
router.delete('/variations/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { variations: [] },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();

    res.json({
      message: 'Variations removed successfully',
      product: product.name
    });

  } catch (error) {
    console.error('❌ Error removing variations:', error);
    res.status(500).json({ message: 'Error removing variations', error: error.message });
  }
});

// Helper endpoint to fix variation values for products
router.post('/variations/fix-values', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔧 Fixing variation values for all products...');
    
    const products = await Product.find({ variations: { $exists: true, $ne: [] } });
    let fixedCount = 0;

    for (const product of products) {
      let hasChanges = false;
      const updatedVariations = [];

      for (const variation of product.variations) {
        const updatedOptions = [];
        
        for (const option of variation.options) {
          if (option.productId) {
            // Get the linked product to determine proper variation value
            const linkedProduct = await Product.findById(option.productId);
            if (linkedProduct) {
              let properValue = option.value;
              
              // If the value is just the product name, try to derive a better variation value
              if (option.value === linkedProduct.name || option.value.includes('...')) {
                const productName = linkedProduct.name.toLowerCase();
                
                if (variation.type === 'color') {
                  if (productName.includes('red')) properValue = 'Red';
                  else if (productName.includes('blue')) properValue = 'Blue';
                  else if (productName.includes('green')) properValue = 'Green';
                  else if (productName.includes('black')) properValue = 'Black';
                  else if (productName.includes('white')) properValue = 'White';
                  else if (productName.includes('yellow')) properValue = 'Yellow';
                  else if (productName.includes('pink')) properValue = 'Pink';
                  else if (productName.includes('purple')) properValue = 'Purple';
                  else properValue = 'Default Color';
                } else if (variation.type === 'size') {
                  if (productName.includes('small')) properValue = 'Small';
                  else if (productName.includes('medium')) properValue = 'Medium';
                  else if (productName.includes('large')) properValue = 'Large';
                  else if (productName.includes('xl')) properValue = 'XL';
                  else if (productName.includes('xxl')) properValue = 'XXL';
                  else properValue = 'Default Size';
                } else if (variation.type === 'style') {
                  if (productName.includes('classic')) properValue = 'Classic';
                  else if (productName.includes('modern')) properValue = 'Modern';
                  else if (productName.includes('vintage')) properValue = 'Vintage';
                  else if (productName.includes('premium')) properValue = 'Premium';
                  else properValue = 'Default Style';
                }
                
                if (properValue !== option.value) {
                  hasChanges = true;
                  console.log(`🔧 Fixed variation value for ${linkedProduct.name}: ${option.value} → ${properValue}`);
                }
              }
              
              updatedOptions.push({
                ...option,
                value: properValue
              });
            } else {
              // Keep option if product exists
              updatedOptions.push(option);
            }
          } else {
            updatedOptions.push(option);
          }
        }
        
        updatedVariations.push({
          ...variation,
          options: updatedOptions
        });
      }

      if (hasChanges) {
        await Product.findByIdAndUpdate(product._id, { variations: updatedVariations });
        fixedCount++;
        console.log(`✅ Fixed variations for: ${product.name}`);
      }
    }

    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();

    res.json({
      message: `Fixed variation values for ${fixedCount} products`,
      fixedCount,
      totalChecked: products.length
    });

  } catch (error) {
    console.error('❌ Error fixing variation values:', error);
    res.status(500).json({ message: 'Error fixing variation values', error: error.message });
  }
});

// Helper endpoint to update specific products' variation values
router.post('/variations/update-values/:id', authenticateAdmin, async (req, res) => {
  try {
    const { variationValues } = req.body; // { "color": "Green", "size": "Large" }
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log(`🎨 Updating variation values for: ${product.name}`);
    console.log(`🎨 New values:`, variationValues);

    // Update this product's variations to include itself with proper values
    let updatedVariations = product.variations || [];
    let hasChanges = false;

    for (const variation of updatedVariations) {
      if (variationValues[variation.type]) {
        // Find current product in options and update its value
        const currentOptionIndex = variation.options.findIndex(opt => 
          opt.productId && opt.productId.toString() === req.params.id
        );

        if (currentOptionIndex !== -1) {
          variation.options[currentOptionIndex].value = variationValues[variation.type];
          hasChanges = true;
          console.log(`✅ Updated ${variation.type} value to: ${variationValues[variation.type]}`);
        } else {
          // Add current product to its own variations
          variation.options.push({
            value: variationValues[variation.type],
            productId: req.params.id,
            images: product.images || [],
            price: product.price || null,
            stock: product.stock || null
          });
          hasChanges = true;
          console.log(`➕ Added current product to ${variation.type} with value: ${variationValues[variation.type]}`);
        }
      }
    }

    if (hasChanges) {
      await Product.findByIdAndUpdate(req.params.id, { variations: updatedVariations });
      
      // Also update all linked products to reflect the new value
      for (const variation of updatedVariations) {
        if (variationValues[variation.type]) {
          for (const option of variation.options) {
            if (option.productId && option.productId !== req.params.id) {
              const linkedProduct = await Product.findById(option.productId);
              if (linkedProduct && linkedProduct.variations) {
                let linkedUpdated = false;
                for (const linkedVariation of linkedProduct.variations) {
                  if (linkedVariation.type === variation.type) {
                    const linkedOptionIndex = linkedVariation.options.findIndex(opt => 
                      opt.productId && opt.productId.toString() === req.params.id
                    );
                    if (linkedOptionIndex !== -1) {
                      linkedVariation.options[linkedOptionIndex].value = variationValues[variation.type];
                      linkedUpdated = true;
                    }
                  }
                }
                if (linkedUpdated) {
                  await Product.findByIdAndUpdate(option.productId, { variations: linkedProduct.variations });
                  console.log(`🔄 Updated linked product: ${linkedProduct.name}`);
                }
              }
            }
          }
        }
      }
    }

    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();

    res.json({
      message: 'Variation values updated successfully',
      product: product.name,
      updatedValues: variationValues,
      hasChanges
    });

  } catch (error) {
    console.error('❌ Error updating variation values:', error);
    res.status(500).json({ message: 'Error updating variation values', error: error.message });
  }
});
// Quick fix endpoint for animal variations (Dinosaur/Dolphin example)
router.post('/variations/fix-animals', authenticateAdmin, async (req, res) => {
  try {
    console.log('🦕 Fixing animal variations...');
    
    // Find products with animal names
    const animalProducts = await Product.find({
      $or: [
        { name: { $regex: 'dinosaur', $options: 'i' } },
        { name: { $regex: 'dolphin', $options: 'i' } },
        { name: { $regex: 'shark', $options: 'i' } },
        { name: { $regex: 'whale', $options: 'i' } }
      ]
    });

    let fixedCount = 0;

    for (const product of animalProducts) {
      const productName = product.name.toLowerCase();
      let animalType = 'Animal';
      
      if (productName.includes('dinosaur')) animalType = 'Dinosaur';
      else if (productName.includes('dolphin')) animalType = 'Dolphin';
      else if (productName.includes('shark')) animalType = 'Shark';
      else if (productName.includes('whale')) animalType = 'Whale';

      // Update variations to have proper animal type
      if (product.variations && product.variations.length > 0) {
        let hasChanges = false;
        
        for (const variation of product.variations) {
          // Find current product in its own variations and update value
          const currentOptionIndex = variation.options.findIndex(opt => 
            opt.productId && opt.productId.toString() === product._id.toString()
          );

          if (currentOptionIndex !== -1) {
            if (variation.options[currentOptionIndex].value === 'Current' || 
                variation.options[currentOptionIndex].value === product.name) {
              variation.options[currentOptionIndex].value = animalType;
              hasChanges = true;
              console.log(`🔧 Fixed ${product.name}: Current → ${animalType}`);
            }
          }

          // Also fix any generic product names in options
          for (let i = 0; i < variation.options.length; i++) {
            const option = variation.options[i];
            if (option.productId && option.productId !== product._id) {
              const linkedProduct = await Product.findById(option.productId);
              if (linkedProduct) {
                const linkedName = linkedProduct.name.toLowerCase();
                let linkedAnimalType = option.value;
                
                if (option.value === 'Current' || option.value === linkedProduct.name) {
                  if (linkedName.includes('dinosaur')) linkedAnimalType = 'Dinosaur';
                  else if (linkedName.includes('dolphin')) linkedAnimalType = 'Dolphin';
                  else if (linkedName.includes('shark')) linkedAnimalType = 'Shark';
                  else if (linkedName.includes('whale')) linkedAnimalType = 'Whale';
                  
                  if (linkedAnimalType !== option.value) {
                    variation.options[i].value = linkedAnimalType;
                    hasChanges = true;
                    console.log(`🔧 Fixed linked option: ${option.value} → ${linkedAnimalType}`);
                  }
                }
              }
            }
          }
        }

        if (hasChanges) {
          await Product.findByIdAndUpdate(product._id, { variations: product.variations });
          fixedCount++;
        }
      }
    }

    // Clear cache
    fastProductsCache = null;
    cacheTimestamp = Date.now();

    res.json({
      message: `Fixed animal variations for ${fixedCount} products`,
      fixedCount,
      totalChecked: animalProducts.length,
      products: animalProducts.map(p => ({ name: p.name, id: p._id }))
    });

  } catch (error) {
    console.error('❌ Error fixing animal variations:', error);
    res.status(500).json({ message: 'Error fixing animal variations', error: error.message });
  }
});

// Delete all products in a category (admin only) - Enhanced with comprehensive updates
router.delete('/category/:categoryValue', authenticateAdmin, async (req, res) => {
  try {
    const { categoryValue } = req.params;
    
    console.log(`🗑️ Admin deleting all products in category: ${categoryValue}`);
    
    // Find all products in this category
    const productsToDelete = await Product.find({ category: categoryValue });
    
    if (productsToDelete.length === 0) {
      return res.json({ 
        message: 'No products found in this category',
        deletedCount: 0,
        excelUpdatedCount: 0
      });
    }
    
    console.log(`🗑️ Found ${productsToDelete.length} products to delete in category: ${categoryValue}`);
    
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
        console.log(`📊 Updated ${excelUpdatedCount} Excel products after category deletion`);
      }
      
    } catch (excelError) {
      console.log('ℹ️ No Excel products to update or ExcelProduct model not found');
    }
    
    // Delete all products in the category
    const deleteResult = await Product.deleteMany({ category: categoryValue });
    
    console.log(`✅ Deleted ${deleteResult.deletedCount} products from category: ${categoryValue}`);
    
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
      console.log('ℹ️ Additional cache clearing completed');
    }
    
    res.json({
      message: `Successfully deleted category "${categoryValue}" with ${deleteResult.deletedCount} products`,
      deletedCount: deleteResult.deletedCount,
      excelUpdatedCount: excelUpdatedCount,
      categoryValue: categoryValue,
      success: true
    });
    
  } catch (error) {
    console.error('❌ Error deleting products by category:', error);
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
    
    console.log(`🏷️ Admin renaming category: "${oldCategoryValue}" → "${trimmedNewName}"`);
    
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
    
    console.log(`🏷️ Found ${productsToUpdate.length} products to rename in category: ${oldCategoryValue}`);
    
    // Update all products in the category
    const updateResult = await Product.updateMany(
      { category: oldCategoryValue },
      { $set: { category: trimmedNewName } }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} products to new category: ${trimmedNewName}`);
    
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
        console.log(`📊 Updated ${excelUpdatedCount} Excel products to new category: ${trimmedNewName}`);
      }
      
    } catch (excelError) {
      console.log('ℹ️ No Excel products to update or ExcelProduct model not found');
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
      console.log('ℹ️ Additional cache clearing completed');
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
    console.error('❌ Error renaming category:', error);
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
    
    console.log(`🔄 Admin moving products: "${oldCategoryValue}" → "${trimmedNewCategory}" (onlyActive: ${onlyActive})`);
    
    // First, find the actual category name in the database (case-insensitive)
    const actualCategoryName = await Product.findOne({
      category: { $regex: new RegExp(`^${oldCategoryValue}$`, 'i') }
    }).select('category');
    
    let sourceCategory = oldCategoryValue;
    if (actualCategoryName) {
      sourceCategory = actualCategoryName.category;
      console.log(`🔍 Found actual category name: "${sourceCategory}" (searched for: "${oldCategoryValue}")`);
    } else {
      console.log(`⚠️ No products found with category matching: "${oldCategoryValue}"`);
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
    
    console.log(`🔄 Found ${productsToMove.length} products to move from category: ${sourceCategory}`);
    
    // Update products
    const moveResult = await Product.updateMany(
      query,
      { $set: { category: trimmedNewCategory } }
    );
    
    console.log(`✅ Moved ${moveResult.modifiedCount} products to category: ${trimmedNewCategory}`);
    
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
        console.log(`📊 Updated ${excelUpdatedCount} Excel products to category: ${trimmedNewCategory}`);
      }
      
    } catch (excelError) {
      console.log('ℹ️ No Excel products to update or ExcelProduct model not found');
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
      console.log('ℹ️ Additional cache clearing completed');
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
    console.error('❌ Error moving products between categories:', error);
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

// Debug endpoint for category filtering (public)
router.get('/public/debug/category/:categoryValue', async (req, res) => {
  try {
    const { categoryValue } = req.params;
    
    console.log(`🔍 Debug: Testing category filtering for "${categoryValue}"`);
    
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
      $or: [
        { status: 'active' },
        { status: { $exists: false } }
      ],
      isAmazonsChoice: true,
      ...categoryQuery
    };
    
    console.log('🔍 Debug query:', JSON.stringify(query, null, 2));
    
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
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({ 
      debug: true,
      error: error.message,
      searchedFor: req.params.categoryValue
    });
  }
});

export default router;