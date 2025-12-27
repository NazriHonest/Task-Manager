"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: process.env.FROM_EMAIL || 'noreply@taskapp.com',
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text
            };
            await this.transporter.sendMail(mailOptions);
            return true;
        }
        catch (error) {
            if (error.responseCode === 535) {
                console.error('Email sending error: Authentication failed. Please check your email credentials in the .env file.');
                console.error('For Gmail, make sure you have:');
                console.error('- Enabled 2-factor authentication');
                console.error('- Generated an App Password (not your regular Gmail password)');
                console.error('- Used the App Password in the SMTP_PASS environment variable');
                console.error('- More info: https://support.google.com/mail/?p=BadCredentials');
            }
            else {
                console.error('Email sending error:', error.message || error);
            }
            return false;
        }
    }
    // Send verification email
    async sendVerificationEmail(email, name, token) {
        const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Task Management App, ${name}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the link below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #6200EE; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email Address
          </a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    `;
        return this.sendEmail({
            to: email,
            subject: 'Verify Your Email Address',
            html
        });
    }
    // Send password reset email
    async sendPasswordResetEmail(email, name, token) {
        const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Click the link below to set a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #6200EE; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">
          This is an automated message, please do not reply to this email.
        </p>
      </div>
    `;
        return this.sendEmail({
            to: email,
            subject: 'Reset Your Password',
            html
        });
    }
}
exports.EmailService = EmailService;
// Singleton instance
exports.emailService = new EmailService();
//# sourceMappingURL=email.service.js.map