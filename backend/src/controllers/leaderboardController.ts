import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';


/**
 * 獲取排行榜數據
 * GET /api/leaderboard
 * Query params:
 *   - period: 'daily' | 'weekly' | 'monthly' | 'all' (default: 'daily')
 *   - limit: number (default: 10)
 */
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const { period = 'daily', limit = 10 } = req.query;
    const limitNum = Math.min(Number(limit) || 10, 100); // Max 100

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'all':
        startDate = new Date(0); // Beginning of time
        break;
      case 'daily':
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Query: Sum of net winnings per user (win transactions - bet transactions)
    // We calculate net result from bets table: sum of (payout - amount) for settled bets
    const leaderboardData = await prisma.$queryRaw<Array<{
      user_id: string;
      username: string;
      nickname: string | null;
      net_winnings: number;
    }>>`
      SELECT
        u.id as user_id,
        u.username,
        u.nickname,
        COALESCE(SUM(
          CASE
            WHEN b.status = 'won' THEN CAST(b.payout AS DECIMAL) - CAST(b.amount AS DECIMAL)
            WHEN b.status = 'lost' THEN -CAST(b.amount AS DECIMAL)
            ELSE 0
          END
        ), 0) as net_winnings
      FROM users u
      LEFT JOIN bets b ON u.id = b.user_id AND b.created_at >= ${startDate}
      WHERE u.role = 'member'
      GROUP BY u.id, u.username, u.nickname
      HAVING SUM(
        CASE
          WHEN b.status = 'won' THEN CAST(b.payout AS DECIMAL) - CAST(b.amount AS DECIMAL)
          WHEN b.status = 'lost' THEN -CAST(b.amount AS DECIMAL)
          ELSE 0
        END
      ) > 0
      ORDER BY net_winnings DESC
      LIMIT ${limitNum}
    `;

    // Format response
    const leaderboard = leaderboardData.map((row, index) => ({
      rank: index + 1,
      id: row.user_id,
      name: row.nickname || row.username,
      score: Math.floor(Number(row.net_winnings)),
    }));

    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      leaderboard,
    });
  } catch (error) {
    console.error('[Leaderboard] Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

/**
 * 獲取用戶在排行榜中的排名
 * GET /api/leaderboard/my-rank
 */
export async function getMyRank(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const { period = 'daily' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'all':
        startDate = new Date(0);
        break;
      case 'daily':
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    // Get user's net winnings
    const userStats = await prisma.$queryRaw<Array<{
      net_winnings: number;
    }>>`
      SELECT
        COALESCE(SUM(
          CASE
            WHEN b.status = 'won' THEN CAST(b.payout AS DECIMAL) - CAST(b.amount AS DECIMAL)
            WHEN b.status = 'lost' THEN -CAST(b.amount AS DECIMAL)
            ELSE 0
          END
        ), 0) as net_winnings
      FROM bets b
      WHERE b.user_id = ${currentUser.userId}
        AND b.created_at >= ${startDate}
    `;

    const netWinnings = Number(userStats[0]?.net_winnings || 0);

    // Count users with higher net winnings
    const rankResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      JOIN bets b ON u.id = b.user_id AND b.created_at >= ${startDate}
      WHERE u.role = 'member'
      GROUP BY u.id
      HAVING SUM(
        CASE
          WHEN b.status = 'won' THEN CAST(b.payout AS DECIMAL) - CAST(b.amount AS DECIMAL)
          WHEN b.status = 'lost' THEN -CAST(b.amount AS DECIMAL)
          ELSE 0
        END
      ) > ${netWinnings}
    `;

    const rank = Number(rankResult.length) + 1;

    res.json({
      userId: currentUser.userId,
      rank: netWinnings > 0 ? rank : null, // null if no winnings
      score: Math.floor(netWinnings),
      period,
    });
  } catch (error) {
    console.error('[Leaderboard] Error fetching user rank:', error);
    res.status(500).json({ error: 'Failed to fetch user rank' });
  }
}
