import { Router } from 'express';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  resetPassword,
  getSubUsers,
  fixUserHierarchy,
} from '../controllers/userController.js';
import {
  getNotificationSettings,
  updateNotificationSettings,
} from '../controllers/notificationSettingsController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

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

// Fix user hierarchy (admin only) - sets admin as level 0 and assigns orphan members
router.post('/fix-hierarchy', requireRole('admin'), fixUserHierarchy);

// Fix admin level - simple endpoint to set all admin users to level 0
router.post('/fix-admin-level', requireRole('admin'), async (req, res) => {
  try {
    const result = await prisma.$executeRaw`UPDATE users SET agent_level = 0 WHERE role = 'admin'`;
    res.json({ success: true, message: `Updated ${result} admin user(s) to level 0` });
  } catch (error) {
    console.error('Fix admin level error:', error);
    res.status(500).json({ error: 'Failed to fix admin level' });
  }
});

export default router;
