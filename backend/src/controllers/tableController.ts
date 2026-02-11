import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getPhase, getTimeRemaining } from '../services/gameState.js';
import { getTableCachedRoadmap } from '../services/tableManager.js';
import { getDTTableCachedRoadmap } from '../services/dragonTigerTableManager.js';
import { getBBTableCachedRoadmap } from '../services/bullBullTableManager.js';


// Calculate if a table has "good road" based on consecutive results
function calculateGoodRoad(roadmap: { banker: number; player: number; tie: number }): boolean {
  const total = roadmap.banker + roadmap.player;
  if (total < 6) return false;
  // Consider it a "good road" if one side is winning by 3 or more
  return Math.abs(roadmap.banker - roadmap.player) >= 3;
}

/**
 * 獲取所有桌台列表
 * GET /api/tables
 */
export async function getTables(req: Request, res: Response) {
  try {
    const { gameType, active } = req.query;

    const where: { gameType?: string; isActive?: boolean } = {};
    if (gameType && typeof gameType === 'string') {
      where.gameType = gameType;
    }
    if (active !== undefined) {
      where.isActive = active === 'true';
    } else {
      where.isActive = true; // Default to active tables only
    }

    // Fetch tables (no JOIN — fast query)
    const tables = await prisma.gameTable.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Build road history for each table — try cache first, fallback to DB
    const tableIds = tables.map((t) => t.id);
    const roadHistoryMap = new Map<string, Array<{ roundNumber: number; result: string; playerPair: boolean; bankerPair: boolean }>>();

    // First, try to get from in-memory cache
    for (const table of tables) {
      let cached: any[] = [];
      if (table.gameType === 'baccarat') {
        cached = getTableCachedRoadmap(table.id);
      } else if (table.gameType === 'dragonTiger') {
        cached = getDTTableCachedRoadmap(table.id);
      } else if (table.gameType === 'bullBull') {
        cached = getBBTableCachedRoadmap(table.id);
      }

      if (cached.length > 0) {
        roadHistoryMap.set(table.id, cached.map((r: any) => {
          let result: string;
          if (table.gameType === 'dragonTiger') {
            result = r.result === 'dragon' ? 'banker' : r.result === 'tiger' ? 'player' : (r.result === 'dt_tie' ? 'tie' : r.result);
          } else if (table.gameType === 'bullBull') {
            // Bull Bull cache has player1Result/player2Result/player3Result instead of result
            let bankerWins = 0;
            if (r.player1Result === 'lose') bankerWins++;
            if (r.player2Result === 'lose') bankerWins++;
            if (r.player3Result === 'lose') bankerWins++;
            result = bankerWins >= 2 ? 'banker' : 'player';
          } else {
            result = r.result || 'tie';
          }
          return {
            roundNumber: r.roundNumber,
            result,
            playerPair: r.playerPair ?? false,
            bankerPair: r.bankerPair ?? false,
          };
        }));
      }
    }

    // For tables with empty cache, batch-fetch from DB (filtered by current shoe)
    const uncachedTableIds = tableIds.filter((id) => !roadHistoryMap.has(id));
    const shoeMap = new Map(tables.map((t) => [t.id, t.shoeNumber]));
    if (uncachedTableIds.length > 0) {
      // Fetch baccarat rounds filtered by current shoeNumber
      const uncachedBaccaratIds = uncachedTableIds.filter((id) =>
        tables.find((t) => t.id === id)?.gameType === 'baccarat'
      );
      if (uncachedBaccaratIds.length > 0) {
        const dbRounds = await prisma.gameRound.findMany({
          where: {
            OR: uncachedBaccaratIds.map((id) => ({
              tableId: id,
              shoeNumber: shoeMap.get(id) || 1,
            })),
          },
          orderBy: { createdAt: 'asc' },
          select: {
            tableId: true,
            roundNumber: true,
            result: true,
            playerPair: true,
            bankerPair: true,
          },
          take: uncachedBaccaratIds.length * 100,
        });

        for (const round of dbRounds) {
          if (!round.tableId) continue;
          const existing = roadHistoryMap.get(round.tableId) || [];
          existing.push({
            roundNumber: round.roundNumber,
            result: round.result,
            playerPair: round.playerPair,
            bankerPair: round.bankerPair,
          });
          roadHistoryMap.set(round.tableId, existing);
        }
      }

      // Also try DragonTiger rounds for uncached DT tables
      const uncachedDTIds = uncachedTableIds.filter((id) =>
        tables.find((t) => t.id === id)?.gameType === 'dragonTiger'
      );
      if (uncachedDTIds.length > 0) {
        const dtRounds = await prisma.dragonTigerRound.findMany({
          where: {
            OR: uncachedDTIds.map((id) => ({
              tableId: id,
              shoeNumber: shoeMap.get(id) || 1,
            })),
          },
          orderBy: { createdAt: 'asc' },
          select: {
            tableId: true,
            roundNumber: true,
            result: true,
          },
          take: uncachedDTIds.length * 100,
        });
        for (const round of dtRounds) {
          if (!round.tableId) continue;
          const existing = roadHistoryMap.get(round.tableId) || [];
          const mappedResult = round.result === 'dragon' ? 'banker' : round.result === 'tiger' ? 'player' : 'tie';
          existing.push({
            roundNumber: round.roundNumber,
            result: mappedResult,
            playerPair: false,
            bankerPair: false,
          });
          roadHistoryMap.set(round.tableId, existing);
        }
      }

      // Also try BullBull rounds for uncached BB tables
      const uncachedBBIds = uncachedTableIds.filter((id) =>
        tables.find((t) => t.id === id)?.gameType === 'bullBull'
      );
      if (uncachedBBIds.length > 0) {
        const bbRounds = await prisma.bullBullRound.findMany({
          where: {
            OR: uncachedBBIds.map((id) => ({
              tableId: id,
              shoeNumber: shoeMap.get(id) || 1,
            })),
          },
          orderBy: { createdAt: 'asc' },
          select: {
            tableId: true,
            roundNumber: true,
            player1Result: true,
            player2Result: true,
            player3Result: true,
          },
          take: uncachedBBIds.length * 100,
        });
        for (const round of bbRounds) {
          if (!round.tableId) continue;
          const existing = roadHistoryMap.get(round.tableId) || [];
          let bankerWins = 0;
          if (round.player1Result === 'lose') bankerWins++;
          if (round.player2Result === 'lose') bankerWins++;
          if (round.player3Result === 'lose') bankerWins++;
          existing.push({
            roundNumber: round.roundNumber,
            result: bankerWins >= 2 ? 'banker' : 'player',
            playerPair: false,
            bankerPair: false,
          });
          roadHistoryMap.set(round.tableId, existing);
        }
      }
    }

    const formattedTables = tables.map((table) => {
      const roadmap = {
        banker: table.bankerWins,
        player: table.playerWins,
        tie: table.tieCount,
      };

      const roadHistory = roadHistoryMap.get(table.id) || [];

      // Derive lastResults from roadHistory for backward compatibility
      const lastResults = roadHistory.slice(-8).map((r) => r.result);

      return {
        id: table.id,
        name: table.name,
        dealer: table.dealerName,
        dealerAvatar: table.dealerAvatar || '',
        gameType: table.gameType,
        minBet: Number(table.minBet),
        maxBet: Number(table.maxBet),
        players: table.currentPlayers,
        isActive: table.isActive,
        shoeNumber: table.shoeNumber,
        roundNumber: table.roundNumber,
        roadmap,
        lastResults,
        roadHistory,
        status: getPhase(),
        countdown: getTimeRemaining(),
        hasGoodRoad: calculateGoodRoad(roadmap),
      };
    });

    res.json({ tables: formattedTables });
  } catch (error) {
    console.error('[Tables] Error fetching tables:', error);
    res.status(500).json({ error: 'Failed to fetch tables' });
  }
}

/**
 * 獲取單一桌台詳情
 * GET /api/tables/:id
 */
export async function getTable(req: Request, res: Response) {
  try {
    const id = req.params.id as string;

    const table = await prisma.gameTable.findUnique({
      where: { id },
      include: {
        // Include last 20 rounds for this table
        gameRounds: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: { result: true },
        },
      },
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Get last results from this table's rounds
    const lastResults = table.gameRounds.map((r) => r.result);

    const roadmap = {
      banker: table.bankerWins,
      player: table.playerWins,
      tie: table.tieCount,
    };

    res.json({
      id: table.id,
      name: table.name,
      dealer: table.dealerName,
      dealerAvatar: table.dealerAvatar || '',
      gameType: table.gameType,
      minBet: Number(table.minBet),
      maxBet: Number(table.maxBet),
      players: table.currentPlayers,
      isActive: table.isActive,
      shoeNumber: table.shoeNumber,
      roundNumber: table.roundNumber,
      roadmap,
      lastResults,
      status: getPhase(),
      countdown: getTimeRemaining(),
      hasGoodRoad: calculateGoodRoad(roadmap),
    });
  } catch (error) {
    console.error('[Tables] Error fetching table:', error);
    res.status(500).json({ error: 'Failed to fetch table' });
  }
}

/**
 * 創建桌台 (管理員)
 * POST /api/tables
 */
export async function createTable(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, dealerName, gameType = 'baccarat', minBet, maxBet, sortOrder = 0 } = req.body;

    if (!name || !dealerName) {
      return res.status(400).json({ error: 'Name and dealer name are required' });
    }

    const table = await prisma.gameTable.create({
      data: {
        name,
        dealerName,
        gameType,
        minBet: minBet || 10,
        maxBet: maxBet || 100000,
        sortOrder,
      },
    });

    res.status(201).json({
      id: table.id,
      name: table.name,
      dealer: table.dealerName,
      gameType: table.gameType,
      minBet: Number(table.minBet),
      maxBet: Number(table.maxBet),
      isActive: table.isActive,
    });
  } catch (error) {
    console.error('[Tables] Error creating table:', error);
    res.status(500).json({ error: 'Failed to create table' });
  }
}

/**
 * 更新桌台 (管理員)
 * PUT /api/tables/:id
 */
export async function updateTable(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = req.params.id as string;
    const { name, dealerName, gameType, minBet, maxBet, isActive, sortOrder } = req.body;

    const table = await prisma.gameTable.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(dealerName && { dealerName }),
        ...(gameType && { gameType }),
        ...(minBet !== undefined && { minBet }),
        ...(maxBet !== undefined && { maxBet }),
        ...(isActive !== undefined && { isActive }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    res.json({
      id: table.id,
      name: table.name,
      dealer: table.dealerName,
      gameType: table.gameType,
      minBet: Number(table.minBet),
      maxBet: Number(table.maxBet),
      isActive: table.isActive,
    });
  } catch (error) {
    console.error('[Tables] Error updating table:', error);
    res.status(500).json({ error: 'Failed to update table' });
  }
}

/**
 * 刪除桌台 (管理員)
 * DELETE /api/tables/:id
 */
export async function deleteTable(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const id = req.params.id as string;

    await prisma.gameTable.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[Tables] Error deleting table:', error);
    res.status(500).json({ error: 'Failed to delete table' });
  }
}
