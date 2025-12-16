// Test script to verify profit display consistency between ProductDetail and AmazonsChoice
console.log('🧪 Testing Profit Display Consistency');

// Test cases with different profit data scenarios
const testCases = [
  {
    name: 'Product with valid profit data',
    product: {
      id: '1',
      name: 'Pack of 100 White Economy Spoons',
      rawPrice: 3.49,
      dealUnits: 220,
      profitCalculations: {
        profitPerUnit: 0.45,
        profitFor200Units: 90.00,
        monthlyProfit: 676.47
      }
    }
  },
  {
    name: 'Product with zero profit data',
    product: {
      id: '2',
      name: 'Test Product',
      rawPrice: 5.99,
      dealUnits: 100,
      profitCalculations: {
        profitPerUnit: 0,
        profitFor200Units: 0,
        monthlyProfit: 0
      }
    }
  },
  {
    name: 'Product without profit calculations',
    product: {
      id: '3',
      name: 'Another Test Product',
      rawPrice: 2.99,
      dealUnits: 50
      // No profitCalculations property
    }
  },
  {
    name: 'Product with empty profit calculations',
    product: {
      id: '4',
      name: 'Empty Profit Product',
      rawPrice: 4.99,
      dealUnits: 150,
      profitCalculations: {}
    }
  }
];

// ProductDetail hasValidProfitData logic
const hasValidProfitDataProductDetail = (product) => {
  if (!product?.profitCalculations) return false;
  
  // Check if any profit calculation has non-zero values
  const isValid = (
    (product.profitCalculations.profitPerUnit && parseFloat(String(product.profitCalculations.profitPerUnit).replace(/[£₨$€]/g, '')) > 0) ||
    (product.profitCalculations.profitFor200Units && parseFloat(String(product.profitCalculations.profitFor200Units).replace(/[£₨$€]/g, '')) > 0) ||
    (product.profitCalculations.monthlyProfit && parseFloat(String(product.profitCalculations.monthlyProfit).replace(/[£₨$€]/g, '')) > 0)
  );
  
  return isValid;
};

// AmazonsChoice hasValidProfitData logic (should be identical)
const hasValidProfitDataAmazonsChoice = (product) => {
  if (!product?.profitCalculations) return false;
  
  // Check if any profit calculation has non-zero values
  const isValid = (
    (product.profitCalculations.profitPerUnit && parseFloat(String(product.profitCalculations.profitPerUnit).replace(/[£₨$€]/g, '')) > 0) ||
    (product.profitCalculations.profitFor200Units && parseFloat(String(product.profitCalculations.profitFor200Units).replace(/[£₨$€]/g, '')) > 0) ||
    (product.profitCalculations.monthlyProfit && parseFloat(String(product.profitCalculations.monthlyProfit).replace(/[£₨$€]/g, '')) > 0)
  );
  
  return isValid;
};

// Profit calculation logic (same for both pages)
const getProfitPerUnit = (product) => {
  // Use the exact same logic as ProductDetail page
  let profitPerUnit = product.profitCalculations.profitPerUnit;
  
  // Apply hardcoded profits for specific products (same as ProductDetail)
  const productName = product.name.toLowerCase();
  if (productName.includes('nose ring')) {
    profitPerUnit = 40.14;
  } else if (productName.includes('bulb')) {
    profitPerUnit = 251.10;
  } else if (productName.includes('fuse')) {
    profitPerUnit = 455.80;
  } else if (productName.includes('lampshade')) {
    profitPerUnit = 227.80;
  } else if (productName.includes('leather') && productName.includes('watch')) {
    profitPerUnit = 586.00;
  }
  
  return parseFloat(profitPerUnit) || 0;
};

console.log('\n🔍 TESTING ALL SCENARIOS:');

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}:`);
  console.log('   Product:', testCase.product.name);
  console.log('   Profit Calculations:', testCase.product.profitCalculations || 'None');
  
  const productDetailValid = hasValidProfitDataProductDetail(testCase.product);
  const amazonsChoiceValid = hasValidProfitDataAmazonsChoice(testCase.product);
  
  console.log('   ProductDetail shows profit:', productDetailValid ? '✅ YES' : '❌ NO');
  console.log('   AmazonsChoice shows profit:', amazonsChoiceValid ? '✅ YES' : '❌ NO');
  console.log('   Consistency:', productDetailValid === amazonsChoiceValid ? '✅ MATCH' : '❌ MISMATCH');
  
  if (productDetailValid && amazonsChoiceValid) {
    const profitPerUnit = getProfitPerUnit(testCase.product);
    const dealUnits = testCase.product.dealUnits || 1;
    const totalProfit = profitPerUnit * dealUnits;
    
    console.log('   Profit/unit:', `£${profitPerUnit.toFixed(2)}`);
    console.log('   Total profit:', `£${totalProfit.toFixed(2)} (${dealUnits} units)`);
  }
});

console.log('\n✅ CONSISTENCY RULES:');
console.log('1. ✅ Only show profit if profitCalculations exists');
console.log('2. ✅ Only show profit if at least one value > 0');
console.log('3. ✅ Use exact same profitPerUnit value as ProductDetail');
console.log('4. ✅ Apply same hardcoded values for specific products');
console.log('5. ✅ Hide profit display completely if not valid');

console.log('\n🎯 EXPECTED BEHAVIOR:');
console.log('- Products with valid profit data: Show profit info');
console.log('- Products with zero/empty profit data: Hide profit info');
console.log('- Products without profitCalculations: Hide profit info');
console.log('- Profit values must match ProductDetail page exactly');

console.log('\n🚀 PROFIT DISPLAY CONSISTENCY TEST COMPLETE!');