import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require admin or agent role
router.use(authenticate);
router.use(requireRole('admin', 'agent'));

// Member win/loss report
router.get('/members', async (req, res) => {
  try {
    const { from, to } = req.query;
    const currentUser = req.user!;

    const dateFilter: any = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = toDate;
      }
    }

    // Build member filter based on user role
    const memberFilter: any = { role: 'member' };
    if (currentUser.role === 'agent') {
      memberFilter.parentAgentId = currentUser.userId;
    }

    const members = await prisma.user.findMany({
      where: memberFilter,
      select: {
        id: true,
        username: true,
        nickname: true,
        bets: {
          where: dateFilter,
          select: {
            amount: true,
            payout: true,
            status: true,
          },
        },
      },
    });

    const report = members.map((member) => {
      const totalBets = member.bets.reduce((sum, bet) => sum + Number(bet.amount), 0);
      const totalPayout = member.bets.reduce((sum, bet) => sum + Number(bet.payout || 0), 0);
      const wins = member.bets.filter((b) => b.status === 'won').length;
      const losses = member.bets.filter((b) => b.status === 'lost').length;

      return {
        userId: member.id,
        username: member.username,
        nickname: member.nickname,
        totalBets,
        totalWins: totalPayout,
        totalLosses: totalBets - totalPayout,
        netResult: totalPayout - totalBets,
        roundsPlayed: member.bets.length,
        winCount: wins,
        lossCount: losses,
      };
    });

    // Calculate totals
    const totals = report.reduce(
      (acc, m) => ({
        totalBets: acc.totalBets + m.totalBets,
        totalPayout: acc.totalPayout + m.totalWins,
        netProfit: acc.netProfit + (m.totalBets - m.totalWins),
        activeUsers: acc.activeUsers + (m.roundsPlayed > 0 ? 1 : 0),
      }),
      { totalBets: 0, totalPayout: 0, netProfit: 0, activeUsers: 0 }
    );

    res.json({ report, totals });
  } catch (error) {
    console.error('Member report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Agent performance report (admin only)
router.get('/agents', requireRole('admin'), async (req, res) => {
  try {
    const { from, to } = req.query;

    const dateFilter: any = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        dateFilter.createdAt.lte = toDate;
      }
    }

    const agents = await prisma.user.findMany({
      where: { role: 'agent' },
      select: {
        id: true,
        username: true,
        nickname: true,
        subUsers: {
          where: { role: 'member' },
          select: {
            id: true,
            bets: {
              where: dateFilter,
              select: {
                amount: true,
                payout: true,
              },
            },
          },
        },
      },
    });

    const report = agents.map((agent) => {
      const memberCount = agent.subUsers.length;
      let totalBets = 0;
      let totalPayout = 0;

      agent.subUsers.forEach((member) => {
        member.bets.forEach((bet) => {
          totalBets += Number(bet.amount);
          totalPayout += Number(bet.payout || 0);
        });
      });

      return {
        agentId: agent.id,
        username: agent.username,
        nickname: agent.nickname,
        memberCount,
        totalBets,
        totalPayout,
        netProfit: totalBets - totalPayout,
      };
    });

    // Calculate totals
    const totals = report.reduce(
      (acc, a) => ({
        totalBets: acc.totalBets + a.totalBets,
        totalPayout: acc.totalPayout + a.totalPayout,
        netProfit: acc.netProfit + a.netProfit,
        activeUsers: acc.activeUsers + a.memberCount,
      }),
      { totalBets: 0, totalPayout: 0, netProfit: 0, activeUsers: 0 }
    );

    res.json({ report, totals });
  } catch (error) {
    console.error('Agent report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    const currentUser = req.user!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Member filter based on role
    const memberFilter: any = { role: 'member' };
    if (currentUser.role === 'agent') {
      memberFilter.parentAgentId = currentUser.userId;
    }

    const [
      totalMembers,
      totalAgents,
      todayBets,
      todayRounds,
      recentTransactions,
    ] = await Promise.all([
      prisma.user.count({ where: memberFilter }),
      currentUser.role === 'admin' ? prisma.user.count({ where: { role: 'agent' } }) : 0,
      prisma.bet.aggregate({
        where: {
          createdAt: { gte: today },
          user: memberFilter,
        },
        _sum: { amount: true, payout: true },
      }),
      prisma.gameRound.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.transaction.findMany({
        where: {
          type: { in: ['deposit', 'withdraw'] },
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { username: true, nickname: true } },
        },
      }),
    ]);

    res.json({
      totalBets: Number(todayBets._sum.amount || 0),
      totalPayout: Number(todayBets._sum.payout || 0),
      netProfit: Number(todayBets._sum.amount || 0) - Number(todayBets._sum.payout || 0),
      activeMembers: 0, // Would need WebSocket tracking for real-time
      totalMembers,
      totalAgents,
      todayRounds,
      recentTransactions,
    });
  } catch (error) {
    console.error('Dashboard report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
