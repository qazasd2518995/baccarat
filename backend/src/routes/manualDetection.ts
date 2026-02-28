import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';
import type { DetectionScope } from '@prisma/client';

const router = Router();

// All routes require admin role
router.use(authenticate);
router.use(requireRole('admin'));

// ============ 輔助函數 ============

// 計算遊戲日期（7:00 AM Taiwan time 為分界）
function getGameDay(): string {
  const now = new Date();
  const taiwanTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  if (taiwanTime.getHours() < 7) {
    const yesterday = new Date(taiwanTime);
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDate(yesterday);
  }
  return formatDate(taiwanTime);
}

// 獲取遊戲日開始時間
function getGameDayStart(): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(7, 0, 0, 0);
  if (now.getHours() < 7) {
    start.setDate(start.getDate() - 1);
  }
  return start;
}

// 遞歸獲取代理線下所有會員
async function getAgentDownlineMembers(agentId: string): Promise<string[]> {
  const memberIds: string[] = [];

  const directMembers = await prisma.user.findMany({
    where: { parentAgentId: agentId, role: 'member' },
    select: { id: true },
  });
  memberIds.push(...directMembers.map(m => m.id));

  const subAgents = await prisma.user.findMany({
    where: { parentAgentId: agentId, role: 'agent' },
    select: { id: true },
  });

  for (const subAgent of subAgents) {
    const subMembers = await getAgentDownlineMembers(subAgent.id);
    memberIds.push(...subMembers);
  }

  return memberIds;
}

// 計算當前上級交收
async function calculateCurrentSettlement(
  scope: DetectionScope,
  targetAgentId?: string | null,
  targetMemberUsername?: string | null
): Promise<number> {
  const gameDayStart = getGameDayStart();
  let memberIds: string[] = [];

  if (scope === 'all') {
    // 全盤：所有會員
    const allMembers = await prisma.user.findMany({
      where: { role: 'member' },
      select: { id: true },
    });
    memberIds = allMembers.map(m => m.id);
  } else if (scope === 'agent_line' && targetAgentId) {
    // 代理線：遞歸獲取下級會員
    memberIds = await getAgentDownlineMembers(targetAgentId);
  } else if (scope === 'member' && targetMemberUsername) {
    // 單一會員
    const member = await prisma.user.findUnique({
      where: { username: targetMemberUsername },
      select: { id: true },
    });
    if (member) {
      memberIds = [member.id];
    }
  }

  if (memberIds.length === 0) {
    return 0;
  }

  const bets = await prisma.bet.aggregate({
    where: {
      userId: { in: memberIds },
      createdAt: { gte: gameDayStart },
      status: { in: ['won', 'lost'] },
    },
    _sum: { payout: true, amount: true },
  });

  const totalBet = Number(bets._sum.amount || 0);
  const totalPayout = Number(bets._sum.payout || 0);
  const memberWinLoss = totalPayout - totalBet;
  const rebatePercent = 0.041;
  const totalRebate = totalBet * rebatePercent;
  const superiorSettlement = memberWinLoss + totalRebate;

  return superiorSettlement;
}

// ============ API 路由 ============

// 獲取會員列表（用於下拉選擇）
router.get('/members', async (req, res) => {
  try {
    const { search } = req.query;

    const where: any = { role: 'member' };
    if (search) {
      where.username = { contains: String(search), mode: 'insensitive' };
    }

    const members = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        nickname: true,
        balance: true,
        parentAgent: {
          select: { username: true },
        },
      },
      take: 100,
      orderBy: { username: 'asc' },
    });

    res.json({
      success: true,
      data: members,
      total: members.length,
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 獲取代理列表（用於下拉選擇）
router.get('/agents', async (req, res) => {
  try {
    const { search } = req.query;

    const where: any = { role: 'agent' };
    if (search) {
      where.username = { contains: String(search), mode: 'insensitive' };
    }

    const agents = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        nickname: true,
        agentLevel: true,
        parentAgent: {
          select: { username: true },
        },
      },
      orderBy: [{ agentLevel: 'asc' }, { username: 'asc' }],
    });

    res.json({
      success: true,
      data: agents,
      total: agents.length,
    });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 獲取即時上級交收
router.get('/settlement', async (req, res) => {
  try {
    const { scope = 'all', agent_id, member_username } = req.query;

    const currentSettlement = await calculateCurrentSettlement(
      scope as DetectionScope,
      agent_id as string,
      member_username as string
    );

    const gameDay = getGameDay();

    res.json({
      success: true,
      data: {
        gameDay,
        scope,
        agentId: agent_id || null,
        memberUsername: member_username || null,
        superiorSettlement: currentSettlement,
        status: currentSettlement > 0 ? 'green' : 'red',
        statusText: currentSettlement > 0 ? '綠色(平台虧損)' : '紅色(平台盈利)',
      },
    });
  } catch (error) {
    console.error('Get settlement error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 啟用手動偵測控制
const activateControlSchema = z.object({
  scope: z.enum(['all', 'agent_line', 'member']),
  targetAgentId: z.string().optional(),
  targetAgentUsername: z.string().optional(),
  targetMemberUsername: z.string().optional(),
  targetSettlement: z.number(),
  controlPercentage: z.number().min(1).max(100),
});

router.post('/activate', async (req, res) => {
  try {
    const data = activateControlSchema.parse(req.body);
    const currentUser = req.user!;

    // 驗證參數
    if (data.scope === 'agent_line' && !data.targetAgentId) {
      return res.status(400).json({ success: false, error: '代理線控制必須指定目標代理' });
    }

    if (data.scope === 'member' && !data.targetMemberUsername) {
      return res.status(400).json({ success: false, error: '會員控制必須指定目標會員' });
    }

    // 計算當前交收作為起始交收
    const currentSettlement = await calculateCurrentSettlement(
      data.scope as DetectionScope,
      data.targetAgentId,
      data.targetMemberUsername
    );

    // 檢查是否有同樣範圍的控制已存在
    let existingControl;
    if (data.scope === 'all') {
      existingControl = await prisma.manualDetectionControl.findFirst({
        where: { scope: 'all', isActive: true },
      });
    } else if (data.scope === 'agent_line') {
      existingControl = await prisma.manualDetectionControl.findFirst({
        where: { scope: 'agent_line', targetAgentId: data.targetAgentId, isActive: true },
      });
    } else if (data.scope === 'member') {
      existingControl = await prisma.manualDetectionControl.findFirst({
        where: { scope: 'member', targetMemberUsername: data.targetMemberUsername, isActive: true },
      });
    }

    let newControl;

    if (existingControl) {
      // 更新現有控制
      newControl = await prisma.manualDetectionControl.update({
        where: { id: existingControl.id },
        data: {
          targetSettlement: data.targetSettlement,
          controlPercentage: data.controlPercentage,
          operatorId: currentUser.userId,
          operatorUsername: currentUser.username,
          startSettlement: currentSettlement,
          isCompleted: false,
          completedAt: null,
          completionSettlement: null,
        },
      });
    } else {
      // 創建新的控制設定
      newControl = await prisma.manualDetectionControl.create({
        data: {
          scope: data.scope as DetectionScope,
          targetAgentId: data.scope === 'agent_line' ? data.targetAgentId : null,
          targetAgentUsername: data.scope === 'agent_line' ? data.targetAgentUsername : null,
          targetMemberUsername: data.scope === 'member' ? data.targetMemberUsername : null,
          targetSettlement: data.targetSettlement,
          controlPercentage: data.controlPercentage,
          startSettlement: currentSettlement,
          isActive: true,
          isCompleted: false,
          operatorId: currentUser.userId,
          operatorUsername: currentUser.username,
        },
      });
    }

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'activate_manual_detection',
        targetType: 'manual_detection',
        targetId: newControl.id,
        details: {
          scope: data.scope,
          targetAgentId: data.targetAgentId,
          targetMemberUsername: data.targetMemberUsername,
          targetSettlement: data.targetSettlement,
          controlPercentage: data.controlPercentage,
          startSettlement: currentSettlement,
        },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({
      success: true,
      message: '手動偵測控制已啟用',
      data: newControl,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Invalid input', details: error.errors });
    }
    console.error('Activate control error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 停用手動偵測控制
router.post('/deactivate', async (req, res) => {
  try {
    const { id } = req.body;
    const currentUser = req.user!;

    if (id) {
      // 停用指定ID的控制
      await prisma.manualDetectionControl.update({
        where: { id },
        data: { isActive: false },
      });
    } else {
      // 停用所有活動的控制
      await prisma.manualDetectionControl.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'deactivate_manual_detection',
        targetType: 'manual_detection',
        targetId: id || 'all',
        details: { id: id || 'all' },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ success: true, message: '手動偵測控制已停用' });
  } catch (error) {
    console.error('Deactivate control error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 重新啟用指定控制
router.post('/reactivate/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const record = await prisma.manualDetectionControl.findUnique({
      where: { id },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '找不到指定的控制記錄' });
    }

    if (record.isActive) {
      return res.json({ success: true, message: '此控制已經是啟用狀態' });
    }

    // 檢查是否有同範圍的控制已啟用
    if (record.scope === 'all') {
      const existingAll = await prisma.manualDetectionControl.findFirst({
        where: { scope: 'all', isActive: true },
      });
      if (existingAll) {
        return res.status(400).json({ success: false, error: '已有啟用中的全盤控制，請先停用' });
      }
    } else if (record.scope === 'agent_line') {
      const existingAgent = await prisma.manualDetectionControl.findFirst({
        where: { scope: 'agent_line', targetAgentId: record.targetAgentId, isActive: true },
      });
      if (existingAgent) {
        return res.status(400).json({ success: false, error: `代理線 ${record.targetAgentUsername} 已有啟用中的控制，請先停用` });
      }
    }

    // 重新啟用
    await prisma.manualDetectionControl.update({
      where: { id },
      data: {
        isActive: true,
        isCompleted: false,
        completedAt: null,
        completionSettlement: null,
      },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'reactivate_manual_detection',
        targetType: 'manual_detection',
        targetId: id,
        details: { scope: record.scope },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ success: true, message: '手動偵測控制已重新啟用' });
  } catch (error) {
    console.error('Reactivate control error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 獲取當前控制狀態（活動的控制列表）
router.get('/status', async (req, res) => {
  try {
    const activeControls = await prisma.manualDetectionControl.findMany({
      where: { isActive: true },
      orderBy: [
        { scope: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // 為每個活動控制計算當前交收
    const controlsWithSettlement = await Promise.all(
      activeControls.map(async (control) => {
        const currentSettlement = await calculateCurrentSettlement(
          control.scope,
          control.targetAgentId,
          control.targetMemberUsername
        );
        return {
          ...control,
          currentSettlement,
          progress: control.targetSettlement
            ? ((Number(control.startSettlement) - currentSettlement) / (Number(control.startSettlement) - Number(control.targetSettlement))) * 100
            : 0,
        };
      })
    );

    res.json({
      success: true,
      data: controlsWithSettlement,
      isActive: controlsWithSettlement.length > 0,
      totalActive: controlsWithSettlement.length,
    });
  } catch (error) {
    console.error('Get control status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 獲取歷史記錄
router.get('/history', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [history, total] = await Promise.all([
      prisma.manualDetectionControl.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.manualDetectionControl.count(),
    ]);

    // 為活動的控制計算即時交收
    const historyWithSettlement = await Promise.all(
      history.map(async (record) => {
        if (record.isActive) {
          const currentSettlement = await calculateCurrentSettlement(
            record.scope,
            record.targetAgentId,
            record.targetMemberUsername
          );
          return { ...record, currentSettlement };
        }
        return record;
      })
    );

    res.json({
      success: true,
      data: historyWithSettlement,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// 刪除記錄
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user!;

    const record = await prisma.manualDetectionControl.findUnique({
      where: { id },
    });

    if (!record) {
      return res.status(404).json({ success: false, error: '找不到指定的控制記錄' });
    }

    await prisma.manualDetectionControl.delete({
      where: { id },
    });

    // Log operation
    await prisma.operationLog.create({
      data: {
        operatorId: currentUser.userId,
        action: 'delete_manual_detection',
        targetType: 'manual_detection',
        targetId: id,
        details: { scope: record.scope, targetAgentId: record.targetAgentId },
        ipAddress: Array.isArray(req.ip) ? req.ip[0] : req.ip,
      },
    });

    res.json({ success: true, message: '記錄已刪除' });
  } catch (error) {
    console.error('Delete record error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
