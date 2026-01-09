import crypto from 'crypto';
import axios from 'axios';

// Easypaisa Configuration
const STORE_ID = process.env.EASYPAISA_STORE_ID || '1234';
const HASH_KEY = process.env.EASYPAISA_HASH_KEY || 'your_hash_key';
const ENVIRONMENT = process.env.EASYPAISA_ENVIRONMENT || 'sandbox';

// API URLs
const SANDBOX_URL = 'https://easypaisa.com.pk/easypay/Index.jsf';
const PRODUCTION_URL = 'https://easypaisa.com.pk/easypay/Index.jsf';
const API_URL = ENVIRONMENT === 'production' ? PRODUCTION_URL : SANDBOX_URL;

/**
 * Generate secure hash for Easypaisa transaction
 * Uses HMAC-SHA256 algorithm
 */
function generateHash(data) {
  const hashString = `${HASH_KEY}&${data.amount}&${data.orderRefNum}`;
  
  const hash = crypto
    .createHmac('sha256', HASH_KEY)
    .update(hashString)
    .digest('hex');
  
  return hash;
}

/**
 * Generate unique order reference number
 */
function generateOrderRef() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `EP${timestamp}${random}`;
}

/**
 * Initiate Easypaisa Payment
 * 
 * @param {Object} paymentData - Payment information
 * @param {number} paymentData.amount - Amount in PKR
 * @param {string} paymentData.mobileNumber - Customer's mobile number
 * @param {string} paymentData.email - Customer's email
 * @param {string} paymentData.description - Payment description
 * @returns {Object} Payment initiation response
 */
export async function initiateEasypaisaPayment(paymentData) {
  try {
    const { amount, mobileNumber, email, description } = paymentData;
    
    // Validate inputs
    if (!amount || amount < 10) {
      throw new Error('Amount must be at least PKR 10');
    }
    
    if (!mobileNumber || !mobileNumber.match(/^03\d{9}$/)) {
      throw new Error('Invalid mobile number format. Use: 03XXXXXXXXX');
    }
    
    // Generate order reference
    const orderRefNum = generateOrderRef();
    
    // Prepare transaction data
    const transactionData = {
      storeId: STORE_ID,
      amount: amount.toString(),
      postBackURL: process.env.EASYPAISA_CALLBACK_URL || 'http://localhost:5000/api/easypaisa/callback',
      orderRefNum: orderRefNum,
      expiryDate: getExpiryDate(),
      merchantHashedReq: '',
      autoRedirect: '1',
      paymentMethod: 'MA_PAYMENT_METHOD', // Mobile Account
      emailAddress: email || '',
      mobileNum: mobileNumber,
      orderDate: getCurrentDate()
    };
    
    // Generate secure hash
    transactionData.merchantHashedReq = generateHash(transactionData);
    
    // For Easypaisa, we return the form data for frontend to submit
    return {
      success: true,
      orderRefNum: orderRefNum,
      paymentUrl: API_URL,
      formData: transactionData,
      message: 'Payment form ready'
    };
  } catch (error) {
    console.error('Easypaisa payment initiation error:', error);
    return {
      success: false,
      message: error.message || 'Payment initiation failed'
    };
  }
}

/**
 * Verify Easypaisa callback response
 * 
 * @param {Object} callbackData - Data received from Easypaisa callback
 * @returns {Object} Verification result
 */
export function verifyEasypaisaCallback(callbackData) {
  try {
    const { orderRefNumber, amount, paymentToken, desc } = callbackData;
    
    // Check if payment was successful
    const isSuccess = desc && desc.toLowerCase().includes('success');
    
    if (isSuccess) {
      return {
        success: true,
        message: 'Payment successful',
        orderRefNum: orderRefNumber,
        amount: parseFloat(amount),
        paymentToken: paymentToken
      };
    } else {
      return {
        success: false,
        message: desc || 'Payment failed',
        orderRefNum: orderRefNumber
      };
    }
  } catch (error) {
    console.error('Easypaisa callback verification error:', error);
    return {
      success: false,
      message: 'Callback verification failed'
    };
  }
}

/**
 * Inquiry transaction status
 * 
 * @param {string} orderRefNum - Order reference number
 * @returns {Object} Transaction status
 */
export async function inquiryTransactionStatus(orderRefNum) {
  try {
    // Easypaisa inquiry endpoint
    const inquiryData = {
      storeId: STORE_ID,
      orderRefNum: orderRefNum,
      merchantHashedReq: generateHash({ amount: '0', orderRefNum })
    };
    
    const response = await axios.post(
      `${API_URL}/inquiry`,
      inquiryData,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return {
      success: response.data.responseCode === '0000',
      status: response.data.responseCode === '0000' ? 'completed' : 'failed',
      message: response.data.responseDesc,
      data: response.data
    };
  } catch (error) {
    console.error('Easypaisa inquiry error:', error);
    return {
      success: false,
      status: 'unknown',
      message: 'Transaction inquiry failed'
    };
  }
}

/**
 * Get expiry date (24 hours from now)
 */
function getExpiryDate() {
  const date = new Date();
  date.setHours(date.getHours() + 24);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day} ${hours}${minutes}${seconds}`;
}

/**
 * Get current date
 */
function getCurrentDate() {
  const date = new Date();
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day} ${hours}${minutes}${seconds}`;
}

export default {
  initiateEasypaisaPayment,
  verifyEasypaisaCallback,
  inquiryTransactionStatus
};
