import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';


/**
 * 獲取關注列表
 * GET /api/dealers/following
 */
export async function getFollowingList(req: Request, res: Response) {
  try {
    const currentUser = req.user!;

    const follows = await prisma.dealerFollow.findMany({
      where: { userId: currentUser.userId },
      orderBy: { createdAt: 'desc' },
    });

    const dealerNames = follows.map((f) => ({
      id: f.id,
      dealerName: f.dealerName,
      followedAt: f.createdAt.toISOString(),
    }));

    res.json({ following: dealerNames });
  } catch (error) {
    console.error('[DealerFollow] Error fetching following list:', error);
    res.status(500).json({ error: 'Failed to fetch following list' });
  }
}

/**
 * 關注荷官
 * POST /api/dealers/follow
 */
export async function followDealer(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const { dealerName } = req.body;

    if (!dealerName || typeof dealerName !== 'string') {
      return res.status(400).json({ error: 'Dealer name is required' });
    }

    // Check if already following
    const existing = await prisma.dealerFollow.findUnique({
      where: {
        userId_dealerName: {
          userId: currentUser.userId,
          dealerName,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Already following this dealer' });
    }

    const follow = await prisma.dealerFollow.create({
      data: {
        userId: currentUser.userId,
        dealerName,
      },
    });

    res.json({
      success: true,
      follow: {
        id: follow.id,
        dealerName: follow.dealerName,
        followedAt: follow.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[DealerFollow] Error following dealer:', error);
    res.status(500).json({ error: 'Failed to follow dealer' });
  }
}

/**
 * 取消關注荷官
 * DELETE /api/dealers/follow/:dealerName
 */
export async function unfollowDealer(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const dealerName = req.params.dealerName as string;

    if (!dealerName) {
      return res.status(400).json({ error: 'Dealer name is required' });
    }

    // Check if following
    const existing = await prisma.dealerFollow.findUnique({
      where: {
        userId_dealerName: {
          userId: currentUser.userId,
          dealerName,
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Not following this dealer' });
    }

    await prisma.dealerFollow.delete({
      where: {
        userId_dealerName: {
          userId: currentUser.userId,
          dealerName,
        },
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[DealerFollow] Error unfollowing dealer:', error);
    res.status(500).json({ error: 'Failed to unfollow dealer' });
  }
}

/**
 * 檢查是否關注某個荷官
 * GET /api/dealers/follow/:dealerName
 */
export async function isFollowing(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const dealerName = req.params.dealerName as string;

    if (!dealerName) {
      return res.status(400).json({ error: 'Dealer name is required' });
    }

    const existing = await prisma.dealerFollow.findUnique({
      where: {
        userId_dealerName: {
          userId: currentUser.userId,
          dealerName,
        },
      },
    });

    res.json({ isFollowing: !!existing });
  } catch (error) {
    console.error('[DealerFollow] Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
}
