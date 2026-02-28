import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// All routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

// ============ 會員輸贏控制 (Member Win Cap) ============

const memberWinCapSchema = z.object({
  enabled: z.boolean(),
  dailyCap: z.number().positive().nullable().optional(),
  weeklyCap: z.number().positive().nullable().optional(),
  monthlyCap: z.number().positive().nullable().optional(),
  controlWinRate: z.number().min(0).max(100).nullable().optional(), // 控制勝率
  note: z.string().nullable().optional(),
});

// Get all users with win cap settings
router.get('/members', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { role: 'member' };
    if (search) {
      where.OR = [
        { username: { contains: String(search), mode: 'insensitive' } },
        { nickname: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          nickname: true,
          balance: true,
          parentAgent: {
            select: { username: true, nickname: true },
          },
          winCapControl: true,
        },
        orderBy: { username: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get win cap for a specific user
router.get('/members/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        balance: true,
        winCapControl: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Calculate today's win amount from bets
    const today = new Date();
    today.setHours(7, 0, 0, 0); // Game day starts at 7 AM
    if (new Date().getHours() < 7) {
      today.setDate(today.getDate() - 1);
    }

    const todayBets = await prisma.bet.aggregate({
      where: {
        userId,
        createdAt: { gte: today },
        status: { in: ['won', 'lost'] },
      },
      _sum: { payout: true, amount: true },
    });

    const todayWin = Number(todayBets._sum.payout || 0) - Number(todayBets._sum.amount || 0);

    res.json({
      success: true,
      data: {
        ...user,
        todayWin,
        winCapControl: user.winCapControl || {
          enabled: false,
          dailyCap: null,
          weeklyCap: null,
          monthlyCap: null,
          currentWin: 0,
        },
      },
    });
  } catch (error) {
    console.error('Get member win cap error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Set win cap for a user
router.put('/members/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = memberWinCapSchema.parse(req.body);
    const currentUser = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const control = await prisma.winCapControl.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_member_win_cap',
        targetType: 'user',
        targetId: userId,
        details: { username: user.username, ...data },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ success: true, data: control });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: error.errors });
    }
    console.error('Set member win cap error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Reset current win for a user
router.post('/members/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;

    const control = await prisma.winCapControl.findUnique({
      where: { userId },
    });

    if (!control) {
      return res.status(404).json({ success: false, error: 'Win cap control not found' });
    }

    const updated = await prisma.winCapControl.update({
      where: { userId },
      data: { currentWin: 0 },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'reset_member_win_cap',
        targetType: 'user',
        targetId: userId,
        details: { previousWin: control.currentWin },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Reset member win cap error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============ 代理線輸贏控制 (Agent Line Win Cap) ============

const agentLineWinCapSchema = z.object({
  enabled: z.boolean(),
  dailyCap: z.number().positive().nullable().optional(),
  weeklyCap: z.number().positive().nullable().optional(),
  monthlyCap: z.number().positive().nullable().optional(),
  note: z.string().nullable().optional(),
});

// Get all agents with win cap settings
router.get('/agents', async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { role: 'agent' };
    if (search) {
      where.OR = [
        { username: { contains: String(search), mode: 'insensitive' } },
        { nickname: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          nickname: true,
          agentLevel: true,
          balance: true,
          agentLineWinCap: true,
          _count: { select: { subUsers: true } },
        },
        orderBy: [{ agentLevel: 'asc' }, { username: 'asc' }],
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: agents,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get agent line win cap with downline stats
router.get('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        username: true,
        nickname: true,
        agentLevel: true,
        balance: true,
        agentLineWinCap: true,
      },
    });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    // Get all downline members recursively
    const downlineMembers = await getAgentDownlineMembers(agentId);

    // Calculate today's settlement for the agent line
    const today = new Date();
    today.setHours(7, 0, 0, 0);
    if (new Date().getHours() < 7) {
      today.setDate(today.getDate() - 1);
    }

    const memberIds = downlineMembers.map(m => m.id);

    const todayBets = memberIds.length > 0 ? await prisma.bet.aggregate({
      where: {
        userId: { in: memberIds },
        createdAt: { gte: today },
        status: { in: ['won', 'lost'] },
      },
      _sum: { payout: true, amount: true },
    }) : { _sum: { payout: 0, amount: 0 } };

    const totalBet = Number(todayBets._sum.amount || 0);
    const totalPayout = Number(todayBets._sum.payout || 0);
    const memberWinLoss = totalPayout - totalBet;
    const rebatePercent = 0.041;
    const totalRebate = totalBet * rebatePercent;
    const superiorSettlement = memberWinLoss + totalRebate;

    res.json({
      success: true,
      data: {
        ...agent,
        agentLineWinCap: agent.agentLineWinCap || {
          enabled: false,
          dailyCap: null,
          weeklyCap: null,
          monthlyCap: null,
          currentWin: 0,
        },
        downlineStats: {
          memberCount: downlineMembers.length,
          todayBet: totalBet,
          todayPayout: totalPayout,
          memberWinLoss,
          totalRebate,
          superiorSettlement,
          status: superiorSettlement > 0 ? 'green' : 'red',
        },
      },
    });
  } catch (error) {
    console.error('Get agent line win cap error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Set agent line win cap
router.put('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const data = agentLineWinCapSchema.parse(req.body);
    const currentUser = req.user!;

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: { username: true, role: true },
    });

    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    const control = await prisma.agentLineWinCap.upsert({
      where: { agentId },
      create: { agentId, ...data },
      update: data,
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_agent_line_win_cap',
        targetType: 'user',
        targetId: agentId,
        details: { username: agent.username, ...data },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ success: true, data: control });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: error.errors });
    }
    console.error('Set agent line win cap error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Reset agent line current win
router.post('/agents/:agentId/reset', async (req, res) => {
  try {
    const { agentId } = req.params;
    const currentUser = req.user!;

    const control = await prisma.agentLineWinCap.findUnique({
      where: { agentId },
    });

    if (!control) {
      return res.status(404).json({ success: false, error: 'Agent line win cap not found' });
    }

    const updated = await prisma.agentLineWinCap.update({
      where: { agentId },
      data: { currentWin: 0 },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'reset_agent_line_win_cap',
        targetType: 'user',
        targetId: agentId,
        details: { previousWin: control.currentWin },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Reset agent line win cap error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Helper function to get all downline members recursively
async function getAgentDownlineMembers(agentId: string): Promise<{ id: string; username: string }[]> {
  const members: { id: string; username: string }[] = [];

  // Get direct members
  const directMembers = await prisma.user.findMany({
    where: { parentAgentId: agentId, role: 'member' },
    select: { id: true, username: true },
  });
  members.push(...directMembers);

  // Get sub-agents and their members recursively
  const subAgents = await prisma.user.findMany({
    where: { parentAgentId: agentId, role: 'agent' },
    select: { id: true },
  });

  for (const subAgent of subAgents) {
    const subMembers = await getAgentDownlineMembers(subAgent.id);
    members.push(...subMembers);
  }

  return members;
}

export default router;
