const nodemailer = require('nodemailer');
const { createLogger } = require('../helpers/controllerLogger');

const logger = createLogger('emailService');

// Email service configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'SDA Church Kiserian <noreply@sdakiserian.org>';
  }

  // Initialize email transporter
  initialize() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport(emailConfig);
    }
    return this.transporter;
  }

  // Send password reset email
  async sendPasswordReset(email, resetToken, userName) {
    try {
      const transporter = this.initialize();
      
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password?token=${resetToken}`;
      
      const mailOptions = {
        from: this.from,
        to: email,
        subject: 'Password Reset Request - SDA Church Kiserian',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">SDA Church Kiserian Main</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
              <p style="color: #6b7280; line-height: 1.6;">
                Hello ${userName || 'Member'},
              </p>
              <p style="color: #6b7280; line-height: 1.6;">
                We received a request to reset your password for your SDA Church Kiserian account. 
                If you didn't make this request, you can safely ignore this email.
              </p>
              <p style="color: #6b7280; line-height: 1.6;">
                To reset your password, click the button below:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p style="color: #6b7280; line-height: 1.6;">
                Or copy and paste this link into your browser:
              </p>
              <p style="color: #3b82f6; word-break: break-all; font-size: 12px;">
                ${resetUrl}
              </p>
              <p style="color: #6b7280; line-height: 1.6;">
                This link will expire in 1 hour for security reasons.
              </p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                If you have any questions, please contact the church office.
              </p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('sendPasswordReset', 'Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('sendPasswordReset', 'Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email, userName) {
    try {
      const transporter = this.initialize();
      
      const mailOptions = {
        from: this.from,
        to: email,
        subject: 'Welcome to SDA Church Kiserian Main',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">SDA Church Kiserian Main</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">Welcome to Our Community!</h2>
              <p style="color: #6b7280; line-height: 1.6;">
                Dear ${userName || 'Member'},
              </p>
              <p style="color: #6b7280; line-height: 1.6;">
                We are thrilled to welcome you to the SDA Church Kiserian Main family! 
                Your account has been successfully created.
              </p>
              <p style="color: #6b7280; line-height: 1.6;">
                You can now access our member portal to:
              </p>
              <ul style="color: #6b7280; line-height: 1.6;">
                <li>View church announcements</li>
                <li>Make payments and offerings</li>
                <li>Register for events</li>
                <li>Connect with other members</li>
                <li>Access department resources</li>
              </ul>
              <p style="color: #6b7280; line-height: 1.6;">
                Please note that your account requires admin approval before full access is granted. 
                You will receive a notification once your account is activated.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login" 
                   style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  Login to Your Account
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                If you have any questions, please contact the church office.
              </p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('sendWelcomeEmail', 'Welcome email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('sendWelcomeEmail', 'Error sending welcome email:', error);
      // Don't throw error for welcome email - account creation should still succeed
      return { success: false, error: error.message };
    }
  }

  // Send announcement notification
  async sendAnnouncementNotification(email, announcementTitle, announcementContent, userName) {
    try {
      const transporter = this.initialize();
      
      const mailOptions = {
        from: this.from,
        to: email,
        subject: `New Announcement: ${announcementTitle} - SDA Church Kiserian`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0;">SDA Church Kiserian Main</h1>
            </div>
            <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
              <h2 style="color: #1f2937; margin-top: 0;">${announcementTitle}</h2>
              <p style="color: #6b7280; line-height: 1.6;">
                Dear ${userName || 'Member'},
              </p>
              <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3b82f6;">
                <p style="color: #374151; line-height: 1.6; margin: 0;">
                  ${announcementContent}
                </p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/announcements" 
                   style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                  View All Announcements
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                To unsubscribe from email notifications, please update your preferences in your account settings.
              </p>
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('sendAnnouncementNotification', 'Announcement notification sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('sendAnnouncementNotification', 'Error sending announcement notification:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
