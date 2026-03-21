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
    { name: '百家樂 B1', dealerName: 'Dealer 1', sortOrder: 1, bettingDuration: 30 },
    { name: '百家樂 B2', dealerName: 'Dealer 2', sortOrder: 2, bettingDuration: 30 },
    { name: '百家樂 B3', dealerName: 'Dealer 3', sortOrder: 3, bettingDuration: 30 },
    { name: '百家樂 B4', dealerName: 'Dealer 4', sortOrder: 4, bettingDuration: 30 },
    { name: '百家樂 B5', dealerName: 'Dealer 5', sortOrder: 5, bettingDuration: 30 },
    { name: '極速百家樂 B1', dealerName: 'Dealer 6', sortOrder: 6, bettingDuration: 15 },
    { name: '極速百家樂 B2', dealerName: 'Dealer 7', sortOrder: 7, bettingDuration: 15 },
    { name: '極速百家樂 B3', dealerName: 'Dealer 8', sortOrder: 8, bettingDuration: 15 },
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
