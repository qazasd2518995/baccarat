import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';


// Default notification settings
const defaultSettings = {
  settlementNotifications: true,
  balanceAlerts: true,
  systemAnnouncements: true,
  soundEffects: false,
};

/**
 * 獲取用戶通知設置
 * GET /api/users/:id/notification-settings
 */
export async function getNotificationSettings(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const userId = req.params.id as string;

    // Users can only access their own settings, admins can access any
    if (currentUser.role !== 'admin' && currentUser.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const settings = await prisma.notificationSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      // Return default settings if not found
      return res.json({
        userId,
        ...defaultSettings,
      });
    }

    res.json({
      id: settings.id,
      userId: settings.userId,
      settlementNotifications: settings.settlementNotifications,
      balanceAlerts: settings.balanceAlerts,
      systemAnnouncements: settings.systemAnnouncements,
      soundEffects: settings.soundEffects,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[NotificationSettings] Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
}

/**
 * 更新用戶通知設置
 * PATCH /api/users/:id/notification-settings
 */
export async function updateNotificationSettings(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const userId = req.params.id as string;

    // Users can only update their own settings, admins can update any
    if (currentUser.role !== 'admin' && currentUser.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { settlementNotifications, balanceAlerts, systemAnnouncements, soundEffects } = req.body;

    // Validate that at least one field is provided
    if (
      settlementNotifications === undefined &&
      balanceAlerts === undefined &&
      systemAnnouncements === undefined &&
      soundEffects === undefined
    ) {
      return res.status(400).json({ error: 'At least one setting must be provided' });
    }

    // Upsert: create if not exists, update if exists
    const settings = await prisma.notificationSettings.upsert({
      where: { userId },
      update: {
        ...(settlementNotifications !== undefined && { settlementNotifications }),
        ...(balanceAlerts !== undefined && { balanceAlerts }),
        ...(systemAnnouncements !== undefined && { systemAnnouncements }),
        ...(soundEffects !== undefined && { soundEffects }),
      },
      create: {
        userId,
        settlementNotifications: settlementNotifications ?? defaultSettings.settlementNotifications,
        balanceAlerts: balanceAlerts ?? defaultSettings.balanceAlerts,
        systemAnnouncements: systemAnnouncements ?? defaultSettings.systemAnnouncements,
        soundEffects: soundEffects ?? defaultSettings.soundEffects,
      },
    });

    res.json({
      id: settings.id,
      userId: settings.userId,
      settlementNotifications: settings.settlementNotifications,
      balanceAlerts: settings.balanceAlerts,
      systemAnnouncements: settings.systemAnnouncements,
      soundEffects: settings.soundEffects,
      createdAt: settings.createdAt.toISOString(),
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[NotificationSettings] Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
}
