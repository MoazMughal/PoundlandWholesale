// Clean version of products route with fixed filtering and no debug messages
import express from 'express';
import Product from '../models/Product.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/products - Enhanced admin products endpoint with proper filtering
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const { 
      search, 
      category, 
      status, 
      isAmazonsChoice, 
      excludeSellerCopies = 'true',
      sortBy = 'createdAt', 
      order = 'desc', 
      page = 1, 
      limit = 50 
    } = req.query;

    // Base query for admin products
    let query = {
      approvalStatus: { $in: ['approved', 'pending'] }
    };

    // Optionally exclude seller copies
    if (excludeSellerCopies === 'true') {
      query.$or = [
        { isAdminProduct: true },
        { originalAdminProductId: { $exists: false } },
        { originalAdminProductId: null },
        { isAmazonsChoice: true },
        { status: 'active' }
      ];
    }

    // Enhanced search with ASIN, SKU, and name matching
    if (search) {
      const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedSearch = escapeRegex(search);
      
      const searchQuery = {
        $or: [
          // ASIN exact match (highest priority)
          { asin: search.toUpperCase() },
          // SKU exact match (high priority)  
          { sku: search.toUpperCase() },
          // ASIN partial match
          { asin: { $regex: escapedSearch, $options: 'i' } },
          // SKU partial match
          { sku: { $regex: escapedSearch, $options: 'i' } },
          // Name matches (exact, starts with, contains)
          { name: { $regex: `^${escapedSearch}$`, $options: 'i' } },
          { name: { $regex: `^${escapedSearch}`, $options: 'i' } },
          { name: { $regex: escapedSearch, $options: 'i' } },
          // Brand and category matches
          { brand: { $regex: escapedSearch, $options: 'i' } },
          { category: { $regex: escapedSearch, $options: 'i' } },
          { description: { $regex: escapedSearch, $options: 'i' } }
        ]
      };
      
      query = { ...query, ...searchQuery };
    }

    // Category filtering - exact match (case-insensitive)
    if (category) {
      query.category = { $regex: `^${category}$`, $options: 'i' };
    }

    // Status filtering
    if (status) {
      query.status = status;
    }

    // Amazon's Choice filtering
    if (isAmazonsChoice === 'true') {
      query.isAmazonsChoice = true;
    }

    // Sort options
    const sortOptions = { [sortBy]: order === 'desc' ? -1 : 1 };

    // Execute query with pagination
    const adminProducts = await Product.find(query)
      .populate('seller', 'businessName email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .maxTimeMS(5000)
      .lean();

    // Enhanced sorting for search results (relevance-based)
    if (search) {
      adminProducts.sort((a, b) => {
        const searchLower = search.toLowerCase();
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        const aAsin = (a.asin || '').toLowerCase();
        const bAsin = (b.asin || '').toLowerCase();
        const aSku = (a.sku || '').toLowerCase();
        const bSku = (b.sku || '').toLowerCase();
        
        // Exact ASIN match first
        if (aAsin === searchLower && bAsin !== searchLower) return -1;
        if (bAsin === searchLower && aAsin !== searchLower) return 1;
        
        // Exact SKU match second
        if (aSku === searchLower && bSku !== searchLower) return -1;
        if (bSku === searchLower && aSku !== searchLower) return 1;
        
        // Exact name match third
        if (aName === searchLower && bName !== searchLower) return -1;
        if (bName === searchLower && aName !== searchLower) return 1;
        
        // Name starts with search term
        if (aName.startsWith(searchLower) && !bName.startsWith(searchLower)) return -1;
        if (bName.startsWith(searchLower) && !aName.startsWith(searchLower)) return 1;
        
        // Same category as search term
        const aCategoryMatch = (a.category || '').toLowerCase().includes(searchLower);
        const bCategoryMatch = (b.category || '').toLowerCase().includes(searchLower);
        
        if (aCategoryMatch && !bCategoryMatch) return -1;
        if (bCategoryMatch && !aCategoryMatch) return 1;
        
        // Default sort by creation date
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    // Get total count
    const adminCount = await Product.countDocuments(query).maxTimeMS(3000);

    res.json({
      products: adminProducts,
      totalPages: Math.ceil(adminCount / limit),
      currentPage: parseInt(page),
      total: adminCount
    });

  } catch (error) {
    console.error('Products query error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      products: [],
      totalPages: 1,
      currentPage: 1,
      total: 0
    });
  }
});

export default router;