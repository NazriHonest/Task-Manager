import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { WebSocketUser } from '../types/websocket.types.js';

export class WebSocketServer {
  private io: SocketServer;

  constructor(server: HttpServer) {
    if (!server) {
      throw new Error('HTTP server instance is required');
    }

    this.io = new SocketServer(server, {
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
    (global as any).io = this.io;

    console.log('🌐 WebSocket server initialized');
  }

  public initializeSocketMiddleware(): this {
    this.io.use((socket: Socket, next) => {
      try {
        // Try to get token from multiple sources
        const token = socket.handshake.auth?.token ||
          (socket.handshake.query?.token as string) ||
          (socket.handshake.headers.authorization &&
            socket.handshake.headers.authorization.replace('Bearer ', ''));

        if (token) {
          const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'your-secret-key'
          ) as WebSocketUser;

          // Type assertion - we're adding userId property to Socket
          (socket as Socket & { userId: string; user?: WebSocketUser }).userId = 
            decoded.userId || (decoded as any).id;
          (socket as Socket & { userId: string; user?: WebSocketUser }).user = decoded;
        } else {
          (socket as Socket & { userId: string }).userId = `anonymous-${socket.id.substring(0, 8)}`;
        }

        console.log(`🔗 Socket connection: ${(socket as Socket & { userId: string }).userId}`);
        next();
      } catch (error) {
        console.log('⚠️ Socket auth error:', (error as Error).message);
        (socket as Socket & { userId: string }).userId = `anonymous-${socket.id.substring(0, 8)}`;
        next();
      }
    });

    return this;
  }

  public attachControllers(controllers: Record<string, (socket: Socket, data?: any) => void>): this {
    this.io.on('connection', (socket: Socket) => {
      // Type assertion for socket with userId
      const authSocket = socket as Socket & { userId: string; user?: WebSocketUser };
      
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

  public getIO(): SocketServer {
    return this.io;
  }
}

export default WebSocketServer;