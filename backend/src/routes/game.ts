import { Router, Request, Response } from 'express';
import {
  getGameState,
  playGame,
  getGameHistory,
  getRoadmap,
  newShoe,
  getBetStats,
  getAllRounds,
  getAllDragonTigerRounds,
  getMyLimits,
  getBettingRecords,
} from '../controllers/gameController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get current game state
router.get('/state', getGameState);

// Play a round (place bets)
router.post('/play', playGame);

// Get game history
router.get('/history', getGameHistory);

// Get all baccarat game rounds (admin/agent)
router.get('/rounds', requireRole('admin', 'agent'), getAllRounds);

// Get all dragon tiger game rounds (admin/agent)
router.get('/dragon-tiger-rounds', requireRole('admin', 'agent'), getAllDragonTigerRounds);

// Get betting records for members (admin/agent)
router.get('/bets', requireRole('admin', 'agent'), getBettingRecords);

// Get roadmap data
router.get('/roadmap', getRoadmap);

// Get bet statistics
router.get('/stats', getBetStats);

// Get current user's betting limits
router.get('/my-limits', getMyLimits);

// Start new shoe (admin only)
router.post('/new-shoe', requireRole('admin'), newShoe);

// GET /api/game/chip-preferences — get user's chip preferences
router.get('/chip-preferences', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { chipPreferences: true, customChips: true },
    });
    res.json({
      chipPreferences: user?.chipPreferences ?? null,
      customChips: user?.customChips ?? null,
    });
  } catch (error) {
    console.error('[Game] Failed to get chip preferences:', error);
    res.status(500).json({ error: 'Failed to get chip preferences' });
  }
});

// PUT /api/game/chip-preferences — save user's chip preferences
router.put('/chip-preferences', async (req: Request, res: Response) => {
  try {
    const { chipPreferences, customChips } = req.body;
    const data: any = {};
    if (chipPreferences !== undefined) data.chipPreferences = chipPreferences;
    if (customChips !== undefined) data.customChips = customChips;

    await prisma.user.update({
      where: { id: req.user!.userId },
      data,
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[Game] Failed to save chip preferences:', error);
    res.status(500).json({ error: 'Failed to save chip preferences' });
  }
});

export default router;
