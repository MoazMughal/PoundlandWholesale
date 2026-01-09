// Utility to add profit calculations to specific product categories
// This processes products and adds monthlyProfit and yearlyProfit for:
// - Nose rings
// - Bulbs
// - Fuses
// - Lampshades

export const addProfitDataToProducts = (products) => {
  return products.map(product => {
    const name = product.name.toLowerCase()
    const shouldHaveProfit = 
      name.includes('nose ring') || 
      name.includes('bulb') || 
      name.includes('fuse') || 
      name.includes('lampshade')
    
    if (shouldHaveProfit && !product.hasProfit) {
      // Calculate profit based on price
      const price = parseFloat(product.price.replace(/[£$₨]/g, ''))
      
      // Generate realistic profit values based on price range
      let monthlyProfit, yearlyProfit
      
      if (price < 1) {
        // Very low price items (like nose rings, small bulbs)
        monthlyProfit = Math.floor(Math.random() * 400) + 300 // 300-700
        yearlyProfit = monthlyProfit * 12
      } else if (price < 5) {
        // Low price items
        monthlyProfit = Math.floor(Math.random() * 300) + 200 // 200-500
        yearlyProfit = monthlyProfit * 12
      } else if (price < 20) {
        // Medium price items
        monthlyProfit = Math.floor(Math.random() * 500) + 400 // 400-900
        yearlyProfit = monthlyProfit * 12
      } else {
        // Higher price items
        monthlyProfit = Math.floor(Math.random() * 800) + 600 // 600-1400
        yearlyProfit = monthlyProfit * 12
      }
      
      return {
        ...product,
        hasProfit: true,
        monthlyProfit,
        yearlyProfit
      }
    }
    
    return product
  })
}

export default addProfitDataToProducts
