import { Request, Response } from 'express';
import { PrismaClient, BetType, BetStatus, GameResult } from '@prisma/client';
import { z } from 'zod';
import {
  createShoe,
  playRound,
  calculateBetResult,
  Card,
  RoundResult,
} from '../utils/gameLogic.js';

const prisma = new PrismaClient();

// In-memory shoe (in production, use Redis)
let currentShoe: Card[] = createShoe();
let currentShoeNumber = 1;

const placeBetSchema = z.object({
  bets: z.array(
    z.object({
      type: z.enum(['player', 'banker', 'tie', 'player_pair', 'banker_pair', 'super_six']),
      amount: z.number().positive(),
    })
  ),
});

// Get current game state
export async function getGameState(req: Request, res: Response) {
  try {
    const currentUser = req.user!;

    // Get user balance
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: { balance: true },
    });

    // Get recent rounds
    const recentRounds = await prisma.gameRound.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        roundNumber: true,
        shoeNumber: true,
        playerCards: true,
        bankerCards: true,
        playerPoints: true,
        bankerPoints: true,
        result: true,
        playerPair: true,
        bankerPair: true,
        createdAt: true,
      },
    });

    res.json({
      balance: user?.balance || 0,
      shoeNumber: currentShoeNumber,
      cardsRemaining: currentShoe.length,
      recentRounds: recentRounds.reverse(),
    });
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Place bets and play a round
export async function playGame(req: Request, res: Response) {
  try {
    const { bets } = placeBetSchema.parse(req.body);
    const currentUser = req.user!;

    // Calculate total bet amount
    const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);

    // Get user with balance
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (Number(user.balance) < totalBetAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check if shoe needs reshuffle (less than 20 cards)
    if (currentShoe.length < 20) {
      currentShoe = createShoe();
      currentShoeNumber++;
    }

    // Play the round
    const roundResult = playRound(currentShoe);

    // Calculate payouts for each bet
    const betResults = bets.map((bet) => {
      const result = calculateBetResult(bet.type, bet.amount, roundResult);
      return {
        ...bet,
        ...result,
      };
    });

    // Calculate total payout
    const totalPayout = betResults.reduce((sum, bet) => sum + bet.payout, 0);
    const newBalance = Number(user.balance) + totalPayout;

    // Save to database
    const result = await prisma.$transaction(async (tx) => {
      // Create game round
      const gameRound = await tx.gameRound.create({
        data: {
          shoeNumber: currentShoeNumber,
          playerCards: roundResult.playerCards as any,
          bankerCards: roundResult.bankerCards as any,
          playerPoints: roundResult.playerPoints,
          bankerPoints: roundResult.bankerPoints,
          result: roundResult.result as GameResult,
          playerPair: roundResult.playerPair,
          bankerPair: roundResult.bankerPair,
        },
      });

      // Create bet records
      const betRecords = await Promise.all(
        betResults.map((bet) =>
          tx.bet.create({
            data: {
              userId: user.id,
              roundId: gameRound.id,
              betType: bet.type as BetType,
              amount: bet.amount,
              payout: bet.won ? bet.payout + bet.amount : 0,
              status: bet.won ? 'won' : (bet.payout === 0 ? 'refunded' : 'lost'),
            },
          })
        )
      );

      // Update user balance
      await tx.user.update({
        where: { id: user.id },
        data: { balance: newBalance },
      });

      // Create transaction records for bets
      const balanceBefore = Number(user.balance);

      // Bet transaction (deduct)
      await tx.transaction.create({
        data: {
          userId: user.id,
          operatorId: user.id,
          type: 'bet',
          amount: -totalBetAmount,
          balanceBefore,
          balanceAfter: balanceBefore - totalBetAmount,
          note: `Round #${gameRound.roundNumber}`,
        },
      });

      // Win transaction (if any)
      if (totalPayout > 0) {
        const winAmount = totalPayout + totalBetAmount; // Total returned
        await tx.transaction.create({
          data: {
            userId: user.id,
            operatorId: user.id,
            type: 'win',
            amount: winAmount,
            balanceBefore: balanceBefore - totalBetAmount,
            balanceAfter: newBalance,
            note: `Round #${gameRound.roundNumber}`,
          },
        });
      }

      return { gameRound, betRecords };
    });

    res.json({
      round: {
        id: result.gameRound.id,
        roundNumber: result.gameRound.roundNumber,
        shoeNumber: result.gameRound.shoeNumber,
        playerCards: roundResult.playerCards,
        bankerCards: roundResult.bankerCards,
        playerPoints: roundResult.playerPoints,
        bankerPoints: roundResult.bankerPoints,
        result: roundResult.result,
        playerPair: roundResult.playerPair,
        bankerPair: roundResult.bankerPair,
      },
      bets: betResults,
      totalBet: totalBetAmount,
      totalPayout: totalPayout > 0 ? totalPayout + totalBetAmount : 0,
      netResult: totalPayout,
      newBalance,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Play game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get game history (all game types: Baccarat, Dragon Tiger, Bull Bull)
export async function getGameHistory(req: Request, res: Response) {
  try {
    const { page = '1', limit = '50', from, to } = req.query;
    const currentUser = req.user!;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build date filter
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from as string);
    if (to) {
      const toDate = new Date(to as string);
      toDate.setHours(23, 59, 59, 999);
      dateFilter.lte = toDate;
    }

    const where: any = { userId: currentUser.userId };
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    // Query all bets with their associated rounds
    const [bets, total] = await Promise.all([
      prisma.bet.findMany({
        where,
        include: {
          round: {
            include: {
              table: {
                select: { id: true, name: true },
              },
            },
          },
          dragonTigerRound: true,
          bullBullRound: true,
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.bet.count({ where }),
    ]);

    // Group bets by round (since multiple bets can be in the same round)
    const roundsMap = new Map<string, any>();

    for (const bet of bets) {
      // Determine which round this bet belongs to
      let roundKey: string;
      let roundData: any;
      let gameType: string;

      if (bet.roundId && bet.round) {
        // Baccarat
        roundKey = `baccarat-${bet.roundId}`;
        gameType = 'baccarat';
        roundData = {
          id: bet.round.id,
          roundNumber: bet.round.roundNumber,
          shoeNumber: bet.round.shoeNumber,
          result: bet.round.result,
          playerCards: bet.round.playerCards,
          bankerCards: bet.round.bankerCards,
          playerPoints: bet.round.playerPoints,
          bankerPoints: bet.round.bankerPoints,
          playerPair: bet.round.playerPair,
          bankerPair: bet.round.bankerPair,
          createdAt: bet.round.createdAt,
          table: bet.round.table,
          gameType,
        };
      } else if (bet.dragonTigerRoundId && bet.dragonTigerRound) {
        // Dragon Tiger
        roundKey = `dragontiger-${bet.dragonTigerRoundId}`;
        gameType = 'dragontiger';
        roundData = {
          id: bet.dragonTigerRound.id,
          roundNumber: bet.dragonTigerRound.roundNumber,
          shoeNumber: bet.dragonTigerRound.shoeNumber,
          result: bet.dragonTigerRound.result,
          dragonCard: bet.dragonTigerRound.dragonCard,
          tigerCard: bet.dragonTigerRound.tigerCard,
          dragonValue: bet.dragonTigerRound.dragonValue,
          tigerValue: bet.dragonTigerRound.tigerValue,
          isSuitedTie: bet.dragonTigerRound.isSuitedTie,
          createdAt: bet.dragonTigerRound.createdAt,
          table: null,
          gameType,
        };
      } else if (bet.bullBullRoundId && bet.bullBullRound) {
        // Bull Bull
        roundKey = `bullbull-${bet.bullBullRoundId}`;
        gameType = 'bullbull';
        roundData = {
          id: bet.bullBullRound.id,
          roundNumber: bet.bullBullRound.roundNumber,
          shoeNumber: bet.bullBullRound.shoeNumber,
          result: `${bet.bullBullRound.player1Result}/${bet.bullBullRound.player2Result}/${bet.bullBullRound.player3Result}`,
          bankerCards: bet.bullBullRound.bankerCards,
          player1Cards: bet.bullBullRound.player1Cards,
          player2Cards: bet.bullBullRound.player2Cards,
          player3Cards: bet.bullBullRound.player3Cards,
          bankerRank: bet.bullBullRound.bankerRank,
          player1Rank: bet.bullBullRound.player1Rank,
          player2Rank: bet.bullBullRound.player2Rank,
          player3Rank: bet.bullBullRound.player3Rank,
          player1Result: bet.bullBullRound.player1Result,
          player2Result: bet.bullBullRound.player2Result,
          player3Result: bet.bullBullRound.player3Result,
          createdAt: bet.bullBullRound.createdAt,
          table: null,
          gameType,
        };
      } else {
        // Unknown or orphaned bet, skip
        continue;
      }

      // Add or merge into existing round
      if (!roundsMap.has(roundKey)) {
        roundsMap.set(roundKey, {
          ...roundData,
          bets: [],
        });
      }

      roundsMap.get(roundKey).bets.push({
        id: bet.id,
        betType: bet.betType,
        amount: Number(bet.amount),
        payout: bet.payout ? Number(bet.payout) : 0,
        status: bet.status,
      });
    }

    // Convert to array and sort by createdAt desc
    const rounds = Array.from(roundsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({
      rounds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get game history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get roadmap data (for display)
export async function getRoadmap(req: Request, res: Response) {
  try {
    const { shoeNumber } = req.query;

    const where = shoeNumber ? { shoeNumber: parseInt(shoeNumber as string) } : {};

    const rounds = await prisma.gameRound.findMany({
      where,
      select: {
        id: true,
        roundNumber: true,
        result: true,
        playerPair: true,
        bankerPair: true,
      },
      orderBy: { roundNumber: 'asc' },
      take: 200,
    });

    res.json(rounds);
  } catch (error) {
    console.error('Get roadmap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Start new shoe
export async function newShoe(req: Request, res: Response) {
  try {
    const currentUser = req.user!;

    // Only admin can start new shoe
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    currentShoe = createShoe();
    currentShoeNumber++;

    res.json({
      message: 'New shoe started',
      shoeNumber: currentShoeNumber,
      cardsRemaining: currentShoe.length,
    });
  } catch (error) {
    console.error('New shoe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get all game rounds (admin endpoint)
export async function getAllRounds(req: Request, res: Response) {
  try {
    const { page = '1', limit = '20', result, from, to } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (result && result !== 'all') {
      where.result = result as string;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) {
        const toDate = new Date(to as string);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    const [rounds, total] = await Promise.all([
      prisma.gameRound.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { bets: true },
          },
        },
      }),
      prisma.gameRound.count({ where }),
    ]);

    res.json({
      rounds,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get all rounds error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get bet statistics for user
export async function getBetStats(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const { startDate, endDate } = req.query;

    const where: any = { userId: currentUser.userId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const stats = await prisma.bet.groupBy({
      by: ['betType', 'status'],
      where,
      _sum: {
        amount: true,
        payout: true,
      },
      _count: true,
    });

    // Calculate totals
    const totals = await prisma.bet.aggregate({
      where,
      _sum: {
        amount: true,
        payout: true,
      },
      _count: true,
    });

    res.json({
      byType: stats,
      totals: {
        totalBets: totals._count,
        totalBetAmount: totals._sum.amount || 0,
        totalPayout: totals._sum.payout || 0,
        netResult: Number(totals._sum.payout || 0) - Number(totals._sum.amount || 0),
      },
    });
  } catch (error) {
    console.error('Get bet stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Default betting limits
const DEFAULT_LIMITS = {
  playerMin: 10, playerMax: 100000,
  bankerMin: 10, bankerMax: 100000,
  tieMin: 10, tieMax: 50000,
  pairMin: 10, pairMax: 50000,
};

// Get current user's betting limits
export async function getMyLimits(req: Request, res: Response) {
  try {
    const currentUser = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      include: { bettingLimit: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user's limits or defaults
    const limits = user.bettingLimit
      ? {
          player: { min: Number(user.bettingLimit.playerMin), max: Number(user.bettingLimit.playerMax) },
          banker: { min: Number(user.bettingLimit.bankerMin), max: Number(user.bettingLimit.bankerMax) },
          tie: { min: Number(user.bettingLimit.tieMin), max: Number(user.bettingLimit.tieMax) },
          playerPair: { min: Number(user.bettingLimit.pairMin), max: Number(user.bettingLimit.pairMax) },
          bankerPair: { min: Number(user.bettingLimit.pairMin), max: Number(user.bettingLimit.pairMax) },
          super6: { min: Number(user.bettingLimit.pairMin), max: Number(user.bettingLimit.pairMax) },
        }
      : {
          player: { min: DEFAULT_LIMITS.playerMin, max: DEFAULT_LIMITS.playerMax },
          banker: { min: DEFAULT_LIMITS.bankerMin, max: DEFAULT_LIMITS.bankerMax },
          tie: { min: DEFAULT_LIMITS.tieMin, max: DEFAULT_LIMITS.tieMax },
          playerPair: { min: DEFAULT_LIMITS.pairMin, max: DEFAULT_LIMITS.pairMax },
          bankerPair: { min: DEFAULT_LIMITS.pairMin, max: DEFAULT_LIMITS.pairMax },
          super6: { min: DEFAULT_LIMITS.pairMin, max: DEFAULT_LIMITS.pairMax },
        };

    res.json({
      limitName: user.bettingLimit?.name || 'Default',
      limits,
    });
  } catch (error) {
    console.error('Get my limits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
