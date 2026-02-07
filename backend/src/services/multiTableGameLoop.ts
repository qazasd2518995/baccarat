import { Server } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';
import { startTableLoop } from './tableManager.js';


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

  if (tables.length === 0) {
    console.log('[MultiTable] No baccarat tables found in database, creating default tables...');

    // Create default tables if none exist
    const defaultTables = [
      { name: 'B1', dealerName: 'Dealer 1', sortOrder: 1 },
      { name: 'B2', dealerName: 'Dealer 2', sortOrder: 2 },
      { name: 'B3', dealerName: 'Dealer 3', sortOrder: 3 },
      { name: 'B4', dealerName: 'Dealer 4', sortOrder: 4 },
      { name: 'B5', dealerName: 'Dealer 5', sortOrder: 5 },
    ];

    for (const table of defaultTables) {
      await prisma.gameTable.create({
        data: {
          name: table.name,
          dealerName: table.dealerName,
          gameType: 'baccarat',
          minBet: 10,
          maxBet: 10000,
          isActive: true,
          sortOrder: table.sortOrder,
        },
      });
    }

    // Re-fetch tables
    const newTables = await prisma.gameTable.findMany({
      where: { gameType: 'baccarat', isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    console.log(`[MultiTable] Created ${newTables.length} default baccarat tables`);

    // Start each table with staggered delays
    for (let i = 0; i < newTables.length; i++) {
      const table = newTables[i];
      const delay = i * 7000; // 7 seconds stagger between tables

      startTableLoop(io, table.id, delay).catch((error) => {
        console.error(`[MultiTable] Error in table ${table.name}:`, error);
      });

      console.log(`[MultiTable] Table ${table.name} (${table.id}) loop started with ${delay}ms delay`);
    }
  } else {
    console.log(`[MultiTable] Found ${tables.length} baccarat tables in database`);

    // Start each table with staggered delays
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      const delay = i * 7000; // 7 seconds stagger between tables

      startTableLoop(io, table.id, delay).catch((error) => {
        console.error(`[MultiTable] Error in table ${table.name}:`, error);
      });

      console.log(`[MultiTable] Table ${table.name} (${table.id}) loop started with ${delay}ms delay`);
    }
  }
}
