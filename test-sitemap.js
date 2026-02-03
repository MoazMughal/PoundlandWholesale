// Test script to verify sitemap content-type
const https = require('https');

const testUrls = [
  'https://poundlandwholesale.com/sitemap.xml',
  'https://www.poundlandwholesale.com/sitemap.xml'
];

testUrls.forEach(url => {
  console.log(`\n🔍 Testing: ${url}`);
  
  https.get(url, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    console.log(`Cache-Control: ${res.headers['cache-control']}`);
    
    if (res.headers['content-type'] === 'application/xml; charset=utf-8') {
      console.log('✅ Correct content-type header');
    } else {
      console.log('❌ Incorrect content-type header');
    }
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (data.startsWith('<?xml')) {
        console.log('✅ XML content detected');
      } else {
        console.log('❌ Non-XML content detected');
        console.log('First 100 chars:', data.substring(0, 100));
      }
    });
  }).on('error', (err) => {
    console.log('❌ Error:', err.message);
  });
});