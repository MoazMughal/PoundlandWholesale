import { useState } from 'react';
import ScrollToTop from '../components/ScrollToTop';

const AboutUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      alert('Please fill in all required fields.');
      return;
    }
    
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div style={{ background: '#f8f9fa' }}>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #f46709ff 0%, #764ba2 100%)',
        padding: '20px 20px',
        color: '#fff',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '20px' }}>
            About PoundlandWholesale.com
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.95 }}>
            Your trusted partner for wholesale products and Amazon FBA success
          </p>
        </div>
      </div>

      {/* About Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px 20px' }}>
        
        {/* Mission Section */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '20px', color: '#111' }}>
            Our Mission
          </h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#555', marginBottom: '20px' }}>
            We connect wholesale suppliers with Amazon sellers, providing high-quality products at competitive prices. 
            Our platform makes it easy to find trending products, calculate profits, and grow your e-commerce business.
          </p>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#555' }}>
            With thousands of products across multiple categories, we help entrepreneurs build successful Amazon FBA businesses 
            by offering verified suppliers, transparent pricing, and detailed profit calculations.
          </p>
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📦</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '10px', color: '#111' }}>
              10,000+ Products
            </h3>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              Wide range of products across multiple categories
            </p>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✅</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '10px', color: '#111' }}>
              Verified Suppliers
            </h3>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              All suppliers are verified and quality-checked
            </p>
          </div>

          <div style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '30px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '15px' }}>💰</div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '10px', color: '#111' }}>
              Profit Calculator
            </h3>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              See potential profits before you buy
            </p>
          </div>
        </div>

        {/* Contact Section */}
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '40px',
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '30px', color: '#111', textAlign: 'center' }}>
            Get In Touch
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '30px',
            marginBottom: '40px'
          }}>
            {/* Contact Info */}
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', color: '#111' }}>
                Contact Information
              </h3>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📧</span>
                  <div>
                    <div style={{ fontWeight: '600', color: '#111' }}>Email</div>
                    <a href="mailto:info@poundlandwholesale.com" style={{ color: '#667eea', textDecoration: 'none' }}>
                      info@poundlandwholesale.com
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📱</span>
                  <div>
                    <div style={{ fontWeight: '600', color: '#111' }}>Phone</div>
                    <a href="tel:+447123456789" style={{ color: '#667eea', textDecoration: 'none' }}>
                      +44 7123 456789
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>💬</span>
                  <div>
                    <div style={{ fontWeight: '600', color: '#111' }}>WhatsApp</div>
                    <a href="https://wa.me/447123456789" target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', textDecoration: 'none' }}>
                      +44 7123 456789
                    </a>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '1.5rem' }}>📍</span>
                  <div>
                    <div style={{ fontWeight: '600', color: '#111' }}>Location</div>
                    <div style={{ color: '#666' }}>United Kingdom</div>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '10px', color: '#111' }}>
                  Find Us
                </h4>
                <div style={{
                  width: '100%',
                  height: '250px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb'
                }}>
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3619.2!2d67.0!3d24.86!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDUxJzM2LjAiTiA2N8KwMDAnMDAuMCJF!5e0!3m2!1sen!2s!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '20px', color: '#111' }}>
                Send us a Message
              </h3>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your Name *"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Your Email *"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="Subject *"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Your Message *"
                    required
                    rows="5"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
};

export default AboutUs;
