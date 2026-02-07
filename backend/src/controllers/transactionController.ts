import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { TransactionType } from '@prisma/client';
import { z } from 'zod';
import { canManageUser } from '../middleware/auth.js';
import { emitBalanceUpdate } from '../socket/socketManager.js';


const transactionSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['deposit', 'withdraw', 'adjustment']),
  amount: z.number().positive(),
  note: z.string().optional(),
});

// Get transactions
export async function getTransactions(req: Request, res: Response) {
  try {
    const {
      userId,
      type,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;
    const currentUser = req.user!;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    // Role-based filtering
    if (currentUser.role === 'member') {
      where.userId = currentUser.userId;
    } else if (currentUser.role === 'agent') {
      // Agent can see their own and their sub-users' transactions
      const subUserIds = await prisma.user.findMany({
        where: { parentAgentId: currentUser.userId },
        select: { id: true },
      });
      where.userId = {
        in: [currentUser.userId, ...subUserIds.map((u) => u.id)],
      };
    }

    if (userId && currentUser.role === 'admin') {
      where.userId = userId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: { id: true, username: true, nickname: true },
          },
          operator: {
            select: { id: true, username: true, nickname: true },
          },
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Create transaction (deposit/withdraw/adjustment)
// 入點（deposit）：上級給下級點數，上級扣除，下級增加
// 出點（withdraw）：下級還給上級，下級扣除，上級增加
export async function createTransaction(req: Request, res: Response) {
  try {
    const data = transactionSchema.parse(req.body);
    const currentUser = req.user!;

    // Get operator (current user)
    const operator = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!operator) {
      return res.status(404).json({ error: '操作者不存在' });
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: data.userId },
    });

    if (!targetUser) {
      return res.status(404).json({ error: '目标用户不存在' });
    }

    // Check permission - only can operate on direct sub-users
    const canManage = await canManageUser(currentUser.userId, data.userId);
    if (!canManage) {
      return res.status(403).json({ error: '无权操作该用户，只能操作直属下级' });
    }

    const operatorBalanceBefore = Number(operator.balance);
    const targetBalanceBefore = Number(targetUser.balance);
    let operatorBalanceAfter: number;
    let targetBalanceAfter: number;

    if (data.type === 'deposit') {
      // 入點：上級給下級點數
      // 檢查上級餘額是否足夠
      if (operatorBalanceBefore < data.amount) {
        return res.status(400).json({
          error: '余额不足',
          message: `您的余额 ${operatorBalanceBefore} 不足以入点 ${data.amount}`
        });
      }
      operatorBalanceAfter = operatorBalanceBefore - data.amount;  // 上級扣除
      targetBalanceAfter = targetBalanceBefore + data.amount;       // 下級增加
    } else if (data.type === 'withdraw') {
      // 出點：下級還給上級
      // 檢查下級餘額是否足夠
      if (targetBalanceBefore < data.amount) {
        return res.status(400).json({
          error: '下级余额不足',
          message: `下级余额 ${targetBalanceBefore} 不足以出点 ${data.amount}`
        });
      }
      operatorBalanceAfter = operatorBalanceBefore + data.amount;  // 上級增加
      targetBalanceAfter = targetBalanceBefore - data.amount;       // 下級扣除
    } else if (data.type === 'adjustment') {
      // 調整：只有 admin 可以進行調整（不影響上級餘額）
      if (currentUser.role !== 'admin') {
        return res.status(403).json({ error: '只有管理员可以进行调整操作' });
      }
      operatorBalanceAfter = operatorBalanceBefore;  // 上級不變
      targetBalanceAfter = targetBalanceBefore + data.amount;  // 下級增加/減少
    } else {
      return res.status(400).json({ error: '无效的交易类型' });
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update operator balance (for deposit/withdraw, not for admin adjustment)
      if (data.type !== 'adjustment' || currentUser.role !== 'admin') {
        await tx.user.update({
          where: { id: currentUser.userId },
          data: { balance: operatorBalanceAfter },
        });
      }

      // Update target user balance
      await tx.user.update({
        where: { id: data.userId },
        data: { balance: targetBalanceAfter },
      });

      // Create transaction record for target user
      const transaction = await tx.transaction.create({
        data: {
          userId: data.userId,
          operatorId: currentUser.userId,
          type: data.type as TransactionType,
          amount: data.type === 'withdraw' ? -data.amount : data.amount,
          balanceBefore: targetBalanceBefore,
          balanceAfter: targetBalanceAfter,
          note: data.note,
        },
        include: {
          user: {
            select: { id: true, username: true, nickname: true, balance: true },
          },
          operator: {
            select: { id: true, username: true, nickname: true, balance: true },
          },
        },
      });

      // Also create a transaction record for operator (if deposit or withdraw)
      if (data.type === 'deposit' || data.type === 'withdraw') {
        await tx.transaction.create({
          data: {
            userId: currentUser.userId,
            operatorId: currentUser.userId,
            type: data.type === 'deposit' ? 'withdraw' as TransactionType : 'deposit' as TransactionType,
            amount: data.type === 'deposit' ? -data.amount : data.amount,
            balanceBefore: operatorBalanceBefore,
            balanceAfter: operatorBalanceAfter,
            note: `${data.type === 'deposit' ? '入点给' : '从...收回'} ${targetUser.username}: ${data.note || ''}`.trim(),
          },
        });
      }

      // Create operation log
      await tx.operationLog.create({
        data: {
          operatorId: currentUser.userId,
          action: data.type,
          targetType: 'user',
          targetId: data.userId,
          details: {
            amount: data.amount,
            operatorBalanceBefore,
            operatorBalanceAfter,
            targetBalanceBefore,
            targetBalanceAfter,
            targetUsername: targetUser.username,
            note: data.note,
          },
          ipAddress: req.ip,
        },
      });

      return transaction;
    });

    // 發送 WebSocket 餘額更新通知
    const reason = data.type === 'deposit' ? 'deposit' : 'withdraw';

    // 通知目標用戶（下級）餘額變更
    emitBalanceUpdate(data.userId, targetBalanceAfter, reason);

    // 通知操作者（上級）餘額變更（如果不是調整操作）
    if (data.type !== 'adjustment') {
      emitBalanceUpdate(currentUser.userId, operatorBalanceAfter, reason);
    }

    res.status(201).json({
      ...result,
      operatorBalance: operatorBalanceAfter,
      message: data.type === 'deposit'
        ? `成功入点 ${data.amount} 给 ${targetUser.username}`
        : `成功从 ${targetUser.username} 出点 ${data.amount}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: '输入格式不正确', details: error.errors });
    }
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get user's balance
export async function getBalance(req: Request, res: Response) {
  try {
    const userId = req.params.userId as string;
    const currentUser = req.user!;

    // Check permission
    if (currentUser.role !== 'admin') {
      const canManage = await canManageUser(currentUser.userId, userId);
      if (!canManage && currentUser.userId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, balance: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get transaction summary (stats)
export async function getTransactionSummary(req: Request, res: Response) {
  try {
    const { userId, startDate, endDate } = req.query;
    const currentUser = req.user!;

    const where: any = {};

    if (currentUser.role === 'member') {
      where.userId = currentUser.userId;
    } else if (userId) {
      // Check permission for viewing other user's summary
      if (currentUser.role !== 'admin') {
        const canManage = await canManageUser(currentUser.userId, userId as string);
        if (!canManage) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const summary = await prisma.transaction.groupBy({
      by: ['type'],
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    res.json(summary);
  } catch (error) {
    console.error('Get transaction summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
