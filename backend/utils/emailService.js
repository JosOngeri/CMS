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

// Fallback palette used when the church's configured palette cannot be loaded.
// Keys mirror the color_palette_colors.color_key values.
const FALLBACK_PALETTE = {
  primary: '#4A6FA5',
  primary_variant: '#3A5F8F',
  secondary: '#6B8E23',
  background: '#f9fafb',
  surface: '#ffffff',
  text: '#1f2937',
  text_secondary: '#6b7280',
  border: '#e5e7eb',
  success: '#16a34a',
  error: '#dc2626'
};

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'SDA Church Kiserian <noreply@sdakiserian.org>';
    this._palettePromise = null;
  }

  // Initialize email transporter
  initialize() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport(emailConfig);
    }
    return this.transporter;
  }

  // Load the church's default palette so outgoing email matches the site branding.
  // Email clients cannot resolve CSS variables, so hex values are injected per send.
  async getPalette() {
    if (!this._palettePromise) {
      this._palettePromise = (async () => {
        try {
          const PaletteRepository = require('../repositories/PaletteRepository');
          const palette = await PaletteRepository.getDefaultPalette();
          if (!palette) return FALLBACK_PALETTE;
          const withColors = await PaletteRepository.getPaletteWithColors(palette.id);
          return { ...FALLBACK_PALETTE, ...(withColors?.colors || {}) };
        } catch (error) {
          logger.warn('getPalette', 'Using fallback palette:', error.message);
          return FALLBACK_PALETTE;
        }
      })();
    }
    return this._palettePromise;
  }

  // Shared shell: branded header + content card + footer
  emailShell(p, title, bodyHtml) {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${p.primary} 0%, ${p.primary_variant} 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: #ffffff; margin: 0;">SDA Church Kiserian Main</h1>
        </div>
        <div style="background: ${p.background}; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: ${p.text}; margin-top: 0;">${title}</h2>
          ${bodyHtml}
          <hr style="border: none; border-top: 1px solid ${p.border}; margin: 30px 0;">
          <p style="color: ${p.text_secondary}; font-size: 12px; text-align: center; margin: 0;">
            If you have any questions, please contact the church office.
          </p>
        </div>
      </div>`;
  }

  buttonHtml(p, url, label) {
    return `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${url}" style="background: ${p.primary}; color: #ffffff; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
          ${label}
        </a>
      </div>`;
  }

  para(p, text) {
    return `<p style="color: ${p.text_secondary}; line-height: 1.6;">${text}</p>`;
  }

  // Generic sender used by tests and future templates
  async sendEmail({ to, subject, html }) {
    const transporter = this.initialize();
    const info = await transporter.sendMail({ from: this.from, to, subject, html });
    logger.info('sendEmail', 'Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  }

  // Send password reset email
  async sendPasswordReset(email, resetToken, userName) {
    try {
      const p = await this.getPalette();
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/reset-password?token=${resetToken}`;

      const body = `
        ${this.para(p, `Hello ${userName || 'Member'},`)}
        ${this.para(p, "We received a request to reset your password for your SDA Church Kiserian account. If you didn't make this request, you can safely ignore this email.")}
        ${this.para(p, 'To reset your password, click the button below:')}
        ${this.buttonHtml(p, resetUrl, 'Reset Password')}
        ${this.para(p, 'Or copy and paste this link into your browser:')}
        <p style="color: ${p.primary}; word-break: break-all; font-size: 12px;">${resetUrl}</p>
        ${this.para(p, 'This link will expire in 1 hour for security reasons.')}`;

      const info = await this.sendEmail({
        to: email,
        subject: 'Password Reset Request - SDA Church Kiserian',
        html: this.emailShell(p, 'Password Reset Request', body)
      });
      return info;
    } catch (error) {
      logger.error('sendPasswordReset', 'Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email, userName) {
    try {
      const p = await this.getPalette();
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/login`;

      const body = `
        ${this.para(p, `Dear ${userName || 'Member'},`)}
        ${this.para(p, 'We are thrilled to welcome you to the SDA Church Kiserian Main family! Your account has been successfully created.')}
        ${this.para(p, 'You can now access our member portal to:')}
        <ul style="color: ${p.text_secondary}; line-height: 1.6;">
          <li>View church announcements</li>
          <li>Make payments and offerings</li>
          <li>Register for events</li>
          <li>Connect with other members</li>
          <li>Access department resources</li>
        </ul>
        ${this.para(p, 'Please note that your account requires admin approval before full access is granted. You will receive a notification once your account is activated.')}
        ${this.buttonHtml(p, loginUrl, 'Login to Your Account')}`;

      return await this.sendEmail({
        to: email,
        subject: 'Welcome to SDA Church Kiserian Main',
        html: this.emailShell(p, 'Welcome to Our Community!', body)
      });
    } catch (error) {
      logger.error('sendWelcomeEmail', 'Error sending welcome email:', error);
      // Don't throw error for welcome email - account creation should still succeed
      return { success: false, error: error.message };
    }
  }

  // Send announcement notification
  async sendAnnouncementNotification(email, announcementTitle, announcementContent, userName) {
    try {
      const p = await this.getPalette();
      const listUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/announcements`;

      const body = `
        ${this.para(p, `Dear ${userName || 'Member'},`)}
        <div style="background: ${p.surface}; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${p.primary};">
          <p style="color: ${p.text}; line-height: 1.6; margin: 0;">${announcementContent}</p>
        </div>
        ${this.buttonHtml(p, listUrl, 'View All Announcements')}
        ${this.para(p, 'To unsubscribe from email notifications, please update your preferences in your account settings.')}`;

      return await this.sendEmail({
        to: email,
        subject: `New Announcement: ${announcementTitle} - SDA Church Kiserian`,
        html: this.emailShell(p, announcementTitle, body)
      });
    } catch (error) {
      logger.error('sendAnnouncementNotification', 'Error sending announcement notification:', error);
      return { success: false, error: error.message };
    }
  }

  // Send M-Pesa / payment receipt. Called by kopokopo.sendPaymentConfirmation.
  async sendPaymentReceipt(payment) {
    if (!payment?.email) return { success: false, error: 'no recipient email' };
    try {
      const p = await this.getPalette();
      const amount = Number(payment.amount || 0).toLocaleString();

      const body = `
        ${this.para(p, `Dear ${payment.memberName || 'Member'},`)}
        <div style="background: ${p.surface}; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid ${p.success};">
          <p style="color: ${p.text}; margin: 0 0 8px;"><strong>Amount:</strong> KES ${amount}</p>
          <p style="color: ${p.text}; margin: 0 0 8px;"><strong>Receipt:</strong> ${payment.mpesaReceipt || '-'}</p>
          <p style="color: ${p.text}; margin: 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        ${this.para(p, 'Thank you for your faithful giving. May God bless you.')}`;

      return await this.sendEmail({
        to: payment.email,
        subject: `Payment Receipt ${payment.mpesaReceipt || ''} - SDA Church Kiserian`,
        html: this.emailShell(p, 'Payment Received', body)
      });
    } catch (error) {
      logger.error('sendPaymentReceipt', 'Error sending payment receipt:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();
