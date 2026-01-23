import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Helper to get date range from quick filter
function getDateRange(quickFilter: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (quickFilter) {
    case 'today':
      return { startDate: today, endDate: tomorrow };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: today };
    }
    case 'thisWeek': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return { startDate: startOfWeek, endDate: tomorrow };
    }
    case 'lastWeek': {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - startOfLastWeek.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() + 7);
      return { startDate: startOfLastWeek, endDate: endOfLastWeek };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: startOfMonth, endDate: tomorrow };
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: startOfLastMonth, endDate: endOfLastMonth };
    }
    default:
      return { startDate: today, endDate: tomorrow };
  }
}

/**
 * GET /api/logs/operation
 * 操作日誌
 */
router.get('/operation', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const {
      operatorId,
      targetId,
      quickFilter,
      startDate: startDateStr,
      endDate: endDateStr,
      page = '1',
      limit = '20'
    } = req.query;

    // Determine date range
    let dateRange: { startDate: Date; endDate: Date } | null = null;
    if (startDateStr && endDateStr) {
      dateRange = {
        startDate: new Date(startDateStr as string),
        endDate: new Date(endDateStr as string)
      };
    } else if (quickFilter) {
      dateRange = getDateRange(quickFilter as string);
    }

    // Build where clause
    const where: any = {};

    // Non-admin can only see their own operations
    if (currentUser.role !== 'admin') {
      where.operatorId = currentUser.userId;
    } else if (operatorId) {
      // Admin can filter by operator
      const operator = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { contains: operatorId as string, mode: 'insensitive' } },
            { nickname: { contains: operatorId as string, mode: 'insensitive' } }
          ]
        }
      });
      if (operator) {
        where.operatorId = operator.id;
      }
    }

    if (targetId) {
      const target = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { contains: targetId as string, mode: 'insensitive' } },
            { nickname: { contains: targetId as string, mode: 'insensitive' } }
          ]
        }
      });
      if (target) {
        where.targetId = target.id;
      }
    }

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lt: dateRange.endDate
      };
    }

    const [logs, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        include: {
          operator: {
            select: { username: true, nickname: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string)
      }),
      prisma.operationLog.count({ where })
    ]);

    // Get target user info for each log
    const logsWithTargets = await Promise.all(
      logs.map(async (log) => {
        let targetUser = null;
        if (log.targetId && log.targetType === 'user') {
          targetUser = await prisma.user.findUnique({
            where: { id: log.targetId },
            select: { username: true, nickname: true }
          });
        }
        return {
          id: log.id,
          operatorUsername: log.operator.username,
          operatorNickname: log.operator.nickname,
          action: log.action,
          targetUsername: targetUser?.username,
          targetNickname: targetUser?.nickname,
          details: log.details,
          ipAddress: log.ipAddress,
          createdAt: log.createdAt
        };
      })
    );

    res.json({
      logs: logsWithTargets,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('[Logs] Error fetching operation logs:', error);
    res.status(500).json({ error: 'Failed to fetch operation logs' });
  }
});

/**
 * GET /api/logs/cash
 * 現金日誌 (額度變動)
 */
router.get('/cash', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const {
      operatorId,
      targetId,
      quickFilter,
      startDate: startDateStr,
      endDate: endDateStr,
      page = '1',
      limit = '20'
    } = req.query;

    // Determine date range
    let dateRange: { startDate: Date; endDate: Date } | null = null;
    if (startDateStr && endDateStr) {
      dateRange = {
        startDate: new Date(startDateStr as string),
        endDate: new Date(endDateStr as string)
      };
    } else if (quickFilter) {
      dateRange = getDateRange(quickFilter as string);
    }

    // Build where clause - show transactions where current user is operator
    const where: any = {
      type: { in: ['deposit', 'withdraw', 'adjustment'] }
    };

    if (currentUser.role !== 'admin') {
      where.operatorId = currentUser.userId;
    } else if (operatorId) {
      const operator = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { contains: operatorId as string, mode: 'insensitive' } },
            { nickname: { contains: operatorId as string, mode: 'insensitive' } }
          ]
        }
      });
      if (operator) {
        where.operatorId = operator.id;
      }
    }

    if (targetId) {
      const target = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { contains: targetId as string, mode: 'insensitive' } },
            { nickname: { contains: targetId as string, mode: 'insensitive' } }
          ]
        }
      });
      if (target) {
        where.userId = target.id;
      }
    }

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lt: dateRange.endDate
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: { select: { username: true, nickname: true } },
          operator: { select: { username: true, nickname: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string)
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({
      logs: transactions.map(t => ({
        id: t.id,
        operatorUsername: t.operator.username,
        operatorNickname: t.operator.nickname,
        targetUsername: t.user.username,
        targetNickname: t.user.nickname,
        type: t.type,
        amount: Number(t.amount),
        balanceBefore: Number(t.balanceBefore),
        balanceAfter: Number(t.balanceAfter),
        note: t.note,
        createdAt: t.createdAt
      })),
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('[Logs] Error fetching cash logs:', error);
    res.status(500).json({ error: 'Failed to fetch cash logs' });
  }
});

/**
 * GET /api/logs/share
 * 佔成日誌
 */
router.get('/share', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const {
      operatorId,
      targetId,
      quickFilter,
      startDate: startDateStr,
      endDate: endDateStr,
      page = '1',
      limit = '20'
    } = req.query;

    // Determine date range
    let dateRange: { startDate: Date; endDate: Date } | null = null;
    if (startDateStr && endDateStr) {
      dateRange = {
        startDate: new Date(startDateStr as string),
        endDate: new Date(endDateStr as string)
      };
    } else if (quickFilter) {
      dateRange = getDateRange(quickFilter as string);
    }

    // Build where clause
    const where: any = {};

    if (currentUser.role !== 'admin') {
      where.operatorId = currentUser.userId;
    } else if (operatorId) {
      where.operatorId = operatorId;
    }

    if (targetId) {
      where.agentId = targetId;
    }

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lt: dateRange.endDate
      };
    }

    const [logs, total] = await Promise.all([
      prisma.shareSettingHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string)
      }),
      prisma.shareSettingHistory.count({ where })
    ]);

    // Get user info for each log
    const logsWithUsers = await Promise.all(
      logs.map(async (log) => {
        const [operator, agent] = await Promise.all([
          prisma.user.findUnique({
            where: { id: log.operatorId },
            select: { username: true, nickname: true }
          }),
          prisma.user.findUnique({
            where: { id: log.agentId },
            select: { username: true, nickname: true }
          })
        ]);
        return {
          id: log.id,
          operatorUsername: operator?.username,
          operatorNickname: operator?.nickname,
          targetUsername: agent?.username,
          targetNickname: agent?.nickname,
          changeType: log.changeType,
          oldValue: Number(log.oldValue),
          newValue: Number(log.newValue),
          gameCategory: log.gameCategory,
          platform: log.platform,
          createdAt: log.createdAt
        };
      })
    );

    res.json({
      logs: logsWithUsers,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('[Logs] Error fetching share logs:', error);
    res.status(500).json({ error: 'Failed to fetch share logs' });
  }
});

/**
 * GET /api/logs/login
 * 登入日誌
 */
router.get('/login', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const {
      userId,
      quickFilter,
      startDate: startDateStr,
      endDate: endDateStr,
      page = '1',
      limit = '20'
    } = req.query;

    // Determine date range
    let dateRange: { startDate: Date; endDate: Date } | null = null;
    if (startDateStr && endDateStr) {
      dateRange = {
        startDate: new Date(startDateStr as string),
        endDate: new Date(endDateStr as string)
      };
    } else if (quickFilter) {
      dateRange = getDateRange(quickFilter as string);
    }

    // Build where clause
    const where: any = {};

    // Non-admin can only see own and downline login logs
    if (currentUser.role !== 'admin') {
      const downlineIds = await prisma.user.findMany({
        where: { parentAgentId: currentUser.userId },
        select: { id: true }
      });
      where.userId = { in: [currentUser.userId, ...downlineIds.map(u => u.id)] };
    }

    if (userId) {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { contains: userId as string, mode: 'insensitive' } },
            { nickname: { contains: userId as string, mode: 'insensitive' } }
          ]
        }
      });
      if (user) {
        where.userId = user.id;
      }
    }

    if (dateRange) {
      where.createdAt = {
        gte: dateRange.startDate,
        lt: dateRange.endDate
      };
    }

    const [logs, total] = await Promise.all([
      prisma.loginLog.findMany({
        where,
        include: {
          user: { select: { username: true, nickname: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string)
      }),
      prisma.loginLog.count({ where })
    ]);

    res.json({
      logs: logs.map(l => ({
        id: l.id,
        username: l.user.username,
        nickname: l.user.nickname,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        success: l.success,
        createdAt: l.createdAt
      })),
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('[Logs] Error fetching login logs:', error);
    res.status(500).json({ error: 'Failed to fetch login logs' });
  }
});

export default router;
