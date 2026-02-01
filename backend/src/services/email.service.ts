import nodemailer, { Transporter } from 'nodemailer';
import logger from '../utils/logger';

/**
 * EMAIL SERVICE
 *
 * Handles all email notifications for the platform
 *
 * Email Types:
 * - Welcome emails (account registration)
 * - Email verification
 * - Password reset
 * - Trade notifications (opened, closed, profit/loss)
 * - Deposit/withdrawal confirmations
 * - KYC status updates
 * - Security alerts (login from new device, password change)
 * - Marketing/promotional emails
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface TradeNotificationData {
  username: string;
  assetSymbol: string;
  direction: 'UP' | 'DOWN';
  amount: number;
  entryPrice: number;
  exitPrice?: number;
  profit?: number;
  isWin?: boolean;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize email transporter with SMTP configuration
   */
  private initialize() {
    try {
      const smtpConfig = {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      };

      // Check if SMTP is configured
      if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
        logger.warn('⚠ Email service not configured. Set SMTP_USER and SMTP_PASS environment variables.');
        logger.warn('  Email notifications will be logged but not sent.');
        return;
      }

      this.transporter = nodemailer.createTransporter(smtpConfig);
      this.isConfigured = true;

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email service verification failed:', error);
          this.isConfigured = false;
        } else {
          logger.info('✓ Email service initialized and verified');
        }
      });
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Send email (internal method)
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.warn(`Email not sent (service not configured): ${options.subject} to ${options.to}`);
      return false;
    }

    try {
      const mailOptions = {
        from: `${process.env.EMAIL_FROM_NAME || 'PoTrades'} <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${options.subject} to ${options.to}`);
      return true;
    } catch (error: any) {
      logger.error(`Failed to send email to ${options.to}:`, error.message);
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(to: string, username: string): Promise<boolean> {
    const subject = 'Welcome to PoTrades - Your Trading Journey Starts Now!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to PoTrades, ${username}!</h2>
        <p>Thank you for joining our trading platform. Your account has been successfully created.</p>
        <p>Here's what you can do next:</p>
        <ul>
          <li>Complete your KYC verification</li>
          <li>Make your first deposit</li>
          <li>Explore our trading assets</li>
          <li>Start trading with real-time market data</li>
        </ul>
        <p>If you have any questions, our support team is here to help.</p>
        <p>Happy Trading!<br>The PoTrades Team</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(to: string, username: string, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Email Verification</h2>
        <p>Hello ${username},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, username: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello ${username},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <p><strong>Security Tip:</strong> Never share your password with anyone.</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send trade opened notification
   */
  async sendTradeOpenedEmail(to: string, data: TradeNotificationData): Promise<boolean> {
    const subject = `Trade Opened: ${data.assetSymbol} ${data.direction}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Trade Opened</h2>
        <p>Hello ${data.username},</p>
        <p>Your trade has been successfully opened:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Asset:</strong> ${data.assetSymbol}</p>
          <p style="margin: 5px 0;"><strong>Direction:</strong> <span style="color: ${data.direction === 'UP' ? '#10b981' : '#ef4444'};">${data.direction}</span></p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Entry Price:</strong> ${data.entryPrice.toFixed(2)}</p>
        </div>
        <p>Good luck with your trade!</p>
        <p>The PoTrades Team</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send trade closed notification
   */
  async sendTradeClosedEmail(to: string, data: TradeNotificationData): Promise<boolean> {
    const isWin = data.isWin || false;
    const subject = `Trade Closed: ${isWin ? 'WIN' : 'LOSS'} - ${data.assetSymbol}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${isWin ? '#10b981' : '#ef4444'};">Trade ${isWin ? 'Won' : 'Lost'}</h2>
        <p>Hello ${data.username},</p>
        <p>Your trade has been closed:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Asset:</strong> ${data.assetSymbol}</p>
          <p style="margin: 5px 0;"><strong>Direction:</strong> <span style="color: ${data.direction === 'UP' ? '#10b981' : '#ef4444'};">${data.direction}</span></p>
          <p style="margin: 5px 0;"><strong>Amount:</strong> $${data.amount.toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Entry Price:</strong> ${data.entryPrice.toFixed(2)}</p>
          <p style="margin: 5px 0;"><strong>Exit Price:</strong> ${data.exitPrice?.toFixed(2) || 'N/A'}</p>
          <p style="margin: 5px 0;"><strong>Result:</strong> <span style="color: ${isWin ? '#10b981' : '#ef4444'}; font-weight: bold;">${isWin ? 'WIN' : 'LOSS'}</span></p>
          <p style="margin: 5px 0;"><strong>Profit/Loss:</strong> <span style="color: ${isWin ? '#10b981' : '#ef4444'};">${data.profit && data.profit > 0 ? '+' : ''}$${data.profit?.toFixed(2) || '0.00'}</span></p>
        </div>
        <p>${isWin ? 'Congratulations on your win!' : 'Better luck next time!'}</p>
        <p>The PoTrades Team</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send deposit confirmation email
   */
  async sendDepositConfirmationEmail(to: string, username: string, amount: number, currency: string): Promise<boolean> {
    const subject = 'Deposit Confirmation';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Deposit Successful</h2>
        <p>Hello ${username},</p>
        <p>Your deposit has been successfully processed:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Amount:</strong> ${amount.toFixed(2)} ${currency}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #10b981;">Completed</span></p>
        </div>
        <p>Your account balance has been updated. You can now start trading!</p>
        <p>The PoTrades Team</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send withdrawal confirmation email
   */
  async sendWithdrawalConfirmationEmail(to: string, username: string, amount: number, currency: string): Promise<boolean> {
    const subject = 'Withdrawal Request Received';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Withdrawal Request</h2>
        <p>Hello ${username},</p>
        <p>We have received your withdrawal request:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Amount:</strong> ${amount.toFixed(2)} ${currency}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #f59e0b;">Pending</span></p>
        </div>
        <p>Your withdrawal is being processed. Funds will be transferred to your account within 1-3 business days.</p>
        <p>The PoTrades Team</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }

  /**
   * Send security alert email
   */
  async sendSecurityAlertEmail(to: string, username: string, action: string, details: string): Promise<boolean> {
    const subject = `Security Alert: ${action}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Security Alert</h2>
        <p>Hello ${username},</p>
        <p>We detected a security-related action on your account:</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Action:</strong> ${action}</p>
          <p style="margin: 5px 0;"><strong>Details:</strong> ${details}</p>
          <p style="margin: 5px 0;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>If this wasn't you, please secure your account immediately:</p>
        <ul>
          <li>Change your password</li>
          <li>Enable 2-factor authentication</li>
          <li>Contact support</li>
        </ul>
        <p>The PoTrades Team</p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }
}

export const emailService = new EmailService();
export default emailService;
