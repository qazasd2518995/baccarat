import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

// All routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

// Validation schema
const bettingLimitSchema = z.object({
  name: z.string().min(1).max(50),
  playerMin: z.number().positive(),
  playerMax: z.number().positive(),
  bankerMin: z.number().positive(),
  bankerMax: z.number().positive(),
  tieMin: z.number().positive(),
  tieMax: z.number().positive(),
  pairMin: z.number().positive(),
  pairMax: z.number().positive(),
  isDefault: z.boolean().default(false),
});

const updateBettingLimitSchema = bettingLimitSchema.partial();

// Get all betting limits
router.get('/', async (req, res) => {
  try {
    const limits = await prisma.bettingLimit.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    });

    res.json(limits);
  } catch (error) {
    console.error('Get betting limits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single betting limit
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const limit = await prisma.bettingLimit.findUnique({
      where: { id },
    });

    if (!limit) {
      return res.status(404).json({ error: 'Betting limit not found' });
    }

    res.json(limit);
  } catch (error) {
    console.error('Get betting limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create betting limit
router.post('/', async (req, res) => {
  try {
    const data = bettingLimitSchema.parse(req.body);
    const currentUser = req.user!;

    // Validate min/max relationships
    if (data.playerMin > data.playerMax) {
      return res.status(400).json({ error: 'Player min cannot be greater than max' });
    }
    if (data.bankerMin > data.bankerMax) {
      return res.status(400).json({ error: 'Banker min cannot be greater than max' });
    }
    if (data.tieMin > data.tieMax) {
      return res.status(400).json({ error: 'Tie min cannot be greater than max' });
    }
    if (data.pairMin > data.pairMax) {
      return res.status(400).json({ error: 'Pair min cannot be greater than max' });
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.bettingLimit.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const limit = await prisma.bettingLimit.create({
      data,
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'create_betting_limit',
        targetType: 'betting_limit',
        targetId: limit.id,
        details: { name: limit.name },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.status(201).json(limit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create betting limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update betting limit
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateBettingLimitSchema.parse(req.body);
    const currentUser = req.user!;

    const existing = await prisma.bettingLimit.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Betting limit not found' });
    }

    // Validate min/max relationships if both are provided
    const playerMin = data.playerMin ?? Number(existing.playerMin);
    const playerMax = data.playerMax ?? Number(existing.playerMax);
    const bankerMin = data.bankerMin ?? Number(existing.bankerMin);
    const bankerMax = data.bankerMax ?? Number(existing.bankerMax);
    const tieMin = data.tieMin ?? Number(existing.tieMin);
    const tieMax = data.tieMax ?? Number(existing.tieMax);
    const pairMin = data.pairMin ?? Number(existing.pairMin);
    const pairMax = data.pairMax ?? Number(existing.pairMax);

    if (playerMin > playerMax) {
      return res.status(400).json({ error: 'Player min cannot be greater than max' });
    }
    if (bankerMin > bankerMax) {
      return res.status(400).json({ error: 'Banker min cannot be greater than max' });
    }
    if (tieMin > tieMax) {
      return res.status(400).json({ error: 'Tie min cannot be greater than max' });
    }
    if (pairMin > pairMax) {
      return res.status(400).json({ error: 'Pair min cannot be greater than max' });
    }

    // If setting as default, unset other defaults
    if (data.isDefault) {
      await prisma.bettingLimit.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const limit = await prisma.bettingLimit.update({
      where: { id },
      data,
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_betting_limit',
        targetType: 'betting_limit',
        targetId: limit.id,
        details: { changes: data },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json(limit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update betting limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete betting limit
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const existing = await prisma.bettingLimit.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Betting limit not found' });
    }

    // Check if this is the default limit
    if (existing.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default betting limit' });
    }

    // Check if any users are using this limit
    const usersCount = await prisma.user.count({
      where: { bettingLimitId: id },
    });

    if (usersCount > 0) {
      return res.status(400).json({
        error: `Cannot delete: ${usersCount} user(s) are using this betting limit`,
      });
    }

    await prisma.bettingLimit.delete({ where: { id } });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'delete_betting_limit',
        targetType: 'betting_limit',
        targetId: id,
        details: { name: existing.name },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ message: 'Betting limit deleted successfully' });
  } catch (error) {
    console.error('Delete betting limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set betting limit as default
router.patch('/:id/set-default', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const existing = await prisma.bettingLimit.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Betting limit not found' });
    }

    // Unset all defaults first
    await prisma.bettingLimit.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    // Set this one as default
    const limit = await prisma.bettingLimit.update({
      where: { id },
      data: { isDefault: true },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'set_default_betting_limit',
        targetType: 'betting_limit',
        targetId: id,
        details: { name: existing.name },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json(limit);
  } catch (error) {
    console.error('Set default betting limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assign betting limit to user
router.post('/:id/assign', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const currentUser = req.user!;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const limit = await prisma.bettingLimit.findUnique({ where: { id } });
    if (!limit) {
      return res.status(404).json({ error: 'Betting limit not found' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { bettingLimitId: id },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'assign_betting_limit',
        targetType: 'user',
        targetId: userId,
        details: { bettingLimitName: limit.name, username: user.username },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ message: 'Betting limit assigned successfully' });
  } catch (error) {
    console.error('Assign betting limit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
