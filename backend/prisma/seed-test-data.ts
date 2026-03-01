import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始創建測試數據...\n');

  // 找到現有的 admin
  const admin = await prisma.user.findFirst({
    where: { role: 'admin' }
  });

  if (!admin) {
    console.error('❌ 找不到管理員帳號');
    return;
  }

  console.log(`✅ 找到管理員: ${admin.username} (ID: ${admin.id})\n`);

  const passwordHash = await bcrypt.hash('123456', 10);

  // ============================================
  // 創建代理層級結構
  // ============================================
  // Admin (0級)
  //   └─ 信用客服 agent1 (1級, 佔成20%, 退水0.5%)
  //        ├─ 蘋果信用 agent1-1 (2級, 佔成15%, 退水0.4%)
  //        │    ├─ 小蘋果 agent1-1-1 (3級, 佔成10%, 退水0.3%)
  //        │    │    └─ member1-1-1-a, member1-1-1-b
  //        │    └─ member1-1-a, member1-1-b
  //        └─ 香蕉信用 agent1-2 (2級, 佔成12%, 退水0.3%)
  //             └─ member1-2-a
  //   └─ VIP代理 agent2 (1級, 佔成25%, 退水0.6%)
  //        └─ member2-a, member2-b

  console.log('📦 創建一級代理...');

  // 一級代理: 信用客服
  const agent1 = await prisma.user.upsert({
    where: { username: 'credit_service' },
    update: {},
    create: {
      username: 'credit_service',
      passwordHash,
      nickname: '信用客服',
      role: 'agent',
      parentAgentId: admin.id,
      agentLevel: 1,
      sharePercent: 20,
      rebatePercent: 0.5,
      balance: 100000,
      inviteCode: 'CREDIT001',
    }
  });
  console.log(`  ✅ ${agent1.nickname} (${agent1.username}) - 1級代理, 佔成20%, 退水0.5%`);

  // 一級代理: VIP代理
  const agent2 = await prisma.user.upsert({
    where: { username: 'vip_agent' },
    update: {},
    create: {
      username: 'vip_agent',
      passwordHash,
      nickname: 'VIP代理',
      role: 'agent',
      parentAgentId: admin.id,
      agentLevel: 1,
      sharePercent: 25,
      rebatePercent: 0.6,
      balance: 200000,
      inviteCode: 'VIP001',
    }
  });
  console.log(`  ✅ ${agent2.nickname} (${agent2.username}) - 1級代理, 佔成25%, 退水0.6%`);

  console.log('\n📦 創建二級代理...');

  // 二級代理: 蘋果信用 (agent1 的下線)
  const agent1_1 = await prisma.user.upsert({
    where: { username: 'apple_credit' },
    update: {},
    create: {
      username: 'apple_credit',
      passwordHash,
      nickname: '蘋果信用',
      role: 'agent',
      parentAgentId: agent1.id,
      agentLevel: 2,
      sharePercent: 15,
      rebatePercent: 0.4,
      balance: 50000,
      inviteCode: 'APPLE001',
    }
  });
  console.log(`  ✅ ${agent1_1.nickname} (${agent1_1.username}) - 2級代理, 佔成15%, 退水0.4%`);

  // 二級代理: 香蕉信用 (agent1 的下線)
  const agent1_2 = await prisma.user.upsert({
    where: { username: 'banana_credit' },
    update: {},
    create: {
      username: 'banana_credit',
      passwordHash,
      nickname: '香蕉信用',
      role: 'agent',
      parentAgentId: agent1.id,
      agentLevel: 2,
      sharePercent: 12,
      rebatePercent: 0.3,
      balance: 30000,
      inviteCode: 'BANANA001',
    }
  });
  console.log(`  ✅ ${agent1_2.nickname} (${agent1_2.username}) - 2級代理, 佔成12%, 退水0.3%`);

  console.log('\n📦 創建三級代理...');

  // 三級代理: 小蘋果 (agent1_1 的下線)
  const agent1_1_1 = await prisma.user.upsert({
    where: { username: 'small_apple' },
    update: {},
    create: {
      username: 'small_apple',
      passwordHash,
      nickname: '小蘋果',
      role: 'agent',
      parentAgentId: agent1_1.id,
      agentLevel: 3,
      sharePercent: 10,
      rebatePercent: 0.3,
      balance: 20000,
      inviteCode: 'SAPPLE001',
    }
  });
  console.log(`  ✅ ${agent1_1_1.nickname} (${agent1_1_1.username}) - 3級代理, 佔成10%, 退水0.3%`);

  console.log('\n👤 創建會員...');

  // 會員創建函數
  async function createMember(username: string, nickname: string, parentId: string, balance: number) {
    const member = await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        username,
        passwordHash,
        nickname,
        role: 'member',
        parentAgentId: parentId,
        agentLevel: 5,
        balance,
      }
    });
    return member;
  }

  // agent1_1_1 的直屬會員 (三級代理的會員)
  const member1_1_1_a = await createMember('member_a111', '會員A111', agent1_1_1.id, 5000);
  const member1_1_1_b = await createMember('member_b111', '會員B111', agent1_1_1.id, 8000);
  console.log(`  ✅ ${member1_1_1_a.nickname}, ${member1_1_1_b.nickname} → 小蘋果 (3級)`);

  // agent1_1 的直屬會員 (二級代理的會員)
  const member1_1_a = await createMember('member_a11', '會員A11', agent1_1.id, 10000);
  const member1_1_b = await createMember('member_b11', '會員B11', agent1_1.id, 15000);
  console.log(`  ✅ ${member1_1_a.nickname}, ${member1_1_b.nickname} → 蘋果信用 (2級)`);

  // agent1_2 的直屬會員 (二級代理的會員)
  const member1_2_a = await createMember('member_a12', '會員A12', agent1_2.id, 6000);
  console.log(`  ✅ ${member1_2_a.nickname} → 香蕉信用 (2級)`);

  // agent2 的直屬會員 (一級代理的會員)
  const member2_a = await createMember('member_a2', 'VIP會員A', agent2.id, 50000);
  const member2_b = await createMember('member_b2', 'VIP會員B', agent2.id, 30000);
  console.log(`  ✅ ${member2_a.nickname}, ${member2_b.nickname} → VIP代理 (1級)`);

  // ============================================
  // 創建遊戲回合和投注數據
  // ============================================
  console.log('\n🎰 創建遊戲回合和投注數據...');

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // 創建幾個遊戲回合
  const rounds: any[] = [];
  for (let i = 1; i <= 10; i++) {
    const round = await prisma.gameRound.create({
      data: {
        roundNumber: `${today.toISOString().slice(0, 10).replace(/-/g, '')}${String(i).padStart(3, '0')}`,
        shoeNumber: 1,
        playerCards: [{ suit: 'hearts', value: 'K' }, { suit: 'diamonds', value: '5' }],
        bankerCards: [{ suit: 'spades', value: 'Q' }, { suit: 'clubs', value: '3' }],
        playerPoints: 5,
        bankerPoints: 3,
        result: i % 3 === 0 ? 'tie' : (i % 2 === 0 ? 'banker' : 'player'),
        playerPair: i === 5,
        bankerPair: i === 7,
      }
    });
    rounds.push(round);
  }
  console.log(`  ✅ 創建了 ${rounds.length} 個遊戲回合`);

  // 創建投注數據
  interface BetData {
    memberId: string;
    memberName: string;
    bets: { roundIndex: number; betType: 'player' | 'banker' | 'tie'; amount: number; }[];
  }

  const betDataList: BetData[] = [
    // 小蘋果的會員 (3級代理)
    {
      memberId: member1_1_1_a.id,
      memberName: member1_1_1_a.nickname!,
      bets: [
        { roundIndex: 0, betType: 'player', amount: 1000 },  // 贏
        { roundIndex: 1, betType: 'banker', amount: 500 },   // 贏
        { roundIndex: 2, betType: 'player', amount: 800 },   // 和局退回
        { roundIndex: 3, betType: 'banker', amount: 1200 },  // 輸
      ]
    },
    {
      memberId: member1_1_1_b.id,
      memberName: member1_1_1_b.nickname!,
      bets: [
        { roundIndex: 0, betType: 'banker', amount: 2000 },  // 輸
        { roundIndex: 1, betType: 'player', amount: 1500 },  // 輸
        { roundIndex: 4, betType: 'player', amount: 3000 },  // 贏
      ]
    },
    // 蘋果信用的直屬會員 (2級代理)
    {
      memberId: member1_1_a.id,
      memberName: member1_1_a.nickname!,
      bets: [
        { roundIndex: 0, betType: 'player', amount: 5000 },  // 贏
        { roundIndex: 3, betType: 'player', amount: 3000 },  // 贏
        { roundIndex: 5, betType: 'tie', amount: 1000 },     // 輸
      ]
    },
    {
      memberId: member1_1_b.id,
      memberName: member1_1_b.nickname!,
      bets: [
        { roundIndex: 1, betType: 'banker', amount: 4000 },  // 贏
        { roundIndex: 2, betType: 'banker', amount: 2000 },  // 和局退回
        { roundIndex: 6, betType: 'player', amount: 6000 },  // 贏
      ]
    },
    // 香蕉信用的會員 (2級代理)
    {
      memberId: member1_2_a.id,
      memberName: member1_2_a.nickname!,
      bets: [
        { roundIndex: 0, betType: 'banker', amount: 1500 },  // 輸
        { roundIndex: 3, betType: 'banker', amount: 2500 },  // 輸
        { roundIndex: 4, betType: 'player', amount: 1000 },  // 贏
      ]
    },
    // VIP代理的會員 (1級代理)
    {
      memberId: member2_a.id,
      memberName: member2_a.nickname!,
      bets: [
        { roundIndex: 0, betType: 'player', amount: 10000 }, // 贏
        { roundIndex: 1, betType: 'player', amount: 8000 },  // 輸
        { roundIndex: 3, betType: 'player', amount: 15000 }, // 贏
        { roundIndex: 5, betType: 'banker', amount: 5000 },  // 輸
      ]
    },
    {
      memberId: member2_b.id,
      memberName: member2_b.nickname!,
      bets: [
        { roundIndex: 1, betType: 'banker', amount: 6000 },  // 贏
        { roundIndex: 4, betType: 'banker', amount: 4000 },  // 輸
        { roundIndex: 6, betType: 'banker', amount: 3000 },  // 輸
      ]
    },
  ];

  let totalBets = 0;
  for (const data of betDataList) {
    for (const bet of data.bets) {
      const round = rounds[bet.roundIndex];
      const result = round.result;

      let status: 'won' | 'lost' | 'refunded' = 'lost';
      let payout: number | null = null;

      if (result === 'tie' && bet.betType !== 'tie') {
        status = 'refunded';
        payout = bet.amount;
      } else if (
        (result === 'player' && bet.betType === 'player') ||
        (result === 'banker' && bet.betType === 'banker') ||
        (result === 'tie' && bet.betType === 'tie')
      ) {
        status = 'won';
        if (bet.betType === 'tie') {
          payout = bet.amount * 9; // 和局 1:8
        } else if (bet.betType === 'banker') {
          payout = bet.amount * 1.95; // 莊家 1:0.95
        } else {
          payout = bet.amount * 2; // 閒家 1:1
        }
      }

      await prisma.bet.create({
        data: {
          userId: data.memberId,
          roundId: round.id,
          betType: bet.betType,
          amount: bet.amount,
          payout,
          status,
          createdAt: today,
        }
      });
      totalBets++;
    }
  }
  console.log(`  ✅ 創建了 ${totalBets} 筆投注記錄`);

  // ============================================
  // 顯示結構總覽
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 代理層級結構總覽');
  console.log('='.repeat(60));
  console.log(`
Admin (管理員, 0級)
├─ 信用客服 credit_service (1級, 佔成20%, 退水0.5%)
│   ├─ 蘋果信用 apple_credit (2級, 佔成15%, 退水0.4%)
│   │   ├─ 小蘋果 small_apple (3級, 佔成10%, 退水0.3%)
│   │   │   ├─ 會員A111 member_a111
│   │   │   └─ 會員B111 member_b111
│   │   ├─ 會員A11 member_a11 (直屬)
│   │   └─ 會員B11 member_b11 (直屬)
│   └─ 香蕉信用 banana_credit (2級, 佔成12%, 退水0.3%)
│       └─ 會員A12 member_a12
└─ VIP代理 vip_agent (1級, 佔成25%, 退水0.6%)
    ├─ VIP會員A member_a2
    └─ VIP會員B member_b2
`);

  console.log('='.repeat(60));
  console.log('✅ 測試數據創建完成！');
  console.log('='.repeat(60));
  console.log('\n💡 登入資訊:');
  console.log('   所有帳號密碼: 123456');
  console.log('   代理帳號: credit_service, vip_agent, apple_credit, banana_credit, small_apple');
}

main()
  .catch((e) => {
    console.error('❌ 錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
