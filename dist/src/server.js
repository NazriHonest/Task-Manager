"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http"));
const multer_1 = __importDefault(require("multer"));
// Import your existing Prisma client from prisma.ts
const prisma_1 = require("../lib/prisma"); // Adjust path to your prisma.ts file
Object.defineProperty(exports, "prisma", { enumerable: true, get: function () { return prisma_1.prisma; } });
// Import WebSocket setup
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
// Get connection string from environment variable
const connectionString = process.env.DATABASE_URL || '';
console.log('🚀 RUNNING service.ts build');
// ====================
// DATABASE CONNECTION TEST
// ====================
console.log('🔧 Testing database connection...');
async function testDatabaseConnection() {
    try {
        // Test connection with a simple query
        const result = await prisma_1.prisma.$queryRaw `SELECT 1 as connection_test, version() as postgres_version, current_database() as db_name`;
        if (result && Array.isArray(result) && result.length > 0) {
            const row = result[0];
            console.log('✅ Database connected successfully!');
            console.log(`📊 PostgreSQL: ${row.postgres_version}`);
            console.log(`📁 Database: ${row.db_name}`);
            // Check connection type
            const isPooled = connectionString.includes('-pooler');
            const isNeon = connectionString.includes('neon.tech');
            console.log(`🔗 Provider: ${isNeon ? 'Neon PostgreSQL' : 'PostgreSQL'}`);
            console.log(`🔗 Connection: ${isPooled ? 'Pooled' : 'Direct'}`);
            console.log(`🔒 SSL: ${connectionString.includes('sslmode=require') ? 'Enabled' : 'Disabled'}`);
        }
        return true;
    }
    catch (error) {
        console.error('❌ Database connection failed:', error.message);
        // Provide helpful error messages
        if (error.message.includes('SSL') || error.message.includes('sslv3')) {
            console.error('💡 Tip: Add ?sslmode=require to your DATABASE_URL for Neon');
        }
        if (error.message.includes('authentication')) {
            console.error('💡 Tip: Check your database credentials in Render environment variables');
        }
        if (error.message.includes('does not exist')) {
            console.error('💡 Tip: Database might not exist. Check the database name');
        }
        if (error.message.includes('connection') && error.message.includes('refused')) {
            console.error('💡 Tip: For Neon, use pooled connection: Add -pooler to hostname');
        }
        // Log the DATABASE_URL (with password masked)
        const maskedUrl = connectionString.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@');
        console.error(`🔗 Attempted connection to: ${maskedUrl}`);
        return false;
    }
}
// Initialize database connection
let dbConnected = false;
(async () => {
    dbConnected = await testDatabaseConnection();
    if (!dbConnected && process.env.NODE_ENV === 'production') {
        console.error('🛑 Critical: Cannot start server without database connection');
        console.log('\n📋 Troubleshooting steps:');
        console.log('1. Go to Render dashboard → Environment variables');
        console.log('2. Verify DATABASE_URL is correct');
        console.log('3. For Neon, ensure it includes ?sslmode=require');
        console.log('4. Consider using pooled connection (-pooler in hostname)');
        // Don't exit in development for testing
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
})();
// Graceful shutdown handlers
process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT. Closing database connections...');
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM. Closing database connections...');
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
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
// Add database to request context
app.use((req, res, next) => {
    req.prisma = prisma_1.prisma;
    next();
});
// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
});
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
app.get('/health', async (req, res) => {
    // Get WebSocket server instance
    const io = global.io;
    const onlineUsers = io ? Array.from(io.sockets.sockets.values())
        .filter((socket) => !socket.userId?.startsWith('anonymous'))
        .map((socket) => socket.userId) : [];
    // Test database connection
    let dbStatus = 'unknown';
    let dbLatency = 0;
    let dbError = null;
    let dbVersion = null;
    try {
        const start = Date.now();
        const result = await prisma_1.prisma.$queryRaw `SELECT version() as version`;
        dbLatency = Date.now() - start;
        dbStatus = 'connected';
        if (result && Array.isArray(result) && result.length > 0) {
            dbVersion = result[0].version;
        }
    }
    catch (error) {
        dbStatus = 'disconnected';
        dbError = error.message;
    }
    const isNeon = connectionString.includes('neon.tech');
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Task Management API',
        version: '1.0.0',
        // Database info
        database: {
            status: dbStatus,
            provider: isNeon ? 'Neon PostgreSQL' : 'PostgreSQL',
            version: dbVersion,
            latency: dbLatency > 0 ? `${dbLatency}ms` : 'N/A',
            ssl: connectionString.includes('sslmode=require') ? 'enabled' : 'disabled',
            pooled: connectionString.includes('-pooler') ? 'yes' : 'no',
            error: dbError
        },
        // WebSocket info
        websocket: {
            enabled: true,
            onlineUsers: onlineUsers.length,
            endpoint: `ws://localhost:${PORT}`
        },
        // System info
        environment: process.env.NODE_ENV || 'development',
        node_version: process.version,
        features: [
            'Auth', 'Users', 'Tasks', 'Projects',
            'Categories', 'Tags', 'Comments',
            'Attachments', 'Dashboard & Analytics',
            'Notifications & Real-time'
        ]
    });
});
app.get('/', (req, res) => {
    res.json({
        message: 'Task Management API',
        version: '1.0.0',
        docs: '/health'
    });
});
// Enhanced database status endpoint
app.get('/api/database/status', async (req, res) => {
    try {
        // Get database info using raw SQL
        const dbInfo = await prisma_1.prisma.$queryRaw `
      SELECT 
        current_database() as database_name,
        version() as postgres_version,
        pg_database_size(current_database()) as database_size_bytes,
        (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) as active_connections,
        (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
    `;
        // Get table counts
        const tableCounts = await prisma_1.prisma.$queryRaw `
      SELECT 
        schemaname,
        relname as table_name,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC
    `;
        res.json({
            status: 'success',
            data: {
                connection: {
                    provider: connectionString.includes('neon.tech') ? 'Neon PostgreSQL' : 'PostgreSQL',
                    ssl: connectionString.includes('sslmode=require') ? 'enabled' : 'disabled',
                    pooled: connectionString.includes('-pooler') ? 'yes' : 'no'
                },
                database: {
                    ...dbInfo[0],
                    database_size_mb: Number(dbInfo[0].database_size_bytes) / (1024 * 1024)
                },
                tables: tableCounts,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Failed to get database status',
            error: error.message
        });
    }
});
// Database test endpoint
app.get('/api/database/test', async (req, res) => {
    try {
        // Test various database operations
        const [connectionTest, tables, version] = await Promise.all([
            prisma_1.prisma.$queryRaw `SELECT 1 as test, NOW() as server_time`,
            prisma_1.prisma.$queryRaw `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `,
            prisma_1.prisma.$queryRaw `SELECT version() as postgres_version`
        ]);
        res.json({
            status: 'success',
            message: 'Database test successful',
            tests: {
                connection: connectionTest[0],
                tables: tables,
                version: version[0],
                ssl_enabled: connectionString.includes('sslmode=require') ? true : false,
                is_pooled: connectionString.includes('-pooler') ? true : false,
                provider: connectionString.includes('neon.tech') ? 'Neon' : 'PostgreSQL'
            }
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Database test failed',
            error: error.message,
            tip: connectionString.includes('neon.tech')
                ? 'For Neon: Add ?sslmode=require to DATABASE_URL'
                : 'Check your database connection'
        });
    }
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
app.post('/api/websocket/send-test', async (req, res) => {
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
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
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
    const isNeon = connectionString.includes('neon.tech');
    const isPooled = connectionString.includes('-pooler');
    const hasSSL = connectionString.includes('sslmode=require');
    console.log(`
    🚀 Server running on port ${PORT}
    📊 Database: ${isNeon ? 'Neon PostgreSQL' : 'PostgreSQL'} ${dbConnected ? '✅ Connected' : '❌ Disconnected'}
    🔗 Connection: ${isPooled ? 'Pooled' : 'Direct'}
    🔒 SSL: ${hasSSL ? 'Enabled' : 'Disabled'}
    🌍 Environment: ${process.env.NODE_ENV}
    
    📚 API Documentation: http://localhost:${PORT}/health
    📊 Database Status: http://localhost:${PORT}/api/database/status
    🧪 Database Test: http://localhost:${PORT}/api/database/test
    
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
    // Log database connection details (masked)
    if (connectionString) {
        const maskedUrl = connectionString.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@');
        console.log(`🔗 Database URL: ${maskedUrl}`);
    }
});
//# sourceMappingURL=server.js.map