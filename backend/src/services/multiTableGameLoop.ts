import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';
import { startTableLoop } from './tableManager.js';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Table configuration
const TABLES = [
  { id: '1', name: 'Table 1', delay: 0 },
  { id: '2', name: 'Table 2', delay: 10000 },     // 10 seconds delay
  { id: '3', name: 'Table 3', delay: 20000 },     // 20 seconds delay
  { id: '4', name: 'Table 4', delay: 30000 },     // 30 seconds delay
];

export async function startMultiTableGameLoop(io: TypedServer): Promise<void> {
  console.log('[MultiTable] Starting multi-table game loops...');
  console.log(`[MultiTable] ${TABLES.length} tables configured`);

  // Start each table with its configured delay
  for (const table of TABLES) {
    // Don't await - let them run independently
    startTableLoop(io, table.id, table.delay).catch((error) => {
      console.error(`[MultiTable] Error in table ${table.id}:`, error);
    });
    console.log(`[MultiTable] Table ${table.id} (${table.name}) loop started with ${table.delay}ms delay`);
  }
}

export { TABLES };
