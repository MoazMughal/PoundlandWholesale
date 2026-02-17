// Verification Script for Excel Products Page Fix
// Run this in browser console on /admin/excel-products page

console.log('🔍 Excel Products Page - Responsive Fix Verification');
console.log('================================================\n');

// Check viewport width
const viewportWidth = window.innerWidth;
console.log(`📐 Viewport Width: ${viewportWidth}px`);
console.log(`📱 Device Type: ${viewportWidth > 768 ? 'Desktop' : 'Mobile'}\n`);

// Check if elements exist
const excelTable = document.querySelector('.excel-products-table');
const scrollWrapper = document.querySelector('.excel-table-scroll-wrapper');
const mobileCards = document.querySelector('.mobile-excel-product-cards');

console.log('🔍 Element Existence Check:');
console.log(`  ✓ Excel Table Container: ${excelTable ? 'Found' : '❌ NOT FOUND'}`);
console.log(`  ✓ Scroll Wrapper: ${scrollWrapper ? 'Found' : '❌ NOT FOUND'}`);
console.log(`  ✓ Mobile Cards: ${mobileCards ? 'Found' : '❌ NOT FOUND'}\n`);

if (viewportWidth > 768) {
  console.log('🖥️ DESKTOP MODE - Expected Behavior:');
  console.log('  • Table should be VISIBLE');
  console.log('  • Mobile cards should be HIDDEN\n');
  
  if (excelTable) {
    const tableStyles = window.getComputedStyle(excelTable);
    console.log('📊 Excel Table Styles:');
    console.log(`  • display: ${tableStyles.display}`);
    console.log(`  • visibility: ${tableStyles.visibility}`);
    console.log(`  • opacity: ${tableStyles.opacity}`);
    
    const isVisible = tableStyles.display !== 'none' && 
                     tableStyles.visibility !== 'hidden' && 
                     parseFloat(tableStyles.opacity) > 0;
    
    console.log(`  • Status: ${isVisible ? '✅ VISIBLE' : '❌ HIDDEN'}\n`);
  }
  
  if (scrollWrapper) {
    const wrapperStyles = window.getComputedStyle(scrollWrapper);
    console.log('📊 Scroll Wrapper Styles:');
    console.log(`  • display: ${wrapperStyles.display}`);
    console.log(`  • visibility: ${wrapperStyles.visibility}`);
    console.log(`  • opacity: ${wrapperStyles.opacity}`);
    
    const isVisible = wrapperStyles.display !== 'none' && 
                     wrapperStyles.visibility !== 'hidden' && 
                     parseFloat(wrapperStyles.opacity) > 0;
    
    console.log(`  • Status: ${isVisible ? '✅ VISIBLE' : '❌ HIDDEN'}\n`);
  }
  
  if (mobileCards) {
    const cardsStyles = window.getComputedStyle(mobileCards);
    console.log('📱 Mobile Cards Styles:');
    console.log(`  • display: ${cardsStyles.display}`);
    
    const isHidden = cardsStyles.display === 'none';
    console.log(`  • Status: ${isHidden ? '✅ HIDDEN (correct)' : '❌ VISIBLE (wrong!)'}\n`);
  }
  
  // Check media query
  const desktopQuery = window.matchMedia('(min-width: 769px)');
  console.log('🎯 Media Query Check:');
  console.log(`  • Desktop query (min-width: 769px): ${desktopQuery.matches ? '✅ MATCHES' : '❌ NOT MATCHING'}\n`);
  
  // Final verdict
  const tableVisible = excelTable && window.getComputedStyle(excelTable).display !== 'none';
  const cardsHidden = !mobileCards || window.getComputedStyle(mobileCards).display === 'none';
  
  console.log('🎯 FINAL VERDICT:');
  if (tableVisible && cardsHidden) {
    console.log('  ✅ ✅ ✅ FIX IS WORKING! ✅ ✅ ✅');
    console.log('  • Table is visible on desktop');
    console.log('  • Mobile cards are hidden');
    console.log('  • Responsive behavior is correct');
  } else {
    console.log('  ❌ ❌ ❌ FIX NOT WORKING! ❌ ❌ ❌');
    if (!tableVisible) console.log('  • Table is NOT visible (should be visible)');
    if (!cardsHidden) console.log('  • Mobile cards are NOT hidden (should be hidden)');
    console.log('\n  🔧 Try:');
    console.log('  1. Hard refresh (Ctrl+Shift+R)');
    console.log('  2. Clear cache');
    console.log('  3. Restart dev server');
  }
} else {
  console.log('📱 MOBILE MODE - Expected Behavior:');
  console.log('  • Table should allow horizontal scroll');
  console.log('  • Mobile cards should be VISIBLE\n');
  
  if (excelTable) {
    const tableStyles = window.getComputedStyle(excelTable);
    console.log('📊 Excel Table Styles:');
    console.log(`  • display: ${tableStyles.display}`);
    console.log(`  • overflow-x: ${tableStyles.overflowX}\n`);
  }
  
  if (mobileCards) {
    const cardsStyles = window.getComputedStyle(mobileCards);
    console.log('📱 Mobile Cards Styles:');
    console.log(`  • display: ${cardsStyles.display}`);
    
    const isVisible = cardsStyles.display !== 'none';
    console.log(`  • Status: ${isVisible ? '✅ VISIBLE (correct)' : '❌ HIDDEN (wrong!)'}\n`);
  }
}

console.log('\n================================================');
console.log('💡 To test scroll behavior:');
console.log('  1. Scroll down the page');
console.log('  2. Table should stay visible (desktop)');
console.log('  3. No layout should break');
console.log('  4. No mobile cards should appear (desktop)');
