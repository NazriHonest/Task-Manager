import { Router, Request, Response } from 'express';
import WebSocketService from '../services/websocket.service';
import { NotificationPayload } from '../types/websocket.types';

const router = Router();

// Test endpoint to send WebSocket notifications
router.post('/test-notification', (req: Request, res: Response) => {
  const { userId, type, title, message, data } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const notification: NotificationPayload = {
    type: type || 'TEST_NOTIFICATION',
    title: title || 'Test Notification',
    message: message || 'This is a test notification',
    userId: userId,
    data: data || { test: true, timestamp: new Date().toISOString() }
  };

  // Send via WebSocket
  const sent = WebSocketService.sendNotificationToUser(userId, notification);

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
router.post('/project-notification', (req: Request, res: Response) => {
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

  const sent = WebSocketService.sendToProject(projectId, projectUpdate);

  res.json({
    success: true,
    sent: sent,
    message: `Notification sent to project ${projectId}`,
    data: projectUpdate
  });
});

// Get WebSocket server status
router.get('/status', (_req: Request, res: Response) => {
  const status = WebSocketService.getStatus();
  res.json(status);
});

// Broadcast message to all connected clients
router.post('/broadcast', (req: Request, res: Response) => {
  const { type, title, message, data } = req.body;

  const broadcastData = {
    type: type || 'BROADCAST',
    title: title || 'Broadcast Message',
    message: message,
    data: data,
    timestamp: new Date().toISOString(),
    from: 'server'
  };

  WebSocketService.broadcastToAll(broadcastData);

  res.json({
    success: true,
    message: 'Broadcast sent to all connected clients',
    data: broadcastData
  });
});

// Get rooms and their members
router.get('/rooms', (_req: Request, res: Response) => {
  const rooms = WebSocketService.getRoomsInfo();

  res.json({
    success: true,
    rooms: rooms
  });
});

export default router;