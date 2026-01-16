import xlsx from 'xlsx';

// Helper function to normalize column names
function normalizeColumnName(name) {
  if (!name) return '';
  return name.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Helper function to find column by multiple possible names
function findColumn(row, possibleNames) {
  const normalizedRow = {};
  Object.keys(row).forEach(key => {
    normalizedRow[normalizeColumnName(key)] = row[key];
  });
  
  for (const name of possibleNames) {
    const normalizedName = normalizeColumnName(name);
    if (normalizedRow[normalizedName] !== undefined) {
      return normalizedRow[normalizedName];
    }
  }
  return null;
}

// Helper function to parse price
function parsePrice(value) {
  if (!value || value === '' || value === null || value === undefined) return 0;
  const cleaned = value.toString().replace(/[£$€,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

// Read the Excel file from your screenshot
const workbook = xlsx.readFile('./Amazon Gymkhana-Website-3/Products.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawData = xlsx.utils.sheet_to_json(worksheet);

console.log('📊 Total rows:', rawData.length);
console.log('📊 Column names:', Object.keys(rawData[0]));

// Test with first row
const testRow = rawData[0];
console.log('\n📊 Testing column matching with first row:');

const title = findColumn(testRow, [
  'product', 'title', 'name', 'product name', 'product title', 'productname', 'producttitle'
]);
const asin = findColumn(testRow, [
  'asin', 'product asin', 'productasin', 'asin code', 'asincode'
]);
const sku = findColumn(testRow, [
  'sku', 'product sku', 'productsku', 'sku code', 'skucode', 'item code', 'itemcode'
]);
const category = findColumn(testRow, [
  'category', 'product category', 'productcategory', 'cat',
  'main category name', 'maincategoryname', 'primary subcategory name', 'primarysubcategoryname'
]);
const price = parsePrice(findColumn(testRow, [
  'price', 'product price', 'productprice', 'cost', 'amount', 'unit price', 'unitprice',
  'buy box price', 'buyboxprice', 'selling price', 'sellingprice'
]));
const reviews = findColumn(testRow, [
  'reviews', 'review count', 'reviewcount', 'number of reviews', 'numberofreviews',
  'ratings count', 'ratingscount', 'est monthly units sold', 'estmonthlyunitssold'
]);
const rating = findColumn(testRow, [
  'rating', 'product rating', 'productrating', 'star rating', 'starrating', 'stars'
]);

console.log('Title:', title);
console.log('ASIN:', asin);
console.log('SKU:', sku);
console.log('Category:', category);
console.log('Price:', price);
console.log('Reviews:', reviews);
console.log('Rating:', rating);

// Check validation
console.log('\n📊 Validation checks:');
console.log('Has title?', title && title.toString().trim().length > 0);
console.log('Has valid price?', price !== null && price !== undefined && !isNaN(price) && price >= 0);
console.log('Price value:', price);

// Count how many rows would pass validation
let validCount = 0;
let errorCount = 0;
const errors = [];

for (let i = 0; i < rawData.length; i++) {
  const row = rawData[i];
  
  const title = findColumn(row, [
    'product', 'title', 'name', 'product name', 'product title', 'productname', 'producttitle'
  ]);
  
  const price = parsePrice(findColumn(row, [
    'price', 'product price', 'productprice', 'cost', 'amount', 'unit price', 'unitprice',
    'buy box price', 'buyboxprice', 'selling price', 'sellingprice'
  ]));
  
  if (!title || title.toString().trim().length === 0) {
    errors.push(`Row ${i + 2}: Missing product title`);
    errorCount++;
    continue;
  }
  
  if (price === null || price === undefined || isNaN(price) || price < 0) {
    errors.push(`Row ${i + 2}: Invalid or missing price for "${title}"`);
    errorCount++;
    continue;
  }
  
  validCount++;
}

console.log('\n📊 Validation results:');
console.log('Valid products:', validCount);
console.log('Errors:', errorCount);
if (errors.length > 0) {
  console.log('\nFirst 10 errors:');
  errors.slice(0, 10).forEach(err => console.log('  -', err));
}
