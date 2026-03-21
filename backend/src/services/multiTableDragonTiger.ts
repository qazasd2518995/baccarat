import { Server } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';
import { startDTTableLoop } from './dragonTigerTableManager.js';
import { initTablePlayerCount } from './fakePlayerCount.js';


type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export async function startMultiTableDragonTiger(io: TypedServer): Promise<void> {
  console.log('[MultiTable-DT] Starting multi-table Dragon Tiger game loops...');

  // Fetch all active Dragon Tiger tables from database
  const tables = await prisma.gameTable.findMany({
    where: {
      gameType: 'dragonTiger',
      isActive: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Expected table configuration
  const dtDealerNames = ['奈奈', 'Lulu', '糖糖', '萌萌'];
  const expectedTables = [
    { name: '龍虎 DT1', dealerName: dtDealerNames[0], sortOrder: 1, bettingDuration: 30 },
    { name: '龍虎 DT2', dealerName: dtDealerNames[1], sortOrder: 2, bettingDuration: 30 },
    { name: '極速龍虎 DT1', dealerName: dtDealerNames[2], sortOrder: 3, bettingDuration: 15 },
    { name: '極速龍虎 DT2', dealerName: dtDealerNames[3], sortOrder: 4, bettingDuration: 15 },
  ];

  // Deactivate old tables not in expected list (e.g. legacy short names)
  const expectedNames = new Set(expectedTables.map(t => t.name));
  for (const table of tables) {
    if (!expectedNames.has(table.name)) {
      await prisma.gameTable.update({
        where: { id: table.id },
        data: { isActive: false },
      });
      console.log(`[MultiTable-DT] Deactivated legacy table: ${table.name} (${table.id})`);
    }
  }

  // Create missing tables & sync dealer names
  const existingByName = new Map(tables.map(t => [t.name, t]));
  for (const expected of expectedTables) {
    const existing = existingByName.get(expected.name);
    if (!existing) {
      await prisma.gameTable.create({
        data: {
          name: expected.name,
          dealerName: expected.dealerName,
          gameType: 'dragonTiger',
          minBet: 10,
          maxBet: 10000,
          isActive: true,
          sortOrder: expected.sortOrder,
          bettingDuration: expected.bettingDuration,
        },
      });
      console.log(`[MultiTable-DT] Created missing table: ${expected.name}`);
    } else if (existing.dealerName !== expected.dealerName) {
      await prisma.gameTable.update({
        where: { id: existing.id },
        data: { dealerName: expected.dealerName },
      });
      console.log(`[MultiTable-DT] Updated dealer name: ${expected.name} → ${expected.dealerName}`);
    }
  }

  // Re-fetch all active tables
  const allTables = await prisma.gameTable.findMany({
    where: { gameType: 'dragonTiger', isActive: true },
    orderBy: { sortOrder: 'asc' },
  });

  console.log(`[MultiTable-DT] Starting ${allTables.length} Dragon Tiger tables`);

  {
    for (let i = 0; i < allTables.length; i++) {
      const table = allTables[i];
      const delay = i * 7000;

      initTablePlayerCount(table.id);
      startDTTableLoop(io, table.id, delay).catch((error) => {
        console.error(`[MultiTable-DT] Error in table ${table.name}:`, error);
      });

      console.log(`[MultiTable-DT] Table ${table.name} (${table.id}) loop started with ${delay}ms delay`);
    }
  }
}
