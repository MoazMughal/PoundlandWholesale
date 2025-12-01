import express from 'express';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
  
  // Check cache first
  if (imageCache.has(asin)) {
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
          imageCache.set(asin, imageUrl);
          return imageUrl;
        }
      } catch (err) {

        continue;
      }
    }
    
    // If all methods fail, return a constructed URL (may or may not work)
    const fallbackUrl = `https://images-na.ssl-images-amazon.com/images/P/${asin}.jpg`;
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
    console.log('Amazon10 Excel columns:', allKeys);
    console.log('Has marketplace column:', allKeys.includes('marketplace') || allKeys.includes('Marketplace'));
    
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