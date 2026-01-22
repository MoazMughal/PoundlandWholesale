// Test script for ASIN parsing logic
// Run with: node test-asin-parsing.js

function testAsinParsing() {
  console.log('🧪 Testing ASIN parsing logic...\n');
  
  const testCases = [
    // Regular ASIN (should be image 1)
    { filename: 'B08KR3G8VP.jpg', expectedAsin: 'B08KR3G8VP', expectedNumber: 1 },
    { filename: 'B08KS52T96.png', expectedAsin: 'B08KS52T96', expectedNumber: 1 },
    
    // Numbered ASIN
    { filename: 'B08KR3G8VP 2.jpg', expectedAsin: 'B08KR3G8VP', expectedNumber: 2 },
    { filename: 'B08KR3G8VP 3.png', expectedAsin: 'B08KR3G8VP', expectedNumber: 3 },
    { filename: 'B08KS52T96 4.jpg', expectedAsin: 'B08KS52T96', expectedNumber: 4 },
    { filename: 'B08KS52T96 5.webp', expectedAsin: 'B08KS52T96', expectedNumber: 5 },
    
    // Edge cases
    { filename: 'B08KR3G8VP 10.jpg', expectedAsin: 'B08KR3G8VP', expectedNumber: 10 },
    { filename: 'b08kr3g8vp 2.jpg', expectedAsin: 'B08KR3G8VP', expectedNumber: 2 }, // lowercase
    
    // Invalid cases (should fail validation)
    { filename: 'INVALID.jpg', expectedAsin: null, expectedNumber: null },
    { filename: 'B08KR3G8V.jpg', expectedAsin: null, expectedNumber: null }, // too short
    { filename: 'B08KR3G8VPP.jpg', expectedAsin: null, expectedNumber: null }, // too long
    { filename: 'B08KR3G8VP 0.jpg', expectedAsin: 'B08KR3G8VP', expectedNumber: 0 }, // zero
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.filename}`);
    
    const result = parseAsinFromFilename(testCase.filename);
    
    if (testCase.expectedAsin === null) {
      if (result.valid) {
        console.log(`  ❌ Expected invalid, but got: ${result.asin} (${result.imageNumber})`);
      } else {
        console.log(`  ✅ Correctly identified as invalid`);
      }
    } else {
      if (!result.valid) {
        console.log(`  ❌ Expected valid, but got invalid`);
      } else if (result.asin !== testCase.expectedAsin || result.imageNumber !== testCase.expectedNumber) {
        console.log(`  ❌ Expected: ${testCase.expectedAsin} (${testCase.expectedNumber}), Got: ${result.asin} (${result.imageNumber})`);
      } else {
        console.log(`  ✅ Correct: ${result.asin} (image ${result.imageNumber})`);
      }
    }
    console.log('');
  });
}

function parseAsinFromFilename(fileName) {
  const path = require('path');
  
  // Extract filename without extension
  const justFileName = path.basename(fileName);
  const fileExt = path.extname(fileName).toLowerCase();
  const baseName = path.basename(justFileName, fileExt);
  
  // Handle numbered images like "B08KR3G8VP 2", "B08KR3G8VP 3", etc.
  let asin, imageNumber = 1;
  const numberedMatch = baseName.match(/^([A-Z0-9]{10})\s+(\d+)$/i);
  
  if (numberedMatch) {
    // This is a numbered image like "B08KR3G8VP 2"
    asin = numberedMatch[1].toUpperCase();
    imageNumber = parseInt(numberedMatch[2]);
  } else {
    // Regular ASIN without number (image 1)
    asin = baseName.toUpperCase();
    imageNumber = 1;
  }
  
  // Validate ASIN format (10 characters, alphanumeric)
  const isValidAsin = /^[A-Z0-9]{10}$/.test(asin);
  
  return {
    valid: isValidAsin,
    asin: isValidAsin ? asin : null,
    imageNumber: isValidAsin ? imageNumber : null,
    originalName: baseName
  };
}

// Run the tests
testAsinParsing();