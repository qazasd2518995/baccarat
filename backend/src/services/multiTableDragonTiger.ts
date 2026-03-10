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

  if (tables.length === 0) {
    console.log('[MultiTable-DT] No Dragon Tiger tables found in database, creating default tables...');

    // Create default tables if none exist
    // 一般龍虎（30秒）+ 極速龍虎（15秒）
    const defaultTables = [
      { name: '龍虎 DT1', dealerName: 'DT Dealer 1', sortOrder: 1, bettingDuration: 30 },
      { name: '龍虎 DT2', dealerName: 'DT Dealer 2', sortOrder: 2, bettingDuration: 30 },
      { name: '極速龍虎 DT1', dealerName: 'DT Dealer 3', sortOrder: 3, bettingDuration: 15 },
      { name: '極速龍虎 DT2', dealerName: 'DT Dealer 4', sortOrder: 4, bettingDuration: 15 },
    ];

    for (const table of defaultTables) {
      await prisma.gameTable.create({
        data: {
          name: table.name,
          dealerName: table.dealerName,
          gameType: 'dragonTiger',
          minBet: 10,
          maxBet: 10000,
          isActive: true,
          sortOrder: table.sortOrder,
          bettingDuration: table.bettingDuration,
        },
      });
    }

    // Re-fetch tables
    const newTables = await prisma.gameTable.findMany({
      where: { gameType: 'dragonTiger', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    console.log(`[MultiTable-DT] Created ${newTables.length} default Dragon Tiger tables`);

    // Start each table with staggered delays
    for (let i = 0; i < newTables.length; i++) {
      const table = newTables[i];
      const delay = i * 7000; // 7 seconds stagger between tables

      initTablePlayerCount(table.id);
      startDTTableLoop(io, table.id, delay).catch((error) => {
        console.error(`[MultiTable-DT] Error in table ${table.name}:`, error);
      });

      console.log(`[MultiTable-DT] Table ${table.name} (${table.id}) loop started with ${delay}ms delay`);
    }
  } else {
    console.log(`[MultiTable-DT] Found ${tables.length} Dragon Tiger tables in database`);

    // Start each table with staggered delays
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const delay = i * 7000; // 7 seconds stagger between tables

      initTablePlayerCount(table.id);
      startDTTableLoop(io, table.id, delay).catch((error) => {
        console.error(`[MultiTable-DT] Error in table ${table.name}:`, error);
      });

      console.log(`[MultiTable-DT] Table ${table.name} (${table.id}) loop started with ${delay}ms delay`);
    }
  }
}
