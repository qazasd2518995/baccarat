import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  getBalance,
  getTransactionSummary,
} from '../controllers/transactionController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get transactions
router.get('/', getTransactions);

// Get transaction summary
router.get('/summary', getTransactionSummary);

// Create transaction (deposit/withdraw/adjustment)
router.post('/', requireRole('admin', 'agent'), createTransaction);

// Get user balance
router.get('/balance/:userId', getBalance);

export default router;
