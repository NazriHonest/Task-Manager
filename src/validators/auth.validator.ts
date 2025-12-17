import { z } from 'zod';

// Password validation regex (adjusted for lowercase conversion)
const passwordRegex = /^(?=.*[a-z])(?=.*\d).+$/;

// Common password validation
const passwordValidation = z.string()
  .min(6, 'Password must be at least 6 characters')
  .regex(passwordRegex, 'Password must contain at least one letter and one number');

// Register schema
export const registerSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters'),
    email: z.string()
      .email('Invalid email address')
      .max(255, 'Email must be less than 255 characters'),
    password: passwordValidation
  })
});

// Login schema
export const loginSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email address'),
    password: z.string()
      .min(1, 'Password is required')
  })
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string()
      .min(1, 'Refresh token is required')
  })
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email address')
  })
});

// Reset password schema
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string()
      .min(1, 'Token is required'),
    password: passwordValidation
  })
});

// Update profile schema
export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be less than 100 characters')
      .optional(),
    avatar: z.string()
      .url('Invalid URL')
      .optional()
  })
});

// Change password schema
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string()
      .min(1, 'Current password is required'),
    newPassword: passwordValidation
  })
});

// Resend verification schema
export const resendVerificationSchema = z.object({
  body: z.object({
    email: z.string()
      .email('Invalid email address')
  })
});

// Delete account schema
export const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string()
      .min(1, 'Password is required to delete account')
  })
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>['body'];
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>['body'];