// Sitemap validation script
// Run with: node validate-sitemap.js

const https = require('https');
const http = require('http');
const { URL } = require('url');

const SITEMAP_URL = 'https://poundlandwholesale.com/sitemap.xml';

console.log('🔍 Validating Sitemap...\n');

// Function to make HTTP requests
const makeRequest = (url) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, { method: 'HEAD' }, (res) => {
      resolve({
        url,
        status: res.statusCode,
        headers: res.headers,
        ok: res.statusCode >= 200 && res.statusCode < 300
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        status: 0,
        error: error.message,
        ok: false
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        error: 'Timeout',
        ok: false
      });
    });
    
    req.end();
  });
};

// Function to fetch and parse sitemap
const fetchSitemap = (url) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            content: data
          });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.end();
  });
};

// Main validation function
async function validateSitemap() {
  try {
    console.log('📋 Step 1: Checking sitemap accessibility...');
    
    // Check if sitemap is accessible
    const sitemapResponse = await makeRequest(SITEMAP_URL);
    
    if (!sitemapResponse.ok) {
      console.log('❌ Sitemap is not accessible!');
      console.log(`   Status: ${sitemapResponse.status}`);
      console.log(`   Error: ${sitemapResponse.error || 'HTTP Error'}`);
      return;
    }
    
    console.log('✅ Sitemap is accessible');
    console.log(`   Status: ${sitemapResponse.status}`);
    console.log(`   Content-Type: ${sitemapResponse.headers['content-type'] || 'Not set'}`);
    
    // Check content type
    const contentType = sitemapResponse.headers['content-type'] || '';
    if (!contentType.includes('xml')) {
      console.log('⚠️  Warning: Content-Type should be application/xml');
    }
    
    console.log('\n📋 Step 2: Fetching and parsing sitemap content...');
    
    // Fetch sitemap content
    const sitemap = await fetchSitemap(SITEMAP_URL);
    
    // Extract URLs from sitemap
    const urlMatches = sitemap.content.match(/<loc>(.*?)<\/loc>/g);
    
    if (!urlMatches) {
      console.log('❌ No URLs found in sitemap!');
      return;
    }
    
    const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, ''));
    
    console.log(`✅ Found ${urls.length} URLs in sitemap`);
    
    console.log('\n📋 Step 3: Validating XML syntax...');
    
    // Basic XML validation
    const xmlErrors = [];
    
    if (!sitemap.content.includes('<?xml version="1.0"')) {
      xmlErrors.push('Missing XML declaration');
    }
    
    if (!sitemap.content.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
      xmlErrors.push('Missing or incorrect urlset declaration');
    }
    
    if (!sitemap.content.includes('</urlset>')) {
      xmlErrors.push('Missing closing urlset tag');
    }
    
    if (xmlErrors.length > 0) {
      console.log('❌ XML syntax errors found:');
      xmlErrors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('✅ XML syntax appears valid');
    }
    
    console.log('\n📋 Step 4: Testing URL accessibility...');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // Test first 10 URLs (to avoid overwhelming the server)
    const urlsToTest = urls.slice(0, 10);
    
    for (const url of urlsToTest) {
      try {
        const result = await makeRequest(url);
        
        if (result.ok) {
          successCount++;
          console.log(`✅ ${url} - ${result.status}`);
        } else {
          errorCount++;
          errors.push({ url, status: result.status, error: result.error });
          console.log(`❌ ${url} - ${result.status} ${result.error || ''}`);
        }
      } catch (error) {
        errorCount++;
        errors.push({ url, error: error.message });
        console.log(`❌ ${url} - ${error.message}`);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 Validation Summary:');
    console.log(`   Total URLs in sitemap: ${urls.length}`);
    console.log(`   URLs tested: ${urlsToTest.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n❌ URLs with errors:');
      errors.forEach(error => {
        console.log(`   - ${error.url}: ${error.status || error.error}`);
      });
    }
    
    console.log('\n🎯 Recommendations:');
    
    if (errorCount === 0) {
      console.log('✅ All tested URLs are accessible');
      console.log('✅ Sitemap appears to be valid');
      console.log('💡 You can now submit this sitemap to Google Search Console');
    } else {
      console.log('⚠️  Some URLs have issues - fix these before submitting to Google');
      console.log('💡 Remove or fix URLs that return 404 or other errors');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Fix any URL errors found above');
    console.log('2. Test sitemap again: node validate-sitemap.js');
    console.log('3. Submit to Google Search Console');
    console.log('4. Monitor Google Search Console for processing status');
    
  } catch (error) {
    console.log('❌ Validation failed:', error.message);
  }
}

// Run validation
validateSitemap();