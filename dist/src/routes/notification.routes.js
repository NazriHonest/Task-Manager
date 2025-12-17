"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notification_controller_js_1 = __importDefault(require("../controllers/notification.controller.js"));
const router = (0, express_1.Router)();
// Create a new notification
router.post('/', notification_controller_js_1.default.createNotification);
// Create notifications for multiple users
router.post('/bulk', notification_controller_js_1.default.createBulkNotifications);
// Get user notifications
router.get('/user/:userId', notification_controller_js_1.default.getUserNotifications);
// Mark notification as read
router.patch('/:id/read', notification_controller_js_1.default.markAsRead);
// Mark all notifications as read for a user
router.patch('/user/:userId/read-all', notification_controller_js_1.default.markAllAsRead);
// Delete a notification
router.delete('/:id', notification_controller_js_1.default.deleteNotification);
// Get notification statistics
router.get('/user/:userId/stats', notification_controller_js_1.default.getNotificationStats);
// Send test notification (for development)
router.post('/test', notification_controller_js_1.default.sendTestNotification);
// Get notification preferences
router.get('/user/:userId/preferences', notification_controller_js_1.default.getNotificationPreferences);
// Update notification preferences
router.put('/user/:userId/preferences', notification_controller_js_1.default.updateNotificationPreferences);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map