import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import ExcelProduct from '../models/ExcelProduct.js';
import ExcelUpload from '../models/ExcelUpload.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for temporary file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');
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
    fileSize: 500 * 1024 * 1024 // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'excel') {
      // Accept Excel files
      if (file.mimetype.includes('spreadsheet') || file.originalname.match(/\.(xlsx|xls)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files are allowed for excel field'), false);
      }
    } else if (file.fieldname === 'images') {
      // Accept ZIP files
      if (file.mimetype === 'application/zip' || file.originalname.match(/\.zip$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Only ZIP files are allowed for images field'), false);
      }
    } else {
      cb(new Error('Unexpected field'), false);
    }
  }
});

/**
 * Clean up temporary files
 */
const cleanupTempFiles = (filePaths) => {
  filePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        console.log(`🧹 Cleaned up: ${filePath}`);
      } catch (error) {
        console.error(`⚠️ Failed to cleanup ${filePath}:`, error.message);
      }
    }
  });
};

/**
 * Extract product name from Excel row
 */
const extractProductName = (row, allKeys, index) => {
  // Try columns with 'name', 'title', or 'product' in the key
  const nameKeys = allKeys.filter(key => 
    key.toLowerCase().includes('name') || 
    key.toLowerCase().includes('title') || 
    key.toLowerCase().includes('product')
  );
  
  for (const key of nameKeys) {
    const value = row[key];
    if (value && value.toString().trim() && value.toString().length > 3) {
      return value.toString().trim();
    }
  }
  
  // Fallback to any non-empty column
  for (const key of allKeys) {
    const value = row[key];
    const keyLower = key.toLowerCase();
    
    // Skip obvious non-name columns
    if (keyLower.includes('image') || keyLower.includes('url') || 
        keyLower.includes('asin') || keyLower.includes('price') ||
        keyLower.includes('rating') || keyLower.includes('review')) {
      continue;
    }
    
    if (value && value.toString().trim() && value.toString().length > 10) {
      return value.toString().trim();
    }
  }
  
  return `Product ${index + 1}`;
};

/**
 * POST /api/bulk-upload/excel-with-images
 * Upload Excel file with ZIP of images and process with Cloudinary
 */
router.post('/excel-with-images', authenticateAdmin, upload.fields([
  { name: 'excel', maxCount: 1 },
  { name: 'images', maxCount: 1 }
]), async (req, res) => {
  const tempFiles = [];
  
  try {
    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        success: false,
        message: 'Cloudinary is not properly configured. Please check environment variables.'
      });
    }

    // Validate uploaded files
    if (!req.files || !req.files.excel || !req.files.images) {
      return res.status(400).json({
        success: false,
        message: 'Both Excel file and images ZIP file are required'
      });
    }

    const excelFile = req.files.excel[0];
    const zipFile = req.files.images[0];
    
    tempFiles.push(excelFile.path, zipFile.path);

    console.log('📁 Processing bulk upload:', {
      excel: excelFile.originalname,
      images: zipFile.originalname
    });

    // Create Excel upload record
    const excelUpload = new ExcelUpload({
      fileName: excelFile.originalname,
      filePath: excelFile.path,
      fileSize: excelFile.size,
      status: 'processing',
      uploadedBy: req.admin._id
    });
    await excelUpload.save();

    // Read Excel file
    console.log('📊 Reading Excel file...');
    const workbook = xlsx.readFile(excelFile.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = xlsx.utils.sheet_to_json(worksheet);

    if (excelData.length === 0) {
      throw new Error('Excel file is empty or has no valid data');
    }

    // Extract ZIP file
    console.log('📦 Extracting ZIP file...');
    const extractDir = path.join(__dirname, '../uploads/temp', `extracted_${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });
    tempFiles.push(extractDir);

    const zip = new AdmZip(zipFile.path);
    zip.extractAllTo(extractDir, true);

    // Get all image files from extracted directory
    const imageFiles = [];
    const scanDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          const ext = path.extname(item).toLowerCase();
          if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
            const fileName = path.basename(item, ext);
            imageFiles.push({
              fileName: fileName,
              fullPath: fullPath,
              originalName: item
            });
          }
        }
      });
    };
    
    scanDirectory(extractDir);
    console.log(`📷 Found ${imageFiles.length} image files in ZIP`);

    // Process Excel data and match with images
    const results = {
      totalProducts: excelData.length,
      processedProducts: 0,
      uploadedImages: 0,
      matchedImages: 0,
      errors: [],
      products: []
    };

    const allKeys = Object.keys(excelData[0]);
    
    for (let i = 0; i < excelData.length; i++) {
      const row = excelData[i];
      
      try {
        // Extract ASIN
        const asin = (row.ASIN || row.asin || row['Product ASIN'] || row['ASIN Code'] || '').toString().toUpperCase().trim();
        
        if (!asin || !/^[A-Z0-9]{10}$/.test(asin)) {
          results.errors.push(`Row ${i + 1}: Invalid or missing ASIN: ${asin}`);
          continue;
        }

        // Extract product details
        const productName = extractProductName(row, allKeys, i);
        const price = parseFloat(row.Price || row.price || row['Sale Price'] || 0);
        const originalPrice = parseFloat(row['Original Price'] || row.originalPrice || price * 1.3);
        const category = row.Category || row.category || 'General';
        const brand = row.Brand || row.brand || '';
        const description = row.Description || row.description || '';
        const stock = parseInt(row.Stock || row.stock || 0);

        // Find matching image file
        const matchingImage = imageFiles.find(img => 
          img.fileName.toUpperCase() === asin || 
          img.fileName.toUpperCase().includes(asin)
        );

        let imageUrl = null;
        
        if (matchingImage) {
          try {
            console.log(`📤 Uploading image for ASIN: ${asin}`);
            
            // Upload to Cloudinary
            const cloudinaryResult = await uploadToCloudinary(
              matchingImage.fullPath,
              asin,
              'products'
            );
            
            imageUrl = cloudinaryResult.secure_url;
            results.uploadedImages++;
            results.matchedImages++;
            
            console.log(`✅ Image uploaded for ${asin}: ${imageUrl}`);
          } catch (uploadError) {
            console.error(`❌ Failed to upload image for ${asin}:`, uploadError.message);
            results.errors.push(`Row ${i + 1}: Failed to upload image for ASIN ${asin}: ${uploadError.message}`);
          }
        } else {
          console.log(`⚠️ No image found for ASIN: ${asin}`);
          results.errors.push(`Row ${i + 1}: No image found for ASIN ${asin}`);
        }

        // Create ExcelProduct record
        const excelProduct = new ExcelProduct({
          name: productName,
          asin: asin,
          price: price,
          originalPrice: originalPrice,
          category: category,
          brand: brand,
          description: description,
          stock: stock,
          images: imageUrl ? [imageUrl] : [],
          excelUploadId: excelUpload._id,
          status: 'pending',
          rawData: row
        });

        await excelProduct.save();
        
        results.products.push({
          asin: asin,
          name: productName,
          price: price,
          imageUrl: imageUrl,
          hasImage: !!imageUrl
        });
        
        results.processedProducts++;
        
        console.log(`✅ Processed product ${i + 1}/${excelData.length}: ${asin} - ${productName}`);
        
      } catch (error) {
        console.error(`❌ Error processing row ${i + 1}:`, error.message);
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Update Excel upload status
    excelUpload.status = results.errors.length === 0 ? 'completed' : 'completed_with_errors';
    excelUpload.processedAt = new Date();
    excelUpload.totalProducts = results.totalProducts;
    excelUpload.processedProducts = results.processedProducts;
    await excelUpload.save();

    // Cleanup temporary files
    cleanupTempFiles(tempFiles);

    console.log('🎉 Bulk upload completed:', results);

    res.json({
      success: true,
      message: 'Bulk upload completed successfully',
      uploadId: excelUpload._id,
      results: results
    });

  } catch (error) {
    console.error('❌ Bulk upload error:', error);
    
    // Cleanup temporary files on error
    cleanupTempFiles(tempFiles);
    
    res.status(500).json({
      success: false,
      message: 'Bulk upload failed',
      error: error.message
    });
  }
});

/**
 * GET /api/bulk-upload/status/:uploadId
 * Get status of a bulk upload
 */
router.get('/status/:uploadId', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId } = req.params;
    
    const excelUpload = await ExcelUpload.findById(uploadId);
    if (!excelUpload) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found'
      });
    }

    const productCount = await ExcelProduct.countDocuments({ excelUploadId: uploadId });
    const productsWithImages = await ExcelProduct.countDocuments({ 
      excelUploadId: uploadId,
      images: { $exists: true, $ne: [] }
    });

    res.json({
      success: true,
      upload: {
        id: excelUpload._id,
        fileName: excelUpload.fileName,
        status: excelUpload.status,
        totalProducts: excelUpload.totalProducts,
        processedProducts: excelUpload.processedProducts,
        productCount: productCount,
        productsWithImages: productsWithImages,
        createdAt: excelUpload.createdAt,
        processedAt: excelUpload.processedAt
      }
    });
  } catch (error) {
    console.error('Error getting upload status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upload status',
      error: error.message
    });
  }
});

/**
 * GET /api/bulk-upload/products/:uploadId
 * Get products from a specific upload
 */
router.get('/products/:uploadId', authenticateAdmin, async (req, res) => {
  try {
    const { uploadId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const products = await ExcelProduct.find({ excelUploadId: uploadId })
      .select('name asin price images category brand status createdAt')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await ExcelProduct.countDocuments({ excelUploadId: uploadId });

    res.json({
      success: true,
      products: products,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error getting upload products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get upload products',
      error: error.message
    });
  }
});

export default router;