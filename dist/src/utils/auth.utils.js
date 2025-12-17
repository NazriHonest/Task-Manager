"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
class AuthUtils {
    // Generate JWT access token - FIXED VERSION
    static generateAccessToken(payload) {
        const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
        const expiresIn = process.env.JWT_EXPIRE || '15m';
        // Type assertion to fix TypeScript error
        const options = {
            expiresIn: expiresIn
        };
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
    // Generate refresh token - FIXED VERSION
    static generateRefreshToken(payload) {
        const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';
        const expiresIn = process.env.JWT_REFRESH_EXPIRE || '7d';
        // Type assertion to fix TypeScript error
        const options = {
            expiresIn: expiresIn
        };
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
    // Verify access token
    static verifyAccessToken(token) {
        try {
            const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
            return jsonwebtoken_1.default.verify(token, secret);
        }
        catch (error) {
            console.error('Access token verification failed:', error);
            return null;
        }
    }
    // Verify refresh token
    static verifyRefreshToken(token) {
        try {
            const secret = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-this';
            return jsonwebtoken_1.default.verify(token, secret);
        }
        catch (error) {
            console.error('Refresh token verification failed:', error);
            return null;
        }
    }
    // Hash password
    static async hashPassword(password) {
        const salt = await bcryptjs_1.default.genSalt(10);
        return bcryptjs_1.default.hash(password, salt);
    }
    // Compare password
    static async comparePassword(password, hashedPassword) {
        return bcryptjs_1.default.compare(password, hashedPassword);
    }
    // Generate random token for password reset
    static generateResetToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    // Generate verification token
    static generateVerificationToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    // Extract token from Authorization header
    static extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.split(' ')[1];
    }
    // Validate password strength
    static validatePasswordStrength(password) {
        if (password.length < 6) {
            return { isValid: false, message: 'Password must be at least 6 characters long' };
        }
        if (!/[A-Z]/.test(password)) {
            return { isValid: false, message: 'Password must contain at least one uppercase letter' };
        }
        if (!/[a-z]/.test(password)) {
            return { isValid: false, message: 'Password must contain at least one lowercase letter' };
        }
        if (!/\d/.test(password)) {
            return { isValid: false, message: 'Password must contain at least one number' };
        }
        return { isValid: true };
    }
    // Generate random password
    static generateRandomPassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        // Ensure at least one of each required character type
        password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
        password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
        password += '0123456789'[Math.floor(Math.random() * 10)];
        password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
        // Fill the rest with random characters
        for (let i = 4; i < length; i++) {
            password += chars[Math.floor(Math.random() * chars.length)];
        }
        // Shuffle the password
        return password.split('').sort(() => Math.random() - 0.5).join('');
    }
    // Decode JWT token without verification (for debugging)
    static decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch (error) {
            console.error('Token decoding failed:', error);
            return null;
        }
    }
}
exports.AuthUtils = AuthUtils;
//# sourceMappingURL=auth.utils.js.map