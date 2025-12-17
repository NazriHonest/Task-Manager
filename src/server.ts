import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import multer from 'multer';

// Remove this import since we'll use our WebSocket setup
// import { socketService } from './lib/socket';

// Import our WebSocket setup
import WebSocketServer from './lib/websocket.js';
import WebSocketController from './controllers/websocket.controller.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import taskRoutes from './routes/task.routes.js';
import projectRoutes from './routes/project.routes.js';
import categoryRoutes from './routes/category.routes.js';
import tagRoutes from './routes/tag.routes.js';
import commentRoutes from './routes/comment.routes.js';
import attachmentRoutes from './routes/attachment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import websocketRoutes from './routes/websocket.routes.js';
import notificationRoutes from './routes/notification.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8000;

// ====================
// INITIALIZE WEBSOCKET
// ====================
console.log('🌐 Initializing WebSocket server...');

// Initialize our WebSocket server
const wsServer = new WebSocketServer(server);

// Initialize socket middleware and attach controllers
wsServer.initializeSocketMiddleware().attachControllers({
  'authenticate': WebSocketController.handleAuthenticate,
  'subscribe-notifications': WebSocketController.handleSubscribeNotifications,
  'join-project': WebSocketController.handleJoinProject,
  'subscribe-to-task': WebSocketController.handleSubscribeToTask,
  'task-updated': WebSocketController.handleTaskUpdated,
  'new-comment': WebSocketController.handleNewComment,
  'mark-notification-read': WebSocketController.handleMarkNotificationRead,
  'user-online': WebSocketController.handleUserOnline,
  'ping': WebSocketController.handlePing,
  'connection': WebSocketController.handleConnection
});

console.log('✅ WebSocket server initialized');

// ====================
// MIDDLEWARE
// ====================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// ====================
// ROUTES
// ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/websocket', websocketRoutes);
app.use('/api/notifications', notificationRoutes);

// ====================
// HEALTH & STATUS ENDPOINTS
// ====================
app.get('/health', (req, res) => {
  // Get WebSocket server instance
  const io = (global as any).io;
  const onlineUsers = io ? Array.from(io.sockets.sockets.values())
    .filter((socket: any) => !socket.userId?.startsWith('anonymous'))
    .map((socket: any) => socket.userId) : [];
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Task Management API',
    version: '1.0.0',
    websocket: {
      enabled: true,
      onlineUsers: onlineUsers.length,
      endpoint: `ws://localhost:${PORT}`
    },
    features: [
      'Auth', 'Users', 'Tasks', 'Projects', 
      'Categories', 'Tags', 'Comments', 
      'Attachments', 'Dashboard & Analytics',
      'Notifications & Real-time'
    ]
  });
});

// Socket.io status endpoint
app.get('/websocket-status', (req, res) => {
  const io = (global as any).io;
  
  if (!io) {
    return res.json({
      status: 'error',
      message: 'WebSocket server not initialized'
    });
  }
  
  const clients = Array.from(io.sockets.sockets.values());
  const onlineUsers = clients
    .filter((socket: any) => !socket.userId?.startsWith('anonymous'))
    .map((socket: any) => ({
      userId: socket.userId,
      socketId: socket.id,
      rooms: Array.from(socket.rooms)
    }));
  
  res.json({
    status: 'success',
    data: {
      connectedClients: clients.length,
      onlineUsers: onlineUsers,
      totalOnline: onlineUsers.length,
      endpoint: `ws://localhost:${PORT}`,
      transports: ['websocket', 'polling'],
      serverTime: new Date().toISOString()
    }
  });
});

// Test endpoint to send WebSocket notifications
app.post('/api/websocket/send-test', (req, res) => {
  const io = (global as any).io;
  
  if (!io) {
    return res.status(500).json({ error: 'WebSocket server not initialized' });
  }
  
  const { userId, message } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  const room = `user:${userId}`;
  
  io.to(room).emit('notification', {
    type: 'TEST',
    title: 'Test Notification',
    message: message || 'Hello from server!',
    userId: userId,
    timestamp: new Date().toISOString(),
    data: { test: true }
  });
  
  res.json({
    success: true,
    message: `Test notification sent to ${userId}`,
    room: room
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'File too large. Maximum size is 10MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Too many files. Maximum 5 files per upload'
      });
    }
  }
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ====================
// START SERVER
// ====================
server.listen(PORT, () => {
  console.log(`
    🚀 Server running on port ${PORT}
    📁 Database URL: ${process.env.DATABASE_URL}
    🌍 Environment: ${process.env.NODE_ENV}
    📚 API Documentation: http://localhost:${PORT}/health
    📝 Task API: http://localhost:${PORT}/api/tasks
    📊 Project API: http://localhost:${PORT}/api/projects
    🏷️  Category API: http://localhost:${PORT}/api/categories
    🏷️  Tag API: http://localhost:${PORT}/api/tags
    💬 Comment API: http://localhost:${PORT}/api/comments
    📎 Attachment API: http://localhost:${PORT}/api/attachments
    📈 Dashboard API: http://localhost:${PORT}/api/dashboard
    🔔 Notification API: http://localhost:${PORT}/api/notifications
    ⚡ WebSocket: ws://localhost:${PORT}
    📡 WebSocket Status: http://localhost:${PORT}/websocket-status
    🔧 WebSocket Test: POST http://localhost:${PORT}/api/websocket/send-test
  `);
});