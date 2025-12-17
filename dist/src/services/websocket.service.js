"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.WebSocketService = {
    authenticateUser(token) {
        try {
            if (!token) {
                return { success: false, message: 'No token provided' };
            }
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            return {
                success: true,
                userId: decoded.userId || decoded.id,
                user: decoded
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Invalid token: ${error.message}`
            };
        }
    },
    sendNotificationToUser(userId, notification) {
        const io = global.io;
        if (!io) {
            console.error('WebSocket server not initialized');
            return false;
        }
        const room = `user:${userId}`;
        // Use io.to(room).emit() instead of accessing adapter directly
        io.to(room).emit('notification', {
            ...notification,
            timestamp: new Date().toISOString()
        });
        console.log(`📤 Notification sent to user:${userId}`);
        return true;
    },
    sendToProject(projectId, data) {
        const io = global.io;
        if (!io)
            return false;
        const room = `project:${projectId}`;
        io.to(room).emit('project-update', data);
        console.log(`📤 Project update sent to project:${projectId}`);
        return true;
    },
    sendToTask(taskId, data) {
        const io = global.io;
        if (!io)
            return false;
        const room = `task:${taskId}`;
        io.to(room).emit('task-update', data);
        return true;
    },
    broadcastToAll(data) {
        const io = global.io;
        if (!io)
            return false;
        io.emit('broadcast', data);
        console.log(`📢 Broadcast sent to ${io.engine.clientsCount} clients`);
        return true;
    },
    getConnectedClients() {
        const io = global.io;
        if (!io)
            return [];
        const sockets = Array.from(io.sockets.sockets.values());
        return sockets.map((socket) => ({
            id: socket.id,
            userId: socket.userId || 'anonymous',
            rooms: Array.from(socket.rooms || []),
            connectedAt: socket.handshake.issued,
            authenticated: !socket.userId?.startsWith('anonymous')
        }));
    },
    getRoomsInfo() {
        const io = global.io;
        if (!io)
            return {};
        // Get rooms through the server instance
        const rooms = io.sockets.adapter.rooms;
        const roomInfo = {};
        // Note: This still uses adapter, but it's on the server instance
        // If this causes issues, we need to track rooms differently
        for (const [roomName, room] of rooms.entries()) {
            // Skip room names that are socket IDs (individual client rooms)
            if (roomName.startsWith('user:') || roomName.startsWith('project:') || roomName.startsWith('task:')) {
                roomInfo[roomName] = {
                    clients: Array.from(room),
                    size: room.size
                };
            }
        }
        return roomInfo;
    },
    // Alternative room info without adapter
    getRoomsInfoAlt() {
        const io = global.io;
        if (!io)
            return {};
        const roomInfo = {};
        const sockets = Array.from(io.sockets.sockets.values());
        // Build room info from each socket's rooms
        sockets.forEach(socket => {
            const rooms = Array.from(socket.rooms || []);
            rooms.forEach(roomName => {
                if (roomName.startsWith('user:') || roomName.startsWith('project:') || roomName.startsWith('task:')) {
                    if (!roomInfo[roomName]) {
                        roomInfo[roomName] = {
                            clients: [],
                            size: 0
                        };
                    }
                    if (!roomInfo[roomName].clients.includes(socket.id)) {
                        roomInfo[roomName].clients.push(socket.id);
                        roomInfo[roomName].size++;
                    }
                }
            });
        });
        return roomInfo;
    },
    isUserConnected(userId) {
        const io = global.io;
        if (!io)
            return false;
        const room = `user:${userId}`;
        // Alternative approach: Check if any socket has this userId
        const sockets = Array.from(io.sockets.sockets.values());
        return sockets.some(socket => socket.userId === userId);
    },
    getStatus() {
        const clients = this.getConnectedClients();
        const rooms = this.getRoomsInfoAlt(); // Use alternative method
        return {
            status: 'active',
            serverTime: new Date().toISOString(),
            stats: {
                totalClients: clients.length,
                totalRooms: Object.keys(rooms).length,
                authenticatedClients: clients.filter((c) => !c.userId?.startsWith('anonymous')).length
            },
            clients,
            rooms
        };
    }
};
exports.default = exports.WebSocketService;
//# sourceMappingURL=websocket.service.js.map