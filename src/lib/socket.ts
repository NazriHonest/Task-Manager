import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verify } from 'jsonwebtoken';

interface SocketUser {
  userId: string;
  socketId: string;
}

class SocketService {
  private io: SocketIOServer | null = null;
  private users: Map<string, string> = new Map(); // userId -> socketId

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          return next(new Error('Authentication error: Token missing'));
        }

        const decoded = verify(token, process.env.JWT_SECRET!) as { userId: string };
        (socket as any).userId = decoded.userId;
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', (socket) => {
      const userId = (socket as any).userId;
      
      // Store user connection
      this.users.set(userId, socket.id);
      console.log(`User connected: ${userId} (socket: ${socket.id})`);

      // Join user to their personal room
      socket.join(`user:${userId}`);

      // Notify user of successful connection
      socket.emit('connected', { 
        message: 'Connected to notifications server',
        userId 
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.users.delete(userId);
        console.log(`User disconnected: ${userId}`);
      });

      // Handle mark as read
      socket.on('markAsRead', (notificationId: string) => {
        socket.emit('notificationRead', { notificationId });
      });

      // Handle subscribe to project
      socket.on('subscribeToProject', (projectId: string) => {
        socket.join(`project:${projectId}`);
        console.log(`User ${userId} subscribed to project ${projectId}`);
      });

      // Handle unsubscribe from project
      socket.on('unsubscribeFromProject', (projectId: string) => {
        socket.leave(`project:${projectId}`);
        console.log(`User ${userId} unsubscribed from project ${projectId}`);
      });

      // Handle ping (for testing)
      socket.on('ping', (data: any) => {
        socket.emit('pong', { data, timestamp: new Date().toISOString() });
      });
    });

    console.log('Socket.io server initialized');
  }

  // Send notification to specific user
  sendToUser(userId: string, event: string, data: any) {
    if (!this.io) return;
    
    const socketId = this.users.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
    
    // Also send to user's personal room
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Send notification to multiple users
  sendToUsers(userIds: string[], event: string, data: any) {
    if (!this.io) return;
    
    userIds.forEach(userId => {
      this.sendToUser(userId, event, data);
    });
  }

  // Send notification to a project room
  sendToProject(projectId: string, event: string, data: any) {
    if (!this.io) return;
    
    this.io.to(`project:${projectId}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event: string, data: any) {
    if (!this.io) return;
    
    this.io.emit(event, data);
  }

  // Get online users
  getOnlineUsers(): string[] {
    return Array.from(this.users.keys());
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.users.has(userId);
  }

  getIO() {
    if (!this.io) {
      throw new Error('Socket.io not initialized');
    }
    return this.io;
  }
}

export const socketService = new SocketService();