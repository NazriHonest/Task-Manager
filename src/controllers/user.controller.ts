import { Request, Response } from 'express';
import { prisma }  from '../../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { UpdateProfileInput } from '../validators/auth.validator';
import { AuthUtils } from '../utils/auth.utils';  // ← Fix import here

//const PrismaClient = new prisma();

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: { user }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const data: UpdateProfileInput = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Change password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Convert password to lowercase for comparison consistency
    const lowerCaseCurrentPassword = currentPassword.toLowerCase();
    // Verify current password using AuthUtils class
    const isPasswordValid = await AuthUtils.comparePassword(lowerCaseCurrentPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Convert new password to lowercase for consistency
    const lowerCaseNewPassword = newPassword.toLowerCase();
    // Hash new password using AuthUtils class
    const hashedPassword = await AuthUtils.hashPassword(lowerCaseNewPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // Invalidate all refresh tokens (security measure)
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Password changed successfully. Please login again.'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Upload avatar
export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({
        status: 'error',
        message: 'Avatar URL is required'
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true
      }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Avatar updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Upload avatar error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

// Delete account
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required to delete account'
      });
    }

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    // Convert password to lowercase for comparison consistency
    const lowerCasePassword = password.toLowerCase();
    // Verify password using AuthUtils class
    const isPasswordValid = await AuthUtils.comparePassword(lowerCasePassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Password is incorrect'
      });
    }

    // Delete user (Prisma will cascade delete related records)
    await prisma.user.delete({
      where: { id: userId }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};