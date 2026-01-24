import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import type { JWTPayload } from '../middleware/auth.js';
import { handleGameEvents } from './gameSocket.js';
import { handleDragonTigerEvents } from './dragonTigerSocket.js';
import { handleBullBullEvents } from './bullBullSocket.js';
import { handleChatEvents } from './chatSocket.js';
import type { ServerToClientEvents, ClientToServerEvents } from './types.js';

const prisma = new PrismaClient();

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

  io.on('connection', async (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    console.log(
      `[Socket] User connected: ${authSocket.user.username} (${authSocket.user.userId}) - Socket ID: ${authSocket.id}`
    );

    // Join user to their personal room for targeted messages
    socket.join(`user:${authSocket.user.userId}`);

    // Join lobby room for table updates
    socket.join('lobby');

    // NOTE: Don't auto-join any game table - let client explicitly join via join:table event
    // This allows each baccarat table to have independent state

    // Send initial balance on connection
    try {
      const user = await prisma.user.findUnique({
        where: { id: authSocket.user.userId },
        select: { balance: true },
      });
      if (user) {
        socket.emit('user:balance', {
          balance: Number(user.balance),
          reason: 'deposit', // Using 'deposit' as a generic initial load reason
        });
        console.log(`[Socket] Sent initial balance to ${authSocket.user.username}: ${user.balance}`);
      }
    } catch (error) {
      console.error(`[Socket] Failed to fetch initial balance for ${authSocket.user.username}:`, error);
    }

    // Setup game event handlers for Baccarat
    handleGameEvents(io, authSocket);

    // Setup game event handlers for Dragon Tiger
    handleDragonTigerEvents(io, authSocket);

    // Setup game event handlers for Bull Bull
    handleBullBullEvents(io, authSocket);

    // Setup chat event handlers
    handleChatEvents(io, authSocket);

    // Handle joining specific game tables
    socket.on('join:table' as any, (data: { gameType: string; tableId?: string }) => {
      const { gameType, tableId } = data;
      // Leave other game tables first (but keep user room)
      socket.rooms.forEach(room => {
        if (room.startsWith('table:') && !room.startsWith('user:')) {
          socket.leave(room);
        }
      });

      // Join the requested table
      switch (gameType) {
        case 'baccarat':
          // Join specific baccarat table room (each table has independent game loop)
          if (tableId) {
            socket.join(`table:baccarat:${tableId}`);
            console.log(`[Socket] ${authSocket.user.username} joined baccarat table ${tableId}`);
          } else {
            // Default to table 1 if no tableId specified
            socket.join('table:baccarat:1');
            console.log(`[Socket] ${authSocket.user.username} joined baccarat table 1 (default)`);
          }
          break;
        case 'dragontiger':
          // Join specific dragon tiger table room (each table has independent game loop)
          if (tableId) {
            socket.join(`table:dragontiger:${tableId}`);
            console.log(`[Socket] ${authSocket.user.username} joined dragon tiger table ${tableId}`);
          } else {
            // Default to table 1 if no tableId specified
            socket.join('table:dragontiger:1');
            console.log(`[Socket] ${authSocket.user.username} joined dragon tiger table 1 (default)`);
          }
          break;
        case 'bullbull':
          // Join specific bull bull table room (each table has independent game loop)
          if (tableId) {
            socket.join(`table:bullbull:${tableId}`);
            console.log(`[Socket] ${authSocket.user.username} joined bull bull table ${tableId}`);
          } else {
            // Default to table 1 if no tableId specified
            socket.join('table:bullbull:1');
            console.log(`[Socket] ${authSocket.user.username} joined bull bull table 1 (default)`);
          }
          break;
        default:
          socket.join('table:default');
      }
    });

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
