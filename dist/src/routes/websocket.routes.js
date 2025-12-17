"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const websocket_service_1 = __importDefault(require("../services/websocket.service"));
const router = (0, express_1.Router)();
// Test endpoint to send WebSocket notifications
router.post('/test-notification', (req, res) => {
    const { userId, type, title, message, data } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
    }
    const notification = {
        type: type || 'TEST_NOTIFICATION',
        title: title || 'Test Notification',
        message: message || 'This is a test notification',
        userId: userId,
        data: data || { test: true, timestamp: new Date().toISOString() }
    };
    // Send via WebSocket
    const sent = websocket_service_1.default.sendNotificationToUser(userId, notification);
    res.json({
        success: true,
        sent: sent,
        message: sent
            ? `Notification sent to user ${userId}`
            : `User ${userId} is not connected to WebSocket`,
        notification: notification
    });
});
// Send notification to project room
router.post('/project-notification', (req, res) => {
    const { projectId, type, title, message, data } = req.body;
    if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
    }
    const projectUpdate = {
        type: type || 'PROJECT_UPDATE',
        title: title || 'Project Update',
        message: message,
        projectId: projectId,
        data: data,
        timestamp: new Date().toISOString()
    };
    const sent = websocket_service_1.default.sendToProject(projectId, projectUpdate);
    res.json({
        success: true,
        sent: sent,
        message: `Notification sent to project ${projectId}`,
        data: projectUpdate
    });
});
// Get WebSocket server status
router.get('/status', (_req, res) => {
    const status = websocket_service_1.default.getStatus();
    res.json(status);
});
// Broadcast message to all connected clients
router.post('/broadcast', (req, res) => {
    const { type, title, message, data } = req.body;
    const broadcastData = {
        type: type || 'BROADCAST',
        title: title || 'Broadcast Message',
        message: message,
        data: data,
        timestamp: new Date().toISOString(),
        from: 'server'
    };
    websocket_service_1.default.broadcastToAll(broadcastData);
    res.json({
        success: true,
        message: 'Broadcast sent to all connected clients',
        data: broadcastData
    });
});
// Get rooms and their members
router.get('/rooms', (_req, res) => {
    const rooms = websocket_service_1.default.getRoomsInfo();
    res.json({
        success: true,
        rooms: rooms
    });
});
exports.default = router;
//# sourceMappingURL=websocket.routes.js.map