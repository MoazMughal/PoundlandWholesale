import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import MobileHeader from './components/MobileHeader'
import CompactFooter from './components/CompactFooter'
import WhatsAppFloat from './components/WhatsAppFloat'
import ScrollToTopOnRouteChange from './components/ScrollToTopOnRouteChange'

import ProtectedRoute from './components/ProtectedRoute'
import { CurrencyProvider } from './context/CurrencyContext'
import { SellerProvider } from './context/SellerContext'
import { AdminProvider } from './context/AdminContext'
import { BasketProvider } from './context/BasketContext'
import './App.css'
import './styles/mobile-responsive.css'
import './styles/enhanced-theme.css'

// Lazy load pages for better performance
const AmazonsChoice = lazy(() => import('./pages/AmazonsChoice'))
const Basket = lazy(() => import('./pages/Basket'))
const Categories = lazy(() => import('./pages/Categories'))
const AboutUs = lazy(() => import('./pages/AboutUs'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ForgotPasswordToken = lazy(() => import('./pages/ForgotPasswordToken'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const AuthLanding = lazy(() => import('./pages/auth/AuthLanding'))
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
const EditProduct = lazy(() => import('./pages/admin/EditProduct'))
const ExcelProducts = lazy(() => import('./pages/ExcelProducts'))
const AdminSellers = lazy(() => import('./pages/admin/Sellers'))
const AdminSellerProducts = lazy(() => import('./pages/admin/SellerProducts'))
const AdminSellerVerifications = lazy(() => import('./pages/admin/SellerVerifications'))
const ExcelImport = lazy(() => import('./pages/admin/ExcelImport'))
const ExcelManager = lazy(() => import('./pages/admin/ExcelManager'))
const AdminExcelProducts = lazy(() => import('./pages/admin/ExcelProducts'))
const ExcelProductEdit = lazy(() => import('./pages/admin/ExcelProductEdit'))
const AdminBuyers = lazy(() => import('./pages/admin/Buyers'))
const AdminPendingPayments = lazy(() => import('./pages/admin/PendingPayments'))
const AdminSellerListings = lazy(() => import('./pages/admin/SellerListings'))
const BuyerDashboard = lazy(() => import('./pages/buyer/Dashboard'))
const SellerDashboard = lazy(() => import('./pages/seller/Dashboard'))
const ClearStorage = lazy(() => import('./pages/ClearStorage'))
const SellerProfile = lazy(() => import('./pages/seller/Profile'))
const SellerProducts = lazy(() => import('./pages/seller/Products'))
const SellerAddProduct = lazy(() => import('./pages/seller/AddProduct'))
const SellerAddProducts = lazy(() => import('./pages/seller/AddProducts'))
const SellerEditProfile = lazy(() => import('./pages/seller/EditProfile'))
const SellerAdminProducts = lazy(() => import('./pages/seller/AdminProducts'))
const SellerAmazonsChoiceProducts = lazy(() => import('./pages/seller/AmazonsChoiceProducts'))
const SellerListedProducts = lazy(() => import('./pages/seller/ListedProducts'))

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
        <SellerProvider>
          <AdminProvider>
          <Router>
        <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <ScrollToTopOnRouteChange />
          <MobileHeader />
          <main style={{ flex: '1 0 auto' }}>
          <Suspense fallback={<PageLoader />}>
          <Routes>
          <Route path="/" element={<AmazonsChoice />} />
          <Route path="/basket" element={<Basket />} />
          <Route path="/clear-storage" element={<ClearStorage />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/categories" element={<Categories />} />
          {/* Legacy routes - redirect to new auth system */}
          <Route path="/login" element={<AuthLanding />} />
          <Route path="/register" element={<AuthLanding />} />
          
          {/* New Auth Routes */}
          <Route path="/auth" element={<AuthLanding />} />
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
          
          {/* Seller Routes */}
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/profile" element={<SellerProfile />} />
          <Route path="/seller/profile/edit" element={<SellerEditProfile />} />
          <Route path="/seller/products" element={<SellerProducts />} />
          <Route path="/seller/products/add" element={<SellerAddProduct />} />
          <Route path="/seller/add-products" element={<SellerAddProducts />} />
          <Route path="/seller/admin-products" element={<SellerAdminProducts />} />
          <Route path="/seller/amazons-choice-products" element={<SellerAmazonsChoiceProducts />} />
          <Route path="/seller/listed-products" element={<SellerListedProducts />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><AdminProducts /></ProtectedRoute>} />
          <Route path="/admin/products/add" element={<ProtectedRoute><AdminAddProduct /></ProtectedRoute>} />
          <Route path="/admin/products/edit/:id" element={<ProtectedRoute><EditProduct /></ProtectedRoute>} />
          <Route path="/admin/sellers" element={<ProtectedRoute><AdminSellers /></ProtectedRoute>} />
          <Route path="/admin/seller-products" element={<ProtectedRoute><AdminSellerProducts /></ProtectedRoute>} />
          <Route path="/admin/seller-verifications" element={<ProtectedRoute><AdminSellerVerifications /></ProtectedRoute>} />
          <Route path="/admin/buyers" element={<ProtectedRoute><AdminBuyers /></ProtectedRoute>} />
          <Route path="/admin/pending-payments" element={<ProtectedRoute><AdminPendingPayments /></ProtectedRoute>} />
          <Route path="/admin/seller-listings" element={<ProtectedRoute><AdminSellerListings /></ProtectedRoute>} />
          <Route path="/admin/excel-import" element={<ProtectedRoute><ExcelImport /></ProtectedRoute>} />
          <Route path="/admin/excel-manager" element={<ProtectedRoute><ExcelManager /></ProtectedRoute>} />
          <Route path="/admin/excel-products/:uploadId" element={<ProtectedRoute><AdminExcelProducts /></ProtectedRoute>} />
          <Route path="/admin/excel-products/:uploadId/edit/:productId" element={<ProtectedRoute><ExcelProductEdit /></ProtectedRoute>} />
          
          {/* Legal Pages */}
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/help-center" element={<HelpCenter />} />
          <Route path="/faq" element={<FAQ />} />
        </Routes>
        </Suspense>
        </main>
        <CompactFooter />
        <WhatsAppFloat />
        </div>
        </Router>
        </AdminProvider>
        </SellerProvider>
      </BasketProvider>
    </CurrencyProvider>
  )
}

export default App
