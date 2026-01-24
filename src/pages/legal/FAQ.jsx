import { useState } from 'react'
import { Link } from 'react-router-dom'
import ScrollToTop from '../../components/ScrollToTop'

const FAQ = () => {
  const [activeAccordion, setActiveAccordion] = useState(null)

  const faqData = [
    {
      category: 'General',
      questions: [
        {
          question: 'What is PoundlandWholesale.com?',
          answer: 'PoundlandWholesale.com is the UK\'s premier B2B marketplace connecting verified wholesale suppliers with genuine buyers. We provide a secure platform for wholesale trading with features like supplier verification, secure payments, and direct communication.'
        },
        {
          question: 'How do I get started?',
          answer: 'Simply create an account by choosing between Buyer or Supplier registration. Complete your profile, verify your business documents, and start exploring our marketplace.'
        },
        {
          question: 'Is it free to use?',
          answer: 'Basic membership is free for both buyers and suppliers. We also offer premium plans with additional features like priority listing, advanced analytics, and dedicated support.'
        }
      ]
    },
    {
      category: 'For Buyers',
      questions: [
        {
          question: 'How do I find reliable suppliers?',
          answer: 'All our suppliers are verified through a rigorous process. Look for verified badges, check ratings and reviews, and use our advanced filters to find suppliers that match your requirements.'
        },
        {
          question: 'What is the minimum order quantity?',
          answer: 'Minimum order quantities vary by supplier and product. This information is clearly displayed on each product listing. You can also negotiate with suppliers for flexible quantities.'
        },
        {
          question: 'How do I contact suppliers?',
          answer: 'You can contact suppliers through our secure messaging system, WhatsApp integration, or direct phone calls. Contact details are available after account verification.'
        }
      ]
    },
    {
      category: 'For Suppliers',
      questions: [
        {
          question: 'How do I list my products?',
          answer: 'After account verification, go to your dashboard and click "Add Product". Fill in detailed product information, upload high-quality images, and set competitive prices.'
        },
        {
          question: 'What are the listing fees?',
          answer: 'Basic product listing is free. Premium listings with enhanced visibility and features are available through our subscription plans starting from Rs. 2,000/month.'
        },
        {
          question: 'How do I get more visibility?',
          answer: 'Maintain high-quality product listings, respond quickly to inquiries, maintain good ratings, and consider upgrading to premium plans for enhanced visibility.'
        }
      ]
    },
    {
      category: 'Payments & Security',
      questions: [
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept bank transfers, JazzCash, EasyPaisa, credit/debit cards, and other popular payment methods in Pakistan. All transactions are secured with SSL encryption.'
        },
        {
          question: 'Is my business information secure?',
          answer: 'Yes, we use industry-standard security measures to protect your data. We never share your information with third parties without your consent.'
        },
        {
          question: 'What if I have a dispute with a supplier/buyer?',
          answer: 'We have a dedicated dispute resolution team. Contact our support team with details, and we\'ll help mediate and resolve the issue fairly.'
        }
      ]
    },
    {
      category: 'Technical Support',
      questions: [
        {
          question: 'I\'m having trouble logging in. What should I do?',
          answer: 'Try clearing your browser cache, check your internet connection, or use the "Forgot Password" option. If issues persist, contact our technical support team.'
        },
        {
          question: 'Do you have a mobile app?',
          answer: 'Yes, our mobile app is available on Google Play Store and Apple App Store. Search for "PoundlandWholesale" to download.'
        },
        {
          question: 'Which browsers are supported?',
          answer: 'Our platform works best on Chrome, Firefox, Safari, and Edge. Ensure your browser is updated and JavaScript is enabled for optimal experience.'
        }
      ]
    }
  ]

  const toggleAccordion = (categoryIndex, questionIndex) => {
    const key = `${categoryIndex}-${questionIndex}`
    setActiveAccordion(activeAccordion === key ? null : key)
  }

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <h1 className="text-center mb-5">Frequently Asked Questions</h1>
          
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex} className="mb-5">
              <h3 className="text-primary mb-4">
                <i className="fas fa-question-circle me-2"></i>
                {category.category}
              </h3>
              
              <div className="accordion" id={`accordion-${categoryIndex}`}>
                {category.questions.map((faq, questionIndex) => {
                  const accordionKey = `${categoryIndex}-${questionIndex}`
                  const isActive = activeAccordion === accordionKey
                  
                  return (
                    <div key={questionIndex} className="accordion-item mb-3">
                      <h2 className="accordion-header">
                        <button
                          className={`accordion-button ${!isActive ? 'collapsed' : ''}`}
                          type="button"
                          onClick={() => toggleAccordion(categoryIndex, questionIndex)}
                        >
                          {faq.question}
                        </button>
                      </h2>
                      <div className={`accordion-collapse collapse ${isActive ? 'show' : ''}`}>
                        <div className="accordion-body">
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Contact Section */}
          <div className="card bg-light mt-5">
            <div className="card-body text-center">
              <h4>Still have questions?</h4>
              <p className="text-muted">Our support team is here to help you 24/7</p>
              <div className="row justify-content-center">
                <div className="col-md-6">
                  <Link to="/contact" className="btn btn-primary me-3">
                    <i className="fas fa-envelope me-1"></i>Contact Support
                  </Link>
                  <Link to="/help-center" className="btn btn-outline-primary">
                    <i className="fas fa-life-ring me-1"></i>Help Center
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-5">
            <Link to="/" className="btn btn-primary">Back to Home</Link>
          </div>
        </div>
      </div>
      <ScrollToTop />
    </div>
  )
}

export default FAQ