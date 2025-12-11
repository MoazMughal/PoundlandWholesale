import express from 'express';
import Product from '../models/Product.js';
import { authenticateAdmin, authenticateSeller } from '../middleware/auth.js';

const router = express.Router();

// Public endpoint for frontend (no auth required) - Optimized for performance
router.get('/public', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 200, // Reduced default limit for better performance
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

    // Optimized query structure
    let query = { 
      status: 'active'
    };
    
    // More efficient query for original products only
    if (!source || source !== 'excel') {
      query.originalAdminProductId = { $exists: false };
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
    
    if (category && category !== 'all') query.category = category;
    if (isAmazonsChoice === 'true') query.isAmazonsChoice = true;
    if (isBestSeller === 'true') query.isBestSeller = true;
    if (isLatestDeal === 'true') query.isLatestDeal = true;
    if (showOnHome === 'true') query.showOnHome = true;

    // Optimized query with lean() for better performance
    let products = await Product.find(query)
      .populate('seller', 'username whatsappNo city country verificationStatus')
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('name description price originalPrice rrp discount category subcategory brand images rating reviews stock dealUnits isAmazonsChoice isBestSeller monthlyProfit seller isAdminProduct sellerInfo platformComparison profitCalculations profitEvaluation')
      .lean(); // Use lean() for faster queries

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

    // Only count if needed for pagination
    const count = parseInt(limit) < 200 ? await Product.countDocuments(query) : products.length;



    res.json({
      products: processedProducts,
      totalPages: Math.ceil(count / parseInt(limit)),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    console.error('Products API error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

// Admin endpoint (auth required)
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
      products = await Product.find(query)
        .populate('seller', 'businessName email')
        .sort(sortOptions)
        .limit(limit * 1)
        .skip((page - 1) * limit);
    } catch (queryError) {
      console.error('❌ MongoDB Query Error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
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
    const product = new Product(req.body);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: 'Error creating product', error: error.message });
  }
});

router.put('/:id', authenticateAdmin, async (req, res) => {
  try {
    console.log('📝 Updating product:', req.params.id);
    console.log('📝 Update data:', req.body);
    console.log('📝 Features in request:', req.body.features);
    console.log('📝 Features type:', typeof req.body.features, 'isArray:', Array.isArray(req.body.features));
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!product) {
      console.log('❌ Product not found:', req.params.id);
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('✅ Product updated successfully:', product.name);
    console.log('📝 Updated product features:', product.features);
    res.json(product);
  } catch (error) {
    console.error('❌ Error updating product:', error);
    console.error('❌ Update data that failed:', req.body);
    res.status(400).json({ message: 'Error updating product', error: error.message });
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

// Initialize sample Excel products (no auth required for setup)
router.post('/admin/init-samples', async (req, res) => {
  try {
    const existingCount = await Product.countDocuments({ isAdminProduct: true });
    if (existingCount > 0) {
      return res.json({ message: 'Sample Excel products already exist', count: existingCount });
    }

    const excelProducts = [
      {
        name: 'Premium Wireless Headphones',
        description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.',
        price: 2500,
        originalPrice: 3500,
        discount: 29,
        category: 'Electronics',
        subcategory: 'Audio',
        brand: 'TechPro',
        images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400'],
        rating: 4.5,
        reviews: 150,
        stock: 50,
        isAdminProduct: true,
        isAmazonsChoice: false, // Excel products are not Amazon's Choice
        status: 'active',
        approvalStatus: 'approved',
        source: 'excel'
      },
      {
        name: 'Smart Fitness Watch',
        description: 'Advanced smartwatch with health monitoring, GPS, and 7-day battery life. Track your fitness and stay connected.',
        price: 8000,
        originalPrice: 12000,
        discount: 33,
        category: 'Electronics',
        subcategory: 'Wearables',
        brand: 'SmartTech',
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'],
        rating: 4.7,
        reviews: 200,
        stock: 30,
        isAdminProduct: true,
        isAmazonsChoice: false,
        status: 'active',
        approvalStatus: 'approved',
        source: 'excel'
      },
      {
        name: 'LED Desk Lamp with USB Port',
        description: 'Adjustable LED desk lamp with multiple brightness levels and built-in USB charging port. Perfect for office and study.',
        price: 1500,
        originalPrice: 2200,
        discount: 32,
        category: 'Home & Garden',
        subcategory: 'Lighting',
        brand: 'LightPro',
        images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'],
        rating: 4.3,
        reviews: 80,
        stock: 100,
        isAdminProduct: true,
        isAmazonsChoice: false,
        status: 'active',
        approvalStatus: 'approved',
        source: 'excel'
      },
      {
        name: 'Fast Charging Power Bank 20000mAh',
        description: 'High-capacity power bank with fast charging and multiple ports. Keep your devices charged on the go.',
        price: 3000,
        originalPrice: 4000,
        discount: 25,
        category: 'Electronics',
        subcategory: 'Accessories',
        brand: 'PowerMax',
        images: ['https://images.unsplash.com/photo-1609592806596-4d8b5b1d7e7e?w=400'],
        rating: 4.4,
        reviews: 120,
        stock: 75,
        isAdminProduct: true,
        isAmazonsChoice: false,
        status: 'active',
        approvalStatus: 'approved',
        source: 'excel'
      },
      {
        name: 'RGB Gaming Mouse Wireless',
        description: 'High-precision wireless gaming mouse with RGB lighting and programmable buttons. Perfect for gamers.',
        price: 2200,
        originalPrice: 3000,
        discount: 27,
        category: 'Electronics',
        subcategory: 'Gaming',
        brand: 'GamePro',
        images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400'],
        rating: 4.6,
        reviews: 95,
        stock: 60,
        isAdminProduct: true,
        isAmazonsChoice: false,
        status: 'active',
        approvalStatus: 'approved',
        source: 'excel'
      },
      {
        name: 'Bluetooth Speaker Portable',
        description: 'Compact portable Bluetooth speaker with excellent sound quality and 12-hour battery life.',
        price: 1800,
        originalPrice: 2500,
        discount: 28,
        category: 'Electronics',
        subcategory: 'Audio',
        brand: 'SoundMax',
        images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400'],
        rating: 4.2,
        reviews: 85,
        stock: 40,
        isAdminProduct: true,
        isAmazonsChoice: false,
        status: 'active',
        approvalStatus: 'approved',
        source: 'excel'
      },
      {
        name: 'Organic Green Tea 100g',
        description: 'Premium organic green tea leaves, rich in antioxidants and perfect for daily consumption.',
        price: 800,
        originalPrice: 1200,
        discount: 33,
        category: 'Food',
        subcategory: 'Beverages',
        brand: 'TeaGarden',
        images: ['https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'],
        rating: 4.8,
        reviews: 250,
        stock: 200,
        isAdminProduct: true,
        isAmazonsChoice: false,
        status: 'active',
        approvalStatus: 'approved',
        source: 'excel'
      },
      {
        name: 'Cotton T-Shirt Premium',
        description: '100% cotton premium t-shirt, comfortable and breathable. Available in multiple colors.',
        price: 1200,
        originalPrice: 1800,
        discount: 33,
        category: 'Clothing',
        subcategory: 'T-Shirts',
        brand: 'ComfortWear',
        images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400'],
        rating: 4.1,
        reviews: 65,
        stock: 150,
        isAdminProduct: true,
        isAmazonsChoice: false,
        status: 'active',
        approvalStatus: 'approved',
        source: 'excel'
      }
    ];

    const createdProducts = await Product.insertMany(excelProducts);
    res.json({ 
      message: 'Sample Excel products created successfully', 
      count: createdProducts.length,
      products: createdProducts.map(p => ({ name: p.name, price: p.price, category: p.category }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;