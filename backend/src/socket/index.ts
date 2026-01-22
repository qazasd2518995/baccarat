import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { JWTPayload } from '../middleware/auth.js';
import { handleGameEvents } from './gameSocket.js';
import { handleChatEvents } from './chatSocket.js';
import type { ServerToClientEvents, ClientToServerEvents } from './types.js';

// Extended socket with user info
export interface AuthenticatedSocket extends Socket<ClientToServerEvents, ServerToClientEvents> {
  user: JWTPayload;
}

// Type-safe Socket.io server
export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function initializeSocket(io: TypedServer): void {
  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      console.log('[Socket] Connection rejected: No token provided');
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      (socket as AuthenticatedSocket).user = decoded;
      next();
    } catch (error) {
      console.log('[Socket] Connection rejected: Invalid token');
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    console.log(
      `[Socket] User connected: ${authSocket.user.username} (${authSocket.user.userId}) - Socket ID: ${authSocket.id}`
    );

    // Join user to their personal room for targeted messages
    socket.join(`user:${authSocket.user.userId}`);

    // Join default game table room
    socket.join('table:default');

    // Setup game event handlers
    handleGameEvents(io, authSocket);

    // Setup chat event handlers
    handleChatEvents(io, authSocket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(
        `[Socket] User disconnected: ${authSocket.user.username} - Reason: ${reason}`
      );
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`[Socket] Error for user ${authSocket.user.username}:`, error);
    });
  });

  console.log('[Socket] Socket.io initialized with authentication');
}
