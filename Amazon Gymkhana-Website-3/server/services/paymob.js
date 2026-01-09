import axios from 'axios';

// Paymob API Configuration
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY || 'your_paymob_api_key';
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID || 'your_integration_id';
const PAYMOB_IFRAME_ID = process.env.PAYMOB_IFRAME_ID || 'your_iframe_id';

const PAYMOB_BASE_URL = 'https://accept.paymob.com/api';

/**
 * Paymob Payment Integration
 * Supports: Visa, Mastercard, JazzCash, EasyPaisa
 */

// Step 1: Get authentication token
async function getAuthToken() {
  try {
    const response = await axios.post(`${PAYMOB_BASE_URL}/auth/tokens`, {
      api_key: PAYMOB_API_KEY
    });
    return response.data.token;
  } catch (error) {
    console.error('Paymob auth error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Paymob');
  }
}

// Step 2: Create order
async function createOrder(authToken, amount, currency = 'PKR') {
  try {
    const response = await axios.post(`${PAYMOB_BASE_URL}/ecommerce/orders`, {
      auth_token: authToken,
      delivery_needed: 'false',
      amount_cents: amount * 100, // Convert to cents
      currency: currency,
      items: [{
        name: 'Supplier Contact Unlock',
        amount_cents: amount * 100,
        description: 'Unlock supplier contact information',
        quantity: 1
      }]
    });
    return response.data.id;
  } catch (error) {
    console.error('Paymob order creation error:', error.response?.data || error.message);
    throw new Error('Failed to create order');
  }
}

// Step 3: Generate payment key
async function getPaymentKey(authToken, orderId, amount, buyerInfo, cardDetails = null) {
  try {
    const billingData = {
      apartment: 'NA',
      email: buyerInfo.email,
      floor: 'NA',
      first_name: buyerInfo.firstName || 'Buyer',
      street: 'NA',
      building: 'NA',
      phone_number: buyerInfo.phone || '+923000000000',
      shipping_method: 'NA',
      postal_code: 'NA',
      city: 'Karachi',
      country: 'PK',
      last_name: buyerInfo.lastName || 'User',
      state: 'Sindh'
    };

    const payload = {
      auth_token: authToken,
      amount_cents: amount * 100,
      expiration: 3600,
      order_id: orderId,
      billing_data: billingData,
      currency: 'PKR',
      integration_id: PAYMOB_INTEGRATION_ID
    };

    // Add card details if provided (for card payments)
    if (cardDetails) {
      payload.card_number = cardDetails.cardNumber.replace(/\s/g, '');
      payload.card_expiry_mm = cardDetails.expiry.split('/')[0];
      payload.card_expiry_yy = cardDetails.expiry.split('/')[1];
      payload.card_cvv = cardDetails.cvv;
    }

    const response = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payment_keys`, payload);
    return response.data.token;
  } catch (error) {
    console.error('Paymob payment key error:', error.response?.data || error.message);
    throw new Error('Failed to generate payment key');
  }
}

// Main function to process card payment
export async function processCardPaymentWithPaymob(cardDetails, amount, buyerInfo) {
  try {
    // Step 1: Authenticate
    const authToken = await getAuthToken();
    
    // Step 2: Create order
    const orderId = await createOrder(authToken, amount);
    
    // Step 3: Get payment key
    const paymentKey = await getPaymentKey(authToken, orderId, amount, buyerInfo, cardDetails);
    
    // Step 4: Process payment
    const paymentResponse = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payments/pay`, {
      payment_token: paymentKey
    });

    // Check if payment was successful
    if (paymentResponse.data.success === true || paymentResponse.data.pending === false) {
      return {
        success: true,
        transactionId: paymentResponse.data.id || `PAYMOB-${orderId}`,
        orderId: orderId,
        message: 'Payment successful'
      };
    } else {
      return {
        success: false,
        message: paymentResponse.data.data?.message || 'Payment failed'
      };
    }
  } catch (error) {
    console.error('Paymob payment processing error:', error);
    return {
      success: false,
      message: error.message || 'Payment processing failed'
    };
  }
}

// Alternative: JazzCash wallet payment
export async function processJazzCashWallet(phoneNumber, amount, buyerInfo) {
  try {
    const authToken = await getAuthToken();
    const orderId = await createOrder(authToken, amount);
    
    // JazzCash wallet integration through Paymob
    const response = await axios.post(`${PAYMOB_BASE_URL}/acceptance/payments/jazzcash`, {
      auth_token: authToken,
      order_id: orderId,
      phone_number: phoneNumber,
      amount_cents: amount * 100
    });

    return {
      success: response.data.success,
      transactionId: response.data.id,
      message: response.data.message
    };
  } catch (error) {
    console.error('JazzCash wallet error:', error);
    return {
      success: false,
      message: 'JazzCash payment failed'
    };
  }
}

// Verify payment status
export async function verifyPaymentStatus(transactionId) {
  try {
    const authToken = await getAuthToken();
    const response = await axios.get(`${PAYMOB_BASE_URL}/acceptance/transactions/${transactionId}`, {
      params: { token: authToken }
    });

    return {
      success: response.data.success,
      status: response.data.pending ? 'pending' : response.data.success ? 'completed' : 'failed',
      data: response.data
    };
  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      status: 'unknown'
    };
  }
}

export default {
  processCardPaymentWithPaymob,
  processJazzCashWallet,
  verifyPaymentStatus
};
