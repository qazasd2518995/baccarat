import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPhase, getTimeRemaining } from '../services/gameState.js';

const prisma = new PrismaClient();

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

    const tables = await prisma.gameTable.findMany({
      where,
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Fetch recent game results for lastResults
    const recentRounds = await prisma.gameRound.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { result: true },
    });
    const lastResults = recentRounds.map((r) => r.result);

    const formattedTables = tables.map((table) => {
      const roadmap = {
        banker: table.bankerWins,
        player: table.playerWins,
        tie: table.tieCount,
      };

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
    });

    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    // Fetch recent game results for lastResults
    const recentRounds = await prisma.gameRound.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { result: true },
    });
    const lastResults = recentRounds.map((r) => r.result);

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
