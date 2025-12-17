"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.uploadAvatar = exports.changePassword = exports.updateProfile = exports.getProfile = void 0;
const prisma_1 = require("../../lib/prisma");
const auth_utils_1 = require("../utils/auth.utils"); // ← Fix import here
//const PrismaClient = new prisma();
// Get current user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma_1.prisma.user.findUnique({
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
    }
    catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.getProfile = getProfile;
// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const data = req.body;
        const updatedUser = await prisma_1.prisma.user.update({
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
    }
    catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.updateProfile = updateProfile;
// Change password
const changePassword = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;
        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                status: 'error',
                message: 'Current password and new password are required'
            });
        }
        // Get user with password
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        // Verify current password using AuthUtils class
        const isPasswordValid = await auth_utils_1.AuthUtils.comparePassword(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Current password is incorrect'
            });
        }
        // Hash new password using AuthUtils class
        const hashedPassword = await auth_utils_1.AuthUtils.hashPassword(newPassword);
        // Update password
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });
        // Invalidate all refresh tokens (security measure)
        await prisma_1.prisma.refreshToken.deleteMany({
            where: { userId }
        });
        return res.status(200).json({
            status: 'success',
            message: 'Password changed successfully. Please login again.'
        });
    }
    catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.changePassword = changePassword;
// Upload avatar
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { avatarUrl } = req.body;
        if (!avatarUrl) {
            return res.status(400).json({
                status: 'error',
                message: 'Avatar URL is required'
            });
        }
        const updatedUser = await prisma_1.prisma.user.update({
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
    }
    catch (error) {
        console.error('Upload avatar error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.uploadAvatar = uploadAvatar;
// Delete account
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({
                status: 'error',
                message: 'Password is required to delete account'
            });
        }
        // Get user with password
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }
        // Verify password using AuthUtils class
        const isPasswordValid = await auth_utils_1.AuthUtils.comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Password is incorrect'
            });
        }
        // Delete user (Prisma will cascade delete related records)
        await prisma_1.prisma.user.delete({
            where: { id: userId }
        });
        return res.status(200).json({
            status: 'success',
            message: 'Account deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete account error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
};
exports.deleteAccount = deleteAccount;
//# sourceMappingURL=user.controller.js.map