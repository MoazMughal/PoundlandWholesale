import express from 'express';
import { authenticateBuyer } from '../middleware/auth.js';
import {
  initiateEasypaisaPayment,
  verifyEasypaisaCallback,
  inquiryTransactionStatus
} from '../services/easypaisa.js';
import Buyer from '../models/Buyer.js';

const router = express.Router();

/**
 * Initiate Easypaisa payment
 * POST /api/easypaisa/initiate
 */
router.post('/initiate', authenticateBuyer, async (req, res) => {
  try {
    const { amount, mobileNumber, description, supplierId } = req.body;
    
    if (!amount || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'Amount and mobile number are required'
      });
    }
    
    const buyer = await Buyer.findById(req.buyer._id);
    
    const paymentData = {
      amount: parseFloat(amount),
      mobileNumber: mobileNumber,
      email: buyer.email,
      description: description || 'Supplier Contact Unlock'
    };
    
    const result = await initiateEasypaisaPayment(paymentData);
    
    if (result.success) {
      // Store pending transaction
      buyer.paymentHistory = buyer.paymentHistory || [];
      buyer.paymentHistory.push({
        amount: amount,
        paymentDate: new Date(),
        paymentMethod: 'easypaisa',
        transactionId: result.orderRefNum,
        status: 'pending',
        supplierId: supplierId
      });
      
      await buyer.save();
      
      return res.json({
        success: true,
        orderRefNum: result.orderRefNum,
        paymentUrl: result.paymentUrl,
        formData: result.formData,
        message: 'Payment form ready'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Easypaisa initiate error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment initiation failed',
      error: error.message
    });
  }
});

/**
 * Handle Easypaisa callback
 * POST /api/easypaisa/callback
 */
router.post('/callback', async (req, res) => {
  try {
    console.log('Easypaisa callback received:', req.body);
    
    const verification = verifyEasypaisaCallback(req.body);
    
    if (!verification.success) {
      console.error('Easypaisa callback verification failed:', verification.message);
      return res.redirect(`/payment-failed?reason=${encodeURIComponent(verification.message)}`);
    }
    
    // Find buyer with this transaction
    const buyer = await Buyer.findOne({
      'paymentHistory.transactionId': verification.orderRefNum
    });
    
    if (!buyer) {
      console.error('Buyer not found for order:', verification.orderRefNum);
      return res.redirect(`/payment-failed?reason=Transaction not found`);
    }
    
    // Update payment status
    const paymentIndex = buyer.paymentHistory.findIndex(
      p => p.transactionId === verification.orderRefNum
    );
    
    if (paymentIndex !== -1) {
      buyer.paymentHistory[paymentIndex].status = verification.success ? 'completed' : 'failed';
      buyer.paymentHistory[paymentIndex].paymentToken = verification.paymentToken;
      
      // If payment successful, unlock supplier contact
      if (verification.success) {
        const supplierId = buyer.paymentHistory[paymentIndex].supplierId;
        
        if (supplierId && !buyer.unlockedSuppliers.includes(supplierId)) {
          buyer.unlockedSuppliers.push(supplierId);
        }
      }
      
      await buyer.save();
    }
    
    // Redirect to success/failure page
    const redirectUrl = verification.success 
      ? `/payment-success?txn=${verification.orderRefNum}`
      : `/payment-failed?txn=${verification.orderRefNum}&reason=${encodeURIComponent(verification.message)}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Easypaisa callback error:', error);
    res.redirect(`/payment-failed?reason=Error processing payment`);
  }
});

/**
 * Check payment status
 * GET /api/easypaisa/status/:orderRefNum
 */
router.get('/status/:orderRefNum', authenticateBuyer, async (req, res) => {
  try {
    const { orderRefNum } = req.params;
    
    const result = await inquiryTransactionStatus(orderRefNum);
    
    res.json({
      success: result.success,
      status: result.status,
      message: result.message,
      orderRefNum: orderRefNum,
      data: result.data
    });
  } catch (error) {
    console.error('Easypaisa status inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Status inquiry failed',
      error: error.message
    });
  }
});

/**
 * Get payment history
 * GET /api/easypaisa/history
 */
router.get('/history', authenticateBuyer, async (req, res) => {
  try {
    const buyer = await Buyer.findById(req.buyer._id);
    
    const easypaisaPayments = buyer.paymentHistory.filter(
      p => p.paymentMethod === 'easypaisa'
    );
    
    res.json({
      success: true,
      payments: easypaisaPayments
    });
  } catch (error) {
    console.error('Easypaisa history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment history',
      error: error.message
    });
  }
});

export default router;
