import { prisma } from '../src/lib/prisma.js';

async function main() {
  // Check GameRound records
  const gameRounds = await prisma.gameRound.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, roundNumber: true, createdAt: true }
  });
  console.log('GameRound samples:', gameRounds);

  // Check DragonTigerRound records
  const dtRounds = await prisma.dragonTigerRound.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, roundNumber: true, createdAt: true }
  });
  console.log('DragonTigerRound samples:', dtRounds);

  // Check BullBullRound records
  const bbRounds = await prisma.bullBullRound.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, roundNumber: true, createdAt: true }
  });
  console.log('BullBullRound samples:', bbRounds);
}

main().catch(console.error).finally(() => prisma.$disconnect());
