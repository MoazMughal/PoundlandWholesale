import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ExcelUpload from '../models/ExcelUpload.js';
import ExcelProduct from '../models/ExcelProduct.js';
import ImageUpload from '../models/ImageUpload.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { uploadToCloudinary, isCloudinaryConfigured, deleteFromCloudinary, listCloudinaryImages } from '../services/cloudinary.js';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import sharp from 'sharp';

const router = express.Router();

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
  
  // Enhanced case-insensitive matching with existing categories
  // This will help match categories regardless of case differences
  const commonCategoryVariations = {
    // Common category names with different cases
    'kitchen': 'Kitchen',
    'Kitchen': 'Kitchen',
    'KITCHEN': 'Kitchen',
    'electronics': 'Electronics',
    'Electronics': 'Electronics',
    'ELECTRONICS': 'Electronics',
    'automotive': 'Automotive',
    'Automotive': 'Automotive',
    'AUTOMOTIVE': 'Automotive',
    'clothing': 'Clothing',
    'Clothing': 'Clothing',
    'CLOTHING': 'Clothing',
    'home': 'Home & Garden',
    'Home': 'Home & Garden',
    'HOME': 'Home & Garden',
    'home & garden': 'Home & Garden',
    'Home & Garden': 'Home & Garden',
    'HOME & GARDEN': 'Home & Garden',
    'accessories': 'Accessories',
    'Accessories': 'Accessories',
    'ACCESSORIES': 'Accessories',
    'toys': 'Toys',
    'Toys': 'Toys',
    'TOYS': 'Toys',
    'sports': 'Sports',
    'Sports': 'Sports',
    'SPORTS': 'Sports',
    'beauty': 'Beauty',
    'Beauty': 'Beauty',
    'BEAUTY': 'Beauty',
    'health': 'Health',
    'Health': 'Health',
    'HEALTH': 'Health'
  };
  
  // Check common variations
  if (commonCategoryVariations[normalized]) {
    return commonCategoryVariations[normalized];
  }
  
  // Return original with proper capitalization (first letter uppercase, rest lowercase)
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
}

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/excel';
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
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) and CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB limit for large Excel files
  }
});

// Helper function to normalize column names
function normalizeColumnName(name) {
  if (!name) return '';
  return name.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Helper function to find column by multiple possible names
function findColumn(row, possibleNames) {
  const normalizedRow = {};
  Object.keys(row).forEach(key => {
    normalizedRow[normalizeColumnName(key)] = row[key];
  });
  
  for (const name of possibleNames) {
    const normalizedName = normalizeColumnName(name);
    if (normalizedRow[normalizedName] !== undefined) {
      return normalizedRow[normalizedName];
    }
  }
  return null;
}

// Helper function to validate and clean ASIN
function validateASIN(asin) {
  if (!asin) return '';
  const cleaned = asin.toString().trim().toUpperCase();
  // ASIN should be 10 alphanumeric characters
  if (/^[A-Z0-9]{10}$/.test(cleaned)) {
    return cleaned;
  }
  return '';
}

// Helper function to parse price
function parsePrice(value) {
  if (!value || value === '' || value === null || value === undefined) return 0;
  const cleaned = value.toString().replace(/[£$€,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

// Helper function to parse integer
function parseInteger(value) {
  if (!value || value === '' || value === null || value === undefined) return 0;
  const cleaned = value.toString().replace(/[,\s]/g, '');
  const parsed = parseInt(cleaned);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

// Helper function to parse rating
function parseRating(value) {
  if (!value || value === '' || value === null || value === undefined) return 4.0;
  const parsed = parseFloat(value.toString());
  if (isNaN(parsed)) return 4.0;
  return Math.min(5.0, Math.max(0, parsed));
}

// Temporary upload route without authentication for testing
router.post('/upload-test', (req, res, next) => {
  upload.single('excelFile')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 1GB.',
          error: 'FILE_TOO_LARGE'
        });
      }
      
      if (err.message.includes('Only Excel files')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files only.',
          error: 'INVALID_FILE_TYPE'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message,
        error: 'UPLOAD_ERROR'
      });
    }
    
    // Set a fake admin for testing - use a valid ObjectId format
    req.admin = { _id: new mongoose.Types.ObjectId() };
    
    // Continue to the main upload handler
    handleExcelUpload(req, res);
  });
});
router.post('/upload', (req, res, next) => {
  // First check if we have a valid admin token
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required. Please login as admin first.',
      error: 'NO_AUTH_TOKEN'
    });
  }

  // Continue with file upload
  upload.single('excelFile')(req, res, (err) => {
    if (err) {
      console.error('❌ Multer error:', err);
      
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 1GB.',
          error: 'FILE_TOO_LARGE'
        });
      }
      
      if (err.message.includes('Only Excel files')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Please upload Excel (.xlsx, .xls) or CSV files only.',
          error: 'INVALID_FILE_TYPE'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'File upload error: ' + err.message,
        error: 'UPLOAD_ERROR'
      });
    }
    
    // Now authenticate admin
    authenticateAdmin(req, res, (authErr) => {
      if (authErr) {
        return res.status(401).json({
          success: false,
          message: 'Admin authentication failed. Please login as admin.',
          error: 'AUTH_FAILED'
        });
      }
      
      // Continue to the main upload handler
      handleExcelUpload(req, res);
    });
  });
});

// Main Excel upload handler
async function handleExcelUpload(req, res) {
  const startTime = Date.now();
  let excelUpload = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    console.log('📊 Processing Excel file:', req.file.filename);
    console.log('📊 File size:', (req.file.size / 1024 / 1024).toFixed(2), 'MB');
    console.log('📊 Admin user:', req.admin ? req.admin._id : 'undefined');
    
    // Create Excel upload record
    excelUpload = new ExcelUpload({
      fileName: req.file.filename,
      originalFileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.admin?._id || null, // Use the fake admin ID
      status: 'processing'
    });
    await excelUpload.save();
    
    console.log('📊 Created Excel upload record:', excelUpload._id);
    
    // For large files, use streaming to avoid memory issues
    const workbook = xlsx.readFile(req.file.path, {
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      excelUpload.status = 'failed';
      excelUpload.errorDetails = ['Excel file is empty or has no valid data'];
      await excelUpload.save();
      
      return res.status(400).json({
        success: false,
        message: 'Excel file is empty or has no valid data'
      });
    }

    console.log(`📊 Found ${rawData.length} rows in Excel file`);
    console.log('📊 Sample columns:', Object.keys(rawData[0]));

    const processedProducts = [];
    const errors = [];
    const duplicateASINs = new Set();

    // Process each row
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      
      try {
        // Extract product data using flexible column matching
        const title = findColumn(row, [
          'product', 'title', 'name', 'product name', 'product title', 'productname', 'producttitle'
        ]);
        
        const asin = validateASIN(findColumn(row, [
          'asin', 'product asin', 'productasin', 'asin code', 'asincode', 'parent asin', 'parentasin'
        ]));
        
        const sku = findColumn(row, [
          'sku', 'product sku', 'productsku', 'sku code', 'skucode', 'item code', 'itemcode'
        ]);
        
        const category = findColumn(row, [
          'category', 'product category', 'productcategory', 'cat',
          'main category name', 'maincategoryname', 'primary subcategory name', 'primarysubcategoryname'
        ]);
        
        // Normalize category name to prevent duplicates
        const normalizedCategory = normalizeCategoryName(category);
        
        const price = parsePrice(findColumn(row, [
          'price', 'product price', 'productprice', 'cost', 'amount', 'unit price', 'unitprice',
          'buy box price', 'buyboxprice', 'selling price', 'sellingprice'
        ]));
        
        const reviews = parseInteger(findColumn(row, [
          'reviews', 'review count', 'reviewcount', 'number of reviews', 'numberofreviews',
          'monthly sales', 'monthly sale', 'monthlysales', 'monthlysale', 'sales',
          'ratings count', 'ratingscount', 'est monthly units sold', 'estmonthlyunitssold'
        ]));
        
        const dealUnits = parseInteger(findColumn(row, [
          'deal units', 'dealunits', 'units', 'quantity', 'qty', 'deal qty', 'dealqty',
          'est monthly units sold', 'estmonthlyunitssold', 'monthly units sold', 'monthlyunitssold'
        ]));
        
        const rating = parseRating(findColumn(row, [
          'rating', 'product rating', 'productrating', 'star rating', 'starrating', 'stars'
        ]));

        // Validate required fields - only title is truly required
        if (!title || title.toString().trim().length === 0) {
          errors.push(`Row ${i + 2}: Missing product title`);
          continue;
        }

        // Check if price is valid
        if (price === null || price === undefined || isNaN(price) || price < 0) {
          errors.push(`Row ${i + 2}: Invalid or missing price for "${title}"`);
          continue;
        }

        // If price is 0, set a default minimum price
        const finalPrice = price > 0 ? price : 1.00;

        // Check for duplicate ASIN in this upload
        if (asin && duplicateASINs.has(asin)) {
          errors.push(`Row ${i + 2}: Duplicate ASIN ${asin} in upload`);
          continue;
        }
        
        if (asin) {
          duplicateASINs.add(asin);
        }

        // Try to find images from Cloudinary based on ASIN
        let productImages = [];
        if (asin && isCloudinaryConfigured()) {
          try {
            // Search for images in Cloudinary with ASIN in the public_id or tags
            const cloudinaryImages = await listCloudinaryImages(`products/${asin}`);
            if (cloudinaryImages && cloudinaryImages.length > 0) {
              productImages = cloudinaryImages.map(img => img.secure_url);
              console.log(`✅ Found ${productImages.length} images for ASIN ${asin} from Cloudinary`);
            }
          } catch (error) {
            console.log(`⚠️ Could not fetch Cloudinary images for ASIN ${asin}:`, error.message);
          }
        }

        // Create Excel product object
        const excelProductData = {
          excelUploadId: excelUpload._id,
          name: title.toString().trim(),
          asin: asin || undefined,
          sku: sku ? sku.toString().trim().toUpperCase() : undefined,
          price: finalPrice,
          originalPrice: finalPrice * 1.2, // Default 20% markup for original price
          category: normalizedCategory ? normalizedCategory.toString().trim() : 'Uncategorized',
          rating: rating > 0 ? rating : 4.0, // Default rating if missing
          reviews: reviews >= 0 ? reviews : 0, // Allow 0 reviews
          dealUnits: dealUnits > 0 ? dealUnits : 1, // Default to 1 if missing
          stock: 100, // Default stock
          description: `Quality ${title.toString().trim()} with excellent features.`,
          images: productImages, // Images from Cloudinary or empty array
          currency: 'GBP',
          status: 'pending', // Products start as pending
          rowNumber: i + 2, // Excel row number (1-based + header)
          rawData: row // Store original Excel data
        };

        processedProducts.push(excelProductData);

      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    console.log(`📊 Processed ${processedProducts.length} valid products`);
    console.log(`📊 Found ${errors.length} errors`);

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    if (processedProducts.length === 0) {
      excelUpload.status = 'failed';
      excelUpload.errorDetails = errors;
      excelUpload.summary.errors = errors.length;
      await excelUpload.save();
      
      return res.status(400).json({
        success: false,
        message: 'No valid products found in Excel file',
        errors: errors
      });
    }

    // Handle existing ASINs if updateExisting is enabled
    const { updateExisting = false } = req.body;
    const productsToInsert = [];
    const productsToUpdate = [];

    if (updateExisting && processedProducts.some(p => p.asin)) {
      // Check for existing ASINs in this Excel upload only
      const asinsToCheck = processedProducts.filter(p => p.asin).map(p => p.asin);
      const existingProducts = await ExcelProduct.find({ 
        asin: { $in: asinsToCheck },
        excelUploadId: excelUpload._id
      }).select('asin');
      
      const existingASINs = new Set(existingProducts.map(p => p.asin));

      for (const product of processedProducts) {
        if (product.asin && existingASINs.has(product.asin)) {
          productsToUpdate.push(product);
        } else {
          productsToInsert.push(product);
        }
      }
    } else {
      productsToInsert.push(...processedProducts);
    }

    let insertedCount = 0;
    let updatedCount = 0;

    // Bulk insert new Excel products in batches for large files
    if (productsToInsert.length > 0) {
      try {
        const batchSize = 1000; // Process 1000 products at a time
        let totalInserted = 0;
        
        for (let i = 0; i < productsToInsert.length; i += batchSize) {
          const batch = productsToInsert.slice(i, i + batchSize);
          console.log(`📊 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(productsToInsert.length/batchSize)} (${batch.length} products)`);
          
          const insertResult = await ExcelProduct.insertMany(batch, { ordered: false });
          totalInserted += insertResult.length;
        }
        
        insertedCount = totalInserted;
        console.log(`✅ Inserted ${insertedCount} new Excel products in batches`);
      } catch (error) {
        console.error('❌ Bulk insert error:', error);
        errors.push(`Bulk insert failed: ${error.message}`);
      }
    }

    // Update existing Excel products if requested
    if (productsToUpdate.length > 0) {
      for (const product of productsToUpdate) {
        try {
          await ExcelProduct.updateOne(
            { asin: product.asin, excelUploadId: excelUpload._id },
            { $set: product }
          );
          updatedCount++;
        } catch (error) {
          errors.push(`Failed to update product with ASIN ${product.asin}: ${error.message}`);
        }
      }
      console.log(`✅ Updated ${updatedCount} existing Excel products`);
    }

    // Get unique categories
    const uniqueCategories = [...new Set(processedProducts.map(p => p.category))];

    // Update Excel upload record with results
    const processingTime = Date.now() - startTime;
    excelUpload.status = 'completed';
    excelUpload.summary = {
      totalRows: rawData.length,
      processedProducts: processedProducts.length,
      insertedProducts: insertedCount,
      updatedProducts: updatedCount,
      errors: errors.length,
      categories: uniqueCategories
    };
    excelUpload.errorDetails = errors.length > 0 ? errors : [];
    excelUpload.processingTime = processingTime;
    await excelUpload.save();

    res.json({
      success: true,
      message: `Excel upload completed successfully`,
      uploadId: excelUpload._id,
      fileName: excelUpload.originalFileName,
      summary: {
        totalRows: rawData.length,
        processedProducts: processedProducts.length,
        insertedProducts: insertedCount,
        updatedProducts: updatedCount,
        errors: errors.length,
        categories: uniqueCategories,
        processingTime: processingTime
      },
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Excel upload error:', error);
    
    // Update Excel upload record with error
    if (excelUpload) {
      excelUpload.status = 'failed';
      excelUpload.errorDetails = [error.message];
      excelUpload.processingTime = Date.now() - startTime;
      await excelUpload.save();
    }
    
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to process Excel file',
      error: error.message
    });
  }
}

// Get all Excel uploads
router.get('/uploads', authenticateAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    // Validate and cap the limit to prevent performance issues
    const validatedLimit = Math.min(parseInt(limit) || 50, 200);
    
    const uploads = await ExcelUpload.find({ isActive: true })
      .sort({ uploadedAt: -1 })
      .limit(validatedLimit)
      .skip((parseInt(page) - 1) * validatedLimit)
      .lean(); // Remove populate since we don't need admin details for now

    const total = await ExcelUpload.countDocuments({ isActive: true });

    res.json({
      success: true,
      uploads,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / validatedLimit),
        totalUploads: total,
        limit: validatedLimit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching Excel uploads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Excel uploads',
      error: error.message
    });
  }
});

// Get products from specific Excel upload
router.get('/uploads/:uploadId/products', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { page = 1, limit = 50, search, category, status } = req.query;
    
    // Validate and cap the limit to prevent performance issues
    const validatedLimit = Math.min(parseInt(limit) || 50, 200);
    
    const query = {
      excelUploadId: uploadId
    };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { asin: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category && category !== 'all') {
      query.category = category;
    }
    
    if (status && status !== 'all') {
      if (status === 'approval') {
        // For approval status, we need to find products that are converted and have pending approval
        query.isConverted = true;
        query.status = 'pending';
      } else if (status === 'blocked') {
        // For blocked status, we'll filter on the frontend since it requires conflict checking
        // Just use pending status and let frontend filter based on conflicts
        query.status = 'pending';
        query.isConverted = false;
      } else {
        query.status = status;
      }
    }

    const products = await ExcelProduct.find(query)
      .sort({ rowNumber: 1 }) // Sort by Excel row order
      .limit(validatedLimit)
      .skip((parseInt(page) - 1) * validatedLimit)
      .lean();

    const total = await ExcelProduct.countDocuments(query);

    // Sync status with main products for converted items and check conflicts for non-converted
    const productsWithSyncedStatus = await Promise.all(products.map(async (product) => {
      if (product.isConverted && product.mainProductId) {
        try {
          // Check main product's approval status
          const mainProduct = await Product.findById(product.mainProductId)
            .select('status approvalStatus isAmazonsChoice')
            .lean();
          
          if (mainProduct) {
            // Determine correct status based on main product's approval status
            let syncedStatus = 'pending';
            
            if (mainProduct.approvalStatus === 'approved' && mainProduct.status === 'active') {
              syncedStatus = 'listed'; // Approved and active = listed
            } else if (mainProduct.approvalStatus === 'pending') {
              syncedStatus = 'pending'; // In approval queue
            } else if (mainProduct.approvalStatus === 'rejected') {
              syncedStatus = 'inactive'; // Rejected
            } else if (mainProduct.status === 'inactive') {
              syncedStatus = 'inactive'; // Inactive
            }
            
            // Update Excel product status if it's different
            if (product.status !== syncedStatus) {
              await ExcelProduct.updateOne(
                { _id: product._id },
                { $set: { status: syncedStatus } }
              );
              product.status = syncedStatus;
            }
            
            // Add approval status info for frontend
            product.approvalStatus = mainProduct.approvalStatus;
            product.mainProductStatus = mainProduct.status;
          } else {
            // Main product doesn't exist anymore, reset Excel product
            if (product.status !== 'pending' || product.isConverted) {
              await ExcelProduct.updateOne(
                { _id: product._id },
                { 
                  $set: { 
                    status: 'pending',
                    isConverted: false
                  },
                  $unset: { mainProductId: 1 }
                }
              );
              product.status = 'pending';
              product.isConverted = false;
              delete product.mainProductId;
            }
          }
        } catch (error) {
          console.error(`Error syncing status for product ${product._id}:`, error);
        }
      } else {
        // For non-converted products, check for ASIN/SKU conflicts
        try {
          let asinConflict = false;
          let skuConflict = false;
          
          // Check ASIN conflict
          if (product.asin && product.asin.trim()) {
            const existingAsin = await Product.findOne({ 
              asin: product.asin.toUpperCase() 
            }).select('_id approvalStatus').lean();
            
            if (existingAsin) {
              asinConflict = true;
            }
          }
          
          // Check SKU conflict
          if (product.sku && product.sku.trim()) {
            const existingSku = await Product.findOne({ 
              sku: product.sku.toUpperCase() 
            }).select('_id approvalStatus').lean();
            
            if (existingSku) {
              skuConflict = true;
            }
          }
          
          // Add conflict info to product
          product.asinConflict = asinConflict;
          product.skuConflict = skuConflict;
          
          // Update status based on conflicts
          if ((asinConflict || skuConflict) && product.status === 'pending') {
            // Don't change status in database, just mark for frontend
            product.hasConflicts = true;
          }
          
        } catch (error) {
          console.error(`Error checking conflicts for product ${product._id}:`, error);
        }
      }
      
      return product;
    }));

    // Apply frontend filtering for blocked status
    let finalProducts = productsWithSyncedStatus;
    if (status === 'blocked') {
      finalProducts = productsWithSyncedStatus.filter(product => 
        !product.isConverted && (product.asinConflict || product.skuConflict)
      );
    }

    // Get upload info
    const upload = await ExcelUpload.findById(uploadId).lean();

    res.json({
      success: true,
      products: finalProducts,
      upload,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / validatedLimit),
        totalProducts: status === 'blocked' ? finalProducts.length : total,
        limit: validatedLimit
      }
    });

  } catch (error) {
    console.error('❌ Error fetching Excel products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Excel products',
      error: error.message
    });
  }
});

// Sync Excel product statuses with main products
router.post('/uploads/:uploadId/sync-status', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    // Get all Excel products for this upload that are converted
    const convertedProducts = await ExcelProduct.find({
      excelUploadId: uploadId,
      isConverted: true,
      mainProductId: { $exists: true }
    });
    
    let syncedCount = 0;
    let fixedCount = 0;
    const errors = [];
    
    for (const excelProduct of convertedProducts) {
      try {
        // Check if main product exists and get its status
        const mainProduct = await Product.findById(excelProduct.mainProductId)
          .select('status category isAmazonsChoice approvalStatus')
          .lean();
        
        if (mainProduct) {
          // Determine correct status based on main product
          let correctStatus = 'listed';
          
          if (mainProduct.approvalStatus === 'approved' && mainProduct.status === 'active') {
            if (mainProduct.isAmazonsChoice) {
              correctStatus = 'listed'; // Listed and showing in Amazon's Choice
            } else {
              correctStatus = 'active'; // Listed but not in Amazon's Choice
            }
          } else if (mainProduct.status === 'inactive') {
            correctStatus = 'inactive';
          } else if (mainProduct.approvalStatus === 'pending') {
            correctStatus = 'pending';
          } else {
            correctStatus = mainProduct.status;
          }
          
          // Update if status is different or if we need to sync other fields
          const needsUpdate = excelProduct.status !== correctStatus || 
                             excelProduct.category !== mainProduct.category;
          
          if (needsUpdate) {
            await ExcelProduct.updateOne(
              { _id: excelProduct._id },
              { 
                $set: { 
                  status: correctStatus,
                  category: mainProduct.category, // Also sync category
                  isListed: mainProduct.status === 'active' && mainProduct.approvalStatus === 'approved',
                  listedAt: mainProduct.status === 'active' && mainProduct.approvalStatus === 'approved' ? new Date() : excelProduct.listedAt
                }
              }
            );
            syncedCount++;
          }
        } else {
          // Main product doesn't exist, reset Excel product
          await ExcelProduct.updateOne(
            { _id: excelProduct._id },
            { 
              $set: { 
                status: 'pending',
                isConverted: false
              },
              $unset: { mainProductId: 1 }
            }
          );
          fixedCount++;
        }
      } catch (error) {
        errors.push(`Error syncing ${excelProduct.name}: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      message: `Status sync completed for upload ${uploadId}`,
      syncedCount,
      fixedCount,
      totalProcessed: convertedProducts.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error syncing Excel product statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Excel product statuses',
      error: error.message
    });
  }
});

// Global sync for all Excel products across all uploads
router.post('/sync-all-statuses', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔄 Starting global Excel products status sync...');
    
    // Get all Excel products that are converted
    const convertedProducts = await ExcelProduct.find({
      isConverted: true,
      mainProductId: { $exists: true }
    }).populate('excelUploadId', 'fileName');
    
    let syncedCount = 0;
    let fixedCount = 0;
    let amazonChoiceCount = 0;
    const errors = [];
    const statusBreakdown = {
      listed: 0,
      active: 0,
      inactive: 0,
      pending: 0
    };
    
    console.log(`📊 Found ${convertedProducts.length} converted Excel products to sync`);
    
    for (const excelProduct of convertedProducts) {
      try {
        // Check if main product exists and get its status
        const mainProduct = await Product.findById(excelProduct.mainProductId)
          .select('status category isAmazonsChoice approvalStatus name')
          .lean();
        
        if (mainProduct) {
          // Determine correct status based on main product
          let correctStatus = 'listed';
          
          if (mainProduct.approvalStatus === 'approved' && mainProduct.status === 'active') {
            if (mainProduct.isAmazonsChoice) {
              correctStatus = 'listed'; // Listed and showing in Amazon's Choice
              amazonChoiceCount++;
            } else {
              correctStatus = 'active'; // Listed but not in Amazon's Choice
            }
          } else if (mainProduct.status === 'inactive') {
            correctStatus = 'inactive';
          } else if (mainProduct.approvalStatus === 'pending') {
            correctStatus = 'pending';
          } else {
            correctStatus = mainProduct.status;
          }
          
          statusBreakdown[correctStatus]++;
          
          // Update if status is different or if we need to sync other fields
          const needsUpdate = excelProduct.status !== correctStatus || 
                             excelProduct.category !== mainProduct.category;
          
          if (needsUpdate) {
            await ExcelProduct.updateOne(
              { _id: excelProduct._id },
              { 
                $set: { 
                  status: correctStatus,
                  category: mainProduct.category,
                  isListed: mainProduct.status === 'active' && mainProduct.approvalStatus === 'approved',
                  listedAt: mainProduct.status === 'active' && mainProduct.approvalStatus === 'approved' ? new Date() : excelProduct.listedAt
                }
              }
            );
            syncedCount++;
          }
        } else {
          // Main product doesn't exist, reset Excel product
          await ExcelProduct.updateOne(
            { _id: excelProduct._id },
            { 
              $set: { 
                status: 'pending',
                isConverted: false,
                isListed: false
              },
              $unset: { mainProductId: 1, listedAt: 1 }
            }
          );
          fixedCount++;
        }
      } catch (error) {
        errors.push(`Error syncing ${excelProduct.name}: ${error.message}`);
      }
    }
    
    console.log('✅ Global Excel products sync completed:', {
      totalProcessed: convertedProducts.length,
      syncedCount,
      fixedCount,
      amazonChoiceCount,
      statusBreakdown
    });
    
    res.json({
      success: true,
      message: 'Global Excel products status sync completed',
      totalProcessed: convertedProducts.length,
      syncedCount,
      fixedCount,
      amazonChoiceCount,
      statusBreakdown,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error in global Excel products sync:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Excel products globally',
      error: error.message
    });
  }
});

// Get categories from specific Excel upload
router.get('/uploads/:uploadId/categories', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    const categories = await ExcelProduct.distinct('category', {
      excelUploadId: uploadId
    });

    res.json({
      success: true,
      categories: categories.filter(cat => cat && cat.trim() !== '').sort()
    });

  } catch (error) {
    console.error('❌ Error fetching Excel categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Excel categories',
      error: error.message
    });
  }
});

// Get single Excel product for editing
router.get('/uploads/:uploadId/products/:productId', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId, productId } = req.params;
    
    const product = await ExcelProduct.findOne({
      _id: productId,
      excelUploadId: uploadId
    }).lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Excel product not found'
      });
    }

    // Get upload info
    const upload = await ExcelUpload.findById(uploadId).lean();

    res.json({
      success: true,
      product,
      upload
    });

  } catch (error) {
    console.error('❌ Error fetching Excel product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Excel product',
      error: error.message
    });
  }
});

// Update single field of Excel product (for inline editing)
router.patch('/uploads/:uploadId/products/:productId/update-field', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId, productId } = req.params;
    const { field, value } = req.body;
    
    // Validate allowed fields
    const allowedFields = ['asin', 'sku', 'category', 'price', 'rating', 'reviews'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({
        success: false,
        message: `Field '${field}' is not allowed for editing`
      });
    }

    // Find the Excel product
    const excelProduct = await ExcelProduct.findOne({
      _id: productId,
      excelUploadId: uploadId
    });

    if (!excelProduct) {
      return res.status(404).json({
        success: false,
        message: 'Excel product not found'
      });
    }

    // Update the field
    let updateData = { [field]: value };
    
    // Special handling for SKU field
    if (field === 'sku') {
      if (value && value.trim()) {
        updateData[field] = value.trim().toUpperCase();
      } else {
        updateData[field] = '';
      }
    }
    
    await ExcelProduct.updateOne(
      { _id: productId },
      { $set: updateData }
    );

    // If the product is already converted to main products, update the main product too
    if (excelProduct.isConverted && excelProduct.mainProductId) {
      try {
        await Product.updateOne(
          { _id: excelProduct.mainProductId },
          { $set: updateData }
        );
        console.log(`✅ Updated both Excel product and main product for field: ${field}`);
      } catch (mainProductError) {
        console.error('⚠️ Failed to update main product:', mainProductError);
        // Don't fail the request if main product update fails
      }
    }

    res.json({
      success: true,
      message: `Successfully updated ${field}`,
      field,
      value
    });

  } catch (error) {
    console.error('❌ Error updating Excel product field:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product field',
      error: error.message
    });
  }
});

// Save Excel product directly to main products (with editing)
router.post('/uploads/:uploadId/products/:productId/save-to-main', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId, productId } = req.params;
    const editedProductData = req.body;
    
    // Get the original Excel product
    const excelProduct = await ExcelProduct.findOne({
      _id: productId,
      excelUploadId: uploadId
    });

    if (!excelProduct) {
      return res.status(404).json({
        success: false,
        message: 'Excel product not found'
      });
    }

    // Create main product with edited data
    const mainProductData = {
      name: editedProductData.name || excelProduct.name,
      price: parseFloat(editedProductData.price) || excelProduct.price,
      category: editedProductData.category || excelProduct.category,
      description: editedProductData.description || excelProduct.description || '',
      brand: editedProductData.brand || excelProduct.brand || '',
      asin: editedProductData.asin || excelProduct.asin || '',
      rating: parseFloat(editedProductData.rating) || excelProduct.rating || 4.0,
      reviews: parseInt(editedProductData.reviews) || excelProduct.reviews || 0,
      dealUnits: parseInt(editedProductData.dealUnits) || excelProduct.dealUnits || 1,
      stock: parseInt(editedProductData.stock) || excelProduct.stock || 100,
      images: editedProductData.images || excelProduct.images || [],
      currency: editedProductData.currency || excelProduct.currency || 'GBP',
      features: editedProductData.features || excelProduct.features || [],
      
      // Main product specific fields
      status: 'active', // Make it active when saved
      isAdminProduct: true,
      listedBy: 'admin',
      marketplace: editedProductData.marketplace || 'UK',
      isAmazonsChoice: editedProductData.isAmazonsChoice || false,
      isBestSeller: editedProductData.isBestSeller || false,
      showOnHome: editedProductData.showOnHome || false,
      
      // Add reference to Excel source
      excelSource: {
        uploadId: uploadId,
        excelProductId: excelProduct._id,
        fileName: editedProductData.fileName || 'Excel Upload',
        rowNumber: excelProduct.rowNumber
      }
    };

    // Validate required fields
    if (!mainProductData.name || !mainProductData.price || !mainProductData.category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, price, and category are required'
      });
    }

    // Insert into main products collection
    console.log('🔍 Product model:', Product);
    console.log('🔍 Product constructor:', Product.constructor);
    console.log('🔍 mainProductData:', mainProductData);
    
    try {
      const mainProduct = new Product(mainProductData);
      console.log('🔍 mainProduct instance:', mainProduct);
      console.log('🔍 mainProduct.save method type:', typeof mainProduct.save);
      
      const savedProduct = await mainProduct.save();
      console.log('✅ Product saved successfully:', savedProduct._id);
      
      // Update Excel product as converted
      await ExcelProduct.updateOne(
        { _id: productId },
        {
          $set: {
            isConverted: true,
            convertedAt: new Date(),
            mainProductId: savedProduct._id,
            status: 'listed'
          }
        }
      );

      res.json({
        success: true,
        message: 'Product saved to main products successfully',
        mainProductId: savedProduct._id,
        excelProductId: productId
      });
      
    } catch (saveError) {
      console.error('❌ Error creating/saving Product:', saveError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create product in database',
        error: saveError.message
      });
    }

  } catch (error) {
    console.error('❌ Error saving Excel product to main:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save product to main products',
      error: error.message
    });
  }
});
router.post('/uploads/:uploadId/convert-products', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { productIds } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    // Get Excel products to convert
    const excelProducts = await ExcelProduct.find({
      _id: { $in: productIds },
      excelUploadId: uploadId,
      isConverted: false
    });

    if (excelProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid products found to convert'
      });
    }

    const convertedProducts = [];
    const errors = [];

    for (const excelProduct of excelProducts) {
      try {
        // Check for uploaded images for this ASIN
        let productImages = excelProduct.images || [];
        
        if (excelProduct.asin) {
          // Look for uploaded images matching this ASIN (now stored as Cloudinary URLs)
          const imageUpload = await ImageUpload.findOne({
            'images.asin': excelProduct.asin.toUpperCase(),
            status: 'completed'
          });
          
          if (imageUpload) {
            const matchingImage = imageUpload.images.find(img => img.asin === excelProduct.asin.toUpperCase());
            if (matchingImage && matchingImage.cloudinaryUrl) {
              // Use Cloudinary URL directly
              const imageUrl = matchingImage.cloudinaryUrl;
              
              // Add to the beginning of images array (main image)
              if (!productImages.includes(imageUrl)) {
                productImages.unshift(imageUrl);
              }
              
              console.log('✅ Added Cloudinary image for ASIN:', excelProduct.asin, 'URL:', imageUrl);
            } else if (matchingImage && matchingImage.filePath && matchingImage.filePath.includes('cloudinary.com')) {
              // Fallback: if cloudinaryUrl field doesn't exist but filePath contains Cloudinary URL
              const imageUrl = matchingImage.filePath;
              
              if (!productImages.includes(imageUrl)) {
                productImages.unshift(imageUrl);
              }
              
              console.log('✅ Added Cloudinary image (from filePath) for ASIN:', excelProduct.asin, 'URL:', imageUrl);
            }
          }
        }

        // Create main product from Excel product
        const mainProductData = {
          name: excelProduct.name,
          price: excelProduct.price,
          category: excelProduct.category || 'uncategorized', // Ensure category is never null/undefined
          description: excelProduct.description || '',
          brand: excelProduct.brand || '',
          asin: excelProduct.asin || '',
          rating: excelProduct.rating || 4.0,
          reviews: excelProduct.reviews || 0,
          dealUnits: excelProduct.dealUnits || 1,
          stock: excelProduct.stock || 100,
          images: productImages, // Use the images array with uploaded images
          currency: excelProduct.currency || 'GBP',
          features: excelProduct.features || [],
          originalPrice: excelProduct.originalPrice || excelProduct.price * 1.2,
          
          status: 'active', // Make it active when converted
          isAdminProduct: true,
          listedBy: 'admin',
          marketplace: 'UK',
          isAmazonsChoice: true, // Auto-list converted products on Amazon's Choice page
          isBestSeller: false,
          showOnHome: false,
          // Add reference to Excel source
          excelSource: {
            uploadId: uploadId,
            excelProductId: excelProduct._id,
            fileName: excelProduct.originalFileName
          }
        };

        // Validate and clean category name
        if (mainProductData.category) {
          // Clean up category name: trim whitespace, ensure it's a string
          mainProductData.category = String(mainProductData.category).trim();
          
          // If category is empty after trimming, set to uncategorized
          if (!mainProductData.category) {
            mainProductData.category = 'uncategorized';
          }
          
        } else {
          mainProductData.category = 'uncategorized';
        }

        // Validate required fields
        if (!mainProductData.name || !mainProductData.price || !mainProductData.category) {
          errors.push(`Failed to convert ${excelProduct.name}: Missing required fields (name: ${!!mainProductData.name}, price: ${!!mainProductData.price}, category: ${!!mainProductData.category})`);
          continue;
        }

        // Insert into main products collection
        try {
          const mainProduct = new Product(mainProductData);
          const savedProduct = await mainProduct.save();

          // Update Excel product as converted
          await ExcelProduct.updateOne(
            { _id: excelProduct._id },
            {
              $set: {
                isConverted: true,
                convertedAt: new Date(),
                mainProductId: savedProduct._id,
                status: 'listed'
              }
            }
          );

          convertedProducts.push({
            excelProductId: excelProduct._id,
            mainProductId: savedProduct._id,
            name: excelProduct.name
          });
        } catch (saveError) {
          console.error('❌ Error saving product:', saveError);
          errors.push(`Failed to convert ${excelProduct.name}: ${saveError.message}`);
        }

      } catch (error) {
        errors.push(`Failed to convert ${excelProduct.name}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Successfully converted ${convertedProducts.length} products`,
      convertedProducts,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ Error converting Excel products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert Excel products',
      error: error.message
    });
  }
});

// POST /api/admin-excel/uploads/:uploadId/bulk-convert-products - Bulk conversion for Excel products
router.post('/uploads/:uploadId/bulk-convert-products', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { productIds, productsWithPrices } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }

    console.log(`🚀 Starting bulk conversion of ${productIds.length} products to approval queue`);

    // Get Excel products to convert
    const excelProducts = await ExcelProduct.find({
      _id: { $in: productIds },
      excelUploadId: uploadId,
      isConverted: false
    });

    if (excelProducts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid products found to convert'
      });
    }

    // Check if all products have SKU
    const productsWithoutSKU = excelProducts.filter(p => !p.sku || p.sku.trim() === '');
    if (productsWithoutSKU.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot convert products without SKU: ${productsWithoutSKU.map(p => p.name).join(', ')}`
      });
    }

    // Check for duplicate ASIN/SKU in existing products
    const duplicateChecks = [];
    for (const product of excelProducts) {
      if (product.asin && product.asin.trim()) {
        const existingAsin = await Product.findOne({ asin: product.asin.toUpperCase() });
        if (existingAsin) {
          duplicateChecks.push(`ASIN ${product.asin} already exists (${product.name})`);
        }
      }
      
      const existingSku = await Product.findOne({ sku: product.sku.toUpperCase() });
      if (existingSku) {
        duplicateChecks.push(`SKU ${product.sku} already exists (${product.name})`);
      }
    }

    if (duplicateChecks.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Duplicate ASIN/SKU found: ${duplicateChecks.join(', ')}`
      });
    }

    const convertedProducts = [];
    const errors = [];
    const categoriesProcessed = new Set();
    let productsWithImages = 0;

    // Get existing categories from main products for smart matching
    const existingCategories = await Product.distinct('category', { 
      status: 'active', 
      approvalStatus: 'approved' 
    });
    const existingCategoriesSet = new Set(existingCategories.map(cat => cat.toLowerCase().trim()));

    // Create a map of product prices if provided
    const priceMap = {};
    if (productsWithPrices && Array.isArray(productsWithPrices)) {
      productsWithPrices.forEach(item => {
        if (item.productId && item.price !== undefined) {
          priceMap[item.productId] = parseFloat(item.price);
        }
      });
      console.log(`💰 Price updates provided for ${Object.keys(priceMap).length} products`);
    }

    for (const excelProduct of excelProducts) {
      try {
        // Get updated price if provided, otherwise use original price
        const updatedPrice = priceMap[excelProduct._id.toString()] || excelProduct.price;
        console.log(`💰 Product ${excelProduct.name}: Original price £${excelProduct.price}, Updated price £${updatedPrice}`);

        // Process category - create if new, use existing if same
        let productCategory = 'uncategorized';
        if (excelProduct.category && excelProduct.category.trim()) {
          const cleanCategory = excelProduct.category.trim();
          const lowerCategory = cleanCategory.toLowerCase();
          
          // Check if category already exists (case-insensitive)
          const existingCategory = existingCategories.find(cat => 
            cat.toLowerCase().trim() === lowerCategory
          );
          
          if (existingCategory) {
            // Use existing category with proper casing
            productCategory = existingCategory;
            console.log(`📂 Using existing category: ${existingCategory}`);
          } else {
            // Create new category with proper casing
            productCategory = cleanCategory;
            existingCategories.push(productCategory);
            existingCategoriesSet.add(lowerCategory);
            console.log(`📂 Creating new category: ${productCategory}`);
          }
          
          categoriesProcessed.add(productCategory);
        }

        // Check for uploaded images for this ASIN
        let productImages = excelProduct.images || [];
        let hasUploadedImage = false;
        
        if (excelProduct.asin) {
          // Look for uploaded images matching this ASIN (now stored as Cloudinary URLs)
          const imageUpload = await ImageUpload.findOne({
            'images.asin': excelProduct.asin.toUpperCase(),
            status: 'completed'
          });
          
          if (imageUpload) {
            const matchingImage = imageUpload.images.find(img => img.asin === excelProduct.asin.toUpperCase());
            if (matchingImage && matchingImage.cloudinaryUrl) {
              // Use Cloudinary URL directly
              const imageUrl = matchingImage.cloudinaryUrl;
              
              // Add to the beginning of images array (main image)
              if (!productImages.includes(imageUrl)) {
                productImages.unshift(imageUrl);
                hasUploadedImage = true;
                productsWithImages++;
              }
              
              console.log('✅ Added Cloudinary image for ASIN:', excelProduct.asin, 'URL:', imageUrl);
            } else if (matchingImage && matchingImage.filePath && matchingImage.filePath.includes('cloudinary.com')) {
              // Fallback: if cloudinaryUrl field doesn't exist but filePath contains Cloudinary URL
              const imageUrl = matchingImage.filePath;
              
              if (!productImages.includes(imageUrl)) {
                productImages.unshift(imageUrl);
                hasUploadedImage = true;
                productsWithImages++;
              }
              
              console.log('✅ Added Cloudinary image (from filePath) for ASIN:', excelProduct.asin, 'URL:', imageUrl);
            }
          }
          
          // Always add fallback Amazon image URLs (whether we found uploaded images or not)
          const fallbackUrls = [
            `https://images-na.ssl-images-amazon.com/images/P/${excelProduct.asin}.01._SCLZZZZZZZ_SX500_.jpg`,
            `https://m.media-amazon.com/images/I/${excelProduct.asin}._AC_SL1500_.jpg`,
            `https://images-na.ssl-images-amazon.com/images/I/${excelProduct.asin}._AC_SL1500_.jpg`
          ];
          
          // Add fallback URLs that aren't already in the array
          fallbackUrls.forEach(url => {
            if (!productImages.includes(url)) {
              productImages.push(url);
            }
          });
          
          console.log('📷 Added fallback Amazon image URLs for ASIN:', excelProduct.asin);
          
          // If we still don't have any images, at least we have the fallbacks
          if (!hasUploadedImage && productImages.length > 0) {
            productsWithImages++; // Count this as having images since we have fallbacks
          }
        }

        // Create main product from Excel product with enhanced data
        const mainProductData = {
          name: excelProduct.name,
          asin: excelProduct.asin ? excelProduct.asin.toUpperCase() : '',
          sku: excelProduct.sku.toUpperCase(),
          price: updatedPrice,
          category: productCategory,
          description: excelProduct.description || `High-quality ${excelProduct.name} available for wholesale. Perfect for resellers and businesses.`,
          brand: excelProduct.brand || 'Generic Wholesale',
          rating: excelProduct.rating || 4.2,
          reviews: excelProduct.reviews || Math.floor(Math.random() * 500) + 50, // Random reviews if not provided
          dealUnits: excelProduct.dealUnits || 1,
          stock: excelProduct.stock || 100,
          images: productImages,
          currency: excelProduct.currency || 'GBP',
          features: excelProduct.features || [
            'High Quality Materials',
            'Fast Shipping Available',
            'Wholesale Pricing',
            'Bulk Orders Welcome'
          ],
          originalPrice: excelProduct.originalPrice || updatedPrice * 1.3,
          
          // Send to approval queue instead of direct listing
          status: 'active',
          approvalStatus: 'pending', // Send to approval queue
          isAdminProduct: true,
          listedBy: 'admin',
          marketplace: 'UK',
          isAmazonsChoice: false, // Will be set after approval
          isBestSeller: false, // Will be set after approval
          showOnHome: false, // Will be set after approval
          
          // Add reference to Excel source
          excelSource: {
            uploadId: uploadId,
            excelProductId: excelProduct._id,
            fileName: excelProduct.originalFileName,
            bulkConverted: true,
            convertedAt: new Date()
          },
          
          // Add metadata for better searchability
          tags: [
            productCategory.toLowerCase(),
            'wholesale',
            'bulk',
            excelProduct.brand?.toLowerCase() || 'generic'
          ].filter(Boolean),
          
          // Enhanced profit calculation
          profit: Math.round((excelProduct.price * 0.25) * 100) / 100, // 25% profit margin
          profitPercentage: 25
        };

        // Validate required fields
        if (!mainProductData.name || !mainProductData.price || !mainProductData.category) {
          errors.push(`Failed to convert ${excelProduct.name}: Missing required fields`);
          continue;
        }

        // Insert into main products collection
        try {
          const mainProduct = new Product(mainProductData);
          const savedProduct = await mainProduct.save();

          // Update Excel product as converted
          await ExcelProduct.updateOne(
            { _id: excelProduct._id },
            {
              $set: {
                isConverted: true,
                convertedAt: new Date(),
                mainProductId: savedProduct._id,
                status: 'pending', // Mark as pending approval
                bulkConverted: true
              }
            }
          );

          convertedProducts.push({
            excelProductId: excelProduct._id,
            mainProductId: savedProduct._id,
            name: excelProduct.name,
            category: productCategory,
            hasImage: hasUploadedImage,
            approvalStatus: 'pending'
          });

          console.log(`✅ Converted to approval: ${excelProduct.name} → Category: ${productCategory} → Images: ${hasUploadedImage ? 'Yes' : 'No'}`);

        } catch (saveError) {
          console.error('❌ Error saving product:', saveError);
          errors.push(`Failed to convert ${excelProduct.name}: ${saveError.message}`);
        }

      } catch (error) {
        console.error('❌ Error processing product:', error);
        errors.push(`Failed to convert ${excelProduct.name}: ${error.message}`);
      }
    }

    console.log(`🎉 Bulk conversion completed: ${convertedProducts.length} products converted`);
    console.log(`📂 Categories processed: ${Array.from(categoriesProcessed).join(', ')}`);
    console.log(`🖼️ Products with images: ${productsWithImages}`);

    res.json({
      success: true,
      message: `Successfully bulk converted ${convertedProducts.length} products`,
      convertedProducts,
      categoriesProcessed: Array.from(categoriesProcessed).length,
      productsWithImages,
      errors: errors.length > 0 ? errors : undefined,
      developmentMode: true
    });

  } catch (error) {
    console.error('❌ Error in bulk conversion:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk convert Excel products',
      error: error.message
    });
  }
});

// Fix products with missing or invalid categories
router.post('/fix-product-categories', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔧 Starting category fix for products...');
    
    // Find products with missing, null, or empty categories
    const productsWithoutCategory = await Product.find({
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: '' },
        { category: { $regex: /^\s*$/ } } // Only whitespace
      ]
    });
    
    console.log(`📊 Found ${productsWithoutCategory.length} products without valid categories`);
    
    let fixedCount = 0;
    
    for (const product of productsWithoutCategory) {
      try {
        // Set to 'uncategorized' if no category
        await Product.updateOne(
          { _id: product._id },
          { $set: { category: 'uncategorized' } }
        );
        fixedCount++;
        console.log(`✅ Fixed category for product: ${product.name}`);
      } catch (error) {
        console.error(`❌ Failed to fix category for product ${product._id}:`, error);
      }
    }
    
    // Also check for products with inconsistent category formatting
    const allProducts = await Product.find({ 
      category: { $exists: true, $ne: null, $ne: '' },
      status: 'active'
    });
    
    let normalizedCount = 0;
    
    for (const product of allProducts) {
      try {
        const originalCategory = product.category;
        const normalizedCategory = String(originalCategory).trim();
        
        if (originalCategory !== normalizedCategory) {
          await Product.updateOne(
            { _id: product._id },
            { $set: { category: normalizedCategory || 'uncategorized' } }
          );
          normalizedCount++;
          console.log(`🔧 Normalized category for product: ${product.name} (${originalCategory} → ${normalizedCategory})`);
        }
      } catch (error) {
        console.error(`❌ Failed to normalize category for product ${product._id}:`, error);
      }
    }
    
    res.json({
      success: true,
      message: `Category fix completed`,
      results: {
        productsWithoutCategory: productsWithoutCategory.length,
        fixedCount,
        normalizedCount,
        totalProcessed: fixedCount + normalizedCount
      }
    });
    
  } catch (error) {
    console.error('❌ Error fixing product categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fix product categories',
      error: error.message
    });
  }
});

// Delete Excel upload and all its products
router.delete('/uploads/:uploadId', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    // Delete all Excel products for this upload
    const deleteProductsResult = await ExcelProduct.deleteMany({ excelUploadId: uploadId });
    
    // Mark Excel upload as inactive
    const upload = await ExcelUpload.findByIdAndUpdate(
      uploadId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!upload) {
      return res.status(404).json({
        success: false,
        message: 'Excel upload not found'
      });
    }

    res.json({
      success: true,
      message: `Successfully deleted Excel upload and ${deleteProductsResult.deletedCount} products`,
      deletedProducts: deleteProductsResult.deletedCount
    });

  } catch (error) {
    console.error('❌ Error deleting Excel upload:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete Excel upload',
      error: error.message
    });
  }
});

// Get Excel upload statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalUploads = await ExcelUpload.countDocuments({ isActive: true });
    const totalExcelProducts = await ExcelProduct.countDocuments();
    const convertedProducts = await ExcelProduct.countDocuments({ isConverted: true });
    const pendingProducts = await ExcelProduct.countDocuments({ status: 'pending' });

    const recentUploads = await ExcelUpload.find({ isActive: true })
      .sort({ uploadedAt: -1 })
      .limit(5)
      .select('originalFileName uploadedAt summary')
      .lean();

    res.json({
      success: true,
      stats: {
        totalUploads,
        totalExcelProducts,
        convertedProducts,
        pendingProducts,
        recentUploads
      }
    });

  } catch (error) {
    console.error('❌ Error fetching Excel stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// Sync Excel products with main products (fix inconsistencies)
router.post('/sync-excel-products', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔄 Starting Excel products sync...');
    
    // Find all Excel products that claim to be converted
    const convertedExcelProducts = await ExcelProduct.find({ 
      isConverted: true,
      mainProductId: { $exists: true }
    });
    
    console.log(`📊 Found ${convertedExcelProducts.length} Excel products marked as converted`);
    
    let syncedCount = 0;
    let orphanedCount = 0;
    const errors = [];
    
    for (const excelProduct of convertedExcelProducts) {
      try {
        // Check if the main product still exists
        const mainProduct = await Product.findById(excelProduct.mainProductId);
        
        if (!mainProduct) {
          // Main product was deleted, update Excel product
          await ExcelProduct.updateOne(
            { _id: excelProduct._id },
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
          
          orphanedCount++;
          console.log(`🔄 Synced orphaned Excel product: ${excelProduct.name}`);
        } else {
          syncedCount++;
        }
      } catch (error) {
        errors.push(`Failed to sync Excel product ${excelProduct.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Sync completed: ${syncedCount} valid, ${orphanedCount} orphaned products fixed`);
    
    res.json({
      success: true,
      message: `Excel products sync completed successfully`,
      summary: {
        totalChecked: convertedExcelProducts.length,
        validProducts: syncedCount,
        orphanedProductsFixed: orphanedCount,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('❌ Error syncing Excel products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Excel products',
      error: error.message
    });
  }
});

// ============================================
// IMAGE UPLOAD ROUTES
// ============================================

// Configure multer for image ZIP uploads
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/images';
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

const imageUpload = multer({
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit for ZIP files
  }
});

// POST /api/admin-excel/upload-images - Upload ZIP file containing images (CLOUDINARY VERSION)
router.post('/upload-images', authenticateAdmin, imageUpload.single('imageZip'), async (req, res) => {
  const tempFiles = [];
  
  try {
    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary is not properly configured. Please check environment variables.'
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No ZIP file uploaded' });
    }

    const zipPath = req.file.path;
    const extractDir = path.join('uploads/images/extracted', Date.now().toString());
    tempFiles.push(zipPath, extractDir);
    
    // Create extraction directory
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }

    // Create image upload record
    const imageUploadRecord = new ImageUpload({
      originalFileName: req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      status: 'processing'
    });

    await imageUploadRecord.save();

    // Process ZIP file
    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();
    
    let totalImages = 0;
    let validImages = 0;
    let matchedAsins = 0;
    let uploadedToCloudinary = 0;
    let errors = 0;
    const processedImages = [];

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;
      
      const fileName = entry.entryName;
      const fileExt = path.extname(fileName).toLowerCase();
      
      // Check if it's an image file
      if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(fileExt)) {
        continue;
      }

      totalImages++;

      try {
        // Extract ASIN from filename (remove extension and path)
        const justFileName = path.basename(fileName);
        const baseName = path.basename(justFileName, fileExt);
        const asin = baseName.toUpperCase();

        console.log('🔍 Processing image:', {
          fullPath: fileName,
          justFileName: justFileName,
          baseName: baseName,
          asin: asin
        });

        // Validate ASIN format (10 characters, alphanumeric)
        if (!/^[A-Z0-9]{10}$/.test(asin)) {
          console.log('❌ Invalid ASIN format:', asin, 'from file:', justFileName);
          errors++;
          continue;
        }

        // Extract image to temporary directory
        const extractedFileName = justFileName;
        const extractedPath = path.join(extractDir, extractedFileName);
        
        // Extract the file
        zip.extractEntryTo(entry, extractDir, false, true);
        
        // Handle subdirectory extraction
        const actualExtractedPath = path.join(extractDir, fileName);
        if (actualExtractedPath !== extractedPath && fs.existsSync(actualExtractedPath)) {
          fs.renameSync(actualExtractedPath, extractedPath);
          
          // Clean up empty subdirectory
          const subDir = path.dirname(actualExtractedPath);
          if (subDir !== extractDir) {
            try {
              fs.rmSync(subDir, { recursive: true, force: true });
            } catch (e) {
              // Ignore cleanup errors
            }
          }
        }

        console.log('✅ Extracted image:', extractedFileName, 'to:', extractedPath);

        // Upload to Cloudinary
        let cloudinaryUrl = null;
        try {
          console.log(`📤 Uploading ${asin} to Cloudinary...`);
          const cloudinaryResult = await uploadToCloudinary(extractedPath, asin, 'products');
          cloudinaryUrl = cloudinaryResult.secure_url;
          uploadedToCloudinary++;
          console.log(`✅ Uploaded to Cloudinary: ${cloudinaryUrl}`);
        } catch (uploadError) {
          console.error(`❌ Failed to upload ${asin} to Cloudinary:`, uploadError.message);
          errors++;
          continue;
        }

        // Check if product exists with this ASIN and update it
        const product = await Product.findOne({ asin: asin });
        const excelProduct = await ExcelProduct.findOne({ asin: asin });
        
        // Update products with Cloudinary URL
        if (product) {
          product.images = [cloudinaryUrl];
          product.image = cloudinaryUrl;
          await product.save();
          console.log('🎯 Updated Product with Cloudinary URL:', product.name);
        }
        
        if (excelProduct) {
          excelProduct.images = [cloudinaryUrl];
          excelProduct.image = cloudinaryUrl;
          await excelProduct.save();
          console.log('🎯 Updated ExcelProduct with Cloudinary URL:', excelProduct.name);
        }

        const imageData = {
          fileName: extractedFileName,
          asin: asin,
          filePath: cloudinaryUrl, // Store Cloudinary URL instead of local path
          cloudinaryUrl: cloudinaryUrl,
          fileSize: entry.header.size,
          matched: !!(product || excelProduct),
          productId: product?._id || excelProduct?._id
        };

        processedImages.push(imageData);
        validImages++;
        
        if (product || excelProduct) {
          matchedAsins++;
          console.log('🎯 Matched ASIN:', asin, 'with product:', (product || excelProduct).name);
        } else {
          console.log('❓ No product found for ASIN:', asin, '- Image uploaded to Cloudinary anyway');
        }

      } catch (error) {
        console.error('Error processing image:', fileName, error);
        errors++;
      }
    }

    // Update image upload record
    imageUploadRecord.summary = {
      totalImages,
      validImages,
      matchedAsins,
      uploadedToCloudinary,
      errors
    };
    imageUploadRecord.images = processedImages;
    imageUploadRecord.status = 'completed';
    await imageUploadRecord.save();

    // Clean up temporary files
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(extractDir)) fs.rmSync(extractDir, { recursive: true, force: true });
      console.log('🧹 Cleaned up temporary files');
    } catch (cleanupError) {
      console.warn('⚠️ Failed to cleanup some temporary files:', cleanupError.message);
    }

    res.json({
      success: true,
      message: 'Images uploaded to Cloudinary and processed successfully',
      uploadId: imageUploadRecord._id,
      summary: {
        totalImages,
        validImages,
        matchedAsins,
        uploadedToCloudinary,
        errors
      },
      cloudinaryInfo: {
        folder: 'products',
        totalUploaded: uploadedToCloudinary,
        cdnUrl: 'https://res.cloudinary.com/dtuq3tvjx/'
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
    
    // Clean up temporary files on error
    tempFiles.forEach(filePath => {
      try {
        if (fs.existsSync(filePath)) {
          if (fs.statSync(filePath).isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(filePath);
          }
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup:', filePath, cleanupError.message);
      }
    });
    
    res.status(500).json({ 
      success: false,
      message: 'Failed to process image upload',
      error: error.message 
    });
  }
});

// GET /api/admin-excel/image-uploads - Get all image uploads
router.get('/image-uploads', authenticateAdmin, async (req, res) => {
  try {
    const uploads = await ImageUpload.find()
      .sort({ uploadedAt: -1 })
      .select('originalFileName fileSize uploadedAt summary status');

    res.json({
      success: true,
      uploads
    });
  } catch (error) {
    console.error('Error fetching image uploads:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch image uploads' 
    });
  }
});

// GET /api/admin-excel/image-uploads/:id - Get specific image upload with images
router.get('/image-uploads/:id', authenticateAdmin, async (req, res) => {
  try {
    const upload = await ImageUpload.findById(req.params.id)
      .populate('images.productId', 'name asin');

    if (!upload) {
      return res.status(404).json({ message: 'Image upload not found' });
    }

    res.json({
      success: true,
      upload
    });
  } catch (error) {
    console.error('Error fetching image upload:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch image upload' 
    });
  }
});

// DELETE /api/admin-excel/image-uploads/:id - Delete image upload and all images
router.delete('/image-uploads/:id', authenticateAdmin, async (req, res) => {
  try {
    const upload = await ImageUpload.findById(req.params.id);
    
    if (!upload) {
      return res.status(404).json({ message: 'Image upload not found' });
    }

    // Delete all image files
    let deletedImages = 0;
    for (const image of upload.images) {
      try {
        if (fs.existsSync(image.filePath)) {
          fs.unlinkSync(image.filePath);
          deletedImages++;
        }
      } catch (error) {
        console.error('Error deleting image file:', image.filePath, error);
      }
    }

    // Delete extraction directory if it exists
    const extractDir = path.dirname(upload.images[0]?.filePath || '');
    if (extractDir && fs.existsSync(extractDir)) {
      try {
        fs.rmSync(extractDir, { recursive: true, force: true });
      } catch (error) {
        console.error('Error deleting extraction directory:', error);
      }
    }

    // Delete upload record
    await ImageUpload.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Image upload deleted successfully',
      deletedImages
    });
  } catch (error) {
    console.error('Error deleting image upload:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete image upload' 
    });
  }
});

// GET /api/admin-excel/images/by-asin/:asin - Get image for specific ASIN (with auth)
router.get('/images/by-asin/:asin', authenticateAdmin, async (req, res) => {
  try {
    const asin = req.params.asin.toUpperCase();
    
    const imageUpload = await ImageUpload.findOne({
      'images.asin': asin,
      status: 'completed'
    });

    if (!imageUpload) {
      console.log('❌ No image upload found for ASIN:', asin);
      return res.status(404).json({ message: 'No image found for this ASIN' });
    }

    const image = imageUpload.images.find(img => img.asin === asin);
    
    if (!image) {
      console.log('❌ No image found in upload for ASIN:', asin);
      return res.status(404).json({ message: 'Image not found in upload' });
    }

    if (!fs.existsSync(image.filePath)) {
      console.log('❌ Image file does not exist:', image.filePath);
      return res.status(404).json({ message: 'Image file not found on disk' });
    }

    return res.json({
      success: true,
      asin: asin,
      imageUrl: image.filePath,
      source: 'database'
    });
    const ext = path.extname(image.filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    
    res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Serve the image file
    res.sendFile(path.resolve(image.filePath));
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to serve image' 
    });
  }
});

// Handle CORS preflight for image requests
router.options('/public/images/by-asin/:asin', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(200).end();
});

// GET /api/admin-excel/public/images/by-asin/:asin - Public image endpoint (no auth required)
router.get('/public/images/by-asin/:asin', async (req, res) => {
  try {
    const asin = req.params.asin.toUpperCase();
    
    // Set CORS headers first for all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Origin, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // PRIORITY 1: Directly construct Cloudinary URL based on ASIN
    // This assumes images are uploaded to Cloudinary with ASIN as the filename in the 'products' folder
    if (isCloudinaryConfigured()) {
      const cloudinaryUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/products/${asin}`;
      
      // Return JSON with Cloudinary URL
      return res.json({
        success: true,
        asin: asin,
        imageUrl: cloudinaryUrl,
        source: 'cloudinary-direct'
      });
    }
    
    // PRIORITY 2: Check if product exists with Cloudinary URL (fallback)
    const product = await Product.findOne({ asin: asin }).select('images asin name');
    
    if (product && product.images && product.images.length > 0) {
      // Check if first image is a Cloudinary URL
      const firstImage = product.images[0];
      if (firstImage && (firstImage.includes('cloudinary.com') || firstImage.includes('res.cloudinary.com'))) {
        // Return JSON with Cloudinary URL so frontend can load it directly
        return res.json({
          success: true,
          asin: asin,
          imageUrl: firstImage,
          source: 'cloudinary-product'
        });
      }
    }
    
    // PRIORITY 3: Try to find image in ImageUpload collection (legacy local files)
    const imageUpload = await ImageUpload.findOne({
      'images.asin': asin,
      status: 'completed'
    });

    if (!imageUpload) {
      console.log(`❌ No image found for ASIN ${asin}`);
      return res.status(404).json({ message: 'No image found for this ASIN', asin });
    }

    const image = imageUpload.images.find(img => img.asin === asin);
    
    if (!image) {
      return res.status(404).json({ message: 'Image not found in upload', asin });
    }
    
    // Enhanced path resolution for production (legacy local file serving)
    let imagePath = image.filePath;
    let absolutePath = path.resolve(imagePath);
    
    // If the original path doesn't exist, try comprehensive fallback paths
    if (!fs.existsSync(absolutePath)) {
      const filename = path.basename(imagePath);
      const alternativePaths = [
        // Current working directory variations
        path.resolve(process.cwd(), 'uploads/images/extracted', filename),
        path.resolve(process.cwd(), 'server/uploads/images/extracted', filename),
        path.resolve(process.cwd(), 'uploads/images', filename),
        path.resolve(process.cwd(), 'server/uploads/images', filename),
        
        // Relative to server directory
        path.resolve(__dirname, '../uploads/images/extracted', filename),
        path.resolve(__dirname, '../uploads/images', filename),
        path.resolve(__dirname, '../../uploads/images/extracted', filename),
        path.resolve(__dirname, '../../uploads/images', filename),
        
        // Direct paths
        path.resolve('uploads/images/extracted', filename),
        path.resolve('server/uploads/images/extracted', filename),
        path.resolve('uploads/images', filename),
        path.resolve('server/uploads/images', filename),
        
        // Production-specific paths
        path.resolve('/opt/render/project/src/server/uploads/images/extracted', filename),
        path.resolve('/opt/render/project/src/uploads/images/extracted', filename),
        path.resolve('/app/server/uploads/images/extracted', filename),
        path.resolve('/app/uploads/images/extracted', filename)
      ];
      
      // Also search in all subdirectories of uploads/images/extracted
      const searchDirs = [
        path.resolve(process.cwd(), 'server/uploads/images/extracted'),
        path.resolve(process.cwd(), 'uploads/images/extracted'),
        path.resolve(__dirname, '../uploads/images/extracted'),
        path.resolve('server/uploads/images/extracted'),
        path.resolve('uploads/images/extracted')
      ];
      
      for (const searchDir of searchDirs) {
        try {
          if (fs.existsSync(searchDir)) {
            const subdirs = fs.readdirSync(searchDir).filter(dir => {
              const fullPath = path.join(searchDir, dir);
              return fs.statSync(fullPath).isDirectory();
            });
            
            for (const subdir of subdirs) {
              alternativePaths.push(path.join(searchDir, subdir, filename));
            }
          }
        } catch (dirError) {
          // Directory read error - continue with existing paths
        }
      }
      
      let foundPath = null;
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          foundPath = altPath;
          break;
        }
      }
      
      if (!foundPath) {
        // Return a proper 404 response instead of JSON for image requests
        res.status(404);
        res.setHeader('Content-Type', 'text/plain');
        return res.send('Image not found');
      }
      
      // Update the database with the correct path for future requests
      try {
        await ImageUpload.updateOne(
          { 'images.asin': asin },
          { $set: { 'images.$.filePath': foundPath } }
        );
      } catch (updateError) {
        // Failed to update path - continue anyway
      }
      
      // Use the found path
      absolutePath = foundPath;
    }
    
    // Set proper headers for image serving
    const ext = path.extname(absolutePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml'
    };
    
    const contentType = mimeTypes[ext] || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable'); // Cache for 1 day
    
    // Add headers for better mobile compatibility and security
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Vary', 'Accept-Encoding');
    
    // Add ETag for better caching
    try {
      const stats = fs.statSync(absolutePath);
      const etag = `"${stats.mtime.getTime()}-${stats.size}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Last-Modified', stats.mtime.toUTCString());
      
      // Check if client has cached version
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      
      // Check if-modified-since
      if (req.headers['if-modified-since']) {
        const ifModifiedSince = new Date(req.headers['if-modified-since']);
        if (stats.mtime <= ifModifiedSince) {
          return res.status(304).end();
        }
      }
    } catch (statError) {
      // Could not get file stats - continue anyway
    }
    
    // Serve the image file with comprehensive error handling
    res.sendFile(absolutePath, {
      maxAge: 86400000, // 1 day in milliseconds
      lastModified: true,
      etag: true,
      acceptRanges: true
    }, (err) => {
      if (err && !res.headersSent) {
        res.status(404);
        res.setHeader('Content-Type', 'text/plain');
        res.send('Image not found');
      }
    });
    
  } catch (error) {
    if (!res.headersSent) {
      res.status(500);
      res.setHeader('Content-Type', 'text/plain');
      res.send('Internal server error');
    }
  }
});

// POST /api/admin-excel/migrate/add-images-to-converted - Add images to already converted products
router.post('/migrate/add-images-to-converted', authenticateAdmin, async (req, res) => {
  try {
    // Find all main products that were converted from Excel and have ASINs but no images
    const convertedProducts = await Product.find({
      'excelSource': { $exists: true },
      asin: { $exists: true, $ne: '' },
      $or: [
        { images: { $exists: false } },
        { images: { $size: 0 } }
      ]
    });

    let updatedCount = 0;
    let errorCount = 0;

    for (const product of convertedProducts) {
      try {
        // Look for uploaded images matching this ASIN
        const imageUpload = await ImageUpload.findOne({
          'images.asin': product.asin.toUpperCase(),
          status: 'completed'
        });
        
        if (imageUpload) {
          const matchingImage = imageUpload.images.find(img => img.asin === product.asin.toUpperCase());
          if (matchingImage && fs.existsSync(matchingImage.filePath)) {
            // Add the uploaded image as the main image - use environment-aware URL
            const baseUrl = process.env.NODE_ENV === 'production' 
              ? 'https://generic-wholesale-backend.onrender.com' 
              : 'http://localhost:5000';
            const imageUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${product.asin}`;
            
            // Update the product with the image and set as Amazon's Choice
            await Product.updateOne(
              { _id: product._id },
              { 
                $set: { 
                  images: [imageUrl],
                  isAmazonsChoice: true // Also set as Amazon's Choice
                } 
              }
            );
            
            console.log('✅ Added image and set as Amazon\'s Choice for:', product.name, 'ASIN:', product.asin);
            updatedCount++;
          }
        }
      } catch (error) {
        console.error('Error updating product:', product._id, error);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: 'Migration completed',
      updatedCount,
      errorCount,
      totalChecked: convertedProducts.length
    });

  } catch (error) {
    console.error('Error in converted products migration:', error);
    res.status(500).json({ 
      success: false,
      message: 'Migration failed',
      error: error.message 
    });
  }
});

// POST /api/admin-excel/migrate/set-converted-as-amazons-choice - Set all converted products as Amazon's Choice
router.post('/migrate/set-converted-as-amazons-choice', authenticateAdmin, async (req, res) => {
  try {
    // Find all main products that were converted from Excel but are not Amazon's Choice
    const convertedProducts = await Product.find({
      'excelSource': { $exists: true },
      isAmazonsChoice: { $ne: true }
    });

    let updatedCount = 0;
    let errorCount = 0;

    for (const product of convertedProducts) {
      try {
        // Update the product to be Amazon's Choice
        await Product.updateOne(
          { _id: product._id },
          { 
            $set: { 
              isAmazonsChoice: true,
              isBestSeller: true // Also mark as best seller for extra visibility
            } 
          }
        );
        
        console.log('✅ Set as Amazon\'s Choice:', product.name);
        updatedCount++;
      } catch (error) {
        console.error('Error updating product:', product._id, error);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: 'Migration completed',
      updatedCount,
      errorCount,
      totalChecked: convertedProducts.length
    });

  } catch (error) {
    console.error('Error in Amazon\'s Choice migration:', error);
    res.status(500).json({ 
      success: false,
      message: 'Migration failed',
      error: error.message 
    });
  }
});

// POST /api/admin-excel/fix-amazons-choice-categories - Fix Amazon's Choice status for problematic categories
router.post('/fix-amazons-choice-categories', authenticateAdmin, async (req, res) => {
  try {
    console.log('🔧 Starting Amazon\'s Choice categories fix...');
    
    // Categories that are having issues (including common variations and typos)
    const problematicCategories = [
      'DIY & tools',
      'Home & Kitchen', 
      'Toys and Games',
      'diy & tools',
      'home & kitchen',
      'toys and games',
      'DIY & Tools',
      'Home & Kitche', // Note: typo from the original request
      'Toys & Games',
      'Tools & Home Improvement',
      'Kitchen & Dining',
      'Toys, Kids & Baby'
    ];
    
    let totalUpdated = 0;
    let categoryResults = [];
    
    // Process each category
    for (const category of problematicCategories) {
      try {
        // Find products in this category that are NOT marked as Amazon's Choice
        const productsToUpdate = await Product.find({
          category: { $regex: new RegExp(category, 'i') }, // Case insensitive search
          status: { $in: ['active', 'approved'] },
          isAmazonsChoice: { $ne: true }
        }).select('name category');
        
        if (productsToUpdate.length > 0) {
          // Update products to be Amazon's Choice
          const result = await Product.updateMany(
            {
              category: { $regex: new RegExp(category, 'i') },
              status: { $in: ['active', 'approved'] },
              isAmazonsChoice: { $ne: true }
            },
            {
              $set: {
                isAmazonsChoice: true,
                isBestSeller: true // Also mark as best seller for extra visibility
              }
            }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`✅ Updated ${result.modifiedCount} products in category: ${category}`);
            totalUpdated += result.modifiedCount;
            
            categoryResults.push({
              category: category,
              updated: result.modifiedCount,
              sampleProducts: productsToUpdate.slice(0, 3).map(p => p.name)
            });
          }
        }
      } catch (error) {
        console.error(`❌ Error processing category ${category}:`, error);
      }
    }
    
    // Get verification data
    const amazonsChoiceByCategory = await Product.aggregate([
      {
        $match: {
          isAmazonsChoice: true,
          status: { $in: ['active', 'approved'] }
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    // Check specific problematic categories
    const specificCounts = {};
    for (const category of ['DIY & tools', 'Home & Kitchen', 'Toys and Games']) {
      const count = await Product.countDocuments({
        category: { $regex: new RegExp(category, 'i') },
        isAmazonsChoice: true,
        status: { $in: ['active', 'approved'] }
      });
      specificCounts[category] = count;
    }
    
    res.json({
      success: true,
      message: 'Amazon\'s Choice categories fix completed',
      results: {
        totalUpdated,
        categoriesProcessed: categoryResults.length,
        categoryResults,
        verification: {
          amazonsChoiceByCategory: amazonsChoiceByCategory.slice(0, 10), // Top 10 categories
          specificCounts
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fixing Amazon\'s Choice categories:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fix Amazon\'s Choice categories',
      error: error.message 
    });
  }
});

// POST /api/admin-excel/migrate/fix-image-paths - Fix existing image paths
router.post('/migrate/fix-image-paths', authenticateAdmin, async (req, res) => {
  try {
    const imageUploads = await ImageUpload.find({ status: 'completed' });
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const upload of imageUploads) {
      let hasChanges = false;
      
      for (const image of upload.images) {
        try {
          // Check if current file path exists
          if (fs.existsSync(image.filePath)) {
            continue; // File exists, no need to fix
          }
          
          // Extract just the filename from the stored path
          const justFileName = path.basename(image.fileName);
          const extractDir = path.dirname(image.filePath);
          const newFilePath = path.join(extractDir, justFileName);
          
          // Check if the file exists with just the filename
          if (fs.existsSync(newFilePath)) {
            console.log('🔧 Fixing path for:', image.asin, 'from:', image.filePath, 'to:', newFilePath);
            image.filePath = newFilePath;
            image.fileName = justFileName;
            hasChanges = true;
            fixedCount++;
          } else {
            // Try to find the file in subdirectories
            const extractDirContents = fs.readdirSync(extractDir, { withFileTypes: true });
            let found = false;
            
            for (const item of extractDirContents) {
              if (item.isDirectory()) {
                const subDirPath = path.join(extractDir, item.name);
                const possiblePath = path.join(subDirPath, justFileName);
                
                if (fs.existsSync(possiblePath)) {
                  console.log('🔧 Moving file for:', image.asin, 'from:', possiblePath, 'to:', newFilePath);
                  
                  // Move file to root directory
                  fs.renameSync(possiblePath, newFilePath);
                  
                  // Update record
                  image.filePath = newFilePath;
                  image.fileName = justFileName;
                  hasChanges = true;
                  fixedCount++;
                  found = true;
                  break;
                }
              }
            }
            
            if (!found) {
              console.log('❌ Could not find file for ASIN:', image.asin, 'expected:', justFileName);
              errorCount++;
            }
          }
        } catch (error) {
          console.error('Error fixing image path for:', image.asin, error);
          errorCount++;
        }
      }
      
      if (hasChanges) {
        await upload.save();
      }
    }
    
    res.json({
      success: true,
      message: 'Image path migration completed',
      fixedCount,
      errorCount
    });
    
  } catch (error) {
    console.error('Error in image path migration:', error);
    res.status(500).json({ 
      success: false,
      message: 'Migration failed',
      error: error.message 
    });
  }
});

// GET /api/admin-excel/debug/images - Debug endpoint to check available images
router.get('/debug/images', authenticateAdmin, async (req, res) => {
  try {
    const imageUploads = await ImageUpload.find({ status: 'completed' });
    
    const debugInfo = {
      totalUploads: imageUploads.length,
      images: []
    };
    
    for (const upload of imageUploads) {
      for (const image of upload.images) {
        debugInfo.images.push({
          asin: image.asin,
          fileName: image.fileName,
          filePath: image.filePath,
          fileExists: fs.existsSync(image.filePath),
          matched: image.matched,
          productId: image.productId
        });
      }
    }
    
    res.json({
      success: true,
      debug: debugInfo
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ 
      success: false,
      message: 'Debug endpoint failed',
      error: error.message 
    });
  }
});

// GET /api/admin-excel/products/:productId - Get single Excel product (for simple edit route)
router.get('/products/:productId', authenticateAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const product = await ExcelProduct.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      product: product
    });
    
  } catch (error) {
    console.error('Error fetching Excel product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
});

// PUT /api/admin-excel/products/:productId - Update single Excel product
router.put('/products/:productId', authenticateAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const updateData = req.body;
    
    // Remove any fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    
    const product = await ExcelProduct.findByIdAndUpdate(
      productId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      product: product
    });
    
  } catch (error) {
    console.error('Error updating Excel product:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
});

// POST /api/admin-excel/toggle-listing - Toggle listing status for products
router.post('/toggle-listing', authenticateAdmin, async (req, res) => {
  try {
    const { productIds, action, ensureImages } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs are required'
      });
    }
    
    if (!['list', 'unlist'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "list" or "unlist"'
      });
    }
    
    let modifiedCount = 0;
    const errors = [];
    
    for (const productId of productIds) {
      try {
        // Find the Excel product
        const excelProduct = await ExcelProduct.findById(productId);
        if (!excelProduct) {
          errors.push(`Excel product not found: ${productId}`);
          continue;
        }
        
        if (action === 'list') {
          // Convert Excel product to main Product
          const baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://generic-wholesale-backend.onrender.com' 
            : 'http://localhost:5000';
          
          // Enhanced image handling - same approach as Add New Product
          let imageArray = [];
          
          // Priority 1: Use existing images from Excel product
          if (excelProduct.images && excelProduct.images.length > 0) {
            imageArray = [...excelProduct.images];
          }
          
          // Priority 2: Generate ASIN-based image URL if ASIN exists
          if (excelProduct.asin && excelProduct.asin.match(/^[A-Z0-9]{10}$/)) {
            const asinImageUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${excelProduct.asin}`;
            // Add ASIN image as first image if not already present
            if (!imageArray.includes(asinImageUrl)) {
              imageArray.unshift(asinImageUrl);
            }
          }
          
          // Normalize category to match existing categories (case-insensitive)
          const normalizedCategory = normalizeCategoryName(excelProduct.category);
          
          // Enhanced category matching - find existing category with case-insensitive search
          let finalCategory = normalizedCategory;
          
          try {
            // Get all existing categories from main products
            const existingCategories = await Product.distinct('category', { status: 'active' });
            
            // Try to find a case-insensitive match with existing categories
            const matchingCategory = existingCategories.find(existingCat => 
              existingCat.toLowerCase() === normalizedCategory.toLowerCase()
            );
            
            if (matchingCategory) {
              finalCategory = matchingCategory; // Use the existing category's exact case
              console.log(`📂 Category matched: "${normalizedCategory}" -> "${matchingCategory}"`);
            } else {
              console.log(`📂 New category will be created: "${normalizedCategory}"`);
            }
          } catch (error) {
            console.log('⚠️ Could not fetch existing categories for matching, using normalized category');
          }
          
          const productData = {
            name: excelProduct.name,
            price: excelProduct.price,
            originalPrice: excelProduct.originalPrice,
            category: finalCategory, // Use the matched or normalized category
            brand: excelProduct.brand || 'Generic',
            description: excelProduct.description || `High-quality ${excelProduct.name}`,
            images: imageArray, // Enhanced image array handling
            image: imageArray.length > 0 ? imageArray[0] : '', // Set main image as first in array
            rating: excelProduct.rating || 4.5,
            reviews: excelProduct.reviews || 0,
            stock: excelProduct.stock || 100,
            discount: excelProduct.discount || 0,
            dealUnits: excelProduct.dealUnits || Math.floor((excelProduct.platformUnits || 2400) / 12),
            platformUnits: excelProduct.platformUnits || 2400,
            currency: 'GBP',
            isAmazonsChoice: true, // Always set as Amazon's Choice
            asin: excelProduct.asin,
            isListed: true, // Ensure it's marked as listed
            status: 'active', // Make it active
            // Enhanced image metadata for better compatibility
            imageMetadata: {
              source: 'excel-import',
              asinBased: !!excelProduct.asin,
              hasMultipleImages: imageArray.length > 1,
              primaryImageUrl: imageArray[0] || null
            },
            // Copy profit data if available
            profitEvaluation: excelProduct.profitEvaluation,
            profitCalculations: excelProduct.profitCalculations,
            platformComparison: excelProduct.platformComparison,
            evaluation: excelProduct.evaluation,
            savings: excelProduct.savings
          };
          
          console.log(`📦 Converting Excel product to main product:`, {
            name: excelProduct.name,
            category: `"${excelProduct.category}" -> "${finalCategory}"`,
            asin: excelProduct.asin,
            imageArray: imageArray,
            imageCount: imageArray.length,
            primaryImage: imageArray[0] || 'none',
            isAmazonsChoice: true,
            hasImageUrl: imageArray.length > 0,
            imageSource: excelProduct.asin ? 'ASIN-based' : 'existing-images'
          });
          
          // Check if product already exists in main collection
          const existingProduct = await Product.findOne({
            $or: [
              { name: excelProduct.name },
              { asin: excelProduct.asin }
            ]
          });
          
          let savedProduct;
          if (existingProduct) {
            // Update existing product with all data including Amazon's Choice status
            savedProduct = await Product.findByIdAndUpdate(existingProduct._id, productData, { new: true });
            console.log(`✅ Updated existing product:`, {
              id: savedProduct._id,
              name: savedProduct.name,
              category: savedProduct.category,
              images: savedProduct.images,
              imageCount: savedProduct.images?.length || 0,
              image: savedProduct.image,
              asin: savedProduct.asin,
              isAmazonsChoice: savedProduct.isAmazonsChoice
            });
          } else {
            // Create new product
            savedProduct = await Product.create(productData);
            console.log(`✅ Created new product:`, {
              id: savedProduct._id,
              name: savedProduct.name,
              category: savedProduct.category,
              images: savedProduct.images,
              imageCount: savedProduct.images?.length || 0,
              image: savedProduct.image,
              asin: savedProduct.asin,
              isAmazonsChoice: savedProduct.isAmazonsChoice
            });
          }
          
          // Mark Excel product as listed
          excelProduct.isListed = true;
          excelProduct.listedAt = new Date();
          await excelProduct.save();
          
        } else if (action === 'unlist') {
          // Remove from main Product collection
          await Product.deleteMany({
            $or: [
              { name: excelProduct.name },
              { asin: excelProduct.asin }
            ]
          });
          
          // Mark Excel product as unlisted
          excelProduct.isListed = false;
          excelProduct.listedAt = null;
          await excelProduct.save();
        }
        
        modifiedCount++;
        
      } catch (error) {
        console.error(`Error ${action}ing product ${productId}:`, error);
        errors.push(`Failed to ${action} product ${productId}: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      message: `Successfully ${action}ed ${modifiedCount} products${ensureImages ? ' with images' : ''}`,
      modifiedCount,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Error in toggle-listing:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle listing status',
      error: error.message
    });
  }
});

// GET /api/admin-excel/debug/images - Debug endpoint to check image uploads and paths
router.get('/debug/images', authenticateAdmin, async (req, res) => {
  try {
    
    // Get all image uploads
    const imageUploads = await ImageUpload.find().sort({ uploadedAt: -1 }).limit(5);
    
    const debugInfo = {
      environment: process.env.NODE_ENV || 'development',
      currentWorkingDirectory: process.cwd(),
      serverDirectory: __dirname,
      totalImageUploads: await ImageUpload.countDocuments(),
      recentUploads: imageUploads.map(upload => ({
        id: upload._id,
        fileName: upload.originalFileName,
        uploadedAt: upload.uploadedAt,
        status: upload.status,
        totalImages: upload.images.length,
        sampleImages: upload.images.slice(0, 3).map(img => ({
          asin: img.asin,
          fileName: img.fileName,
          filePath: img.filePath,
          fileExists: fs.existsSync(img.filePath),
          resolvedPath: path.resolve(img.filePath),
          resolvedExists: fs.existsSync(path.resolve(img.filePath))
        }))
      }))
    };
    
    // Check common upload directories
    const commonPaths = [
      'uploads/images/extracted',
      'server/uploads/images/extracted',
      path.join(__dirname, '../uploads/images/extracted'),
      path.join(process.cwd(), 'uploads/images/extracted'),
      path.join(process.cwd(), 'server/uploads/images/extracted')
    ];
    
    debugInfo.directoryCheck = commonPaths.map(dirPath => ({
      path: dirPath,
      resolved: path.resolve(dirPath),
      exists: fs.existsSync(dirPath),
      files: fs.existsSync(dirPath) ? fs.readdirSync(dirPath).slice(0, 5) : []
    }));
    
    res.json({
      success: true,
      debug: debugInfo
    });
    
  } catch (error) {
    console.error('❌ Error in debug images endpoint:', error);
    res.status(500).json({
      success: false,
      message: 'Debug endpoint failed',
      error: error.message
    });
  }
});

// POST /api/admin-excel/single-list-to-amazons-choice - List single product to Amazon's Choice
router.post('/single-list-to-amazons-choice', authenticateAdmin, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Find the Excel product
    const excelProduct = await ExcelProduct.findById(productId);
    if (!excelProduct) {
      return res.status(404).json({
        success: false,
        message: 'Excel product not found'
      });
    }

    // Check if already converted
    if (excelProduct.isConverted && excelProduct.mainProductId) {
      // Product is already converted, just set as Amazon's Choice
      const mainProduct = await Product.findById(excelProduct.mainProductId);
      if (mainProduct) {
        mainProduct.isAmazonsChoice = true;
        await mainProduct.save();
        
        return res.json({
          success: true,
          message: `Product "${excelProduct.name}" is now listed as Amazon's Choice!`,
          productId: mainProduct._id,
          alreadyConverted: true
        });
      } else {
        // Main product doesn't exist, need to convert again
        excelProduct.isConverted = false;
        excelProduct.mainProductId = null;
        await excelProduct.save();
      }
    }

    // Convert Excel product to main product with Amazon's Choice status
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://generic-wholesale-backend.onrender.com' 
      : 'http://localhost:5000';
    
    let imageUrl = '';
    let imageArray = [];
    if (excelProduct.asin) {
      imageUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${excelProduct.asin}`;
      imageArray = [imageUrl];
    }

    const newProduct = new Product({
      name: excelProduct.name,
      asin: excelProduct.asin,
      price: excelProduct.price,
      originalPrice: excelProduct.originalPrice || (excelProduct.price * 1.2),
      category: excelProduct.category,
      brand: excelProduct.brand || 'Generic',
      image: imageUrl,
      images: imageArray,
      rating: excelProduct.rating || 4.5,
      reviews: excelProduct.reviews || 0,
      stock: excelProduct.stock || 100,
      discount: excelProduct.discount || 0,
      dealUnits: excelProduct.dealUnits || 1,
      description: excelProduct.description || `Quality ${excelProduct.name} with excellent features.`,
      currency: excelProduct.currency || 'GBP',
      status: 'active',
      isAmazonsChoice: true, // Set as Amazon's Choice
      excelSource: {
        uploadId: excelProduct.excelUploadId,
        productId: excelProduct._id,
        rowNumber: excelProduct.rowNumber
      }
    });

    console.log('🔍 Creating new product with data:', {
      name: excelProduct.name,
      asin: excelProduct.asin,
      category: excelProduct.category,
      imageUrl: imageUrl,
      imageArray: imageArray,
      isAmazonsChoice: true,
      status: 'active'
    });

    const savedProduct = await newProduct.save();
    
    console.log('✅ Product saved successfully:', {
      id: savedProduct._id,
      name: savedProduct.name,
      category: savedProduct.category,
      isAmazonsChoice: savedProduct.isAmazonsChoice,
      image: savedProduct.image,
      images: savedProduct.images
    });

    // Update Excel product to mark as converted
    excelProduct.isConverted = true;
    excelProduct.mainProductId = savedProduct._id;
    excelProduct.status = 'listed';
    await excelProduct.save();

    res.json({
      success: true,
      message: `Product "${excelProduct.name}" has been successfully listed as Amazon's Choice!`,
      productId: savedProduct._id,
      productUrl: `/product/${savedProduct._id}`,
      amazonsChoiceUrl: `/amazons-choice`
    });

  } catch (error) {
    console.error('Error listing single product to Amazon\'s Choice:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list product to Amazon\'s Choice',
      error: error.message
    });
  }
});

// POST /api/admin-excel/single-convert-to-approval - Convert single product to approval queue
router.post('/single-convert-to-approval', authenticateAdmin, async (req, res) => {
  try {
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Find the Excel product
    const excelProduct = await ExcelProduct.findById(productId);
    if (!excelProduct) {
      return res.status(404).json({
        success: false,
        message: 'Excel product not found'
      });
    }

    // Check if product has SKU
    if (!excelProduct.sku || excelProduct.sku.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'SKU is required for conversion'
      });
    }

    // Check if already converted
    if (excelProduct.isConverted && excelProduct.mainProductId) {
      return res.status(400).json({
        success: false,
        message: 'Product is already converted'
      });
    }

    // Check for duplicate ASIN/SKU in existing products
    if (excelProduct.asin && excelProduct.asin.trim()) {
      const existingAsin = await Product.findOne({ asin: excelProduct.asin.toUpperCase() });
      if (existingAsin) {
        return res.status(400).json({
          success: false,
          message: `ASIN ${excelProduct.asin} already exists in the system`
        });
      }
    }

    const existingSku = await Product.findOne({ sku: excelProduct.sku.toUpperCase() });
    if (existingSku) {
      return res.status(400).json({
        success: false,
        message: `SKU ${excelProduct.sku} already exists in the system`
      });
    }

    // Get website categories for smart matching
    const websiteCategories = await Product.distinct('category', { 
      status: 'active', 
      approvalStatus: 'approved' 
    });
    
    // Smart category matching (case-insensitive)
    let selectedCategory = excelProduct.category;
    if (excelProduct.category) {
      const matchingCategory = websiteCategories.find(cat => 
        cat.toLowerCase() === excelProduct.category.toLowerCase()
      );
      if (matchingCategory) {
        selectedCategory = matchingCategory; // Use existing category's exact case
        console.log(`📂 Matched Excel category "${excelProduct.category}" to existing category "${matchingCategory}"`);
      } else {
        console.log(`📂 New category "${excelProduct.category}" will be added`);
      }
    }

    // Convert Excel product to main product with pending approval status
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://generic-wholesale-backend.onrender.com' 
      : 'http://localhost:5000';
    
    let imageUrl = '';
    let imageArray = [];
    
    // Handle images from Excel product
    if (excelProduct.images && excelProduct.images.length > 0) {
      // Use existing images from Excel product
      imageArray = [...excelProduct.images];
      imageUrl = excelProduct.images[0]; // First image as main image
      console.log('📷 Using existing Excel product images:', imageArray);
    }
    
    // Always check for ASIN-based images (this is what shows in the Excel products table)
    if (excelProduct.asin) {
      const asinImageUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${excelProduct.asin}`;
      
      // Add ASIN-based image if not already present
      if (!imageArray.includes(asinImageUrl)) {
        imageArray.unshift(asinImageUrl); // Add as first image
        imageUrl = asinImageUrl; // Use as main image
        console.log('📷 Added ASIN-based image URL:', asinImageUrl);
      }
      
      // Always add fallback Amazon image URLs (whether we found server images or not)
      const fallbackUrls = [
        `https://images-na.ssl-images-amazon.com/images/P/${excelProduct.asin}.01._SCLZZZZZZZ_SX500_.jpg`,
        `https://m.media-amazon.com/images/I/${excelProduct.asin}._AC_SL1500_.jpg`,
        `https://images-na.ssl-images-amazon.com/images/I/${excelProduct.asin}._AC_SL1500_.jpg`
      ];
      
      // Add fallback URLs that aren't already in the array
      fallbackUrls.forEach(url => {
        if (!imageArray.includes(url)) {
          imageArray.push(url);
        }
      });
      
      console.log('📷 Added fallback Amazon image URLs for ASIN:', excelProduct.asin);
    }
    
    // Also check for uploaded images for this ASIN (additional enhancement)
    if (excelProduct.asin) {
      try {
        const ImageUpload = (await import('../models/ImageUpload.js')).default;
        const imageUpload = await ImageUpload.findOne({
          'images.asin': excelProduct.asin.toUpperCase(),
          status: 'completed'
        });
        
        if (imageUpload) {
          const matchingImage = imageUpload.images.find(img => img.asin === excelProduct.asin.toUpperCase());
          if (matchingImage && require('fs').existsSync(matchingImage.filePath)) {
            const uploadedImageUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${excelProduct.asin}`;
            
            // This should be the same as asinImageUrl, but let's make sure it's prioritized
            if (!imageArray.includes(uploadedImageUrl)) {
              imageArray.unshift(uploadedImageUrl);
            } else {
              // Move to front if already exists
              const index = imageArray.indexOf(uploadedImageUrl);
              if (index > 0) {
                imageArray.splice(index, 1);
                imageArray.unshift(uploadedImageUrl);
              }
            }
            imageUrl = uploadedImageUrl; // Use as main image
            
            console.log('📷 Prioritized uploaded ASIN image:', uploadedImageUrl);
          }
        }
      } catch (imageError) {
        console.log('⚠️ Could not check for uploaded images:', imageError.message);
      }
    }
    
    console.log('📷 Final image configuration:', { imageUrl, imageArray });

    const newProduct = new Product({
      name: excelProduct.name,
      asin: excelProduct.asin ? excelProduct.asin.toUpperCase() : '',
      sku: excelProduct.sku.toUpperCase(),
      price: excelProduct.price,
      originalPrice: excelProduct.originalPrice || (excelProduct.price * 1.2),
      category: selectedCategory,
      brand: excelProduct.brand || 'Generic',
      image: imageUrl, // Main image
      images: imageArray, // All images array
      rating: excelProduct.rating || 4.5,
      reviews: excelProduct.reviews || 0,
      stock: excelProduct.stock || 100,
      discount: excelProduct.discount || 0,
      dealUnits: excelProduct.dealUnits || 1,
      description: excelProduct.description || `Quality ${excelProduct.name} with excellent features.`,
      features: excelProduct.features || [],
      currency: excelProduct.currency || 'GBP',
      status: 'active',
      approvalStatus: 'pending', // Send to approval queue
      isAmazonsChoice: false, // Will be set after approval
      isAdminProduct: true,
      listedBy: 'admin',
      excelSource: {
        uploadId: excelProduct.excelUploadId,
        productId: excelProduct._id,
        rowNumber: excelProduct.rowNumber
      }
    });

    console.log('🔍 Creating new product for approval with data:', {
      name: excelProduct.name,
      asin: excelProduct.asin,
      sku: excelProduct.sku,
      category: selectedCategory,
      imageUrl: imageUrl,
      imageArray: imageArray,
      approvalStatus: 'pending'
    });

    const savedProduct = await newProduct.save();
    
    console.log('✅ Product saved successfully for approval:', {
      id: savedProduct._id,
      name: savedProduct.name,
      category: savedProduct.category,
      approvalStatus: savedProduct.approvalStatus,
      sku: savedProduct.sku,
      image: savedProduct.image,
      images: savedProduct.images
    });

    // Update Excel product to mark as converted
    excelProduct.isConverted = true;
    excelProduct.mainProductId = savedProduct._id;
    excelProduct.status = 'pending'; // Mark as pending approval
    await excelProduct.save();

    res.json({
      success: true,
      message: `Product "${excelProduct.name}" has been converted and sent to approval queue!`,
      productId: savedProduct._id,
      approvalStatus: 'pending'
    });

  } catch (error) {
    console.error('Error converting single product to approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to convert product to approval',
      error: error.message
    });
  }
});

// Get all Cloudinary images from products folder with pagination and search
router.get('/cloudinary-images', authenticateAdmin, async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(400).json({
        success: false,
        message: 'Cloudinary is not configured. Please check your environment variables.',
        details: {
          error: 'CLOUDINARY_NOT_CONFIGURED',
          required_vars: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'],
          current_env: process.env.NODE_ENV,
          instructions: process.env.NODE_ENV === 'production' 
            ? 'Set environment variables in Render Dashboard > Service > Environment tab'
            : 'Check your .env file in the server directory'
        }
      });
    }

    const { 
      folder = 'products', 
      page = 1, 
      limit = 20, 
      search = '' 
    } = req.query;
    
    // Fetch ALL images first (we'll implement pagination client-side for now)
    const allImages = await listCloudinaryImages(folder);
    
    // Filter images based on search query (search in ASIN from public_id)
    let filteredImages = allImages;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredImages = allImages.filter(image => {
        // Extract ASIN from public_id (format: products/ASIN)
        const asin = image.public_id.split('/').pop();
        return asin && asin.toLowerCase().includes(searchLower);
      });
    }
    
    // Implement pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    
    const paginatedImages = filteredImages.slice(startIndex, endIndex);
    
    // Format images with ASIN for easier frontend handling
    const formattedImages = paginatedImages.map(image => {
      // Safely extract ASIN from public_id or publicId
      const publicId = image.public_id || image.publicId || '';
      const asin = publicId.includes('/') ? publicId.split('/').pop() : publicId;
      
      return {
        url: image.secure_url || image.url, // Handle both formats
        public_id: publicId,
        name: asin || 'Unknown', // Add name property for frontend compatibility
        asin: asin || 'Unknown',
        created_at: image.created_at || image.createdAt,
        width: image.width || 0,
        height: image.height || 0,
        format: image.format || 'jpg',
        size: image.size || image.bytes || 0
      };
    });
    
    res.json({
      success: true,
      images: formattedImages,
      total: filteredImages.length,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(filteredImages.length / limitNum),
      folder
    });

  } catch (error) {
    console.error('❌ Error fetching Cloudinary images:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Cloudinary images',
      error: error.message
    });
  }
});

// Debug endpoint to check Cloudinary configuration (admin only)
router.get('/debug/cloudinary-config', authenticateAdmin, async (req, res) => {
  try {
    const config = {
      isConfigured: isCloudinaryConfigured(),
      environment: process.env.NODE_ENV,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Missing',
      apiKey: process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Missing',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '✅ Set' : '❌ Missing',
      instructions: process.env.NODE_ENV === 'production' 
        ? 'For production: Set environment variables in Render Dashboard > Service > Environment tab'
        : 'For development: Check your .env file in the server directory'
    };
    
    res.json({
      success: true,
      config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check Cloudinary configuration',
      error: error.message
    });
  }
});

export default router;