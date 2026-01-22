import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  resetPassword,
  getSubUsers,
} from '../controllers/userController.js';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../controllers/notificationSettingsController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all users (admin and agents)
router.get('/', requireRole('admin', 'agent'), getUsers);

// Create user (admin and agents)
router.post('/', requireRole('admin', 'agent'), createUser);

// Get single user
router.get('/:id', getUser);

// Update user
router.put('/:id', requireRole('admin', 'agent'), updateUser);

// Reset password
router.post('/:id/reset-password', requireRole('admin', 'agent'), resetPassword);

// Get sub-users
router.get('/:id/sub-users', requireRole('admin', 'agent'), getSubUsers);

// Notification settings
router.get('/:id/notification-settings', getNotificationSettings);
router.patch('/:id/notification-settings', updateNotificationSettings);

export default router;
