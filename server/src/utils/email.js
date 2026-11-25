const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Spot4Notes" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify your Spot4Notes Account',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">📚 Spot4Notes</h1>
          <p style="color: rgba(255,255,255,0.9); margin-top: 5px;">Academic Resource Sharing Platform</p>
        </div>
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p style="color: #555;">Welcome to Spot4Notes! Click the button below to verify your email and start sharing academic resources.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email</a>
          </div>
          <p style="color: #888; font-size: 14px;">Or copy this link: <a href="${verificationUrl}">${verificationUrl}</a></p>
          <p style="color: #888; font-size: 12px;">This link expires in 24 hours.</p>
        </div>
        <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
          <p>&copy; 2026 Spot4Notes. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    // In development, log the verification URL
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 Verification URL: ${verificationUrl}`);
    }
    return false;
  }
};

const sendNotificationEmail = async (email, subject, message) => {
  const mailOptions = {
    from: `"Spot4Notes" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">📚 Spot4Notes</h1>
        </div>
        <div style="padding: 30px; background: white; border: 1px solid #e0e0e0;">
          <p style="color: #555;">${message}</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

module.exports = { sendVerificationEmail, sendNotificationEmail };
