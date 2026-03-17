import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { BetType, BetStatus, GameResult } from '@prisma/client';
import { z } from 'zod';
import {
  createShoe,
  burnCards,
  playRound,
  calculateBetResult,
  Card,
  RoundResult,
} from '../utils/gameLogic.js';
import { generateRoundNumber } from '../utils/roundNumberGenerator.js';


// In-memory shoe (in production, use Redis)
let currentShoe: Card[] = createShoe();
burnCards(currentShoe);
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
      burnCards(currentShoe);
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
          roundNumber: generateRoundNumber('baccarat_api'),
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
    burnCards(currentShoe);
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

// Get all baccarat game rounds (admin endpoint)
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

// Get all dragon tiger rounds (admin endpoint)
export async function getAllDragonTigerRounds(req: Request, res: Response) {
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
      prisma.dragonTigerRound.findMany({
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
      prisma.dragonTigerRound.count({ where }),
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
    console.error('Get all dragon tiger rounds error:', error);
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

// Get all betting records (admin/agent endpoint for member betting records)
export async function getBettingRecords(req: Request, res: Response) {
  try {
    const currentUser = req.user!;
    const {
      page = '1',
      limit = '20',
      userId,
      username,
      gameType,
      status,
      startDate,
      endDate,
      quickFilter
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build date filter based on quickFilter or explicit dates
    let dateFilter: any = {};
    const now = new Date();

    if (quickFilter) {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (quickFilter) {
        case 'today':
          dateFilter.gte = today;
          dateFilter.lte = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case 'yesterday':
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
          dateFilter.gte = yesterday;
          dateFilter.lte = new Date(today.getTime() - 1);
          break;
        case 'thisWeek':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          dateFilter.gte = startOfWeek;
          dateFilter.lte = now;
          break;
        case 'lastWeek':
          const startOfLastWeek = new Date(today);
          startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
          const endOfLastWeek = new Date(startOfLastWeek);
          endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
          endOfLastWeek.setHours(23, 59, 59, 999);
          dateFilter.gte = startOfLastWeek;
          dateFilter.lte = endOfLastWeek;
          break;
        case 'thisMonth':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter.gte = startOfMonth;
          dateFilter.lte = now;
          break;
        case 'lastMonth':
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          endOfLastMonth.setHours(23, 59, 59, 999);
          dateFilter.gte = startOfLastMonth;
          dateFilter.lte = endOfLastMonth;
          break;
      }
    } else if (startDate || endDate) {
      if (startDate) dateFilter.gte = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
    }

    // Build where clause
    const where: any = {};

    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    // Handle user filtering
    if (username) {
      // Find user by username
      const targetUser = await prisma.user.findFirst({
        where: { username: username as string },
        select: { id: true }
      });
      if (targetUser) {
        where.userId = targetUser.id;
      } else {
        // No user found, return empty
        return res.json({ bets: [], total: 0, stats: { deposit: 0, withdraw: 0, memberWinLoss: 0 } });
      }
    } else if (userId) {
      where.userId = userId;
    }

    // If agent, only show bets from their downline members
    if (currentUser.role === 'agent') {
      // Get all members under this agent using materialized path (single query)
      const agent = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: { materializedPath: true },
      });
      const downlineMembers = agent?.materializedPath
        ? await prisma.user.findMany({
            where: { materializedPath: { startsWith: `${agent.materializedPath}.` }, role: 'member' },
            select: { id: true },
          })
        : [];
      const downlineIds = downlineMembers.map(m => m.id);

      if (where.userId) {
        // Verify the requested user is in agent's downline
        if (!downlineIds.includes(where.userId)) {
          return res.json({ bets: [], total: 0, stats: { deposit: 0, withdraw: 0, memberWinLoss: 0 } });
        }
      } else {
        // Filter to only downline members
        where.userId = { in: downlineIds };
      }
    }

    // Filter by game type if specified
    if (gameType && gameType !== 'all') {
      if (gameType === 'baccarat') {
        where.roundId = { not: null };
        where.dragonTigerRoundId = null;
        where.bullBullRoundId = null;
      } else if (gameType === 'dragontiger') {
        where.dragonTigerRoundId = { not: null };
      } else if (gameType === 'bullbull') {
        where.bullBullRoundId = { not: null };
      }
    }

    // Get bets with user and agent info
    const [bets, total] = await Promise.all([
      prisma.bet.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
              parentAgentId: true,
              parentAgent: {
                select: {
                  id: true,
                  username: true,
                  parentAgentId: true,
                  parentAgent: {
                    select: {
                      id: true,
                      username: true,
                      parentAgentId: true,
                      parentAgent: {
                        select: {
                          id: true,
                          username: true,
                          parentAgentId: true,
                          parentAgent: {
                            select: { id: true, username: true }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          round: {
            select: {
              id: true,
              roundNumber: true,
              result: true
            }
          },
          dragonTigerRound: {
            select: {
              id: true,
              roundNumber: true,
              result: true
            }
          },
          bullBullRound: {
            select: {
              id: true,
              roundNumber: true
            }
          }
        },
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.bet.count({ where })
    ]);

    // Calculate stats for filtered data
    const statsWhere = { ...where };
    const stats = await prisma.bet.aggregate({
      where: statsWhere,
      _sum: {
        amount: true,
        payout: true
      }
    });

    // Build agent hierarchy path for display
    // Shows: "最高層/.../.../直接上層" (the hierarchy from top down to the member's direct parent)
    const buildAgentPath = (user: any, currentUserId: string, currentUserRole: string): string => {
      if (!user.parentAgent) return '';

      const hierarchy: { id: string; username: string }[] = [];
      let agent = user.parentAgent;

      // Walk up the hierarchy and collect all agents
      while (agent) {
        hierarchy.unshift({ id: agent.id, username: agent.username });
        agent = agent.parentAgent;
      }

      if (hierarchy.length === 0) return '';

      // For admin: show all levels
      // For agent: show from current agent's next level down (excluding current agent)
      if (currentUserRole === 'admin') {
        // Show all hierarchy with "/" separator
        return hierarchy.map(a => a.username).join('/');
      } else {
        // For agent: find their position and show from next level down
        const currentAgentIndex = hierarchy.findIndex(a => a.id === currentUserId);
        if (currentAgentIndex >= 0) {
          // Show from next level after current agent
          const relevantHierarchy = hierarchy.slice(currentAgentIndex + 1);
          return relevantHierarchy.map(a => a.username).join('/');
        }
        // If current user not found in hierarchy, show full path
        return hierarchy.map(a => a.username).join('/');
      }
    };

    // Transform bets for response
    const transformedBets = bets.map(bet => {
      const winLoss = bet.status === 'won'
        ? Number(bet.payout) - Number(bet.amount)
        : bet.status === 'lost'
          ? -Number(bet.amount)
          : 0;

      // Determine game type and round number
      let gameName = '百家樂';
      let roundNumber = '';

      if (bet.roundId && bet.round) {
        gameName = '百家樂';
        roundNumber = bet.round.roundNumber;
      } else if (bet.dragonTigerRoundId && bet.dragonTigerRound) {
        gameName = '龍虎';
        roundNumber = bet.dragonTigerRound.roundNumber;
      } else if (bet.bullBullRoundId && bet.bullBullRound) {
        gameName = '牛牛';
        roundNumber = bet.bullBullRound.roundNumber;
      }

      return {
        id: bet.id,
        createdAt: bet.createdAt,
        status: bet.status,
        platform: 'JW 九贏百家',
        gameName,
        roundNumber,
        username: bet.user?.username || '',
        parentAgentPath: buildAgentPath(bet.user, currentUser.userId, currentUser.role),
        amount: Number(bet.amount),
        validBet: Number(bet.amount),
        memberWinLoss: winLoss,
        memberRebate: 0,
        profit: winLoss,
        betType: bet.betType
      };
    });

    // Calculate total member win/loss from stats
    const totalBetAmount = Number(stats._sum.amount || 0);
    const totalPayout = Number(stats._sum.payout || 0);
    const memberWinLoss = totalPayout - totalBetAmount;

    res.json({
      bets: transformedBets,
      total,
      stats: {
        deposit: 0, // Would need to query transactions
        withdraw: 0,
        memberWinLoss
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get betting records error:', error);
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
      include: {
        bettingLimit: true,
        agentBetLimits: {
          where: { enabled: true },
          select: { limitRange: true }
        }
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Parse limit ranges from agentBetLimits (e.g., "100-1000", "500-5000")
    // Get the overall min and max from all enabled limit ranges
    let minBet = DEFAULT_LIMITS.playerMin;
    let maxBet = DEFAULT_LIMITS.playerMax;
    const limitRanges: string[] = [];

    if (user.agentBetLimits && user.agentBetLimits.length > 0) {
      let overallMin = Infinity;
      let overallMax = 0;

      for (const limit of user.agentBetLimits) {
        const parts = limit.limitRange.split('-');
        if (parts.length === 2) {
          const rangeMin = parseInt(parts[0]);
          const rangeMax = parseInt(parts[1]);
          if (!isNaN(rangeMin) && !isNaN(rangeMax)) {
            overallMin = Math.min(overallMin, rangeMin);
            overallMax = Math.max(overallMax, rangeMax);
            limitRanges.push(limit.limitRange);
          }
        }
      }

      if (overallMin !== Infinity && overallMax > 0) {
        minBet = overallMin;
        maxBet = overallMax;
      }
    }

    // Return user's limits based on agentBetLimits or bettingLimit or defaults
    let limits;

    if (limitRanges.length > 0) {
      // Use parsed limits from agentBetLimits
      limits = {
        player: { min: minBet, max: maxBet },
        banker: { min: minBet, max: maxBet },
        tie: { min: minBet, max: maxBet },
        playerPair: { min: minBet, max: maxBet },
        bankerPair: { min: minBet, max: maxBet },
        super6: { min: minBet, max: maxBet },
      };
    } else if (user.bettingLimit) {
      // Fallback to old bettingLimit system
      limits = {
        player: { min: Number(user.bettingLimit.playerMin), max: Number(user.bettingLimit.playerMax) },
        banker: { min: Number(user.bettingLimit.bankerMin), max: Number(user.bettingLimit.bankerMax) },
        tie: { min: Number(user.bettingLimit.tieMin), max: Number(user.bettingLimit.tieMax) },
        playerPair: { min: Number(user.bettingLimit.pairMin), max: Number(user.bettingLimit.pairMax) },
        bankerPair: { min: Number(user.bettingLimit.pairMin), max: Number(user.bettingLimit.pairMax) },
        super6: { min: Number(user.bettingLimit.pairMin), max: Number(user.bettingLimit.pairMax) },
      };
    } else {
      // Default limits
      limits = {
        player: { min: DEFAULT_LIMITS.playerMin, max: DEFAULT_LIMITS.playerMax },
        banker: { min: DEFAULT_LIMITS.bankerMin, max: DEFAULT_LIMITS.bankerMax },
        tie: { min: DEFAULT_LIMITS.tieMin, max: DEFAULT_LIMITS.tieMax },
        playerPair: { min: DEFAULT_LIMITS.pairMin, max: DEFAULT_LIMITS.pairMax },
        bankerPair: { min: DEFAULT_LIMITS.pairMin, max: DEFAULT_LIMITS.pairMax },
        super6: { min: DEFAULT_LIMITS.pairMin, max: DEFAULT_LIMITS.pairMax },
      };
    }

    res.json({
      limitName: limitRanges.length > 0 ? limitRanges.join(', ') : (user.bettingLimit?.name || 'Default'),
      limits,
      limitRanges, // Also return the raw limit ranges for display
    });
  } catch (error) {
    console.error('Get my limits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
