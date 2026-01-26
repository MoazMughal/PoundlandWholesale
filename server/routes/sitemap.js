const express = require('express');
const router = express.Router();

// Dynamic sitemap generation route
router.get('/sitemap.xml', async (req, res) => {
  try {
    // Import your Product model (adjust path as needed)
    // const Product = require('../models/Product');
    
    // For now, we'll use static data, but you can uncomment above and fetch real products
    // const products = await Product.find({ status: 'approved' }).select('_id updatedAt').limit(1000);
    
    const currentDate = new Date().toISOString().split('T')[0];
    
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Static pages with proper priorities and change frequencies
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/about-us', priority: '0.8', changefreq: 'monthly' },
      { url: '/categories', priority: '0.9', changefreq: 'weekly' },
      { url: '/basket', priority: '0.7', changefreq: 'daily' },
      { url: '/excel-products', priority: '0.8', changefreq: 'weekly' },
      { url: '/auth', priority: '0.7', changefreq: 'monthly' },
      { url: '/login/buyer', priority: '0.6', changefreq: 'monthly' },
      { url: '/login/supplier', priority: '0.6', changefreq: 'monthly' },
      { url: '/register/buyer', priority: '0.7', changefreq: 'monthly' },
      { url: '/register/supplier', priority: '0.7', changefreq: 'monthly' },
      { url: '/join-now', priority: '0.8', changefreq: 'monthly' },
      { url: '/forgot-password', priority: '0.3', changefreq: 'yearly' },
      { url: '/terms-of-service', priority: '0.5', changefreq: 'yearly' },
      { url: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
      { url: '/help-center', priority: '0.6', changefreq: 'monthly' },
      { url: '/faq', priority: '0.6', changefreq: 'monthly' }
    ];

    // Add static pages to sitemap
    staticPages.forEach(page => {
      sitemap += `
  <url>
    <loc>https://poundlandwholesale.com${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    <lastmod>${currentDate}</lastmod>
  </url>`;
    });

    // Add dynamic product pages (when you have products)
    /*
    if (products && products.length > 0) {
      products.forEach(product => {
        const lastmod = product.updatedAt ? 
          product.updatedAt.toISOString().split('T')[0] : 
          currentDate;
        
        sitemap += `
  <url>
    <loc>https://poundlandwholesale.com/product/${product._id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
    <lastmod>${lastmod}</lastmod>
  </url>`;
      });
    }
    */

    sitemap += `
</urlset>`;

    // Set proper headers
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'X-Robots-Tag': 'noindex' // Don't index the sitemap itself
    });

    res.send(sitemap);
    
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('Error generating sitemap');
  }
});

// Robots.txt route (bonus)
router.get('/robots.txt', (req, res) => {
  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /seller/
Disallow: /buyer/
Disallow: /api/

Sitemap: https://poundlandwholesale.com/sitemap.xml`;

  res.set('Content-Type', 'text/plain');
  res.send(robots);
});

module.exports = router;