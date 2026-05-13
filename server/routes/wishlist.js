import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import WishlistQuery from '../models/WishlistQuery.js';
import Seller from '../models/Seller.js';
import { authenticateBuyer, authenticateSeller, authenticateAdmin } from '../middleware/auth.js';
import { uploadToCloudinary, isCloudinaryConfigured } from '../services/cloudinary.js';

const router = express.Router();

// Multer config for wishlist images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/temp';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `wishlist_${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'));
  }
});

// POST upload image to Cloudinary
router.post('/upload-image', authenticateBuyer, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file provided' });

    let imageUrl = '';
    if (isCloudinaryConfigured()) {
      const publicId = `wishlist_${req.buyer._id}_${Date.now()}`;
      const result = await uploadToCloudinary(req.file.path, publicId, 'wishlist');
      imageUrl = result.secure_url;
    } else {
      // Fallback: keep local path (dev only)
      imageUrl = `/uploads/temp/${req.file.filename}`;
    }

    // Clean up temp file
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    res.json({ success: true, imageUrl });
  } catch (err) {
    console.error('Wishlist image upload error:', err);
    res.status(500).json({ message: 'Image upload failed', error: err.message });
  }
});

// ── BUYER ROUTES ──────────────────────────────────────────────

// GET buyer's own wishlist queries
router.get('/buyer', authenticateBuyer, async (req, res) => {
  try {
    const queries = await WishlistQuery.find({ buyerId: req.buyer._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, queries });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create a new wishlist query (guest — no auth required)
router.post('/guest', async (req, res) => {
  try {
    const { productName, productDescription, quantity, targetPrice, currency, category, imageUrl, notes, productId, guestName, guestPhone, guestEmail } = req.body;
    if (!productName) return res.status(400).json({ message: 'Product name is required' });
    if (!guestName?.trim()) return res.status(400).json({ message: 'Your name is required' });
    if (!guestPhone?.trim()) return res.status(400).json({ message: 'Your phone/WhatsApp is required' });

    const query = await WishlistQuery.create({
      senderType: 'guest',
      buyerId: null,
      buyerName: guestName.trim(),
      buyerEmail: guestEmail?.trim() || '',
      buyerWhatsapp: guestPhone.trim(),
      productName, productDescription, quantity: quantity || 1,
      targetPrice, currency: currency || 'GBP',
      category, imageUrl, notes,
      ...(productId && { productId })
    });

    res.json({ success: true, query });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create a new wishlist query
router.post('/buyer', authenticateBuyer, async (req, res) => {
  try {
    const { productName, productDescription, quantity, targetPrice, currency, category, imageUrl, taggedSellerIds, notes, productId } = req.body;
    if (!productName) return res.status(400).json({ message: 'Product name is required' });

    // Resolve tagged sellers
    let taggedSellers = [];
    if (taggedSellerIds && taggedSellerIds.length > 0) {
      const sellers = await Seller.find({ _id: { $in: taggedSellerIds } }).select('username whatsappNo');
      taggedSellers = sellers.map(s => ({ sellerId: s._id, username: s.username, whatsappNo: s.whatsappNo, notifiedAt: new Date() }));
    }

    const query = await WishlistQuery.create({
      senderType: 'buyer',
      buyerId: req.buyer._id,
      buyerName: `${req.buyer.firstName} ${req.buyer.lastName}`.trim(),
      buyerEmail: req.buyer.email,
      buyerWhatsapp: req.buyer.whatsappNo || req.buyer.phone || '',
      productName, productDescription, quantity: quantity || 1,
      targetPrice, currency: currency || 'GBP',
      category, imageUrl, taggedSellers, notes,
      ...(productId && { productId })
    });

    res.json({ success: true, query });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT update buyer's own query
router.put('/buyer/:id', authenticateBuyer, async (req, res) => {
  try {
    const query = await WishlistQuery.findOne({ _id: req.params.id, buyerId: req.buyer._id });
    if (!query) return res.status(404).json({ message: 'Query not found' });

    const { productName, productDescription, quantity, targetPrice, currency, category, imageUrl, notes, status } = req.body;
    if (productName) query.productName = productName;
    if (productDescription !== undefined) query.productDescription = productDescription;
    if (quantity) query.quantity = quantity;
    if (targetPrice !== undefined) query.targetPrice = targetPrice;
    if (currency) query.currency = currency;
    if (category !== undefined) query.category = category;
    if (imageUrl !== undefined) query.imageUrl = imageUrl;
    if (notes !== undefined) query.notes = notes;
    if (status) query.status = status;

    await query.save();
    res.json({ success: true, query });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE buyer's own query
router.delete('/buyer/:id', authenticateBuyer, async (req, res) => {
  try {
    await WishlistQuery.findOneAndDelete({ _id: req.params.id, buyerId: req.buyer._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET all sellers list (for buyer to tag)
router.get('/sellers', authenticateBuyer, async (req, res) => {
  try {
    const sellers = await Seller.find({ verificationStatus: 'approved', status: 'active' })
      .select('username whatsappNo city country productCategory')
      .sort({ username: 1 });
    res.json({ success: true, sellers });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── SELLER ROUTES ─────────────────────────────────────────────

// GET queries tagged to this seller OR open queries
router.get('/seller', authenticateSeller, async (req, res) => {
  try {
    const queries = await WishlistQuery.find({
      $or: [
        { 'taggedSellers.sellerId': req.seller._id },
        { taggedSellers: { $size: 0 }, status: 'open' }  // open queries with no specific tags = visible to all
      ]
    }).sort({ createdAt: -1 });
    res.json({ success: true, queries });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST seller responds to a query
router.post('/seller/respond/:queryId', authenticateSeller, async (req, res) => {
  try {
    const query = await WishlistQuery.findById(req.params.queryId);
    if (!query) return res.status(404).json({ message: 'Query not found' });

    const { message, offerPrice, status } = req.body;

    // Remove existing response from this seller if any
    query.responses = query.responses.filter(r => r.sellerId.toString() !== req.seller._id.toString());

    query.responses.push({
      sellerId: req.seller._id,
      sellerUsername: req.seller.username,
      sellerWhatsapp: req.seller.whatsappNo,
      message, offerPrice,
      status: status || 'interested',
      respondedAt: new Date()
    });

    if (query.status === 'open') query.status = 'in_progress';
    await query.save();
    res.json({ success: true, query });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ── NOTIFICATION COUNT ROUTES ─────────────────────────────────

// GET unread count for buyer (queries that have new seller responses since last viewed)
router.get('/buyer/unread-count', authenticateBuyer, async (req, res) => {
  try {
    const lastSeen = req.buyer.wishlistLastSeen || new Date(0);
    // Count queries where a seller responded after buyer last viewed
    const count = await WishlistQuery.countDocuments({
      buyerId: req.buyer._id,
      'responses.respondedAt': { $gt: lastSeen }
    });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

// POST mark buyer wishlist as seen (reset count)
router.post('/buyer/mark-seen', authenticateBuyer, async (req, res) => {
  try {
    const Buyer = (await import('../models/Buyer.js')).default;
    await Buyer.findByIdAndUpdate(req.buyer._id, { wishlistLastSeen: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// GET unread count for seller (new queries since last viewed)
router.get('/seller/unread-count', authenticateSeller, async (req, res) => {
  try {
    const lastSeen = req.seller.queriesLastSeen || new Date(0);
    const count = await WishlistQuery.countDocuments({
      $or: [
        { 'taggedSellers.sellerId': req.seller._id },
        { taggedSellers: { $size: 0 }, status: 'open' }
      ],
      createdAt: { $gt: lastSeen }
    });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

// POST mark seller queries as seen (reset count)
router.post('/seller/mark-seen', authenticateSeller, async (req, res) => {
  try {
    await Seller.findByIdAndUpdate(req.seller._id, { queriesLastSeen: new Date() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// ── ADMIN ROUTES ──────────────────────────────────────────────

// GET public wishlist queries (no auth — visible to everyone, hides private buyer info)
router.get('/public', async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const filter = { status: status && status !== 'all' ? status : { $in: ['open', 'in_progress'] } };
    const total = await WishlistQuery.countDocuments(filter);
    const queries = await WishlistQuery.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('productName productDescription quantity targetPrice currency category imageUrl status responses taggedSellers createdAt notes buyerName senderType');
    // Strip private buyer info — only expose first name initial + last name
    const safe = queries.map(q => ({
      _id: q._id,
      productName: q.productName,
      productDescription: q.productDescription,
      quantity: q.quantity,
      targetPrice: q.targetPrice,
      currency: q.currency,
      category: q.category,
      imageUrl: q.imageUrl,
      status: q.status,
      notes: q.notes,
      createdAt: q.createdAt,
      responsesCount: q.responses?.length || 0,
      buyerName: q.buyerName || '',
      senderType: q.senderType || 'buyer',
    }));
    res.json({ success: true, queries: safe, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET all queries with full details (admin only)
router.get('/admin', authenticateAdmin, async (req, res) => {
  try {
    const { status, senderType, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (senderType === 'guest') filter.senderType = 'guest';
    if (senderType === 'buyer') filter.$or = [{ senderType: 'buyer' }, { senderType: { $exists: false } }, { senderType: null }];
    const total = await WishlistQuery.countDocuments(filter);
    const queries = await WishlistQuery.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ success: true, queries, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

export default router;
