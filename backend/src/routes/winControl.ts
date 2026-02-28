import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// All routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

// ============ 會員輸贏控制 ============

const memberControlSchema = z.object({
  enabled: z.boolean(),
  controlDirection: z.enum(['win', 'lose']),  // 'win' = 讓他贏, 'lose' = 讓他輸
  controlPercentage: z.number().min(1).max(100),  // 控制機率 1-100%
  note: z.string().nullable().optional(),
});

// Get all members with control settings
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

// Get control for a specific member
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

    res.json({
      success: true,
      data: {
        ...user,
        winCapControl: user.winCapControl || {
          enabled: false,
          controlDirection: 'win',
          controlPercentage: 50,
        },
      },
    });
  } catch (error) {
    console.error('Get member control error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Set control for a member
router.put('/members/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = memberControlSchema.parse(req.body);
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
        action: 'update_member_win_control',
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
    console.error('Set member control error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete (disable) control for a member
router.delete('/members/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;

    const control = await prisma.winCapControl.findUnique({
      where: { userId },
    });

    if (control) {
      await prisma.winCapControl.delete({
        where: { userId },
      });

      // Log operation
      await prisma.operationLog.create({
        data: {
          operatorId: currentUser.userId,
          action: 'delete_member_win_control',
          targetType: 'user',
          targetId: userId,
          details: {},
          ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete member control error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============ 代理線輸贏控制 ============

const agentLineControlSchema = z.object({
  enabled: z.boolean(),
  controlDirection: z.enum(['win', 'lose']),  // 'win' = 讓線下贏, 'lose' = 讓線下輸
  controlPercentage: z.number().min(1).max(100),  // 控制機率 1-100%
  note: z.string().nullable().optional(),
});

// Get all agents with control settings
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

// Get control for a specific agent
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
        _count: { select: { subUsers: true } },
      },
    });

    if (!agent) {
      return res.status(404).json({ success: false, error: 'Agent not found' });
    }

    // Get downline member count
    const downlineCount = await getAgentDownlineMemberCount(agentId);

    res.json({
      success: true,
      data: {
        ...agent,
        downlineMemberCount: downlineCount,
        agentLineWinCap: agent.agentLineWinCap || {
          enabled: false,
          controlDirection: 'win',
          controlPercentage: 50,
        },
      },
    });
  } catch (error) {
    console.error('Get agent control error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Set control for an agent line
router.put('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const data = agentLineControlSchema.parse(req.body);
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
        action: 'update_agent_line_control',
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
    console.error('Set agent line control error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete (disable) control for an agent line
router.delete('/agents/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const currentUser = req.user!;

    const control = await prisma.agentLineWinCap.findUnique({
      where: { agentId },
    });

    if (control) {
      await prisma.agentLineWinCap.delete({
        where: { agentId },
      });

      // Log operation
      await prisma.operationLog.create({
        data: {
          operatorId: currentUser.userId,
          action: 'delete_agent_line_control',
          targetType: 'user',
          targetId: agentId,
          details: {},
          ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete agent line control error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Helper function to get downline member count recursively
async function getAgentDownlineMemberCount(agentId: string): Promise<number> {
  let count = 0;

  // Get direct members count
  const directMembers = await prisma.user.count({
    where: { parentAgentId: agentId, role: 'member' },
  });
  count += directMembers;

  // Get sub-agents and their members recursively
  const subAgents = await prisma.user.findMany({
    where: { parentAgentId: agentId, role: 'agent' },
    select: { id: true },
  });

  for (const subAgent of subAgents) {
    const subCount = await getAgentDownlineMemberCount(subAgent.id);
    count += subCount;
  }

  return count;
}

export default router;
