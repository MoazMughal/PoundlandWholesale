import { useState } from 'react'
import ScrollToTop from '../components/ScrollToTop'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate form
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert('Please fill in all required fields.')
      return
    }
    
    // Show success message
    alert('Thank you for your message! We will get back to you soon.')
    
    // Reset form
    setFormData({ name: '', email: '', subject: '', message: '' })
  }

  return (
    <div>
      {/* Contact Page */}
      <div className="section-padding">
        <div className="container">
          <div className="section-header text-center mb-5">
            <h2 className="section-title modern-title">Get In Touch</h2>
            <p className="section-subtitle">We're here to help you grow your Amazon business</p>
          </div>

          {/* Contact Form */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="contact-form">
                <h5 className="mb-3">Send us a Message</h5>
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label htmlFor="name" className="form-label" style={{fontSize: '0.9rem', fontWeight: '600'}}>Your Name *</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="name" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required 
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label htmlFor="email" className="form-label" style={{fontSize: '0.9rem', fontWeight: '600'}}>Email Address *</label>
                      <input 
                        type="email" 
                        className="form-control" 
                        id="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="subject" className="form-label" style={{fontSize: '0.9rem', fontWeight: '600'}}>Subject *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      id="subject" 
                      name="subject"
                      value={formData.subject}
                      onChange={handleChange}
                      required 
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="message" className="form-label" style={{fontSize: '0.9rem', fontWeight: '600'}}>Message *</label>
                    <textarea 
                      className="form-control" 
                      id="message" 
                      name="message"
                      rows="5" 
                      value={formData.message}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>
                  
                  <div className="d-flex justify-content-end">
                    <button type="submit" className="btn btn-primary btn-sm">Send Message</button>
                  </div>
                </form>
                <p className="mt-3 text-muted">
                  <small>Clicking Send will open WhatsApp with your message prefilled (if configured), or show a confirmation. Make sure WhatsApp is installed or use WhatsApp Web.</small>
                </p>
              </div>
            </div>
          </div>

          {/* Map + Contact Details */}
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="map-container">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3403.123456789!2d74.3583!3d31.5495!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39190483e58107d9%3A0x23b862d4c8b8b8b8!2sDilawer%20Cheema%20Khurd%2C%20Pakistan!5e0!3m2!1sen!2s!4v1234567890!5m2!1sen!2s" 
                  allowFullScreen="" 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                  style={{width: '100%', height: '260px', border: 'none', borderRadius: '15px'}}
                >
                </iframe>
              </div>

              <div className="hours-card mt-3">
                <h5 className="mb-3"><i className="fas fa-clock me-2 text-primary"></i>Business Hours</h5>
                <div className="row">
                  <div className="col-6">
                    <p className="mb-1"><strong>Monday - Friday</strong></p>
                    <p className="text-muted mb-0">9:00 AM - 6:00 PM</p>
                  </div>
                  <div className="col-6">
                    <p className="mb-1"><strong>Saturday</strong></p>
                    <p className="text-muted mb-0">10:00 AM - 4:00 PM</p>
                  </div>
                </div>
                <p className="mt-3 text-muted small mb-0">Sunday: Closed</p>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="row gy-3">
                <div className="col-md-12">
                  <div className="contact-card">
                    <div className="contact-icon"><i className="fas fa-map-marker-alt"></i></div>
                    <div className="contact-info">
                      <h5>Our Location</h5>
                      <p><strong>Generic Wholesale Pvt Ltd</strong></p>
                      <p>Dilawer Cheema Khurd, 52061</p>
                      <p>Pakistan</p>
                    </div>
                  </div>
                </div>

                <div className="col-md-12">
                  <div className="contact-card">
                    <div className="contact-icon"><i className="fas fa-phone-alt"></i></div>
                    <div className="contact-info">
                      <h5>Phone Numbers</h5>
                      <p className="mb-2"> +92-303-4928000<br />+92-304-4928000</p>
                      <a href="https://wa.me/+923044928000" className="btn btn-success" target="_blank" rel="noopener noreferrer">
                        <i className="fab fa-whatsapp me-2"></i> Chat on WhatsApp
                      </a>
                    </div>
                  </div>
                </div>

                <div className="col-md-12">
                  <div className="contact-card">
                    <div className="contact-icon"><i className="fas fa-envelope"></i></div>
                    <div className="contact-info">
                      <h5>Email Address</h5>
                      <p>admin@amazongymkhana.pk</p>
                      <p>info@amazongymkhana.pk</p>
                      <p>support@amazongymkhana.pk</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />

      <style jsx>{`
        .section-padding {
          padding: 40px 0;
        }
        
        .section-title {
          font-weight: 700;
          margin-bottom: 16px;
          position: relative;
          padding-bottom: 8px;
          color: #2d3748;
          font-size: 1.8rem;
          text-align: center;
        }
        
        .section-title:after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 80px;
          height: 4px;
          background-color: var(--bs-primary);
          border-radius: 2px;
        }
        
        .contact-form {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.06);
          margin-bottom: 16px;
        }
        
        .form-control, .form-select {
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 0.9rem;
          transition: all 0.3s ease;
        }
        
        .form-control:focus, .form-select:focus {
          border-color: var(--bs-primary);
          box-shadow: 0 0 0 3px rgba(255, 153, 0, 0.08);
        }
        
        .map-container {
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 8px 25px rgba(0,0,0,0.08);
          margin-bottom: 16px;
          min-height: 260px;
        }
        
        .hours-card {
          background: white;
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.06);
        }
        
        .contact-card {
          background: white;
          border-radius: 12px;
          padding: 18px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.06);
          height: 100%;
          transition: transform 0.25s ease;
          text-align: center;
        }
        
        .contact-card:hover {
          transform: translateY(-2px);
        }
        
        .contact-icon {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, var(--bs-primary), #ff6600);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          margin: 0 auto 12px;
        }
        
        .contact-info h5 {
          font-weight: 600;
          margin-bottom: 8px;
          color: #2d3748;
          font-size: 1.1rem;
        }
        
        .contact-info p {
          margin-bottom: 4px;
          color: #6b7280;
          font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
          .section-padding {
            padding: 40px 0;
          }
          
          .section-title {
            font-size: 1.8rem;
          }
          
          .contact-card {
            margin-bottom: 14px;
          }
        }
      `}</style>
    </div>
  )
}

export default Contact