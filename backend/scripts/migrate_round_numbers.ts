/**
 * 將舊格式期號（純數字如 66475）轉換為新格式（YYYYMMDDNNN 如 20260228001）
 * 根據 createdAt 日期重新生成期號
 */
import { prisma } from '../src/lib/prisma.js';

interface RoundRecord {
  id: string;
  roundNumber: string;
  createdAt: Date;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function migrateRounds(
  tableName: string,
  findMany: () => Promise<RoundRecord[]>,
  update: (id: string, roundNumber: string) => Promise<void>
) {
  console.log(`\n=== Migrating ${tableName} ===`);

  // Get all rounds ordered by createdAt
  const rounds = await findMany();
  console.log(`Found ${rounds.length} rounds to migrate`);

  // Skip if no rounds
  if (rounds.length === 0) {
    console.log('No rounds to migrate');
    return;
  }

  // Check if already migrated (roundNumber starts with year)
  const alreadyMigrated = rounds.filter(r => r.roundNumber.startsWith('202'));
  if (alreadyMigrated.length === rounds.length) {
    console.log('All rounds already migrated');
    return;
  }

  // Group by date and assign sequence numbers
  const byDate = new Map<string, RoundRecord[]>();

  for (const round of rounds) {
    // Skip already migrated
    if (round.roundNumber.startsWith('202')) continue;

    const dateStr = formatDate(round.createdAt);
    if (!byDate.has(dateStr)) {
      byDate.set(dateStr, []);
    }
    byDate.get(dateStr)!.push(round);
  }

  // Process each date
  let migratedCount = 0;
  for (const [dateStr, dateRounds] of byDate) {
    // Sort by createdAt within the day
    dateRounds.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Assign sequence numbers
    for (let i = 0; i < dateRounds.length; i++) {
      const round = dateRounds[i];
      const sequence = String(i + 1).padStart(3, '0');
      const newRoundNumber = `${dateStr}${sequence}`;

      await update(round.id, newRoundNumber);
      migratedCount++;

      if (migratedCount % 100 === 0) {
        console.log(`Migrated ${migratedCount} rounds...`);
      }
    }
  }

  console.log(`Migrated ${migratedCount} rounds for ${tableName}`);
}

async function main() {
  console.log('Starting round number migration...');

  // Migrate GameRound (Baccarat)
  await migrateRounds(
    'GameRound',
    () => prisma.gameRound.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, roundNumber: true, createdAt: true }
    }),
    async (id, roundNumber) => {
      await prisma.gameRound.update({
        where: { id },
        data: { roundNumber }
      });
    }
  );

  // Migrate DragonTigerRound
  await migrateRounds(
    'DragonTigerRound',
    () => prisma.dragonTigerRound.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, roundNumber: true, createdAt: true }
    }),
    async (id, roundNumber) => {
      await prisma.dragonTigerRound.update({
        where: { id },
        data: { roundNumber }
      });
    }
  );

  // Migrate BullBullRound
  await migrateRounds(
    'BullBullRound',
    () => prisma.bullBullRound.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, roundNumber: true, createdAt: true }
    }),
    async (id, roundNumber) => {
      await prisma.bullBullRound.update({
        where: { id },
        data: { roundNumber }
      });
    }
  );

  console.log('\n=== Migration complete! ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
