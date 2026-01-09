import { Link } from 'react-router-dom'
import ScrollToTop from '../components/ScrollToTop'

// Import category images
import watchStrapImg from '../assets/main-pics/Watch Strap.jpg'
import tapeImg from '../assets/main-pics/Black-T.jpg'
import lampshadeImg from '../assets/main-pics/Red-Lampshade.jpg'
import partyImg from '../assets/main-pics/whiteFairy.jpg'
import kitchenImg from '../assets/main-pics/forks.jpg'
import electronicsImg from '../assets/main-pics/Charger Cable.jpg'
import jewelryImg from '../assets/main-pics/nose ring.jpg'
import homeImg from '../assets/main-pics/laces.jpg'
import automotiveImg from '../assets/main-pics/Car Bulbs.jpg'
import fashionImg from '../assets/main-pics/Sunglasses.jpg'
import cakeTopperImg from '../assets/main-pics/Cake Topper.jpg'
import inflatableImg from '../assets/main-pics/Inflatable Dolphin.jpg'
import remoteImg from '../assets/main-pics/LG-Remote.jpg'
import stickerImg from '../assets/main-pics/Security Stickers.jpg'

const Categories = () => {
  const categories = [
    {
      name: 'Watch Straps',
      description: 'Premium leather, nylon, and metal watch straps',
      image: watchStrapImg,
      link: '/amazons-choice?cat=strap',
      searchTerm: 'Watch Straps',
      icon: 'fa-watch',
      color: '#8b5cf6'
    },
    {
      name: 'Tape Products',
      description: 'Duct tape, gaffer tape, and specialty tapes',
      image: tapeImg,
      link: '/amazons-choice?cat=tape',
      searchTerm: 'Tape Products',
      icon: 'fa-tape',
      color: '#ec4899'
    },
    {
      name: 'Lampshades',
      description: 'Paper, fabric, and bamboo lampshades',
      image: lampshadeImg,
      link: '/amazons-choice?cat=lampshade',
      searchTerm: 'Lampshades',
      icon: 'fa-lightbulb',
      color: '#f59e0b'
    },
    {
      name: 'Party Supplies',
      description: 'Balloons, inflatables, decorations, and party essentials',
      image: partyImg,
      link: '/amazons-choice?cat=party',
      searchTerm: 'Party Supplies',
      icon: 'fa-birthday-cake',
      color: '#10b981'
    },
    {
      name: 'Kitchen',
      description: 'Cutlery, utensils, measuring jugs, and accessories',
      image: kitchenImg,
      link: '/amazons-choice?cat=kitchen',
      searchTerm: 'Kitchen Products',
      icon: 'fa-utensils',
      color: '#3b82f6'
    },
    {
      name: 'Electronics',
      description: 'Charging cables, adapters, bulbs, and accessories',
      image: electronicsImg,
      link: '/amazons-choice?cat=electronics',
      searchTerm: 'Electronics',
      icon: 'fa-plug',
      color: '#6366f1'
    },
    {
      name: 'Jewelry',
      description: 'Nose rings, earrings, and fashion jewelry',
      image: jewelryImg,
      link: '/amazons-choice?cat=jewelry',
      searchTerm: 'Jewelry',
      icon: 'fa-gem',
      color: '#ef4444'
    },
    {
      name: 'Home & Decor',
      description: 'Home accessories, decorations, and organizational items',
      image: homeImg,
      link: '/amazons-choice?cat=home',
      searchTerm: 'Home Decor',
      icon: 'fa-home',
      color: '#14b8a6'
    },
    {
      name: 'Automotive',
      description: 'Car accessories, bulbs, and maintenance products',
      image: automotiveImg,
      link: '/amazons-choice?cat=automotive',
      searchTerm: 'Automotive',
      icon: 'fa-car',
      color: '#f97316'
    },
    {
      name: 'Remote Controls',
      description: 'TV remotes, universal remotes, and accessories',
      image: remoteImg,
      link: '/amazons-choice?cat=remote',
      searchTerm: 'Remote Controls',
      icon: 'fa-tv',
      color: '#06b6d4'
    },
    {
      name: 'Stickers',
      description: 'Decorative stickers, labels, and decals',
      image: stickerImg,
      link: '/amazons-choice?cat=sticker',
      searchTerm: 'Stickers',
      icon: 'fa-star',
      color: '#a855f7'
    },
    {
      name: 'Party Decorations',
      description: 'Cake toppers, banners, and party decoration items',
      image: cakeTopperImg,
      link: '/amazons-choice?cat=party',
      searchTerm: 'Party Decorations',
      icon: 'fa-gifts',
      color: '#84cc16'
    },
    {
      name: 'Inflatables',
      description: 'Inflatable toys, animals, and party inflatables',
      image: inflatableImg,
      link: '/amazons-choice?cat=party',
      searchTerm: 'Inflatables',
      icon: 'fa-swimming-pool',
      color: '#0ea5e9'
    }
  ]

  const verifyOnAmazon = (categoryName) => {
    const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(categoryName)}`
    window.open(amazonUrl, '_blank')
  }

  return (
    <div style={{padding: '20px 0', background: 'linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%)'}}>
      <div className="container">
        {/* Header with Stats */}
        <div style={{textAlign: 'center', marginBottom: '20px'}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
            <h2 className="section-title" style={{fontSize: '1.8rem', marginBottom: '0', fontWeight: '800'}}>
              Product Categories
            </h2>
            <span style={{
              background: 'linear-gradient(135deg, #ff9900, #ff6600)',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: '700',
              boxShadow: '0 2px 8px rgba(255, 153, 0, 0.3)'
            }}>
              {categories.length} Categories
            </span>
          </div>
          <p style={{color: '#6b7280', maxWidth: '700px', margin: '0 auto', fontSize: '0.9rem', lineHeight: '1.5'}}>
            All categories are verified sellers/products. Browse our extensive collection of Amazon's Choice products across various categories.
          </p>
        </div>

        {/* Categories Grid - 5 per row */}
        <div className="row g-3">
          {categories.map((category, index) => (
            <div key={index} className="col-6 col-sm-4 col-md-3 col-lg-2-4">
              <Link to={category.link} style={{textDecoration: 'none', color: 'inherit'}}>
                <div className="card product-card category-card" style={{position: 'relative', overflow: 'visible', cursor: 'pointer'}}>
                  {/* Icon Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '10px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: category.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10
                  }}>
                    <i className={`fas ${category.icon}`}></i>
                  </div>

                  <img src={category.image} className="card-img-top" alt={category.name} style={{background: '#ffffff'}} />
                  <div className="card-body text-center">
                    <h4 className="card-title">{category.name}</h4>
                    <p className="card-text">{category.description}</p>
                    <div className="btn btn-primary" style={{pointerEvents: 'none'}}>
                      Browse Products
                    </div>
                    <button 
                      className="verify-amazon-btn" 
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        verifyOnAmazon(category.searchTerm)
                      }}
                      style={{pointerEvents: 'auto'}}
                    >
                      <i className="fab fa-amazon"></i> Verify on Amazon
                    </button>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{
          textAlign: 'center',
          marginTop: '40px',
          padding: '30px',
          background: 'linear-gradient(135deg, #232f3e, #37475a)',
          borderRadius: '12px',
          color: 'white'
        }}>
          <h3 style={{fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px'}}>
            Can't Find What You're Looking For?
          </h3>
          <p style={{marginBottom: '20px', opacity: 0.9}}>
            Join our community to request new categories or list your own products
          </p>
          <div style={{display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap'}}>
            <Link to="/contact" className="btn btn-light" style={{
              background: 'white',
              color: '#232f3e',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              textDecoration: 'none',
              border: 'none'
            }}>
              <i className="fas fa-envelope me-2"></i>Contact Us
            </Link>
            <Link to="/auth" className="btn" style={{
              background: '#ff9900',
              color: 'white',
              padding: '10px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              textDecoration: 'none',
              border: 'none'
            }}>
              <i className="fas fa-user-plus me-2"></i>Join Community
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  )
}

export default Categories
