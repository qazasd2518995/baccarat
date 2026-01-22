import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getGifts, sendGift, getGiftHistory } from '../controllers/giftController.js';

const router = Router();

// 獲取禮物列表
router.get('/', authenticate, getGifts);

// 發送禮物
router.post('/send', authenticate, sendGift);

// 獲取禮物歷史
router.get('/history', authenticate, getGiftHistory);

export default router;
