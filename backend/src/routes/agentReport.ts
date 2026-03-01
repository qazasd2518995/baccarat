import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

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

// Helper to get all downline agents recursively
async function getAllDownlineAgents(agentId: string): Promise<string[]> {
  const agentIds: string[] = [];

  // Get direct downline agents
  const directAgents = await prisma.user.findMany({
    where: { parentAgentId: agentId, role: 'agent' },
    select: { id: true }
  });

  for (const agent of directAgents) {
    agentIds.push(agent.id);
    // Recursively get sub-agents
    const subAgents = await getAllDownlineAgents(agent.id);
    agentIds.push(...subAgents);
  }

  return agentIds;
}

// Helper to build breadcrumb path from root user to target
async function buildBreadcrumb(rootUserId: string, targetAgentId: string): Promise<Array<{ id: string; username: string; nickname: string | null }>> {
  const breadcrumb: Array<{ id: string; username: string; nickname: string | null }> = [];

  // Start from root (current logged-in user)
  const rootUser = await prisma.user.findUnique({
    where: { id: rootUserId },
    select: { id: true, username: true, nickname: true }
  });
  if (rootUser) {
    breadcrumb.push({ id: rootUser.id, username: rootUser.username, nickname: rootUser.nickname });
  }

  // Build path from root to target
  if (targetAgentId !== rootUserId) {
    const pathToTarget: Array<{ id: string; username: string; nickname: string | null }> = [];
    let currentId = targetAgentId;

    while (currentId && currentId !== rootUserId) {
      const user = await prisma.user.findUnique({
        where: { id: currentId },
        select: { id: true, username: true, nickname: true, parentAgentId: true }
      });
      if (user) {
        pathToTarget.unshift({ id: user.id, username: user.username, nickname: user.nickname });
        currentId = user.parentAgentId || '';
      } else {
        break;
      }
    }

    breadcrumb.push(...pathToTarget);
  }

  return breadcrumb;
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

  // 會員退水 = 有效投注 * 退水比例
  const memberRebate = validBet * (rebatePercent / 100);
  // 個人佔成 = |會員輸贏| * 佔成比例（代理從會員輸贏中獲得的佔成）
  const personalShare = Math.abs(memberWinLoss) * (sharePercent / 100);
  // 個人退水 = 會員退水
  const personalRebate = memberRebate;

  // 應收下線：會員輸錢時，代理應收取的金額（會員輸的錢）
  const receivable = memberWinLoss < 0 ? Math.abs(memberWinLoss) : 0;
  // 應繳上線：會員贏錢時，代理應繳給上線的金額（會員贏的錢 + 退水）
  const payable = memberWinLoss > 0 ? memberWinLoss + memberRebate : memberRebate;
  // 個人盈虧 = 應收下線 - 應繳上線 + 個人佔成 + 個人退水
  const profit = receivable - payable + personalShare + personalRebate;

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

// Helper to get direct downline members only (not recursive)
async function getDirectDownlineMembers(agentId: string): Promise<string[]> {
  const members = await prisma.user.findMany({
    where: { parentAgentId: agentId, role: 'member' },
    select: { id: true }
  });
  return members.map(m => m.id);
}

// Helper to calculate direct members report (only direct members, not sub-agents' members)
async function calculateDirectMembersReport(agentId: string, startDate: Date, endDate: Date) {
  const memberIds = await getDirectDownlineMembers(agentId);

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

  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { sharePercent: true, rebatePercent: true, agentLevel: true }
  });

  const sharePercent = Number(agent?.sharePercent || 0);
  const rebatePercent = Number(agent?.rebatePercent || 0);

  // 會員退水 = 有效投注 * 退水比例
  const memberRebate = validBet * (rebatePercent / 100);
  // 個人佔成 = |會員輸贏| * 佔成比例
  const personalShare = Math.abs(memberWinLoss) * (sharePercent / 100);
  // 個人退水 = 會員退水（代理從退水中獲得的）
  const personalRebate = memberRebate;

  // 應收下線：會員輸錢時，代理應收 = 會員輸的錢（正值）
  // 應繳上線：會員贏錢時，代理應繳 = 會員贏的錢 + 退水
  // 個人盈虧 = 應收下線 - 應繳上線 + 個人佔成 + 個人退水
  const receivable = memberWinLoss < 0 ? Math.abs(memberWinLoss) : 0;
  const payable = memberWinLoss > 0 ? memberWinLoss + memberRebate : memberRebate;
  const profit = receivable - payable + personalShare + personalRebate;

  return {
    // 直屬會員沒有代理層級概念，用 -1 表示
    agentLevel: -1,
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

// Helper to calculate sub-agents report (only sub-agents, not direct members)
async function calculateSubAgentsReport(agentId: string, startDate: Date, endDate: Date) {
  // Get direct sub-agents
  const directAgents = await prisma.user.findMany({
    where: { parentAgentId: agentId, role: 'agent' },
    select: { id: true }
  });

  let betCount = 0;
  let betAmount = 0;
  let validBet = 0;
  let memberWinLoss = 0;

  for (const subAgent of directAgents) {
    // Get all members under this sub-agent (recursively)
    const memberIds = await getAllDownlineMembers(subAgent.id);
    for (const memberId of memberIds) {
      const stats = await calculateBettingStats(memberId, startDate, endDate);
      betCount += stats.betCount;
      betAmount += stats.betAmount;
      validBet += stats.validBet;
      memberWinLoss += stats.memberWinLoss;
    }
  }

  const agent = await prisma.user.findUnique({
    where: { id: agentId },
    select: { sharePercent: true, rebatePercent: true, agentLevel: true }
  });

  const sharePercent = Number(agent?.sharePercent || 0);
  const rebatePercent = Number(agent?.rebatePercent || 0);

  // 會員退水 = 有效投注 * 退水比例
  const memberRebate = validBet * (rebatePercent / 100);
  // 個人佔成 = |會員輸贏| * 佔成比例
  const personalShare = Math.abs(memberWinLoss) * (sharePercent / 100);
  // 個人退水 = 會員退水
  const personalRebate = memberRebate;

  // 應收下線：下線代理應繳給我的（會員輸錢時）
  const receivable = memberWinLoss < 0 ? Math.abs(memberWinLoss) : 0;
  // 應繳上線：我應繳給上線的
  const payable = memberWinLoss > 0 ? memberWinLoss + memberRebate : memberRebate;
  // 個人盈虧
  const profit = receivable - payable + personalShare + personalRebate;

  return {
    // 下線代理沒有單一層級概念，用 -2 表示
    agentLevel: -2,
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
 * - viewAgentId: 查看特定代理的直屬下線（用於層級導航）
 * - agentId: 搜索過濾
 */
router.get('/agent', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const {
      agentId,
      viewAgentId,
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

    // Determine which agent to view (current user or specific agent)
    const targetAgentId = viewAgentId ? String(viewAgentId) : currentUser.userId;

    // Verify the target agent is within current user's downline (or is the current user)
    if (viewAgentId && viewAgentId !== currentUser.userId) {
      const allDownlineAgents = await getAllDownlineAgents(currentUser.userId);
      if (!allDownlineAgents.includes(targetAgentId)) {
        return res.status(403).json({ error: 'Access denied to this agent' });
      }
    }

    // Get target agent's data
    const targetAgentData = await prisma.user.findUnique({
      where: { id: targetAgentId },
      select: {
        id: true,
        username: true,
        nickname: true,
        agentLevel: true,
        sharePercent: true,
        rebatePercent: true,
        parentAgentId: true,
        parentAgent: {
          select: { id: true, username: true, nickname: true }
        }
      }
    });

    if (!targetAgentData) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get target agent's total report
    const targetAgentReport = await calculateAgentReport(targetAgentId, dateRange.startDate, dateRange.endDate);

    // Get direct downline agents only (not recursive)
    let directAgentFilter: any = {
      parentAgentId: targetAgentId,
      role: 'agent'
    };

    if (agentId) {
      directAgentFilter.OR = [
        { username: { contains: agentId as string, mode: 'insensitive' } },
        { nickname: { contains: agentId as string, mode: 'insensitive' } }
      ];
    }

    const directDownlineAgents = await prisma.user.findMany({
      where: directAgentFilter,
      select: {
        id: true,
        username: true,
        nickname: true,
        agentLevel: true,
        sharePercent: true,
        rebatePercent: true
      },
      orderBy: [{ agentLevel: 'asc' }, { createdAt: 'asc' }]
    });

    // Calculate report for each direct downline agent
    const agentReports = await Promise.all(
      directDownlineAgents.map(async (agent) => {
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

    // Calculate sub-agents summary (下線代理輸贏總和)
    const subAgentsSummary = await calculateSubAgentsReport(targetAgentId, dateRange.startDate, dateRange.endDate);

    // Calculate direct members summary (直屬會員輸贏總和)
    const directMembersSummary = await calculateDirectMembersReport(targetAgentId, dateRange.startDate, dateRange.endDate);

    // Build breadcrumb path
    const breadcrumb = await buildBreadcrumb(currentUser.userId, targetAgentId);

    res.json({
      currentUser: {
        id: targetAgentId,
        username: targetAgentData.username,
        nickname: targetAgentData.nickname,
        agentLevel: targetAgentData.agentLevel,
        sharePercent: Number(targetAgentData.sharePercent),
        rebatePercent: Number(targetAgentData.rebatePercent),
        ...targetAgentReport
      },
      agents: agentReports,
      subAgentsSummary,
      directMembersSummary,
      breadcrumb,
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
      viewAgentId,
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

    // Determine target agent ID (either viewAgentId or currentUser)
    const targetAgentId = viewAgentId ? String(viewAgentId) : currentUser.userId;

    // Validate viewAgentId is a downline of current user
    if (viewAgentId) {
      const allDownlineIds = await getAllDownlineAgents(currentUser.userId);
      if (!allDownlineIds.includes(String(viewAgentId)) && targetAgentId !== currentUser.userId) {
        return res.status(403).json({ error: 'Access denied to this agent' });
      }
    }

    // Get target agent's report
    const targetAgentReport = await calculateAgentReport(targetAgentId, dateRange.startDate, dateRange.endDate);
    const targetAgentData = await prisma.user.findUnique({
      where: { id: targetAgentId },
      select: { username: true, nickname: true, agentLevel: true, sharePercent: true, rebatePercent: true }
    });

    // Get direct members of the target agent (not recursive - only direct members)
    const directMembers = await prisma.user.findMany({
      where: {
        parentAgentId: targetAgentId,
        role: 'member'
      },
      select: {
        id: true,
        username: true,
        nickname: true,
      },
      orderBy: { createdAt: 'asc' }
    });

    // Apply search filter if provided
    let filteredMembers = directMembers;
    if (memberId) {
      const searchTerm = (memberId as string).toLowerCase();
      filteredMembers = directMembers.filter(m =>
        m.username.toLowerCase().includes(searchTerm) ||
        (m.nickname && m.nickname.toLowerCase().includes(searchTerm))
      );
    }

    // Calculate report for each member
    const memberReports = await Promise.all(
      filteredMembers.map(async (member) => {
        const stats = await calculateBettingStats(member.id, dateRange.startDate, dateRange.endDate);
        return {
          id: member.id,
          username: member.username,
          nickname: member.nickname,
          ...stats
        };
      })
    );

    // Build breadcrumb
    const breadcrumb = await buildBreadcrumb(currentUser.userId, targetAgentId);

    res.json({
      currentUser: {
        id: targetAgentId,
        username: targetAgentData?.username,
        nickname: targetAgentData?.nickname,
        agentLevel: targetAgentData?.agentLevel,
        sharePercent: Number(targetAgentData?.sharePercent),
        rebatePercent: Number(targetAgentData?.rebatePercent),
        ...targetAgentReport
      },
      members: memberReports,
      breadcrumb,
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
