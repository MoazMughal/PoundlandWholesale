import express from 'express';
import Product from '../models/Product.js';
import Seller from '../models/Seller.js';
import Buyer from '../models/Buyer.js';
import { authenticateAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const [
      totalProducts,
      activeProducts,
      pendingProducts,
      totalSellers,
      pendingSellers,
      approvedSellers,
      verificationRequired,
      verificationPending,
      verificationApproved,
      verificationRejected,
      totalBuyers,
      activeBuyers,
      inactiveBuyers,
      suspendedBuyers
    ] = await Promise.all([
      Product.countDocuments(),
      Product.countDocuments({ status: 'active' }),
      Product.countDocuments({ status: 'pending' }),
      Seller.countDocuments(),
      Seller.countDocuments({ status: 'verification_pending' }),
      Seller.countDocuments({ status: 'verified' }),
      Seller.countDocuments({ verificationStatus: 'required' }),
      Seller.countDocuments({ verificationStatus: 'pending' }),
      Seller.countDocuments({ verificationStatus: 'approved' }),
      Seller.countDocuments({ verificationStatus: 'rejected' }),
      Buyer.countDocuments(),
      Buyer.countDocuments({ status: 'active' }),
      Buyer.countDocuments({ status: 'inactive' }),
      Buyer.countDocuments({ status: 'suspended' })
    ]);

    // Count pending payments
    const buyersWithPendingPayments = await Buyer.find({
      'paymentHistory.status': 'pending'
    });
    
    let pendingPaymentsCount = 0;
    buyersWithPendingPayments.forEach(buyer => {
      buyer.paymentHistory.forEach(payment => {
        if (payment.status === 'pending') {
          pendingPaymentsCount++;
        }
      });
    });

    // Count payment verifications
    let paymentVerificationStats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    try {
      const PaymentVerification = (await import('../models/PaymentVerification.js')).default;
      const [
        totalVerifications,
        pendingVerifications,
        approvedVerifications,
        rejectedVerifications
      ] = await Promise.all([
        PaymentVerification.countDocuments(),
        PaymentVerification.countDocuments({ status: 'pending' }),
        PaymentVerification.countDocuments({ status: 'approved' }),
        PaymentVerification.countDocuments({ status: 'rejected' })
      ]);

      paymentVerificationStats = {
        total: totalVerifications,
        pending: pendingVerifications,
        approved: approvedVerifications,
        rejected: rejectedVerifications
      };
    } catch (error) {
      console.log('PaymentVerification model not available:', error.message);
    }

    res.json({
      products: {
        total: totalProducts,
        active: activeProducts,
        pending: pendingProducts
      },
      sellers: {
        total: totalSellers,
        pending: pendingSellers,
        approved: approvedSellers
      },
      verifications: {
        required: verificationRequired,
        pending: verificationPending,
        approved: verificationApproved,
        rejected: verificationRejected
      },
      buyers: {
        total: totalBuyers,
        active: activeBuyers,
        inactive: inactiveBuyers,
        suspended: suspendedBuyers
      },
      pendingPayments: pendingPaymentsCount,
      paymentVerifications: paymentVerificationStats
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
