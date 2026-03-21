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
  // 荷官網名（現代風格，不與現有 seed 名字重複）
  const dealerNames = [
    '詩涵', '小魚', '蜜桃', '棉花糖', 'Yuki',      // B1-B5（原有）
    '草莓', '奶茶', 'Momo', '甜甜', '小鹿',          // B6-B10（新增）
    '小櫻', '可可', '布丁', '泡芙', 'Nana',          // 極速 B1-B5
    '果凍', '豆花', 'Suki', '軟糖', '芒果',          // 極速 B6-B10
  ];
  const expectedTables = [
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `百家樂 B${i + 1}`, dealerName: dealerNames[i], sortOrder: i + 1, bettingDuration: 30,
    })),
    ...Array.from({ length: 10 }, (_, i) => ({
      name: `極速百家樂 B${i + 1}`, dealerName: dealerNames[i + 10], sortOrder: i + 11, bettingDuration: 15,
    })),
  ];

  // Create missing tables & sync dealer names on existing tables
  const existingByName = new Map(tables.map(t => [t.name, t]));
  for (const expected of expectedTables) {
    const existing = existingByName.get(expected.name);
    if (!existing) {
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
    } else if (existing.dealerName !== expected.dealerName) {
      // Sync dealer name if it changed
      await prisma.gameTable.update({
        where: { id: existing.id },
        data: { dealerName: expected.dealerName },
      });
      console.log(`[MultiTable] Updated dealer name: ${expected.name} → ${expected.dealerName}`);
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
