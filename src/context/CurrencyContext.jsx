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
    
    if (typeof price === 'string') {
      numericPrice = parseFloat(price.replace(/[£$₨Rs]/g, '').trim());
    }
    
    if (isNaN(numericPrice)) {
      return `${currencySymbols[currency]}0.00`;
    }

    const converted = numericPrice * currencyRates[currency];
    return converted.toFixed(2);
  };

  const formatPrice = (price) => {
    return `${currencySymbols[currency]}${convertPrice(price)}`;
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
