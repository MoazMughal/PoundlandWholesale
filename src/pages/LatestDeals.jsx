import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ScrollToTop from '../components/ScrollToTop'

// Import sample images
import noseRingImg from '../assets/main-pics/nose ring.jpg'
import spoonImg from '../assets/main-pics/Spoon.jpg'
import bulbImg from '../assets/main-pics/Light Bulb.jpg'
import watchImg from '../assets/main-pics/Black Watch.jpg'
import lampshadeImg from '../assets/main-pics/Black Lampshade.jpg'
import balloonImg from '../assets/main-pics/Balloons.jpg'
import remoteImg from '../assets/main-pics/LG-Remote.jpg'
import glassImg from '../assets/main-pics/Glass-580.jpg'
import watchStrapImg from '../assets/main-pics/Watch Strap.jpg'
import tapeImg from '../assets/main-pics/Black-T.jpg'
import fairyImg from '../assets/main-pics/whiteFairy.jpg'
import forksImg from '../assets/main-pics/forks.jpg'
import cableImg from '../assets/main-pics/Charger Cable.jpg'
import lacesImg from '../assets/main-pics/laces.jpg'
import carBulbImg from '../assets/main-pics/Car Bulbs.jpg'
import sunglassesImg from '../assets/main-pics/Sunglasses.jpg'

const LatestDeals = () => {
  const navigate = useNavigate()
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [currency, setCurrency] = useState('PKR')
  const [mainTimer, setMainTimer] = useState({ hours: 23, minutes: 45, seconds: 30 })
  const [dealTimers, setDealTimers] = useState({})
  const [visibleDeals, setVisibleDeals] = useState(8)

  // Currency conversion rates - Manual rates
  const currencyRates = {
    PKR: 1,
    GBP: 0.00272,   // 1 GBP = 367.74 PKR
    USD: 0.00353,   // 1 USD = 283.32 PKR
    AED: 0.01310,   // 1 AED = 76.37 PKR
    USD: 0.0036
  }

  const currencySymbols = {
    PKR: 'Rs.',
    GBP: '£',
    USD: '$'
  }

  const filters = [
    { id: 'all', name: 'All Deals', icon: 'fas fa-fire' },
    { id: 'lightning', name: 'Lightning Deals', icon: 'fas fa-bolt' },
    { id: 'daily', name: 'Deal of the Day', icon: 'fas fa-star' },
    { id: 'clearance', name: 'Clearance', icon: 'fas fa-tags' }
  ]

  const cities = [
    { name: 'Karachi', country: 'Pakistan' },
    { name: 'Lahore', country: 'Pakistan' },
    { name: 'Islamabad', country: 'Pakistan' },
    { name: 'Faisalabad', country: 'Pakistan' },
    { name: 'Multan', country: 'Pakistan' },
    { name: 'Peshawar', country: 'Pakistan' },
    { name: 'Rawalpindi', country: 'Pakistan' },
    { name: 'Sialkot', country: 'Pakistan' },
    { name: 'London', country: 'UK' },
    { name: 'Manchester', country: 'UK' },
    { name: 'Birmingham', country: 'UK' }
  ]

  const deals = [
    {
      id: 1,
      name: "Premium Surgical Steel Nose Ring Set - 20 Pieces",
      price: 299,
      originalPrice: 599,
      discount: 50,
      image: noseRingImg,
      rating: 4.5,
      reviews: 128,
      markup: "50% Profit",
      location: cities[0],
      timeLeft: { hours: 2, minutes: 45, seconds: 30 },
      dealType: 'lightning',
      claimed: 234,
      totalStock: 500
    },
    {
      id: 2,
      name: "LED Light Bulb 9W Energy Saving - Pack of 6",
      price: 450,
      originalPrice: 799,
      discount: 44,
      image: bulbImg,
      rating: 4.7,
      reviews: 234,
      markup: "40% Profit",
      location: cities[1],
      timeLeft: { hours: 5, minutes: 20, seconds: 15 },
      dealType: 'daily',
      claimed: 567,
      totalStock: 1000
    },
    {
      id: 3,
      name: "Smart Watch with Heart Rate Monitor",
      price: 2999,
      originalPrice: 4999,
      discount: 40,
      image: watchImg,
      rating: 4.3,
      reviews: 156,
      markup: "35% Profit",
      location: cities[2],
      timeLeft: { hours: 1, minutes: 15, seconds: 45 },
      dealType: 'lightning',
      claimed: 89,
      totalStock: 200
    },
    {
      id: 4,
      name: "Disposable Plastic Spoon Set (100pcs)",
      price: 199,
      originalPrice: 399,
      discount: 50,
      image: spoonImg,
      rating: 4.2,
      reviews: 89,
      markup: "45% Profit",
      location: cities[3],
      timeLeft: { hours: 8, minutes: 30, seconds: 20 },
      dealType: 'clearance',
      claimed: 345,
      totalStock: 800
    },
    {
      id: 5,
      name: "Modern Table Lampshade - Designer Collection",
      price: 899,
      originalPrice: 1599,
      discount: 44,
      image: lampshadeImg,
      rating: 4.4,
      reviews: 92,
      markup: "48% Profit",
      location: cities[4],
      timeLeft: { hours: 3, minutes: 10, seconds: 55 },
      dealType: 'daily',
      claimed: 156,
      totalStock: 300
    },
    {
      id: 6,
      name: "Party Balloon Set (50pcs) - Mixed Colors",
      price: 350,
      originalPrice: 599,
      discount: 42,
      image: balloonImg,
      rating: 4.1,
      reviews: 67,
      markup: "42% Profit",
      location: cities[5],
      timeLeft: { hours: 6, minutes: 45, seconds: 10 },
      dealType: 'lightning',
      claimed: 423,
      totalStock: 600
    },
    {
      id: 7,
      name: "Universal TV Remote Control - All Brands",
      price: 599,
      originalPrice: 999,
      discount: 40,
      image: remoteImg,
      rating: 4.0,
      reviews: 145,
      markup: "38% Profit",
      location: cities[6],
      timeLeft: { hours: 4, minutes: 55, seconds: 35 },
      dealType: 'clearance',
      claimed: 278,
      totalStock: 500
    },
    {
      id: 8,
      name: "Glass Water Bottle 580ml - BPA Free",
      price: 799,
      originalPrice: 1299,
      discount: 38,
      image: glassImg,
      rating: 4.6,
      reviews: 203,
      markup: "44% Profit",
      location: cities[7],
      timeLeft: { hours: 7, minutes: 20, seconds: 50 },
      dealType: 'daily',
      claimed: 512,
      totalStock: 900
    },
    {
      id: 9,
      name: "Black NATO Watch Strap - Premium Quality",
      price: 499,
      originalPrice: 899,
      discount: 45,
      image: watchStrapImg,
      rating: 4.5,
      reviews: 178,
      markup: "52% Profit",
      location: cities[8],
      timeLeft: { hours: 2, minutes: 30, seconds: 25 },
      dealType: 'lightning',
      claimed: 156,
      totalStock: 350
    },
    {
      id: 10,
      name: "Black Gaffer Tape - Professional Grade",
      price: 399,
      originalPrice: 699,
      discount: 43,
      image: tapeImg,
      rating: 4.3,
      reviews: 92,
      markup: "46% Profit",
      location: cities[9],
      timeLeft: { hours: 5, minutes: 15, seconds: 40 },
      dealType: 'daily',
      claimed: 234,
      totalStock: 500
    },
    {
      id: 11,
      name: "Large White Glitter Fairy Wings",
      price: 1299,
      originalPrice: 2199,
      discount: 41,
      image: fairyImg,
      rating: 4.6,
      reviews: 145,
      markup: "48% Profit",
      location: cities[10],
      timeLeft: { hours: 3, minutes: 45, seconds: 15 },
      dealType: 'clearance',
      claimed: 89,
      totalStock: 200
    },
    {
      id: 12,
      name: "Clear Reusable Forks 150pcs",
      price: 299,
      originalPrice: 549,
      discount: 46,
      image: forksImg,
      rating: 4.5,
      reviews: 167,
      markup: "50% Profit",
      location: cities[0],
      timeLeft: { hours: 4, minutes: 20, seconds: 30 },
      dealType: 'lightning',
      claimed: 312,
      totalStock: 600
    },
    {
      id: 13,
      name: "1M USB Charger Cable - Fast Charging",
      price: 249,
      originalPrice: 449,
      discount: 45,
      image: cableImg,
      rating: 4.4,
      reviews: 198,
      markup: "44% Profit",
      location: cities[1],
      timeLeft: { hours: 6, minutes: 10, seconds: 20 },
      dealType: 'daily',
      claimed: 445,
      totalStock: 800
    },
    {
      id: 14,
      name: "Colorful Shoe Laces - 5 Pairs",
      price: 199,
      originalPrice: 349,
      discount: 43,
      image: lacesImg,
      rating: 4.2,
      reviews: 134,
      markup: "42% Profit",
      location: cities[2],
      timeLeft: { hours: 7, minutes: 35, seconds: 45 },
      dealType: 'clearance',
      claimed: 267,
      totalStock: 550
    },
    {
      id: 15,
      name: "Car Halogen Bulbs H7 - Pack of 2",
      price: 599,
      originalPrice: 999,
      discount: 40,
      image: carBulbImg,
      rating: 4.5,
      reviews: 156,
      markup: "46% Profit",
      location: cities[3],
      timeLeft: { hours: 2, minutes: 50, seconds: 10 },
      dealType: 'lightning',
      claimed: 178,
      totalStock: 400
    },
    {
      id: 16,
      name: "Fashion Sunglasses - UV Protection",
      price: 799,
      originalPrice: 1399,
      discount: 43,
      image: sunglassesImg,
      rating: 4.3,
      reviews: 189,
      markup: "48% Profit",
      location: cities[4],
      timeLeft: { hours: 5, minutes: 25, seconds: 55 },
      dealType: 'daily',
      claimed: 234,
      totalStock: 500
    }
  ]

  const filteredDeals = selectedFilter === 'all' 
    ? deals 
    : deals.filter(deal => deal.dealType === selectedFilter)
  
  const displayedDeals = filteredDeals.slice(0, visibleDeals)

  // Main timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setMainTimer(prev => {
        let { hours, minutes, seconds } = prev
        
        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        } else {
          hours = 23
          minutes = 59
          seconds = 59
        }
        
        return { hours, minutes, seconds }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  // Individual deal timers
  useEffect(() => {
    // Initialize timers
    const initialTimers = {}
    deals.forEach(deal => {
      initialTimers[deal.id] = { ...deal.timeLeft }
    })
    setDealTimers(initialTimers)

    const interval = setInterval(() => {
      setDealTimers(prev => {
        const newTimers = { ...prev }
        
        deals.forEach(deal => {
          if (!newTimers[deal.id]) {
            newTimers[deal.id] = { ...deal.timeLeft }
          }
          
          let { hours, minutes, seconds } = newTimers[deal.id]
          
          if (seconds > 0) {
            seconds--
          } else if (minutes > 0) {
            minutes--
            seconds = 59
          } else if (hours > 0) {
            hours--
            minutes = 59
            seconds = 59
          } else {
            hours = deal.timeLeft.hours
            minutes = deal.timeLeft.minutes
            seconds = deal.timeLeft.seconds
          }
          
          newTimers[deal.id] = { hours, minutes, seconds }
        })
        
        return newTimers
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleLoadMore = () => {
    setVisibleDeals(prev => prev + 8)
  }

  const convertPrice = (price) => {
    const converted = price * currencyRates[currency]
    return `${currencySymbols[currency]} ${converted.toFixed(2)}`
  }

  const getProgressPercentage = (claimed, total) => {
    return (claimed / total) * 100
  }

  const getDealBadgeColor = (dealType) => {
    switch (dealType) {
      case 'lightning':
        return 'bg-danger'
      case 'daily':
        return 'bg-warning text-dark'
      case 'clearance':
        return 'bg-info'
      default:
        return 'bg-primary'
    }
  }

  const formatTime = (time) => {
    return String(time).padStart(2, '0')
  }

  return (
    <div>
      {/* Hero Banner with Main Timer */}
      <section className="hero-banner animate__animated animate__fadeIn">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h1 className="hero-title animate__animated animate__bounceInLeft">
                <i className="fas fa-fire-alt me-3"></i>
                Today's Hot Deals
              </h1>
              <p className="hero-subtitle animate__animated animate__fadeInUp">
                Limited time offers on top products! Grab these amazing deals before they expire. 
                New deals added daily with up to 70% off!
              </p>
            </div>
            <div className="col-lg-4">
              <div className="main-timer animate__animated animate__zoomIn">
                <div className="timer-label">Deals End In</div>
                <div className="timer-display">
                  <div className="timer-unit">
                    <div className="timer-value">{formatTime(mainTimer.hours)}</div>
                    <div className="timer-text">Hours</div>
                  </div>
                  <div className="timer-separator">:</div>
                  <div className="timer-unit">
                    <div className="timer-value">{formatTime(mainTimer.minutes)}</div>
                    <div className="timer-text">Minutes</div>
                  </div>
                  <div className="timer-separator">:</div>
                  <div className="timer-unit">
                    <div className="timer-value">{formatTime(mainTimer.seconds)}</div>
                    <div className="timer-text">Seconds</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Currency Selector & Filters */}
      <section className="py-3 bg-light">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-9">
              <div className="d-flex justify-content-center justify-content-lg-start gap-2 flex-wrap mb-3 mb-lg-0">
                {filters.map(filter => (
                  <button
                    key={filter.id}
                    className={`btn btn-sm ${selectedFilter === filter.id ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedFilter(filter.id)}
                  >
                    <i className={`${filter.icon} me-1`}></i>
                    {filter.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-lg-3">
              <div className="currency-selector">
                <label className="me-2 fw-bold">Currency:</label>
                <select 
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="form-select form-select-sm d-inline-block w-auto"
                >
                  <option value="PKR">PKR (₨)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deals Grid */}
      <section className="section-padding">
        <div className="container">
          <div className="row g-4">
            {displayedDeals.map((deal, index) => (
              <div 
                key={deal.id} 
                className="col-xl-3 col-lg-4 col-md-6 animate__animated animate__fadeInUp"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                <div className="deal-card">
                  {/* Deal Type Badge */}
                  <div className={`position-absolute badge ${getDealBadgeColor(deal.dealType)}`} 
                       style={{top: '10px', left: '10px', zIndex: 3, fontSize: '0.7rem'}}>
                    {deal.dealType === 'lightning' && <><i className="fas fa-bolt me-1"></i>Lightning</>}
                    {deal.dealType === 'daily' && <><i className="fas fa-star me-1"></i>Deal of Day</>}
                    {deal.dealType === 'clearance' && <><i className="fas fa-tags me-1"></i>Clearance</>}
                  </div>

                  {/* Discount Badge */}
                  <div className="position-absolute badge bg-danger pulse" 
                       style={{top: '10px', right: '10px', zIndex: 3, fontSize: '0.8rem'}}>
                    {deal.discount}% OFF
                  </div>

                  {/* Product Image */}
                  <div className="deal-image">
                    <img src={deal.image} alt={deal.name} />
                  </div>

                  {/* Deal Content */}
                  <div className="deal-content">
                    <h5 className="card-title mb-2">{deal.name}</h5>

                    {/* Rating */}
                    <div className="rating mb-2">
                      {[...Array(5)].map((_, i) => (
                        <i 
                          key={i} 
                          className={`${i < Math.floor(deal.rating) ? 'fas' : 'far'} fa-star text-warning`}
                          style={{fontSize: '0.75rem'}}
                        ></i>
                      ))}
                      <span className="ms-1 text-muted" style={{fontSize: '0.75rem'}}>
                        ({deal.reviews})
                      </span>
                    </div>

                    {/* Price */}
                    <div className="deal-price mb-2">
                      <span className="current-price">{convertPrice(deal.price)}</span>
                      <span className="original-price">{convertPrice(deal.originalPrice)}</span>
                    </div>

                    {/* Markup & Location */}
                    <div className="deal-stats mb-2">
                      <span className="markup">{deal.markup}</span>
                      <span className="location">
                        <i className="fas fa-map-marker-alt me-1"></i>
                        {deal.location.name}, {deal.location.country}
                      </span>
                    </div>

                    {/* Individual Timer */}
                    <div className="time-left mb-2">
                      <i className="fas fa-clock me-2 text-danger"></i>
                      <span className="fw-bold text-danger">
                        {dealTimers[deal.id] ? 
                          `${formatTime(dealTimers[deal.id].hours)}:${formatTime(dealTimers[deal.id].minutes)}:${formatTime(dealTimers[deal.id].seconds)}` 
                          : '00:00:00'}
                      </span>
                      <span className="text-muted ms-1" style={{fontSize: '0.75rem'}}>left</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between mb-1">
                        <small className="text-muted" style={{fontSize: '0.7rem'}}>{deal.claimed} claimed</small>
                        <small className="text-muted" style={{fontSize: '0.7rem'}}>{deal.totalStock} total</small>
                      </div>
                      <div className="progress" style={{height: '6px'}}>
                        <div 
                          className="progress-bar bg-success progress-bar-striped progress-bar-animated" 
                          style={{width: `${getProgressPercentage(deal.claimed, deal.totalStock)}%`}}
                        ></div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="deal-actions">
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={(e) => {
                          e.preventDefault()
                          if (e.ctrlKey || e.metaKey || e.button === 1) {
                            // Open in new tab while preserving auth
                            window.open(`/product/${deal.id}`, '_blank')
                          } else {
                            // Navigate in current tab
                            navigate(`/product/${deal.id}`)
                          }
                        }}
                        onMouseDown={(e) => {
                          // Handle middle mouse button click
                          if (e.button === 1) {
                            e.preventDefault()
                            window.open(`/product/${deal.id}`, '_blank')
                          }
                        }}
                      >
                        <i className="fas fa-shopping-cart me-1"></i>
                        Claim Deal
                      </button>
                      <button className="btn btn-outline-primary btn-sm">
                        <i className="fas fa-heart"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {visibleDeals < filteredDeals.length && (
            <div className="text-center mt-5">
              <button 
                className="btn btn-outline-primary btn-lg"
                onClick={handleLoadMore}
              >
                <i className="fas fa-sync-alt me-2"></i>
                Load More Deals ({filteredDeals.length - visibleDeals} remaining)
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Deal Stats */}
      <section className="section-padding bg-light">
        <div className="container">
          <div className="row text-center g-4">
            <div className="col-md-3 col-6">
              <div className="stat-box animate__animated animate__fadeInUp">
                <i className="fas fa-fire fa-3x text-danger mb-3"></i>
                <div className="h3 mb-1 fw-bold">{deals.length}+</div>
                <div className="text-muted">Active Deals</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="stat-box animate__animated animate__fadeInUp" style={{animationDelay: '0.1s'}}>
                <i className="fas fa-percentage fa-3x text-success mb-3"></i>
                <div className="h3 mb-1 fw-bold">Up to 70%</div>
                <div className="text-muted">Maximum Discount</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="stat-box animate__animated animate__fadeInUp" style={{animationDelay: '0.2s'}}>
                <i className="fas fa-users fa-3x text-primary mb-3"></i>
                <div className="h3 mb-1 fw-bold">25,000+</div>
                <div className="text-muted">Deals Claimed</div>
              </div>
            </div>
            <div className="col-md-3 col-6">
              <div className="stat-box animate__animated animate__fadeInUp" style={{animationDelay: '0.3s'}}>
                <i className="fas fa-clock fa-3x text-warning mb-3"></i>
                <div className="h3 mb-1 fw-bold">24/7</div>
                <div className="text-muted">New Deals Added</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      <ScrollToTop />

      <style jsx>{`
        @import url('https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css');
        
        .hero-banner {
          background: linear-gradient(135deg, #ff9900 0%, #ff6600 100%);
          color: white;
          padding: 25px 0 20px;
          position: relative;
          overflow: hidden;
          margin-bottom: 0;
        }
        
        .hero-banner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23ffffff" opacity="0.1"><polygon points="50,0 100,50 50,100 0,50"/></svg>');
          background-size: 80px;
          animation: patternMove 30s linear infinite;
        }
        
        @keyframes patternMove {
          0% { background-position: 0 0; }
          100% { background-position: 80px 80px; }
        }
        
        .hero-title {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 8px;
          text-shadow: 0 4px 8px rgba(0,0,0,0.2);
          position: relative;
          z-index: 2;
        }
        
        .hero-subtitle {
          font-size: 0.9rem;
          opacity: 0.95;
          position: relative;
          z-index: 2;
          margin-bottom: 0;
        }
        
        .main-timer {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 12px 15px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
          position: relative;
          z-index: 2;
        }
        
        .timer-label {
          text-align: center;
          color: #333;
          font-weight: 700;
          font-size: 0.75rem;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .timer-display {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
        }
        
        .timer-unit {
          text-align: center;
        }
        
        .timer-value {
          background: linear-gradient(135deg, #ff9900, #ff6600);
          color: white;
          font-size: 1.4rem;
          font-weight: 800;
          padding: 8px 12px;
          border-radius: 8px;
          min-width: 50px;
          box-shadow: 0 3px 10px rgba(255, 102, 0, 0.3);
        }
        
        .timer-text {
          font-size: 0.6rem;
          color: #666;
          margin-top: 3px;
          font-weight: 600;
          text-transform: uppercase;
        }
        
        .timer-separator {
          font-size: 1.4rem;
          font-weight: 800;
          color: #ff9900;
        }
        
        .currency-selector {
          display: flex;
          align-items: center;
          justify-content: center;
          justify-content: lg-end;
        }
        
        .deal-card {
          background: white;
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          transition: all 0.3s ease;
          height: 100%;
          position: relative;
        }
        
        .deal-card:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 15px 45px rgba(0,0,0,0.2);
        }
        
        .pulse {
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        .deal-image {
          position: relative;
          height: 180px;
          overflow: hidden;
          background-color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px;
          border-bottom: 2px solid #f3f4f6;
        }
        
        .deal-image img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          transition: transform 0.3s ease;
        }
        
        .deal-card:hover .deal-image img {
          transform: scale(1.1) rotate(2deg);
        }
        
        .deal-content {
          padding: 15px;
        }
        
        .deal-content h5 {
          color: #333;
          font-weight: 600;
          font-size: 0.9rem;
          height: 38px;
          overflow: hidden;
          line-height: 1.3;
        }
        
        .deal-price {
          margin-bottom: 10px;
        }
        
        .current-price {
          font-size: 1.3rem;
          font-weight: 700;
          color: #ff9900;
        }
        
        .original-price {
          text-decoration: line-through;
          color: #999;
          margin-left: 8px;
          font-size: 0.85rem;
        }
        
        .deal-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }
        
        .markup {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
        }
        
        .location {
          font-size: 0.75rem;
          color: #666;
        }
        
        .time-left {
          background: linear-gradient(135deg, #fff3cd, #ffe69c);
          padding: 8px;
          border-radius: 8px;
          text-align: center;
          font-size: 0.85rem;
          border: 1px solid #ffc107;
        }
        
        .deal-actions {
          display: flex;
          gap: 8px;
        }
        
        .deal-actions .btn {
          flex: 1;
          font-size: 0.8rem;
        }
        
        .deal-actions .btn:last-child {
          flex: 0 0 auto;
        }
        
        .stat-box {
          padding: 20px;
          transition: transform 0.3s ease;
        }
        
        .stat-box:hover {
          transform: translateY(-5px);
        }
        
        @media (max-width: 768px) {
          .hero-title {
            font-size: 1.8rem;
          }
          
          .timer-value {
            font-size: 1.4rem;
            padding: 8px 12px;
            min-width: 50px;
          }
          
          .timer-separator {
            font-size: 1.4rem;
          }
        }
      `}</style>
    </div>
  )
}

export default LatestDeals
