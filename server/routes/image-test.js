import express from 'express';
import Product from '../models/Product.js';
import ExcelProduct from '../models/ExcelProduct.js';
import { authenticateAdmin } from '../middleware/auth.js';
import { optimizeProductImages, mobileImageOptimization, addResponsiveImages } from '../middleware/imageOptimization.js';

const router = express.Router();

/**
 * GET /api/image-test/sample-products
 * Get sample products to test image handling
 */
router.get('/sample-products', mobileImageOptimization, optimizeProductImages, addResponsiveImages, async (req, res) => {
  try {
    // Get a few products to test image handling
    const products = await Product.find({ status: 'active' })
      .limit(5)
      .select('name asin price images image category')
      .lean();

    const excelProducts = await ExcelProduct.find({ status: 'pending' })
      .limit(3)
      .select('name asin price images image category')
      .lean();

    res.json({
      success: true,
      message: 'Sample products for image testing',
      data: {
        regularProducts: products,
        excelProducts: excelProducts,
        totalProducts: products.length,
        totalExcelProducts: excelProducts.length
      }
    });
  } catch (error) {
    console.error('Error fetching sample products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sample products',
      error: error.message
    });
  }
});

/**
 * GET /api/image-test/cloudinary-status
 * Check Cloudinary integration status
 */
router.get('/cloudinary-status', async (req, res) => {
  try {
    // Count products with different image types
    const stats = {
      totalProducts: await Product.countDocuments(),
      productsWithImages: await Product.countDocuments({ 
        $or: [
          { images: { $exists: true, $ne: [] } },
          { image: { $exists: true, $ne: null, $ne: '' } }
        ]
      }),
      cloudinaryImages: await Product.countDocuments({
        $or: [
          { images: { $regex: /cloudinary\.com/ } },
          { image: { $regex: /cloudinary\.com/ } }
        ]
      }),
      localImages: await Product.countDocuments({
        $or: [
          { images: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } },
          { image: { $regex: /localhost|generic-wholesale-backend\.onrender\.com/ } }
        ]
      }),
      excelProducts: await ExcelProduct.countDocuments(),
      excelWithImages: await ExcelProduct.countDocuments({
        $or: [
          { images: { $exists: true, $ne: [] } },
          { image: { $exists: true, $ne: null, $ne: '' } }
        ]
      }),
      excelCloudinaryImages: await ExcelProduct.countDocuments({
        $or: [
          { images: { $regex: /cloudinary\.com/ } },
          { image: { $regex: /cloudinary\.com/ } }
        ]
      })
    };

    res.json({
      success: true,
      message: 'Cloudinary integration status',
      stats: stats,
      recommendations: {
        needsMigration: stats.localImages > 0,
        migrationReady: stats.cloudinaryImages > 0,
        bulkUploadReady: true
      }
    });
  } catch (error) {
    console.error('Error checking Cloudinary status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Cloudinary status',
      error: error.message
    });
  }
});

/**
 * POST /api/image-test/migrate-sample
 * Migrate a few sample products to test the migration
 */
router.post('/migrate-sample', authenticateAdmin, async (req, res) => {
  try {
    const { productIds } = req.body;
    
    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of product IDs to migrate'
      });
    }

    const results = {
      processed: 0,
      migrated: 0,
      errors: [],
      products: []
    };

    for (const productId of productIds.slice(0, 5)) { // Limit to 5 for testing
      try {
        const product = await Product.findById(productId);
        if (!product) {
          results.errors.push(`Product ${productId} not found`);
          continue;
        }

        results.processed++;
        
        // For testing, just update the image URLs to use placeholder Cloudinary URLs
        let updated = false;
        
        if (product.asin) {
          const cloudinaryUrl = `https://res.cloudinary.com/dtuq3tvjx/image/upload/v1/products/${product.asin}.jpg`;
          
          if (!product.images || product.images.length === 0 || !product.images[0].includes('cloudinary.com')) {
            product.images = [cloudinaryUrl];
            updated = true;
          }
          
          if (!product.image || !product.image.includes('cloudinary.com')) {
            product.image = cloudinaryUrl;
            updated = true;
          }
        }

        if (updated) {
          await product.save();
          results.migrated++;
          results.products.push({
            id: product._id,
            name: product.name,
            asin: product.asin,
            images: product.images,
            image: product.image
          });
        }

      } catch (error) {
        results.errors.push(`Error processing ${productId}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Sample migration completed',
      results: results
    });

  } catch (error) {
    console.error('Error in sample migration:', error);
    res.status(500).json({
      success: false,
      message: 'Sample migration failed',
      error: error.message
    });
  }
});

export default router;