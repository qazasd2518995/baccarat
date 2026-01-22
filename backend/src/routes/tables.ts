import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
} from '../controllers/tableController.js';

const router = Router();

// 獲取所有桌台列表
router.get('/', authenticate, getTables);

// 獲取單一桌台詳情
router.get('/:id', authenticate, getTable);

// 創建桌台 (管理員)
router.post('/', authenticate, createTable);

// 更新桌台 (管理員)
router.put('/:id', authenticate, updateTable);

// 刪除桌台 (管理員)
router.delete('/:id', authenticate, deleteTable);

export default router;
