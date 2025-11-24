import { useState, useEffect } from 'react'

const AlternatingProfit = ({ monthlyProfit, yearlyProfit }) => {
  const [showPKR, setShowPKR] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setShowPKR(prev => !prev)
    }, 3000) // Switch every 3 seconds

    return () => clearInterval(interval)
  }, [])

  const monthlyPKR = Math.round(monthlyProfit * 350)
  const yearlyPKR = Math.round(yearlyProfit * 350)

  return (
    <div className="profit-display" style={{marginTop: '4px', padding: '4px 6px', background: '#f8f9fa', borderLeft: '2px solid #28a745', borderRadius: '4px', fontSize: '0.65rem'}}>
      <div className="profit-row" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '2px'}}>
        <span className="profit-label" style={{fontSize: '0.65rem'}}>Monthly Profit:</span>
        <span className="profit-value blink" style={{fontWeight: '700', color: '#28a745', fontSize: '0.65rem'}}>
          {showPKR ? `₨${monthlyPKR.toLocaleString()}` : `£${monthlyProfit}`}
        </span>
      </div>
      <div className="profit-row" style={{display: 'flex', justifyContent: 'space-between'}}>
        <span className="profit-label" style={{fontSize: '0.65rem'}}>Yearly Profit:</span>
        <span className="profit-value" style={{fontWeight: '700', color: '#28a745', fontSize: '0.65rem'}}>
          {showPKR ? `₨${yearlyPKR.toLocaleString()}` : `£${yearlyProfit.toLocaleString()}`}
        </span>
      </div>
    </div>
  )
}

export default AlternatingProfit
