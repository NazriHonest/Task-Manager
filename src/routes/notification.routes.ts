import { Router } from 'express';
import notificationController from '../controllers/notification.controller.js';

const router = Router();

// Create a new notification
router.post('/', notificationController.createNotification);

// Create notifications for multiple users
router.post('/bulk', notificationController.createBulkNotifications);

// Get user notifications
router.get('/user/:userId', notificationController.getUserNotifications);

// Mark notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read for a user
router.patch('/user/:userId/read-all', notificationController.markAllAsRead);

// Delete a notification
router.delete('/:id', notificationController.deleteNotification);

// Get notification statistics
router.get('/user/:userId/stats', notificationController.getNotificationStats);

// Send test notification (for development)
router.post('/test', notificationController.sendTestNotification);

// Get notification preferences
router.get('/user/:userId/preferences', notificationController.getNotificationPreferences);

// Update notification preferences
router.put('/user/:userId/preferences', notificationController.updateNotificationPreferences);

export default router;