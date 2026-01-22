import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getFollowingList,
  followDealer,
  unfollowDealer,
  isFollowing,
} from '../controllers/dealerFollowController.js';

const router = Router();

// 獲取關注列表
router.get('/following', authenticate, getFollowingList);

// 檢查是否關注某個荷官
router.get('/follow/:dealerName', authenticate, isFollowing);

// 關注荷官
router.post('/follow', authenticate, followDealer);

// 取消關注荷官
router.delete('/follow/:dealerName', authenticate, unfollowDealer);

export default router;
