"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccountSchema = exports.resendVerificationSchema = exports.changePasswordSchema = exports.updateProfileSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.refreshTokenSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// Password validation regex (adjusted for lowercase conversion)
const passwordRegex = /^(?=.*[a-z])(?=.*\d).+$/;
// Common password validation
const passwordValidation = zod_1.z.string()
    .min(6, 'Password must be at least 6 characters')
    .regex(passwordRegex, 'Password must contain at least one letter and one number');
// Register schema
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name must be less than 100 characters'),
        email: zod_1.z.string()
            .email('Invalid email address')
            .max(255, 'Email must be less than 255 characters'),
        password: passwordValidation
    })
});
// Login schema
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string()
            .email('Invalid email address'),
        password: zod_1.z.string()
            .min(1, 'Password is required')
    })
});
// Refresh token schema
exports.refreshTokenSchema = zod_1.z.object({
    body: zod_1.z.object({
        refreshToken: zod_1.z.string()
            .min(1, 'Refresh token is required')
    })
});
// Forgot password schema
exports.forgotPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string()
            .email('Invalid email address')
    })
});
// Reset password schema
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string()
            .min(1, 'Token is required'),
        password: passwordValidation
    })
});
// Update profile schema
exports.updateProfileSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name must be less than 100 characters')
            .optional(),
        avatar: zod_1.z.string()
            .url('Invalid URL')
            .optional()
    })
});
// Change password schema
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string()
            .min(1, 'Current password is required'),
        newPassword: passwordValidation
    })
});
// Resend verification schema
exports.resendVerificationSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string()
            .email('Invalid email address')
    })
});
// Delete account schema
exports.deleteAccountSchema = zod_1.z.object({
    body: zod_1.z.object({
        password: zod_1.z.string()
            .min(1, 'Password is required to delete account')
    })
});
//# sourceMappingURL=auth.validator.js.map