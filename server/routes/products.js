import express from 'express';
import Product from '../models/Product.js';
import { authenticateAdmin, authenticateSeller } from '../middleware/auth.js';
import productCache from '../utils/productCache.js';
import { fallbackProducts } from '../data/fallbackProducts.js';
import { amazonChoiceFallbackProducts, getFilteredFallbackProducts } from '../data/amazonChoiceFallback.js';
import mongoose from 'mongoose';

const router = express.Router();

// Helper function to get products with fallback mechanism
async function getProductsWithFallback(query = {}, options = {}) {
  try {
    // Try to get from database first
    console.log('🔍 Attempting database query...');
    
    const dbProducts = await Product.find(query)
      .populate(options.populate || '')
      .sort(options.sort || {})
      .limit(options.limit || 50)
      .skip(options.skip || 0)
      .select(options.select || '')
      .maxTimeMS(5000) // 5 second timeout
      .lean();
    
    console.log(`✅ Database query successful: ${dbProducts.length} products`);
    
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
      console.log('📦 Using fresh cache data');
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
      console.log('📦 Using stale cache data');
      return {
        ...cacheResult,
        source: 'stale_cache',
        cacheAge: productCache.getCacheAge()
      };
    }
    
    // Quick fallback with 20 products
    console.log('🆘 Using quick fallback data');
    
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
    console.log('🔍 Fetching categories from database...');
    
    // Get unique categories from active products
    const categories = await Product.distinct('category', { 
      status: 'active',
      category: { $exists: true, $ne: null, $ne: '' }
    }).maxTimeMS(5000);
    
    console.log('✅ Categories fetched:', categories);
    
    // Format categories for frontend
    const formattedCategories = [
      { value: 'all', label: 'All' },
      ...categories.map(cat => ({
        value: cat.toLowerCase().replace(/\s+/g, '-'),
        label: cat
      }))
    ];
    
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

// Admin endpoint to clear cache manually
router.post('/admin/clear-cache', authenticateAdmin, async (req, res) => {
  try {
    fastProductsCache = null;
    cacheTimestamp = Date.now();
    console.log('🗑️ Cache manually cleared by admin, new timestamp:', cacheTimestamp);
    
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
    
    console.log(`🏆 Updated ${result.modifiedCount} products as Amazon Choice: ${markAsAmazonsChoice}`);
    
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
    
    console.log(`🏆 Marked ALL ${result.modifiedCount} active products as Amazon Choice`);
    
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

// Fast endpoint for 50 products (optimized)
router.get('/public/fast', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Fast products API called');

    // Check cache first
    if (fastProductsCache && (Date.now() - cacheTimestamp) < CACHE_DURATION) {
      console.log('📦 Using cached products');
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
        
        // Project essential fields
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
          isBestSeller: 1
        }}
      ]).maxTimeMS(5000);
      
      console.log(`✅ Fast aggregation successful: ${products.length} products in ${Date.now() - startTime}ms`);
      console.log('📂 Categories in results:', [...new Set(products.map(p => p.category))]);
      
      // Cache the results (only for unfiltered requests)
      if (!isAmazonsChoice && !category) {
        fastProductsCache = products;
        cacheTimestamp = Date.now();
        console.log('📦 Results cached for future requests');
      } else {
        console.log('📦 Filtered results not cached');
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
          fallbackQuery.category = { $regex: category, $options: 'i' };
        }
        
        products = await Product.find(fallbackQuery)
        .limit(50)
        .select('name price category brand images dealUnits currency rating reviews isAmazonsChoice isBestSeller')
        .lean()
        .maxTimeMS(3000);
        
        console.log(`✅ Simple fallback query successful: ${products.length} products`);
        
      } catch (fallbackError) {
        console.error('❌ All queries failed, no products available');
        products = []; // Return empty array instead of fake products
      }
    }

    const responseTime = Date.now() - startTime;
    console.log(`📊 Fast API Response: ${products.length} products, ${responseTime}ms`);

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

    console.log('🔍 Products API called:', { 
      page, limit, search, category, isAmazonsChoice, 
      connectionState: mongoose.connection.readyState 
    });

    // Check database connection state
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ Database not connected, using fallback mechanism');
      return await getProductsWithFallback(
        { isAmazonsChoice: isAmazonsChoice === 'true', category }, 
        { page: parseInt(page), limit: parseInt(limit) }
      ).then(result => {
        res.json({
          products: result.products,
          totalPages: result.totalPages || 1,
          currentPage: parseInt(page),
          total: result.total || result.products.length,
          source: result.source,
          responseTime: Date.now() - startTime
        });
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
      
      // Debug logging for ID searches (public route)
      if (search.length >= 3 && /^[a-fA-F0-9]+$/.test(search)) {
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
      query.category = { $regex: category, $options: 'i' }; // Case-insensitive category match
    }
    if (isAmazonsChoice === 'true') query.isAmazonsChoice = true;
    if (isBestSeller === 'true') query.isBestSeller = true;
    if (isLatestDeal === 'true') query.isLatestDeal = true;
    if (showOnHome === 'true') query.showOnHome = true;

    console.log('🔍 Final query for products:', JSON.stringify(query, null, 2));

    // Enhanced query execution with multiple fallback strategies
    let products;
    let querySource = 'database';
    
    try {
      console.log('🔍 Executing database query...', { query, limit: parseInt(limit) });
      
      // Simplified single query approach for better reliability
      console.log('🔍 Executing simplified database query...', { query, limit: parseInt(limit) });
      
      products = await Product.find(query)
        .sort(sortOptions)
        .limit(parseInt(limit))
        .select('name description price originalPrice discount category brand images rating reviews stock dealUnits currency isAmazonsChoice isBestSeller seller isAdminProduct sellerInfo')
        .maxTimeMS(10000) // Increased timeout to 10 seconds
        .lean();
      console.log(`✅ Database query successful: ${products.length} products in ${Date.now() - startTime}ms`);
      
    } catch (queryError) {
      console.error('❌ Database query failed:', queryError.message);
      console.log('🔄 Attempting fallback mechanism...');
      
      // Use fallback mechanism
      try {
        const fallbackResult = await getProductsWithFallback(query, {
          page: parseInt(page),
          limit: parseInt(limit),
          sort: sortOptions
        });
        
        products = fallbackResult.products;
        querySource = fallbackResult.source;
        console.log(`📦 Fallback successful: ${products.length} products from ${querySource}`);
        
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError.message);
        
        // Final emergency fallback - return 20 sample products
        querySource = 'emergency';
        
        // Create 50 diverse sample products for better user experience
        const diverseProductNames = [
          // Electronics (15)
          'Wireless Gaming Headset RGB', '4K Webcam Auto Focus', 'Portable SSD 1TB', 'Magnetic Car Phone Mount', 
          'Mechanical Keyboard RGB', 'Wireless Charging Pad 15W', 'USB-C Hub 7-in-1', 'Smart Security Camera',
          'Bluetooth Speaker 20W', 'LED Strip Lights 5M', 'Power Bank 20000mAh', 'Gaming Mouse Wireless',
          'Smartphone Gimbal Stabilizer', 'Tablet Stand Adjustable', 'Wireless Earbuds Pro',
          
          // Clothing (12)
          'Premium Cotton Hoodie', 'Leather Wallet RFID', 'Running Shoes Lightweight', 'Denim Jacket Classic',
          'Silk Scarf Luxury', 'Baseball Cap Adjustable', 'Yoga Leggings High Waist', 'Formal Dress Shirt',
          'Winter Gloves Touchscreen', 'Sunglasses Polarized', 'Casual Sneakers White', 'Crossbody Bag Leather',
          
          // Home & Garden (12)
          'Ceramic Plant Pot Set', 'Essential Oil Diffuser', 'Memory Foam Pillow', 'Modern Wall Clock',
          'Bamboo Cutting Board Set', 'Vacuum Storage Bags', 'Coffee Mug Set Ceramic', 'Throw Blanket Soft',
          'Picture Frame Set', 'Candle Set Aromatherapy', 'Kitchen Scale Digital', 'Shower Curtain Waterproof',
          
          // Books & Education (6)
          'Programming Guide Complete', 'Notebook Set Leather', 'Educational World Map Puzzle', 'Art Supplies Set',
          'Language Learning Cards', 'Scientific Calculator Advanced',
          
          // Sports & Fitness (5)
          'Resistance Bands Set', 'Yoga Mat Non-Slip', 'Water Bottle Insulated', 'Fitness Tracker Smart', 'Dumbbells Adjustable'
        ];

        const categories = ['Electronics', 'Clothing', 'Home & Garden', 'Books', 'Sports'];
        const brands = ['TechPro', 'StyleMax', 'HomeComfort', 'BookWorld', 'SportsFit', 'QualityPlus', 'PremiumChoice'];

        products = Array.from({ length: 50 }, (_, i) => ({
          _id: `507f1f77bcf86cd79943901${i.toString().padStart(2, '0')}`,
          name: diverseProductNames[i] || `Quality Product ${i + 1}`,
          description: `High-quality ${diverseProductNames[i]?.toLowerCase() || 'product'} with excellent features and great value for money.`,
          price: Math.floor(Math.random() * 4000) + 800,
          originalPrice: Math.floor(Math.random() * 6000) + 1500,
          discount: Math.floor(Math.random() * 40) + 15,
          category: categories[Math.floor(i / 10)] || categories[i % 5],
          brand: brands[i % brands.length],
          images: [`https://via.placeholder.com/300x300?text=${encodeURIComponent(diverseProductNames[i]?.split(' ')[0] || 'Product')}`],
          rating: 4.0 + Math.random() * 1,
          reviews: Math.floor(Math.random() * 200) + 50,
          stock: Math.floor(Math.random() * 100) + 10,
          isAmazonsChoice: isAmazonsChoice === 'true' || Math.random() > 0.6,
          isBestSeller: Math.random() > 0.7
        }));
      }
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
    console.log(`📊 API Response: ${processedProducts.length} products, ${responseTime}ms, source: ${querySource}`);

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
    
    // Emergency fallback response
    const emergencyProducts = isAmazonsChoice === 'true' ? [
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Emergency Fallback Product',
        price: 19.99,
        originalPrice: 29.99,
        discount: 33,
        category: category || 'electronics',
        brand: 'Generic',
        images: ['fallback-product.jpg'],
        rating: 4.0,
        reviews: 100,
        stock: 25,
        isAmazonsChoice: true,
        dealUnits: 1
      }
    ] : [];
    
    res.status(200).json({ 
      products: emergencyProducts,
      totalPages: 1,
      currentPage: parseInt(page),
      total: emergencyProducts.length,
      source: 'emergency',
      error: 'Database temporarily unavailable',
      message: 'Using emergency fallback data',
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
    console.log('🚀 Fast admin products API called');

    // Get products without images for speed
    let products;
    try {
      products = await Product.find({})
        .limit(50) // Limit to 50 for admin dashboard
        .select('name price category status createdAt dealUnits currency') // Minimal fields for speed
        .sort({ createdAt: -1 })
        .maxTimeMS(3000) // 3 second timeout
        .lean();
      
      console.log(`✅ Fast admin query successful: ${products.length} products in ${Date.now() - startTime}ms`);
      
    } catch (error) {
      console.log('❌ Fast admin query failed, using fallback');
      products = [];
    }

    const responseTime = Date.now() - startTime;
    console.log(`📊 Fast Admin API Response: ${products.length} products, ${responseTime}ms`);

    res.json({
      products,
      totalPages: 1,
      currentPage: 1,
      total: products.length,
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

// Admin endpoint (auth required) - Optimized
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
    if (excludeSellerCopies === 'true') {
      query.$or = [
        { isAdminProduct: true },
        { originalAdminProductId: { $exists: false } },
        { originalAdminProductId: null }
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
      
      // Debug logging for ID searches
      if (search.length >= 3 && /^[a-fA-F0-9]+$/.test(search)) {
        console.log('🔍 ID Search Debug:', {
          searchTerm: search,
          isValidObjectId,
          queryStructure: JSON.stringify(searchQuery, null, 2)
        });
      }
      
      // Combine with existing query
      query = { ...query, ...searchQuery };
    }
    
    if (category) query.category = category;
    if (status) query.status = status;

    console.log('🔍 Final Query:', JSON.stringify(query, null, 2));

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

router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log('📝 Updating product:', req.params.id);
    console.log('📝 Update data keys:', Object.keys(req.body));
    console.log('📝 Platform comparison:', req.body.platformComparison);
    console.log('📝 Profit calculations:', req.body.profitCalculations);
    console.log('📝 Profit evaluation:', req.body.profitEvaluation);
    
    // Validate product ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.log('❌ Invalid product ID format:', req.params.id);
      return res.status(400).json({ message: 'Invalid product ID format' });
    }
    
    // Ensure currency is always GBP
    const updateData = {
      ...req.body,
      currency: 'GBP'
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

export default router;