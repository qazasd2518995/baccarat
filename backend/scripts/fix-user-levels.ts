import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 查找 Administrator
  const admin = await prisma.user.findUnique({
    where: { username: 'Administrator' },
    select: { id: true, username: true, role: true, agentLevel: true }
  });

  if (!admin) {
    console.log('Administrator not found');
    return;
  }

  console.log('Current Administrator:', admin);

  // 2. 更新 Administrator 為 agentLevel 0
  if (admin.agentLevel !== 0) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { agentLevel: 0 }
    });
    console.log('Updated Administrator to agentLevel 0');
  }

  // 3. 查找 member001
  const member = await prisma.user.findUnique({
    where: { username: 'member001' },
    select: { id: true, username: true, role: true, parentAgentId: true }
  });

  if (!member) {
    console.log('member001 not found');
    return;
  }

  console.log('Current member001:', member);

  // 4. 設定 member001 的上級為 Administrator
  if (member.parentAgentId !== admin.id) {
    await prisma.user.update({
      where: { id: member.id },
      data: { parentAgentId: admin.id }
    });
    console.log('Updated member001 parentAgent to Administrator');
  }

  // 5. 確認結果
  const updatedAdmin = await prisma.user.findUnique({
    where: { username: 'Administrator' },
    select: {
      id: true,
      username: true,
      role: true,
      agentLevel: true,
      subUsers: { select: { username: true, role: true } }
    }
  });

  const updatedMember = await prisma.user.findUnique({
    where: { username: 'member001' },
    select: {
      id: true,
      username: true,
      role: true,
      parentAgent: { select: { username: true } }
    }
  });

  console.log('\n=== Final state ===');
  console.log('Administrator:', updatedAdmin);
  console.log('member001:', updatedMember);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
