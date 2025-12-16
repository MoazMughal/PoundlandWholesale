// Complete product database with all details for product pages
export const completeProductsData = {
  // TAPES CATEGORY
  'prod-tape-001': {
    id: 'prod-tape-001',
    category: 'tape',
    name: 'Black Duct Tape 50mm x 50m',
    price: '£19.89',
    rrp: '£420.99',
    wholesalePrice: '£19.89',
    rating: 4.5,
    reviews: 156,
    monthlyOrders: '2.5K',
    markup: '340%',
    image: '/main-pics/Black-T.jpg',
    images: ['/main-pics/Black-T.jpg', '/main-pics/Black-T.jpg', '/main-pics/Black-T.jpg', '/main-pics/Black-T.jpg'],
    statuses: ['Best Seller', '156 in basket', 'Amazon\'s Choice'],
    platforms: [
      { name: 'RRP', price: '£420.99', grossProfit: '£328.39', markup: '354.63%' },
      { name: 'Amazon', price: '£419.00', grossProfit: '£326.40', markup: '352.48%' },
      { name: 'eBay', price: '£199.00', grossProfit: '£106.40', markup: '114.90%' }
    ],
    dealInfo: {
      location: 'Pakistan',
      flag: '🇵🇰',
      minOrder: '200 Unit',
      condition: 'New'
    },
    specifications: {
      'Material': 'Polyethylene',
      'Width': '50mm',
      'Length': '50m',
      'Color': 'Black',
      'Adhesive': 'Rubber-based',
      'Temperature Range': '-20°C to 80°C'
    }
  },

  // LAMPSHADES CATEGORY
  'prod-lamp-001': {
    id: 'prod-lamp-001',
    category: 'lampshade',
    name: 'Red Paper Lampshade',
    price: '£19.89',
    rrp: '£420.99',
    wholesalePrice: '£19.89',
    rating: 4.5,
    reviews: 72,
    monthlyOrders: '2.3K',
    markup: '340%',
    image: '/main-pics/Red-Lampshade.jpg',
    images: ['/main-pics/Red-Lampshade.jpg', '/main-pics/Red-Lampshade.jpg', '/main-pics/Red-Lampshade.jpg', '/main-pics/Red-Lampshade.jpg'],
    statuses: ['Selling Fast', '72 in basket', 'Amazon\'s Choice'],
    platforms: [
      { name: 'RRP', price: '£420.99', grossProfit: '£328.39', markup: '354.63%' },
      { name: 'Amazon', price: '£419.00', grossProfit: '£326.40', markup: '352.48%' },
      { name: 'eBay', price: '£199.00', grossProfit: '£106.40', markup: '114.90%' }
    ],
    dealInfo: {
      location: 'Pakistan',
      flag: '🇵🇰',
      minOrder: '50 Unit',
      condition: 'New'
    },
    specifications: {
      'Material': 'Paper',
      'Diameter': '30cm',
      'Height': '25cm',
      'Color': 'Red',
      'Style': 'Traditional',
      'Bulb Type': 'E27'
    }
  },

  'prod-lamp-002': {
    id: 'prod-lamp-002',
    category: 'lampshade',
    name: 'Black Paper Lampshade',
    price: '£19.89',
    rrp: '£420.99',
    wholesalePrice: '£19.89',
    rating: 4.3,
    reviews: 58,
    monthlyOrders: '1.8K',
    markup: '340%',
    image: '/main-pics/Black Lampshade.jpg',
    images: ['/main-pics/Black Lampshade.jpg', '/main-pics/Black Lampshade.jpg', '/main-pics/Black Lampshade.jpg', '/main-pics/Black Lampshade.jpg'],
    statuses: ['Best Seller', '58 in basket', 'Limited Stock'],
    platforms: [
      { name: 'RRP', price: '£420.99', grossProfit: '£328.39', markup: '354.63%' },
      { name: 'Amazon', price: '£419.00', grossProfit: '£326.40', markup: '352.48%' },
      { name: 'eBay', price: '£199.00', grossProfit: '£106.40', markup: '114.90%' }
    ],
    dealInfo: {
      location: 'Pakistan',
      flag: '🇵🇰',
      minOrder: '50 Unit',
      condition: 'New'
    },
    specifications: {
      'Material': 'Paper',
      'Diameter': '30cm',
      'Height': '25cm',
      'Color': 'Black',
      'Style': 'Modern',
      'Bulb Type': 'E27'
    }
  },

  // NOSE RINGS WITH PROFIT CALCULATIONS
  'prod-005': {
    id: 'prod-005',
    category: 'jewelry',
    name: 'Extra Thin Small Nose Ring',
    price: '£0.24',
    rrp: '£2.99',
    wholesalePrice: '£0.24',
    rating: 4.5,
    reviews: 67,
    monthlyOrders: '2500',
    markup: '1145%',
    image: '/main-pics/nose ring.jpg',
    images: ['/main-pics/nose ring.jpg', '/main-pics/nose ring.jpg', '/main-pics/nose ring.jpg', '/main-pics/nose ring.jpg'],
    statuses: ['Selling Fast', '52 in basket', 'Amazon\'s Choice'],
    hasProfit: true,
    showEvaluation: true,
    profitCalculations: {
      costPrice: 0.24,
      sellingPrice: 2.99,
      profitPerUnit: 0.23,
      monthlyProfit: 575,
      yearlyProfit: 6900,
      fourMonthProfit: 2300,
      monthlyProfitPKR: 201250,
      yearlyProfitPKR: 2415000
    },
    platforms: [
      { name: 'RRP', price: '£2.99', grossProfit: '£2.75', markup: '1145.83%' },
      { name: 'Amazon', price: '£2.99', grossProfit: '£2.75', markup: '1145.83%' },
      { name: 'eBay', price: '£2.49', grossProfit: '£2.25', markup: '937.50%' }
    ],
    dealInfo: {
      location: 'Pakistan',
      flag: '🇵🇰',
      minOrder: '200 Unit',
      condition: 'New'
    },
    specifications: {
      'Material': 'Surgical Steel 316L',
      'Gauge': '20G (0.8mm)',
      'Diameter': '6mm, 8mm, 10mm',
      'Color': 'Silver',
      'Package': '1 piece',
      'Origin': 'Imported'
    },
    evaluation: {
      salesProceeds: 2.99,
      commission: -0.72,
      digitalServicesFee: -0.05,
      fbaFee: -1.75,
      totalFees: -2.52,
      productCost: -0.24,
      netProfit: 0.23
    }
  },

  // BULBS WITH PROFIT CALCULATIONS
  'prod-020': {
    id: 'prod-020',
    category: 'electronics',
    name: '10 Pieces G4 Halogen Bulbs',
    price: '£0.18',
    rrp: '£2.49',
    wholesalePrice: '£0.18',
    rating: 4.3,
    reviews: 42,
    monthlyOrders: '1800',
    markup: '1283%',
    image: '/main-pics/Bulb.jpg',
    images: ['/main-pics/Bulb.jpg', '/main-pics/Bulb.jpg', '/main-pics/Bulb.jpg', '/main-pics/Bulb.jpg'],
    statuses: ['Selling Fast', '37 in basket', 'Amazon\'s Choice'],
    hasProfit: true,
    showEvaluation: true,
    profitCalculations: {
      costPrice: 0.18,
      sellingPrice: 2.49,
      profitPerUnit: 0.19,
      monthlyProfit: 342,
      yearlyProfit: 4104,
      fourMonthProfit: 1368,
      monthlyProfitPKR: 119700,
      yearlyProfitPKR: 1436400
    },
    platforms: [
      { name: 'RRP', price: '£2.49', grossProfit: '£2.31', markup: '1283.33%' },
      { name: 'Amazon', price: '£2.49', grossProfit: '£2.31', markup: '1283.33%' },
      { name: 'eBay', price: '£2.19', grossProfit: '£2.01', markup: '1116.67%' }
    ],
    dealInfo: {
      location: 'Pakistan',
      flag: '🇵🇰',
      minOrder: '200 Unit',
      condition: 'New'
    },
    specifications: {
      'Type': 'G4 Halogen',
      'Wattage': '20W',
      'Voltage': '12V',
      'Base': 'G4',
      'Quantity': '10 pieces',
      'Lifespan': '2000 hours'
    },
    evaluation: {
      salesProceeds: 2.49,
      commission: -0.60,
      digitalServicesFee: -0.04,
      fbaFee: -1.46,
      totalFees: -2.10,
      productCost: -0.18,
      netProfit: 0.19
    }
  },

  // LAMPSHADES WITH PROFIT CALCULATIONS
  'prod-lamp-001': {
    id: 'prod-lamp-001',
    category: 'lampshade',
    name: 'Red Paper Lampshade',
    price: '£0.32',
    rrp: '£3.99',
    wholesalePrice: '£0.32',
    rating: 4.5,
    reviews: 72,
    monthlyOrders: '2300',
    markup: '1147%',
    image: '/main-pics/Red-Lampshade.jpg',
    images: ['/main-pics/Red-Lampshade.jpg', '/main-pics/Red-Lampshade.jpg', '/main-pics/Red-Lampshade.jpg', '/main-pics/Red-Lampshade.jpg'],
    statuses: ['Selling Fast', '72 in basket', 'Amazon\'s Choice'],
    hasProfit: true,
    showEvaluation: true,
    profitCalculations: {
      costPrice: 0.32,
      sellingPrice: 3.99,
      profitPerUnit: 0.28,
      monthlyProfit: 644,
      yearlyProfit: 7728,
      fourMonthProfit: 2576,
      monthlyProfitPKR: 225400,
      yearlyProfitPKR: 2704800
    },
    platforms: [
      { name: 'RRP', price: '£3.99', grossProfit: '£3.67', markup: '1147%' },
      { name: 'Amazon', price: '£3.99', grossProfit: '£3.67', markup: '1147%' },
      { name: 'eBay', price: '£3.49', grossProfit: '£3.17', markup: '990%' }
    ],
    dealInfo: {
      location: 'Pakistan',
      flag: '🇵🇰',
      minOrder: '50 Unit',
      condition: 'New'
    },
    specifications: {
      'Material': 'Paper',
      'Diameter': '30cm',
      'Height': '25cm',
      'Color': 'Red',
      'Style': 'Traditional',
      'Bulb Type': 'E27'
    },
    evaluation: {
      salesProceeds: 3.99,
      commission: -0.96,
      digitalServicesFee: -0.06,
      fbaFee: -2.37,
      totalFees: -3.39,
      productCost: -0.32,
      netProfit: 0.28
    }
  },

  // CAR FUSES WITH PROFIT CALCULATIONS
  'prod-fuse-001': {
    id: 'prod-fuse-001',
    category: 'automotive',
    name: 'Car Fuses 10 Pack Standard Blade',
    price: '£0.15',
    rrp: '£1.99',
    wholesalePrice: '£0.15',
    rating: 4.6,
    reviews: 89,
    monthlyOrders: '3200',
    markup: '1227%',
    image: '/main-pics/Car Bulbs.jpg',
    images: ['/main-pics/Car Bulbs.jpg', '/main-pics/Car Bulbs.jpg', '/main-pics/Car Bulbs.jpg', '/main-pics/Car Bulbs.jpg'],
    statuses: ['Best Seller', '89 in basket', 'Amazon\'s Choice'],
    hasProfit: true,
    showEvaluation: true,
    profitCalculations: {
      costPrice: 0.15,
      sellingPrice: 1.99,
      profitPerUnit: 0.16,
      monthlyProfit: 512,
      yearlyProfit: 6144,
      fourMonthProfit: 2048,
      monthlyProfitPKR: 179200,
      yearlyProfitPKR: 2150400
    },
    platforms: [
      { name: 'RRP', price: '£1.99', grossProfit: '£1.84', markup: '1227%' },
      { name: 'Amazon', price: '£1.99', grossProfit: '£1.84', markup: '1227%' },
      { name: 'eBay', price: '£1.79', grossProfit: '£1.64', markup: '1093%' }
    ],
    dealInfo: {
      location: 'Pakistan',
      flag: '🇵🇰',
      minOrder: '200 Unit',
      condition: 'New'
    },
    specifications: {
      'Type': 'Standard Blade Fuse',
      'Amperage': '10A, 15A, 20A, 25A, 30A',
      'Quantity': '10 pieces',
      'Material': 'Zinc Alloy',
      'Color Coded': 'Yes',
      'Application': 'Automotive'
    },
    evaluation: {
      salesProceeds: 1.99,
      commission: -0.48,
      digitalServicesFee: -0.03,
      fbaFee: -1.16,
      totalFees: -1.67,
      productCost: -0.15,
      netProfit: 0.16
    }
  },

  // Add all other products from the original list
  'prod-001': {
    id: 'prod-001',
    category: 'party',
    name: 'Large White Glitter Fairy Wings',
    price: '£19.89',
    rrp: '£420.99',
    wholesalePrice: '£19.89',
    rating: 4.6,
    reviews: 72,
    monthlyOrders: '3.2K',
    markup: '340%',
    image: '/main-pics/whiteFairy.jpg',
    images: ['/main-pics/whiteFairy.jpg', '/main-pics/whiteFairy.jpg', '/main-pics/whiteFairy.jpg', '/main-pics/whiteFairy.jpg'],
    statuses: ['Selling Fast', '91 in basket', 'Amazon\'s Choice'],
    platforms: [
      { name: 'RRP', price: '£420.99', grossProfit: '£328.39', markup: '354.63%' },
      { name: 'Amazon', price: '£419.00', grossProfit: '£326.40', markup: '352.48%' },
      { name: 'eBay', price: '£199.00', grossProfit: '£106.40', markup: '114.90%' }
    ],
    dealInfo: {
      location: 'Pakistan',
      flag: '🇵🇰',
      minOrder: '50 Unit',
      condition: 'New'
    },
    specifications: {
      'Material': 'Glitter Fabric',
      'Size': 'Large (60cm x 50cm)',
      'Color': 'White',
      'Style': 'Fairy Wings',
      'Age Range': 'Adults',
      'Occasion': 'Party, Costume'
    }
  },

  'prod-002': {
    id: 'prod-002',
    category: 'kitchen',
    name: '150 Clear Reusable Forks',
    price: '£19.89',
    rrp: '£420.99',
    wholesalePrice: '£19.89',
    rating: 4.5,
    reviews: 124,
    monthlyOrders: '4.5K',
    markup: '280%',
    image: '/main-pics/forks.jpg',
    images: ['/main-pics/forks.jpg', '/main-pics/forks.jpg', '/main-pics/forks.jpg', '/main-pics/forks.jpg'],
    statuses: ['Selling Fast', '88 in basket', 'Amazon\'s Choice'],
    platforms: [
      { name: 'RRP', price: '£420.99', grossProfit: '£328.39', markup: '354.63%' },
      { name: 'Amazon', price: '£419.00', grossProfit: '£326.40', markup: '352.48%' },
      { name: 'eBay', price: '£199.00', grossProfit: '£106.40', markup: '114.90%' }
    ],
    dealInfo: {
      location: 'Pakistan',
      flag: '🇵🇰',
      minOrder: '200 Unit',
      condition: 'New'
    },
    specifications: {
      'Material': 'Clear Plastic',
      'Quantity': '150 pieces',
      'Length': '16cm',
      'Weight': 'Heavy Duty',
      'Reusable': 'Yes',
      'Dishwasher Safe': 'Yes'
    }
  }
};

// Helper function to get product by ID
export const getProductById = (id) => {
  return completeProductsData[id] || null;
};

// Helper function to get product by name
export const getProductByName = (name) => {
  return Object.values(completeProductsData).find(p => p.name === name) || null;
};

export default completeProductsData;
