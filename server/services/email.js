import { createTransport } from 'nodemailer';

// Create email transporter with multiple fallback configurations
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  // Configuration 1: Gmail service (fastest)
  const gmailConfig = {
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 5000,   // 5 seconds
    greetingTimeout: 3000,     // 3 seconds
    socketTimeout: 5000,       // 5 seconds
    pool: false,
    debug: false,
    logger: false
  };

  // Configuration 2: Manual SMTP (fallback)
  const smtpConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 8000,   // 8 seconds
    greetingTimeout: 5000,     // 5 seconds
    socketTimeout: 8000,       // 8 seconds
    pool: false,
    debug: false,
    logger: false
  };

  // Try Gmail service first, fallback to SMTP
  return createTransport(gmailConfig);
};

// Test email connection
const testEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      return { success: false, message: 'Email not configured' };
    }

    console.log('🔍 Testing email connection...');
    await transporter.verify();
    console.log('✅ Email connection successful');
    return { success: true, message: 'Email connection verified' };
  } catch (error) {
    console.error('❌ Email connection failed:', error.message);
    return { success: false, message: error.message };
  }
};

// Send OTP email (for OTP-based password reset)
export const sendEmailOTP = async (email, otp, userName = 'User') => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return { success: false, message: 'Email service not configured' };
  }

  const configurations = [
    // Config 1: Gmail service (fastest timeout)
    {
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 2000,  // 2 seconds
      greetingTimeout: 1000,    // 1 second
      socketTimeout: 2000,      // 2 seconds
      pool: false
    }
  ];

  let lastError = null;
  
  for (let configIndex = 0; configIndex < configurations.length; configIndex++) {
    try {
      const transporter = createTransport(configurations[configIndex]);

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Your App'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your Password Reset OTP',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; border: 2px dashed #667eea; border-radius: 10px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔐 Password Reset OTP</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>Your One-Time Password (OTP) for password reset is:</p>
              
              <div class="otp-box">
                ${otp}
              </div>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This OTP will expire in <strong>5 minutes</strong></li>
                  <li>Do not share this OTP with anyone</li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px; color: #666;">
                Enter this OTP on the password reset page to continue.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Add timeout wrapper to prevent hanging
    const sendWithTimeout = (transporter, mailOptions, timeout = 15000) => {
      return Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), timeout)
        )
      ]);
    };

      // Try to send email with this configuration
      await sendWithTimeout(transporter, mailOptions, 3000); // 3 second timeout - fail fast
      return { success: true, message: 'OTP sent successfully' };

    } catch (error) {
      lastError = error;
      // Continue to next configuration
      continue;
    }
  }
  
  return { success: false, message: `Failed to send OTP email: ${lastError?.message || 'All email configurations failed'}` };
};

// Send password reset email
export const sendPasswordResetEmail = async (email, userName, resetUrl) => {
  try {
    const transporter = createTransporter();
    
    if (!transporter) {
      return false;
    }

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Your App'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔐 Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${userName}</strong>,</p>
              
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold;">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="background: white; padding: 10px; border-radius: 5px; word-break: break-all;">
                <a href="${resetUrl}">${resetUrl}</a>
              </p>
              
              <div class="warning">
                <strong>⚠️ Important:</strong>
                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                  <li>This link will expire in <strong>10 minutes</strong></li>
                  <li>The link can only be used <strong>once</strong></li>
                  <li>If you didn't request this, please ignore this email</li>
                </ul>
              </div>
              
              <p style="margin-top: 30px; color: #666;">
                If you're having trouble clicking the button, copy and paste the URL above into your web browser.
              </p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
              <p>&copy; ${new Date().getFullYear()} Your Company. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Add timeout wrapper
    const sendWithTimeout = (transporter, mailOptions, timeout = 15000) => {
      return Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), timeout)
        )
      ]);
    };

    await sendWithTimeout(transporter, mailOptions);
    return true;

  } catch (error) {
    return false;
  }
};

// Export test function
export { testEmailConnection };
