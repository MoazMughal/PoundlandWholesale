// Test URL parameter decoding

// Simulate what happens in the browser
const testUrl = 'http://localhost:3000/?cat=diy-%26-tools';
const url = new URL(testUrl);
const searchParams = new URLSearchParams(url.search);

console.log('🔍 URL Parameter Test:');
console.log('- Original URL:', testUrl);
console.log('- url.search:', url.search);
console.log('- searchParams.toString():', searchParams.toString());
console.log('- searchParams.get("cat"):', searchParams.get('cat'));

// Test what the category value should be
const expectedCategoryValue = 'diy-&-tools';
console.log('\n🔍 Expected vs Actual:');
console.log('- Expected category value:', expectedCategoryValue);
console.log('- Actual from URL:', searchParams.get('cat'));
console.log('- Match:', searchParams.get('cat') === expectedCategoryValue);

// Test URL encoding/decoding
console.log('\n🔍 URL Encoding Test:');
console.log('- Original:', 'diy-&-tools');
console.log('- URL encoded:', encodeURIComponent('diy-&-tools'));
console.log('- URL decoded:', decodeURIComponent('diy-%26-tools'));

// Test what happens when we create the URL
const testCategoryValue = 'diy-&-tools';
const generatedUrl = `/?cat=${testCategoryValue}`;
console.log('\n🔍 URL Generation Test:');
console.log('- Category value:', testCategoryValue);
console.log('- Generated URL:', generatedUrl);
console.log('- What browser sees:', `/?cat=${encodeURIComponent(testCategoryValue)}`);

// Test URLSearchParams behavior
const params1 = new URLSearchParams();
params1.set('cat', 'diy-&-tools');
console.log('\n🔍 URLSearchParams Test:');
console.log('- Set with diy-&-tools:', params1.toString());
console.log('- Get back:', params1.get('cat'));

const params2 = new URLSearchParams('?cat=diy-%26-tools');
console.log('- Parse diy-%26-tools:', params2.toString());
console.log('- Get back:', params2.get('cat'));