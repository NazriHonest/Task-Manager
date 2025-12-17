import jwt from 'jsonwebtoken';
import { Server as SocketServer, Socket } from 'socket.io';
import {
  NotificationPayload,
  WebSocketUser
} from '../types/websocket.types.js';

interface AuthResult {
  success: boolean;
  userId?: string;
  user?: WebSocketUser;
  message?: string;
}

interface ConnectedSocket extends Socket {
  userId: string;
  user?: WebSocketUser;
}

export const WebSocketService = {
  authenticateUser(token?: string): AuthResult {
    try {
      if (!token) {
        return { success: false, message: 'No token provided' };
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as WebSocketUser;

      return {
        success: true,
        userId: decoded.userId || (decoded as any).id,
        user: decoded
      };
    } catch (error) {
      return {
        success: false,
        message: `Invalid token: ${(error as Error).message}`
      };
    }
  },

  sendNotificationToUser(userId: string, notification: NotificationPayload): boolean {
    const io = (global as any).io as SocketServer;
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

  sendToProject(projectId: string, data: any): boolean {
    const io = (global as any).io as SocketServer;
    if (!io) return false;

    const room = `project:${projectId}`;
    io.to(room).emit('project-update', data);
    console.log(`📤 Project update sent to project:${projectId}`);
    return true;
  },

  sendToTask(taskId: string, data: any): boolean {
    const io = (global as any).io as SocketServer;
    if (!io) return false;

    const room = `task:${taskId}`;
    io.to(room).emit('task-update', data);
    return true;
  },

  broadcastToAll(data: any): boolean {
    const io = (global as any).io as SocketServer;
    if (!io) return false;

    io.emit('broadcast', data);
    console.log(`📢 Broadcast sent to ${io.engine.clientsCount} clients`);
    return true;
  },

  getConnectedClients() {
    const io = (global as any).io as SocketServer;
    if (!io) return [];

    const sockets = Array.from(io.sockets.sockets.values()) as ConnectedSocket[];
    
    return sockets.map((socket) => ({
      id: socket.id,
      userId: socket.userId || 'anonymous',
      rooms: Array.from(socket.rooms || []),
      connectedAt: socket.handshake.issued,
      authenticated: !socket.userId?.startsWith('anonymous')
    }));
  },

  getRoomsInfo(): Record<string, { clients: string[]; size: number }> {
    const io = (global as any).io as SocketServer;
    if (!io) return {};

    // Get rooms through the server instance
    const rooms = io.sockets.adapter.rooms;
    const roomInfo: Record<string, { clients: string[]; size: number }> = {};

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
  getRoomsInfoAlt(): Record<string, { clients: string[]; size: number }> {
    const io = (global as any).io as SocketServer;
    if (!io) return {};

    const roomInfo: Record<string, { clients: string[]; size: number }> = {};
    const sockets = Array.from(io.sockets.sockets.values()) as ConnectedSocket[];

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

  isUserConnected(userId: string): boolean {
    const io = (global as any).io as SocketServer;
    if (!io) return false;

    const room = `user:${userId}`;
    
    // Alternative approach: Check if any socket has this userId
    const sockets = Array.from(io.sockets.sockets.values()) as ConnectedSocket[];
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
        authenticatedClients: clients.filter((c: any) => !c.userId?.startsWith('anonymous')).length
      },
      clients,
      rooms
    };
  }
};

export default WebSocketService;