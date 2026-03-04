import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';
import { BetType } from '@prisma/client';

const router = Router();

// 輔助函數
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min) * 100;
}

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const VALUES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

function randomCard() {
  return { suit: randomPick([...SUITS]), value: randomPick([...VALUES]) };
}

function getCardPoint(value: string): number {
  if (['10', 'J', 'Q', 'K'].includes(value)) return 0;
  if (value === 'A') return 1;
  return parseInt(value);
}

function calculateBaccaratPoints(cards: { suit: string; value: string }[]): number {
  return cards.reduce((sum, card) => sum + getCardPoint(card.value), 0) % 10;
}

/**
 * POST /api/seed/test-data
 * 創建完整測試數據（需要 secret key）
 */
router.post('/test-data', async (req: Request, res: Response) => {
  const { secret } = req.body;

  // 簡單的安全檢查
  if (secret !== 'create-test-data-2024') {
    return res.status(403).json({ error: 'Invalid secret' });
  }

  try {
    console.log('🌱 開始創建測試數據...');

    const admin = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!admin) {
      return res.status(400).json({ error: '找不到管理員帳號' });
    }

    const passwordHash = await bcrypt.hash('123456', 10);

    // 清除舊測試數據
    await prisma.bet.deleteMany({});
    await prisma.gameRound.deleteMany({});
    await prisma.dragonTigerRound.deleteMany({});
    await prisma.bullBullRound.deleteMany({});
    await prisma.user.deleteMany({
      where: {
        AND: [
          { role: { not: 'admin' } },
          { username: { notIn: ['agent001', 'member001'] } }
        ]
      }
    });

    // 創建代理結構
    const agent_north = await prisma.user.create({
      data: {
        username: 'agent_north', passwordHash, nickname: '北區總代', role: 'agent',
        parentAgentId: admin.id, agentLevel: 1, sharePercent: 25, rebatePercent: 0.8,
        balance: 500000, inviteCode: 'NORTH01',
      }
    });

    const agent_south = await prisma.user.create({
      data: {
        username: 'agent_south', passwordHash, nickname: '南區總代', role: 'agent',
        parentAgentId: admin.id, agentLevel: 1, sharePercent: 22, rebatePercent: 0.7,
        balance: 400000, inviteCode: 'SOUTH01',
      }
    });

    const agent_vip = await prisma.user.create({
      data: {
        username: 'agent_vip', passwordHash, nickname: 'VIP專線', role: 'agent',
        parentAgentId: admin.id, agentLevel: 1, sharePercent: 30, rebatePercent: 1.0,
        balance: 1000000, inviteCode: 'VIP0001',
      }
    });

    // 二級代理
    const agent_north_a = await prisma.user.create({
      data: {
        username: 'agent_north_a', passwordHash, nickname: '北區A組', role: 'agent',
        parentAgentId: agent_north.id, agentLevel: 2, sharePercent: 18, rebatePercent: 0.6,
        balance: 100000, inviteCode: 'NORTHA1',
      }
    });

    const agent_south_a = await prisma.user.create({
      data: {
        username: 'agent_south_a', passwordHash, nickname: '南區A組', role: 'agent',
        parentAgentId: agent_south.id, agentLevel: 2, sharePercent: 15, rebatePercent: 0.5,
        balance: 70000, inviteCode: 'SOUTHA1',
      }
    });

    const agent_vip_gold = await prisma.user.create({
      data: {
        username: 'agent_vip_gold', passwordHash, nickname: 'VIP金牌', role: 'agent',
        parentAgentId: agent_vip.id, agentLevel: 2, sharePercent: 20, rebatePercent: 0.8,
        balance: 200000, inviteCode: 'VIPGLD1',
      }
    });

    // 三級代理
    const agent_north_a1 = await prisma.user.create({
      data: {
        username: 'agent_north_a1', passwordHash, nickname: '北A-台北', role: 'agent',
        parentAgentId: agent_north_a.id, agentLevel: 3, sharePercent: 12, rebatePercent: 0.4,
        balance: 30000, inviteCode: 'NA1TPE1',
      }
    });

    const agent_south_a1 = await prisma.user.create({
      data: {
        username: 'agent_south_a1', passwordHash, nickname: '南A-高雄', role: 'agent',
        parentAgentId: agent_south_a.id, agentLevel: 3, sharePercent: 10, rebatePercent: 0.3,
        balance: 20000, inviteCode: 'SA1KHH1',
      }
    });

    const agent_vip_gold1 = await prisma.user.create({
      data: {
        username: 'agent_vip_gold1', passwordHash, nickname: 'VIP金-精英', role: 'agent',
        parentAgentId: agent_vip_gold.id, agentLevel: 3, sharePercent: 15, rebatePercent: 0.6,
        balance: 50000, inviteCode: 'VGELT1',
      }
    });

    // 四級代理
    const agent_tpe_xinyi = await prisma.user.create({
      data: {
        username: 'agent_tpe_xinyi', passwordHash, nickname: '台北信義', role: 'agent',
        parentAgentId: agent_north_a1.id, agentLevel: 4, sharePercent: 8, rebatePercent: 0.2,
        balance: 10000, inviteCode: 'TPEXY01',
      }
    });

    // 創建會員
    const allMembers: any[] = [];
    const agents = [
      { agent: agent_north, prefix: 'north', count: 3, min: 50000, max: 200000 },
      { agent: agent_south, prefix: 'south', count: 2, min: 40000, max: 150000 },
      { agent: agent_vip, prefix: 'vip', count: 4, min: 100000, max: 500000 },
      { agent: agent_north_a, prefix: 'na', count: 3, min: 20000, max: 80000 },
      { agent: agent_south_a, prefix: 'sa', count: 3, min: 18000, max: 70000 },
      { agent: agent_vip_gold, prefix: 'vg', count: 4, min: 50000, max: 200000 },
      { agent: agent_north_a1, prefix: 'na1', count: 4, min: 10000, max: 50000 },
      { agent: agent_south_a1, prefix: 'sa1', count: 4, min: 10000, max: 50000 },
      { agent: agent_vip_gold1, prefix: 'vg1', count: 5, min: 30000, max: 150000 },
      { agent: agent_tpe_xinyi, prefix: 'xy', count: 3, min: 5000, max: 30000 },
    ];

    for (const { agent, prefix, count, min, max } of agents) {
      for (let i = 1; i <= count; i++) {
        const member = await prisma.user.create({
          data: {
            username: `${prefix}_m${i}`, passwordHash, nickname: `${agent.nickname}會員${i}`,
            role: 'member', parentAgentId: agent.id, agentLevel: 5,
            balance: randomAmount(min, max),
          }
        });
        allMembers.push(member);
      }
    }

    // 創建遊戲回合
    const today = new Date();
    const rounds: { type: string; round: any }[] = [];

    for (let day = 6; day >= 0; day--) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      date.setHours(12, 0, 0, 0);
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

      // 百家樂
      for (let i = 1; i <= 10; i++) {
        const playerCards = [randomCard(), randomCard()];
        const bankerCards = [randomCard(), randomCard()];
        const playerPoints = calculateBaccaratPoints(playerCards);
        const bankerPoints = calculateBaccaratPoints(bankerCards);

        let result: 'player' | 'banker' | 'tie';
        if (playerPoints > bankerPoints) result = 'player';
        else if (bankerPoints > playerPoints) result = 'banker';
        else result = 'tie';

        const round = await prisma.gameRound.create({
          data: {
            roundNumber: `${dateStr}${String(i).padStart(3, '0')}`,
            shoeNumber: Math.ceil(i / 8), playerCards, bankerCards,
            playerPoints, bankerPoints, result,
            playerPair: playerCards[0].value === playerCards[1].value,
            bankerPair: bankerCards[0].value === bankerCards[1].value,
            createdAt: date,
          }
        });
        rounds.push({ type: 'baccarat', round });
      }

      // 龍虎
      for (let i = 1; i <= 6; i++) {
        const dragonCard = randomCard();
        const tigerCard = randomCard();
        const dragonValue = VALUES.indexOf(dragonCard.value) + 1;
        const tigerValue = VALUES.indexOf(tigerCard.value) + 1;

        let result: 'dragon' | 'tiger' | 'dt_tie';
        if (dragonValue > tigerValue) result = 'dragon';
        else if (tigerValue > dragonValue) result = 'tiger';
        else result = 'dt_tie';

        const round = await prisma.dragonTigerRound.create({
          data: {
            roundNumber: `DT${dateStr}${String(i).padStart(3, '0')}`,
            shoeNumber: 1, dragonCard, tigerCard, dragonValue, tigerValue, result,
            isSuitedTie: result === 'dt_tie' && dragonCard.suit === tigerCard.suit,
            createdAt: date,
          }
        });
        rounds.push({ type: 'dragonTiger', round });
      }
    }

    // 創建投注
    const BACCARAT_BET_TYPES: BetType[] = [BetType.player, BetType.banker, BetType.tie];
    const DT_BET_TYPES: BetType[] = [BetType.dragon, BetType.tiger, BetType.dt_tie];

    let totalBets = 0;

    for (const member of allMembers) {
      const betCount = Math.floor(Math.random() * 12) + 5;

      for (let i = 0; i < betCount; i++) {
        const { type, round } = randomPick(rounds);
        const amount = randomAmount(100, 3000);

        let betType: BetType;
        let status: 'won' | 'lost' | 'refunded' = 'lost';
        let payout: number | null = null;

        if (type === 'baccarat') {
          betType = randomPick(BACCARAT_BET_TYPES);
          const result = round.result;

          if (result === 'tie' && (betType === BetType.player || betType === BetType.banker)) {
            status = 'refunded';
            payout = amount;
          } else if (
            (result === 'player' && betType === BetType.player) ||
            (result === 'banker' && betType === BetType.banker) ||
            (result === 'tie' && betType === BetType.tie)
          ) {
            status = 'won';
            payout = betType === BetType.tie ? amount * 9 : betType === BetType.banker ? amount * 1.95 : amount * 2;
          }

          await prisma.bet.create({
            data: { userId: member.id, roundId: round.id, betType, amount, payout, status, createdAt: round.createdAt }
          });
        } else {
          betType = randomPick(DT_BET_TYPES);
          const result = round.result;

          if (
            (result === 'dragon' && betType === BetType.dragon) ||
            (result === 'tiger' && betType === BetType.tiger) ||
            (result === 'dt_tie' && betType === BetType.dt_tie)
          ) {
            status = 'won';
            payout = betType === BetType.dt_tie ? amount * 9 : amount * 2;
          } else if (result === 'dt_tie' && (betType === BetType.dragon || betType === BetType.tiger)) {
            status = 'refunded';
            payout = amount * 0.5;
          }

          await prisma.bet.create({
            data: { userId: member.id, dragonTigerRoundId: round.id, betType, amount, payout, status, createdAt: round.createdAt }
          });
        }

        totalBets++;
      }
    }

    console.log('✅ 測試數據創建完成');

    res.json({
      success: true,
      message: '測試數據創建完成',
      stats: {
        agents: 10,
        members: allMembers.length,
        rounds: rounds.length,
        bets: totalBets
      }
    });

  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to create test data', details: String(error) });
  }
});

export default router;
