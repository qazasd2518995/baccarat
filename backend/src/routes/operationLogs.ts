import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

// Get operation logs (with pagination and filters)
router.get('/', async (req, res) => {
  try {
    const {
      page = '1',
      limit = '50',
      action,
      operatorId,
      targetType,
      from,
      to
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (action && action !== 'all') {
      where.action = action as string;
    }

    if (operatorId) {
      where.operatorId = operatorId as string;
    }

    if (targetType && targetType !== 'all') {
      where.targetType = targetType as string;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [logs, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          operator: {
            select: { username: true, nickname: true, role: true },
          },
        },
      }),
      prisma.operationLog.count({ where }),
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get operation logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get distinct actions for filter dropdown
router.get('/actions', async (req, res) => {
  try {
    const actions = await prisma.operationLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });

    res.json(actions.map(a => a.action));
  } catch (error) {
    console.error('Get actions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get distinct target types for filter dropdown
router.get('/target-types', async (req, res) => {
  try {
    const types = await prisma.operationLog.findMany({
      distinct: ['targetType'],
      where: { targetType: { not: null } },
      select: { targetType: true },
      orderBy: { targetType: 'asc' },
    });

    res.json(types.map(t => t.targetType).filter(Boolean));
  } catch (error) {
    console.error('Get target types error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get operators who have logs (for filter dropdown)
router.get('/operators', async (req, res) => {
  try {
    const operators = await prisma.operationLog.findMany({
      distinct: ['operatorId'],
      select: {
        operatorId: true,
        operator: {
          select: { username: true, nickname: true },
        },
      },
    });

    res.json(operators.map(o => ({
      id: o.operatorId,
      username: o.operator.username,
      nickname: o.operator.nickname,
    })));
  } catch (error) {
    console.error('Get operators error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single log detail
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const log = await prisma.operationLog.findUnique({
      where: { id },
      include: {
        operator: {
          select: { username: true, nickname: true, role: true },
        },
      },
    });

    if (!log) {
      return res.status(404).json({ error: 'Log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get statistics summary
router.get('/stats/summary', async (req, res) => {
  try {
    const { from, to } = req.query;

    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [totalLogs, byAction, byOperator] = await Promise.all([
      prisma.operationLog.count({ where }),
      prisma.operationLog.groupBy({
        by: ['action'],
        where,
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      prisma.operationLog.groupBy({
        by: ['operatorId'],
        where,
        _count: true,
        orderBy: { _count: { operatorId: 'desc' } },
        take: 10,
      }),
    ]);

    // Get operator details for top operators
    const operatorIds = byOperator.map(o => o.operatorId);
    const operators = await prisma.user.findMany({
      where: { id: { in: operatorIds } },
      select: { id: true, username: true, nickname: true },
    });

    const operatorMap = new Map(operators.map(o => [o.id, o]));

    res.json({
      totalLogs,
      byAction: byAction.map(a => ({
        action: a.action,
        count: a._count,
      })),
      byOperator: byOperator.map(o => ({
        operator: operatorMap.get(o.operatorId),
        count: o._count,
      })),
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
