import { Server } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';
import { startTableLoop } from './tableManager.js';
import { initTablePlayerCount } from './fakePlayerCount.js';


type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export async function startMultiTableGameLoop(io: TypedServer): Promise<void> {
  console.log('[MultiTable] Starting multi-table game loops...');

  // Fetch all active baccarat tables from database
  const tables = await prisma.gameTable.findMany({
    where: {
      gameType: 'baccarat',
      isActive: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Expected table configuration — auto-create missing tables on startup
  // 一般百家樂（30秒）+ 極速百家樂（15秒）
  const expectedTables = [
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `百家樂 B${i + 1}`, dealerName: `Dealer ${i + 1}`, sortOrder: i + 1, bettingDuration: 30,
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `極速百家樂 B${i + 1}`, dealerName: `Dealer ${i + 11}`, sortOrder: i + 11, bettingDuration: 15,
    })),
  ];

  // Create any missing tables
  const existingNames = new Set(tables.map(t => t.name));
  for (const expected of expectedTables) {
    if (!existingNames.has(expected.name)) {
      await prisma.gameTable.create({
        data: {
          name: expected.name,
          dealerName: expected.dealerName,
          gameType: 'baccarat',
          minBet: 10,
          maxBet: 10000,
          isActive: true,
          sortOrder: expected.sortOrder,
          bettingDuration: expected.bettingDuration,
        },
      });
      console.log(`[MultiTable] Created missing table: ${expected.name}`);
    }
  }

  // Re-fetch all tables (including newly created ones)
  const allTables = await prisma.gameTable.findMany({
    where: { gameType: 'baccarat', isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  console.log(`[MultiTable] Starting ${allTables.length} baccarat tables`);

  {
    // Start each table with staggered delays
    for (let i = 0; i < allTables.length; i++) {
      const table = allTables[i];
      const delay = i * 7000; // 7 seconds stagger between tables

      initTablePlayerCount(table.id);
      startTableLoop(io, table.id, delay).catch((error) => {
        console.error(`[MultiTable] Error in table ${table.name}:`, error);
      });

      console.log(`[MultiTable] Table ${table.name} (${table.id}) loop started with ${delay}ms delay`);
    }
  }
}
