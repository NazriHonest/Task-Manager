import { Socket } from 'socket.io';
import { WebSocketUser } from '../types/websocket.types.js';
import websocketService from '../services/websocket.service.js';

type AuthenticatedSocket = Socket & { userId: string; user?: WebSocketUser };

export const WebSocketController = {
  handleConnection(socket: AuthenticatedSocket): void {
    socket.emit('connected', {
      event: 'connected',
      socketId: socket.id,
      userId: socket.userId,
      message: 'Connected to Task Management WebSocket',
      timestamp: new Date().toISOString(),
      availableEvents: [
        'authenticate',
        'subscribe-notifications',
        'join-project',
        'subscribe-to-task',
        'task-updated',
        'new-comment',
        'user-online'
      ]
    });
  },

  handleAuthenticate(socket: AuthenticatedSocket, data: { token?: string }): void {
    try {
      const result = websocketService.authenticateUser(data?.token);
      
      if (result.success && result.userId) {
        socket.userId = result.userId;
        socket.user = result.user;

        socket.emit('authenticated', {
          success: true,
          userId: result.userId,
          message: 'Authentication successful'
        });

        console.log(`🔐 User authenticated: ${result.userId}`);
      } else {
        socket.emit('authentication_error', {
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      socket.emit('authentication_error', {
        success: false,
        message: (error as Error).message
      });
    }
  },

  handleSubscribeNotifications(socket: AuthenticatedSocket, userId: string): void {
    if (!userId) {
      socket.emit('subscription_error', {
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    const room = `user:${userId}`;
    socket.join(room);
    socket.userId = userId;

    console.log(`🔔 ${userId} subscribed to notifications`);

    socket.emit('notifications-subscribed', {
      success: true,
      userId: userId,
      room: room,
      message: 'Subscribed to notifications'
    });
  },

  handleJoinProject(socket: AuthenticatedSocket, projectId: string): void {
    if (!projectId) {
      socket.emit('subscription_error', {
        success: false,
        message: 'Project ID is required'
      });
      return;
    }

    const room = `project:${projectId}`;
    socket.join(room);

    // Get room size using rooms() method instead of adapter
    const rooms = socket.rooms;
    const roomSize = Array.from(rooms).filter(r => r === room).length;

    socket.emit('joined-project', {
      success: true,
      projectId: projectId,
      room: room,
      members: roomSize,
      timestamp: new Date().toISOString()
    });

    // Notify others in the project (optional)
    socket.to(room).emit('project-member-joined', {
      userId: socket.userId,
      projectId: projectId,
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  },

  handleSubscribeToTask(socket: AuthenticatedSocket, taskId: string): void {
    if (!taskId) {
      socket.emit('subscription_error', {
        success: false,
        message: 'Task ID is required'
      });
      return;
    }

    const room = `task:${taskId}`;
    socket.join(room);

    socket.emit('task-subscribed', {
      success: true,
      taskId: taskId,
      room: room,
      timestamp: new Date().toISOString()
    });
  },

  handleTaskUpdated(socket: AuthenticatedSocket, data: { taskId: string; updates: any; updatedBy?: string }): void {
    const { taskId, updates, updatedBy } = data;

    if (!taskId) {
      socket.emit('error', { message: 'Task ID is required' });
      return;
    }

    const room = `task:${taskId}`;

    socket.to(room).emit('task-update', {
      taskId: taskId,
      updates: updates,
      updatedBy: updatedBy || socket.userId,
      timestamp: new Date().toISOString()
    });
  },

  handleNewComment(socket: AuthenticatedSocket, data: { taskId: string; comment: string; userId?: string }): void {
    const { taskId, comment, userId } = data;

    if (!taskId) {
      socket.emit('error', { message: 'Task ID is required' });
      return;
    }

    const room = `task:${taskId}`;

    socket.to(room).emit('comment-added', {
      taskId: taskId,
      comment: comment,
      userId: userId || socket.userId,
      timestamp: new Date().toISOString()
    });
  },

  handleMarkNotificationRead(socket: AuthenticatedSocket, notificationId: string): void {
    socket.emit('notification-marked-read', {
      notificationId: notificationId,
      readAt: new Date().toISOString()
    });
  },

  handleUserOnline(socket: AuthenticatedSocket, userId: string): void {
    if (!userId) {
      return;
    }

    socket.userId = userId;
    socket.join(`online-users`);

    socket.to(`online-users`).emit('user-status', {
      userId: userId,
      status: 'online',
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });
  },

  handlePing(socket: AuthenticatedSocket): void {
    socket.emit('pong', {
      timestamp: new Date().toISOString(),
      serverTime: Date.now()
    });
  }
};

export default WebSocketController;