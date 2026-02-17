// Paste this in browser console to verify the fix

console.log('=== RESPONSIVE BUG VERIFICATION ===\n');

// 1. Check viewport
const width = window.innerWidth;
const isDesktop = width > 768;
console.log(`✓ Window width: ${width}px`);
console.log(`✓ Is desktop: ${isDesktop ? 'YES' : 'NO'}\n`);

// 2. Check zoom level
const zoom = window.devicePixelRatio;
console.log(`✓ Browser zoom: ${(zoom * 100).toFixed(0)}%`);
if (zoom !== 1) {
  console.warn('⚠️  Browser is zoomed! Press Ctrl+0 to reset to 100%\n');
}

// 3. Check media query
const desktopQuery = window.matchMedia('(min-width: 769px)');
console.log(`✓ Desktop media query matches: ${desktopQuery.matches ? 'YES' : 'NO'}\n`);

// 4. Check table visibility
const table = document.querySelector('.products-table');
const mobileCards = document.querySelector('.mobile-product-cards');

if (table) {
  const tableStyles = window.getComputedStyle(table);
  console.log('=== TABLE STATUS ===');
  console.log(`✓ Table display: ${tableStyles.display}`);
  console.log(`✓ Table visibility: ${tableStyles.visibility}`);
  console.log(`✓ Table opacity: ${tableStyles.opacity}\n`);
  
  if (tableStyles.display === 'none') {
    console.error('❌ TABLE IS HIDDEN! This is the bug.');
  } else {
    console.log('✅ TABLE IS VISIBLE! Fix is working.');
  }
} else {
  console.error('❌ Table element not found!');
}

// 5. Check mobile cards
if (mobileCards) {
  const cardsStyles = window.getComputedStyle(mobileCards);
  console.log('=== MOBILE CARDS STATUS ===');
  console.log(`✓ Mobile cards display: ${cardsStyles.display}\n`);
  
  if (isDesktop && cardsStyles.display !== 'none') {
    console.error('❌ MOBILE CARDS ARE SHOWING ON DESKTOP! This is the bug.');
  } else if (isDesktop) {
    console.log('✅ MOBILE CARDS ARE HIDDEN ON DESKTOP! Fix is working.');
  }
}

// 6. Check table rows
const rows = document.querySelectorAll('.products-table tbody tr');
console.log('=== TABLE ROWS ===');
console.log(`✓ Total rows found: ${rows.length}`);

if (rows.length > 0) {
  const firstRow = rows[0];
  const rowStyles = window.getComputedStyle(firstRow);
  console.log(`✓ First row display: ${rowStyles.display}`);
  console.log(`✓ First row height: ${rowStyles.height}\n`);
  
  if (rowStyles.display === 'table-row') {
    console.log('✅ ROWS ARE DISPLAYING CORRECTLY!');
  } else {
    console.error('❌ ROWS HAVE WRONG DISPLAY PROPERTY!');
  }
} else {
  console.warn('⚠️  No table rows found. Is data loaded?');
}

// 7. Final verdict
console.log('\n=== FINAL VERDICT ===');
if (isDesktop && table && window.getComputedStyle(table).display !== 'none') {
  console.log('✅✅✅ FIX IS WORKING! Table is visible on desktop.');
} else if (!isDesktop) {
  console.log('ℹ️  You are on mobile viewport. Resize window to test desktop.');
} else {
  console.error('❌❌❌ FIX IS NOT WORKING! Table is still hidden.');
  console.log('\nTroubleshooting:');
  console.log('1. Clear browser cache (Ctrl+Shift+Delete)');
  console.log('2. Hard refresh (Ctrl+Shift+R)');
  console.log('3. Reset zoom (Ctrl+0)');
  console.log('4. Restart dev server');
}

console.log('\n=== END VERIFICATION ===');
