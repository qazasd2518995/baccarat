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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
