import { Server } from 'socket.io';
import { prisma } from '../lib/prisma.js';
import { createShoe, burnCards, playRound, type Card } from '../utils/gameLogic.js';
import {
  setPhase,
  setTimeRemaining,
  createNewRound,
  setRoundResult,
  settleAllBets,
  clearAllBets,
  getCurrentRound,
  getRecentRounds,
  loadPersistedState,
  savePersistedState,
  getShoeNumber,
  setShoeNumber,
  getCardsRemaining,
  setCardsRemaining,
  getShuffledDeck,
  setShuffledDeck,
  startNewShoe,
} from './gameState.js';
import type { GamePhase } from '../socket/types.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../socket/types.js';


// Phase durations in milliseconds
const PHASE_DURATIONS: Record<GamePhase, number> = {
  betting: 15000,    // 15 seconds
  sealed: 3000,      // 3 seconds
  dealing: 10000,    // 10 seconds
  result: 5000,      // 5 seconds (settlement happens at end of this phase)
};

// Current shoe (in-memory, but state is persisted)
let currentShoe: Card[] = [];

// Timer reference
let timerInterval: NodeJS.Timeout | null = null;

// Type-safe Socket.io server
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize and start the game loop
export async function startGameLoop(io: TypedServer): Promise<void> {
  console.log('Starting game loop...');

  // Load persisted state from database
  await loadPersistedState();

  // Restore or create deck
  const persistedDeck = getShuffledDeck();
  if (persistedDeck && persistedDeck.length > 0) {
    currentShoe = persistedDeck;
    console.log(`[GameLoop] Restored deck with ${currentShoe.length} cards from shoe #${getShoeNumber()}`);
  } else {
    currentShoe = createShoe();
    burnCards(currentShoe);
    setShuffledDeck(currentShoe);
    setCardsRemaining(currentShoe.length);
    await savePersistedState();
    console.log(`[GameLoop] Shoe #${getShoeNumber()} created with ${currentShoe.length} cards`);
  }

  runPhase(io, 'betting');
}

// Main phase runner
async function runPhase(io: TypedServer, phase: GamePhase): Promise<void> {
  console.log(`[GameLoop] Entering phase: ${phase}`);
  setPhase(phase);

  const duration = PHASE_DURATIONS[phase];
  let timeRemaining = Math.floor(duration / 1000);
  setTimeRemaining(timeRemaining);

  // Phase-specific actions
  switch (phase) {
    case 'betting':
      await handleBettingPhase(io, duration, timeRemaining);
      break;

    case 'sealed':
      await handleSealedPhase(io, duration);
      break;

    case 'dealing':
      await handleDealingPhase(io);
      break;

    case 'result':
      await handleResultPhase(io, duration);
      break;
  }
}

// ============================================
// Phase Handlers
// ============================================

async function handleBettingPhase(
  io: TypedServer,
  duration: number,
  timeRemaining: number
): Promise<void> {
  // Create new round at start of betting
  const round = await createNewRound();
  console.log(`[GameLoop] New round #${round.roundNumber} started in shoe #${round.shoeNumber}`);

  // Broadcast phase change
  io.to('table:default').emit('game:phase', {
    phase: 'betting',
    timeRemaining,
    roundId: round.id,
  });

  // Get ALL baccarat tables for lobby updates (they all share the same game loop)
  const baccaratTables = await prisma.gameTable.findMany({
    where: { gameType: 'baccarat', isActive: true },
  });

  // Broadcast initial betting phase to lobby for all baccarat tables
  for (const table of baccaratTables) {
    io.to('lobby').emit('lobby:tableUpdate', {
      tableId: table.id,
      phase: 'betting',
      timeRemaining,
      roundNumber: round.roundNumber,
      shoeNumber: round.shoeNumber,
      roadmap: {
        banker: table.bankerWins,
        player: table.playerWins,
        tie: table.tieCount,
      },
    });
  }

  // Timer tick every second
  timerInterval = setInterval(() => {
    timeRemaining--;
    setTimeRemaining(timeRemaining);

    io.to('table:default').emit('game:timer', {
      timeRemaining,
      phase: 'betting',
    });

    // Also update lobby with countdown for all baccarat tables
    for (const table of baccaratTables) {
      io.to('lobby').emit('lobby:tableUpdate', {
        tableId: table.id,
        phase: 'betting',
        timeRemaining,
        roundNumber: round.roundNumber,
        shoeNumber: round.shoeNumber,
        roadmap: {
          banker: table.bankerWins,
          player: table.playerWins,
          tie: table.tieCount,
        },
      });
    }

    if (timeRemaining <= 0 && timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }, 1000);

  // Wait for betting phase to end
  await delay(duration);

  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Move to sealed phase
  runPhase(io, 'sealed');
}

async function handleSealedPhase(io: TypedServer, duration: number): Promise<void> {
  const round = getCurrentRound();

  // Broadcast phase change - no more bets
  io.to('table:default').emit('game:phase', {
    phase: 'sealed',
    timeRemaining: Math.floor(duration / 1000),
    roundId: round?.id || null,
  });

  console.log('[GameLoop] Betting sealed, no more bets');

  await delay(duration);
  runPhase(io, 'dealing');
}

async function handleDealingPhase(io: TypedServer): Promise<void> {
  const round = getCurrentRound();

  // Check if shoe needs reshuffle (less than 20 cards remaining)
  if (currentShoe.length < 20) {
    await startNewShoe();
    currentShoe = createShoe();
    burnCards(currentShoe);
    setShuffledDeck(currentShoe);
    setCardsRemaining(currentShoe.length);
    await savePersistedState();

    // Reset all baccarat table statistics in DB
    const resetTables = await prisma.gameTable.findMany({
      where: { gameType: 'baccarat', isActive: true },
    });
    for (const table of resetTables) {
      await prisma.gameTable.update({
        where: { id: table.id },
        data: { shoeNumber: getShoeNumber(), roundNumber: 0, bankerWins: 0, playerWins: 0, tieCount: 0 },
      });
      io.to('lobby').emit('lobby:tableUpdate', {
        tableId: table.id,
        phase: 'dealing' as const,
        timeRemaining: 0,
        roundNumber: 0,
        shoeNumber: getShoeNumber(),
        roadmap: { banker: 0, player: 0, tie: 0 },
        newShoe: true,
      });
    }

    console.log(`[GameLoop] New shoe #${getShoeNumber()} created with ${currentShoe.length} cards — stats reset`);
  }

  // Broadcast phase change
  io.to('table:default').emit('game:phase', {
    phase: 'dealing',
    timeRemaining: Math.floor(PHASE_DURATIONS.dealing / 1000),
    roundId: round?.id || null,
  });

  // Play the round using existing game logic
  const roundResult = playRound(currentShoe);
  console.log(
    `[GameLoop] Cards dealt: Player ${roundResult.playerPoints} vs Banker ${roundResult.bankerPoints} = ${roundResult.result}`
  );

  // Store result in state
  setRoundResult(roundResult);

  // Emit cards sequentially for animation
  // Player card 1
  io.to('table:default').emit('game:card', {
    target: 'player',
    cardIndex: 0,
    card: roundResult.playerCards[0],
    currentPoints: roundResult.playerCards[0].value % 10,
  });
  await delay(1200);

  // Banker card 1
  io.to('table:default').emit('game:card', {
    target: 'banker',
    cardIndex: 0,
    card: roundResult.bankerCards[0],
    currentPoints: roundResult.bankerCards[0].value % 10,
  });
  await delay(1200);

  // Player card 2
  const playerTwoCardPoints =
    (roundResult.playerCards[0].value + roundResult.playerCards[1].value) % 10;
  io.to('table:default').emit('game:card', {
    target: 'player',
    cardIndex: 1,
    card: roundResult.playerCards[1],
    currentPoints: playerTwoCardPoints,
  });
  await delay(1200);

  // Banker card 2
  const bankerTwoCardPoints =
    (roundResult.bankerCards[0].value + roundResult.bankerCards[1].value) % 10;
  io.to('table:default').emit('game:card', {
    target: 'banker',
    cardIndex: 1,
    card: roundResult.bankerCards[1],
    currentPoints: bankerTwoCardPoints,
  });
  await delay(1500);

  // Third cards if applicable
  if (roundResult.playerCards.length > 2) {
    io.to('table:default').emit('game:card', {
      target: 'player',
      cardIndex: 2,
      card: roundResult.playerCards[2],
      currentPoints: roundResult.playerPoints,
    });
    await delay(1200);
  }

  if (roundResult.bankerCards.length > 2) {
    io.to('table:default').emit('game:card', {
      target: 'banker',
      cardIndex: 2,
      card: roundResult.bankerCards[2],
      currentPoints: roundResult.bankerPoints,
    });
    await delay(1200);
  }

  // Emit final result
  io.to('table:default').emit('game:result', {
    roundId: round?.id || '',
    roundNumber: round?.roundNumber || 0,
    result: roundResult.result,
    playerCards: roundResult.playerCards,
    bankerCards: roundResult.bankerCards,
    playerPoints: roundResult.playerPoints,
    bankerPoints: roundResult.bankerPoints,
    playerPair: roundResult.playerPair,
    bankerPair: roundResult.bankerPair,
  });

  // Move to result phase
  runPhase(io, 'result');
}

async function handleResultPhase(io: TypedServer, duration: number): Promise<void> {
  const round = getCurrentRound();

  // Broadcast phase change
  io.to('table:default').emit('game:phase', {
    phase: 'result',
    timeRemaining: Math.floor(duration / 1000),
    roundId: round?.id || null,
  });

  console.log(`[GameLoop] Result displayed: ${round?.result}`);

  // Perform settlement immediately (no separate settlement phase)
  if (round && round.result) {
    // Get the default baccarat table for linking and statistics
    const baccaratTable = await prisma.gameTable.findFirst({
      where: { gameType: 'baccarat', isActive: true },
    });

    // Persist round to database
    const savedRound = await prisma.gameRound.create({
      data: {
        shoeNumber: round.shoeNumber,
        tableId: baccaratTable?.id || null,
        playerCards: round.playerCards as any,
        bankerCards: round.bankerCards as any,
        playerPoints: round.playerPoints,
        bankerPoints: round.bankerPoints,
        result: round.result,
        playerPair: round.playerPair,
        bankerPair: round.bankerPair,
      },
    });

    console.log(`[GameLoop] Round #${round.roundNumber} saved to database with ID: ${savedRound.id}`);

    // Settle all bets and emit personal results
    const settlements = await settleAllBets(savedRound.id);

    for (const settlement of settlements) {
      // Emit to user's personal room
      io.to(`user:${settlement.userId}`).emit('bet:settlement', {
        roundId: savedRound.id,
        bets: settlement.betResults,
        totalBet: settlement.totalBet,
        totalPayout: settlement.totalPayout,
        netResult: settlement.netResult,
        newBalance: settlement.newBalance,
      });

      console.log(
        `[GameLoop] Settled for user ${settlement.userId}: bet=${settlement.totalBet}, payout=${settlement.totalPayout}, net=${settlement.netResult}`
      );
    }

    // Update table statistics in database and broadcast to lobby for ALL baccarat tables
    const baccaratTables = await prisma.gameTable.findMany({
      where: { gameType: 'baccarat', isActive: true },
    });

    for (const table of baccaratTables) {
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
        where: { id: table.id },
        data: updateData,
      });

      console.log(`[GameLoop] Updated table ${table.name} statistics: ${round.result}`);

      // Broadcast table update to lobby
      io.to('lobby').emit('lobby:tableUpdate', {
        tableId: updatedTable.id,
        phase: 'result',
        timeRemaining: Math.floor(duration / 1000),
        roundNumber: updatedTable.roundNumber,
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
    }

    // Emit roadmap update to all
    const recentRounds = await getRecentRounds(100);
    io.to('table:default').emit('game:roadmap', {
      recentRounds,
    });

    // Clear bets for next round
    clearAllBets();

    // Update persisted deck state
    setShuffledDeck(currentShoe);
    setCardsRemaining(currentShoe.length);
    await savePersistedState();

    console.log(`[GameLoop] Settlement complete, ${currentShoe.length} cards remaining in shoe #${getShoeNumber()}`);
  }

  await delay(duration);

  // Start next round
  runPhase(io, 'betting');
}

