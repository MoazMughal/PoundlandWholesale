import fs from 'fs';
import path from 'path';

class ProductCache {
  constructor() {
    this.cache = new Map();
    this.cacheFile = path.join(process.cwd(), 'server', 'cache', 'products.json');
    this.lastUpdate = null;
    this.loadFromFile();
  }

  // Load cache from file on startup
  loadFromFile() {
    try {
      // Create cache directory if it doesn't exist
      const cacheDir = path.dirname(this.cacheFile);
      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      if (fs.existsSync(this.cacheFile)) {
        const data = fs.readFileSync(this.cacheFile, 'utf8');
        const parsed = JSON.parse(data);
        this.cache.set('products', parsed.products || []);
        this.lastUpdate = parsed.lastUpdate ? new Date(parsed.lastUpdate) : null;
        console.log(`📦 Loaded ${parsed.products?.length || 0} products from cache`);
      }
    } catch (error) {
      console.error('❌ Error loading cache:', error.message);
    }
  }

  // Save cache to file
  saveToFile() {
    try {
      const data = {
        products: this.cache.get('products') || [],
        lastUpdate: new Date().toISOString()
      };
      fs.writeFileSync(this.cacheFile, JSON.stringify(data, null, 2));
      console.log(`💾 Saved ${data.products.length} products to cache`);
    } catch (error) {
      console.error('❌ Error saving cache:', error.message);
    }
  }

  // Update cache with fresh data
  updateProducts(products) {
    this.cache.set('products', products);
    this.lastUpdate = new Date();
    this.saveToFile();
  }

  // Get products from cache
  getProducts(query = {}) {
    const products = this.cache.get('products') || [];
    
    // Apply basic filtering
    let filtered = products;

    if (query.isAmazonsChoice === 'true') {
      filtered = filtered.filter(p => p.isAmazonsChoice === true);
    }

    if (query.category && query.category !== 'all') {
      filtered = filtered.filter(p => p.category === query.category);
    }

    if (query.search) {
      const searchTerm = query.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm) ||
        p.category?.toLowerCase().includes(searchTerm)
      );
    }

    // Apply pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      products: filtered.slice(startIndex, endIndex),
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / limit),
      currentPage: page
    };
  }

  // Check if cache is fresh (less than 5 minutes old)
  isFresh() {
    if (!this.lastUpdate) return false;
    const fiveMinutes = 5 * 60 * 1000;
    return (Date.now() - this.lastUpdate.getTime()) < fiveMinutes;
  }

  // Get cache age in minutes
  getCacheAge() {
    if (!this.lastUpdate) return 'Unknown';
    const ageMs = Date.now() - this.lastUpdate.getTime();
    const ageMinutes = Math.floor(ageMs / (60 * 1000));
    return `${ageMinutes} minutes`;
  }
}

export default new ProductCache();