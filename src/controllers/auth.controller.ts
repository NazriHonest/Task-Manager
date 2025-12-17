import { Request, Response } from 'express';
import { prisma }  from '../../lib/prisma';
import { AuthUtils } from '../utils/auth.utils';
import { emailService } from '../services/email.service';
import {
  RegisterInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput
} from '../validators/auth.validator';

//const prisma = new PrismaClient();

export class AuthController {
  // Register new user
  static async register(req: Request, res: Response) {
    try {
      const { name, email, password }: RegisterInput = req.body;

      // Convert password to lowercase as per requirements
      const lowerCasePassword = password.toLowerCase();

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({
          status: 'error',
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const hashedPassword = await AuthUtils.hashPassword(lowerCasePassword);

      // Generate verification token
      const verificationToken = AuthUtils.generateVerificationToken();

      // Create user
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          verificationToken,
          isVerified: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      });

      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken({
        userId: user.id,
        email: user.email
      });

      const refreshToken = AuthUtils.generateRefreshToken({
        userId: user.id,
        email: user.email
      });

      // Save refresh token to database
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Send verification email
      if (process.env.NODE_ENV !== 'test') {
        await emailService.sendVerificationEmail(user.email, user.name || 'User', verificationToken);
      }

      return res.status(201).json({
        status: 'success',
        message: 'User registered successfully. Please check your email to verify your account.',
        data: {
          user,
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response) {
    try {
      const { email, password }: LoginInput = req.body;

      // Convert password to lowercase to match registration
      const lowerCasePassword = password.toLowerCase();

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password'
        });
      }

      // Check if email is verified (optional - you can remove this if you don't want email verification)
      if (!user.isVerified && process.env.REQUIRE_EMAIL_VERIFICATION === 'true') {
        return res.status(403).json({
          status: 'error',
          message: 'Please verify your email address before logging in'
        });
      }

      // Check password
      const isPasswordValid = await AuthUtils.comparePassword(lowerCasePassword, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid email or password'
        });
      }

      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken({
        userId: user.id,
        email: user.email
      });

      const refreshToken = AuthUtils.generateRefreshToken({
        userId: user.id,
        email: user.email
      });

      // Save refresh token to database
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      // Remove sensitive fields from response
      const { password: _, verificationToken, resetToken, resetTokenExpiry, ...userWithoutSensitiveData } = user;

      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: userWithoutSensitiveData,
          tokens: {
            accessToken,
            refreshToken
          }
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Refresh access token
  static async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken }: RefreshTokenInput = req.body;

      // Verify refresh token
      const payload = AuthUtils.verifyRefreshToken(refreshToken);
      if (!payload) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid refresh token'
        });
      }

      // Check if refresh token exists in database
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true }
      });

      if (!storedToken || storedToken.expiresAt < new Date()) {
        return res.status(401).json({
          status: 'error',
          message: 'Refresh token expired or invalid'
        });
      }

      // Generate new access token
      const newAccessToken = AuthUtils.generateAccessToken({
        userId: payload.userId,
        email: payload.email
      });

      // Generate new refresh token
      const newRefreshToken = AuthUtils.generateRefreshToken({
        userId: payload.userId,
        email: payload.email
      });

      // Update refresh token in database
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          token: newRefreshToken,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      return res.status(200).json({
        status: 'success',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Forgot password
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email }: ForgotPasswordInput = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        // Don't reveal that user doesn't exist for security
        return res.status(200).json({
          status: 'success',
          message: 'If an account exists with this email, you will receive a password reset link'
        });
      }

      // Generate reset token
      const resetToken = AuthUtils.generateResetToken();
      const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

      // Save reset token to user
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken,
          resetTokenExpiry
        }
      });

      // Send password reset email
      if (process.env.NODE_ENV !== 'test') {
        await emailService.sendPasswordResetEmail(user.email, user.name || 'User', resetToken);
      }

      return res.status(200).json({
        status: 'success',
        message: 'If an account exists with this email, you will receive a password reset link'
      });

    } catch (error) {
      console.error('Forgot password error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Reset password
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, password }: ResetPasswordInput = req.body;

      // Find user by reset token
      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gt: new Date() // Token not expired
          }
        }
      });

      if (!user) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid or expired reset token'
        });
      }

      // Convert new password to lowercase for consistency
      const lowerCasePassword = password.toLowerCase();
      // Hash new password
      const hashedPassword = await AuthUtils.hashPassword(lowerCasePassword);

      // Update password and clear reset token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        }
      });

      // Invalidate all refresh tokens for this user (security measure)
      await prisma.refreshToken.deleteMany({
        where: { userId: user.id }
      });

      return res.status(200).json({
        status: 'success',
        message: 'Password reset successful. Please login with your new password.'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Logout
  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        // Delete the refresh token from database
        await prisma.refreshToken.deleteMany({
          where: { token: refreshToken }
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Logged out successfully'
      });

    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Verify email
  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.params;

      const user = await prisma.user.findFirst({
        where: {
          verificationToken: token
        }
      });

      if (!user) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid verification token'
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationToken: null
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'Email verified successfully. You can now login to your account.'
      });

    } catch (error) {
      console.error('Email verification error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }

  // Resend verification email
  static async resendVerification(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({
          status: 'error',
          message: 'User not found'
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already verified'
        });
      }

      // Generate new verification token
      const verificationToken = AuthUtils.generateVerificationToken();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          verificationToken
        }
      });

      // Send verification email
      if (process.env.NODE_ENV !== 'test') {
        await emailService.sendVerificationEmail(user.email, user.name || 'User', verificationToken);
      }

      return res.status(200).json({
        status: 'success',
        message: 'Verification email sent successfully'
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  }
}