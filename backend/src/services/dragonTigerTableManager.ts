import { Server } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import { createShoe, burnCards, playDragonTigerRound, calculateDTBetResult, type Card, type DragonTigerRoundResult, type DragonTigerBetType } from '../utils/dragonTigerLogic.js';
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
  dealing: 5000,     // 5 seconds
  result: 5000,      // 5 seconds
};

// Bet entry for Dragon Tiger
interface DTBetEntry {
  type: DragonTigerBetType;
  amount: number;
}

// Table state interface
interface DTTableState {
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
    dragonCard: Card | null;
    tigerCard: Card | null;
    dragonValue: number;
    tigerValue: number;
    result: 'dragon' | 'tiger' | 'tie' | null;
    isSuitedTie: boolean;
  } | null;
  currentBets: Map<string, DTBetEntry[]>;
  timerInterval: NodeJS.Timeout | null;
  cachedRoadmap: any[];
}

// Store all table states
const tables = new Map<string, DTTableState>();

// Get or create table state
function getTableState(tableId: string): DTTableState {
  if (!tables.has(tableId)) {
    const shoe = createShoe();
    burnCards(shoe);
    const state: DTTableState = {
      tableId,
      tableName: `DT Table ${tableId}`,
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
      console.log(`[DT Table ${tableId}] Loaded persisted state: shoe #${state.shoeNumber}, round #${state.roundNumber}`);
    }
  } catch (error) {
    console.error(`[DT Table ${tableId}] Failed to load persisted state:`, error);
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
        gameType: 'dragon_tiger',
        shoeNumber: state.shoeNumber,
        roundCounter: state.roundNumber,
        cardsRemaining: state.cardsRemaining,
        shuffledDeck: state.currentShoe as any,
      },
    });
  } catch (error) {
    console.error(`[DT Table ${tableId}] Failed to save state:`, error);
  }
}

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get Socket.io room name for a table
function getTableRoom(tableId: string): string {
  return `table:dragontiger:${tableId}`;
}

// ============================================
// Table Game Loop
// ============================================

export async function startDTTableLoop(io: TypedServer, tableId: string, startDelay: number = 0): Promise<void> {
  console.log(`[DT Table ${tableId}] Starting game loop with ${startDelay}ms delay...`);

  if (startDelay > 0) {
    await delay(startDelay);
  }

  await loadTableState(tableId);
  const state = getTableState(tableId);
  if (!state.currentShoe || state.currentShoe.length < 10) {
    state.currentShoe = createShoe();
    burnCards(state.currentShoe);
    state.cardsRemaining = state.currentShoe.length;
  }

  // Preload roadmap cache from DB
  state.cachedRoadmap = await getDTTableRecentRounds(tableId, 100);
  console.log(`[DT Table ${tableId}] Shoe ready with ${state.cardsRemaining} cards, roadmap cached (${state.cachedRoadmap.length} rounds)`);

  runTablePhase(io, tableId, 'betting');
}

async function runTablePhase(io: TypedServer, tableId: string, phase: GamePhase): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);

  console.log(`[DT Table ${tableId}] Entering phase: ${phase}`);
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
    id: `dt-table-${tableId}-round-${Date.now()}-${state.roundNumber}`,
    roundNumber: state.roundNumber,
    shoeNumber: state.shoeNumber,
    startedAt: new Date(),
    dragonCard: null,
    tigerCard: null,
    dragonValue: 0,
    tigerValue: 0,
    result: null,
    isSuitedTie: false,
  };
  state.roundId = state.currentRound.id;

  console.log(`[DT Table ${tableId}] New round #${state.roundNumber} started in shoe #${state.shoeNumber}`);

  // Broadcast phase change
  io.to(roomName).emit('dt:phase' as any, {
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
        banker: dbTable.bankerWins, // dragon wins
        player: dbTable.playerWins, // tiger wins
        tie: dbTable.tieCount,
      },
    });
  }

  // Timer tick
  state.timerInterval = setInterval(() => {
    state.timeRemaining--;
    io.to(roomName).emit('dt:timer' as any, {
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

  io.to(roomName).emit('dt:phase' as any, {
    phase: 'sealed',
    timeRemaining: Math.floor(duration / 1000),
    roundId: state.roundId,
  });

  console.log(`[DT Table ${tableId}] Betting sealed, no more bets`);

  await delay(duration);
  runTablePhase(io, tableId, 'dealing');
}

async function handleTableDealingPhase(io: TypedServer, tableId: string): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);

  // Check for reshuffle
  if (state.currentShoe.length < 10) {
    state.shoeNumber++;
    state.currentShoe = createShoe();
    burnCards(state.currentShoe);
    state.cardsRemaining = state.currentShoe.length;
    await saveTableState(tableId);
    console.log(`[DT Table ${tableId}] New shoe #${state.shoeNumber} created`);
  }

  io.to(roomName).emit('dt:phase' as any, {
    phase: 'dealing',
    timeRemaining: Math.floor(PHASE_DURATIONS.dealing / 1000),
    roundId: state.roundId,
  });

  // Play round
  const roundResult = playDragonTigerRound(state.currentShoe);
  state.cardsRemaining = state.currentShoe.length;

  console.log(
    `[DT Table ${tableId}] Cards dealt: Dragon ${roundResult.dragonValue} vs Tiger ${roundResult.tigerValue} = ${roundResult.result}${roundResult.isSuitedTie ? ' (Suited Tie!)' : ''}`
  );

  // Store result
  if (state.currentRound) {
    state.currentRound.dragonCard = roundResult.dragonCard;
    state.currentRound.tigerCard = roundResult.tigerCard;
    state.currentRound.dragonValue = roundResult.dragonValue;
    state.currentRound.tigerValue = roundResult.tigerValue;
    state.currentRound.result = roundResult.result;
    state.currentRound.isSuitedTie = roundResult.isSuitedTie;
  }

  // Emit cards sequentially
  io.to(roomName).emit('dt:card' as any, {
    target: 'dragon',
    card: roundResult.dragonCard,
    value: roundResult.dragonValue,
  });
  await delay(1500);

  io.to(roomName).emit('dt:card' as any, {
    target: 'tiger',
    card: roundResult.tigerCard,
    value: roundResult.tigerValue,
  });
  await delay(1500);

  // Emit final result
  io.to(roomName).emit('dt:result' as any, {
    roundId: state.roundId || '',
    roundNumber: state.roundNumber,
    result: roundResult.result,
    dragonCard: roundResult.dragonCard,
    tigerCard: roundResult.tigerCard,
    dragonValue: roundResult.dragonValue,
    tigerValue: roundResult.tigerValue,
    isSuitedTie: roundResult.isSuitedTie,
  });

  runTablePhase(io, tableId, 'result');
}

async function handleTableResultPhase(io: TypedServer, tableId: string, duration: number): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);
  const round = state.currentRound;

  io.to(roomName).emit('dt:phase' as any, {
    phase: 'result',
    timeRemaining: Math.floor(duration / 1000),
    roundId: state.roundId,
  });

  console.log(`[DT Table ${tableId}] Result displayed: ${round?.result}`);

  // Settlement
  if (round && round.result) {
    // Map result to DB enum
    let dbResult: 'dragon' | 'tiger' | 'dt_tie' = 'dt_tie';
    if (round.result === 'dragon') dbResult = 'dragon';
    else if (round.result === 'tiger') dbResult = 'tiger';

    // Save to database
    const savedRound = await prisma.dragonTigerRound.create({
      data: {
        tableId,
        shoeNumber: round.shoeNumber,
        dragonCard: round.dragonCard as any,
        tigerCard: round.tigerCard as any,
        dragonValue: round.dragonValue,
        tigerValue: round.tigerValue,
        result: dbResult,
        isSuitedTie: round.isSuitedTie,
      },
    });

    console.log(`[DT Table ${tableId}] Round saved with ID: ${savedRound.id}`);

    // Settle bets
    const roundResult: DragonTigerRoundResult = {
      dragonCard: round.dragonCard!,
      tigerCard: round.tigerCard!,
      dragonValue: round.dragonValue,
      tigerValue: round.tigerValue,
      result: round.result,
      isSuitedTie: round.isSuitedTie,
    };

    for (const [userId, bets] of state.currentBets.entries()) {
      const betResults = bets.map((bet) => {
        const result = calculateDTBetResult(bet.type, bet.amount, roundResult);
        return {
          type: bet.type,
          amount: bet.amount,
          won: result.won,
          payout: result.payout,
        };
      });

      const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
      let totalPayout = 0;
      for (const result of betResults) {
        if (result.won) {
          totalPayout += result.amount + result.payout;
        } else if (result.payout === 0) {
          totalPayout += result.amount;
        } else if (result.payout === -result.amount * 0.5) {
          totalPayout += result.amount * 0.5;
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
          let status: 'won' | 'lost' | 'refunded';
          let payoutAmount: number;
          if (bet.won) { status = 'won'; payoutAmount = bet.amount + bet.payout; }
          else if (bet.payout === 0) { status = 'refunded'; payoutAmount = bet.amount; }
          else if (bet.payout === -bet.amount * 0.5) { status = 'refunded'; payoutAmount = bet.amount * 0.5; }
          else { status = 'lost'; payoutAmount = 0; }

          await tx.bet.create({
            data: { userId, dragonTigerRoundId: savedRound.id, betType: bet.type as any, amount: bet.amount, payout: payoutAmount, status },
          });
        }

        const updatedUser = await tx.user.findUnique({ where: { id: userId }, select: { balance: true } });
        const balance = Number(updatedUser?.balance || 0);
        const balanceBeforeBet = balance - netResult;

        await tx.transaction.create({
          data: { userId, operatorId: userId, type: 'bet', amount: -totalBet, balanceBefore: balanceBeforeBet + totalBet, balanceAfter: balanceBeforeBet, note: `DT Table Round #${round.roundNumber}` },
        });
        if (totalPayout > 0) {
          await tx.transaction.create({
            data: { userId, operatorId: userId, type: 'win', amount: totalPayout, balanceBefore: balanceBeforeBet, balanceAfter: balance, note: `DT Table Round #${round.roundNumber} - ${round.result}` },
          });
        }
        return balance;
      });

      // Emit settlement
      io.to(`user:${userId}`).emit('dt:settlement' as any, {
        roundId: savedRound.id,
        bets: betResults,
        totalBet,
        totalPayout,
        netResult,
        newBalance: finalBalance,
      });

      console.log(`[DT Table ${tableId}] Settled for user ${userId}: net=${netResult}`);
    }

    // Update table statistics in database
    const dtTable = await prisma.gameTable.findFirst({
      where: { id: tableId },
    });

    if (dtTable) {
      const updateData: { bankerWins?: { increment: number }; playerWins?: { increment: number }; tieCount?: { increment: number }; roundNumber: { increment: number } } = {
        roundNumber: { increment: 1 },
      };

      if (round.result === 'dragon') {
        updateData.bankerWins = { increment: 1 };
      } else if (round.result === 'tiger') {
        updateData.playerWins = { increment: 1 };
      } else if (round.result === 'tie') {
        updateData.tieCount = { increment: 1 };
      }

      const updatedTable = await prisma.gameTable.update({
        where: { id: dtTable.id },
        data: updateData,
      });

      // Broadcast table update to lobby
      io.to('lobby').emit('lobby:tableUpdate', {
        tableId: updatedTable.id,
        phase: 'result',
        timeRemaining: Math.floor(duration / 1000),
        roundNumber: updatedTable.roundNumber,
        shoeNumber: updatedTable.shoeNumber,
        lastResult: round.result === 'dragon' ? 'banker' : round.result === 'tiger' ? 'player' : 'tie',
        roadmap: {
          banker: updatedTable.bankerWins,
          player: updatedTable.playerWins,
          tie: updatedTable.tieCount,
        },
      });

      console.log(`[DT Table ${tableId}] Updated table statistics: ${round.result}`);
    }

    // Emit roadmap (table-specific) and cache it
    const recentRounds = await getDTTableRecentRounds(tableId, 100);
    state.cachedRoadmap = recentRounds;
    io.to(roomName).emit('dt:roadmap' as any, { recentRounds });

    // Save state persistence
    await saveTableState(tableId);

    // Clear bets
    state.currentBets.clear();

    console.log(`[DT Table ${tableId}] Settlement complete, ${state.cardsRemaining} cards remaining`);
  }

  await delay(duration);
  runTablePhase(io, tableId, 'betting');
}

// Get recent rounds for roadmap (table-specific)
async function getDTTableRecentRounds(tableId: string, limit: number = 100) {
  const rounds = await prisma.dragonTigerRound.findMany({
    where: { tableId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      roundNumber: true,
      result: true,
      isSuitedTie: true,
      dragonValue: true,
      tigerValue: true,
      dragonCard: true,
      tigerCard: true,
    },
  });

  return rounds.reverse().map(round => ({
    roundNumber: round.roundNumber,
    result: round.result,
    isSuitedTie: round.isSuitedTie,
    dragonValue: round.dragonValue,
    tigerValue: round.tigerValue,
  }));
}

// ============================================
// Public API for Socket Handlers
// ============================================

export function getDTTableGameState(tableId: string, userId?: string) {
  const state = getTableState(tableId);
  return {
    phase: state.phase,
    roundId: state.roundId,
    roundNumber: state.roundNumber,
    shoeNumber: state.shoeNumber,
    timeRemaining: state.timeRemaining,
    cardsRemaining: state.cardsRemaining,
    dragonCard: state.currentRound?.dragonCard || null,
    tigerCard: state.currentRound?.tigerCard || null,
    dragonValue: state.currentRound?.dragonValue,
    tigerValue: state.currentRound?.tigerValue,
    result: state.currentRound?.result,
    isSuitedTie: state.currentRound?.isSuitedTie,
    myBets: userId ? state.currentBets.get(userId) || [] : [],
  };
}

export async function placeDTTableBet(
  tableId: string,
  userId: string,
  bets: DTBetEntry[]
): Promise<{
  success: boolean;
  roundId?: string;
  bets?: DTBetEntry[];
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

export async function clearDTTableBets(tableId: string, userId: string): Promise<{
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
export function getAllDTTables(): string[] {
  return Array.from(tables.keys());
}

// Export for socket join
export { getTableRoom as getDTTableRoom };

// Get cached roadmap (instant, no DB query)
export function getDTTableCachedRoadmap(tableId: string): any[] {
  const state = tables.get(tableId);
  return state?.cachedRoadmap || [];
}
