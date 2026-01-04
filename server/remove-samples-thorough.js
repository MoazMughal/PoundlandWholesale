import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from './models/Product.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/generic-wholesale')
  .then(async () => {
    console.log('🔍 Searching for sample products thoroughly...');
    
    // Find all products that might be samples
    const sampleProducts = await Product.find({
      $or: [
        { name: { $regex: /sample|test|fallback|emergency|placeholder|wireless gaming headset|mechanical keyboard|portable ssd|magnetic car phone|wireless charging pad|usb-c hub|smart security camera|bluetooth speaker|led strip lights|power bank|gaming mouse|smartphone gimbal|tablet stand|wireless earbuds|premium cotton hoodie|leather wallet rfid|running shoes|denim jacket|silk scarf|baseball cap|yoga leggings|formal dress shirt|winter gloves|sunglasses polarized|casual sneakers|crossbody bag|ceramic plant pot|essential oil diffuser|memory foam pillow|modern wall clock|bamboo cutting board|vacuum storage bags|coffee mug set|throw blanket|picture frame set|candle set|kitchen scale|shower curtain|programming guide|notebook set|educational world map|art supplies set|language learning|scientific calculator|resistance bands|yoga mat|water bottle insulated|fitness tracker|dumbbells adjustable/i } },
        { brand: { $regex: /sample|test|system|techpro|stylemax|homecomfort|bookworld|sportsfit|qualityplus|premiumchoice/i } },
        { description: { $regex: /sample|test|placeholder|high-quality.*with excellent features|great value for money/i } }
      ]
    }).select('name brand category description _id');
    
    console.log(`Found ${sampleProducts.length} potential sample products:`);
    sampleProducts.forEach(p => {
      console.log(`- ${p.name} (${p.category}) [${p._id}]`);
    });
    
    if (sampleProducts.length > 0) {
      const result = await Product.deleteMany({
        _id: { $in: sampleProducts.map(p => p._id) }
      });
      
      console.log(`✅ Removed ${result.deletedCount} sample products`);
    } else {
      console.log('✅ No sample products found');
    }
    
    // Check remaining products by category
    const categories = await Product.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 }, products: { $push: { name: '$name', id: '$_id' } } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📂 Categories after cleanup:');
    categories.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count} products`);
      if (cat.count <= 3) {
        cat.products.forEach(p => console.log(`     - ${p.name}`));
      }
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });