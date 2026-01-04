import { createContext, useContext, useState, useEffect } from 'react';

const CurrencyContext = createContext();

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(() => {
    // Load from localStorage or default to GBP for all routes
    const savedCurrency = localStorage.getItem('selectedCurrency');
    if (savedCurrency) {
      return savedCurrency;
    }
    // Default currency is GBP for all routes since products are stored in GBP
    return 'GBP';
  });

  // Currency conversion rates (base: PKR) - Manual rates
  const currencyRates = {
    PKR: 1,
    USD: 0.00353,   // 1 USD = 283.32 PKR
    GBP: 0.00272,   // 1 GBP = 367.74 PKR
    AED: 0.01310    // 1 AED = 76.37 PKR
  };

  const currencySymbols = {
    PKR: 'Rs',
    USD: '$',
    GBP: '£',
    AED: 'د.إ'
  };

  // Allow currency changes on admin routes - removed automatic GBP forcing

  // Save to localStorage whenever currency changes
  useEffect(() => {
    localStorage.setItem('selectedCurrency', currency);
  }, [currency]);

  const convertPrice = (price) => {
    // Handle different price formats
    let numericPrice = price;
    let originalCurrency = 'GBP'; // Default assumption
    
    if (typeof price === 'string') {
      // Detect original currency from the string
      if (price.includes('£')) originalCurrency = 'GBP';
      else if (price.includes('$')) originalCurrency = 'USD';
      else if (price.includes('₨') || price.includes('Rs')) originalCurrency = 'PKR';
      else if (price.includes('د.إ')) originalCurrency = 'AED';
      
      numericPrice = parseFloat(price.replace(/[£$₨Rs]/g, '').replace('د.إ', '').trim());
    }
    
    if (isNaN(numericPrice)) {
      return '0.00';
    }

    // If the price is already in the target currency, return as is
    if (originalCurrency === currency) {
      return numericPrice.toFixed(2);
    }

    // Convert from original currency to target currency
    // First convert to PKR (base currency), then to target
    let priceInPKR;
    if (originalCurrency === 'PKR') {
      priceInPKR = numericPrice;
    } else {
      // Convert from original currency to PKR
      priceInPKR = numericPrice / currencyRates[originalCurrency];
    }
    
    // Then convert from PKR to target currency
    const converted = priceInPKR * currencyRates[currency];
    return converted.toFixed(2);
  };

  const formatPrice = (price) => {
    // Special handling for when price is already properly formatted
    if (typeof price === 'string' && price.includes(currencySymbols[currency])) {
      // If the price already has the correct currency symbol, return as is
      return price;
    }
    
    const convertedPrice = convertPrice(price);
    return `${currencySymbols[currency]}${convertedPrice}`;
  };

  const value = {
    currency,
    setCurrency,
    currencyRates,
    currencySymbols,
    convertPrice,
    formatPrice
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
};
