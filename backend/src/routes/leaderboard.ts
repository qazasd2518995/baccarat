import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getLeaderboard, getMyRank } from '../controllers/leaderboardController.js';

const router = Router();

// 獲取排行榜 - 需要認證
router.get('/', authenticate, getLeaderboard);

// 獲取自己的排名
router.get('/my-rank', authenticate, getMyRank);

export default router;
