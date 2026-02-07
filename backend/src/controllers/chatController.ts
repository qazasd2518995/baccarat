import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';


/**
 * 獲取聊天歷史
 * GET /api/chat/history
 * Query params:
 *   - limit: number (default: 50)
 *   - before: string (message ID for pagination)
 */
export async function getChatHistory(req: Request, res: Response) {
  try {
    const { limit = 50, before } = req.query;
    const limitNum = Math.min(Number(limit) || 50, 100);

    const where: { id?: { lt: string } } = {};
    if (before && typeof before === 'string') {
      where.id = { lt: before };
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
    });

    // Reverse to get chronological order
    const formattedMessages = messages.reverse().map((msg) => ({
      id: msg.id,
      userId: msg.userId,
      username: msg.user.nickname || msg.user.username,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
    }));

    res.json({
      messages: formattedMessages,
      hasMore: messages.length === limitNum,
    });
  } catch (error) {
    console.error('[Chat] Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
}

/**
 * 發送聊天消息 (HTTP endpoint, 用於測試)
 * POST /api/chat/send
 */
export async function sendMessage(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Validate message length
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    if (trimmedMessage.length > 500) {
      return res.status(400).json({ error: 'Message too long (max 500 characters)' });
    }

    // Save message to database
    const chatMessage = await prisma.chatMessage.create({
      data: {
        userId: currentUser.userId,
        message: trimmedMessage,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
          },
        },
      },
    });

    const formattedMessage = {
      id: chatMessage.id,
      userId: chatMessage.userId,
      username: chatMessage.user.nickname || chatMessage.user.username,
      message: chatMessage.message,
      createdAt: chatMessage.createdAt.toISOString(),
    };

    res.json(formattedMessage);
  } catch (error) {
    console.error('[Chat] Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
}
