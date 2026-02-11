import { Server } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import { createShoe, burnCards, playBullBullRound, calculateBBBetResult, getRankDisplayName, type Card, type BullBullRoundResult, type BullBullBetType, type HandResult } from '../utils/bullBullLogic.js';
import { applyWinCap } from '../utils/winCapCheck.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';


// Type-safe Socket.io server
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Game phases
type GamePhase = 'betting' | 'sealed' | 'dealing' | 'result';

// Phase durations in milliseconds
const PHASE_DURATIONS: Record<GamePhase, number> = {
  betting: 35000,    // 35 seconds
  sealed: 3000,      // 3 seconds
  dealing: 15000,    // 15 seconds (20 cards total)
  result: 5000,      // 5 seconds
};

// Bet entry for Bull Bull
interface BBBetEntry {
  type: BullBullBetType;
  amount: number;
}

// Table state interface
interface BBTableState {
  tableId: string;
  tableName: string;
  phase: GamePhase;
  timeRemaining: number;
  roundId: string | null;
  roundNumber: number;
  shoeNumber: number;
  cardsRemaining: number;
  currentShoe: Card[];
  currentRound: {
    id: string;
    roundNumber: number;
    shoeNumber: number;
    startedAt: Date;
    banker: HandResult | null;
    player1: HandResult | null;
    player2: HandResult | null;
    player3: HandResult | null;
    player1Result: 'win' | 'lose' | null;
    player2Result: 'win' | 'lose' | null;
    player3Result: 'win' | 'lose' | null;
  } | null;
  currentBets: Map<string, BBBetEntry[]>;
  timerInterval: NodeJS.Timeout | null;
  cachedRoadmap: any[];
}

// Store all table states
const tables = new Map<string, BBTableState>();

// Get or create table state
function getTableState(tableId: string): BBTableState {
  if (!tables.has(tableId)) {
    const shoe = createShoe();
    burnCards(shoe);
    const state: BBTableState = {
      tableId,
      tableName: `BB Table ${tableId}`,
      phase: 'betting',
      timeRemaining: 0,
      roundId: null,
      roundNumber: 0,
      shoeNumber: 1,
      cardsRemaining: shoe.length,
      currentShoe: shoe,
      currentRound: null,
      currentBets: new Map(),
      timerInterval: null,
      cachedRoadmap: [],
    };
    tables.set(tableId, state);
  }
  return tables.get(tableId)!;
}

// Load table state from DB on startup
async function loadTableState(tableId: string): Promise<void> {
  try {
    const saved = await prisma.gameTableState.findUnique({
      where: { tableId },
    });
    if (saved && saved.shuffledDeck) {
      const state = getTableState(tableId);
      state.shoeNumber = saved.shoeNumber;
      state.roundNumber = saved.roundCounter;
      state.currentShoe = saved.shuffledDeck as unknown as Card[];
      state.cardsRemaining = saved.cardsRemaining;
      console.log(`[BB Table ${tableId}] Loaded persisted state: shoe #${state.shoeNumber}, round #${state.roundNumber}`);
    }
  } catch (error) {
    console.error(`[BB Table ${tableId}] Failed to load persisted state:`, error);
  }
}

// Save table state to DB
async function saveTableState(tableId: string): Promise<void> {
  const state = tables.get(tableId);
  if (!state) return;
  try {
    await prisma.gameTableState.upsert({
      where: { tableId },
      update: {
        shoeNumber: state.shoeNumber,
        roundCounter: state.roundNumber,
        cardsRemaining: state.cardsRemaining,
        shuffledDeck: state.currentShoe as any,
      },
      create: {
        tableId,
        gameType: 'bull_bull',
        shoeNumber: state.shoeNumber,
        roundCounter: state.roundNumber,
        cardsRemaining: state.cardsRemaining,
        shuffledDeck: state.currentShoe as any,
      },
    });
  } catch (error) {
    console.error(`[BB Table ${tableId}] Failed to save state:`, error);
  }
}

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get Socket.io room name for a table
function getTableRoom(tableId: string): string {
  return `table:bullbull:${tableId}`;
}

// ============================================
// Table Game Loop
// ============================================

export async function startBBTableLoop(io: TypedServer, tableId: string, startDelay: number = 0): Promise<void> {
  console.log(`[BB Table ${tableId}] Starting game loop with ${startDelay}ms delay...`);

  if (startDelay > 0) {
    await delay(startDelay);
  }

  await loadTableState(tableId);
  const state = getTableState(tableId);
  if (!state.currentShoe || state.currentShoe.length < 30) {
    state.currentShoe = createShoe();
    burnCards(state.currentShoe);
    state.cardsRemaining = state.currentShoe.length;
  }

  // Preload roadmap cache from DB
  state.cachedRoadmap = await getBBTableRecentRounds(tableId, 100);
  console.log(`[BB Table ${tableId}] Shoe ready with ${state.cardsRemaining} cards, roadmap cached (${state.cachedRoadmap.length} rounds)`);

  runTablePhase(io, tableId, 'betting');
}

async function runTablePhase(io: TypedServer, tableId: string, phase: GamePhase): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);

  console.log(`[BB Table ${tableId}] Entering phase: ${phase}`);
  state.phase = phase;

  const duration = PHASE_DURATIONS[phase];
  state.timeRemaining = Math.floor(duration / 1000);

  switch (phase) {
    case 'betting':
      await handleTableBettingPhase(io, tableId, duration, state.timeRemaining);
      break;
    case 'sealed':
      await handleTableSealedPhase(io, tableId, duration);
      break;
    case 'dealing':
      await handleTableDealingPhase(io, tableId);
      break;
    case 'result':
      await handleTableResultPhase(io, tableId, duration);
      break;
  }
}

async function handleTableBettingPhase(
  io: TypedServer,
  tableId: string,
  duration: number,
  timeRemaining: number
): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);

  // Create new round
  state.roundNumber++;
  state.currentRound = {
    id: `bb-table-${tableId}-round-${Date.now()}-${state.roundNumber}`,
    roundNumber: state.roundNumber,
    shoeNumber: state.shoeNumber,
    startedAt: new Date(),
    banker: null,
    player1: null,
    player2: null,
    player3: null,
    player1Result: null,
    player2Result: null,
    player3Result: null,
  };
  state.roundId = state.currentRound.id;

  console.log(`[BB Table ${tableId}] New round #${state.roundNumber} started in shoe #${state.shoeNumber}`);

  // Broadcast phase change
  io.to(roomName).emit('bb:phase' as any, {
    phase: 'betting',
    timeRemaining,
    roundId: state.roundId,
  });

  // Get table from database for lobby updates
  const dbTable = await prisma.gameTable.findFirst({
    where: { id: tableId },
  });

  // Broadcast to lobby
  if (dbTable) {
    io.to('lobby').emit('lobby:tableUpdate', {
      tableId: dbTable.id,
      phase: 'betting',
      timeRemaining,
      roundNumber: state.roundNumber,
      shoeNumber: state.shoeNumber,
      roadmap: {
        banker: dbTable.bankerWins,
        player: dbTable.playerWins,
        tie: dbTable.tieCount,
      },
    });
  }

  // Timer tick
  state.timerInterval = setInterval(() => {
    state.timeRemaining--;
    io.to(roomName).emit('bb:timer' as any, {
      timeRemaining: state.timeRemaining,
      phase: 'betting',
    });

    // Also update lobby with countdown
    if (dbTable) {
      io.to('lobby').emit('lobby:tableUpdate', {
        tableId: dbTable.id,
        phase: 'betting',
        timeRemaining: state.timeRemaining,
        roundNumber: state.roundNumber,
        shoeNumber: state.shoeNumber,
        roadmap: {
          banker: dbTable.bankerWins,
          player: dbTable.playerWins,
          tie: dbTable.tieCount,
        },
      });
    }

    if (state.timeRemaining <= 0 && state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }, 1000);

  await delay(duration);

  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }

  runTablePhase(io, tableId, 'sealed');
}

async function handleTableSealedPhase(io: TypedServer, tableId: string, duration: number): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);

  io.to(roomName).emit('bb:phase' as any, {
    phase: 'sealed',
    timeRemaining: Math.floor(duration / 1000),
    roundId: state.roundId,
  });

  console.log(`[BB Table ${tableId}] Betting sealed, no more bets`);

  await delay(duration);
  runTablePhase(io, tableId, 'dealing');
}

async function handleTableDealingPhase(io: TypedServer, tableId: string): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);

  // Check for reshuffle (need at least 30 cards)
  if (state.currentShoe.length < 30) {
    state.shoeNumber++;
    state.roundNumber = 0;
    state.cachedRoadmap = [];
    state.currentShoe = createShoe();
    burnCards(state.currentShoe);
    state.cardsRemaining = state.currentShoe.length;

    // Reset GameTable statistics in DB
    await prisma.gameTable.update({
      where: { id: tableId },
      data: {
        shoeNumber: state.shoeNumber,
        roundNumber: 0,
        bankerWins: 0,
        playerWins: 0,
        tieCount: 0,
      },
    });

    await saveTableState(tableId);

    // Notify lobby of new shoe
    io.to('lobby').emit('lobby:tableUpdate', {
      tableId,
      phase: 'dealing' as const,
      timeRemaining: 0,
      roundNumber: 0,
      shoeNumber: state.shoeNumber,
      roadmap: { banker: 0, player: 0, tie: 0 },
      newShoe: true,
    });

    console.log(`[BB Table ${tableId}] New shoe #${state.shoeNumber} — stats reset`);
  }

  io.to(roomName).emit('bb:phase' as any, {
    phase: 'dealing',
    timeRemaining: Math.floor(PHASE_DURATIONS.dealing / 1000),
    roundId: state.roundId,
  });

  // Play round
  const roundResult = playBullBullRound(state.currentShoe);
  state.cardsRemaining = state.currentShoe.length;

  console.log(
    `[BB Table ${tableId}] Cards dealt: Banker ${getRankDisplayName(roundResult.banker.rank)}, ` +
    `P1 ${getRankDisplayName(roundResult.player1.rank)} (${roundResult.player1Result}), ` +
    `P2 ${getRankDisplayName(roundResult.player2.rank)} (${roundResult.player2Result}), ` +
    `P3 ${getRankDisplayName(roundResult.player3.rank)} (${roundResult.player3Result})`
  );

  // Store result
  if (state.currentRound) {
    state.currentRound.banker = roundResult.banker;
    state.currentRound.player1 = roundResult.player1;
    state.currentRound.player2 = roundResult.player2;
    state.currentRound.player3 = roundResult.player3;
    state.currentRound.player1Result = roundResult.player1Result;
    state.currentRound.player2Result = roundResult.player2Result;
    state.currentRound.player3Result = roundResult.player3Result;
  }

  // Emit cards with animation
  const positions = ['banker', 'player1', 'player2', 'player3'] as const;
  const hands = [roundResult.banker, roundResult.player1, roundResult.player2, roundResult.player3];

  // Deal all cards face down
  for (let cardIndex = 0; cardIndex < 5; cardIndex++) {
    for (let posIndex = 0; posIndex < 4; posIndex++) {
      io.to(roomName).emit('bb:card' as any, {
        target: positions[posIndex],
        cardIndex,
        card: hands[posIndex].cards[cardIndex],
        isFaceUp: false,
      });
      await delay(200);
    }
  }

  await delay(1000);

  // Reveal each hand one by one
  for (let posIndex = 0; posIndex < 4; posIndex++) {
    const hand = hands[posIndex];
    io.to(roomName).emit('bb:reveal' as any, {
      target: positions[posIndex],
      cards: hand.cards,
      rank: hand.rank,
      rankName: getRankDisplayName(hand.rank),
      combination: hand.combination,
    });
    await delay(1500);
  }

  // Emit final result
  io.to(roomName).emit('bb:result' as any, {
    roundId: state.roundId || '',
    roundNumber: state.roundNumber,
    banker: {
      cards: roundResult.banker.cards,
      rank: roundResult.banker.rank,
      rankName: getRankDisplayName(roundResult.banker.rank),
    },
    player1: {
      cards: roundResult.player1.cards,
      rank: roundResult.player1.rank,
      rankName: getRankDisplayName(roundResult.player1.rank),
      result: roundResult.player1Result,
    },
    player2: {
      cards: roundResult.player2.cards,
      rank: roundResult.player2.rank,
      rankName: getRankDisplayName(roundResult.player2.rank),
      result: roundResult.player2Result,
    },
    player3: {
      cards: roundResult.player3.cards,
      rank: roundResult.player3.rank,
      rankName: getRankDisplayName(roundResult.player3.rank),
      result: roundResult.player3Result,
    },
  });

  runTablePhase(io, tableId, 'result');
}

async function handleTableResultPhase(io: TypedServer, tableId: string, duration: number): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);
  const round = state.currentRound;

  io.to(roomName).emit('bb:phase' as any, {
    phase: 'result',
    timeRemaining: Math.floor(duration / 1000),
    roundId: state.roundId,
  });

  console.log(`[BB Table ${tableId}] Result displayed`);

  // Settlement
  if (round && round.banker && round.player1 && round.player2 && round.player3) {
    // Save to database
    const savedRound = await prisma.bullBullRound.create({
      data: {
        shoeNumber: round.shoeNumber,
        tableId,
        bankerCards: round.banker.cards as any,
        player1Cards: round.player1.cards as any,
        player2Cards: round.player2.cards as any,
        player3Cards: round.player3.cards as any,
        bankerRank: round.banker.rank,
        player1Rank: round.player1.rank,
        player2Rank: round.player2.rank,
        player3Rank: round.player3.rank,
        player1Result: round.player1Result!,
        player2Result: round.player2Result!,
        player3Result: round.player3Result!,
      },
    });

    console.log(`[BB Table ${tableId}] Round saved with ID: ${savedRound.id}`);

    // Settle bets
    const roundResult: BullBullRoundResult = {
      banker: round.banker,
      player1: round.player1,
      player2: round.player2,
      player3: round.player3,
      player1Result: round.player1Result!,
      player2Result: round.player2Result!,
      player3Result: round.player3Result!,
    };

    for (const [userId, bets] of state.currentBets.entries()) {
      const betResults = bets.map((bet) => {
        const result = calculateBBBetResult(bet.type, bet.amount, roundResult);
        return {
          type: bet.type,
          amount: bet.amount,
          won: result.won,
          payout: result.payout,
          multiplier: result.multiplier,
        };
      });

      const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
      let totalPayout = 0;
      for (const result of betResults) {
        if (result.won) {
          totalPayout += result.amount + result.payout;
        }
      }

      // Apply win cap enforcement
      const netWin = totalPayout - totalBet;
      if (netWin > 0) {
        const cappedNetWin = await applyWinCap(prisma, userId, netWin);
        if (cappedNetWin < netWin) {
          totalPayout = totalBet + cappedNetWin;
        }
      }

      const netResult = totalPayout - totalBet;

      // Atomic settlement transaction
      const finalBalance = await prisma.$transaction(async (tx) => {
        if (totalPayout > 0) {
          await tx.user.update({
            where: { id: userId },
            data: { balance: { increment: totalPayout } },
          });
        }

        for (const bet of betResults) {
          const status = bet.won ? 'won' : 'lost';
          const payoutAmount = bet.won ? bet.amount + bet.payout : 0;

          await tx.bet.create({
            data: {
              userId,
              bullBullRoundId: savedRound.id,
              betType: bet.type as any,
              amount: bet.amount,
              payout: payoutAmount,
              status,
            },
          });
        }

        const updatedUser = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
        const balance = Number(updatedUser?.balance || 0);
        const balanceBeforeBet = balance - netResult;

        await tx.transaction.create({
          data: { userId, operatorId: userId, type: 'bet', amount: -totalBet, balanceBefore: balanceBeforeBet + totalBet, balanceAfter: balanceBeforeBet, note: `BB Table Round #${round.roundNumber}` },
        });
        if (totalPayout > 0) {
          await tx.transaction.create({
            data: { userId, operatorId: userId, type: 'win', amount: totalPayout, balanceBefore: balanceBeforeBet, balanceAfter: balance, note: `BB Table Round #${round.roundNumber}` },
          });
        }
        return balance;
      });

      // Emit settlement
      io.to(`user:${userId}`).emit('bb:settlement' as any, {
        roundId: savedRound.id,
        bets: betResults,
        totalBet,
        totalPayout,
        netResult,
        newBalance: finalBalance,
      });

      console.log(`[BB Table ${tableId}] Settled for user ${userId}: net=${netResult}`);
    }

    // Update table statistics in database
    const bbTable = await prisma.gameTable.findFirst({
      where: { id: tableId },
    });

    if (bbTable) {
      // Count banker wins
      let bankerWinCount = 0;
      let playerWinCount = 0;
      if (round.player1Result === 'lose') bankerWinCount++;
      else playerWinCount++;
      if (round.player2Result === 'lose') bankerWinCount++;
      else playerWinCount++;
      if (round.player3Result === 'lose') bankerWinCount++;
      else playerWinCount++;

      const updatedTable = await prisma.gameTable.update({
        where: { id: bbTable.id },
        data: {
          roundNumber: { increment: 1 },
          bankerWins: { increment: bankerWinCount },
          playerWins: { increment: playerWinCount },
        },
      });

      // Broadcast table update to lobby
      const bbResult = bankerWinCount >= 2 ? 'banker' : 'player';
      io.to('lobby').emit('lobby:tableUpdate', {
        tableId: updatedTable.id,
        phase: 'result',
        timeRemaining: Math.floor(duration / 1000),
        roundNumber: updatedTable.roundNumber,
        shoeNumber: updatedTable.shoeNumber,
        lastResult: bbResult,
        lastRoundEntry: {
          roundNumber: round.roundNumber,
          result: bbResult,
          playerPair: false,
          bankerPair: false,
        },
        roadmap: {
          banker: updatedTable.bankerWins,
          player: updatedTable.playerWins,
          tie: updatedTable.tieCount,
        },
      });

      console.log(`[BB Table ${tableId}] Updated table statistics`);
    }

    // Emit roadmap and cache it
    const recentRounds = await getBBTableRecentRounds(tableId, 100);
    state.cachedRoadmap = recentRounds;
    io.to(roomName).emit('bb:roadmap' as any, { recentRounds });

    // Save state persistence
    await saveTableState(tableId);

    // Clear bets
    state.currentBets.clear();

    console.log(`[BB Table ${tableId}] Settlement complete, ${state.cardsRemaining} cards remaining`);
  }

  await delay(duration);
  runTablePhase(io, tableId, 'betting');
}

// Get recent rounds for roadmap (table-specific)
async function getBBTableRecentRounds(tableId: string, limit: number = 100) {
  const state = getTableState(tableId);
  const rounds = await prisma.bullBullRound.findMany({
    where: { tableId, shoeNumber: state.shoeNumber },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      roundNumber: true,
      bankerRank: true,
      player1Rank: true,
      player2Rank: true,
      player3Rank: true,
      player1Result: true,
      player2Result: true,
      player3Result: true,
    },
  });

  return rounds.reverse().map(round => ({
    roundNumber: round.roundNumber,
    bankerRank: round.bankerRank,
    player1Rank: round.player1Rank,
    player2Rank: round.player2Rank,
    player3Rank: round.player3Rank,
    player1Result: round.player1Result,
    player2Result: round.player2Result,
    player3Result: round.player3Result,
  }));
}

// ============================================
// Public API for Socket Handlers
// ============================================

export function getBBTableGameState(tableId: string, userId?: string) {
  const state = getTableState(tableId);
  return {
    phase: state.phase,
    roundId: state.roundId,
    roundNumber: state.roundNumber,
    shoeNumber: state.shoeNumber,
    timeRemaining: state.timeRemaining,
    cardsRemaining: state.cardsRemaining,
    banker: state.currentRound?.banker || null,
    player1: state.currentRound?.player1 || null,
    player2: state.currentRound?.player2 || null,
    player3: state.currentRound?.player3 || null,
    player1Result: state.currentRound?.player1Result || null,
    player2Result: state.currentRound?.player2Result || null,
    player3Result: state.currentRound?.player3Result || null,
    myBets: userId ? state.currentBets.get(userId) || [] : [],
  };
}

export async function placeBBTableBet(
  tableId: string,
  userId: string,
  bets: BBBetEntry[]
): Promise<{
  success: boolean;
  roundId?: string;
  bets?: BBBetEntry[];
  totalBet?: number;
  newBalance?: number;
  errorCode?: string;
  errorMessage?: string;
}> {
  const state = getTableState(tableId);

  if (state.phase !== 'betting') {
    return { success: false, errorCode: 'BETTING_CLOSED', errorMessage: 'Betting is closed' };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true, status: true, parentAgentId: true },
  });

  if (!user || user.status !== 'active') {
    return { success: false, errorCode: 'USER_INACTIVE', errorMessage: 'User not active' };
  }

  const currentBalance = Number(user.balance);
  const existingBets = state.currentBets.get(userId) || [];
  const existingTotal = existingBets.reduce((sum, b) => sum + b.amount, 0);
  const newBetTotal = bets.reduce((sum, b) => sum + b.amount, 0);
  const totalRequired = existingTotal + newBetTotal;

  // Validate bets
  for (const newBet of bets) {
    if (newBet.amount <= 0) {
      return { success: false, errorCode: 'INVALID_BET_AMOUNT', errorMessage: 'Invalid bet amount' };
    }
  }

  // Agent bet limit enforcement
  if (user.parentAgentId) {
    const agentLimits = await prisma.agentBetLimit.findMany({
      where: { agentId: user.parentAgentId, enabled: true },
    });
    for (const agentLimit of agentLimits) {
      const parts = agentLimit.limitRange.split('-');
      if (parts.length === 2) {
        const agentMax = parseFloat(parts[1]);
        for (const bet of bets) {
          const existingForType = existingBets.find((b) => b.type === bet.type)?.amount || 0;
          if (existingForType + bet.amount > agentMax) {
            return { success: false, errorCode: 'AGENT_BET_LIMIT_EXCEEDED', errorMessage: `代理限红最高 ${agentMax}` };
          }
        }
      }
    }
  }

  // Merge bets
  const mergedBets = [...existingBets];
  for (const newBet of bets) {
    const existingIndex = mergedBets.findIndex((b) => b.type === newBet.type);
    if (existingIndex >= 0) {
      mergedBets[existingIndex].amount += newBet.amount;
    } else {
      mergedBets.push({ ...newBet });
    }
  }

  // Atomic balance deduction with concurrency protection
  const deductResult = await prisma.user.updateMany({
    where: { id: userId, balance: { gte: totalRequired }, status: 'active' },
    data: { balance: { decrement: newBetTotal } },
  });
  if (deductResult.count === 0) {
    return { success: false, errorCode: 'INSUFFICIENT_BALANCE', errorMessage: 'Insufficient balance' };
  }

  state.currentBets.set(userId, mergedBets);

  return {
    success: true,
    roundId: state.roundId || undefined,
    bets: mergedBets,
    totalBet: totalRequired,
    newBalance: currentBalance - newBetTotal,
  };
}

export async function clearBBTableBets(tableId: string, userId: string): Promise<{
  success: boolean;
  newBalance?: number;
  errorCode?: string;
  errorMessage?: string;
}> {
  const state = getTableState(tableId);

  if (state.phase !== 'betting') {
    return { success: false, errorCode: 'BETTING_CLOSED', errorMessage: 'Cannot clear bets now' };
  }

  const existingBets = state.currentBets.get(userId) || [];
  const totalToRefund = existingBets.reduce((sum, b) => sum + b.amount, 0);

  if (totalToRefund > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: totalToRefund } },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    state.currentBets.delete(userId);

    return { success: true, newBalance: Number(user?.balance || 0) };
  }

  return { success: true };
}

// Get all active tables
export function getAllBBTables(): string[] {
  return Array.from(tables.keys());
}

// Export for socket join
export { getTableRoom as getBBTableRoom };

// Get cached roadmap (instant, no DB query)
export function getBBTableCachedRoadmap(tableId: string): any[] {
  const state = tables.get(tableId);
  return state?.cachedRoadmap || [];
}
