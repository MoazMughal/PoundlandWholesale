import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

const JoinNow = () => {
  const navigate = useNavigate()
  const [selectedUserType, setSelectedUserType] = useState('')
  const [currentStep, setCurrentStep] = useState(1)
  const [assessmentData, setAssessmentData] = useState({
    experience: '',
    monthlyVolume: '',
    primaryGoal: '',
    challenges: []
  })

  const handleUserTypeSelect = (type) => {
    // Navigate directly to registration page
    if (type === 'buyer') {
      navigate('/register/buyer')
    } else if (type === 'supplier') {
      navigate('/register/supplier')
    }
  }

  const handleAssessmentChange = (field, value) => {
    setAssessmentData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleChallengeToggle = (challenge) => {
    setAssessmentData(prev => ({
      ...prev,
      challenges: prev.challenges.includes(challenge)
        ? prev.challenges.filter(c => c !== challenge)
        : [...prev.challenges, challenge]
    }))
  }

  const calculatePotential = () => {
    let potential = 0
    let monthlyEarnings = 0
    
    if (selectedUserType === 'buyer') {
      switch (assessmentData.monthlyVolume) {
        case 'starter': potential = 2500; monthlyEarnings = 1200; break
        case 'growing': potential = 8500; monthlyEarnings = 3800; break
        case 'established': potential = 25000; monthlyEarnings = 12000; break
        case 'enterprise': potential = 75000; monthlyEarnings = 35000; break
        default: potential = 2500; monthlyEarnings = 1200
      }
    } else {
      switch (assessmentData.monthlyVolume) {
        case 'starter': potential = 1800; monthlyEarnings = 800; break
        case 'growing': potential = 6500; monthlyEarnings = 2800; break
        case 'established': potential = 18000; monthlyEarnings = 8500; break
        case 'enterprise': potential = 45000; monthlyEarnings = 22000; break
        default: potential = 1800; monthlyEarnings = 800
      }
    }
    
    return { potential, monthlyEarnings }
  }

  const getPersonalizedBenefits = () => {
    const { potential, monthlyEarnings } = calculatePotential()
    
    if (selectedUserType === 'buyer') {
      return {
        title: "Your Buyer Success Plan",
        subtitle: `Potential to earn $${monthlyEarnings.toLocaleString()}/month`,
        benefits: [
          {
            icon: "fas fa-chart-line",
            title: "Profit Potential",
            description: `Based on your profile, you could earn up to $${potential.toLocaleString()} annually`,
            color: "success"
          },
          {
            icon: "fas fa-handshake",
            title: "Verified Suppliers",
            description: "Access 500+ pre-vetted Pakistani suppliers with proven track records",
            color: "primary"
          },
          {
            icon: "fas fa-shipping-fast",
            title: "Fast Sourcing",
            description: "Average 3-day response time for quotes and samples",
            color: "info"
          },
          {
            icon: "fas fa-shield-alt",
            title: "Quality Guarantee",
            description: "All suppliers maintain 95%+ quality ratings with return protection",
            color: "warning"
          }
        ]
      }
    } else {
      return {
        title: "Your Supplier Growth Plan",
        subtitle: `Potential to earn $${monthlyEarnings.toLocaleString()}/month`,
        benefits: [
          {
            icon: "fas fa-users",
            title: "Buyer Network",
            description: `Connect with 2,000+ active buyers looking for your products`,
            color: "success"
          },
          {
            icon: "fas fa-globe",
            title: "Global Reach",
            description: "Sell to US, UK, UAE, and European markets through our platform",
            color: "primary"
          },
          {
            icon: "fas fa-tools",
            title: "Business Tools",
            description: "Free listing tools, pricing calculator, and market analytics",
            color: "info"
          },
          {
            icon: "fas fa-graduation-cap",
            title: "Training & Support",
            description: "Complete wholesale business course and dedicated account manager",
            color: "warning"
          }
        ]
      }
    }
  }

  const renderStep1 = () => (
    <div className="row justify-content-center">
      <div className="col-lg-10">
        <div className="text-center mb-4">
          <h2 className="fw-bold mb-2">Join Generic Wholesale Community</h2>
          <p className="text-muted small">Choose your path to success in the wholesale marketplace</p>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div 
              className={`card h-100 border-0 shadow-lg cursor-pointer ${selectedUserType === 'buyer' ? 'border-primary' : ''}`}
              onClick={() => handleUserTypeSelect('buyer')}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <div className="card-body p-4 text-center">
                <div className="mb-3">
                  <div className="bg-primary bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                    <i className="fas fa-shopping-cart fa-lg text-white"></i>
                  </div>
                </div>
                <h4 className="fw-bold mb-2">I Want to Buy Products</h4>
                <p className="text-muted small mb-3">
                  I'm looking to source products from Pakistani suppliers for my Amazon business or retail store.
                </p>
                
                <div className="row text-center mb-3">
                  <div className="col-4">
                    <div className="text-primary fw-bold small">500+</div>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Suppliers</small>
                  </div>
                  <div className="col-4">
                    <div className="text-success fw-bold small">250%</div>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Avg Markup</small>
                  </div>
                  <div className="col-4">
                    <div className="text-info fw-bold small">3 Days</div>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Response Time</small>
                  </div>
                </div>

                <button className="btn btn-primary w-100">
                  Start as Buyer
                  <i className="fas fa-arrow-right ms-2"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div 
              className={`card h-100 border-0 shadow-lg cursor-pointer ${selectedUserType === 'supplier' ? 'border-success' : ''}`}
              onClick={() => handleUserTypeSelect('supplier')}
              style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
            >
              <div className="card-body p-4 text-center">
                <div className="mb-3">
                  <div className="bg-success bg-gradient rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px' }}>
                    <i className="fas fa-store fa-lg text-white"></i>
                  </div>
                </div>
                <h4 className="fw-bold mb-2">I Want to Sell Products</h4>
                <p className="text-muted small mb-3">
                  I'm a manufacturer or supplier looking to connect with Amazon sellers and retailers.
                </p>
                
                <div className="row text-center mb-3">
                  <div className="col-4">
                    <div className="text-primary fw-bold small">2000+</div>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Buyers</small>
                  </div>
                  <div className="col-4">
                    <div className="text-success fw-bold small">Global</div>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Reach</small>
                  </div>
                  <div className="col-4">
                    <div className="text-info fw-bold small">Free</div>
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>Listing</small>
                  </div>
                </div>

                <button className="btn btn-success w-100">
                  Start as Supplier
                  <i className="fas fa-arrow-right ms-2"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="text-center mb-4">
          <h3 className="fw-bold mb-2">Tell Us About Your Business</h3>
          <p className="text-muted small">Help us personalize your experience and show your potential</p>
        </div>

        <div className="card border-0 shadow-lg">
          <div className="card-body p-4">
            <div className="mb-3">
              <label className="form-label fw-semibold small">What's your experience level?</label>
              <div className="row g-2">
                {[
                  { value: 'beginner', label: 'Just Starting', desc: 'New to Amazon/wholesale' },
                  { value: 'intermediate', label: 'Some Experience', desc: '6 months - 2 years' },
                  { value: 'advanced', label: 'Experienced', desc: '2+ years in business' }
                ].map(option => (
                  <div key={option.value} className="col-md-4">
                    <div 
                      className={`card border ${assessmentData.experience === option.value ? 'border-primary bg-primary bg-opacity-10' : 'border-light'}`}
                      onClick={() => handleAssessmentChange('experience', option.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="card-body text-center p-3">
                        <h6 className="mb-1">{option.label}</h6>
                        <small className="text-muted">{option.desc}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold small">What's your monthly volume target?</label>
              <div className="row g-2">
                {selectedUserType === 'buyer' ? [
                  { value: 'starter', label: '$1K - $5K', desc: 'Testing products' },
                  { value: 'growing', label: '$5K - $20K', desc: 'Scaling business' },
                  { value: 'established', label: '$20K - $50K', desc: 'Established seller' },
                  { value: 'enterprise', label: '$50K+', desc: 'Large operation' }
                ] : [
                  { value: 'starter', label: '$500 - $2K', desc: 'Small production' },
                  { value: 'growing', label: '$2K - $10K', desc: 'Growing capacity' },
                  { value: 'established', label: '$10K - $30K', desc: 'Established supplier' },
                  { value: 'enterprise', label: '$30K+', desc: 'Large manufacturer' }
                ].map(option => (
                  <div key={option.value} className="col-md-6">
                    <div 
                      className={`card border ${assessmentData.monthlyVolume === option.value ? 'border-success bg-success bg-opacity-10' : 'border-light'}`}
                      onClick={() => handleAssessmentChange('monthlyVolume', option.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="card-body text-center p-3">
                        <h6 className="mb-1">{option.label}</h6>
                        <small className="text-muted">{option.desc}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold small">What are your main challenges? (Select all that apply)</label>
              <div className="row g-1">
                {selectedUserType === 'buyer' ? [
                  'Finding reliable suppliers',
                  'Getting competitive prices',
                  'Quality assurance',
                  'Fast shipping times',
                  'Communication barriers',
                  'Minimum order quantities'
                ] : [
                  'Finding buyers',
                  'International marketing',
                  'Payment security',
                  'Quality standards',
                  'Shipping logistics',
                  'Competition pricing'
                ].map(challenge => (
                  <div key={challenge} className="col-md-6">
                    <div 
                      className={`card border ${assessmentData.challenges.includes(challenge) ? 'border-warning bg-warning bg-opacity-10' : 'border-light'}`}
                      onClick={() => handleChallengeToggle(challenge)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="card-body p-2 text-center">
                        <small>{challenge}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <button 
                className="btn btn-primary btn-lg px-5"
                onClick={() => setCurrentStep(3)}
                disabled={!assessmentData.experience || !assessmentData.monthlyVolume}
              >
                Show My Potential
                <i className="fas fa-arrow-right ms-2"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => {
    const benefits = getPersonalizedBenefits()
    const { potential, monthlyEarnings } = calculatePotential()

    return (
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="text-center mb-4">
            <h3 className="fw-bold mb-2">{benefits.title}</h3>
            <p className="text-success fw-bold mb-1">{benefits.subtitle}</p>
            <p className="text-muted small">Based on your profile and our platform data</p>
          </div>

          {/* Potential Earnings Card */}
          <div className="card border-0 shadow-lg mb-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            <div className="card-body p-4 text-white text-center">
              <h4 className="fw-bold mb-3">Your Earning Potential</h4>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-2">
                    <div className="h2 fw-bold">${monthlyEarnings.toLocaleString()}</div>
                    <div className="small">Monthly Potential</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-2">
                    <div className="h2 fw-bold">${potential.toLocaleString()}</div>
                    <div className="small">Annual Potential</div>
                  </div>
                </div>
              </div>
              <p className="mb-0 opacity-75 small">*Based on average performance of similar profiles on our platform</p>
            </div>
          </div>

          {/* Benefits Grid */}
          <div className="row g-3 mb-4">
            {benefits.benefits.map((benefit, index) => (
              <div key={index} className="col-md-6">
                <div className="card border-0 shadow h-100">
                  <div className="card-body p-4">
                    <div className="d-flex align-items-start">
                      <div className={`bg-${benefit.color} bg-gradient rounded-circle d-flex align-items-center justify-content-center me-3`} style={{ width: '50px', height: '50px', minWidth: '50px' }}>
                        <i className={`${benefit.icon} text-white`}></i>
                      </div>
                      <div>
                        <h5 className="fw-bold mb-2">{benefit.title}</h5>
                        <p className="text-muted mb-0">{benefit.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="text-center">
            <div className="d-flex gap-3 justify-content-center flex-wrap">
              <Link 
                to={selectedUserType === 'buyer' ? '/register/buyer' : '/register/supplier'}
                className={`btn ${selectedUserType === 'buyer' ? 'btn-primary' : 'btn-success'} btn-lg px-5`}
              >
                <i className="fas fa-rocket me-2"></i>
                Get Started Now
              </Link>
              <button 
                className="btn btn-outline-secondary btn-lg px-4"
                onClick={() => setCurrentStep(1)}
              >
                <i className="fas fa-arrow-left me-2"></i>
                Start Over
              </button>
            </div>
            <p className="text-muted mt-3 small">
              <i className="fas fa-lock me-1"></i>
              100% Free to join • No hidden fees • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-light py-4">
      <div className="container">
        {/* Progress Bar */}
        <div className="row justify-content-center mb-4">
          <div className="col-lg-6">
            <div className="progress" style={{ height: '6px' }}>
              <div 
                className="progress-bar bg-primary" 
                style={{ width: `${(currentStep / 3) * 100}%`, transition: 'width 0.3s ease' }}
              ></div>
            </div>
            <div className="d-flex justify-content-between mt-1">
              <small className={currentStep >= 1 ? 'text-primary fw-bold' : 'text-muted'} style={{ fontSize: '0.75rem' }}>Choose Path</small>
              <small className={currentStep >= 2 ? 'text-primary fw-bold' : 'text-muted'} style={{ fontSize: '0.75rem' }}>Assessment</small>
              <small className={currentStep >= 3 ? 'text-primary fw-bold' : 'text-muted'} style={{ fontSize: '0.75rem' }}>Your Potential</small>
            </div>
          </div>
        </div>

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}

        {/* Back to Home */}
        <div className="text-center mt-3">
          <Link to="/" className="btn btn-outline-secondary btn-sm">
            <i className="fas fa-home me-1"></i>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default JoinNow