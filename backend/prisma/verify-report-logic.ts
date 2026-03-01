import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 驗證帳務報表計算邏輯\n');
  console.log('='.repeat(80));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // 取得所有投注數據
  const allBets = await prisma.bet.findMany({
    where: {
      createdAt: { gte: today, lt: tomorrow }
    },
    include: {
      user: {
        select: { username: true, nickname: true, parentAgentId: true }
      }
    }
  });

  // 按會員分組計算
  const memberStats: Record<string, {
    username: string;
    nickname: string;
    parentAgentId: string;
    betCount: number;
    betAmount: number;
    validBet: number;
    memberWinLoss: number;
  }> = {};

  for (const bet of allBets) {
    const userId = bet.userId;
    if (!memberStats[userId]) {
      memberStats[userId] = {
        username: bet.user.username,
        nickname: bet.user.nickname || '',
        parentAgentId: bet.user.parentAgentId || '',
        betCount: 0,
        betAmount: 0,
        validBet: 0,
        memberWinLoss: 0,
      };
    }

    memberStats[userId].betCount++;
    memberStats[userId].betAmount += Number(bet.amount);
    memberStats[userId].validBet += Number(bet.amount);

    if (bet.status === 'won' && bet.payout) {
      memberStats[userId].memberWinLoss += Number(bet.payout) - Number(bet.amount);
    } else if (bet.status === 'lost') {
      memberStats[userId].memberWinLoss -= Number(bet.amount);
    }
  }

  console.log('\n📊 各會員投注統計:');
  console.log('-'.repeat(80));
  console.log('會員名稱'.padEnd(15) + '注單數'.padStart(8) + '下注金額'.padStart(12) + '有效投注'.padStart(12) + '會員輸贏'.padStart(12));
  console.log('-'.repeat(80));

  for (const [userId, stats] of Object.entries(memberStats)) {
    console.log(
      stats.nickname.padEnd(15) +
      String(stats.betCount).padStart(8) +
      stats.betAmount.toFixed(2).padStart(12) +
      stats.validBet.toFixed(2).padStart(12) +
      stats.memberWinLoss.toFixed(2).padStart(12)
    );
  }

  // 取得代理結構
  const agents = await prisma.user.findMany({
    where: { role: 'agent' },
    select: {
      id: true,
      username: true,
      nickname: true,
      agentLevel: true,
      sharePercent: true,
      rebatePercent: true,
      parentAgentId: true,
    },
    orderBy: { agentLevel: 'asc' }
  });

  // 計算每個代理的報表
  console.log('\n\n📈 代理報表計算驗證:');
  console.log('='.repeat(100));

  for (const agent of agents) {
    // 取得該代理的所有下線會員 (遞迴)
    const allMemberIds = await getAllDownlineMembers(agent.id);

    // 計算總數據
    let totalBetCount = 0;
    let totalBetAmount = 0;
    let totalValidBet = 0;
    let totalMemberWinLoss = 0;

    for (const memberId of allMemberIds) {
      if (memberStats[memberId]) {
        totalBetCount += memberStats[memberId].betCount;
        totalBetAmount += memberStats[memberId].betAmount;
        totalValidBet += memberStats[memberId].validBet;
        totalMemberWinLoss += memberStats[memberId].memberWinLoss;
      }
    }

    const sharePercent = Number(agent.sharePercent);
    const rebatePercent = Number(agent.rebatePercent);

    // 計算各項
    const memberRebate = totalValidBet * (rebatePercent / 100);
    const personalShare = Math.abs(totalMemberWinLoss) * (sharePercent / 100);
    const personalRebate = memberRebate;
    const receivable = totalMemberWinLoss < 0 ? Math.abs(totalMemberWinLoss) : 0;
    const payable = totalMemberWinLoss > 0 ? totalMemberWinLoss + memberRebate : memberRebate;
    const profit = receivable - payable + personalShare + personalRebate;

    console.log(`\n【${agent.nickname}】(${agent.username}) - ${agent.agentLevel}級代理`);
    console.log(`   佔成: ${sharePercent}%, 退水: ${rebatePercent}%`);
    console.log(`   下線會員數: ${allMemberIds.length}`);
    console.log('-'.repeat(60));
    console.log(`   注單筆數: ${totalBetCount}`);
    console.log(`   下注金額: ${totalBetAmount.toFixed(2)}`);
    console.log(`   有效投注: ${totalValidBet.toFixed(2)}`);
    console.log(`   會員輸贏: ${totalMemberWinLoss.toFixed(2)} ${totalMemberWinLoss > 0 ? '(會員贏)' : totalMemberWinLoss < 0 ? '(會員輸)' : ''}`);
    console.log(`   會員退水: ${memberRebate.toFixed(2)} = ${totalValidBet.toFixed(2)} × ${rebatePercent}%`);
    console.log(`   個人佔成: ${personalShare.toFixed(2)} = |${totalMemberWinLoss.toFixed(2)}| × ${sharePercent}%`);
    console.log(`   個人退水: ${personalRebate.toFixed(2)}`);
    console.log(`   應收下線: ${receivable.toFixed(2)} ${totalMemberWinLoss < 0 ? `= |${totalMemberWinLoss.toFixed(2)}|` : '= 0 (會員沒輸錢)'}`);
    console.log(`   應繳上線: ${payable.toFixed(2)} = ${totalMemberWinLoss > 0 ? `${totalMemberWinLoss.toFixed(2)} + ` : ''}${memberRebate.toFixed(2)}`);
    console.log(`   個人盈虧: ${profit.toFixed(2)} = ${receivable.toFixed(2)} - ${payable.toFixed(2)} + ${personalShare.toFixed(2)} + ${personalRebate.toFixed(2)}`);
  }

  // 驗證蘋果信用的子報表
  const appleCredit = agents.find(a => a.username === 'apple_credit');
  if (appleCredit) {
    console.log('\n\n' + '='.repeat(100));
    console.log('🍎 蘋果信用 (apple_credit) 子報表驗證');
    console.log('='.repeat(100));

    // 直屬會員
    const directMembers = await prisma.user.findMany({
      where: { parentAgentId: appleCredit.id, role: 'member' },
      select: { id: true, username: true, nickname: true }
    });

    console.log('\n【直屬會員輸贏總和】');
    let directBetCount = 0, directBetAmount = 0, directValidBet = 0, directMemberWinLoss = 0;
    for (const m of directMembers) {
      if (memberStats[m.id]) {
        directBetCount += memberStats[m.id].betCount;
        directBetAmount += memberStats[m.id].betAmount;
        directValidBet += memberStats[m.id].validBet;
        directMemberWinLoss += memberStats[m.id].memberWinLoss;
        console.log(`   ${m.nickname}: 輸贏 ${memberStats[m.id].memberWinLoss.toFixed(2)}`);
      }
    }
    console.log(`   ---`);
    console.log(`   總計: 注單 ${directBetCount}, 有效投注 ${directValidBet.toFixed(2)}, 會員輸贏 ${directMemberWinLoss.toFixed(2)}`);

    // 下線代理
    const subAgents = await prisma.user.findMany({
      where: { parentAgentId: appleCredit.id, role: 'agent' },
      select: { id: true, username: true, nickname: true }
    });

    console.log('\n【下線代理輸贏總和】');
    let subBetCount = 0, subBetAmount = 0, subValidBet = 0, subMemberWinLoss = 0;
    for (const subAgent of subAgents) {
      const subMemberIds = await getAllDownlineMembers(subAgent.id);
      let agentWinLoss = 0;
      for (const memberId of subMemberIds) {
        if (memberStats[memberId]) {
          subBetCount += memberStats[memberId].betCount;
          subBetAmount += memberStats[memberId].betAmount;
          subValidBet += memberStats[memberId].validBet;
          subMemberWinLoss += memberStats[memberId].memberWinLoss;
          agentWinLoss += memberStats[memberId].memberWinLoss;
        }
      }
      console.log(`   ${subAgent.nickname}: 輸贏 ${agentWinLoss.toFixed(2)} (${subMemberIds.length} 個會員)`);
    }
    console.log(`   ---`);
    console.log(`   總計: 注單 ${subBetCount}, 有效投注 ${subValidBet.toFixed(2)}, 會員輸贏 ${subMemberWinLoss.toFixed(2)}`);
  }

  console.log('\n\n✅ 驗證完成！');
}

async function getAllDownlineMembers(agentId: string): Promise<string[]> {
  const memberIds: string[] = [];
  const directDownline = await prisma.user.findMany({
    where: { parentAgentId: agentId },
    select: { id: true, role: true }
  });

  for (const user of directDownline) {
    if (user.role === 'member') {
      memberIds.push(user.id);
    } else if (user.role === 'agent') {
      const subMembers = await getAllDownlineMembers(user.id);
      memberIds.push(...subMembers);
    }
  }
  return memberIds;
}

main()
  .catch((e) => {
    console.error('❌ 錯誤:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
