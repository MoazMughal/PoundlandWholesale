import { createTransport } from 'nodemailer';

// Create email transporter
const createTransporter = () => {
  // Check if email credentials are configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email credentials not configured. Password reset emails will not be sent.');
    console.warn('EMAIL_HOST:', process.env.EMAIL_HOST);
    console.warn('EMAIL_USER:', process.env.EMAIL_USER);
    console.warn('EMAIL_PASS:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
    return null;
  }

  console.log('✅ Email configuration found - attempting to create transporter');
  console.log('📧 Email Config:', {
    service: 'gmail',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? '***configured***' : 'NOT SET'
  });

  const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    },
    // Reduced timeouts to fail faster
    connectionTimeout: 10000,  // 10 seconds
    greetingTimeout: 10000,    // 10 seconds
    socketTimeout: 10000,      // 10 seconds
    // Disable pooling
    pool: false,
    maxConnections: 1,
    maxMessages: 1,
    // Debug mode for troubleshooting
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production'
  });
  
  return transporter;
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
  try {
    console.log(`📧 Attempting to send OTP to: ${email}`);
    
    const transporter = createTransporter();
    
    // If no transporter (email not configured), return error
    if (!transporter) {
      console.error('❌ No email transporter available');
      return { success: false, message: 'Email service not configured' };
    }

    // Skip verification entirely - just try to send
    console.log('⏩ Skipping verification, sending email directly...');

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

    // Send email with shorter timeout wrapper
    const sendWithTimeout = (transporter, mailOptions, timeout = 30000) => {
      return Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), timeout)
        )
      ]);
    };

    console.log('📤 Sending email now...');
    const result = await sendWithTimeout(transporter, mailOptions);
    console.log(`✅ OTP email sent successfully to ${email}`, result);
    return { success: true, message: 'OTP sent successfully' };

  } catch (error) {
    console.error('❌ Failed to send OTP email:', error.message);
    console.error('Error details:', error);
    return { success: false, message: `Failed to send OTP email: ${error.message}` };
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, userName, resetUrl) => {
  try {
    console.log(`📧 Attempting to send password reset email to: ${email}`);
    
    const transporter = createTransporter();
    
    // If no transporter (email not configured), return error
    if (!transporter) {
      console.error('❌ No email transporter available');
      return false;
    }
    
    console.log('✅ Transporter created, preparing email...');

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
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
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
                <a href="${resetUrl}" class="button">Reset Password</a>
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

    // Send email with timeout wrapper
    const sendWithTimeout = (transporter, mailOptions, timeout = 15000) => {
      return Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Email send timeout after 15 seconds')), timeout)
        )
      ]);
    };

    await sendWithTimeout(transporter, mailOptions);
    console.log(`✅ Password reset email sent successfully to ${email}`);
    return true;

  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    console.error('Error details:', error);
    return false;
  }
};

// Export test function
export { testEmailConnection };
