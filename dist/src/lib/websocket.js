"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class WebSocketServer {
    constructor(server) {
        if (!server) {
            throw new Error('HTTP server instance is required');
        }
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                credentials: true,
                methods: ["GET", "POST"]
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });
        // Make io accessible globally
        global.io = this.io;
        console.log('🌐 WebSocket server initialized');
    }
    initializeSocketMiddleware() {
        this.io.use((socket, next) => {
            try {
                // Try to get token from multiple sources
                const token = socket.handshake.auth?.token ||
                    socket.handshake.query?.token ||
                    (socket.handshake.headers.authorization &&
                        socket.handshake.headers.authorization.replace('Bearer ', ''));
                if (token) {
                    const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                    // Type assertion - we're adding userId property to Socket
                    socket.userId =
                        decoded.userId || decoded.id;
                    socket.user = decoded;
                }
                else {
                    socket.userId = `anonymous-${socket.id.substring(0, 8)}`;
                }
                console.log(`🔗 Socket connection: ${socket.userId}`);
                next();
            }
            catch (error) {
                console.log('⚠️ Socket auth error:', error.message);
                socket.userId = `anonymous-${socket.id.substring(0, 8)}`;
                next();
            }
        });
        return this;
    }
    attachControllers(controllers) {
        this.io.on('connection', (socket) => {
            // Type assertion for socket with userId
            const authSocket = socket;
            console.log(`✅ New connection: ${authSocket.id} (User: ${authSocket.userId})`);
            // Bind all controller methods to socket events
            for (const [eventName, handler] of Object.entries(controllers)) {
                authSocket.on(eventName, (data) => {
                    handler(authSocket, data);
                });
            }
            // Handle disconnection
            authSocket.on('disconnect', () => {
                console.log(`❌ Disconnected: ${authSocket.id} (${authSocket.userId})`);
            });
        });
        return this;
    }
    getIO() {
        return this.io;
    }
}
exports.WebSocketServer = WebSocketServer;
exports.default = WebSocketServer;
//# sourceMappingURL=websocket.js.map