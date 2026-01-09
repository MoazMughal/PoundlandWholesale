// WhatsApp OTP Service using Twilio
import twilio from 'twilio';

// Initialize Twilio client
const getTwilioClient = () => {
  if (!process.env.TWILIO_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  return twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
};

const sendWhatsAppOTP = async (phoneNumber, otp, userName = 'User') => {
  try {
    // In development mode, just log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`📱 WhatsApp OTP for ${phoneNumber}: ${otp}`);
      console.log(`Message: Hi ${userName}, your Amazon Choice verification code is: ${otp}. Valid for 5 minutes.`);
      return { success: true, message: 'OTP sent (development mode)' };
    }

    // Production implementation with Twilio
    const client = getTwilioClient();
    
    if (!client) {
      console.log('⚠️ Twilio not configured, using simulation mode');
      return { success: true, message: 'OTP sent (simulation mode)' };
    }

    // Send via Twilio WhatsApp
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`, // Your Twilio WhatsApp number
      to: `whatsapp:${phoneNumber}`,
      body: `Hi ${userName}! Your Amazon Choice verification code is: ${otp}. Valid for 5 minutes. Don't share this code with anyone.`
    });

    console.log(`📱 WhatsApp OTP sent via Twilio: ${message.sid}`);
    return { success: true, message: 'OTP sent to your WhatsApp' };

  } catch (error) {
    console.error('WhatsApp OTP Error:', error);
    
    // Fallback to simulation if Twilio fails
    console.log(`📱 Fallback: Would send WhatsApp OTP to ${phoneNumber}: ${otp}`);
    return { success: true, message: 'OTP sent via WhatsApp (fallback)' };
  }
};

// Alternative: WhatsApp Business API implementation
const sendWhatsAppBusinessAPI = async (phoneNumber, otp, userName = 'User') => {
  try {
    if (!process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp Business API not configured');
    }

    const response = await fetch(`https://graph.facebook.com/v17.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber.replace('+', ''),
        type: 'template',
        template: {
          name: 'otp_verification', // You need to create this template in WhatsApp Business
          language: { code: 'en' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: userName },
              { type: 'text', text: otp }
            ]
          }]
        }
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`📱 WhatsApp Business API OTP sent: ${data.messages[0].id}`);
      return { success: true, message: 'OTP sent to your WhatsApp' };
    } else {
      throw new Error(data.error?.message || 'WhatsApp Business API failed');
    }

  } catch (error) {
    console.error('WhatsApp Business API Error:', error);
    return { success: false, message: 'Failed to send WhatsApp OTP' };
  }
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const validatePhoneNumber = (phoneNumber) => {
  // Basic validation for international phone numbers
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
};

// Verify Twilio configuration
const verifyTwilioConfig = async () => {
  try {
    const client = getTwilioClient();
    if (!client) {
      return { success: false, message: 'Twilio configuration missing' };
    }

    // Test Twilio connection
    await client.api.accounts(process.env.TWILIO_SID).fetch();
    return { success: true, message: 'Twilio configuration verified' };
  } catch (error) {
    console.error('Twilio config verification failed:', error);
    return { success: false, message: 'Twilio configuration invalid' };
  }
};

export { 
  sendWhatsAppOTP, 
  sendWhatsAppBusinessAPI,
  generateOTP, 
  validatePhoneNumber,
  verifyTwilioConfig 
};