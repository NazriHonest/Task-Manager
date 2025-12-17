"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const multer_1 = __importDefault(require("multer"));
// Remove this import since we'll use our WebSocket setup
// import { socketService } from './lib/socket';
// Import our WebSocket setup
const websocket_js_1 = __importDefault(require("./lib/websocket.js"));
const websocket_controller_js_1 = __importDefault(require("./controllers/websocket.controller.js"));
// Import routes
const auth_routes_js_1 = __importDefault(require("./routes/auth.routes.js"));
const user_routes_js_1 = __importDefault(require("./routes/user.routes.js"));
const task_routes_js_1 = __importDefault(require("./routes/task.routes.js"));
const project_routes_js_1 = __importDefault(require("./routes/project.routes.js"));
const category_routes_js_1 = __importDefault(require("./routes/category.routes.js"));
const tag_routes_js_1 = __importDefault(require("./routes/tag.routes.js"));
const comment_routes_js_1 = __importDefault(require("./routes/comment.routes.js"));
const attachment_routes_js_1 = __importDefault(require("./routes/attachment.routes.js"));
const dashboard_routes_js_1 = __importDefault(require("./routes/dashboard.routes.js"));
const websocket_routes_js_1 = __importDefault(require("./routes/websocket.routes.js"));
const notification_routes_js_1 = __importDefault(require("./routes/notification.routes.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = process.env.PORT || 8000;
// ====================
// INITIALIZE WEBSOCKET
// ====================
console.log('🌐 Initializing WebSocket server...');
// Initialize our WebSocket server
const wsServer = new websocket_js_1.default(server);
// Initialize socket middleware and attach controllers
wsServer.initializeSocketMiddleware().attachControllers({
    'authenticate': websocket_controller_js_1.default.handleAuthenticate,
    'subscribe-notifications': websocket_controller_js_1.default.handleSubscribeNotifications,
    'join-project': websocket_controller_js_1.default.handleJoinProject,
    'subscribe-to-task': websocket_controller_js_1.default.handleSubscribeToTask,
    'task-updated': websocket_controller_js_1.default.handleTaskUpdated,
    'new-comment': websocket_controller_js_1.default.handleNewComment,
    'mark-notification-read': websocket_controller_js_1.default.handleMarkNotificationRead,
    'user-online': websocket_controller_js_1.default.handleUserOnline,
    'ping': websocket_controller_js_1.default.handlePing,
    'connection': websocket_controller_js_1.default.handleConnection
});
console.log('✅ WebSocket server initialized');
// ====================
// MIDDLEWARE
// ====================
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
// ====================
// ROUTES
// ====================
app.use('/api/auth', auth_routes_js_1.default);
app.use('/api/users', user_routes_js_1.default);
app.use('/api/tasks', task_routes_js_1.default);
app.use('/api/projects', project_routes_js_1.default);
app.use('/api/categories', category_routes_js_1.default);
app.use('/api/tags', tag_routes_js_1.default);
app.use('/api/comments', comment_routes_js_1.default);
app.use('/api/attachments', attachment_routes_js_1.default);
app.use('/api/dashboard', dashboard_routes_js_1.default);
app.use('/api/websocket', websocket_routes_js_1.default);
app.use('/api/notifications', notification_routes_js_1.default);
// ====================
// HEALTH & STATUS ENDPOINTS
// ====================
app.get('/health', (req, res) => {
    // Get WebSocket server instance
    const io = global.io;
    const onlineUsers = io ? Array.from(io.sockets.sockets.values())
        .filter((socket) => !socket.userId?.startsWith('anonymous'))
        .map((socket) => socket.userId) : [];
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
    const io = global.io;
    if (!io) {
        return res.json({
            status: 'error',
            message: 'WebSocket server not initialized'
        });
    }
    const clients = Array.from(io.sockets.sockets.values());
    const onlineUsers = clients
        .filter((socket) => !socket.userId?.startsWith('anonymous'))
        .map((socket) => ({
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
    const io = global.io;
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
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err instanceof multer_1.default.MulterError) {
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
//# sourceMappingURL=server.js.map