import { useState } from 'react'
import { Link } from 'react-router-dom'
import ScrollToTop from '../../components/ScrollToTop'

const HelpCenter = () => {
  const [activeCategory, setActiveCategory] = useState('getting-started')

  const helpCategories = {
    'getting-started': {
      title: 'Getting Started',
      icon: 'fas fa-rocket',
      articles: [
        {
          title: 'How to create an account',
          content: 'Visit our registration page and choose between Buyer or Supplier account. Fill in your business details and verify your email address.'
        },
        {
          title: 'Account verification process',
          content: 'After registration, upload your business documents. Our team will review and verify your account within 24-48 hours.'
        },
        {
          title: 'Setting up your profile',
          content: 'Complete your business profile with accurate information, add your logo, and provide detailed business description.'
        }
      ]
    },
    'buying': {
      title: 'For Buyers',
      icon: 'fas fa-shopping-cart',
      articles: [
        {
          title: 'How to find suppliers',
          content: 'Use our search function to find products and suppliers. Filter by location, price, minimum order quantity, and ratings.'
        },
        {
          title: 'Contacting suppliers',
          content: 'Click on any product to view supplier details. Use our messaging system or WhatsApp integration to communicate directly.'
        },
        {
          title: 'Placing orders',
          content: 'Negotiate terms with suppliers, agree on pricing and delivery, then place your order through our secure platform.'
        }
      ]
    },
    'selling': {
      title: 'For Suppliers',
      icon: 'fas fa-store',
      articles: [
        {
          title: 'Adding products',
          content: 'Go to your dashboard and click "Add Product". Fill in product details, upload high-quality images, and set competitive prices.'
        },
        {
          title: 'Managing inventory',
          content: 'Keep your inventory updated. Set stock levels and enable notifications for low stock alerts.'
        },
        {
          title: 'Handling inquiries',
          content: 'Respond to buyer inquiries promptly. Use our messaging system to negotiate terms and close deals.'
        }
      ]
    },
    'payments': {
      title: 'Payments & Billing',
      icon: 'fas fa-credit-card',
      articles: [
        {
          title: 'Payment methods',
          content: 'We accept bank transfers, JazzCash, EasyPaisa, and credit/debit cards. All payments are processed securely.'
        },
        {
          title: 'Subscription plans',
          content: 'Choose from our flexible subscription plans. Basic plan is free, Premium plans offer additional features and priority support.'
        },
        {
          title: 'Refund policy',
          content: 'Refunds are processed within 7-14 business days. Contact support for refund requests with valid reasons.'
        }
      ]
    },
    'technical': {
      title: 'Technical Support',
      icon: 'fas fa-cog',
      articles: [
        {
          title: 'Troubleshooting login issues',
          content: 'Clear your browser cache, check your internet connection, or reset your password if you cannot log in.'
        },
        {
          title: 'Mobile app usage',
          content: 'Download our mobile app from Google Play Store or Apple App Store for better mobile experience.'
        },
        {
          title: 'Browser compatibility',
          content: 'Our platform works best on Chrome, Firefox, Safari, and Edge. Ensure JavaScript is enabled.'
        }
      ]
    }
  }

  return (
    <div className="container my-5">
      <div className="row">
        <div className="col-12">
          <h1 className="text-center mb-5">Help Center</h1>
        </div>
      </div>

      <div className="row">
        {/* Sidebar */}
        <div className="col-lg-3 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Categories</h5>
            </div>
            <div className="list-group list-group-flush">
              {Object.entries(helpCategories).map(([key, category]) => (
                <button
                  key={key}
                  className={`list-group-item list-group-item-action ${activeCategory === key ? 'active' : ''}`}
                  onClick={() => setActiveCategory(key)}
                >
                  <i className={`${category.icon} me-2`}></i>
                  {category.title}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Contact */}
          <div className="card mt-4">
            <div className="card-body text-center">
              <h6>Need More Help?</h6>
              <p className="small text-muted">Contact our support team</p>
              <Link to="/contact" className="btn btn-primary btn-sm">
                <i className="fas fa-envelope me-1"></i>Contact Support
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="col-lg-9">
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">
                <i className={`${helpCategories[activeCategory].icon} me-2`}></i>
                {helpCategories[activeCategory].title}
              </h4>
            </div>
            <div className="card-body">
              {helpCategories[activeCategory].articles.map((article, index) => (
                <div key={index} className="mb-4">
                  <h5 className="text-primary">{article.title}</h5>
                  <p className="text-muted">{article.content}</p>
                  {index < helpCategories[activeCategory].articles.length - 1 && <hr />}
                </div>
              ))}
            </div>
          </div>

          {/* Search Help */}
          <div className="card mt-4">
            <div className="card-body">
              <h5>Search Help Articles</h5>
              <div className="input-group">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Search for help articles..."
                />
                <button className="btn btn-outline-primary" type="button">
                  <i className="fas fa-search"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mt-5">
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
      <ScrollToTop />
    </div>
  )
}

export default HelpCenter