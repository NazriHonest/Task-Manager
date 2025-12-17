import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import WebSocketService from '../services/websocket.service.js';
import { NotificationPayload } from '../types/websocket.types.js';

// Helper function to send notification via WebSocket
const sendWebSocketNotification = async (notification: any): Promise<boolean> => {
  try {
    const notificationData: NotificationPayload = {
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
      return WebSocketService.sendNotificationToUser(notification.userId, notificationData);
    }
    
    return false;
  } catch (error) {
    console.error('Error sending WebSocket notification:', error);
    return false;
  }
};

// Create a new notification - FIXED
export const createNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    // Destructure to separate metadata from other fields
    const { data, ...notificationData } = req.body;

    const notification = await prisma.notification.create({
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
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(400).json({ error: (error as Error).message });
  }
};

// Create and send notification to multiple users - FIXED
export const createBulkNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIds, data, ...notificationData } = req.body;

    if (!userIds || !Array.isArray(userIds)) {
      res.status(400).json({ error: 'userIds array is required' });
      return;
    }

    const notifications = await Promise.all(
      userIds.map(async (userId: string) => {
        const notification = await prisma.notification.create({
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
      })
    );

    res.status(201).json({
      message: `Notifications sent to ${notifications.length} users`,
      notifications
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Get user notifications
export const getUserNotifications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;

    const whereClause: any = { userId };
    
    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    });

    // Transform metadata to data for response
    const transformedNotifications = notifications.map((notification: { metadata: any; }) => ({
      ...notification,
      data: notification.metadata || {} // Map metadata to data in response
    }));

    const total = await prisma.notification.count({ where: whereClause });
    
    const unreadCount = await prisma.notification.count({
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
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Mark notification as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id },
      data: { 
        isRead: true,
        updatedAt: new Date()
      }
    });

    // Optionally emit read status via WebSocket
    if (notification.userId) {
      WebSocketService.sendNotificationToUser(notification.userId, {
        type: 'NOTIFICATION_READ',
        title: 'Notification Read',
        message: `Notification marked as read`,
        userId: notification.userId,
        data: notification.metadata || {}, // Use metadata
        metadata: { // Additional metadata
          notificationId: id, 
          updatedAt: new Date().toISOString()
        }
      });
    }

    res.json({
      ...notification,
      data: notification.metadata || {} // Map metadata to data in response
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Mark all notifications as read for a user
export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const result = await prisma.notification.updateMany({
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
    WebSocketService.sendNotificationToUser(userId, {
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
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Delete a notification
export const deleteNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.delete({
      where: { id }
    });

    // Send deletion notification via WebSocket
    if (notification.userId) {
      WebSocketService.sendNotificationToUser(notification.userId, {
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
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Get notification statistics
export const getNotificationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const [total, unread, todayCount, thisWeekCount] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      
      prisma.notification.count({ 
        where: { 
          userId, 
          isRead: false
        } 
      }),
      
      prisma.notification.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      prisma.notification.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    const typeDistribution = await prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: true
    });

    res.json({
      total,
      unread,
      todayCount,
      thisWeekCount,
      typeDistribution: typeDistribution.map((item: { type: any; _count: any; }) => ({
        type: item.type,
        count: item._count
      }))
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Trigger a test notification (for development) - FIXED
export const sendTestNotification = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      userId, 
      type = 'TASK_ASSIGNED', 
      title = 'Test Notification', 
      message = 'This is a test notification',
      data // This will be stored as metadata
    } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'userId is required' });
      return;
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        isRead: false,
        metadata: data || { // Store as metadata
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
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Get notification preferences
export const getNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await prisma.notificationPreferences.create({
        data: { userId }
      });
    }

    res.json(preferences);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const preferences = await prisma.notificationPreferences.upsert({
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
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

export default {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationStats,
  sendTestNotification,
  getNotificationPreferences,
  updateNotificationPreferences
};