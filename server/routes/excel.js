import express from 'express';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import ExcelProduct from '../models/ExcelProduct.js';
import { authenticateAdmin } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Cache for Amazon images to avoid repeated requests
const imageCache = new Map();

// Helper function to check if value is an image URL or filename
function isImageUrl(value) {
  if (!value) return false;
  const str = value.toString().toLowerCase();
  return str.endsWith('.jpg') || str.endsWith('.jpeg') || 
         str.endsWith('.png') || str.endsWith('.gif') || 
         str.endsWith('.webp') || str.includes('http') ||
         str.includes('amazon.com/images') || str.includes('media-amazon') ||
         str.includes('ssl-images-amazon') || str.match(/^[A-Z0-9]+\.(jpg|jpeg|png)$/i);
}

// Helper function to extract product name from row data
function extractProductName(row, allKeys, index) {
  let productName = '';
  
  // First, try columns with 'name', 'title', or 'product' in the key
  const nameKeys = allKeys.filter(key => 
    key.toLowerCase().includes('name') || 
    key.toLowerCase().includes('title') || 
    key.toLowerCase().includes('product')
  );
  
  for (const key of nameKeys) {
    const value = row[key];
    if (value && value.toString().trim() && !isImageUrl(value)) {
      productName = value.toString().trim();
      return productName;
    }
  }
  
  // If still no name found, try ALL columns (excluding obvious non-name columns)
  for (const key of allKeys) {
    const value = row[key];
    const keyLower = key.toLowerCase();
    
    // Skip columns that are clearly not product names
    if (keyLower.includes('image') || keyLower.includes('url') || 
        keyLower.includes('link') || keyLower.includes('asin') ||
        keyLower.includes('price') || keyLower.includes('rating') ||
        keyLower.includes('review') || keyLower.includes('stock')) {
      continue;
    }
    
    if (value && value.toString().trim() && !isImageUrl(value) && value.toString().length > 10) {
      productName = value.toString().trim();
      return productName;
    }
  }
  
  return `Product ${index + 1}`;
}

// Function to fetch Amazon product image by ASIN
async function fetchAmazonImage(asin) {
  if (!asin) return null;
  
  console.log(`🖼️ Fetching Amazon image for ASIN: ${asin}`);
  
  // Check cache first
  if (imageCache.has(asin)) {
    console.log(`📷 Using cached image for ASIN ${asin}`);
    return imageCache.get(asin);
  }
  
  try {
    // Try multiple Amazon domains
    const domains = ['amazon.com', 'amazon.co.uk'];
    
    for (const domain of domains) {
      try {
        const url = `https://www.${domain}/dp/${asin}`;
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          },
          timeout: 5000
        });
        
        const $ = cheerio.load(response.data);
        
        // Try multiple selectors for product images
        let imageUrl = null;
        
        // Method 1: Main product image
        imageUrl = $('#landingImage').attr('src') || $('#landingImage').attr('data-old-hires');
        
        // Method 2: Alternative image container
        if (!imageUrl) {
          imageUrl = $('#imgBlkFront').attr('src');
        }
        
        // Method 3: Image in JSON data
        if (!imageUrl) {
          const scriptTags = $('script[type="text/javascript"]');
          scriptTags.each((i, elem) => {
            const scriptContent = $(elem).html();
            if (scriptContent && scriptContent.includes('ImageBlockATF')) {
              const match = scriptContent.match(/"hiRes":"([^"]+)"/);
              if (match) {
                imageUrl = match[1];
              }
            }
          });
        }
        
        if (imageUrl) {
          // Clean up the URL
          imageUrl = imageUrl.replace(/\._.*?_\./, '._AC_SL1500_.');
          console.log(`✅ Successfully found image: ${imageUrl}`);
          imageCache.set(asin, imageUrl);
          return imageUrl;
        } else {
          console.log(`⚠️ No image found on ${domain}`);
        }
      } catch (err) {
        console.log(`⚠️ Failed to scrape ${domain}:`, err.message);
        continue;
      }
    }
    
    // If all methods fail, return a constructed URL (may or may not work)
    console.log(`⚠️ All scraping methods failed, trying fallback URL for ASIN: ${asin}`);
    const fallbackUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg`;
    console.log(`🔄 Fallback URL: ${fallbackUrl}`);
    imageCache.set(asin, fallbackUrl);
    return fallbackUrl;
    
  } catch (error) {
    console.error(`Error fetching image for ASIN ${asin}:`, error.message);
    return null;
  }
}

// Read Excel file and return products
router.get('/products', async (req, res) => {
  try {
    // Path to Excel file (in root directory)
    const excelPath = path.join(__dirname, '../../Products.xlsx');
    
    // Read the Excel file
    const workbook = xlsx.readFile(excelPath);
    
    // Get sheet name from query parameter or use first sheet
    const requestedSheet = req.query.sheet;
    const sheetName = requestedSheet || workbook.SheetNames[0];
    
    // Check if requested sheet exists
    if (!workbook.SheetNames.includes(sheetName)) {
      return res.status(404).json({
        success: false,
        message: `Sheet "${sheetName}" not found`,
        availableSheets: workbook.SheetNames
      });
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    // Transform data to match product format
    const products = await Promise.all(data.map(async (row, index) => {
      // Get ASIN and construct Amazon image URL
      const asin = row.ASIN || row.asin || row['Product ASIN'] || '';
      
      // Multiple Amazon image URL formats to try
      let imageUrl = '';
      if (asin) {
        // Try different Amazon image URL formats
        // Format 1: Standard Amazon images
        imageUrl = `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`;
        // Fallback formats stored for frontend to try
      }
      
      // Try multiple column name variations for product name
      const productName = row.Name || row.name || row['Product Name'] || row['Product Title'] || 
                         row.Title || row.title || row['Product'] || row.product || 
                         `Product ${index + 1}`;
      
      // Generate random price if not provided (between 5 and 100)
      const basePrice = parseFloat(row.Price || row.price || (Math.random() * 95 + 5).toFixed(2));
      const originalPrice = parseFloat(row['Original Price'] || row.originalPrice || (basePrice * 1.3).toFixed(2));
      
      // Calculate discount
      const discount = row.Discount || row.discount || Math.round(((originalPrice - basePrice) / originalPrice) * 100);
      
      // Random rating between 3.5 and 5.0
      const rating = parseFloat(row.Rating || row.rating || (Math.random() * 1.5 + 3.5).toFixed(1));
      
      // Random reviews between 50 and 5000
      const reviews = parseInt(row.Reviews || row.reviews || Math.floor(Math.random() * 4950 + 50));
      
      // Get image URL from Excel or fetch from Amazon
      let finalImageUrl = row.Image || row.image || row['Image URL'] || row['Product Image'] || '';
      
      // If no image URL provided but ASIN exists, fetch from Amazon
      if (!finalImageUrl && asin) {
        finalImageUrl = await fetchAmazonImage(asin);
      }
      
      // Fallback to placeholder if still no image
      if (!finalImageUrl) {
        finalImageUrl = 'https://via.placeholder.com/400x400?text=No+Image';
      }
      
      return {
        id: `excel-${index + 1}`,
        name: productName,
        asin: asin,
        price: basePrice,
        originalPrice: originalPrice,
        category: row.Category || row.category || 'Uncategorized',
        brand: row.Brand || row.brand || '',
        rating: rating,
        reviews: reviews,
        stock: parseInt(row.Stock || row.stock || Math.floor(Math.random() * 100 + 10)),
        description: row.Description || row.description || '',
        image: finalImageUrl,
        images: [finalImageUrl],
        discount: discount,
        // Raw data for reference
        rawData: row
      };
    }));
    
    res.json({
      success: true,
      total: products.length,
      products: products
    });
    
  } catch (error) {
    console.error('Error reading Excel file:', error);
    res.status(500).json({
      success: false,
      message: 'Error reading Excel file',
      error: error.message
    });
  }
});

// Get Excel file info
router.get('/info', async (req, res) => {
  try {
    const excelPath = path.join(__dirname, '../../Products.xlsx');
    const workbook = xlsx.readFile(excelPath);
    
    const info = {
      sheets: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length
    };
    
    // Get column headers from first sheet
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
    info.columns = data[0] || [];
    info.rowCount = data.length - 1; // Exclude header
    
    res.json(info);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reading Excel file info',
      error: error.message
    });
  }
});

// Cache for products to avoid repeated Excel reads
let productsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get product by ASIN from Excel data (database first, then files)
router.get('/asin/:asin', authenticateAdmin, async (req, res) => {
  try {
    const { asin } = req.params;
    
    console.log('🔍 ASIN Fetch Request:', asin);
    
    if (!asin || asin.length !== 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid ASIN format. ASIN must be 10 characters long.' 
      });
    }
    
    // First, check ExcelProduct database (from admin/excel-manager)
    try {
      console.log('🗄️ Checking ExcelProduct database for ASIN:', asin);
      
      const excelProduct = await ExcelProduct.findOne({ 
        asin: asin.toUpperCase(),
        status: { $in: ['pending', 'active'] } // Only get non-converted products
      }).populate('excelUploadId');
      
      if (excelProduct) {
        console.log('✅ Found ASIN in ExcelProduct database:', excelProduct.name);
        console.log('📷 ExcelProduct images:', excelProduct.images);
        
        // Prepare images array
        let productImages = [];
        
        // First, add any existing images from ExcelProduct
        if (excelProduct.images && excelProduct.images.length > 0) {
          productImages = [...excelProduct.images];
          console.log('📷 Using ExcelProduct images:', productImages);
        }
        
        // If no images or we want to ensure we have Amazon images, try to fetch from Amazon
        if (productImages.length === 0) {
          console.log('📷 No images in ExcelProduct, trying to fetch from Amazon...');
          try {
            const amazonImage = await fetchAmazonImage(asin);
            if (amazonImage) {
              productImages.push(amazonImage);
              console.log('📷 Fetched Amazon image:', amazonImage);
            }
          } catch (error) {
            console.log('⚠️ Could not fetch Amazon image for ASIN:', asin, error.message);
          }
        }
        
        // If still no images, try to construct Amazon image URLs
        if (productImages.length === 0) {
          console.log('📷 Trying direct Amazon image URLs...');
          const directAmazonUrls = [
            `https://images-na.ssl-images-amazon.com/images/P/${asin}.01._SCLZZZZZZZ_SX500_.jpg`,
            `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
            `https://images-na.ssl-images-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
            `https://images.amazon.com/images/P/${asin}.01.L.jpg`
          ];
          
          // Add all potential URLs - let the frontend handle validation
          productImages.push(...directAmazonUrls);
          console.log('📷 Added potential Amazon image URLs:', directAmazonUrls);
        }
        
        console.log('📷 Final images array:', productImages);
        
        return res.json({
          success: true,
          product: {
            name: excelProduct.name,
            price: excelProduct.price || 0,
            category: excelProduct.category || 'General',
            brand: excelProduct.brand || '',
            asin: excelProduct.asin,
            rating: excelProduct.rating || 4.5,
            reviews: excelProduct.reviews || 0,
            description: excelProduct.description || '',
            features: [], // ExcelProduct doesn't have features field, could be added
            images: productImages,
            stock: excelProduct.stock || 0,
            dealUnits: excelProduct.dealUnits || 1,
            source: 'ExcelManager',
            uploadId: excelProduct.excelUploadId?._id,
            uploadName: excelProduct.excelUploadId?.fileName
          }
        });
      }
      
      console.log('❌ ASIN not found in ExcelProduct database, checking static files...');
    } catch (dbError) {
      console.error('⚠️ Error checking ExcelProduct database:', dbError.message);
      console.log('📁 Falling back to static Excel files...');
    }
    
    // Fallback: Check static Excel files
    const excelFiles = [
      { path: path.join(__dirname, '../../Products.xlsx'), name: 'Products' },
      { path: path.join(__dirname, '../../Amazon10.xlsx'), name: 'Amazon10' },
      { path: path.join(__dirname, '../../uae-asin.xlsx'), name: 'UAE' }
    ];
    
    console.log('📁 Checking static Excel files:', excelFiles.map(f => ({ name: f.name, exists: fs.existsSync(f.path) })));
    
    for (const file of excelFiles) {
      if (!fs.existsSync(file.path)) {
        console.log(`❌ File not found: ${file.path}`);
        continue;
      }
      
      try {
        console.log(`📖 Reading file: ${file.name}`);
        const workbook = xlsx.readFile(file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        
        console.log(`📊 ${file.name} has ${data.length} rows`);
        
        // Find product by ASIN
        const product = data.find(row => {
          // Check various possible ASIN column names (expanded list)
          const asinValue = row.ASIN || row.asin || row['Product ASIN'] || row['ASIN Code'] || 
                           row['Product ID'] || row['ProductASIN'] || row['Asin'] || 
                           row['PRODUCT_ASIN'] || row['product_asin'] || row['ID'] || 
                           row['ProductId'] || row['Product_ID'] || row['PRODUCT_ID'];
          const match = asinValue && asinValue.toString().toUpperCase() === asin.toUpperCase();
          if (match) {
            console.log(`✅ Found ASIN ${asin} in ${file.name}:`, row);
          }
          return match;
        });
        
        if (product) {
          console.log(`🎉 Product found in ${file.name}:`, product);
          
          // Extract product details
          const allKeys = Object.keys(product);
          const productName = extractProductName(product, allKeys, 0);
          
          // Extract other details with more column variations
          const price = product.Price || product.price || product['Sale Price'] || product['Current Price'] || 
                       product['Product Price'] || product['ListPrice'] || product['List Price'] || 
                       product['PRICE'] || product['SalePrice'] || 0;
          
          const category = product.Category || product.category || product['Product Category'] || 
                          product['CATEGORY'] || product['ProductCategory'] || product['Cat'] || 'General';
          
          const brand = product.Brand || product.brand || product['Brand Name'] || 
                       product['BRAND'] || product['BrandName'] || product['Manufacturer'] || '';
          
          const rating = product.Rating || product.rating || product['Product Rating'] || 
                        product['RATING'] || product['ProductRating'] || product['Stars'] || 4.5;
          
          const reviews = product.Reviews || product.reviews || product['Review Count'] || 
                         product['REVIEWS'] || product['ReviewCount'] || product['NumReviews'] || 0;
          
          const description = product.Description || product.description || product['Product Description'] || 
                             product['DESCRIPTION'] || product['ProductDescription'] || product['Details'] || '';
          
          // Extract features (look for feature columns)
          const features = [];
          allKeys.forEach(key => {
            if (key.toLowerCase().includes('feature') || key.toLowerCase().includes('bullet')) {
              const value = product[key];
              if (value && value.toString().trim()) {
                features.push(value.toString().trim());
              }
            }
          });
          
          // Extract images with more column variations
          const images = [];
          allKeys.forEach(key => {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('image') || keyLower.includes('img') || keyLower.includes('photo') || 
                keyLower.includes('picture') || keyLower.includes('url') && keyLower.includes('image')) {
              const value = product[key];
              if (value && isImageUrl(value)) {
                images.push(value.toString());
              }
            }
          });
          
          // Try to fetch Amazon image if no images found
          if (images.length === 0) {
            try {
              const amazonImage = await fetchAmazonImage(asin);
              if (amazonImage) {
                images.push(amazonImage);
              }
            } catch (error) {
              console.log('Could not fetch Amazon image for ASIN:', asin);
            }
          }
          
          const result = {
            success: true,
            product: {
              name: productName,
              price: parseFloat(price) || 0,
              category,
              brand,
              asin: asin.toUpperCase(),
              rating: parseFloat(rating) || 4.5,
              reviews: parseInt(reviews) || 0,
              description,
              features,
              images,
              source: `StaticFile_${file.name}`
            }
          };
          
          console.log('📤 Sending response:', result);
          return res.json(result);
        }
      } catch (fileError) {
        console.error(`❌ Error reading ${file.name}:`, fileError.message);
        continue;
      }
    }
    
    console.log(`❌ ASIN ${asin} not found in ExcelProduct database or static files`);
    
    // ASIN not found in database or any file
    res.status(404).json({
      success: false,
      message: 'ASIN not found in Excel database or uploaded files'
    });
    
  } catch (error) {
    console.error('❌ Error fetching product by ASIN:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch product by ASIN' 
    });
  }
});

// Debug endpoint to check ExcelProduct database statistics
router.get('/debug/excel-database', authenticateAdmin, async (req, res) => {
  try {
    const stats = {
      totalProducts: 0,
      byStatus: {},
      byUpload: [],
      withAsin: 0,
      sampleProducts: []
    };
    
    // Get total count
    stats.totalProducts = await ExcelProduct.countDocuments();
    
    // Get count by status
    const statusCounts = await ExcelProduct.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    statusCounts.forEach(item => {
      stats.byStatus[item._id] = item.count;
    });
    
    // Get count by upload
    const uploadCounts = await ExcelProduct.aggregate([
      { 
        $lookup: {
          from: 'exceluploads',
          localField: 'excelUploadId',
          foreignField: '_id',
          as: 'upload'
        }
      },
      { $unwind: '$upload' },
      { 
        $group: { 
          _id: '$excelUploadId', 
          count: { $sum: 1 },
          fileName: { $first: '$upload.fileName' },
          uploadDate: { $first: '$upload.createdAt' }
        } 
      },
      { $sort: { uploadDate: -1 } }
    ]);
    stats.byUpload = uploadCounts;
    
    // Get count with ASIN
    stats.withAsin = await ExcelProduct.countDocuments({ 
      asin: { $exists: true, $ne: null, $ne: '' } 
    });
    
    // Get sample products
    stats.sampleProducts = await ExcelProduct.find()
      .populate('excelUploadId', 'fileName')
      .limit(5)
      .select('name asin price category status excelUploadId')
      .lean();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error getting ExcelProduct database stats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get database statistics' 
    });
  }
});

// Debug endpoint to check Excel files structure
router.get('/debug/files', async (req, res) => {
  try {
    const excelFiles = [
      { path: path.join(__dirname, '../../Products.xlsx'), name: 'Products' },
      { path: path.join(__dirname, '../../Amazon10.xlsx'), name: 'Amazon10' },
      { path: path.join(__dirname, '../../uae-asin.xlsx'), name: 'UAE' }
    ];
    
    const filesInfo = [];
    
    for (const file of excelFiles) {
      const fileInfo = {
        name: file.name,
        path: file.path,
        exists: fs.existsSync(file.path),
        columns: [],
        sampleData: [],
        rowCount: 0
      };
      
      if (fileInfo.exists) {
        try {
          const workbook = xlsx.readFile(file.path);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = xlsx.utils.sheet_to_json(worksheet);
          
          fileInfo.rowCount = data.length;
          if (data.length > 0) {
            fileInfo.columns = Object.keys(data[0]);
            fileInfo.sampleData = data.slice(0, 3).map(row => {
              const sample = {};
              fileInfo.columns.forEach(col => {
                sample[col] = row[col];
              });
              return sample;
            });
          }
        } catch (error) {
          fileInfo.error = error.message;
        }
      }
      
      filesInfo.push(fileInfo);
    }
    
    res.json({
      success: true,
      files: filesInfo
    });
  } catch (error) {
    console.error('Error checking Excel files:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to check Excel files' 
    });
  }
});

// Debug endpoint to search for specific ASIN across all sources (database + files)
router.get('/debug/search/:asin', authenticateAdmin, async (req, res) => {
  try {
    const { asin } = req.params;
    
    const searchResults = {
      searchTerm: asin,
      excelDatabase: {
        found: false,
        products: [],
        error: null
      },
      staticFiles: []
    };
    
    // First check ExcelProduct database
    try {
      console.log('🗄️ Searching ExcelProduct database for ASIN:', asin);
      
      const excelProducts = await ExcelProduct.find({ 
        asin: { $regex: new RegExp(asin, 'i') }
      }).populate('excelUploadId').limit(10);
      
      searchResults.excelDatabase.found = excelProducts.length > 0;
      searchResults.excelDatabase.products = excelProducts.map(product => ({
        id: product._id,
        name: product.name,
        asin: product.asin,
        price: product.price,
        category: product.category,
        status: product.status,
        uploadId: product.excelUploadId?._id,
        uploadName: product.excelUploadId?.fileName,
        exactMatch: product.asin?.toUpperCase() === asin.toUpperCase()
      }));
      
      console.log(`📊 Found ${excelProducts.length} products in ExcelProduct database`);
    } catch (dbError) {
      console.error('⚠️ Error searching ExcelProduct database:', dbError.message);
      searchResults.excelDatabase.error = dbError.message;
    }
    
    // Then check static Excel files
    const excelFiles = [
      { path: path.join(__dirname, '../../Products.xlsx'), name: 'Products' },
      { path: path.join(__dirname, '../../Amazon10.xlsx'), name: 'Amazon10' },
      { path: path.join(__dirname, '../../uae-asin.xlsx'), name: 'UAE' }
    ];
    
    for (const file of excelFiles) {
      const fileResult = {
        name: file.name,
        path: file.path,
        exists: fs.existsSync(file.path),
        matches: [],
        asinColumns: [],
        totalRows: 0
      };
      
      if (fileResult.exists) {
        try {
          const workbook = xlsx.readFile(file.path);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = xlsx.utils.sheet_to_json(worksheet);
          
          fileResult.totalRows = data.length;
          
          if (data.length > 0) {
            // Find ASIN-related columns
            const columns = Object.keys(data[0]);
            fileResult.asinColumns = columns.filter(col => 
              col.toLowerCase().includes('asin') || 
              col.toLowerCase().includes('id') ||
              col.toLowerCase().includes('product')
            );
            
            // Search for ASIN matches
            data.forEach((row, index) => {
              columns.forEach(col => {
                const value = row[col];
                if (value && value.toString().toUpperCase().includes(asin.toUpperCase())) {
                  fileResult.matches.push({
                    rowIndex: index,
                    column: col,
                    value: value,
                    exactMatch: value.toString().toUpperCase() === asin.toUpperCase(),
                    fullRow: row
                  });
                }
              });
            });
          }
        } catch (error) {
          fileResult.error = error.message;
        }
      }
      
      searchResults.staticFiles.push(fileResult);
    }
    
    res.json({
      success: true,
      ...searchResults
    });
  } catch (error) {
    console.error('Error searching for ASIN:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search for ASIN' 
    });
  }
});

// Test endpoint to fetch Amazon image for ASIN
router.get('/test-image/:asin', async (req, res) => {
  try {
    const { asin } = req.params;
    console.log(`🧪 Testing image fetch for ASIN: ${asin}`);
    
    const imageUrl = await fetchAmazonImage(asin);
    
    res.json({
      success: true,
      asin,
      imageUrl,
      message: imageUrl ? 'Image found successfully' : 'No image found'
    });
  } catch (error) {
    console.error('Error testing image fetch:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to test image fetch',
      error: error.message
    });
  }
});

// Clear cache endpoint (for debugging)
router.get('/clear-cache', (req, res) => {
  productsCache = null;
  cacheTimestamp = null;
  res.json({ success: true, message: 'Cache cleared' });
});

// Get products by category (Best Selling or Fast Selling) - OPTIMIZED
router.get('/products-by-category', async (req, res) => {
  try {
    // Check cache first (skip cache if ?nocache=true)
    const now = Date.now();
    const skipCache = req.query.nocache === 'true';
    
    if (!skipCache && productsCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
      return res.json(productsCache);
    }

    const excelPath = path.join(__dirname, '../../Products.xlsx');
    const workbook = xlsx.readFile(excelPath);
    
    const result = {
      fastSelling: [],
      bestSelling: []
    };
    
    // Process Amazon10 sheet for Best Selling products
    if (workbook.SheetNames.includes('Amazon10')) {
      const worksheet = workbook.Sheets['Amazon10'];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      // Process synchronously without image fetching for speed
      const products = data.map((row, index) => {
        const allKeys = Object.keys(row);
        const asin = row.ASIN || row.asin || row['Product ASIN'] || row['ASIN Code'] || '';
        const productName = extractProductName(row, allKeys, index);
        
        let basePrice = 0;
        const priceKeys = allKeys.filter(key => 
          key.toLowerCase().includes('price') && 
          !key.toLowerCase().includes('original') &&
          !key.toLowerCase().includes('list')
        );
        for (const key of priceKeys) {
          const val = parseFloat(row[key]);
          if (!isNaN(val) && val > 0) {
            basePrice = val;
            break;
          }
        }
        if (basePrice === 0) basePrice = parseFloat((Math.random() * 95 + 5).toFixed(2));
        
        const originalPrice = parseFloat(row['Original Price'] || row.originalPrice || row['List Price'] || (basePrice * 1.3).toFixed(2));
        const discount = row.Discount || row.discount || row['Discount %'] || Math.round(((originalPrice - basePrice) / originalPrice) * 100);
        const rating = parseFloat(row.Rating || row.rating || row['Product Rating'] || row['Star Rating'] || (Math.random() * 1.5 + 3.5).toFixed(1));
        const reviews = parseInt(row.Reviews || row.reviews || row['Review Count'] || row['Number of Reviews'] || Math.floor(Math.random() * 4950 + 50));
        
        // Image URL - NO ASYNC FETCHING, use what's in Excel or construct URL
        let finalImageUrl = '';
        const imageKeys = allKeys.filter(key => 
          key.toLowerCase().includes('image') || 
          key.toLowerCase().includes('picture') || 
          key.toLowerCase().includes('photo') ||
          key.toLowerCase().includes('img') ||
          key.toLowerCase().includes('url')
        );
        for (const key of imageKeys) {
          if (row[key] && row[key].toString().trim()) {
            finalImageUrl = row[key].toString().trim();
            break;
          }
        }
        
        // If no image but has ASIN, construct Amazon image URL (no fetching)
        if (!finalImageUrl && asin) {
          finalImageUrl = `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`;
        }
        if (!finalImageUrl) {
          finalImageUrl = 'https://via.placeholder.com/400x400?text=Product';
        }
        
        return {
          id: `amazon10-${index + 1}`,
          name: productName,
          asin: asin,
          price: basePrice,
          originalPrice: originalPrice,
          category: row.Category || row.category || row['Product Category'] || 'Uncategorized',
          brand: row.Brand || row.brand || row['Brand Name'] || '',
          rating: rating,
          reviews: reviews,
          stock: parseInt(row.Stock || row.stock || row['Stock Quantity'] || Math.floor(Math.random() * 100 + 10)),
          description: row.Description || row.description || row['Product Description'] || '',
          image: finalImageUrl,
          images: [finalImageUrl],
          discount: discount,
          isBestSeller: true,
          sheet: 'Amazon10'
        };
      });
      
      result.bestSelling = products;
    }
    
    // Process first sheet for Fast Selling products
    const firstSheetName = workbook.SheetNames[0];
    if (firstSheetName && firstSheetName !== 'Amazon10') {
      const worksheet = workbook.Sheets[firstSheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);
      
      const products = data.map((row, index) => {
        const allKeys = Object.keys(row);
        const asin = row.ASIN || row.asin || row['Product ASIN'] || row['ASIN Code'] || '';
        const productName = extractProductName(row, allKeys, index);
        
        let basePrice = 0;
        const priceKeys = allKeys.filter(key => 
          key.toLowerCase().includes('price') && 
          !key.toLowerCase().includes('original') &&
          !key.toLowerCase().includes('list')
        );
        for (const key of priceKeys) {
          const val = parseFloat(row[key]);
          if (!isNaN(val) && val > 0) {
            basePrice = val;
            break;
          }
        }
        if (basePrice === 0) basePrice = parseFloat((Math.random() * 95 + 5).toFixed(2));
        
        const originalPrice = parseFloat(row['Original Price'] || row.originalPrice || row['List Price'] || (basePrice * 1.3).toFixed(2));
        const discount = row.Discount || row.discount || row['Discount %'] || Math.round(((originalPrice - basePrice) / originalPrice) * 100);
        const rating = parseFloat(row.Rating || row.rating || row['Product Rating'] || row['Star Rating'] || (Math.random() * 1.5 + 3.5).toFixed(1));
        const reviews = parseInt(row.Reviews || row.reviews || row['Review Count'] || row['Number of Reviews'] || Math.floor(Math.random() * 4950 + 50));
        
        // Image URL - NO ASYNC FETCHING
        let finalImageUrl = '';
        const imageKeys = allKeys.filter(key => 
          key.toLowerCase().includes('image') || 
          key.toLowerCase().includes('picture') || 
          key.toLowerCase().includes('photo') ||
          key.toLowerCase().includes('img') ||
          key.toLowerCase().includes('url')
        );
        for (const key of imageKeys) {
          if (row[key] && row[key].toString().trim()) {
            finalImageUrl = row[key].toString().trim();
            break;
          }
        }
        
        if (!finalImageUrl && asin) {
          finalImageUrl = `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`;
        }
        if (!finalImageUrl) {
          finalImageUrl = 'https://via.placeholder.com/400x400?text=Product';
        }
        
        return {
          id: `fast-${index + 1}`,
          name: productName,
          asin: asin,
          price: basePrice,
          originalPrice: originalPrice,
          category: row.Category || row.category || row['Product Category'] || 'Uncategorized',
          brand: row.Brand || row.brand || row['Brand Name'] || '',
          rating: rating,
          reviews: reviews,
          stock: parseInt(row.Stock || row.stock || row['Stock Quantity'] || Math.floor(Math.random() * 100 + 10)),
          description: row.Description || row.description || row['Product Description'] || '',
          image: finalImageUrl,
          images: [finalImageUrl],
          discount: discount,
          isFastSelling: true,
          sheet: firstSheetName
        };
      });
      
      result.fastSelling = products;
    }
    
    const response = {
      success: true,
      fastSelling: result.fastSelling,
      bestSelling: result.bestSelling,
      totalFastSelling: result.fastSelling.length,
      totalBestSelling: result.bestSelling.length
    };

    // Cache the result
    productsCache = response;
    cacheTimestamp = now;
    
    res.json(response);
    
  } catch (error) {
    console.error('Error reading Excel file:', error);
    res.status(500).json({
      success: false,
      message: 'Error reading Excel file',
      error: error.message
    });
  }
});

// ============================================
// AMAZON 10 EXCEL IMPORT ROUTES
// ============================================

// Import Amazon 10 products from Amazon10.xlsx
router.get('/amazon10-products', async (req, res) => {
  try {
    const excelPath = path.join(__dirname, '../../Amazon10.xlsx');
    
    // Check if file exists first
    if (!fs.existsSync(excelPath)) {
      return res.status(404).json({
        success: false,
        message: 'Amazon10.xlsx file not found',
        filePath: excelPath,
        details: 'Please ensure Amazon10.xlsx exists in the root directory'
      });
    }
    
    const workbook = xlsx.readFile(excelPath);
    
    const result = {
      products: [],
      totalCount: 0
    };
    
    // Get the first sheet (assuming Amazon 10 data is in the first sheet)
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.json({
        success: true,
        message: 'No products found in Amazon 10 Excel file',
        products: [],
        totalCount: 0
      });
    }
    
    const allKeys = Object.keys(data[0]);
    
    // Process each row
    const products = data.map((row, index) => {
      // Extract ASIN
      const asin = row.ASIN || row.asin || row['Product ASIN'] || row['ASIN Code'] || '';
      
      // Extract product name
      const productName = row.Name || row.name || row.Title || row.title || row['Product Name'] || extractProductName(row, allKeys, index);
      
      // Get price
      const basePrice = parseFloat(row.Price || row.price || row['Product Price'] || 0);
      const originalPrice = parseFloat(row['Original Price'] || row.originalPrice || basePrice * 1.3);
      const discount = row.Discount || row.discount || Math.round(((originalPrice - basePrice) / originalPrice) * 100);
      
      // Rating and reviews
      const rating = parseFloat(row.Rating || row.rating || (Math.random() * 1.5 + 3.5).toFixed(1));
      const reviews = parseInt(row.Reviews || row.reviews || Math.floor(Math.random() * 4950 + 50));
      
      // Get image URL
      let finalImageUrl = '';
      
      // First, check if there's an image column
      if (row.Image || row.image || row['Image URL']) {
        finalImageUrl = row.Image || row.image || row['Image URL'];
      }
      // If ASIN exists, use it to load from public assets folder
      else if (asin) {
        // Frontend will load this from public/assets/amazon10/
        finalImageUrl = `/assets/amazon10/${asin}.jpg`;
      }
      
      // Fallback to placeholder if no image
      if (!finalImageUrl) {
        finalImageUrl = 'https://via.placeholder.com/400x400?text=Amazon10+Product';
      }
      
      const productData = {
        id: `amazon10-${index + 1}`,
        name: productName,
        asin: asin,
        price: basePrice,
        originalPrice: originalPrice,
        category: row.Category || row.category || 'Amazon 10 Products',
        brand: row.Brand || row.brand || '',
        rating: rating,
        reviews: reviews,
        stock: parseInt(row.Stock || row.stock || 0),
        description: row.Description || row.description || '',
        image: finalImageUrl,
        images: [finalImageUrl],
        discount: discount,
        currency: 'USD',
        // Raw data for reference (but don't include marketplace from raw data)
        rawData: row
      };
      
      // Force marketplace to Amazon10 (this must be last to override any conflicts)
      productData.marketplace = 'Amazon10';
      
      return productData;
    });
    
    result.products = products;
    result.totalCount = products.length;
    
    res.json({
      success: true,
      message: `Successfully loaded ${products.length} Amazon 10 products`,
      ...result
    });
    
  } catch (error) {
    console.error('❌ Amazon 10 Excel Error:', error);
    console.error('Error details:', error.message);
    console.error('File path attempted:', path.join(__dirname, '../../Amazon10.xlsx'));
    res.status(500).json({
      success: false,
      message: 'Error reading Amazon 10 Excel file',
      error: error.message,
      details: 'Make sure Amazon10.xlsx exists in the root directory'
    });
  }
});

// Get Amazon 10 Excel file info
router.get('/amazon10-info', async (req, res) => {
  try {
    const excelPath = path.join(__dirname, '../../Amazon10.xlsx');
    const workbook = xlsx.readFile(excelPath);
    
    const info = {
      sheets: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length
    };
    
    // Get column headers from first sheet
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
    info.columns = data[0] || [];
    info.rowCount = data.length - 1; // Exclude header
    
    res.json(info);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reading Amazon 10 Excel file info',
      error: error.message
    });
  }
});

// ============================================
// UAE EXCEL IMPORT ROUTES
// ============================================

// Import UAE products from uae-asin.xlsx
router.get('/uae-products', async (req, res) => {
  try {
    const excelPath = path.join(__dirname, '../../uae-asin.xlsx');
    const workbook = xlsx.readFile(excelPath);
    
    const result = {
      products: [],
      totalCount: 0
    };
    
    // Get the first sheet (assuming UAE data is in the first sheet)
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    
    if (data.length === 0) {
      return res.json({
        success: true,
        message: 'No products found in UAE Excel file',
        products: [],
        totalCount: 0
      });
    }
    
    const allKeys = Object.keys(data[0]);
    
    // Process each row
    const products = await Promise.all(data.map(async (row, index) => {
      // Extract ASIN - use NEW ASINS column from the Excel file
      const asin = row['NEW ASINS'] || row['NEW ASIN'] || row.ASIN || row.asin || row['OLD ASIN'] || '';
      
      // Extract product name - use TITLE column
      const productName = row.TITLE || row.Title || row.title || extractProductName(row, allKeys, index);
      
      // Get price - use the correct column names from UAE Excel
      const basePrice = parseFloat(row['Sales Price'] || row['SALE PRICE'] || row.Price || row.price || 0);
      const originalPrice = parseFloat(row['Original Price'] || row.originalPrice || basePrice * 1.3);
      const discount = row.Discount || row.discount || Math.round(((originalPrice - basePrice) / originalPrice) * 100);
      
      // Rating and reviews
      const rating = parseFloat(row.Rating || row.rating || row.Review || (Math.random() * 1.5 + 3.5).toFixed(1));
      const reviews = parseInt(row.Reviews || row.reviews || Math.floor(Math.random() * 4950 + 50));
      
      // Get image URL - use IMAGE column or construct from ASIN
      let finalImageUrl = '';
      
      // First, check if IMAGE column has a value
      if (row.IMAGE || row.Image || row.image) {
        finalImageUrl = row.IMAGE || row.Image || row.image;
      }
      // If ASIN exists, use it to load from public assets folder
      else if (asin) {
        // Frontend will load this from public/assets/uae/
        finalImageUrl = `/assets/uae/${asin}.jpg`;
      }
      
      // Fallback to placeholder if no image
      if (!finalImageUrl) {
        finalImageUrl = 'https://via.placeholder.com/400x400?text=UAE+Product';
      }
      
      return {
        id: `uae-${index + 1}`,
        name: productName,
        asin: asin,
        price: basePrice,
        originalPrice: originalPrice,
        category: row.Category || row.category || 'UAE Products',
        brand: row.BRAND || row.Brand || row.brand || '',
        rating: rating,
        reviews: reviews,
        stock: parseInt(row.qty || row.Stock || row.stock || 0), // Use qty column
        description: row.Description || row.description || '',
        image: finalImageUrl,
        images: [finalImageUrl],
        discount: discount,
        marketplace: 'UAE',
        currency: 'AED',
        // Raw data for reference
        rawData: row
      };
    }));
    
    result.products = products;
    result.totalCount = products.length;
    
    res.json({
      success: true,
      message: `Successfully loaded ${products.length} UAE products`,
      ...result
    });
    
  } catch (error) {
    console.error('❌ UAE Excel Error:', error);
    console.error('Error details:', error.message);
    console.error('File path attempted:', path.join(__dirname, '../../uae-asin.xlsx'));
    res.status(500).json({
      success: false,
      message: 'Error reading UAE Excel file',
      error: error.message,
      details: 'Make sure uae-asin.xlsx exists in the root directory'
    });
  }
});

// Get UAE Excel file info
router.get('/uae-info', async (req, res) => {
  try {
    const excelPath = path.join(__dirname, '../../uae-asin.xlsx');
    const workbook = xlsx.readFile(excelPath);
    
    const info = {
      sheets: workbook.SheetNames,
      sheetCount: workbook.SheetNames.length
    };
    
    // Get column headers from first sheet
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
    info.columns = data[0] || [];
    info.rowCount = data.length - 1; // Exclude header
    
    res.json(info);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reading UAE Excel file info',
      error: error.message
    });
  }
});

export default router;