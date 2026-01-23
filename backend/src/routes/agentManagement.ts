import { Router, Request, Response } from 'express';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// Helper function to generate invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to generate unique invite code
async function getUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  while (await prisma.user.findFirst({ where: { inviteCode: code } })) {
    code = generateInviteCode();
  }
  return code;
}

// Helper to get downline summary
async function getDownlineSummary(userId: string) {
  // Count direct agents
  const directAgents = await prisma.user.count({
    where: { parentAgentId: userId, role: 'agent' }
  });

  // Count direct members
  const directMembers = await prisma.user.count({
    where: { parentAgentId: userId, role: 'member' }
  });

  // Count total members under all downline agents recursively
  const allDownlineUsers = await prisma.user.findMany({
    where: { parentAgentId: userId }
  });

  let totalMembers = directMembers;
  for (const user of allDownlineUsers) {
    if (user.role === 'agent') {
      const subCount = await prisma.user.count({
        where: { parentAgentId: user.id, role: 'member' }
      });
      totalMembers += subCount;
    }
  }

  return {
    agentCount: directAgents,
    directMemberCount: directMembers,
    totalMemberCount: totalMembers
  };
}

/**
 * GET /api/agent-management/dashboard
 * 獲取個人數據面板資料
 */
router.get('/dashboard', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      include: {
        parentAgent: {
          select: { nickname: true, username: true, sharePercent: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const summary = await getDownlineSummary(user.id);

    res.json({
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      agentLevel: user.agentLevel,
      balance: Number(user.balance),
      status: user.status,
      inviteCode: user.inviteCode,
      sharePercent: Number(user.sharePercent),
      rebatePercent: Number(user.rebatePercent),
      isLocked: user.isLocked,
      isFullDisabled: user.isFullDisabled,
      isReadonly: user.isReadonly,
      lastLoginIp: user.lastLoginIp,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      parentAgent: user.parentAgent ? {
        nickname: user.parentAgent.nickname,
        username: user.parentAgent.username,
        sharePercent: Number(user.parentAgent.sharePercent)
      } : null,
      ...summary
    });
  } catch (error) {
    console.error('[AgentManagement] Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

/**
 * GET /api/agent-management/agents
 * 獲取下線代理列表
 */
router.get('/agents', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { search, status, page = '1', limit = '10' } = req.query;

    const where: any = {
      parentAgentId: currentUser.userId,
      role: 'agent'
    };

    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { nickname: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status as UserStatus;
    }

    const [agents, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          nickname: true,
          agentLevel: true,
          balance: true,
          status: true,
          inviteCode: true,
          sharePercent: true,
          rebatePercent: true,
          isLocked: true,
          isFullDisabled: true,
          isReadonly: true,
          lastLoginIp: true,
          lastLoginAt: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    // Get downline summary for each agent
    const agentsWithSummary = await Promise.all(
      agents.map(async (agent) => {
        const summary = await getDownlineSummary(agent.id);
        return {
          ...agent,
          balance: Number(agent.balance),
          sharePercent: Number(agent.sharePercent),
          rebatePercent: Number(agent.rebatePercent),
          ...summary
        };
      })
    );

    res.json({
      agents: agentsWithSummary,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('[AgentManagement] Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

/**
 * GET /api/agent-management/members
 * 獲取下線會員列表
 */
router.get('/members', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { search, status, page = '1', limit = '10', startDate, endDate } = req.query;

    const where: any = {
      parentAgentId: currentUser.userId,
      role: 'member'
    };

    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { nickname: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    if (status && status !== 'all') {
      where.status = status as UserStatus;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          nickname: true,
          balance: true,
          status: true,
          isLocked: true,
          isFullDisabled: true,
          isReadonly: true,
          lastLoginIp: true,
          lastLoginAt: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      members: members.map(m => ({ ...m, balance: Number(m.balance) })),
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('[AgentManagement] Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

/**
 * POST /api/agent-management/agents
 * 創建新代理 (5步驟嚮導)
 */
router.post('/agents', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const {
      username,
      password,
      nickname,
      initialBalance = 0,
      sharePercent = 0,
      rebatePercent = 0,
      platforms = [],
      shareSettings = [],
      betLimits = []
    } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Determine agent level (parent level + 1)
    const parentUser = await prisma.user.findUnique({ where: { id: currentUser.userId } });
    const newAgentLevel = Math.min((parentUser?.agentLevel || 1) + 1, 5);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate invite code
    const inviteCode = await getUniqueInviteCode();

    // Create agent with sharePercent and rebatePercent
    const agent = await prisma.user.create({
      data: {
        username,
        passwordHash,
        nickname: nickname || username,
        role: 'agent',
        parentAgentId: currentUser.userId,
        agentLevel: newAgentLevel,
        balance: initialBalance,
        sharePercent: sharePercent,
        rebatePercent: rebatePercent,
        inviteCode
      }
    });

    // Create share settings if provided
    if (shareSettings.length > 0) {
      await prisma.agentShareSetting.createMany({
        data: shareSettings.map((s: any) => ({
          agentId: agent.id,
          gameCategory: s.gameCategory,
          platform: s.platform,
          sharePercent: s.sharePercent || 0,
          rebatePercent: s.rebatePercent || 0,
          enabled: s.enabled !== false
        }))
      });
    }

    // Create bet limits if provided (support both string array and object array)
    if (betLimits.length > 0) {
      const limitsData = betLimits.map((l: any) => ({
        agentId: agent.id,
        limitRange: typeof l === 'string' ? l : l.limitRange,
        enabled: typeof l === 'string' ? true : l.enabled !== false
      }));
      await prisma.agentBetLimit.createMany({ data: limitsData });
    }

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'create_agent',
        targetType: 'user',
        targetId: agent.id,
        details: { username, nickname, agentLevel: newAgentLevel },
        ipAddress: req.ip || 'unknown'
      }
    });

    res.status(201).json({
      id: agent.id,
      username: agent.username,
      nickname: agent.nickname,
      agentLevel: agent.agentLevel,
      inviteCode: agent.inviteCode,
      balance: Number(agent.balance)
    });
  } catch (error) {
    console.error('[AgentManagement] Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

/**
 * POST /api/agent-management/members
 * 創建新會員
 */
router.post('/members', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { username, password, nickname, initialBalance = 0 } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username exists
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate invite code
    const inviteCode = await getUniqueInviteCode();

    // Create member
    const member = await prisma.user.create({
      data: {
        username,
        passwordHash,
        nickname: nickname || username,
        role: 'member',
        parentAgentId: currentUser.userId,
        agentLevel: 5, // Members are always level 5
        balance: initialBalance,
        inviteCode
      }
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'create_member',
        targetType: 'user',
        targetId: member.id,
        details: { username, nickname },
        ipAddress: req.ip || 'unknown'
      }
    });

    res.status(201).json({
      id: member.id,
      username: member.username,
      nickname: member.nickname,
      balance: Number(member.balance)
    });
  } catch (error) {
    console.error('[AgentManagement] Error creating member:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

/**
 * PUT /api/agent-management/agents/:id
 * 更新代理資料 (密碼、名稱)
 */
router.put('/agents/:id', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const id = req.params.id as string;
    const { password, nickname } = req.body;

    // Verify permission (can only manage direct downline)
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.role !== 'admin' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Can only manage direct downline' });
    }

    const updateData: any = {};
    if (nickname !== undefined) {
      updateData.nickname = nickname;
    }
    if (password) {
      if (password.length < 8 || password.length > 16) {
        return res.status(400).json({ error: 'Password must be 8-16 characters' });
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_agent',
        targetType: 'user',
        targetId: id,
        details: { nickname: nickname || undefined, passwordChanged: !!password },
        ipAddress: req.ip || 'unknown'
      }
    });

    res.json({
      id: updated.id,
      username: updated.username,
      nickname: updated.nickname
    });
  } catch (error) {
    console.error('[AgentManagement] Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

/**
 * PUT /api/agent-management/users/:id/status
 * 更新用戶狀態 (鎖定/禁用等)
 */
router.put('/users/:id/status', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const id = req.params.id as string;
    const { isLocked, isFullDisabled, isReadonly, status } = req.body;

    // Verify permission (can only manage direct downline)
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.role !== 'admin' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Can only manage direct downline' });
    }

    const updateData: any = {};
    if (isLocked !== undefined) updateData.isLocked = isLocked;
    if (isFullDisabled !== undefined) updateData.isFullDisabled = isFullDisabled;
    if (isReadonly !== undefined) updateData.isReadonly = isReadonly;
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.user.update({
      where: { id },
      data: updateData
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_user_status',
        targetType: 'user',
        targetId: id,
        details: updateData,
        ipAddress: req.ip || 'unknown'
      }
    });

    res.json({
      id: updated.id,
      isLocked: updated.isLocked,
      isFullDisabled: updated.isFullDisabled,
      isReadonly: updated.isReadonly,
      status: updated.status
    });
  } catch (error) {
    console.error('[AgentManagement] Error updating user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

/**
 * GET /api/agent-management/users/:id/share-settings
 * 獲取用戶佔成/退水設定
 */
router.get('/users/:id/share-settings', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const settings = await prisma.agentShareSetting.findMany({
      where: { agentId: id },
      orderBy: [{ gameCategory: 'asc' }, { platform: 'asc' }]
    });

    res.json({
      settings: settings.map(s => ({
        ...s,
        sharePercent: Number(s.sharePercent),
        rebatePercent: Number(s.rebatePercent)
      }))
    });
  } catch (error) {
    console.error('[AgentManagement] Error fetching share settings:', error);
    res.status(500).json({ error: 'Failed to fetch share settings' });
  }
});

/**
 * PUT /api/agent-management/users/:id/share-settings
 * 更新用戶佔成/退水設定
 */
router.put('/users/:id/share-settings', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const id = req.params.id as string;
    const { settings } = req.body;

    // Verify permission
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.role !== 'admin' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Can only manage direct downline' });
    }

    // Update or create settings
    for (const setting of settings) {
      const existing = await prisma.agentShareSetting.findUnique({
        where: {
          agentId_gameCategory_platform: {
            agentId: id,
            gameCategory: setting.gameCategory,
            platform: setting.platform
          }
        }
      });

      if (existing) {
        // Log history
        if (existing.sharePercent !== setting.sharePercent) {
          await prisma.shareSettingHistory.create({
            data: {
              agentId: id,
              operatorId: currentUser.userId,
              changeType: 'share',
              oldValue: existing.sharePercent,
              newValue: setting.sharePercent,
              gameCategory: setting.gameCategory,
              platform: setting.platform
            }
          });
        }
        if (existing.rebatePercent !== setting.rebatePercent) {
          await prisma.shareSettingHistory.create({
            data: {
              agentId: id,
              operatorId: currentUser.userId,
              changeType: 'rebate',
              oldValue: existing.rebatePercent,
              newValue: setting.rebatePercent,
              gameCategory: setting.gameCategory,
              platform: setting.platform
            }
          });
        }

        // Update existing
        await prisma.agentShareSetting.update({
          where: { id: existing.id },
          data: {
            sharePercent: setting.sharePercent,
            rebatePercent: setting.rebatePercent,
            enabled: setting.enabled !== false
          }
        });
      } else {
        // Create new
        await prisma.agentShareSetting.create({
          data: {
            agentId: id,
            gameCategory: setting.gameCategory,
            platform: setting.platform,
            sharePercent: setting.sharePercent || 0,
            rebatePercent: setting.rebatePercent || 0,
            enabled: setting.enabled !== false
          }
        });
      }
    }

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_share_settings',
        targetType: 'user',
        targetId: id,
        details: { settingsCount: settings.length },
        ipAddress: req.ip || 'unknown'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[AgentManagement] Error updating share settings:', error);
    res.status(500).json({ error: 'Failed to update share settings' });
  }
});

/**
 * GET /api/agent-management/users/:id/share-history
 * 獲取用戶佔成/退水變更歷史
 */
router.get('/users/:id/share-history', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { page = '1', limit = '20' } = req.query;

    const [history, total] = await Promise.all([
      prisma.shareSettingHistory.findMany({
        where: { agentId: id },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string)
      }),
      prisma.shareSettingHistory.count({ where: { agentId: id } })
    ]);

    // Get operator info for each history record
    const historyWithOperators = await Promise.all(
      history.map(async (h) => {
        const operator = await prisma.user.findUnique({
          where: { id: h.operatorId },
          select: { username: true, nickname: true }
        });
        return {
          ...h,
          oldValue: Number(h.oldValue),
          newValue: Number(h.newValue),
          operatorUsername: operator?.username,
          operatorNickname: operator?.nickname
        };
      })
    );

    res.json({
      history: historyWithOperators,
      total,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      totalPages: Math.ceil(total / parseInt(limit as string))
    });
  } catch (error) {
    console.error('[AgentManagement] Error fetching share history:', error);
    res.status(500).json({ error: 'Failed to fetch share history' });
  }
});

/**
 * GET /api/agent-management/users/:id/bet-limits
 * 獲取用戶限紅設定
 */
router.get('/users/:id/bet-limits', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const limits = await prisma.agentBetLimit.findMany({
      where: { agentId: id },
      orderBy: { limitRange: 'asc' }
    });

    res.json({ limits });
  } catch (error) {
    console.error('[AgentManagement] Error fetching bet limits:', error);
    res.status(500).json({ error: 'Failed to fetch bet limits' });
  }
});

/**
 * PUT /api/agent-management/users/:id/bet-limits
 * 更新用戶限紅設定
 */
router.put('/users/:id/bet-limits', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const id = req.params.id as string;
    const { limits } = req.body;

    // Delete existing and recreate
    await prisma.agentBetLimit.deleteMany({ where: { agentId: id } });

    if (limits.length > 0) {
      await prisma.agentBetLimit.createMany({
        data: limits.map((l: any) => ({
          agentId: id,
          limitRange: l.limitRange,
          enabled: l.enabled !== false
        }))
      });
    }

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'update_bet_limits',
        targetType: 'user',
        targetId: id,
        details: { limits },
        ipAddress: req.ip || 'unknown'
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[AgentManagement] Error updating bet limits:', error);
    res.status(500).json({ error: 'Failed to update bet limits' });
  }
});

/**
 * POST /api/agent-management/users/:id/withdraw-all
 * 抽取全線額度
 */
router.post('/users/:id/withdraw-all', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const id = req.params.id as string;

    // Get target user
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.role !== 'admin' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Can only manage direct downline' });
    }

    const amountToWithdraw = Number(targetUser.balance);
    if (amountToWithdraw <= 0) {
      return res.status(400).json({ error: 'No balance to withdraw' });
    }

    // Get current user balance
    const operator = await prisma.user.findUnique({ where: { id: currentUser.userId } });
    if (!operator) {
      return res.status(500).json({ error: 'Operator not found' });
    }

    // Perform withdrawal
    const [updatedTarget, updatedOperator] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { balance: 0 }
      }),
      prisma.user.update({
        where: { id: currentUser.userId },
        data: { balance: { increment: amountToWithdraw } }
      }),
      prisma.transaction.create({
        data: {
          userId: id,
          operatorId: currentUser.userId,
          type: 'withdraw',
          amount: amountToWithdraw,
          balanceBefore: amountToWithdraw,
          balanceAfter: 0,
          note: 'Withdraw all by parent agent'
        }
      }),
      prisma.transaction.create({
        data: {
          userId: currentUser.userId,
          operatorId: currentUser.userId,
          type: 'deposit',
          amount: amountToWithdraw,
          balanceBefore: Number(operator.balance),
          balanceAfter: Number(operator.balance) + amountToWithdraw,
          note: `Received from ${targetUser.username}`
        }
      })
    ]);

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'withdraw_all',
        targetType: 'user',
        targetId: id,
        details: { amount: amountToWithdraw },
        ipAddress: req.ip || 'unknown'
      }
    });

    res.json({
      success: true,
      amountWithdrawn: amountToWithdraw
    });
  } catch (error) {
    console.error('[AgentManagement] Error withdrawing all:', error);
    res.status(500).json({ error: 'Failed to withdraw all' });
  }
});

/**
 * POST /api/agent-management/users/:id/balance
 * 調整用戶額度 (存入/提取)
 */
router.post('/users/:id/balance', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const id = req.params.id as string;
    const { type, amount, note } = req.body;

    if (!type || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Type and positive amount are required' });
    }

    if (type !== 'deposit' && type !== 'withdraw') {
      return res.status(400).json({ error: 'Type must be deposit or withdraw' });
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify permission (can only manage direct downline)
    if (currentUser.role !== 'admin' && targetUser.parentAgentId !== currentUser.userId) {
      return res.status(403).json({ error: 'Can only manage direct downline' });
    }

    // Get operator
    const operator = await prisma.user.findUnique({ where: { id: currentUser.userId } });
    if (!operator) {
      return res.status(500).json({ error: 'Operator not found' });
    }

    const targetBalanceBefore = Number(targetUser.balance);
    const operatorBalanceBefore = Number(operator.balance);

    if (type === 'deposit') {
      // Check if operator has enough balance
      if (operatorBalanceBefore < amount) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Transfer from operator to target
      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: { balance: { increment: amount } }
        }),
        prisma.user.update({
          where: { id: currentUser.userId },
          data: { balance: { decrement: amount } }
        }),
        prisma.transaction.create({
          data: {
            userId: id,
            operatorId: currentUser.userId,
            type: 'deposit',
            amount: amount,
            balanceBefore: targetBalanceBefore,
            balanceAfter: targetBalanceBefore + amount,
            note: note || 'Deposit by agent'
          }
        }),
        prisma.transaction.create({
          data: {
            userId: currentUser.userId,
            operatorId: currentUser.userId,
            type: 'withdraw',
            amount: amount,
            balanceBefore: operatorBalanceBefore,
            balanceAfter: operatorBalanceBefore - amount,
            note: `Transfer to ${targetUser.username}`
          }
        })
      ]);
    } else {
      // Withdraw: check if target has enough balance
      if (targetBalanceBefore < amount) {
        return res.status(400).json({ error: 'Target has insufficient balance' });
      }

      // Transfer from target to operator
      await prisma.$transaction([
        prisma.user.update({
          where: { id },
          data: { balance: { decrement: amount } }
        }),
        prisma.user.update({
          where: { id: currentUser.userId },
          data: { balance: { increment: amount } }
        }),
        prisma.transaction.create({
          data: {
            userId: id,
            operatorId: currentUser.userId,
            type: 'withdraw',
            amount: amount,
            balanceBefore: targetBalanceBefore,
            balanceAfter: targetBalanceBefore - amount,
            note: note || 'Withdraw by agent'
          }
        }),
        prisma.transaction.create({
          data: {
            userId: currentUser.userId,
            operatorId: currentUser.userId,
            type: 'deposit',
            amount: amount,
            balanceBefore: operatorBalanceBefore,
            balanceAfter: operatorBalanceBefore + amount,
            note: `Received from ${targetUser.username}`
          }
        })
      ]);
    }

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: type === 'deposit' ? 'deposit_to_user' : 'withdraw_from_user',
        targetType: 'user',
        targetId: id,
        details: { type, amount, note },
        ipAddress: req.ip || 'unknown'
      }
    });

    res.json({ success: true, type, amount });
  } catch (error) {
    console.error('[AgentManagement] Error adjusting balance:', error);
    res.status(500).json({ error: 'Failed to adjust balance' });
  }
});

/**
 * GET /api/agent-management/sub-accounts
 * 獲取子帳號列表
 */
router.get('/sub-accounts', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;

    const subAccounts = await prisma.subAccount.findMany({
      where: { parentId: currentUser.userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ subAccounts });
  } catch (error) {
    console.error('[AgentManagement] Error fetching sub-accounts:', error);
    res.status(500).json({ error: 'Failed to fetch sub-accounts' });
  }
});

/**
 * POST /api/agent-management/sub-accounts
 * 創建子帳號
 */
router.post('/sub-accounts', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const { username, password, nickname, permissions } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Check if username exists
    const existingSubAccount = await prisma.subAccount.findUnique({ where: { username } });
    if (existingSubAccount) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const subAccount = await prisma.subAccount.create({
      data: {
        parentId: currentUser.userId,
        username,
        password: passwordHash,
        nickname,
        permissions
      }
    });

    res.status(201).json({
      id: subAccount.id,
      username: subAccount.username,
      nickname: subAccount.nickname,
      permissions: subAccount.permissions
    });
  } catch (error) {
    console.error('[AgentManagement] Error creating sub-account:', error);
    res.status(500).json({ error: 'Failed to create sub-account' });
  }
});

/**
 * PUT /api/agent-management/sub-accounts/:id
 * 更新子帳號
 */
router.put('/sub-accounts/:id', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const id = req.params.id as string;
    const { password, nickname, permissions, status } = req.body;

    // Verify ownership
    const subAccount = await prisma.subAccount.findUnique({ where: { id } });
    if (!subAccount || subAccount.parentId !== currentUser.userId) {
      return res.status(404).json({ error: 'Sub-account not found' });
    }

    const updateData: any = {};
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (nickname !== undefined) {
      updateData.nickname = nickname;
    }
    if (permissions !== undefined) {
      updateData.permissions = permissions;
    }
    if (status !== undefined) {
      updateData.status = status;
    }

    const updated = await prisma.subAccount.update({
      where: { id },
      data: updateData
    });

    res.json({
      id: updated.id,
      username: updated.username,
      nickname: updated.nickname,
      permissions: updated.permissions,
      status: updated.status
    });
  } catch (error) {
    console.error('[AgentManagement] Error updating sub-account:', error);
    res.status(500).json({ error: 'Failed to update sub-account' });
  }
});

/**
 * DELETE /api/agent-management/sub-accounts/:id
 * 刪除子帳號
 */
router.delete('/sub-accounts/:id', requireRole('admin', 'agent'), async (req: Request, res: Response) => {
  try {
    const currentUser = req.user!;
    const id = req.params.id as string;

    // Verify ownership
    const subAccount = await prisma.subAccount.findUnique({ where: { id } });
    if (!subAccount || subAccount.parentId !== currentUser.userId) {
      return res.status(404).json({ error: 'Sub-account not found' });
    }

    await prisma.subAccount.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('[AgentManagement] Error deleting sub-account:', error);
    res.status(500).json({ error: 'Failed to delete sub-account' });
  }
});

/**
 * GET /api/agent-management/platforms
 * 獲取遊戲平台列表
 */
router.get('/platforms', async (req: Request, res: Response) => {
  try {
    let platforms = await prisma.gamePlatform.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
    });

    // If no platforms exist, seed default ones
    if (platforms.length === 0) {
      const defaultPlatforms = [
        // 電子
        { category: '電子', platformCode: 'EVOPLAY', platformName: 'EVOPLAY' },
        { category: '電子', platformCode: 'GALAXSYS', platformName: 'GALAXSYS' },
        { category: '電子', platformCode: 'GB', platformName: 'GB' },
        { category: '電子', platformCode: '9Game', platformName: '9Game' },
        { category: '電子', platformCode: 'PANDA', platformName: 'PANDA' },
        { category: '電子', platformCode: 'RSG', platformName: 'RSG' },
        { category: '電子', platformCode: 'Slotmill', platformName: 'Slotmill' },
        // 真人百家2館
        { category: '真人百家2館', platformCode: '卡利真人', platformName: '卡利真人' },
        { category: '真人百家2館', platformCode: 'DG真人', platformName: 'DG真人' },
        { category: '真人百家2館', platformCode: 'EEAI', platformName: 'EEAI' },
        // 真人百家1館
        { category: '真人百家1館', platformCode: 'MT真人', platformName: 'MT真人' },
        { category: '真人百家1館', platformCode: 'RC真人', platformName: 'RC真人' },
        { category: '真人百家1館', platformCode: 'T9真人', platformName: 'T9真人' },
        { category: '真人百家1館', platformCode: '華利高真人電投', platformName: '華利高真人電投' },
        // 體育
        { category: '體育', platformCode: 'SUPER體育', platformName: 'SUPER體育' },
      ];

      await prisma.gamePlatform.createMany({
        data: defaultPlatforms.map((p, i) => ({ ...p, sortOrder: i }))
      });

      platforms = await prisma.gamePlatform.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }]
      });
    }

    // Group by category
    const grouped: Record<string, typeof platforms> = {};
    for (const p of platforms) {
      if (!grouped[p.category]) {
        grouped[p.category] = [];
      }
      grouped[p.category].push(p);
    }

    res.json({ platforms: grouped });
  } catch (error) {
    console.error('[AgentManagement] Error fetching platforms:', error);
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

export default router;
