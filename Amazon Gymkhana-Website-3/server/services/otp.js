// OTP Service with crypto hashing and verification
import crypto from 'crypto';
import { sendEmailOTP } from './email.js';
import { sendWhatsAppOTP, validatePhoneNumber } from './whatsapp.js';

// Generate 6-digit OTP using crypto for better randomness
const generateOTP = () => {
  // Use crypto.randomInt for cryptographically secure random numbers
  return crypto.randomInt(100000, 999999).toString();
};

// Hash OTP with crypto for secure storage
const hashOTP = (otp) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(otp, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
};

// Verify OTP against stored hash
const verifyOTP = (inputOTP, storedHash, storedSalt) => {
  const hash = crypto.pbkdf2Sync(inputOTP, storedSalt, 10000, 64, 'sha512').toString('hex');
  return hash === storedHash;
};

// Determine if identifier is email or phone
const identifyContactMethod = (identifier) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  
  if (emailRegex.test(identifier)) {
    return 'email';
  } else if (phoneRegex.test(identifier)) {
    return 'whatsapp';
  } else {
    return 'unknown';
  }
};

// Send OTP via appropriate method
const sendOTP = async (identifier, otp, userName = 'User') => {
  const method = identifyContactMethod(identifier);
  
  switch (method) {
    case 'email':
      return await sendEmailOTP(identifier, otp, userName);
    
    case 'whatsapp':
      return await sendWhatsAppOTP(identifier, otp, userName);
    
    default:
      return { success: false, message: 'Invalid email or phone number format' };
  }
};

// Create OTP record for database storage
const createOTPRecord = (otp) => {
  const { hash, salt } = hashOTP(otp);
  const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  
  return {
    otpHash: hash,
    otpSalt: salt,
    otpExpiry: expiryTime,
    otpAttempts: 0,
    maxAttempts: 3
  };
};

// Validate OTP record
const validateOTPRecord = (otpRecord) => {
  if (!otpRecord.otpHash || !otpRecord.otpSalt || !otpRecord.otpExpiry) {
    return { valid: false, message: 'No OTP request found. Please request a new OTP.' };
  }
  
  if (new Date() > otpRecord.otpExpiry) {
    return { valid: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  if (otpRecord.otpAttempts >= otpRecord.maxAttempts) {
    return { valid: false, message: 'Too many failed attempts. Please request a new OTP.' };
  }
  
  return { valid: true };
};

// Mask contact information for display
const maskContact = (contact) => {
  const method = identifyContactMethod(contact);
  
  if (method === 'email') {
    const [username, domain] = contact.split('@');
    const maskedUsername = username.length > 2 
      ? username.substring(0, 2) + '*'.repeat(username.length - 2)
      : username;
    return `${maskedUsername}@${domain}`;
  } else if (method === 'whatsapp') {
    return contact.replace(/(\+\d{2})(\d{3})\d{4}(\d{4})/, '$1$2****$3');
  }
  
  return contact;
};

// Generate secure random token for additional security
const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export {
  generateOTP,
  hashOTP,
  verifyOTP,
  identifyContactMethod,
  sendOTP,
  createOTPRecord,
  validateOTPRecord,
  maskContact,
  generateSecureToken
};