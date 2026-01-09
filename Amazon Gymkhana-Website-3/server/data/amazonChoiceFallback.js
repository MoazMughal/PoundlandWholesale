// Emergency fallback data for Amazon Choice products when database is unavailable
export const amazonChoiceFallbackProducts = [
  {
    _id: '507f1f77bcf86cd799439011',
    name: 'Wireless Bluetooth Earbuds with Charging Case',
    description: 'High-quality wireless earbuds with noise cancellation and long battery life',
    price: 29.99,
    originalPrice: 49.99,
    discount: 40,
    category: 'electronics',
    subcategory: 'audio',
    brand: 'TechPro',
    images: ['earbuds-1.jpg', 'earbuds-2.jpg'],
    rating: 4.5,
    reviews: 1250,
    stock: 150,
    isAmazonsChoice: true,
    isBestSeller: false,
    dealUnits: 2,
    status: 'active'
  },
  {
    _id: '507f1f77bcf86cd799439012',
    name: 'Smart Watch with Heart Rate Monitor',
    description: 'Advanced fitness tracking smartwatch with multiple sport modes',
    price: 89.99,
    originalPrice: 149.99,
    discount: 40,
    category: 'electronics',
    subcategory: 'wearables',
    brand: 'FitTech',
    images: ['smartwatch-1.jpg', 'smartwatch-2.jpg'],
    rating: 4.3,
    reviews: 890,
    stock: 75,
    isAmazonsChoice: true,
    isBestSeller: true,
    dealUnits: 1,
    status: 'active'
  },
  {
    _id: '507f1f77bcf86cd799439013',
    name: 'USB-C Fast Charging Cable 6ft',
    description: 'Durable braided charging cable with fast charging support',
    price: 12.99,
    originalPrice: 19.99,
    discount: 35,
    category: 'electronics',
    subcategory: 'accessories',
    brand: 'ChargeMaster',
    images: ['cable-1.jpg', 'cable-2.jpg'],
    rating: 4.7,
    reviews: 2100,
    stock: 300,
    isAmazonsChoice: true,
    isBestSeller: false,
    dealUnits: 3,
    status: 'active'
  },
  {
    _id: '507f1f77bcf86cd799439014',
    name: 'Portable Phone Stand Adjustable',
    description: 'Foldable aluminum phone stand for desk and travel use',
    price: 15.99,
    originalPrice: 24.99,
    discount: 36,
    category: 'electronics',
    subcategory: 'accessories',
    brand: 'StandPro',
    images: ['phonestand-1.jpg', 'phonestand-2.jpg'],
    rating: 4.4,
    reviews: 650,
    stock: 200,
    isAmazonsChoice: true,
    isBestSeller: false,
    dealUnits: 2,
    status: 'active'
  },
  {
    _id: '507f1f77bcf86cd799439015',
    name: 'LED Desk Lamp with Wireless Charging',
    description: 'Modern LED desk lamp with built-in wireless phone charging pad',
    price: 45.99,
    originalPrice: 69.99,
    discount: 34,
    category: 'home',
    subcategory: 'lighting',
    brand: 'LightTech',
    images: ['desklamp-1.jpg', 'desklamp-2.jpg'],
    rating: 4.6,
    reviews: 420,
    stock: 85,
    isAmazonsChoice: true,
    isBestSeller: false,
    dealUnits: 1,
    status: 'active'
  },
  {
    _id: '507f1f77bcf86cd799439016',
    name: 'Bluetooth Speaker Waterproof Portable',
    description: 'Compact waterproof speaker with 12-hour battery life',
    price: 34.99,
    originalPrice: 54.99,
    discount: 36,
    category: 'electronics',
    subcategory: 'audio',
    brand: 'SoundWave',
    images: ['speaker-1.jpg', 'speaker-2.jpg'],
    rating: 4.5,
    reviews: 980,
    stock: 120,
    isAmazonsChoice: true,
    isBestSeller: true,
    dealUnits: 1,
    status: 'active'
  },
  {
    _id: '507f1f77bcf86cd799439017',
    name: 'Car Phone Mount Dashboard',
    description: 'Universal car phone holder with 360-degree rotation',
    price: 18.99,
    originalPrice: 29.99,
    discount: 37,
    category: 'automotive',
    subcategory: 'accessories',
    brand: 'CarTech',
    images: ['carmount-1.jpg', 'carmount-2.jpg'],
    rating: 4.3,
    reviews: 750,
    stock: 180,
    isAmazonsChoice: true,
    isBestSeller: false,
    dealUnits: 2,
    status: 'active'
  },
  {
    _id: '507f1f77bcf86cd799439018',
    name: 'Wireless Mouse Ergonomic Design',
    description: 'Comfortable wireless mouse with precision tracking',
    price: 22.99,
    originalPrice: 34.99,
    discount: 34,
    category: 'electronics',
    subcategory: 'computer',
    brand: 'MouseTech',
    images: ['mouse-1.jpg', 'mouse-2.jpg'],
    rating: 4.4,
    reviews: 560,
    stock: 140,
    isAmazonsChoice: true,
    isBestSeller: false,
    dealUnits: 1,
    status: 'active'
  },
  {
    _id: '507f1f77bcf86cd799439019',
    name: 'Kitchen Scale Digital Precision',
    description: 'Accurate digital kitchen scale with LCD display',
    price: 26.99,
    originalPrice: 39.99,
    discount: 33,
    category: 'kitchen',
    subcategory: 'appliances',
    brand: 'KitchenPro',
    images: ['scale-1.jpg', 'scale-2.jpg'],
    rating: 4.6,
    reviews: 380,
    stock: 95,
    isAmazonsChoice: true,
    isBestSeller: false,
    dealUnits: 1,
    status: 'active'
  },
  {
    _id: '507f1f77bcf86cd799439020',
    name: 'Travel Adapter Universal USB',
    description: 'All-in-one travel adapter with multiple USB ports',
    price: 19.99,
    originalPrice: 32.99,
    discount: 39,
    category: 'electronics',
    subcategory: 'travel',
    brand: 'TravelTech',
    images: ['adapter-1.jpg', 'adapter-2.jpg'],
    rating: 4.5,
    reviews: 920,
    stock: 160,
    isAmazonsChoice: true,
    isBestSeller: true,
    dealUnits: 1,
    status: 'active'
  }
];

// Function to get filtered fallback products
export function getFilteredFallbackProducts(filters = {}) {
  let products = [...amazonChoiceFallbackProducts];
  
  // Apply category filter
  if (filters.category && filters.category !== 'all') {
    products = products.filter(p => p.category === filters.category);
  }
  
  // Apply Amazon's Choice filter
  if (filters.isAmazonsChoice) {
    products = products.filter(p => p.isAmazonsChoice === true);
  }
  
  // Apply Best Seller filter
  if (filters.isBestSeller) {
    products = products.filter(p => p.isBestSeller === true);
  }
  
  // Apply search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.brand.toLowerCase().includes(searchLower) ||
      p.category.toLowerCase().includes(searchLower)
    );
  }
  
  return products;
}