import { Link } from 'react-router-dom'

const TermsOfService = () => {
  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-body p-5">
              <h1 className="text-center mb-4">Terms of Service</h1>
              <p className="text-muted text-center mb-5">Last updated: {new Date().toLocaleDateString()}</p>

              <section className="mb-4">
                <h3>1. Acceptance of Terms</h3>
                <p>By accessing and using Generic Wholesale ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.</p>
              </section>

              <section className="mb-4">
                <h3>2. Description of Service</h3>
                <p>Generic Wholesale is a B2B marketplace platform that connects wholesale suppliers with buyers. We provide a platform for:</p>
                <ul>
                  <li>Product listings and catalog management</li>
                  <li>Supplier verification and communication</li>
                  <li>Order management and tracking</li>
                  <li>Payment processing facilitation</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3>3. User Accounts</h3>
                <p>To access certain features, you must create an account. You are responsible for:</p>
                <ul>
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Providing accurate and complete information</li>
                  <li>Updating your information as necessary</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3>4. Prohibited Uses</h3>
                <p>You may not use our service:</p>
                <ul>
                  <li>For any unlawful purpose or to solicit others to unlawful acts</li>
                  <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                  <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                  <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                  <li>To submit false or misleading information</li>
                </ul>
              </section>

              <section className="mb-4">
                <h3>5. Products and Services</h3>
                <p>All products and services are subject to availability. We reserve the right to discontinue any product at any time. Prices are subject to change without notice.</p>
              </section>

              <section className="mb-4">
                <h3>6. Payment Terms</h3>
                <p>Payment processing is handled through secure third-party providers. By making a purchase, you agree to provide current, complete, and accurate purchase and account information.</p>
              </section>

              <section className="mb-4">
                <h3>7. Limitation of Liability</h3>
                <p>Generic Wholesale shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.</p>
              </section>

              <section className="mb-4">
                <h3>8. Governing Law</h3>
                <p>These Terms shall be interpreted and governed by the laws of Pakistan, without regard to its conflict of law provisions.</p>
              </section>

              <section className="mb-4">
                <h3>9. Contact Information</h3>
                <p>If you have any questions about these Terms of Service, please contact us:</p>
                <ul>
                  <li>Email: support@genericwholesale.pk</li>
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
    </div>
  )
}

export default TermsOfService