import { PrismaClient, BetType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// 輔助函數：隨機選擇陣列元素
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 輔助函數：隨機金額 (範圍)
function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min) * 100;
}

// 撲克牌花色和點數
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

async function main() {
  console.log('🌱 開始創建完整測試數據...\n');

  // 找到現有的 admin
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' }
  });

  if (!admin) {
    console.error('❌ 找不到管理員帳號，請先執行 seed.ts');
    return;
  }

  console.log(`✅ 找到管理員: ${admin.username} (ID: ${admin.id})\n`);

  const passwordHash = await bcrypt.hash('123456', 10);

  // ============================================
  // 清除舊的測試數據 (保留 admin 和基礎數據)
  // ============================================
  console.log('🧹 清除舊測試數據...');

  // 先刪除投注記錄
  await prisma.bet.deleteMany({});
  // 刪除遊戲回合
  await prisma.gameRound.deleteMany({});
  await prisma.dragonTigerRound.deleteMany({});
  await prisma.bullBullRound.deleteMany({});
  // 刪除測試用戶 (非 admin 且非原始 agent001/member001)
  await prisma.user.deleteMany({
    where: {
      AND: [
        { role: { not: 'admin' } },
        { username: { notIn: ['agent001', 'member001'] } }
      ]
    }
  });
  console.log('  ✅ 清除完成\n');

  // ============================================
  // 創建完整代理層級結構 (4層)
  // ============================================
  console.log('📦 創建代理層級結構...\n');

  // ========== 第一層代理 (3個) ==========
  console.log('【第1層代理】');

  const agent_north = await prisma.user.create({
    data: {
      username: 'agent_north',
      passwordHash,
      nickname: '北區總代',
      role: 'agent',
      parentAgentId: admin.id,
      agentLevel: 1,
      sharePercent: 25,
      rebatePercent: 0.8,
      balance: 500000,
      inviteCode: 'NORTH01',
    }
  });
  console.log(`  ✅ ${agent_north.nickname} (佔成25%, 退水0.8%)`);

  const agent_south = await prisma.user.create({
    data: {
      username: 'agent_south',
      passwordHash,
      nickname: '南區總代',
      role: 'agent',
      parentAgentId: admin.id,
      agentLevel: 1,
      sharePercent: 22,
      rebatePercent: 0.7,
      balance: 400000,
      inviteCode: 'SOUTH01',
    }
  });
  console.log(`  ✅ ${agent_south.nickname} (佔成22%, 退水0.7%)`);

  const agent_vip = await prisma.user.create({
    data: {
      username: 'agent_vip',
      passwordHash,
      nickname: 'VIP專線',
      role: 'agent',
      parentAgentId: admin.id,
      agentLevel: 1,
      sharePercent: 30,
      rebatePercent: 1.0,
      balance: 1000000,
      inviteCode: 'VIP0001',
    }
  });
  console.log(`  ✅ ${agent_vip.nickname} (佔成30%, 退水1.0%)`);

  // ========== 第二層代理 (6個) ==========
  console.log('\n【第2層代理】');

  // 北區下線
  const agent_north_a = await prisma.user.create({
    data: {
      username: 'agent_north_a',
      passwordHash,
      nickname: '北區A組',
      role: 'agent',
      parentAgentId: agent_north.id,
      agentLevel: 2,
      sharePercent: 18,
      rebatePercent: 0.6,
      balance: 100000,
      inviteCode: 'NORTHA1',
    }
  });
  console.log(`  ✅ ${agent_north_a.nickname} → 北區總代`);

  const agent_north_b = await prisma.user.create({
    data: {
      username: 'agent_north_b',
      passwordHash,
      nickname: '北區B組',
      role: 'agent',
      parentAgentId: agent_north.id,
      agentLevel: 2,
      sharePercent: 16,
      rebatePercent: 0.5,
      balance: 80000,
      inviteCode: 'NORTHB1',
    }
  });
  console.log(`  ✅ ${agent_north_b.nickname} → 北區總代`);

  // 南區下線
  const agent_south_a = await prisma.user.create({
    data: {
      username: 'agent_south_a',
      passwordHash,
      nickname: '南區A組',
      role: 'agent',
      parentAgentId: agent_south.id,
      agentLevel: 2,
      sharePercent: 15,
      rebatePercent: 0.5,
      balance: 70000,
      inviteCode: 'SOUTHA1',
    }
  });
  console.log(`  ✅ ${agent_south_a.nickname} → 南區總代`);

  const agent_south_b = await prisma.user.create({
    data: {
      username: 'agent_south_b',
      passwordHash,
      nickname: '南區B組',
      role: 'agent',
      parentAgentId: agent_south.id,
      agentLevel: 2,
      sharePercent: 14,
      rebatePercent: 0.4,
      balance: 60000,
      inviteCode: 'SOUTHB1',
    }
  });
  console.log(`  ✅ ${agent_south_b.nickname} → 南區總代`);

  // VIP下線
  const agent_vip_gold = await prisma.user.create({
    data: {
      username: 'agent_vip_gold',
      passwordHash,
      nickname: 'VIP金牌',
      role: 'agent',
      parentAgentId: agent_vip.id,
      agentLevel: 2,
      sharePercent: 20,
      rebatePercent: 0.8,
      balance: 200000,
      inviteCode: 'VIPGLD1',
    }
  });
  console.log(`  ✅ ${agent_vip_gold.nickname} → VIP專線`);

  const agent_vip_silver = await prisma.user.create({
    data: {
      username: 'agent_vip_silver',
      passwordHash,
      nickname: 'VIP銀牌',
      role: 'agent',
      parentAgentId: agent_vip.id,
      agentLevel: 2,
      sharePercent: 18,
      rebatePercent: 0.7,
      balance: 150000,
      inviteCode: 'VIPSLV1',
    }
  });
  console.log(`  ✅ ${agent_vip_silver.nickname} → VIP專線`);

  // ========== 第三層代理 (8個) ==========
  console.log('\n【第3層代理】');

  const agent_north_a1 = await prisma.user.create({
    data: {
      username: 'agent_north_a1',
      passwordHash,
      nickname: '北A-台北',
      role: 'agent',
      parentAgentId: agent_north_a.id,
      agentLevel: 3,
      sharePercent: 12,
      rebatePercent: 0.4,
      balance: 30000,
      inviteCode: 'NA1TPE1',
    }
  });
  console.log(`  ✅ ${agent_north_a1.nickname} → 北區A組`);

  const agent_north_a2 = await prisma.user.create({
    data: {
      username: 'agent_north_a2',
      passwordHash,
      nickname: '北A-新北',
      role: 'agent',
      parentAgentId: agent_north_a.id,
      agentLevel: 3,
      sharePercent: 11,
      rebatePercent: 0.35,
      balance: 25000,
      inviteCode: 'NA2NTP1',
    }
  });
  console.log(`  ✅ ${agent_north_a2.nickname} → 北區A組`);

  const agent_north_b1 = await prisma.user.create({
    data: {
      username: 'agent_north_b1',
      passwordHash,
      nickname: '北B-桃園',
      role: 'agent',
      parentAgentId: agent_north_b.id,
      agentLevel: 3,
      sharePercent: 10,
      rebatePercent: 0.3,
      balance: 20000,
      inviteCode: 'NB1TYC1',
    }
  });
  console.log(`  ✅ ${agent_north_b1.nickname} → 北區B組`);

  const agent_south_a1 = await prisma.user.create({
    data: {
      username: 'agent_south_a1',
      passwordHash,
      nickname: '南A-高雄',
      role: 'agent',
      parentAgentId: agent_south_a.id,
      agentLevel: 3,
      sharePercent: 10,
      rebatePercent: 0.3,
      balance: 20000,
      inviteCode: 'SA1KHH1',
    }
  });
  console.log(`  ✅ ${agent_south_a1.nickname} → 南區A組`);

  const agent_south_a2 = await prisma.user.create({
    data: {
      username: 'agent_south_a2',
      passwordHash,
      nickname: '南A-台南',
      role: 'agent',
      parentAgentId: agent_south_a.id,
      agentLevel: 3,
      sharePercent: 9,
      rebatePercent: 0.25,
      balance: 18000,
      inviteCode: 'SA2TNN1',
    }
  });
  console.log(`  ✅ ${agent_south_a2.nickname} → 南區A組`);

  const agent_south_b1 = await prisma.user.create({
    data: {
      username: 'agent_south_b1',
      passwordHash,
      nickname: '南B-屏東',
      role: 'agent',
      parentAgentId: agent_south_b.id,
      agentLevel: 3,
      sharePercent: 8,
      rebatePercent: 0.2,
      balance: 15000,
      inviteCode: 'SB1PIF1',
    }
  });
  console.log(`  ✅ ${agent_south_b1.nickname} → 南區B組`);

  const agent_vip_gold1 = await prisma.user.create({
    data: {
      username: 'agent_vip_gold1',
      passwordHash,
      nickname: 'VIP金-精英',
      role: 'agent',
      parentAgentId: agent_vip_gold.id,
      agentLevel: 3,
      sharePercent: 15,
      rebatePercent: 0.6,
      balance: 50000,
      inviteCode: 'VGELT1',
    }
  });
  console.log(`  ✅ ${agent_vip_gold1.nickname} → VIP金牌`);

  const agent_vip_silver1 = await prisma.user.create({
    data: {
      username: 'agent_vip_silver1',
      passwordHash,
      nickname: 'VIP銀-標準',
      role: 'agent',
      parentAgentId: agent_vip_silver.id,
      agentLevel: 3,
      sharePercent: 12,
      rebatePercent: 0.5,
      balance: 40000,
      inviteCode: 'VSSTD1',
    }
  });
  console.log(`  ✅ ${agent_vip_silver1.nickname} → VIP銀牌`);

  // ========== 第四層代理 (4個) ==========
  console.log('\n【第4層代理】');

  const agent_north_a1_1 = await prisma.user.create({
    data: {
      username: 'agent_tpe_xinyi',
      passwordHash,
      nickname: '台北信義',
      role: 'agent',
      parentAgentId: agent_north_a1.id,
      agentLevel: 4,
      sharePercent: 8,
      rebatePercent: 0.2,
      balance: 10000,
      inviteCode: 'TPEXY01',
    }
  });
  console.log(`  ✅ ${agent_north_a1_1.nickname} → 北A-台北`);

  const agent_north_a1_2 = await prisma.user.create({
    data: {
      username: 'agent_tpe_daan',
      passwordHash,
      nickname: '台北大安',
      role: 'agent',
      parentAgentId: agent_north_a1.id,
      agentLevel: 4,
      sharePercent: 7,
      rebatePercent: 0.15,
      balance: 8000,
      inviteCode: 'TPEDA01',
    }
  });
  console.log(`  ✅ ${agent_north_a1_2.nickname} → 北A-台北`);

  const agent_south_a1_1 = await prisma.user.create({
    data: {
      username: 'agent_khh_sanmin',
      passwordHash,
      nickname: '高雄三民',
      role: 'agent',
      parentAgentId: agent_south_a1.id,
      agentLevel: 4,
      sharePercent: 6,
      rebatePercent: 0.15,
      balance: 8000,
      inviteCode: 'KHHSM01',
    }
  });
  console.log(`  ✅ ${agent_south_a1_1.nickname} → 南A-高雄`);

  const agent_vip_elite = await prisma.user.create({
    data: {
      username: 'agent_vip_elite',
      passwordHash,
      nickname: 'VIP至尊',
      role: 'agent',
      parentAgentId: agent_vip_gold1.id,
      agentLevel: 4,
      sharePercent: 10,
      rebatePercent: 0.4,
      balance: 30000,
      inviteCode: 'VIPELT1',
    }
  });
  console.log(`  ✅ ${agent_vip_elite.nickname} → VIP金-精英`);

  // ============================================
  // 創建會員 (每個代理2-5個會員)
  // ============================================
  console.log('\n👤 創建會員...');

  interface MemberInfo {
    member: any;
    parentNickname: string;
  }

  const allMembers: MemberInfo[] = [];

  async function createMembers(
    agent: any,
    count: number,
    prefix: string,
    balanceMin: number,
    balanceMax: number
  ) {
    const members: MemberInfo[] = [];
    for (let i = 1; i <= count; i++) {
      const member = await prisma.user.create({
        data: {
          username: `${prefix}_m${i}`,
          passwordHash,
          nickname: `${agent.nickname}會員${i}`,
          role: 'member',
          parentAgentId: agent.id,
          agentLevel: 5,
          balance: randomAmount(balanceMin, balanceMax),
        }
      });
      members.push({ member, parentNickname: agent.nickname! });
      allMembers.push({ member, parentNickname: agent.nickname! });
    }
    return members;
  }

  // 為各層代理創建會員
  // 一層代理的直屬會員 (大戶)
  await createMembers(agent_north, 3, 'north', 50000, 200000);
  await createMembers(agent_south, 2, 'south', 40000, 150000);
  await createMembers(agent_vip, 4, 'vip', 100000, 500000);
  console.log('  ✅ 創建一級代理直屬會員');

  // 二層代理會員
  await createMembers(agent_north_a, 3, 'na', 20000, 80000);
  await createMembers(agent_north_b, 2, 'nb', 15000, 60000);
  await createMembers(agent_south_a, 3, 'sa', 18000, 70000);
  await createMembers(agent_south_b, 2, 'sb', 12000, 50000);
  await createMembers(agent_vip_gold, 4, 'vg', 50000, 200000);
  await createMembers(agent_vip_silver, 3, 'vs', 30000, 120000);
  console.log('  ✅ 創建二級代理會員');

  // 三層代理會員
  await createMembers(agent_north_a1, 4, 'na1', 10000, 50000);
  await createMembers(agent_north_a2, 3, 'na2', 8000, 40000);
  await createMembers(agent_north_b1, 2, 'nb1', 6000, 30000);
  await createMembers(agent_south_a1, 4, 'sa1', 10000, 50000);
  await createMembers(agent_south_a2, 3, 'sa2', 8000, 40000);
  await createMembers(agent_south_b1, 2, 'sb1', 5000, 25000);
  await createMembers(agent_vip_gold1, 5, 'vg1', 30000, 150000);
  await createMembers(agent_vip_silver1, 3, 'vs1', 20000, 80000);
  console.log('  ✅ 創建三級代理會員');

  // 四層代理會員
  await createMembers(agent_north_a1_1, 3, 'xy', 5000, 30000);
  await createMembers(agent_north_a1_2, 2, 'da', 4000, 25000);
  await createMembers(agent_south_a1_1, 3, 'sm', 5000, 28000);
  await createMembers(agent_vip_elite, 4, 'elite', 50000, 300000);
  console.log('  ✅ 創建四級代理會員');

  console.log(`\n  📊 總會員數: ${allMembers.length}`);

  // ============================================
  // 創建遊戲回合和投注數據
  // ============================================
  console.log('\n🎰 創建遊戲回合...');

  const today = new Date();
  const rounds: { type: string; round: any }[] = [];

  // 創建過去7天的遊戲回合
  for (let day = 6; day >= 0; day--) {
    const date = new Date(today);
    date.setDate(date.getDate() - day);
    date.setHours(12, 0, 0, 0);
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');

    // 每天創建多個回合
    // 百家樂 15 回合
    for (let i = 1; i <= 15; i++) {
      const playerCards = [randomCard(), randomCard()];
      const bankerCards = [randomCard(), randomCard()];
      const playerPoints = calculateBaccaratPoints(playerCards);
      const bankerPoints = calculateBaccaratPoints(bankerCards);

      // 第三張牌邏輯 (簡化)
      if (playerPoints <= 5 && bankerPoints <= 5) {
        playerCards.push(randomCard());
        bankerCards.push(randomCard());
      }

      const finalPlayerPoints = calculateBaccaratPoints(playerCards);
      const finalBankerPoints = calculateBaccaratPoints(bankerCards);

      let result: 'player' | 'banker' | 'tie';
      if (finalPlayerPoints > finalBankerPoints) result = 'player';
      else if (finalBankerPoints > finalPlayerPoints) result = 'banker';
      else result = 'tie';

      const round = await prisma.gameRound.create({
        data: {
          roundNumber: `${dateStr}${String(i).padStart(3, '0')}`,
          shoeNumber: Math.ceil(i / 8),
          playerCards,
          bankerCards,
          playerPoints: finalPlayerPoints,
          bankerPoints: finalBankerPoints,
          result,
          playerPair: playerCards.length >= 2 && playerCards[0].value === playerCards[1].value,
          bankerPair: bankerCards.length >= 2 && bankerCards[0].value === bankerCards[1].value,
          createdAt: date,
        }
      });
      rounds.push({ type: 'baccarat', round });
    }

    // 龍虎 10 回合
    for (let i = 1; i <= 10; i++) {
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
          shoeNumber: Math.ceil(i / 8),
          dragonCard,
          tigerCard,
          dragonValue,
          tigerValue,
          result,
          isSuitedTie: result === 'dt_tie' && dragonCard.suit === tigerCard.suit,
          createdAt: date,
        }
      });
      rounds.push({ type: 'dragonTiger', round });
    }

    // 牛牛 8 回合
    for (let i = 1; i <= 8; i++) {
      const bankerCards = Array.from({ length: 5 }, randomCard);
      const player1Cards = Array.from({ length: 5 }, randomCard);
      const player2Cards = Array.from({ length: 5 }, randomCard);
      const player3Cards = Array.from({ length: 5 }, randomCard);

      const round = await prisma.bullBullRound.create({
        data: {
          roundNumber: `BB${dateStr}${String(i).padStart(3, '0')}`,
          shoeNumber: Math.ceil(i / 8),
          bankerCards,
          player1Cards,
          player2Cards,
          player3Cards,
          bankerRank: '牛牛',
          player1Rank: '牛七',
          player2Rank: '無牛',
          player3Rank: '牛九',
          player1Result: 'lose',
          player2Result: 'lose',
          player3Result: 'win',
          createdAt: date,
        }
      });
      rounds.push({ type: 'bullBull', round });
    }
  }

  console.log(`  ✅ 創建 ${rounds.filter(r => r.type === 'baccarat').length} 個百家樂回合`);
  console.log(`  ✅ 創建 ${rounds.filter(r => r.type === 'dragonTiger').length} 個龍虎回合`);
  console.log(`  ✅ 創建 ${rounds.filter(r => r.type === 'bullBull').length} 個牛牛回合`);

  // ============================================
  // 創建投注記錄
  // ============================================
  console.log('\n💰 創建投注記錄...');

  const BACCARAT_BET_TYPES: BetType[] = [BetType.player, BetType.banker, BetType.tie, BetType.player_pair, BetType.banker_pair];
  const DT_BET_TYPES: BetType[] = [BetType.dragon, BetType.tiger, BetType.dt_tie, BetType.dragon_big, BetType.tiger_small];
  const BB_BET_TYPES: BetType[] = [BetType.bb_banker, BetType.bb_player1, BetType.bb_player2, BetType.bb_player3];

  let totalBets = 0;
  let totalWon = 0;
  let totalLost = 0;

  // 為每個會員創建隨機投注
  for (const { member } of allMembers) {
    // 每個會員投注 5-20 次
    const betCount = Math.floor(Math.random() * 16) + 5;

    for (let i = 0; i < betCount; i++) {
      const { type, round } = randomPick(rounds);
      const amount = randomAmount(100, Math.min(5000, Math.floor(Number(member.balance) / 10)));

      let betType: BetType;
      let status: 'won' | 'lost' | 'refunded' = 'lost';
      let payout: number | null = null;

      if (type === 'baccarat') {
        betType = randomPick(BACCARAT_BET_TYPES);
        const result = round.result;

        // 計算輸贏
        if (result === 'tie' && (betType === BetType.player || betType === BetType.banker)) {
          status = 'refunded';
          payout = amount;
        } else if (
          (result === 'player' && betType === BetType.player) ||
          (result === 'banker' && betType === BetType.banker) ||
          (result === 'tie' && betType === BetType.tie)
        ) {
          status = 'won';
          if (betType === BetType.tie) payout = amount * 9;
          else if (betType === BetType.banker) payout = amount * 1.95;
          else payout = amount * 2;
        } else if (
          (round.playerPair && betType === BetType.player_pair) ||
          (round.bankerPair && betType === BetType.banker_pair)
        ) {
          status = 'won';
          payout = amount * 12;
        }

        await prisma.bet.create({
          data: {
            userId: member.id,
            roundId: round.id,
            betType,
            amount,
            payout,
            status,
            createdAt: round.createdAt,
          }
        });

      } else if (type === 'dragonTiger') {
        betType = randomPick(DT_BET_TYPES);
        const result = round.result;

        if (
          (result === 'dragon' && betType === BetType.dragon) ||
          (result === 'tiger' && betType === BetType.tiger) ||
          (result === 'dt_tie' && betType === BetType.dt_tie)
        ) {
          status = 'won';
          if (betType === BetType.dt_tie) payout = amount * 9;
          else payout = amount * 2;
        } else if (result === 'dt_tie' && (betType === BetType.dragon || betType === BetType.tiger)) {
          status = 'refunded';
          payout = amount * 0.5; // 龍虎和局退一半
        }

        await prisma.bet.create({
          data: {
            userId: member.id,
            dragonTigerRoundId: round.id,
            betType,
            amount,
            payout,
            status,
            createdAt: round.createdAt,
          }
        });

      } else if (type === 'bullBull') {
        betType = randomPick(BB_BET_TYPES);

        // 簡化牛牛判定
        if (
          (betType === BetType.bb_player3 && round.player3Result === 'win') ||
          (betType === BetType.bb_banker)
        ) {
          status = 'won';
          payout = amount * 2;
        }

        await prisma.bet.create({
          data: {
            userId: member.id,
            bullBullRoundId: round.id,
            betType,
            amount,
            payout,
            status,
            createdAt: round.createdAt,
          }
        });
      }

      totalBets++;
      if (status === 'won') totalWon++;
      else if (status === 'lost') totalLost++;
    }
  }

  console.log(`  ✅ 創建 ${totalBets} 筆投注記錄`);
  console.log(`     - 贏: ${totalWon} 筆`);
  console.log(`     - 輸: ${totalLost} 筆`);
  console.log(`     - 退回: ${totalBets - totalWon - totalLost} 筆`);

  // ============================================
  // 顯示結構總覽
  // ============================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 代理層級結構總覽');
  console.log('='.repeat(70));
  console.log(`
Admin (管理員)
│
├─ 🏢 北區總代 agent_north (1級, 佔成25%, 退水0.8%)
│   │   └─ 👤 3 位直屬會員
│   │
│   ├─ 北區A組 agent_north_a (2級)
│   │   │   └─ 👤 3 位會員
│   │   │
│   │   ├─ 北A-台北 agent_north_a1 (3級)
│   │   │   │   └─ 👤 4 位會員
│   │   │   │
│   │   │   ├─ 台北信義 agent_tpe_xinyi (4級)
│   │   │   │   └─ 👤 3 位會員
│   │   │   │
│   │   │   └─ 台北大安 agent_tpe_daan (4級)
│   │   │       └─ 👤 2 位會員
│   │   │
│   │   └─ 北A-新北 agent_north_a2 (3級)
│   │       └─ 👤 3 位會員
│   │
│   └─ 北區B組 agent_north_b (2級)
│       │   └─ 👤 2 位會員
│       │
│       └─ 北B-桃園 agent_north_b1 (3級)
│           └─ 👤 2 位會員
│
├─ 🏢 南區總代 agent_south (1級, 佔成22%, 退水0.7%)
│   │   └─ 👤 2 位直屬會員
│   │
│   ├─ 南區A組 agent_south_a (2級)
│   │   │   └─ 👤 3 位會員
│   │   │
│   │   ├─ 南A-高雄 agent_south_a1 (3級)
│   │   │   │   └─ 👤 4 位會員
│   │   │   │
│   │   │   └─ 高雄三民 agent_khh_sanmin (4級)
│   │   │       └─ 👤 3 位會員
│   │   │
│   │   └─ 南A-台南 agent_south_a2 (3級)
│   │       └─ 👤 3 位會員
│   │
│   └─ 南區B組 agent_south_b (2級)
│       │   └─ 👤 2 位會員
│       │
│       └─ 南B-屏東 agent_south_b1 (3級)
│           └─ 👤 2 位會員
│
└─ 🌟 VIP專線 agent_vip (1級, 佔成30%, 退水1.0%)
    │   └─ 👤 4 位直屬會員 (大戶)
    │
    ├─ VIP金牌 agent_vip_gold (2級)
    │   │   └─ 👤 4 位會員
    │   │
    │   └─ VIP金-精英 agent_vip_gold1 (3級)
    │       │   └─ 👤 5 位會員
    │       │
    │       └─ VIP至尊 agent_vip_elite (4級)
    │           └─ 👤 4 位會員
    │
    └─ VIP銀牌 agent_vip_silver (2級)
        │   └─ 👤 3 位會員
        │
        └─ VIP銀-標準 agent_vip_silver1 (3級)
            └─ 👤 3 位會員
`);

  console.log('='.repeat(70));
  console.log('📊 數據統計');
  console.log('='.repeat(70));
  console.log(`
  代理總數: 17 個 (4 層架構)
  會員總數: ${allMembers.length} 位

  遊戲回合:
    - 百家樂: ${rounds.filter(r => r.type === 'baccarat').length} 回合 (過去7天)
    - 龍虎: ${rounds.filter(r => r.type === 'dragonTiger').length} 回合
    - 牛牛: ${rounds.filter(r => r.type === 'bullBull').length} 回合

  投注記錄: ${totalBets} 筆
`);

  console.log('='.repeat(70));
  console.log('✅ 完整測試數據創建完成！');
  console.log('='.repeat(70));
  console.log('\n💡 登入資訊:');
  console.log('   所有帳號密碼: 123456');
  console.log('\n   一級代理: agent_north, agent_south, agent_vip');
  console.log('   二級代理: agent_north_a, agent_north_b, agent_south_a, agent_south_b, agent_vip_gold, agent_vip_silver');
  console.log('   三級代理: agent_north_a1, agent_north_a2, agent_north_b1, agent_south_a1, agent_south_a2, agent_south_b1, agent_vip_gold1, agent_vip_silver1');
  console.log('   四級代理: agent_tpe_xinyi, agent_tpe_daan, agent_khh_sanmin, agent_vip_elite');
}

main()
  .catch((e) => {
    console.error('❌ 錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
