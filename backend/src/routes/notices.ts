import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createNoticeSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  type: z.enum(['info', 'warning', 'urgent']).default('info'),
  displayTarget: z.enum(['agent_dashboard', 'game_marquee', 'both']).default('both'),
  isPinned: z.boolean().default(false),
  isPublished: z.boolean().default(true),
});

const updateNoticeSchema = createNoticeSchema.partial();

// Public endpoint - Get published notices (for public display) - NO AUTH REQUIRED
router.get('/public', async (req, res) => {
  try {
    const { target } = req.query;

    const where: any = { isPublished: true };

    // Filter by display target if specified
    if (target === 'agent_dashboard') {
      where.displayTarget = { in: ['agent_dashboard', 'both'] };
    } else if (target === 'game_marquee') {
      where.displayTarget = { in: ['game_marquee', 'both'] };
    }

    const notices = await prisma.notice.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 20,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        displayTarget: true,
        isPinned: true,
        createdAt: true,
      },
    });

    res.json(notices);
  } catch (error) {
    console.error('Get public notices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// All remaining routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

// Get all notices (with pagination)
router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '20', type, published, displayTarget } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (type && type !== 'all') {
      where.type = type as string;
    }
    if (published !== undefined) {
      where.isPublished = published === 'true';
    }
    if (displayTarget && displayTarget !== 'all') {
      where.displayTarget = displayTarget as string;
    }

    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          creator: {
            select: { username: true, nickname: true },
          },
        },
      }),
      prisma.notice.count({ where }),
    ]);

    res.json({
      notices,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get single notice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const notice = await prisma.notice.findUnique({
      where: { id },
      include: {
        creator: {
          select: { username: true, nickname: true },
        },
      },
    });

    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    res.json(notice);
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create notice
router.post('/', async (req, res) => {
  try {
    const data = createNoticeSchema.parse(req.body);
    const currentUser = req.user!;

    const notice = await prisma.notice.create({
      data: {
        ...data,
        createdBy: currentUser.userId,
      },
      include: {
        creator: {
          select: { username: true, nickname: true },
        },
      },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'create_notice',
        targetType: 'notice',
        targetId: notice.id,
        details: { title: notice.title, type: notice.type },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.status(201).json(notice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Create notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update notice
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateNoticeSchema.parse(req.body);
    const currentUser = req.user!;

    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    const notice = await prisma.notice.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { username: true, nickname: true },
        },
      },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_notice',
        targetType: 'notice',
        targetId: notice.id,
        details: { changes: data },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json(notice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Update notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete notice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    await prisma.notice.delete({ where: { id } });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'delete_notice',
        targetType: 'notice',
        targetId: id,
        details: { title: existing.title },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle pin status
router.patch('/:id/pin', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    const notice = await prisma.notice.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: notice.isPinned ? 'pin_notice' : 'unpin_notice',
        targetType: 'notice',
        targetId: id,
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json(notice);
  } catch (error) {
    console.error('Toggle pin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle publish status
router.patch('/:id/publish', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const existing = await prisma.notice.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    const notice = await prisma.notice.update({
      where: { id },
      data: { isPublished: !existing.isPublished },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: notice.isPublished ? 'publish_notice' : 'unpublish_notice',
        targetType: 'notice',
        targetId: id,
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json(notice);
  } catch (error) {
    console.error('Toggle publish error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
