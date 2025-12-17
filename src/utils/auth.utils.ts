import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
}

export class AuthUtils {
  // Generate JWT access token - FIXED VERSION
  static generateAccessToken(payload: TokenPayload): string {
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
    const expiresIn = process.env.JWT_EXPIRE || '15m';
    
    // Type assertion to fix TypeScript error
    const options: jwt.SignOptions = {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn']
    };
    
    return jwt.sign(payload, secret, options);
  }

  // Generate refresh token - FIXED VERSION
  static generateRefreshToken(payload: TokenPayload): string {
    const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';
    const expiresIn = process.env.JWT_REFRESH_EXPIRE || '7d';
    
    // Type assertion to fix TypeScript error
    const options: jwt.SignOptions = {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn']
    };
    
    return jwt.sign(payload, secret, options);
  }

  // Verify access token
  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
      return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
      console.error('Access token verification failed:', error);
      return null;
    }
  }

  // Verify refresh token
  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';
      return jwt.verify(token, secret) as TokenPayload;
    } catch (error) {
      console.error('Refresh token verification failed:', error);
      return null;
    }
  }

  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Compare password
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Generate random token for password reset
  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Generate verification token
  static generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Extract token from Authorization header
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }

  // Validate password strength (adjusted for lowercase conversion)
  static validatePasswordStrength(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters long' };
    }

    if (!/[A-Za-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one letter' };
    }

    if (!/\d/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number' };
    }

    return { isValid: true };
  }

  // Generate random password (lowercase for consistency)
  static generateRandomPassword(length: number = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each required character type (lowercase)
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];

    // Fill the rest with random lowercase characters
    for (let i = 3; i < length; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Decode JWT token without verification (for debugging)
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch (error) {
      console.error('Token decoding failed:', error);
      return null;
    }
  }
}