import xlsx from 'xlsx';

// Read the Excel file
const workbook = xlsx.readFile('./Amazon Gymkhana-Website-3/Products.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawData = xlsx.utils.sheet_to_json(worksheet);

console.log('📊 Total rows:', rawData.length);
console.log('📊 Column names:', Object.keys(rawData[0]));
console.log('\n📊 First 3 rows:');
rawData.slice(0, 3).forEach((row, i) => {
  console.log(`\nRow ${i + 1}:`);
  Object.entries(row).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
});

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

// Test finding columns
console.log('\n📊 Testing column matching:');
const testRow = rawData[0];
const title = findColumn(testRow, [
  'title', 'name', 'product name', 'product title', 'productname', 'producttitle'
]);
const asin = findColumn(testRow, [
  'asin', 'product asin', 'productasin', 'asin code', 'asincode'
]);
const category = findColumn(testRow, [
  'category', 'product category', 'productcategory', 'cat'
]);
const price = findColumn(testRow, [
  'price', 'product price', 'productprice', 'cost', 'amount', 'unit price', 'unitprice'
]);

console.log('Title found:', title);
console.log('ASIN found:', asin);
console.log('Category found:', category);
console.log('Price found:', price);
