import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import MobileHeader from './components/MobileHeader'
import CompactFooter from './components/CompactFooter'
import WhatsAppFloat from './components/WhatsAppFloat'
import ScrollToTop from './components/ScrollToTop'
import ScrollToTopOnRouteChange from './components/ScrollToTopOnRouteChange'
import BasketSidebar from './components/BasketSidebar'

import ProtectedRoute from './components/ProtectedRoute'
import { CurrencyProvider } from './context/CurrencyContext'
import { SellerProvider } from './context/SellerContext'
import { AdminProvider } from './context/AdminContext'
import { BuyerProvider } from './context/BuyerContext'
import { BasketProvider, useBasket } from './context/BasketContext'
import './App.css'
import './styles/mobile-responsive.css'
import './styles/enhanced-theme.css'
import './styles/design-system.css'
import './styles/components.css'
import './styles/typography.css'
import './styles/accessibility.css'
import './styles/login-animations.css'
import './styles/mobile-improvements.css'
import './styles/dashboard-responsive.css'
import './styles/mobile-dashboard.css'
import './styles/micro-interactions.css'
import './styles/layout-fix.css'
import './styles/image-optimization.css'
import './styles/compact-cards.css'

// Lazy load pages for better performance
const AmazonsChoice = lazy(() => import('./pages/AmazonsChoice'))
const Basket = lazy(() => import('./pages/Basket'))
const AboutUs = lazy(() => import('./pages/AboutUs'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ForgotPasswordToken = lazy(() => import('./pages/ForgotPasswordToken'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AuthLanding = lazy(() => import('./pages/auth/AuthLanding'))
const RoleSelection = lazy(() => import('./pages/auth/RoleSelection'))
const BuyerLogin = lazy(() => import('./pages/auth/BuyerLogin'))
const SupplierLogin = lazy(() => import('./pages/auth/SupplierLogin'))
const BuyerRegister = lazy(() => import('./pages/auth/BuyerRegister'))
const SupplierRegister = lazy(() => import('./pages/auth/SupplierRegister'))
const JoinNow = lazy(() => import('./pages/onboarding/JoinNow'))
const ProductDetail = lazy(() => import('./pages/ProductDetail'))
const AdminLogin = lazy(() => import('./pages/admin/Login'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'))
const AdminProducts = lazy(() => import('./pages/admin/Products'))
const AdminAddProduct = lazy(() => import('./pages/admin/AddProduct'))
const AdminApproval = lazy(() => import('./pages/admin/Approval'))
const EditProduct = lazy(() => import('./pages/admin/EditProduct'))
const ExcelProducts = lazy(() => import('./pages/ExcelProducts'))
const AdminSellers = lazy(() => import('./pages/admin/Sellers'))
const AdminSellerManagement = lazy(() => import('./pages/admin/SellerManagement'))
const AdminSellerProducts = lazy(() => import('./pages/admin/SellerProductsSimple'))
const AdminSellerVerifications = lazy(() => import('./pages/admin/SellerVerifications'))
const ExcelImport = lazy(() => import('./pages/admin/ExcelImport'))
const ExcelManager = lazy(() => import('./pages/admin/ExcelManager'))
const AdminExcelProducts = lazy(() => import('./pages/admin/ExcelProducts'))
const ExcelProductEdit = lazy(() => import('./pages/admin/ExcelProductEdit'))
const ImageViewer = lazy(() => import('./pages/admin/ImageViewer'))
const ImageDebug = lazy(() => import('./pages/admin/ImageDebug'))
const AdminBuyers = lazy(() => import('./pages/admin/Buyers'))
const AdminPendingPayments = lazy(() => import('./pages/admin/PendingPayments'))
const AdminListingRequests = lazy(() => import('./pages/admin/ListingRequests'))
const PaymentVerifications = lazy(() => import('./pages/admin/PaymentVerifications'))
const AdminQuotations = lazy(() => import('./pages/admin/Quotations'))
const AdminWishlistQueries = lazy(() => import('./pages/admin/WishlistQueries'))
const AdminSellerCatalog = lazy(() => import('./pages/admin/SellerCatalog'))
const AdminCategoryManager = lazy(() => import('./pages/admin/CategoryManager'))
const BuyerDashboard = lazy(() => import('./pages/buyer/Dashboard'))
const BuyerEditProfile = lazy(() => import('./pages/buyer/EditProfile'))
const BuyerWishlist = lazy(() => import('./pages/buyer/Wishlist'))
const BuyerTestAuth = lazy(() => import('./pages/buyer/TestAuth'))
const SellerDashboard = lazy(() => import('./pages/seller/Dashboard'))
const SellerBuyerQueries = lazy(() => import('./pages/seller/BuyerQueries'))
const SellerProducts = lazy(() => import('./pages/seller/Products'))
const SellerAddProduct = lazy(() => import('./pages/seller/AddProduct'))
const SellerAddProducts = lazy(() => import('./pages/seller/AddProducts'))
const SellerEditProfile = lazy(() => import('./pages/seller/EditProfile'))
const SellerAdminProducts = lazy(() => import('./pages/seller/AdminProducts'))
const SellerAmazonsChoiceProducts = lazy(() => import('./pages/seller/AmazonsChoiceProducts'))
const SellerListedProducts = lazy(() => import('./pages/seller/ListedProducts'))
const MyListedProducts = lazy(() => import('./pages/seller/MyListedProducts'))
const SellerEditProduct = lazy(() => import('./pages/seller/EditProduct'))

// Legal Pages
const TermsOfService = lazy(() => import('./pages/legal/TermsOfService'))
const PrivacyPolicy = lazy(() => import('./pages/legal/PrivacyPolicy'))
const HelpCenter = lazy(() => import('./pages/legal/HelpCenter'))
const FAQ = lazy(() => import('./pages/legal/FAQ'))

// Loading component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
    fontSize: '1.2rem',
    color: '#666'
  }}>
    <div>
      <div style={{fontSize: '2rem', marginBottom: '10px'}}>⏳</div>
      <div>Loading...</div>
    </div>
  </div>
)

function App() {
  // Initialize auth session manager - handles auto-logout on browser close
  useEffect(() => {
    // Auth session manager is already initialized as singleton
    // It will automatically:
    // 1. Clear auth on fresh browser session
    // 2. Monitor user activity
    // 3. Auto-logout after 24 hours of inactivity
    // 4. Clear sessions when browser closes

    // Cleanup on unmount
    return () => {
      // Session manager will persist across component remounts
    };
  }, []);
  
  return (
    <CurrencyProvider>
      <BasketProvider>
        <BuyerProvider>
          <SellerProvider>
            <AdminProvider>
            <Router>
        <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', margin: 0, padding: 0, overflowX: 'hidden' }}>
          <ScrollToTopOnRouteChange />
          <MobileHeader />
          <main style={{ flex: '1 0 auto', margin: 0, padding: 0 }}>
          <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route path="/" element={<AmazonsChoice />} />
          <Route path="/basket" element={<Basket />} />
          <Route path="/about-us" element={<AboutUs />} />
          {/* Legacy routes - redirect to new auth system */}
          <Route path="/login" element={<RoleSelection />} />
          <Route path="/register" element={<AuthLanding />} />
          
          {/* New Auth Routes */}
          <Route path="/auth" element={<RoleSelection />} />
          <Route path="/login/buyer" element={<BuyerLogin />} />
          <Route path="/login/supplier" element={<SupplierLogin />} />
          <Route path="/register/buyer" element={<BuyerRegister />} />
          <Route path="/register/supplier" element={<SupplierRegister />} />
          <Route path="/join-now" element={<JoinNow />} />
          
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/forgot-password-token" element={<ForgotPasswordToken />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/excel-products" element={<ExcelProducts />} />
          
          {/* Buyer Routes */}
          <Route path="/buyer/dashboard" element={<BuyerDashboard />} />
          <Route path="/buyer/edit-profile" element={<BuyerEditProfile />} />
          <Route path="/buyer/wishlist" element={<BuyerWishlist />} />
          <Route path="/buyer/test-auth" element={<BuyerTestAuth />} />
          
          {/* Seller Routes */}
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/buyer-queries" element={<SellerBuyerQueries />} />
          <Route path="/seller/profile/edit" element={<SellerEditProfile />} />
          <Route path="/seller/products" element={<SellerProducts />} />
          <Route path="/seller/products/add" element={<SellerAddProduct />} />
          <Route path="/seller/add-products" element={<SellerAddProducts />} />
          <Route path="/seller/admin-products" element={<SellerAdminProducts />} />
          <Route path="/seller/amazons-choice-products" element={<SellerAmazonsChoiceProducts />} />
          <Route path="/seller/listed-products" element={<SellerListedProducts />} />
          <Route path="/seller/my-listed-products" element={<MyListedProducts />} />
          <Route path="/seller/edit-product/:id" element={<SellerEditProduct />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/products/add" element={<ProtectedRoute><AdminAddProduct /></ProtectedRoute>} />
          <Route path="/admin/approval" element={<ProtectedRoute><AdminApproval /></ProtectedRoute>} />
          <Route path="/admin/products/edit/:id" element={<ProtectedRoute><EditProduct /></ProtectedRoute>} />
          <Route path="/admin/sellers" element={<ProtectedRoute><AdminSellers /></ProtectedRoute>} />
          <Route path="/admin/seller-management" element={<ProtectedRoute><AdminSellerManagement /></ProtectedRoute>} />
          <Route path="/admin/seller-products" element={<ProtectedRoute><AdminSellerProducts /></ProtectedRoute>} />
          <Route path="/admin/seller-verifications" element={<ProtectedRoute><AdminSellerVerifications /></ProtectedRoute>} />
          <Route path="/admin/buyers" element={<ProtectedRoute><AdminBuyers /></ProtectedRoute>} />
          <Route path="/admin/pending-payments" element={<ProtectedRoute><AdminPendingPayments /></ProtectedRoute>} />
          <Route path="/admin/listing-requests" element={<ProtectedRoute><AdminListingRequests /></ProtectedRoute>} />
          <Route path="/admin/payment-verifications" element={<ProtectedRoute><PaymentVerifications /></ProtectedRoute>} />
          <Route path="/admin/quotations" element={<ProtectedRoute><AdminQuotations /></ProtectedRoute>} />
          <Route path="/admin/wishlist-queries" element={<ProtectedRoute><AdminWishlistQueries /></ProtectedRoute>} />
          <Route path="/admin/seller-catalog" element={<ProtectedRoute><AdminSellerCatalog /></ProtectedRoute>} />
          <Route path="/admin/category-manager" element={<ProtectedRoute><AdminCategoryManager /></ProtectedRoute>} />
          <Route path="/admin/excel-import" element={<ProtectedRoute><ExcelImport /></ProtectedRoute>} />
          <Route path="/admin/excel-manager" element={<ProtectedRoute><ExcelManager /></ProtectedRoute>} />
          <Route path="/admin/excel-products/:uploadId" element={<ProtectedRoute><AdminExcelProducts /></ProtectedRoute>} />
          <Route path="/admin/excel-products/:uploadId/edit/:productId" element={<ProtectedRoute><ExcelProductEdit /></ProtectedRoute>} />
          <Route path="/admin/excel-product/edit/:productId" element={<ProtectedRoute><ExcelProductEdit /></ProtectedRoute>} />
          <Route path="/admin/excel-manager/images/:uploadId" element={<ProtectedRoute><ImageViewer /></ProtectedRoute>} />
          <Route path="/admin/image-debug" element={<ProtectedRoute><ImageDebug /></ProtectedRoute>} />
          
          {/* Legal Pages */}
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/help-center" element={<HelpCenter />} />
          <Route path="/faq" element={<FAQ />} />
          
          {/* Catch-all route for 404 - should be last */}
          <Route path="*" element={<div style={{padding: '50px', textAlign: 'center', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
            <div style={{fontSize: '4rem', marginBottom: '20px'}}>🔍</div>
            <h2 style={{color: '#ff6600', marginBottom: '15px'}}>Page Not Found</h2>
            <p style={{marginBottom: '20px', color: '#666'}}>The page you're looking for doesn't exist.</p>
            <p style={{marginBottom: '30px', fontSize: '0.9rem', color: '#999'}}>
              Current URL: <code style={{background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px'}}>{window.location.pathname}</code>
            </p>
            <div style={{display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center'}}>
              <a href="/" style={{color: '#667eea', textDecoration: 'none', padding: '10px 20px', border: '2px solid #667eea', borderRadius: '5px', transition: 'all 0.3s'}}>
                🏠 Go Home
              </a>
              <a href="/about-us" style={{color: '#667eea', textDecoration: 'none', padding: '10px 20px', border: '2px solid #667eea', borderRadius: '5px', transition: 'all 0.3s'}}>
                ℹ️ About Us
              </a>
            </div>
          </div>} />
        </Routes>
        </Suspense>
        </main>
        <CompactFooter />
        <ScrollToTop />
        <WhatsAppFloat />
        <BasketSidebarWrapper />
        </div>
        </Router>
        </AdminProvider>
        </SellerProvider>
        </BuyerProvider>
      </BasketProvider>
    </CurrencyProvider>
  )
}

// Wrapper component to access basket context
const BasketSidebarWrapper = () => {
  const { isSidebarOpen, closeSidebar } = useBasket()
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Only show basket sidebar on screens wider than 565px
  if (windowWidth <= 565) {
    return null
  }

  return <BasketSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
}

export default App
