import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// All routes require admin or agent role
router.use(authenticate);
router.use(requireRole('admin', 'agent'));

// ============ Deposit Control ============

const depositControlSchema = z.object({
  enabled: z.boolean(),
  minAmount: z.number().positive().nullable().optional(),
  maxAmount: z.number().positive().nullable().optional(),
  note: z.string().nullable().optional(),
});

// Get deposit control for a user
router.get('/deposit-control/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;

    // Check permission
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentAgentId: true, role: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.role === 'agent' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const control = await prisma.depositControl.findUnique({
      where: { userId },
    });

    res.json(control || { enabled: false, minAmount: null, maxAmount: null, note: null });
  } catch (error) {
    console.error('Get deposit control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set deposit control for a user
router.put('/deposit-control/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = depositControlSchema.parse(req.body);
    const currentUser = req.user!;

    // Check permission
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentAgentId: true, role: true, username: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.role === 'agent' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate min <= max if both provided
    if (data.minAmount && data.maxAmount && data.minAmount > data.maxAmount) {
      return res.status(400).json({ error: 'Min amount cannot be greater than max amount' });
    }

    const control = await prisma.depositControl.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_deposit_control',
        targetType: 'user',
        targetId: userId,
        details: { username: targetUser.username, ...data },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json(control);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Set deposit control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Win Cap Control (新版: 機率控制) ============

const winCapControlSchema = z.object({
  enabled: z.boolean(),
  controlDirection: z.enum(['win', 'lose']).optional(),
  controlPercentage: z.number().min(1).max(100).optional(),
  note: z.string().nullable().optional(),
});

// Get win cap control for a user
router.get('/win-cap/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;

    // Check permission
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentAgentId: true, role: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.role === 'agent' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const control = await prisma.winCapControl.findUnique({
      where: { userId },
    });

    res.json(control || {
      enabled: false,
      controlDirection: 'win',
      controlPercentage: 50,
      note: null,
    });
  } catch (error) {
    console.error('Get win cap control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set win cap control for a user
router.put('/win-cap/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const data = winCapControlSchema.parse(req.body);
    const currentUser = req.user!;

    // Check permission
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentAgentId: true, role: true, username: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.role === 'agent' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const control = await prisma.winCapControl.upsert({
      where: { userId },
      create: {
        userId,
        enabled: data.enabled,
        controlDirection: data.controlDirection || 'win',
        controlPercentage: data.controlPercentage || 50,
        note: data.note,
      },
      update: {
        enabled: data.enabled,
        controlDirection: data.controlDirection,
        controlPercentage: data.controlPercentage,
        note: data.note,
      },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_win_cap',
        targetType: 'user',
        targetId: userId,
        details: { username: targetUser.username, ...data },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json(control);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Set win cap control error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete win cap control for a user
router.delete('/win-cap/:userId', async (req, res) => {
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
          action: 'delete_win_cap',
          targetType: 'user',
          targetId: userId,
          details: {},
          ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete win cap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Agent Line Win Cap (新版: 機率控制) ============

const agentLineWinCapSchema = z.object({
  enabled: z.boolean(),
  controlDirection: z.enum(['win', 'lose']).optional(),
  controlPercentage: z.number().min(1).max(100).optional(),
  note: z.string().nullable().optional(),
});

// Get agent line win cap (admin only)
router.get('/agent-line-cap/:agentId', requireRole('admin'), async (req, res) => {
  try {
    const agentId = req.params.agentId as string;

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: { role: true },
    });

    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const control = await prisma.agentLineWinCap.findUnique({
      where: { agentId },
    });

    res.json(control || {
      enabled: false,
      controlDirection: 'win',
      controlPercentage: 50,
      note: null,
    });
  } catch (error) {
    console.error('Get agent line win cap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set agent line win cap (admin only)
router.put('/agent-line-cap/:agentId', requireRole('admin'), async (req, res) => {
  try {
    const agentId = req.params.agentId as string;
    const data = agentLineWinCapSchema.parse(req.body);
    const currentUser = req.user!;

    const agent = await prisma.user.findUnique({
      where: { id: agentId },
      select: { role: true, username: true },
    });

    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const control = await prisma.agentLineWinCap.upsert({
      where: { agentId },
      create: {
        agentId,
        enabled: data.enabled,
        controlDirection: data.controlDirection || 'win',
        controlPercentage: data.controlPercentage || 50,
        note: data.note,
      },
      update: {
        enabled: data.enabled,
        controlDirection: data.controlDirection,
        controlPercentage: data.controlPercentage,
        note: data.note,
      },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_agent_line_cap',
        targetType: 'user',
        targetId: agentId,
        details: { username: agent.username, ...data },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json(control);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Set agent line win cap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all controls summary for a user
router.get('/summary/:userId', async (req, res) => {
  try {
    const userId = req.params.userId as string;
    const currentUser = req.user!;

    // Check permission
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentAgentId: true, role: true, username: true, bettingLimitId: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.role === 'agent' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [depositControl, winCapControl, bettingLimit] = await Promise.all([
      prisma.depositControl.findUnique({ where: { userId } }),
      prisma.winCapControl.findUnique({ where: { userId } }),
      targetUser.bettingLimitId
        ? prisma.bettingLimit.findUnique({ where: { id: targetUser.bettingLimitId } })
        : prisma.bettingLimit.findFirst({ where: { isDefault: true } }),
    ]);

    res.json({
      user: {
        id: userId,
        username: targetUser.username,
        role: targetUser.role,
      },
      depositControl: depositControl || { enabled: false },
      winCapControl: winCapControl || { enabled: false, controlDirection: 'win', controlPercentage: 50 },
      bettingLimit: bettingLimit || null,
    });
  } catch (error) {
    console.error('Get controls summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
