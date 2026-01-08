import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import ExcelUpload from '../models/ExcelUpload.js';
import ExcelProduct from '../models/ExcelProduct.js';
import { authenticateAdmin } from '../middleware/auth.js';
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
  
  // Return original with proper capitalization
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
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
          'title', 'name', 'product name', 'product title', 'productname', 'producttitle'
        ]);
        
        const asin = validateASIN(findColumn(row, [
          'asin', 'product asin', 'productasin', 'asin code', 'asincode'
        ]));
        
        const category = findColumn(row, [
          'category', 'product category', 'productcategory', 'cat'
        ]);
        
        // Normalize category name to prevent duplicates
        const normalizedCategory = normalizeCategoryName(category);
        
        const price = parsePrice(findColumn(row, [
          'price', 'product price', 'productprice', 'cost', 'amount', 'unit price', 'unitprice'
        ]));
        
        const reviews = parseInteger(findColumn(row, [
          'reviews', 'review count', 'reviewcount', 'number of reviews', 'numberofreviews',
          'monthly sales', 'monthly sale', 'monthlysales', 'monthlysale', 'sales'
        ]));
        
        const dealUnits = parseInteger(findColumn(row, [
          'deal units', 'dealunits', 'units', 'quantity', 'qty', 'deal qty', 'dealqty'
        ]));
        
        const rating = parseRating(findColumn(row, [
          'rating', 'product rating', 'productrating', 'star rating', 'starrating', 'stars'
        ]));

        // Validate required fields - only title is truly required
        if (!title || title.toString().trim().length === 0) {
          errors.push(`Row ${i + 2}: Missing product title`);
          continue;
        }

        // Price is required but can be 0
        if (price < 0) {
          errors.push(`Row ${i + 2}: Invalid price (cannot be negative)`);
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

        // Create Excel product object
        const excelProductData = {
          excelUploadId: excelUpload._id,
          name: title.toString().trim(),
          asin: asin || undefined,
          price: finalPrice,
          originalPrice: finalPrice * 1.2, // Default 20% markup for original price
          category: normalizedCategory ? normalizedCategory.toString().trim() : 'Uncategorized',
          rating: rating > 0 ? rating : 4.0, // Default rating if missing
          reviews: reviews >= 0 ? reviews : 0, // Allow 0 reviews
          dealUnits: dealUnits > 0 ? dealUnits : 1, // Default to 1 if missing
          stock: 100, // Default stock
          description: `Quality ${title.toString().trim()} with excellent features.`,
          images: [], // Will be added manually later
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
    console.log(`📂 Found categories: ${uniqueCategories.join(', ')}`);

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
    
    console.log('🔍 Excel products query:', {
      uploadId,
      page,
      limit,
      search,
      category,
      status
    });
    
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
      query.status = status;
    }

    console.log('🔍 Final MongoDB query:', JSON.stringify(query, null, 2));

    const products = await ExcelProduct.find(query)
      .sort({ rowNumber: 1 }) // Sort by Excel row order
      .limit(validatedLimit)
      .skip((parseInt(page) - 1) * validatedLimit)
      .lean();

    const total = await ExcelProduct.countDocuments(query);

    // Sync status with main products for converted items
    const productsWithSyncedStatus = await Promise.all(products.map(async (product) => {
      if (product.isConverted && product.mainProductId) {
        try {
          // Check if main product exists and is active
          const mainProduct = await Product.findById(product.mainProductId).select('status').lean();
          
          if (mainProduct) {
            // Update status based on main product status
            let syncedStatus = 'listed';
            if (mainProduct.status === 'active') {
              syncedStatus = 'listed';
            } else if (mainProduct.status === 'inactive') {
              syncedStatus = 'inactive';
            } else {
              syncedStatus = mainProduct.status;
            }
            
            // Update Excel product status if it's different
            if (product.status !== syncedStatus) {
              await ExcelProduct.updateOne(
                { _id: product._id },
                { $set: { status: syncedStatus } }
              );
              product.status = syncedStatus;
            }
          } else {
            // Main product doesn't exist anymore, mark as pending
            if (product.status !== 'pending') {
              await ExcelProduct.updateOne(
                { _id: product._id },
                { $set: { status: 'pending', isConverted: false, mainProductId: null } }
              );
              product.status = 'pending';
              product.isConverted = false;
              product.mainProductId = null;
            }
          }
        } catch (syncError) {
          console.error('Error syncing status for product:', product._id, syncError);
        }
      }
      
      return product;
    }));

    console.log('📊 Excel products result:', {
      found: productsWithSyncedStatus.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / validatedLimit)
    });

    // Get upload info
    const upload = await ExcelUpload.findById(uploadId).lean();

    res.json({
      success: true,
      products: productsWithSyncedStatus,
      upload,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / validatedLimit),
        totalProducts: total,
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
    
    console.log('🔄 Syncing Excel product statuses for upload:', uploadId);
    
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
        const mainProduct = await Product.findById(excelProduct.mainProductId).select('status category').lean();
        
        if (mainProduct) {
          // Determine correct status based on main product
          let correctStatus = 'listed';
          if (mainProduct.status === 'active') {
            correctStatus = 'listed';
          } else if (mainProduct.status === 'inactive') {
            correctStatus = 'inactive';
          } else {
            correctStatus = mainProduct.status;
          }
          
          // Update if status is different
          if (excelProduct.status !== correctStatus) {
            await ExcelProduct.updateOne(
              { _id: excelProduct._id },
              { 
                $set: { 
                  status: correctStatus,
                  category: mainProduct.category // Also sync category
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
    const allowedFields = ['asin', 'category', 'price', 'rating', 'reviews'];
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
    const updateData = { [field]: value };
    
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
          // Look for uploaded images matching this ASIN
          const imageUpload = await ImageUpload.findOne({
            'images.asin': excelProduct.asin.toUpperCase(),
            status: 'completed'
          });
          
          if (imageUpload) {
            const matchingImage = imageUpload.images.find(img => img.asin === excelProduct.asin.toUpperCase());
            if (matchingImage && fs.existsSync(matchingImage.filePath)) {
              // Add the uploaded image as the main image - use environment-aware URL
              const baseUrl = process.env.NODE_ENV === 'production' 
                ? 'https://generic-wholesale-backend.onrender.com' 
                : 'http://localhost:5000';
              const imageUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${excelProduct.asin}`;
              
              // Add to the beginning of images array (main image)
              if (!productImages.includes(imageUrl)) {
                productImages.unshift(imageUrl);
              }
              
              console.log('✅ Added uploaded image for ASIN:', excelProduct.asin, 'URL:', imageUrl);
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
          
          console.log(`📂 Product "${excelProduct.name}" category: "${mainProductData.category}"`);
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

// Import ImageUpload model
import ImageUpload from '../models/ImageUpload.js';

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

// POST /api/admin-excel/upload-images - Upload ZIP file containing images
router.post('/upload-images', authenticateAdmin, imageUpload.single('imageZip'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No ZIP file uploaded' });
    }

    const zipPath = req.file.path;
    const extractDir = path.join('uploads/images/extracted', Date.now().toString());
    
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
        const justFileName = path.basename(fileName); // Get just the filename part
        const baseName = path.basename(justFileName, fileExt); // Remove extension
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

        // Extract image to directory with just the filename (no subdirectories)
        const extractedFileName = justFileName;
        const extractedPath = path.join(extractDir, extractedFileName);
        
        // Extract the file
        zip.extractEntryTo(entry, extractDir, false, true);
        
        // If the file was extracted to a subdirectory, move it to the root
        const actualExtractedPath = path.join(extractDir, fileName);
        if (actualExtractedPath !== extractedPath && fs.existsSync(actualExtractedPath)) {
          // Move file from subdirectory to root
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

        // Check if product exists with this ASIN
        const product = await Product.findOne({ asin: asin }) || await ExcelProduct.findOne({ asin: asin });
        
        const imageData = {
          fileName: extractedFileName, // Use just the filename
          asin: asin,
          filePath: extractedPath,
          fileSize: entry.header.size,
          matched: !!product,
          productId: product?._id
        };

        processedImages.push(imageData);
        validImages++;
        
        if (product) {
          matchedAsins++;
          console.log('🎯 Matched ASIN:', asin, 'with product:', product.name);
        } else {
          console.log('❓ No product found for ASIN:', asin);
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
      errors
    };
    imageUploadRecord.images = processedImages;
    imageUploadRecord.status = 'completed';
    await imageUploadRecord.save();

    // Clean up ZIP file
    fs.unlinkSync(zipPath);

    res.json({
      success: true,
      message: 'Images uploaded and processed successfully',
      uploadId: imageUploadRecord._id,
      summary: {
        totalImages,
        validImages,
        matchedAsins,
        errors
      }
    });

  } catch (error) {
    console.error('Image upload error:', error);
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
    console.log('🖼️ Image request for ASIN:', asin);
    
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

    console.log('✅ Serving image for ASIN:', asin, 'from:', image.filePath);
    
    // Set proper headers for image serving
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

// GET /api/admin-excel/public/images/by-asin/:asin - Public image endpoint (no auth required)
router.get('/public/images/by-asin/:asin', async (req, res) => {
  try {
    const asin = req.params.asin.toUpperCase();
    console.log('🖼️ Public image request for ASIN:', asin);
    console.log('🌐 Request from:', req.get('origin') || req.get('referer') || 'unknown');
    console.log('📱 User-Agent:', req.get('user-agent')?.substring(0, 100) || 'unknown');
    
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

    console.log('✅ Serving public image for ASIN:', asin, 'from:', image.filePath);
    
    // Set proper headers for image serving
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
    
    // Add mobile-friendly headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Add headers for better mobile compatibility
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Serve the image file
    res.sendFile(path.resolve(image.filePath));
  } catch (error) {
    console.error('❌ Error serving public image:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to serve image' 
    });
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
          
          // Always prepare image URL if ASIN exists (not just when ensureImages is true)
          let imageUrl = null;
          let imageArray = [];
          if (excelProduct.asin) {
            imageUrl = `${baseUrl}/api/admin-excel/public/images/by-asin/${excelProduct.asin}`;
            imageArray = [imageUrl]; // Create array with the image URL
          }
          
          // Also check if the Excel product already has images
          if (excelProduct.images && excelProduct.images.length > 0) {
            imageArray = [...excelProduct.images]; // Use existing images
            if (imageUrl && !imageArray.includes(imageUrl)) {
              imageArray.unshift(imageUrl); // Add ASIN image as first image if not already present
            }
          }
          
          const productData = {
            name: excelProduct.name,
            price: excelProduct.price,
            originalPrice: excelProduct.originalPrice,
            category: excelProduct.category,
            brand: excelProduct.brand || 'Generic',
            description: excelProduct.description || `High-quality ${excelProduct.name}`,
            images: imageArray, // Use the properly constructed image array
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
            // Copy profit data if available
            profitEvaluation: excelProduct.profitEvaluation,
            profitCalculations: excelProduct.profitCalculations,
            platformComparison: excelProduct.platformComparison,
            evaluation: excelProduct.evaluation,
            savings: excelProduct.savings
          };
          
          console.log(`📦 Converting Excel product to main product:`, {
            name: excelProduct.name,
            category: excelProduct.category,
            asin: excelProduct.asin,
            imageUrl: imageUrl,
            imageArray: imageArray,
            isAmazonsChoice: true,
            hasImageUrl: !!imageUrl,
            hasImageArray: imageArray.length > 0
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
              images: savedProduct.images,
              image: savedProduct.image,
              asin: savedProduct.asin
            });
          } else {
            // Create new product
            savedProduct = await Product.create(productData);
            console.log(`✅ Created new product:`, {
              id: savedProduct._id,
              name: savedProduct.name,
              images: savedProduct.images,
              image: savedProduct.image,
              asin: savedProduct.asin
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

export default router;