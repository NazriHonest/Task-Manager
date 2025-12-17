import { Socket } from 'socket.io';

// Declare module augmentation for socket.io
declare module 'socket.io' {
  interface Socket {
    userId: string;
    user?: WebSocketUser;
  }
}

export interface WebSocketUser {
  userId: string;
  email?: string;
  name?: string;
  role?: string;
}

// Simple interface with any type for flexibility
export interface NotificationPayload {
  id?: string;
  type: string;
  title: string;
  message: string;
  userId: string;
  read?: boolean;
  isRead?: boolean;
  createdAt?: Date;
  data?: any; // Use any type for flexibility
  metadata?: any;
  taskId?: string;
  projectId?: string;
  commentId?: string;
}

// Or be more specific about what data can contain
export interface NotificationPayloadDetailed {
  id?: string;
  type: string;
  title: string;
  message: string;
  userId: string;
  read?: boolean;
  isRead?: boolean;
  createdAt?: Date;
  data?: string | number | boolean | null | Record<string, any> | any[];
  metadata?: string | number | boolean | null | Record<string, any> | any[];
  taskId?: string;
  projectId?: string;
  commentId?: string;
}

export interface TaskUpdatePayload {
  taskId: string;
  updates: Record<string, any>;
  updatedBy?: string;
}

export interface CommentPayload {
  taskId: string;
  comment: string;
  userId?: string;
}

export interface RoomInfo {
  clients: string[];
  size: number;
}

export interface WebSocketClientInfo {
  id: string;
  userId: string;
  rooms: string[];
  connectedAt: number;
  authenticated: boolean;
}

export interface WebSocketStatus {
  status: string;
  serverTime: string;
  stats: {
    totalClients: number;
    totalRooms: number;
    authenticatedClients: number;
  };
  clients: WebSocketClientInfo[];
  rooms: Record<string, RoomInfo>;
}