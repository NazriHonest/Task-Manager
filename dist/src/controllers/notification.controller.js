"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateNotificationPreferences = exports.getNotificationPreferences = exports.sendTestNotification = exports.getNotificationStats = exports.deleteNotification = exports.markAllAsRead = exports.markAsRead = exports.getUserNotifications = exports.createBulkNotifications = exports.createNotification = void 0;
const prisma_1 = require("../../lib/prisma");
const websocket_service_js_1 = __importDefault(require("../services/websocket.service.js"));
// Helper function to send notification via WebSocket
const sendWebSocketNotification = async (notification) => {
    try {
        const notificationData = {
            id: notification.id,
            type: notification.type,
            title: notification.title || 'Notification',
            message: notification.message,
            userId: notification.userId,
            read: notification.isRead || false,
            createdAt: notification.createdAt,
            data: notification.metadata || {} // Use metadata instead of data
        };
        // Send via WebSocket if user is connected
        if (notification.userId) {
            return websocket_service_js_1.default.sendNotificationToUser(notification.userId, notificationData);
        }
        return false;
    }
    catch (error) {
        console.error('Error sending WebSocket notification:', error);
        return false;
    }
};
// Create a new notification - FIXED
const createNotification = async (req, res) => {
    try {
        // Destructure to separate metadata from other fields
        const { data, ...notificationData } = req.body;
        const notification = await prisma_1.prisma.notification.create({
            data: {
                ...notificationData,
                isRead: notificationData.isRead !== undefined ? notificationData.isRead : false,
                metadata: data || null, // Map 'data' to 'metadata' field
                userId: notificationData.userId // Ensure userId is included
            }
        });
        // Send real-time notification via WebSocket
        await sendWebSocketNotification(notification);
        res.status(201).json(notification);
    }
    catch (error) {
        console.error('Error creating notification:', error);
        res.status(400).json({ error: error.message });
    }
};
exports.createNotification = createNotification;
// Create and send notification to multiple users - FIXED
const createBulkNotifications = async (req, res) => {
    try {
        const { userIds, data, ...notificationData } = req.body;
        if (!userIds || !Array.isArray(userIds)) {
            res.status(400).json({ error: 'userIds array is required' });
            return;
        }
        const notifications = await Promise.all(userIds.map(async (userId) => {
            const notification = await prisma_1.prisma.notification.create({
                data: {
                    ...notificationData,
                    userId,
                    isRead: notificationData.isRead !== undefined ? notificationData.isRead : false,
                    metadata: data || null // Map 'data' to 'metadata'
                }
            });
            // Send WebSocket notification
            await sendWebSocketNotification(notification);
            return notification;
        }));
        res.status(201).json({
            message: `Notifications sent to ${notifications.length} users`,
            notifications
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.createBulkNotifications = createBulkNotifications;
// Get user notifications
const getUserNotifications = async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0, unreadOnly = false } = req.query;
        const whereClause = { userId };
        if (unreadOnly === 'true') {
            whereClause.isRead = false;
        }
        const notifications = await prisma_1.prisma.notification.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset)
        });
        // Transform metadata to data for response
        const transformedNotifications = notifications.map((notification) => ({
            ...notification,
            data: notification.metadata || {} // Map metadata to data in response
        }));
        const total = await prisma_1.prisma.notification.count({ where: whereClause });
        const unreadCount = await prisma_1.prisma.notification.count({
            where: {
                userId,
                isRead: false
            }
        });
        res.json({
            notifications: transformedNotifications,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset),
                hasMore: Number(offset) + notifications.length < total
            },
            unreadCount
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.getUserNotifications = getUserNotifications;
// Mark notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma_1.prisma.notification.update({
            where: { id },
            data: {
                isRead: true,
                updatedAt: new Date()
            }
        });
        // Optionally emit read status via WebSocket
        if (notification.userId) {
            websocket_service_js_1.default.sendNotificationToUser(notification.userId, {
                type: 'NOTIFICATION_READ',
                title: 'Notification Read',
                message: `Notification marked as read`,
                userId: notification.userId,
                data: notification.metadata || {}, // Use metadata
                metadata: {
                    notificationId: id,
                    updatedAt: new Date().toISOString()
                }
            });
        }
        res.json({
            ...notification,
            data: notification.metadata || {} // Map metadata to data in response
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.markAsRead = markAsRead;
// Mark all notifications as read for a user
const markAllAsRead = async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await prisma_1.prisma.notification.updateMany({
            where: {
                userId,
                isRead: false
            },
            data: {
                isRead: true,
                updatedAt: new Date()
            }
        });
        // Send WebSocket update
        websocket_service_js_1.default.sendNotificationToUser(userId, {
            type: 'ALL_NOTIFICATIONS_READ',
            title: 'All Notifications Read',
            message: 'All notifications have been marked as read',
            userId,
            metadata: {
                count: result.count,
                timestamp: new Date().toISOString()
            }
        });
        res.json({
            message: `${result.count} notifications marked as read`,
            count: result.count
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.markAllAsRead = markAllAsRead;
// Delete a notification
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma_1.prisma.notification.delete({
            where: { id }
        });
        // Send deletion notification via WebSocket
        if (notification.userId) {
            websocket_service_js_1.default.sendNotificationToUser(notification.userId, {
                type: 'NOTIFICATION_DELETED',
                title: 'Notification Deleted',
                message: 'A notification has been deleted',
                userId: notification.userId,
                metadata: {
                    notificationId: id,
                    deletedAt: new Date().toISOString()
                }
            });
        }
        res.json({
            message: 'Notification deleted successfully',
            notification: {
                ...notification,
                data: notification.metadata || {}
            }
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.deleteNotification = deleteNotification;
// Get notification statistics
const getNotificationStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const [total, unread, todayCount, thisWeekCount] = await Promise.all([
            prisma_1.prisma.notification.count({ where: { userId } }),
            prisma_1.prisma.notification.count({
                where: {
                    userId,
                    isRead: false
                }
            }),
            prisma_1.prisma.notification.count({
                where: {
                    userId,
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            prisma_1.prisma.notification.count({
                where: {
                    userId,
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);
        const typeDistribution = await prisma_1.prisma.notification.groupBy({
            by: ['type'],
            where: { userId },
            _count: true
        });
        res.json({
            total,
            unread,
            todayCount,
            thisWeekCount,
            typeDistribution: typeDistribution.map((item) => ({
                type: item.type,
                count: item._count
            }))
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.getNotificationStats = getNotificationStats;
// Trigger a test notification (for development) - FIXED
const sendTestNotification = async (req, res) => {
    try {
        const { userId, type = 'TASK_ASSIGNED', title = 'Test Notification', message = 'This is a test notification', data // This will be stored as metadata
         } = req.body;
        if (!userId) {
            res.status(400).json({ error: 'userId is required' });
            return;
        }
        // Create notification in database
        const notification = await prisma_1.prisma.notification.create({
            data: {
                userId,
                type,
                title,
                message,
                isRead: false,
                metadata: data || {
                    test: true,
                    timestamp: new Date().toISOString()
                }
            }
        });
        // Send via WebSocket
        const sent = await sendWebSocketNotification(notification);
        res.json({
            success: true,
            notification: {
                ...notification,
                data: notification.metadata || {}
            },
            webSocketSent: sent,
            message: sent
                ? 'Notification created and sent via WebSocket'
                : 'Notification created but user is not connected to WebSocket'
        });
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.sendTestNotification = sendTestNotification;
// Get notification preferences
const getNotificationPreferences = async (req, res) => {
    try {
        const { userId } = req.params;
        let preferences = await prisma_1.prisma.notificationPreferences.findUnique({
            where: { userId }
        });
        // Create default preferences if they don't exist
        if (!preferences) {
            preferences = await prisma_1.prisma.notificationPreferences.create({
                data: { userId }
            });
        }
        res.json(preferences);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.getNotificationPreferences = getNotificationPreferences;
// Update notification preferences
const updateNotificationPreferences = async (req, res) => {
    try {
        const { userId } = req.params;
        const preferences = await prisma_1.prisma.notificationPreferences.upsert({
            where: { userId },
            update: {
                ...req.body,
                updatedAt: new Date()
            },
            create: {
                userId,
                ...req.body
            }
        });
        res.json(preferences);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
};
exports.updateNotificationPreferences = updateNotificationPreferences;
exports.default = {
    createNotification: exports.createNotification,
    createBulkNotifications: exports.createBulkNotifications,
    getUserNotifications: exports.getUserNotifications,
    markAsRead: exports.markAsRead,
    markAllAsRead: exports.markAllAsRead,
    deleteNotification: exports.deleteNotification,
    getNotificationStats: exports.getNotificationStats,
    sendTestNotification: exports.sendTestNotification,
    getNotificationPreferences: exports.getNotificationPreferences,
    updateNotificationPreferences: exports.updateNotificationPreferences
};
//# sourceMappingURL=notification.controller.js.map