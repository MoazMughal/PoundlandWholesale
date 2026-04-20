import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import models
import Product from '../models/Product.js';

const SITE_URL = 'https://poundlandwholesale.com';

async function generateSitemap() {
  try {
    console.log('🗺️ Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Fetch all approved products
    console.log('📦 Fetching products...');
    const products = await Product.find({ 
      $or: [
        { status: 'approved' },
        { status: 'active' },
        { approvalStatus: 'approved' }
      ]
    }).select('_id name images updatedAt').lean();
    
    console.log(`✅ Found ${products.length} products`);

    // Start building sitemap
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  
  <!-- Homepage - Amazon's Choice Products -->
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <image:image>
      <image:loc>${SITE_URL}/poundland-wholesale-logo.jpeg</image:loc>
      <image:title>Poundland Wholesale - Online Wholesale Store</image:title>
      <image:caption>Quality products at competitive prices</image:caption>
    </image:image>
  </url>
  
  <!-- Main Public Pages -->
  <url>
    <loc>${SITE_URL}/about-us</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  
  <url>
    <loc>${SITE_URL}/basket</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  
  <url>
    <loc>${SITE_URL}/join-now</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  
  <!-- Legal Pages -->
  <url>
    <loc>${SITE_URL}/terms-of-service</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  
  <url>
    <loc>${SITE_URL}/privacy-policy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  
  <url>
    <loc>${SITE_URL}/help-center</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  
  <url>
    <loc>${SITE_URL}/faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>
  
  <!-- Product Pages with Images -->
`;

    // Add product pages
    for (const product of products) {
      const productUrl = `${SITE_URL}/product/${product._id}`;
      const lastmod = product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      
      // Get all product images
      const images = product.images && product.images.length > 0 ? product.images : [];
      
      sitemap += `  <url>
    <loc>${productUrl}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
    <lastmod>${lastmod}</lastmod>
`;

      // Add image tags (Google supports up to 1000 images per page)
      const validImages = images
        .filter(img => {
          if (!img || !img.trim()) return false;
          // Skip base64 data URIs — Google requires real HTTP/HTTPS URLs
          if (img.startsWith('data:')) return false;
          // Skip relative paths that aren't real URLs
          if (!img.startsWith('http://') && !img.startsWith('https://') && !img.startsWith('/')) return false;
          return true;
        })
        .slice(0, 10); // Limit to 10 images per product
      
      for (const imageUrl of validImages) {
        // Ensure image URL is absolute
        const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${SITE_URL}${imageUrl}`;
        
        // Escape XML special characters
        const escapedImageUrl = absoluteImageUrl
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        
        const escapedTitle = (product.name || 'Product')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        
        sitemap += `    <image:image>
      <image:loc>${escapedImageUrl}</image:loc>
      <image:title>${escapedTitle}</image:title>
      <image:caption>${escapedTitle} - Available at Poundland Wholesale</image:caption>
    </image:image>
`;
      }
      
      sitemap += `  </url>
`;
    }

    sitemap += `</urlset>`;

    // Write sitemap to public folder
    const publicPath = path.join(__dirname, '../../public/sitemap.xml');
    fs.writeFileSync(publicPath, sitemap, 'utf8');
    console.log(`✅ Sitemap generated successfully at ${publicPath}`);
    console.log(`📊 Total URLs: ${products.length + 8} (8 static pages + ${products.length} products)`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error generating sitemap:', error);
    process.exit(1);
  }
}

// Run the generator
generateSitemap();
