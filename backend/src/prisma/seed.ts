import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create admin user with unlimited balance (represented by very large number)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      balance: 999999999999, // Admin has "unlimited" balance
    },
    create: {
      username: 'admin',
      passwordHash: adminPassword,
      nickname: 'Administrator',
      role: 'admin',
      balance: 999999999999, // Admin has "unlimited" balance
    },
  });
  console.log('Created admin:', admin.username, '- Balance:', admin.balance.toString());

  // Create a demo agent under admin
  const agentPassword = await bcrypt.hash('agent123', 10);
  const agent = await prisma.user.upsert({
    where: { username: 'agent001' },
    update: {
      parentAgentId: admin.id, // Agent is under admin
    },
    create: {
      username: 'agent001',
      passwordHash: agentPassword,
      nickname: 'Demo Agent',
      role: 'agent',
      parentAgentId: admin.id, // Agent is under admin
      balance: 100000,
    },
  });
  console.log('Created agent:', agent.username, '- Parent:', admin.username, '- Balance:', agent.balance.toString());

  // Create a demo member under the agent
  const memberPassword = await bcrypt.hash('member123', 10);
  const member = await prisma.user.upsert({
    where: { username: 'member001' },
    update: {
      parentAgentId: agent.id,
    },
    create: {
      username: 'member001',
      passwordHash: memberPassword,
      nickname: 'Demo Member',
      role: 'member',
      parentAgentId: agent.id,
      balance: 10000,
    },
  });
  console.log('Created member:', member.username, '- Parent:', agent.username, '- Balance:', member.balance.toString());

  // Create default game tables (15 tables: 5 per game type)
  // Note: Bet limits are per-user setting, not per-table

  const tableConfigs = [
    // Baccarat tables (5)
    { id: 'baccarat-1', name: 'B1', dealer: '詩涵', type: 'baccarat', order: 1 },
    { id: 'baccarat-2', name: 'B2', dealer: '語嫣', type: 'baccarat', order: 2 },
    { id: 'baccarat-3', name: 'B3', dealer: '欣妍', type: 'baccarat', order: 3 },
    { id: 'baccarat-4', name: 'B4', dealer: '小魚', type: 'baccarat', order: 4 },
    { id: 'baccarat-5', name: 'B5', dealer: '蜜糖', type: 'baccarat', order: 5 },
    // Dragon Tiger tables (5)
    { id: 'dragon-tiger-1', name: 'D1', dealer: '奈奈', type: 'dragonTiger', order: 6 },
    { id: 'dragon-tiger-2', name: 'D2', dealer: '小鹿', type: 'dragonTiger', order: 7 },
    { id: 'dragon-tiger-3', name: 'D3', dealer: '蜜桃', type: 'dragonTiger', order: 8 },
    { id: 'dragon-tiger-4', name: 'D4', dealer: '泡泡', type: 'dragonTiger', order: 9 },
    { id: 'dragon-tiger-5', name: 'D5', dealer: 'Cherry', type: 'dragonTiger', order: 10 },
    // Bull Bull tables (5)
    { id: 'bull-bull-1', name: 'N1', dealer: '甜甜', type: 'bullBull', order: 11 },
    { id: 'bull-bull-2', name: 'N2', dealer: 'Yuki', type: 'bullBull', order: 12 },
    { id: 'bull-bull-3', name: 'N3', dealer: 'Momo', type: 'bullBull', order: 13 },
    { id: 'bull-bull-4', name: 'N4', dealer: '果凍', type: 'bullBull', order: 14 },
    { id: 'bull-bull-5', name: 'N5', dealer: 'Lulu', type: 'bullBull', order: 15 },
  ];

  for (const config of tableConfigs) {
    await prisma.gameTable.upsert({
      where: { id: config.id },
      update: {},
      create: {
        id: config.id,
        name: config.name,
        dealerName: config.dealer,
        dealerAvatar: '',
        gameType: config.type,
        minBet: 10,
        maxBet: 100000,
        isActive: true,
        currentPlayers: Math.floor(Math.random() * 200) + 50,
        shoeNumber: 1,
        roundNumber: 0,
        sortOrder: config.order,
      },
    });
    console.log('Created table:', config.name);
  }

  console.log('\n===== Seeding completed! =====');
  console.log('\nHierarchy:');
  console.log('  admin (Admin) - Balance: 999,999,999,999');
  console.log('    └── agent001 (Agent) - Balance: 100,000');
  console.log('        └── member001 (Member) - Balance: 10,000');
  console.log('\nDemo accounts:');
  console.log('  Admin:  admin / admin123');
  console.log('  Agent:  agent001 / agent123');
  console.log('  Member: member001 / member123');
  console.log('\n入出點規則:');
  console.log('  - 入點: 上級給下級點數，上級扣除，下級增加');
  console.log('  - 出點: 下級還給上級，下級扣除，上級增加');
  console.log('  - 只能操作直屬下級');
  console.log('\nGame Tables (15 total):');
  console.log('  百家乐: B1, B2, B3, B4, B5');
  console.log('  龙虎: D1, D2, D3, D4, D5');
  console.log('  牛牛: N1, N2, N3, N4, N5');
  console.log('\n限红说明:');
  console.log('  - 限红是根据用户帐号设定，不是桌台');
  console.log('  - 在后台「会员管理」中设置用户的限红');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
