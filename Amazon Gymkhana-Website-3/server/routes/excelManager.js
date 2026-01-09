import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Product from '../models/Product.js';
import ExcelFile from '../models/ExcelFile.js';
import ImageCollection from '../models/ImageCollection.js';
import { adminAuth } from '../middleware/adminAuth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.body.type;
    const uploadDir = uploadType === 'excel' 
      ? path.join(__dirname, '../../uploads/excel')
      : path.join(__dirname, '../../uploads/images');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename with timestamp
    const timestamp = Date.now();
    const originalName = file.originalname;
    const extension = path.extname(originalName);
    const nameWithoutExt = path.basename(originalName, extension);
    cb(null, `${nameWithoutExt}_${timestamp}${extension}`);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const uploadType = req.body.type || 'excel'; // Default to excel if type not specified
    
    if (uploadType === 'excel') {
      const allowedTypes = ['.xlsx', '.xls'];
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(fileExt)) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
      }
    } else if (uploadType === 'images') {
      const allowedTypes = ['.zip'];
      const fileExt = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(fileExt)) {
        cb(null, true);
      } else {
        cb(new Error('Only ZIP files are allowed for images'));
      }
    } else {
      cb(new Error('Invalid upload type'));
    }
  }
});

// Helper function to get file stats
const getFileStats = (filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      modified: stats.mtime
    };
  } catch (error) {
    return {
      size: 'Unknown',
      modified: new Date()
    };
  }
};

// Helper function to count products in Excel file
const countProductsInExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(firstSheet);
    return data.length;
  } catch (error) {
    return 0;
  }
};

// Helper function to get available images from uploads/images directory
const getAvailableImages = () => {
  try {
    const imagesDir = path.join(__dirname, '../../uploads/images');
    if (!fs.existsSync(imagesDir)) {
      return [];
    }
    
    const imageFiles = [];
    const files = fs.readdirSync(imagesDir);
    
    files.forEach(file => {
      const filePath = path.join(imagesDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile() && ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(path.extname(file).toLowerCase())) {
        // Extract ASIN from filename (assuming format: ASIN.jpg or similar)
        const asin = path.basename(file, path.extname(file));
        imageFiles.push({
          asin: asin,
          filename: file,
          path: `/uploads/images/${file}`
        });
      }
    });
    
    return imageFiles;
  } catch (error) {
    console.error('Error getting available images:', error);
    return [];
  }
};

// Helper function to match product with available images
const matchProductImage = (product, availableImages) => {
  if (!product.asin) return product.image || 'https://via.placeholder.com/400x400?text=No+Image';
  
  const matchedImage = availableImages.find(img => 
    img.asin.toLowerCase() === product.asin.toLowerCase()
  );
  
  if (matchedImage) {
    return `http://localhost:5000${matchedImage.path}`;
  }
  
  // Fallback to existing image or construct Amazon URL
  return product.image || `https://m.media-amazon.com/images/I/${product.asin}._AC_SL1500_.jpg`;
};
// Helper function to extract products from Excel
const extractProductsFromExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(firstSheet);
    
    // Get available images for ASIN matching
    const availableImages = getAvailableImages();
    
    return data.map((row, index) => {
      const allKeys = Object.keys(row);
      
      // Extract ASIN
      const asin = row.ASIN || row.asin || row['Product ASIN'] || row['ASIN Code'] || '';
      
      // Extract product name/title
      const nameKeys = allKeys.filter(key => 
        key.toLowerCase().includes('name') || 
        key.toLowerCase().includes('title') || 
        key.toLowerCase().includes('product')
      );
      
      let productName = '';
      for (const key of nameKeys) {
        const value = row[key];
        if (value && value.toString().trim()) {
          productName = value.toString().trim();
          break;
        }
      }
      
      if (!productName) {
        productName = `Product ${index + 1}`;
      }
      
      // Extract price
      const priceKeys = allKeys.filter(key => 
        key.toLowerCase().includes('price') && 
        !key.toLowerCase().includes('original')
      );
      
      let price = 0;
      for (const key of priceKeys) {
        const val = parseFloat(row[key]);
        if (!isNaN(val) && val > 0) {
          price = val;
          break;
        }
      }
      
      if (price === 0) {
        price = parseFloat((Math.random() * 95 + 5).toFixed(2));
      }
      
      // Extract other fields
      const category = row.Category || row.category || row['Product Category'] || row.CATEGORY || 'Uncategorized';
      const brand = row.Brand || row.brand || row['Brand Name'] || '';
      
      // Extract rating
      let rating = parseFloat(row.Rating || row.rating || row.RATING || 0);
      if (rating === 0) {
        rating = parseFloat((Math.random() * 1.5 + 3.5).toFixed(1));
      }
      
      // Extract reviews
      let reviews = parseInt(row.Reviews || row.reviews || row.REVIEWS || 0);
      if (reviews === 0) {
        reviews = Math.floor(Math.random() * 4950 + 50);
      }
      
      const stock = parseInt(row.Stock || row.stock || Math.floor(Math.random() * 100 + 10));
      
      // Extract image URL with ASIN matching
      let imageUrl = '';
      const imageKeys = allKeys.filter(key => 
        key.toLowerCase().includes('image') || 
        key.toLowerCase().includes('picture') || 
        key.toLowerCase().includes('photo')
      );
      
      for (const key of imageKeys) {
        if (row[key] && row[key].toString().trim()) {
          imageUrl = row[key].toString().trim();
          break;
        }
      }
      
      // If no image URL found, try to match with available images by ASIN
      if (!imageUrl && asin) {
        const matchedImage = availableImages.find(img => 
          img.asin.toLowerCase() === asin.toLowerCase()
        );
        
        if (matchedImage) {
          imageUrl = `http://localhost:5000${matchedImage.path}`;
        } else {
          imageUrl = `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`;
        }
      }
      
      if (!imageUrl) {
        imageUrl = 'https://via.placeholder.com/400x400?text=Product';
      }
      
      return {
        id: `excel-${index + 1}`,
        name: productName,
        title: productName, // Add title column
        asin: asin,
        price: price,
        category: category,
        brand: brand,
        rating: rating,
        reviews: reviews,
        stock: stock,
        image: imageUrl,
        images: [imageUrl],
        rawData: row
      };
    });
  } catch (error) {
    console.error('Error extracting products from Excel:', error);
    return [];
  }
};

// Get all Excel files from database
router.get('/files', adminAuth, async (req, res) => {
  try {
    const excelFiles = await ExcelFile.find()
      .populate('uploadedBy', 'username')
      .sort({ uploadedAt: -1 });
    
    const files = excelFiles.map(file => ({
      _id: file._id,
      name: file.name,
      originalName: file.originalName,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      modified: file.uploadedAt,
      productCount: file.productCount,
      status: file.status,
      uploadedBy: file.uploadedBy?.username || 'Unknown'
    }));
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error fetching Excel files:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch Excel files' });
  }
});

// Get all image zip files from database
router.get('/images', adminAuth, async (req, res) => {
  try {
    const imageCollections = await ImageCollection.find()
      .populate('uploadedBy', 'username')
      .sort({ uploadedAt: -1 });
    
    const images = imageCollections.map(collection => ({
      _id: collection._id,
      name: collection.name,
      originalName: collection.originalName,
      size: `${(collection.size / 1024 / 1024).toFixed(2)} MB`,
      modified: collection.uploadedAt,
      imageCount: collection.imageCount,
      status: collection.status,
      uploadedBy: collection.uploadedBy?.username || 'Unknown'
    }));
    
    res.json({ success: true, images });
  } catch (error) {
    console.error('Error fetching image files:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch image files' });
  }
});

// Get products from specific Excel file
router.get('/file/:fileId/products', adminAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const excelFile = await ExcelFile.findById(fileId);
    
    if (!excelFile) {
      return res.status(404).json({ success: false, message: 'Excel file not found' });
    }
    
    if (!fs.existsSync(excelFile.filePath)) {
      return res.status(404).json({ success: false, message: 'Physical file not found' });
    }
    
    const products = extractProductsFromExcel(excelFile.filePath);
    
    res.json({ 
      success: true, 
      products,
      fileName: excelFile.name,
      totalCount: products.length
    });
  } catch (error) {
    console.error('Error reading Excel file:', error);
    res.status(500).json({ success: false, message: 'Failed to read Excel file' });
  }
});

// Upload Excel file
router.post('/upload-excel', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const productCount = countProductsInExcel(req.file.path);
    
    // Get Excel metadata
    const workbook = xlsx.readFile(req.file.path);
    const metadata = {
      sheets: workbook.SheetNames,
      totalRows: 0
    };
    
    // Count total rows across all sheets
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      metadata.totalRows += data.length;
    });
    
    // Get columns from first sheet
    if (workbook.SheetNames.length > 0) {
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
      metadata.columns = data[0] || [];
    }
    
    // Save to database
    const excelFile = new ExcelFile({
      name: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      size: req.file.size,
      productCount: productCount,
      uploadedBy: req.admin._id,
      metadata: metadata,
      status: 'uploaded'
    });
    
    await excelFile.save();
    
    res.json({ 
      success: true, 
      message: 'Excel file uploaded successfully',
      fileName: req.file.filename,
      productCount,
      fileId: excelFile._id
    });
  } catch (error) {
    console.error('Error uploading Excel file:', error);
    res.status(500).json({ success: false, message: 'Failed to upload Excel file' });
  }
});

// Upload image zip file
router.post('/upload-images', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    // Save to database
    const imageCollection = new ImageCollection({
      name: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      size: req.file.size,
      uploadedBy: req.admin._id,
      status: 'uploaded'
    });
    
    await imageCollection.save();
    
    res.json({ 
      success: true, 
      message: 'Image zip uploaded successfully',
      fileName: req.file.filename,
      fileId: imageCollection._id
    });
  } catch (error) {
    console.error('Error uploading image zip:', error);
    res.status(500).json({ success: false, message: 'Failed to upload image zip' });
  }
});

// Delete Excel file
router.delete('/file/:fileId', adminAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const excelFile = await ExcelFile.findById(fileId);
    
    if (!excelFile) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    // Delete physical file
    if (fs.existsSync(excelFile.filePath)) {
      fs.unlinkSync(excelFile.filePath);
    }
    
    // Delete from database
    await ExcelFile.findByIdAndDelete(fileId);
    
    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting Excel file:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// Delete image zip file
router.delete('/images/:fileId', adminAuth, async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const imageCollection = await ImageCollection.findById(fileId);
    
    if (!imageCollection) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    // Delete physical file
    if (fs.existsSync(imageCollection.filePath)) {
      fs.unlinkSync(imageCollection.filePath);
    }
    
    // Delete from database
    await ImageCollection.findByIdAndDelete(fileId);
    
    res.json({ success: true, message: 'Image zip deleted successfully' });
  } catch (error) {
    console.error('Error deleting image zip:', error);
    res.status(500).json({ success: false, message: 'Failed to delete image zip' });
  }
});

// List products to database
router.post('/list-products', adminAuth, async (req, res) => {
  try {
    const { products, sourceFile } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ success: false, message: 'Invalid products data' });
    }
    
    let imported = 0;
    let skipped = 0;
    const errors = [];
    
    for (const productData of products) {
      try {
        // Check if product already exists by ASIN or name
        const existingProduct = await Product.findOne({
          $or: [
            { asin: productData.asin },
            { name: productData.name }
          ]
        });
        
        if (existingProduct) {
          skipped++;
          continue;
        }
        
        // Create new product
        const product = new Product({
          name: productData.name,
          asin: productData.asin,
          price: productData.price,
          category: productData.category,
          brand: productData.brand,
          rating: productData.rating,
          reviews: productData.reviews,
          stock: productData.stock,
          images: productData.images,
          description: productData.description || '',
          isAmazonsChoice: false,
          status: 'active',
          sourceFile: sourceFile,
          importedAt: new Date()
        });
        
        await product.save();
        imported++;
      } catch (error) {
        console.error('Error saving product:', error);
        errors.push(`Failed to save ${productData.name}: ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      message: `Import completed: ${imported} imported, ${skipped} skipped`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : null
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({ success: false, message: 'Failed to list products' });
  }
});

// Serve uploaded images
router.get('/image/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const imagePath = path.join(__dirname, '../../uploads/images', filename);
    
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ success: false, message: 'Failed to serve image' });
  }
});

// Get available images for ASIN matching
router.get('/available-images', adminAuth, async (req, res) => {
  try {
    const availableImages = getAvailableImages();
    res.json({ success: true, images: availableImages });
  } catch (error) {
    console.error('Error getting available images:', error);
    res.status(500).json({ success: false, message: 'Failed to get available images' });
  }
});

export default router;