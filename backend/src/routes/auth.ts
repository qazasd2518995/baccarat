import { Router } from 'express';
import { bgLaunch, login, me, changePassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/login', login);
router.post('/bg-launch', bgLaunch);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);

export default router;
