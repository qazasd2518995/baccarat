import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getSocketInstance } from '../socket/socketManager.js';

const prisma = new PrismaClient();

// 預定義的禮物列表
const GIFTS = [
  { type: 'flower', name: '鮮花', price: 10 },
  { type: 'coffee', name: '咖啡', price: 20 },
  { type: 'cake', name: '蛋糕', price: 50 },
  { type: 'ring', name: '戒指', price: 100 },
  { type: 'crown', name: '皇冠', price: 200 },
  { type: 'car', name: '跑車', price: 500 },
  { type: 'yacht', name: '遊艇', price: 1000 },
  { type: 'rocket', name: '火箭', price: 5000 },
];

/**
 * 獲取禮物列表
 * GET /api/gifts
 */
export async function getGifts(req: Request, res: Response) {
  res.json({ gifts: GIFTS });
}

/**
 * 發送禮物
 * POST /api/gifts/send
 */
export async function sendGift(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const { giftType, dealerName, quantity = 1 } = req.body;

    // Validate input
    if (!giftType || !dealerName) {
      return res.status(400).json({ error: 'Gift type and dealer name are required' });
    }

    const qty = Math.max(1, Math.floor(Number(quantity)));
    if (qty > 999) {
      return res.status(400).json({ error: 'Quantity too large (max 999)' });
    }

    // Find gift
    const gift = GIFTS.find((g) => g.type === giftType);
    if (!gift) {
      return res.status(400).json({ error: 'Invalid gift type' });
    }

    // Calculate total
    const total = gift.price * qty;

    // Check user balance
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { id: true, balance: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userBalance = Number(user.balance);
    if (userBalance < total) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create transaction and deduct balance in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Deduct balance
      const newBalance = userBalance - total;
      await tx.user.update({
        where: { id: currentUser.userId },
        data: { balance: newBalance },
      });

      // Create gift transaction
      const giftTransaction = await tx.giftTransaction.create({
        data: {
          userId: currentUser.userId,
          dealerName,
          giftType: gift.type,
          giftName: gift.name,
          price: gift.price,
          quantity: qty,
          total: total,
        },
      });

      return { giftTransaction, newBalance };
    });

    // Notify user of balance change via WebSocket
    const io = getSocketInstance();
    if (io) {
      io.to(`user:${currentUser.userId}`).emit('user:balance', {
        balance: result.newBalance,
        reason: 'withdraw', // Treat as withdraw for simplicity
      });
    }

    res.json({
      success: true,
      gift: {
        id: result.giftTransaction.id,
        type: gift.type,
        name: gift.name,
        price: gift.price,
        quantity: qty,
        total: total,
        dealerName,
      },
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error('[Gift] Error sending gift:', error);
    res.status(500).json({ error: 'Failed to send gift' });
  }
}

/**
 * 獲取禮物歷史
 * GET /api/gifts/history
 */
export async function getGiftHistory(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const { page = 1, limit = 20, from, to } = req.query;
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(Math.max(1, Number(limit)), 100);

    const where: {
      userId: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      userId: currentUser.userId,
    };

    // Date filters
    if (from || to) {
      where.createdAt = {};
      if (from && typeof from === 'string') {
        where.createdAt.gte = new Date(from);
      }
      if (to && typeof to === 'string') {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.giftTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.giftTransaction.count({ where }),
    ]);

    const formattedTransactions = transactions.map((t) => ({
      id: t.id,
      dealerName: t.dealerName,
      giftType: t.giftType,
      giftName: t.giftName,
      price: Number(t.price),
      quantity: t.quantity,
      total: Number(t.total),
      createdAt: t.createdAt.toISOString(),
    }));

    res.json({
      records: formattedTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('[Gift] Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch gift history' });
  }
}
