import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Buyer from '../models/Buyer.js';
import Seller from '../models/Seller.js';

export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

export const authenticateBuyer = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const buyer = await Buyer.findById(decoded.id).select('-password');
    
    if (!buyer) {
      return res.status(401).json({ message: 'Buyer not found' });
    }

    if (buyer.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    req.buyer = buyer;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
export const authenticateSeller = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('Seller auth - Token received:', token ? 'Yes' : 'No'); // Debug
    
    if (!token) {
      console.log('Seller auth - No token provided'); // Debug
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Seller auth - Token decoded, seller ID:', decoded.id); // Debug
    
    const seller = await Seller.findById(decoded.id).select('-password');
    
    if (!seller) {
      console.log('Seller auth - Seller not found in database'); // Debug
      return res.status(401).json({ message: 'Seller not found' });
    }

    console.log('Seller auth - Seller found:', seller.username); // Debug

    if (seller.status === 'suspended' || seller.status === 'rejected') {
      return res.status(403).json({ message: 'Account is suspended or rejected' });
    }

    req.seller = seller;
    next();
  } catch (error) {
    console.log('Seller auth - Error:', error.message); // Debug
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Middleware to check dashboard access specifically
export const checkDashboardAccess = async (req, res, next) => {
  try {
    const dashboardAccess = req.seller.canAccessDashboard();
    
    if (!dashboardAccess.canAccess) {
      return res.status(403).json({
        message: dashboardAccess.message,
        reason: dashboardAccess.reason,
        verificationRequired: dashboardAccess.reason === 'verification_required'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};