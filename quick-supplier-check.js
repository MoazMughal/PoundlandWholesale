// Quick script to check supplier and test password reset
const supplierEmail = 'leadmoderator123@gmail.com';

console.log('🔍 Supplier Information Check');
console.log('============================');
console.log(`Email: ${supplierEmail}`);
console.log('');

console.log('📋 Current Setup:');
console.log('- Environment: Development (localhost)');
console.log('- Frontend URL: http://localhost:3000');
console.log('- Expected reset URL format: http://localhost:3000/reset-password/{token}?type=seller');
console.log('');

console.log('🔧 To test password reset:');
console.log('1. Start your server: npm run dev (in server directory)');
console.log('2. Start your frontend: npm start (in root directory)');
console.log('3. Go to: http://localhost:3000/forgot-password-token');
console.log('4. Enter email: leadmoderator123@gmail.com');
console.log('5. Select user type: Seller');
console.log('6. Check email for reset link');
console.log('');

console.log('🐛 If "Page Not Found" appears:');
console.log('- Check if both server and frontend are running');
console.log('- Verify the reset link opens in the same browser');
console.log('- Make sure the URL matches the route pattern');
console.log('');

console.log('📧 Email Configuration:');
console.log('- SMTP: Gmail (smtp.gmail.com:587)');
console.log('- From: Moazmughal786@gmail.com');
console.log('- Service: Generic Wholesale');
console.log('');

console.log('✅ Next Steps:');
console.log('1. I updated .env to use localhost for development');
console.log('2. Restart your server to pick up the new FRONTEND_URL');
console.log('3. Test the password reset flow');
console.log('4. The reset link should now point to localhost when testing locally');