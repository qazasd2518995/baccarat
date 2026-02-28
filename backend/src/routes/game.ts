import { Router } from 'express';
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
} from '../controllers/gameController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

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

// Get roadmap data
router.get('/roadmap', getRoadmap);

// Get bet statistics
router.get('/stats', getBetStats);

// Get current user's betting limits
router.get('/my-limits', getMyLimits);

// Start new shoe (admin only)
router.post('/new-shoe', requireRole('admin'), newShoe);

export default router;
