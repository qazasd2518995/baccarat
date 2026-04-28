import { Server } from 'socket.io';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { createShoe, burnCards, playRound, calculateBetResult, type Card, type RoundResult } from '../utils/gameLogic.js';
import { playControlledBaccaratRound, type BettingUserInfo } from '../utils/gameResultControl.js';
import { bgClearBet, bgPlaceBet, bgSettleRound } from '../lib/bgIntegration.js';
import type { GamePhase, BetEntry, BetType } from '../socket/types.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';
import { generateFakeBets } from './fakeBetGenerator.js';
import { fluctuatePlayerCount } from './fakePlayerCount.js';
import { generateRoundNumber, initializeCounter } from '../utils/roundNumberGenerator.js';
import { startTableFakeBroadcasts, stopTableFakeBroadcasts } from './fakeBroadcastGenerator.js';


// Type-safe Socket.io server
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Default phase durations in milliseconds (can be overridden per table)
const DEFAULT_PHASE_DURATIONS: Record<GamePhase, number> = {
  betting: 30000,    // 30 seconds (default, can be 15 for speed tables)
  sealed: 3000,      // 3 seconds
  dealing: 10000,    // 10 seconds
  result: 8000,      // 8 seconds (enough for frontend: flip ~1s + 2s wait + 2s display + buffer)
};

// Get phase durations for a specific table
function getPhaseDurations(bettingDuration: number): Record<GamePhase, number> {
  return {
    ...DEFAULT_PHASE_DURATIONS,
    betting: bettingDuration * 1000,
  };
}

type MirroredTransactionType = 'bet' | 'win' | 'refund';

function toMoney(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

function formatBetTransactionNote(roundNumber: string, bets?: BetEntry[]): string {
  const summary = bets?.map((bet) => `${bet.type}:${bet.amount}`).join(', ');
  return summary ? `Round #${roundNumber} - Bets: ${summary}` : `Round #${roundNumber}`;
}

function formatSettlementTransactionNote(roundNumber: string, result: string | null): string {
  return `Table Round #${roundNumber} - ${result ?? ''}`;
}

async function createMirroredTransaction(
  db: { transaction: { create: (args: any) => Promise<unknown> } },
  input: {
    userId: string;
    type: MirroredTransactionType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    note: string;
  }
): Promise<void> {
  await db.transaction.create({
    data: {
      userId: input.userId,
      operatorId: input.userId,
      type: input.type,
      amount: toMoney(input.amount),
      balanceBefore: toMoney(input.balanceBefore),
      balanceAfter: toMoney(input.balanceAfter),
      note: input.note,
    },
  });
}

// Table state interface
interface TableState {
  tableId: string;
  tableName: string;
  phase: GamePhase;
  timeRemaining: number;
  roundId: string | null;
  roundNumber: string;  // Format: YYYYMMDDNNN (e.g., 20260228001)
  shoeNumber: number;
  cardsRemaining: number;
  currentShoe: Card[];
  currentRound: {
    id: string;
    roundNumber: string;  // Format: YYYYMMDDNNN (e.g., 20260228001)
    shoeNumber: number;
    startedAt: Date;
    playerCards: Card[];
    bankerCards: Card[];
    playerPoints: number;
    bankerPoints: number;
    result: 'player' | 'banker' | 'tie' | null;
    playerPair: boolean;
    bankerPair: boolean;
  } | null;
  currentBets: Map<string, BetEntry[]>;
  noCommissionMode: Map<string, boolean>;
  userGameIds: Map<string, string>;
  timerInterval: NodeJS.Timeout | null;
  cachedRoadmap: any[];
  bettingDuration: number; // 投注時間（秒）
}

// Store all table states
const tables = new Map<string, TableState>();

// Get or create table state
function getTableState(tableId: string): TableState {
  if (!tables.has(tableId)) {
    const shoe = createShoe();
    burnCards(shoe);
    const state: TableState = {
      tableId,
      tableName: `Table ${tableId}`,
      phase: 'betting',
      timeRemaining: 0,
      roundId: null,
      roundNumber: '',
      shoeNumber: 1,
      cardsRemaining: shoe.length,
      currentShoe: shoe,
      currentRound: null,
      currentBets: new Map(),
      noCommissionMode: new Map(),
      userGameIds: new Map(),
      timerInterval: null,
      cachedRoadmap: [],
      bettingDuration: 30, // default 30 seconds
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
      state.currentShoe = saved.shuffledDeck as unknown as Card[];
      state.cardsRemaining = saved.cardsRemaining;

      // Initialize round number generator from last round in database for this table
      const lastRound = await prisma.gameRound.findFirst({
        where: { tableId },
        orderBy: { createdAt: 'desc' },
        select: { roundNumber: true },
      });
      initializeCounter(`baccarat_table_${tableId}`, lastRound?.roundNumber ?? null);

      console.log(`[Table ${tableId}] Loaded persisted state: shoe #${state.shoeNumber}`);
    }
  } catch (error) {
    console.error(`[Table ${tableId}] Failed to load persisted state:`, error);
  }
}

// Save table state to DB
async function saveTableState(tableId: string): Promise<void> {
  const state = tables.get(tableId);
  if (!state) return;
  try {
    // roundCounter in DB is deprecated but kept for compatibility
    await prisma.gameTableState.upsert({
      where: { tableId },
      update: {
        shoeNumber: state.shoeNumber,
        roundCounter: state.cachedRoadmap.length,  // Use count for backward compatibility
        cardsRemaining: state.cardsRemaining,
        shuffledDeck: undefined,
      },
      create: {
        tableId,
        gameType: 'baccarat',
        shoeNumber: state.shoeNumber,
        roundCounter: state.cachedRoadmap.length,
        cardsRemaining: state.cardsRemaining,
        shuffledDeck: undefined,
      },
    });
  } catch (error) {
    console.error(`[Table ${tableId}] Failed to save state:`, error);
  }
}

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get Socket.io room name for a table
function getTableRoom(tableId: string): string {
  return `table:baccarat:${tableId}`;
}

// ============================================
// Table Game Loop
// ============================================

export async function startTableLoop(io: TypedServer, tableId: string, startDelay: number = 0): Promise<void> {
  console.log(`[Table ${tableId}] Starting game loop with ${startDelay}ms delay...`);

  // Add initial delay for staggered table starts
  if (startDelay > 0) {
    await delay(startDelay);
  }

  // Load betting duration from DB
  const dbTable = await prisma.gameTable.findUnique({
    where: { id: tableId },
    select: { bettingDuration: true, name: true },
  });

  await loadTableState(tableId);
  const state = getTableState(tableId);

  // Set betting duration from DB (default 30 seconds)
  state.bettingDuration = dbTable?.bettingDuration ?? 30;
  console.log(`[Table ${tableId}] ${dbTable?.name} - Betting duration: ${state.bettingDuration}s`);

  if (!state.currentShoe || state.currentShoe.length < 20) {
    state.currentShoe = createShoe();
    burnCards(state.currentShoe);
    state.cardsRemaining = state.currentShoe.length;
  }

  // Preload roadmap cache from DB
  state.cachedRoadmap = await getTableRecentRounds(tableId, 100);

  // Recalculate stats from current shoe's actual rounds and sync to DB
  const shoeRounds = state.cachedRoadmap;
  const bankerWins = shoeRounds.filter(r => r.result === 'banker').length;
  const playerWins = shoeRounds.filter(r => r.result === 'player').length;
  const tieCount = shoeRounds.filter(r => r.result === 'tie').length;

  // Get last round number from cache or initialize
  const lastRound = shoeRounds[shoeRounds.length - 1];
  state.roundNumber = lastRound?.roundNumber ?? '';
  initializeCounter(`baccarat_table_${tableId}`, state.roundNumber || null);

  await prisma.gameTable.update({
    where: { id: tableId },
    data: {
      shoeNumber: state.shoeNumber,
      roundNumber: shoeRounds.length,  // Keep as count for DB compatibility
      bankerWins,
      playerWins,
      tieCount,
    },
  });
  console.log(`[Table ${tableId}] Shoe ready with ${state.cardsRemaining} cards, roadmap cached (${shoeRounds.length} rounds), stats synced: B${bankerWins} P${playerWins} T${tieCount}`);

  runTablePhase(io, tableId, 'betting');
}

async function runTablePhase(io: TypedServer, tableId: string, phase: GamePhase): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);
  const phaseDurations = getPhaseDurations(state.bettingDuration);

  console.log(`[Table ${tableId}] Entering phase: ${phase}`);
  state.phase = phase;

  const duration = phaseDurations[phase];
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

  // Create new round with date-based round number
  const roundNumber = generateRoundNumber(`baccarat_table_${tableId}`);
  state.roundNumber = roundNumber;
  state.currentRound = {
    id: `table-${tableId}-round-${Date.now()}-${roundNumber}`,
    roundNumber,
    shoeNumber: state.shoeNumber,
    startedAt: new Date(),
    playerCards: [],
    bankerCards: [],
    playerPoints: 0,
    bankerPoints: 0,
    result: null,
    playerPair: false,
    bankerPair: false,
  };
  state.roundId = state.currentRound.id;

  console.log(`[Table ${tableId}] New round ${roundNumber} started in shoe #${state.shoeNumber}`);

  // Broadcast phase change
  io.to(roomName).emit('game:phase', {
    phase: 'betting',
    timeRemaining,
    roundId: state.roundId,
  });

  // Broadcast fake bets for visual display
  io.to(roomName).emit('game:fakeBets', { bets: generateFakeBets('baccarat') });

  // Start fake broadcasts during betting phase
  startTableFakeBroadcasts(io, tableId, roomName, 'game:fakeBroadcast');

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
      playerCount: fluctuatePlayerCount(tableId),
    });
  }

  // Timer tick
  state.timerInterval = setInterval(() => {
    state.timeRemaining--;
    io.to(roomName).emit('game:timer', {
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

  // Stop fake broadcasts when betting ends
  stopTableFakeBroadcasts(tableId);

  io.to(roomName).emit('game:phase', {
    phase: 'sealed',
    timeRemaining: Math.floor(duration / 1000),
    roundId: state.roundId,
  });

  console.log(`[Table ${tableId}] Betting sealed, no more bets`);

  await delay(duration);
  runTablePhase(io, tableId, 'dealing');
}

async function handleTableDealingPhase(io: TypedServer, tableId: string): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);

  // Check for reshuffle
  if (state.currentShoe.length < 20) {
    state.shoeNumber++;
    state.roundNumber = '';  // Will be set on next round
    state.cachedRoadmap = [];
    state.currentShoe = createShoe();
    burnCards(state.currentShoe);
    state.cardsRemaining = state.currentShoe.length;

    // Reset GameTable statistics in DB (roundNumber is deprecated, kept for compatibility)
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
      roundNumber: '',  // New shoe, no round yet
      shoeNumber: state.shoeNumber,
      roadmap: { banker: 0, player: 0, tie: 0 },
      newShoe: true,
    });

    // Notify game room of shuffle — frontend shows animation
    io.to(roomName).emit('game:shuffle', { shoeNumber: state.shoeNumber });

    console.log(`[Table ${tableId}] New shoe #${state.shoeNumber} — stats reset`);

    // Wait for shuffle animation
    await delay(4000);
  }

  io.to(roomName).emit('game:phase', {
    phase: 'dealing',
    timeRemaining: Math.floor(DEFAULT_PHASE_DURATIONS.dealing / 1000),
    roundId: state.roundId,
  });

  // Collect betting users info for control
  const bettingUsers: BettingUserInfo[] = [];
  for (const [userId, bets] of state.currentBets.entries()) {
    for (const bet of bets) {
      bettingUsers.push({
        userId,
        betType: bet.type,
        amount: bet.amount,
      });
    }
  }

  // Play round (with control if active)
  const roundResult = await playControlledBaccaratRound(state.currentShoe, bettingUsers);
  state.cardsRemaining = state.currentShoe.length;

  console.log(
    `[Table ${tableId}] Cards dealt: Player ${roundResult.playerPoints} vs Banker ${roundResult.bankerPoints} = ${roundResult.result}`
  );

  // Store result
  if (state.currentRound) {
    state.currentRound.playerCards = roundResult.playerCards;
    state.currentRound.bankerCards = roundResult.bankerCards;
    state.currentRound.playerPoints = roundResult.playerPoints;
    state.currentRound.bankerPoints = roundResult.bankerPoints;
    state.currentRound.result = roundResult.result;
    state.currentRound.playerPair = roundResult.playerPair;
    state.currentRound.bankerPair = roundResult.bankerPair;
  }

  // Emit cards sequentially
  io.to(roomName).emit('game:card', {
    target: 'player',
    cardIndex: 0,
    card: roundResult.playerCards[0],
    currentPoints: roundResult.playerCards[0].value % 10,
  });
  await delay(1200);

  io.to(roomName).emit('game:card', {
    target: 'banker',
    cardIndex: 0,
    card: roundResult.bankerCards[0],
    currentPoints: roundResult.bankerCards[0].value % 10,
  });
  await delay(1200);

  const playerTwoCardPoints = (roundResult.playerCards[0].value + roundResult.playerCards[1].value) % 10;
  io.to(roomName).emit('game:card', {
    target: 'player',
    cardIndex: 1,
    card: roundResult.playerCards[1],
    currentPoints: playerTwoCardPoints,
  });
  await delay(1200);

  const bankerTwoCardPoints = (roundResult.bankerCards[0].value + roundResult.bankerCards[1].value) % 10;
  io.to(roomName).emit('game:card', {
    target: 'banker',
    cardIndex: 1,
    card: roundResult.bankerCards[1],
    currentPoints: bankerTwoCardPoints,
  });
  await delay(1500);

  if (roundResult.playerCards.length > 2) {
    io.to(roomName).emit('game:card', {
      target: 'player',
      cardIndex: 2,
      card: roundResult.playerCards[2],
      currentPoints: roundResult.playerPoints,
    });
    await delay(1200);
  }

  if (roundResult.bankerCards.length > 2) {
    io.to(roomName).emit('game:card', {
      target: 'banker',
      cardIndex: 2,
      card: roundResult.bankerCards[2],
      currentPoints: roundResult.bankerPoints,
    });
    await delay(1200);
  }

  io.to(roomName).emit('game:result', {
    roundId: state.roundId || '',
    roundNumber: state.roundNumber,
    result: roundResult.result,
    playerCards: roundResult.playerCards,
    bankerCards: roundResult.bankerCards,
    playerPoints: roundResult.playerPoints,
    bankerPoints: roundResult.bankerPoints,
    playerPair: roundResult.playerPair,
    bankerPair: roundResult.bankerPair,
  });

  runTablePhase(io, tableId, 'result');
}

async function handleTableResultPhase(io: TypedServer, tableId: string, duration: number): Promise<void> {
  const state = getTableState(tableId);
  const roomName = getTableRoom(tableId);
  const round = state.currentRound;

  io.to(roomName).emit('game:phase', {
    phase: 'result',
    timeRemaining: Math.floor(duration / 1000),
    roundId: state.roundId,
  });

  console.log(`[Table ${tableId}] Result displayed: ${round?.result}`);

  // Settlement
  if (round && round.result) {
    // Save to database with tableId
    const savedRound = await prisma.gameRound.create({
      data: {
        roundNumber: round.roundNumber,
        shoeNumber: round.shoeNumber,
        tableId,
        playerCards: round.playerCards as any,
        bankerCards: round.bankerCards as any,
        playerPoints: round.playerPoints,
        bankerPoints: round.bankerPoints,
        result: round.result,
        playerPair: round.playerPair,
        bankerPair: round.bankerPair,
      },
    });

    console.log(`[Table ${tableId}] Round saved with ID: ${savedRound.id}`);

    // Settle bets
    const roundResult: RoundResult = {
      playerCards: round.playerCards,
      bankerCards: round.bankerCards,
      playerPoints: round.playerPoints,
      bankerPoints: round.bankerPoints,
      result: round.result,
      playerPair: round.playerPair,
      bankerPair: round.bankerPair,
    };

    for (const [userId, bets] of state.currentBets.entries()) {
      const isNoCommission = state.noCommissionMode.get(userId) || false;
      const betResults = bets.map((bet) => {
        const result = calculateBetResult(bet.type, bet.amount, roundResult, { isNoCommission });
        return {
          type: bet.type,
          amount: bet.amount,
          won: result.won,
          payout: result.payout,
        };
      });

      const totalBet = bets.reduce((sum, b) => sum + b.amount, 0);
      const gameId = state.userGameIds.get(userId) || 'baccarat';
      let totalPayout = 0;
      for (const result of betResults) {
        if (result.won) {
          totalPayout += result.amount + result.payout;
        } else if (result.payout === 0) {
          totalPayout += result.amount;
        }
      }

      const bridgeSettlement = await bgSettleRound({
        userId,
        amount: totalBet,
        payout: totalPayout,
        gameId,
        resultData: {
          gameId,
          tableId,
          roundId: savedRound.id,
          roundNumber: round.roundNumber,
          shoeNumber: round.shoeNumber,
          result: round.result,
          playerPair: round.playerPair,
          bankerPair: round.bankerPair,
          bets: betResults,
        },
      });

      const finalBalance = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { balance: toMoney(bridgeSettlement.balance) },
        });

        if (totalPayout > 0) {
          await createMirroredTransaction(tx, {
            userId,
            type: totalPayout > totalBet ? 'win' : 'refund',
            amount: totalPayout,
            balanceBefore: bridgeSettlement.balance - totalPayout,
            balanceAfter: bridgeSettlement.balance,
            note: formatSettlementTransactionNote(round.roundNumber, round.result),
          });
        }

        for (const bet of betResults) {
          let status: 'won' | 'lost' | 'refunded';
          let payoutAmount: number;
          if (bet.won) {
            status = 'won';
            payoutAmount = bet.amount + bet.payout;
          } else if (bet.payout === 0) {
            status = 'refunded';
            payoutAmount = bet.amount;
          } else {
            status = 'lost';
            payoutAmount = 0;
          }

          await tx.bet.create({
            data: {
              userId,
              roundId: savedRound.id,
              betType: bet.type as any,
              amount: bet.amount,
              payout: payoutAmount,
              status,
            },
          });
        }

        return bridgeSettlement.balance;
      });

      const netResult = totalPayout - totalBet;

      io.to(`user:${userId}`).emit('bet:settlement', {
        roundId: savedRound.id,
        bets: betResults,
        totalBet,
        totalPayout,
        netResult,
        newBalance: finalBalance,
      });

      console.log(`[Table ${tableId}] Settled for user ${userId}: net=${netResult}`);
    }

    // Update table statistics in database
    const baccaratTable = await prisma.gameTable.findFirst({
      where: { id: tableId },
    });

    if (baccaratTable) {
      const updateData: { bankerWins?: { increment: number }; playerWins?: { increment: number }; tieCount?: { increment: number }; roundNumber: { increment: number } } = {
        roundNumber: { increment: 1 },
      };

      if (round.result === 'banker') {
        updateData.bankerWins = { increment: 1 };
      } else if (round.result === 'player') {
        updateData.playerWins = { increment: 1 };
      } else if (round.result === 'tie') {
        updateData.tieCount = { increment: 1 };
      }

      const updatedTable = await prisma.gameTable.update({
        where: { id: baccaratTable.id },
        data: updateData,
      });

      // Broadcast table update to lobby
      io.to('lobby').emit('lobby:tableUpdate', {
        tableId: updatedTable.id,
        phase: 'result',
        timeRemaining: Math.floor(duration / 1000),
        roundNumber: round.roundNumber,  // Use formatted round number
        shoeNumber: updatedTable.shoeNumber,
        lastResult: round.result,
        lastRoundEntry: {
          roundNumber: round.roundNumber,
          result: round.result,
          playerPair: round.playerPair,
          bankerPair: round.bankerPair,
        },
        roadmap: {
          banker: updatedTable.bankerWins,
          player: updatedTable.playerWins,
          tie: updatedTable.tieCount,
        },
      });

      console.log(`[Table ${tableId}] Updated table statistics: ${round.result}`);
    }

    // Emit roadmap (table-specific) and cache it
    const recentRounds = await getTableRecentRounds(tableId, 100);
    state.cachedRoadmap = recentRounds;
    io.to(roomName).emit('game:roadmap', { recentRounds });

    // Save state persistence
    await saveTableState(tableId);

    // Clear bets
    state.currentBets.clear();
    state.noCommissionMode.clear();
    state.userGameIds.clear();

    console.log(`[Table ${tableId}] Settlement complete, ${state.cardsRemaining} cards remaining`);
  }

  await delay(duration);
  runTablePhase(io, tableId, 'betting');
}

// Get recent rounds for roadmap (table-specific)
async function getTableRecentRounds(tableId: string, limit: number = 100) {
  const state = getTableState(tableId);
  const rounds = await prisma.gameRound.findMany({
    where: {
      tableId,
      shoeNumber: state.shoeNumber,
      result: { in: ['player', 'banker', 'tie'] },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      roundNumber: true,
      result: true,
      playerPair: true,
      bankerPair: true,
      playerPoints: true,
      bankerPoints: true,
      playerCards: true,
      bankerCards: true,
    },
  });

  return rounds.reverse().map(round => ({
    roundNumber: round.roundNumber,
    result: round.result as 'player' | 'banker' | 'tie',
    playerPair: round.playerPair,
    bankerPair: round.bankerPair,
    playerPoints: round.playerPoints,
    bankerPoints: round.bankerPoints,
    totalCards: (round.playerCards as any[])?.length + (round.bankerCards as any[])?.length || 0,
  }));
}

// ============================================
// Public API for Socket Handlers
// ============================================

export function getTableGameState(tableId: string, userId?: string) {
  const state = getTableState(tableId);
  return {
    phase: state.phase,
    roundId: state.roundId,
    roundNumber: state.roundNumber,
    shoeNumber: state.shoeNumber,
    timeRemaining: state.timeRemaining,
    cardsRemaining: state.cardsRemaining,
    playerCards: state.currentRound?.playerCards || [],
    bankerCards: state.currentRound?.bankerCards || [],
    playerPoints: state.currentRound?.playerPoints,
    bankerPoints: state.currentRound?.bankerPoints,
    result: state.currentRound?.result,
    playerPair: state.currentRound?.playerPair,
    bankerPair: state.currentRound?.bankerPair,
    myBets: userId ? state.currentBets.get(userId) || [] : [],
  };
}

export async function placeTableBet(
  tableId: string,
  userId: string,
  bets: BetEntry[],
  isNoCommission: boolean = false,
  gameId: string = 'baccarat'
): Promise<{
  success: boolean;
  roundId?: string;
  bets?: BetEntry[];
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

  const existingBets = state.currentBets.get(userId) || [];
  const existingTotal = existingBets.reduce((sum, b) => sum + b.amount, 0);
  const newBetTotal = bets.reduce((sum, b) => sum + b.amount, 0);

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
        const agentMin = parseFloat(parts[0]);
        const agentMax = parseFloat(parts[1]);
        for (const bet of bets) {
          if (bet.amount < agentMin) {
            return { success: false, errorCode: 'AGENT_BET_LIMIT_BELOW_MIN', errorMessage: `最低下注 ${agentMin}` };
          }
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

  let newBalance = 0;
  try {
    newBalance = await bgPlaceBet(userId, newBetTotal, {
      gameId,
      tableId,
      roundId: state.roundId,
      roundNumber: state.roundNumber,
      isNoCommission,
      bets,
      totalRequired: existingTotal + newBetTotal,
    });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: toMoney(newBalance) },
      });
      await createMirroredTransaction(tx, {
        userId,
        type: 'bet',
        amount: -newBetTotal,
        balanceBefore: newBalance + newBetTotal,
        balanceAfter: newBalance,
        note: formatBetTransactionNote(state.roundNumber, bets),
      });
    });
  } catch (error) {
    return {
      success: false,
      errorCode: 'INSUFFICIENT_BALANCE',
      errorMessage: error instanceof Error ? error.message : 'Insufficient balance',
    };
  }

  state.currentBets.set(userId, mergedBets);
  state.noCommissionMode.set(userId, isNoCommission);
  state.userGameIds.set(userId, gameId);

  return {
    success: true,
    roundId: state.roundId || undefined,
    bets: mergedBets,
    totalBet: existingTotal + newBetTotal,
    newBalance,
  };
}

export async function clearTableBets(tableId: string, userId: string, gameId: string = 'baccarat'): Promise<{
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
    const newBalance = await bgClearBet(userId, totalToRefund, {
      gameId: state.userGameIds.get(userId) || gameId,
      tableId,
      roundId: state.roundId,
      roundNumber: state.roundNumber,
      bets: existingBets,
    });
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { balance: toMoney(newBalance) },
      });
      await createMirroredTransaction(tx, {
        userId,
        type: 'refund',
        amount: totalToRefund,
        balanceBefore: newBalance - totalToRefund,
        balanceAfter: newBalance,
        note: formatBetTransactionNote(state.roundNumber, existingBets),
      });
    });

    state.currentBets.delete(userId);
    state.noCommissionMode.delete(userId);
    state.userGameIds.delete(userId);

    return { success: true, newBalance };
  }

  return { success: true };
}

// Get all active tables
export function getAllTables(): string[] {
  return Array.from(tables.keys());
}

// Export for socket join
export { getTableRoom };

// Get cached roadmap (instant, no DB query)
export function getTableCachedRoadmap(tableId: string): any[] {
  const state = tables.get(tableId);
  return state?.cachedRoadmap || [];
}
