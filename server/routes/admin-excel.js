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

const router = express.Router();

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
          category: category ? category.toString().trim() : 'Uncategorized',
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

    const products = await ExcelProduct.find(query)
      .sort({ rowNumber: 1 }) // Sort by Excel row order
      .limit(validatedLimit)
      .skip((parseInt(page) - 1) * validatedLimit)
      .lean();

    const total = await ExcelProduct.countDocuments(query);

    // Get upload info
    const upload = await ExcelUpload.findById(uploadId).lean();

    res.json({
      success: true,
      products,
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
        // Create main product from Excel product
        const mainProductData = {
          name: excelProduct.name,
          price: excelProduct.price,
          category: excelProduct.category,
          description: excelProduct.description || '',
          brand: excelProduct.brand || '',
          asin: excelProduct.asin || '',
          rating: excelProduct.rating || 4.0,
          reviews: excelProduct.reviews || 0,
          dealUnits: excelProduct.dealUnits || 1,
          stock: excelProduct.stock || 100,
          images: excelProduct.images || [],
          currency: excelProduct.currency || 'GBP',
          features: excelProduct.features || [],
          originalPrice: excelProduct.originalPrice || excelProduct.price * 1.2,
          
          status: 'active', // Make it active when converted
          isAdminProduct: true,
          listedBy: 'admin',
          marketplace: 'UK',
          isAmazonsChoice: false,
          isBestSeller: false,
          showOnHome: false,
          // Add reference to Excel source
          excelSource: {
            uploadId: uploadId,
            excelProductId: excelProduct._id,
            fileName: excelProduct.originalFileName
          }
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

export default router;