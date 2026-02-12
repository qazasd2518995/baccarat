import { Server } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';
import { startBBTableLoop } from './bullBullTableManager.js';
import { initTablePlayerCount } from './fakePlayerCount.js';


type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export async function startMultiTableBullBull(io: TypedServer): Promise<void> {
  console.log('[MultiTable-BB] Starting multi-table Bull Bull game loops...');

  // Fetch all active Bull Bull tables from database
  const tables = await prisma.gameTable.findMany({
    where: {
      gameType: 'bullBull',
      isActive: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  if (tables.length === 0) {
    console.log('[MultiTable-BB] No Bull Bull tables found in database, creating default tables...');

    // Create default tables if none exist
    const defaultTables = [
      { name: 'BB1', dealerName: 'BB Dealer 1', sortOrder: 1 },
      { name: 'BB2', dealerName: 'BB Dealer 2', sortOrder: 2 },
      { name: 'BB3', dealerName: 'BB Dealer 3', sortOrder: 3 },
    ];

    for (const table of defaultTables) {
      await prisma.gameTable.create({
        data: {
          name: table.name,
          dealerName: table.dealerName,
          gameType: 'bullBull',
          minBet: 10,
          maxBet: 10000,
          isActive: true,
          sortOrder: table.sortOrder,
        },
      });
    }

    // Re-fetch tables
    const newTables = await prisma.gameTable.findMany({
      where: { gameType: 'bullBull', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    console.log(`[MultiTable-BB] Created ${newTables.length} default Bull Bull tables`);

    // Start each table with staggered delays
    for (let i = 0; i < newTables.length; i++) {
      const table = newTables[i];
      const delay = i * 7000; // 7 seconds stagger between tables

      initTablePlayerCount(table.id);
      startBBTableLoop(io, table.id, delay).catch((error) => {
        console.error(`[MultiTable-BB] Error in table ${table.name}:`, error);
      });

      console.log(`[MultiTable-BB] Table ${table.name} (${table.id}) loop started with ${delay}ms delay`);
    }
  } else {
    console.log(`[MultiTable-BB] Found ${tables.length} Bull Bull tables in database`);

    // Start each table with staggered delays
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const delay = i * 7000; // 7 seconds stagger between tables

      initTablePlayerCount(table.id);
      startBBTableLoop(io, table.id, delay).catch((error) => {
        console.error(`[MultiTable-BB] Error in table ${table.name}:`, error);
      });

      console.log(`[MultiTable-BB] Table ${table.name} (${table.id}) loop started with ${delay}ms delay`);
    }
  }
}
