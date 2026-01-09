import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Buyer from '../models/Buyer.js';
import Seller from '../models/Seller.js';

export const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required - Invalid header format' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({ message: 'Authentication required - No token' });
    }

    // Check if JWT_SECRET exists
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    // Provide more specific error messages
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token format' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Token not active' });
    }
    
    res.status(401).json({ message: 'Authentication failed' });
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
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const seller = await Seller.findById(decoded.id).select('-password');
    
    if (!seller) {
      return res.status(401).json({ message: 'Seller not found' });
    }

    if (seller.status === 'suspended' || seller.status === 'rejected') {
      return res.status(403).json({ message: 'Account is suspended or rejected' });
    }

    req.seller = seller;
    next();
  } catch (error) {
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