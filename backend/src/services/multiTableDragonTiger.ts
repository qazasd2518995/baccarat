import { Server } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';
import { startDTTableLoop } from './dragonTigerTableManager.js';


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
    const defaultTables = [
      { name: 'DT1', dealerName: 'DT Dealer 1', sortOrder: 1 },
      { name: 'DT2', dealerName: 'DT Dealer 2', sortOrder: 2 },
      { name: 'DT3', dealerName: 'DT Dealer 3', sortOrder: 3 },
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

      startDTTableLoop(io, table.id, delay).catch((error) => {
        console.error(`[MultiTable-DT] Error in table ${table.name}:`, error);
      });

      console.log(`[MultiTable-DT] Table ${table.name} (${table.id}) loop started with ${delay}ms delay`);
    }
  }
}
