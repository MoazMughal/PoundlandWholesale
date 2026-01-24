import { Link } from 'react-router-dom'
import ScrollToTop from '../../components/ScrollToTop'

const PrivacyPolicy = () => {
  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-5">
              <h1 className="text-center mb-4">Privacy Policy</h1>
              <p className="text-muted text-center mb-5">Last updated: {new Date().toLocaleDateString()}</p>

              <section className="mb-4">
                <h3>1. Information We Collect</h3>
                <p>We collect information you provide directly to us, such as when you:</p>
                <ul>
                  <li>Create an account</li>
                  <li>Make a purchase or transaction</li>
                  <li>Contact us for support</li>
                  <li>Subscribe to our newsletter</li>
                </ul>
                <p>This may include your name, email address, phone number, business information, and payment details.</p>
              </section>

              <section className="mb-4">
                <h3>2. How We Use Your Information</h3>
                <p>We use the information we collect to:</p>
                <ul>
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices and support messages</li>
                  <li>Communicate with you about products, services, and events</li>
                  <li>Monitor and analyze trends and usage</li>
                  <li>Detect, investigate, and prevent fraudulent transactions</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3>3. Information Sharing</h3>
                <p>We do not sell, trade, or otherwise transfer your personal information to third parties except:</p>
                <ul>
                  <li>With your consent</li>
                  <li>To trusted service providers who assist us in operating our platform</li>
                  <li>When required by law or to protect our rights</li>
                  <li>In connection with a merger, acquisition, or sale of assets</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3>4. Data Security</h3>
                <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.</p>
              </section>

              <section className="mb-4">
                <h3>5. Cookies and Tracking</h3>
                <p>We use cookies and similar tracking technologies to:</p>
                <ul>
                  <li>Remember your preferences and settings</li>
                  <li>Analyze site traffic and usage patterns</li>
                  <li>Provide personalized content and advertisements</li>
                  <li>Improve our services</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3>6. Your Rights</h3>
                <p>You have the right to:</p>
                <ul>
                  <li>Access and update your personal information</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Request a copy of your data</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3>7. Children's Privacy</h3>
                <p>Our service is not intended for children under 18. We do not knowingly collect personal information from children under 18.</p>
              </section>

              <section className="mb-4">
                <h3>8. Changes to Privacy Policy</h3>
                <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>
              </section>

              <section className="mb-4">
                <h3>9. Contact Us</h3>
                <p>If you have any questions about this Privacy Policy, please contact us:</p>
                <ul>
                  <li>Email: privacy@poundlandwholesale.com</li>
                  <li>Phone: +92 301 6611011</li>
                  <li>Address: Karachi, Pakistan</li>
                </ul>
              </section>

              <div className="text-center mt-5">
                <Link to="/" className="btn btn-primary">Back to Home</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ScrollToTop />
    </div>
  )
}

export default PrivacyPolicy