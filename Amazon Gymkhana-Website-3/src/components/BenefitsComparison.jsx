import { Link } from 'react-router-dom'

const BenefitsComparison = () => {
  const buyerBenefits = [
    { icon: "fas fa-tags", title: "Wholesale Prices", desc: "Up to 70% off retail prices" },
    { icon: "fas fa-shield-alt", title: "Verified Suppliers", desc: "500+ pre-vetted Pakistani suppliers" },
    { icon: "fas fa-shipping-fast", title: "Fast Sourcing", desc: "3-day average response time" },
    { icon: "fas fa-chart-line", title: "Profit Tools", desc: "Built-in profit calculators" },
    { icon: "fas fa-headset", title: "Support", desc: "Dedicated account manager" },
    { icon: "fas fa-globe", title: "Global Shipping", desc: "Worldwide delivery options" }
  ]

  const supplierBenefits = [
    { icon: "fas fa-users", title: "Buyer Network", desc: "2000+ active wholesale buyers" },
    { icon: "fas fa-store", title: "Free Listings", desc: "Professional product listings" },
    { icon: "fas fa-handshake", title: "Direct Connect", desc: "WhatsApp business integration" },
    { icon: "fas fa-chart-bar", title: "Analytics", desc: "Market insights and trends" },
    { icon: "fas fa-graduation-cap", title: "Training", desc: "Wholesale business masterclass" },
    { icon: "fas fa-dollar-sign", title: "Higher Margins", desc: "Cut out middlemen costs" }
  ]

  return (
    <div className="benefits-comparison py-5">
      <div className="container">
        <div className="text-center mb-5">
          <h2 className="fw-bold mb-3">Why Choose Generic Wholesale?</h2>
          <p className="text-muted">Compare what you get as a buyer vs supplier</p>
        </div>

        <div className="row g-4">
          {/* Buyer Benefits */}
          <div className="col-lg-6">
            <div className="card border-primary h-100">
              <div className="card-header bg-primary text-white text-center py-3">
                <h4 className="fw-bold mb-0">
                  <i className="fas fa-shopping-cart me-2"></i>
                  For Buyers
                </h4>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  {buyerBenefits.map((benefit, index) => (
                    <div key={index} className="col-12">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                          <i className={`${benefit.icon} text-primary`}></i>
                        </div>
                        <div>
                          <h6 className="fw-bold mb-1">{benefit.title}</h6>
                          <small className="text-muted">{benefit.desc}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-4">
                  <Link to="/join-now" className="btn btn-primary btn-lg w-100">
                    Start as Buyer
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Benefits */}
          <div className="col-lg-6">
            <div className="card border-success h-100">
              <div className="card-header bg-success text-white text-center py-3">
                <h4 className="fw-bold mb-0">
                  <i className="fas fa-store me-2"></i>
                  For Suppliers
                </h4>
              </div>
              <div className="card-body p-4">
                <div className="row g-3">
                  {supplierBenefits.map((benefit, index) => (
                    <div key={index} className="col-12">
                      <div className="d-flex align-items-center">
                        <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                          <i className={`${benefit.icon} text-success`}></i>
                        </div>
                        <div>
                          <h6 className="fw-bold mb-1">{benefit.title}</h6>
                          <small className="text-muted">{benefit.desc}</small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-4">
                  <Link to="/join-now" className="btn btn-success btn-lg w-100">
                    Start as Supplier
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-5">
          <div className="card bg-light border-0">
            <div className="card-body p-4">
              <h5 className="fw-bold mb-3">Not sure which path is right for you?</h5>
              <p className="text-muted mb-3">Take our quick assessment to discover your potential</p>
              <Link to="/join-now" className="btn btn-outline-primary btn-lg">
                <i className="fas fa-compass me-2"></i>
                Find My Path
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BenefitsComparison