import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getChatHistory, sendMessage } from '../controllers/chatController.js';

const router = Router();

// 獲取聊天歷史
router.get('/history', authenticate, getChatHistory);

// 發送消息 (HTTP endpoint, 主要用於測試; 實際使用 WebSocket)
router.post('/send', authenticate, sendMessage);

export default router;
