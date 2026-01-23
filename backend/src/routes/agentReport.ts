import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Helper to get date range from quick filter
function getDateRange(quickFilter: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  switch (quickFilter) {
    case 'today':
      return { startDate: today, endDate: tomorrow };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { startDate: yesterday, endDate: today };
    }
    case 'thisWeek': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      return { startDate: startOfWeek, endDate: tomorrow };
    }
    case 'lastWeek': {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(startOfLastWeek.getDate() - startOfLastWeek.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() + 7);
      return { startDate: startOfLastWeek, endDate: endOfLastWeek };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0);
      return { startDate: startOfMonth, endDate: tomorrow };
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 12, 0, 0);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1, 12, 0, 0);
      return { startDate: startOfLastMonth, endDate: endOfLastMonth };
    }
    default:
      return { startDate: today, endDate: tomorrow };
  }
}

// Helper to calculate betting stats for a user
async function calculateBettingStats(userId: string, startDate: Date, endDate: Date) {
  // Get all bets from this user in the date range
  const bets = await prisma.bet.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lt: endDate
      }
    }
  });

  let betCount = bets.length;
  let betAmount = 0;
  let validBet = 0;
  let memberWinLoss = 0;

  for (const bet of bets) {
    betAmount += Number(bet.amount);
    validBet += Number(bet.amount);

    if (bet.status === 'won' && bet.payout) {
      memberWinLoss += Number(bet.payout) - Number(bet.amount);
    } else if (bet.status === 'lost') {
      memberWinLoss -= Number(bet.amount);
    }
  }

  return { betCount, betAmount, validBet, memberWinLoss };
}

// Helper to get all downline members recursively
async function getAllDownlineMembers(agentId: string): Promise<string[]> {
  const memberIds: string[] = [];

  // Get direct downline
  const directDownline = await prisma.user.findMany({
    where: { parentAgentId: agentId },
    select: { id: true, role: true }
  });

  for (const user of directDownline) {
    if (user.role === 'member') {
      memberIds.push(user.id);
    } else if (user.role === 'agent') {
      // Recursively get members under this agent
      const subMembers = await getAllDownlineMembers(user.id);
      memberIds.push(...subMembers);
    }
  }

  return memberIds;
}

// Helper to calculate agent report
async function calculateAgentReport(agentId: string, startDate: Date, endDate: Date) {
  // Get all members under this agent
  const memberIds = await getAllDownlineMembers(agentId);

  let betCount = 0;
  let betAmount = 0;
  let validBet = 0;
  let memberWinLoss = 0;

  for (const memberId of memberIds) {
    const stats = await calculateBettingStats(memberId, startDate, endDate);
    betCount += stats.betCount;
    betAmount += stats.betAmount;
    validBet += stats.validBet;
    memberWinLoss += stats.memberWinLoss;
  }

  // Get agent's share/rebate settings
  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { sharePercent: true, rebatePercent: true }
  });

  const sharePercent = Number(agent?.sharePercent || 0);
  const rebatePercent = Number(agent?.rebatePercent || 0);

  // Calculate derived values
  const memberRebate = validBet * (rebatePercent / 100);
  const personalShare = Math.abs(memberWinLoss) * (sharePercent / 100);
  const personalRebate = memberRebate;

  // For agent: receivable is what downline owes us, payable is what we owe upline
  // If member loses, agent receives; if member wins, agent pays
  const receivable = memberWinLoss < 0 ? Math.abs(memberWinLoss) - personalShare : 0;
  const payable = memberWinLoss > 0 ? memberWinLoss + memberRebate : memberRebate;
  const profit = receivable - payable;

  return {
    betCount,
    betAmount,
    validBet,
    memberWinLoss,
    memberRebate,
    personalShare,
    personalRebate,
    receivable,
    payable,
    profit
  };
}

/**
 * GET /api/agent-report/agent
 * 遊戲代理報表
 */
router.get('/agent', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const {
      agentId,
      quickFilter = 'today',
      startDate: startDateStr,
      endDate: endDateStr
    } = req.query;

    // Determine date range
    let dateRange: { startDate: Date; endDate: Date };
    if (startDateStr && endDateStr) {
      dateRange = {
        startDate: new Date(startDateStr as string),
        endDate: new Date(endDateStr as string)
      };
    } else {
      dateRange = getDateRange(quickFilter as string);
    }

    // Get current user's report
    const currentUserReport = await calculateAgentReport(currentUser.userId, dateRange.startDate, dateRange.endDate);
    const currentUserData = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { username: true, nickname: true, agentLevel: true, sharePercent: true, rebatePercent: true }
    });

    // Get direct downline agents
    let agentFilter: any = {
      parentAgentId: currentUser.userId,
      role: 'agent'
    };

    if (agentId) {
      agentFilter.OR = [
        { username: { contains: agentId as string, mode: 'insensitive' } },
        { nickname: { contains: agentId as string, mode: 'insensitive' } }
      ];
    }

    const downlineAgents = await prisma.user.findMany({
      where: agentFilter,
      select: {
        id: true,
        username: true,
        nickname: true,
        agentLevel: true,
        sharePercent: true,
        rebatePercent: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate report for each downline agent
    const agentReports = await Promise.all(
      downlineAgents.map(async (agent) => {
        const report = await calculateAgentReport(agent.id, dateRange.startDate, dateRange.endDate);
        return {
          id: agent.id,
          username: agent.username,
          nickname: agent.nickname,
          agentLevel: agent.agentLevel,
          sharePercent: Number(agent.sharePercent),
          rebatePercent: Number(agent.rebatePercent),
          ...report
        };
      })
    );

    res.json({
      currentUser: {
        id: currentUser.userId,
        username: currentUserData?.username,
        nickname: currentUserData?.nickname,
        agentLevel: currentUserData?.agentLevel,
        sharePercent: Number(currentUserData?.sharePercent),
        rebatePercent: Number(currentUserData?.rebatePercent),
        ...currentUserReport
      },
      agents: agentReports,
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      }
    });
  } catch (error) {
    console.error('[AgentReport] Error fetching agent report:', error);
    res.status(500).json({ error: 'Failed to fetch agent report' });
  }
});

/**
 * GET /api/agent-report/member
 * 遊戲會員報表
 */
router.get('/member', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const {
      memberId,
      quickFilter = 'today',
      startDate: startDateStr,
      endDate: endDateStr
    } = req.query;

    // Determine date range
    let dateRange: { startDate: Date; endDate: Date };
    if (startDateStr && endDateStr) {
      dateRange = {
        startDate: new Date(startDateStr as string),
        endDate: new Date(endDateStr as string)
      };
    } else {
      dateRange = getDateRange(quickFilter as string);
    }

    // Get current user's total report
    const currentUserReport = await calculateAgentReport(currentUser.userId, dateRange.startDate, dateRange.endDate);
    const currentUserData = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { username: true, nickname: true, agentLevel: true, sharePercent: true, rebatePercent: true }
    });

    // Get direct downline members
    let memberFilter: any = {
      parentAgentId: currentUser.userId,
      role: 'member'
    };

    if (memberId) {
      memberFilter.OR = [
        { username: { contains: memberId as string, mode: 'insensitive' } },
        { nickname: { contains: memberId as string, mode: 'insensitive' } }
      ];
    }

    const downlineMembers = await prisma.user.findMany({
      where: memberFilter,
      select: {
        id: true,
        username: true,
        nickname: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculate report for each member
    const memberReports = await Promise.all(
      downlineMembers.map(async (member) => {
        const stats = await calculateBettingStats(member.id, dateRange.startDate, dateRange.endDate);
        return {
          id: member.id,
          username: member.username,
          nickname: member.nickname,
          ...stats
        };
      })
    );

    res.json({
      currentUser: {
        id: currentUser.userId,
        username: currentUserData?.username,
        nickname: currentUserData?.nickname,
        agentLevel: currentUserData?.agentLevel,
        sharePercent: Number(currentUserData?.sharePercent),
        rebatePercent: Number(currentUserData?.rebatePercent),
        ...currentUserReport
      },
      members: memberReports,
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      }
    });
  } catch (error) {
    console.error('[AgentReport] Error fetching member report:', error);
    res.status(500).json({ error: 'Failed to fetch member report' });
  }
});

/**
 * GET /api/agent-report/dashboard
 * 儀表盤統計數據
 */
router.get('/dashboard', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;

    // Get today's date range
    const dateRange = getDateRange('today');

    // Calculate today's report
    const report = await calculateAgentReport(currentUser.userId, dateRange.startDate, dateRange.endDate);

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        username: true,
        nickname: true,
        agentLevel: true,
        balance: true,
        status: true,
        inviteCode: true,
        sharePercent: true,
        rebatePercent: true,
        parentAgent: {
          select: { nickname: true, sharePercent: true }
        }
      }
    });

    res.json({
      user: {
        username: user?.username,
        nickname: user?.nickname,
        agentLevel: user?.agentLevel,
        balance: Number(user?.balance),
        status: user?.status,
        inviteCode: user?.inviteCode,
        sharePercent: Number(user?.sharePercent),
        parentShare: user?.parentAgent ? Number(user.parentAgent.sharePercent) : null
      },
      today: {
        earnedRebate: report.personalRebate,
        receivable: report.receivable,
        payable: report.payable,
        memberWinLoss: report.memberWinLoss,
        validBet: report.validBet,
        betCount: report.betCount,
        profit: report.profit
      },
      dateRange: {
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      }
    });
  } catch (error) {
    console.error('[AgentReport] Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;
