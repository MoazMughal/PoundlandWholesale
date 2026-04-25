import express from 'express';
import { algoliasearch } from 'algoliasearch';
import Product from '../models/Product.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_WRITE_API_KEY
);
const indexName = process.env.ALGOLIA_INDEX_NAME || 'products';


// POST /api/algolia/sync — full sync of all active Amazon's Choice products (admin only)
router.post('/sync', authenticateAdmin, async (req, res) => {
  try {
    // Use aggregation to project only the exact fields we need at DB level
    // This avoids fetching massive sellers arrays or image arrays
    const products = await Product.aggregate([
      {
        $match: {
          status: 'active',
          approvalStatus: 'approved',
          isAmazonsChoice: true,
        },
      },
      {
        $project: {
          name: 1,
          // Truncate description at DB level
          description: { $substr: [{ $ifNull: ['$description', ''] }, 0, 300] },
          category: 1,
          brand: 1,
          price: 1,
          rating: 1,
          reviews: 1,
          isAmazonsChoice: 1,
          isBestSeller: 1,
          // Only the first image
          firstImage: { $arrayElemAt: ['$images', 0] },
          asin: 1,
          sellersCount: { $size: { $ifNull: ['$sellers', []] } },
        },
      },
    ]);

    if (products.length === 0) {
      return res.json({ success: true, synced: 0, message: 'No products to sync' });
    }

    const records = products.map((p) => ({
      objectID: p._id.toString(),
      name: (p.name || '').slice(0, 200),
      description: p.description || '',
      category: p.category || '',
      brand: p.brand || '',
      price: p.price || 0,
      rating: p.rating || 0,
      reviews: p.reviews || 0,
      isAmazonsChoice: p.isAmazonsChoice || false,
      isBestSeller: p.isBestSeller || false,
      image: p.firstImage || '',
      asin: p.asin || '',
      sellersCount: p.sellersCount || 0,
    }));

    // Safety check — skip any record still over 9KB
    const safeRecords = records.filter((r) => {
      const size = Buffer.byteLength(JSON.stringify(r), 'utf8');
      if (size > 9000) {
        console.warn(`⚠️ Skipping oversized record: ${r.objectID} (${size} bytes)`);
        return false;
      }
      return true;
    });

    await client.replaceAllObjects({ indexName, objects: safeRecords });

    await client.setSettings({
      indexName,
      indexSettings: {
        searchableAttributes: ['name', 'brand', 'category', 'description'],
        attributesForFaceting: ['category', 'brand', 'isAmazonsChoice', 'isBestSeller'],
        customRanking: ['desc(rating)', 'desc(reviews)'],
        typoTolerance: true,
      },
    });

    res.json({ success: true, synced: safeRecords.length, skipped: records.length - safeRecords.length });
  } catch (error) {
    console.error('Algolia sync error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/algolia/clear — clear the index (admin only)
router.delete('/clear', authenticateAdmin, async (req, res) => {
  try {
    await client.clearObjects({ indexName });
    res.json({ success: true, message: 'Index cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/algolia/debug/:id — inspect a product's projected record size (admin only)
router.get('/debug/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select('name description category brand price rating reviews isAmazonsChoice isBestSeller images asin sellers')
      .lean();

    if (!product) return res.status(404).json({ message: 'Not found' });

    const fieldSizes = {
      name: Buffer.byteLength(JSON.stringify(product.name || ''), 'utf8'),
      description: Buffer.byteLength(JSON.stringify(product.description || ''), 'utf8'),
      images: Buffer.byteLength(JSON.stringify(product.images || []), 'utf8'),
      sellers: Buffer.byteLength(JSON.stringify(product.sellers || []), 'utf8'),
      total: Buffer.byteLength(JSON.stringify(product), 'utf8'),
    };

    res.json({
      id: product._id,
      name: product.name?.slice(0, 100),
      fieldSizes,
      imagesCount: product.images?.length,
      sellersCount: product.sellers?.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
