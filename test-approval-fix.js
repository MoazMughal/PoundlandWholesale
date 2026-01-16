/**
 * Test script to verify the approval fix
 * 
 * This script helps verify that products maintain their approval status
 * and Amazon's Choice flag after being edited.
 * 
 * Usage:
 * 1. Make sure your server is running
 * 2. Run: node test-approval-fix.js <productId> <adminToken>
 * 
 * Example:
 * node test-approval-fix.js 507f1f77bcf86cd799439011 your-admin-token-here
 */

const productId = process.argv[2];
const adminToken = process.argv[3];

if (!productId || !adminToken) {
  console.log('❌ Usage: node test-approval-fix.js <productId> <adminToken>');
  console.log('');
  console.log('Example:');
  console.log('  node test-approval-fix.js 507f1f77bcf86cd799439011 your-admin-token-here');
  console.log('');
  console.log('To get a product ID:');
  console.log('  1. Go to admin/approval page');
  console.log('  2. Approve a product');
  console.log('  3. Copy the product ID from the URL or database');
  process.exit(1);
}

async function testApprovalFix() {
  const baseUrl = 'http://localhost:5000/api';
  
  console.log('🧪 Testing Approval Fix');
  console.log('='.repeat(50));
  console.log('');
  
  try {
    // Step 1: Get the product before update
    console.log('📋 Step 1: Fetching product before update...');
    const beforeResponse = await fetch(`${baseUrl}/products/${productId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!beforeResponse.ok) {
      throw new Error(`Failed to fetch product: ${beforeResponse.status} ${beforeResponse.statusText}`);
    }
    
    const beforeProduct = await beforeResponse.json();
    console.log('✅ Product fetched successfully');
    console.log('   Name:', beforeProduct.name);
    console.log('   Status:', beforeProduct.status);
    console.log('   Approval Status:', beforeProduct.approvalStatus);
    console.log('   Is Amazon\'s Choice:', beforeProduct.isAmazonsChoice);
    console.log('');
    
    // Step 2: Update the product (simulating an edit from admin/products)
    console.log('📝 Step 2: Updating product (changing name)...');
    const updateResponse = await fetch(`${baseUrl}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: beforeProduct.name + ' (Test Edit)',
        price: beforeProduct.price,
        category: beforeProduct.category,
        brand: beforeProduct.brand,
        description: beforeProduct.description,
        stock: beforeProduct.stock,
        images: beforeProduct.images
        // Note: NOT sending approvalStatus, isAmazonsChoice, or status
        // The fix should preserve these from the existing product
      })
    });
    
    if (!updateResponse.ok) {
      throw new Error(`Failed to update product: ${updateResponse.status} ${updateResponse.statusText}`);
    }
    
    const afterProduct = await updateResponse.json();
    console.log('✅ Product updated successfully');
    console.log('   Name:', afterProduct.name);
    console.log('   Status:', afterProduct.status);
    console.log('   Approval Status:', afterProduct.approvalStatus);
    console.log('   Is Amazon\'s Choice:', afterProduct.isAmazonsChoice);
    console.log('');
    
    // Step 3: Verify the fix
    console.log('🔍 Step 3: Verifying the fix...');
    console.log('');
    
    const results = {
      statusPreserved: beforeProduct.status === afterProduct.status,
      approvalStatusPreserved: beforeProduct.approvalStatus === afterProduct.approvalStatus,
      isAmazonsChoicePreserved: beforeProduct.isAmazonsChoice === afterProduct.isAmazonsChoice,
      nameUpdated: beforeProduct.name !== afterProduct.name
    };
    
    console.log('Results:');
    console.log('  ✓ Name updated:', results.nameUpdated ? '✅ YES' : '❌ NO');
    console.log('  ✓ Status preserved:', results.statusPreserved ? '✅ YES' : '❌ NO');
    console.log('  ✓ Approval status preserved:', results.approvalStatusPreserved ? '✅ YES' : '❌ NO');
    console.log('  ✓ Amazon\'s Choice flag preserved:', results.isAmazonsChoicePreserved ? '✅ YES' : '❌ NO');
    console.log('');
    
    if (results.statusPreserved && results.approvalStatusPreserved && results.isAmazonsChoicePreserved && results.nameUpdated) {
      console.log('🎉 SUCCESS! The fix is working correctly!');
      console.log('');
      console.log('The product maintained its approval status and Amazon\'s Choice flag');
      console.log('even though these fields were not sent in the update request.');
      console.log('');
      console.log('✅ Products can now be edited without losing their approval status!');
    } else {
      console.log('❌ FAILURE! The fix is not working as expected.');
      console.log('');
      console.log('Expected behavior:');
      console.log('  - Name should be updated (we changed it)');
      console.log('  - Status should be preserved (we didn\'t send it)');
      console.log('  - Approval status should be preserved (we didn\'t send it)');
      console.log('  - Amazon\'s Choice flag should be preserved (we didn\'t send it)');
      console.log('');
      console.log('Please check the server logs for more details.');
    }
    
    // Step 4: Restore original name
    console.log('');
    console.log('🔄 Step 4: Restoring original product name...');
    const restoreResponse = await fetch(`${baseUrl}/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: beforeProduct.name,
        price: beforeProduct.price,
        category: beforeProduct.category,
        brand: beforeProduct.brand,
        description: beforeProduct.description,
        stock: beforeProduct.stock,
        images: beforeProduct.images
      })
    });
    
    if (restoreResponse.ok) {
      console.log('✅ Original name restored successfully');
    } else {
      console.log('⚠️ Failed to restore original name (not critical)');
    }
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
    console.log('');
    console.log('Make sure:');
    console.log('  1. Your server is running on http://localhost:5000');
    console.log('  2. The product ID is valid');
    console.log('  3. The admin token is valid');
    process.exit(1);
  }
}

testApprovalFix();
