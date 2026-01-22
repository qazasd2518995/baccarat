import { PrismaClient } from '@prisma/client';
import type { AuthenticatedSocket, TypedServer } from './index.js';
import type { SendChatPayload } from './types.js';

const prisma = new PrismaClient();

export function handleChatEvents(io: TypedServer, socket: AuthenticatedSocket): void {
  // Handle sending chat message
  socket.on('chat:send', async (data: SendChatPayload) => {
    try {
      const { message } = data;

      // Validate message
      if (!message || typeof message !== 'string') {
        socket.emit('error', {
          code: 'INVALID_MESSAGE',
          message: 'Message is required',
        });
        return;
      }

      const trimmedMessage = message.trim();
      if (trimmedMessage.length === 0) {
        socket.emit('error', {
          code: 'EMPTY_MESSAGE',
          message: 'Message cannot be empty',
        });
        return;
      }

      if (trimmedMessage.length > 500) {
        socket.emit('error', {
          code: 'MESSAGE_TOO_LONG',
          message: 'Message too long (max 500 characters)',
        });
        return;
      }

      // Get user info for nickname
      const user = await prisma.user.findUnique({
        where: { id: socket.user.userId },
        select: { id: true, username: true, nickname: true },
      });

      if (!user) {
        socket.emit('error', {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        });
        return;
      }

      // Save message to database
      const chatMessage = await prisma.chatMessage.create({
        data: {
          userId: socket.user.userId,
          message: trimmedMessage,
        },
      });

      // Broadcast to all connected clients (in the default table room)
      const messageEvent = {
        id: chatMessage.id,
        userId: user.id,
        username: user.nickname || user.username,
        message: chatMessage.message,
        createdAt: chatMessage.createdAt.toISOString(),
      };

      io.to('table:default').emit('chat:message', messageEvent);

      console.log(`[Chat] ${user.username}: ${trimmedMessage.substring(0, 50)}${trimmedMessage.length > 50 ? '...' : ''}`);
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      socket.emit('error', {
        code: 'CHAT_ERROR',
        message: 'Failed to send message',
      });
    }
  });
}
