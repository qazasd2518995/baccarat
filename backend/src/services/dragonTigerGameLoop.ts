import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { createShoe, playDragonTigerRound, type Card } from '../utils/dragonTigerLogic.js';
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
  type GamePhase,
} from './dragonTigerState.js';

const prisma = new PrismaClient();

// Phase durations in milliseconds (Dragon Tiger is faster than Baccarat)
const PHASE_DURATIONS: Record<GamePhase, number> = {
  betting: 35000,    // 35 seconds
  sealed: 3000,      // 3 seconds
  dealing: 5000,     // 5 seconds (only 2 cards, faster than baccarat)
  result: 5000,      // 5 seconds
};

// Current shoe (in-memory, but state is persisted)
let currentShoe: Card[] = [];

// Timer reference
let timerInterval: NodeJS.Timeout | null = null;

// Helper function for delays
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Initialize and start the game loop
export async function startDragonTigerGameLoop(io: Server): Promise<void> {
  console.log('[DragonTiger] Starting game loop...');

  // Load persisted state from database
  await loadPersistedState();

  // Restore or create deck
  const persistedDeck = getShuffledDeck();
  if (persistedDeck && persistedDeck.length > 0) {
    currentShoe = persistedDeck;
    console.log(`[DragonTiger] Restored deck with ${currentShoe.length} cards from shoe #${getShoeNumber()}`);
  } else {
    currentShoe = createShoe();
    setShuffledDeck(currentShoe);
    setCardsRemaining(currentShoe.length);
    await savePersistedState();
    console.log(`[DragonTiger] Shoe #${getShoeNumber()} created with ${currentShoe.length} cards`);
  }

  runPhase(io, 'betting');
}

// Main phase runner
async function runPhase(io: Server, phase: GamePhase): Promise<void> {
  console.log(`[DragonTiger] Entering phase: ${phase}`);
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
  io: Server,
  duration: number,
  timeRemaining: number
): Promise<void> {
  // Create new round at start of betting
  const round = await createNewRound();
  console.log(`[DragonTiger] New round #${round.roundNumber} started in shoe #${round.shoeNumber}`);

  // Broadcast phase change to Dragon Tiger table
  io.to('table:dragontiger').emit('dt:phase', {
    phase: 'betting',
    timeRemaining,
    roundId: round.id,
  });

  // Timer tick every second
  timerInterval = setInterval(() => {
    timeRemaining--;
    setTimeRemaining(timeRemaining);

    io.to('table:dragontiger').emit('dt:timer', {
      timeRemaining,
      phase: 'betting',
    });

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

async function handleSealedPhase(io: Server, duration: number): Promise<void> {
  const round = getCurrentRound();

  // Broadcast phase change - no more bets
  io.to('table:dragontiger').emit('dt:phase', {
    phase: 'sealed',
    timeRemaining: Math.floor(duration / 1000),
    roundId: round?.id || null,
  });

  console.log('[DragonTiger] Betting sealed, no more bets');

  await delay(duration);
  runPhase(io, 'dealing');
}

async function handleDealingPhase(io: Server): Promise<void> {
  const round = getCurrentRound();

  // Check if shoe needs reshuffle (less than 10 cards remaining for Dragon Tiger)
  if (currentShoe.length < 10) {
    await startNewShoe();
    currentShoe = createShoe();
    setShuffledDeck(currentShoe);
    setCardsRemaining(currentShoe.length);
    await savePersistedState();
    console.log(`[DragonTiger] New shoe #${getShoeNumber()} created with ${currentShoe.length} cards`);
  }

  // Broadcast phase change
  io.to('table:dragontiger').emit('dt:phase', {
    phase: 'dealing',
    timeRemaining: Math.floor(PHASE_DURATIONS.dealing / 1000),
    roundId: round?.id || null,
  });

  // Play the round
  const roundResult = playDragonTigerRound(currentShoe);
  console.log(
    `[DragonTiger] Cards dealt: Dragon ${roundResult.dragonValue} vs Tiger ${roundResult.tigerValue} = ${roundResult.result}${roundResult.isSuitedTie ? ' (Suited Tie!)' : ''}`
  );

  // Store result in state
  setRoundResult(roundResult);

  // Emit cards sequentially for animation
  // Dragon card
  io.to('table:dragontiger').emit('dt:card', {
    target: 'dragon',
    card: roundResult.dragonCard,
    value: roundResult.dragonValue,
  });
  await delay(1500);

  // Tiger card
  io.to('table:dragontiger').emit('dt:card', {
    target: 'tiger',
    card: roundResult.tigerCard,
    value: roundResult.tigerValue,
  });
  await delay(1500);

  // Emit final result
  io.to('table:dragontiger').emit('dt:result', {
    roundId: round?.id || '',
    roundNumber: round?.roundNumber || 0,
    result: roundResult.result,
    dragonCard: roundResult.dragonCard,
    tigerCard: roundResult.tigerCard,
    dragonValue: roundResult.dragonValue,
    tigerValue: roundResult.tigerValue,
    isSuitedTie: roundResult.isSuitedTie,
  });

  // Move to result phase
  runPhase(io, 'result');
}

async function handleResultPhase(io: Server, duration: number): Promise<void> {
  const round = getCurrentRound();

  // Broadcast phase change
  io.to('table:dragontiger').emit('dt:phase', {
    phase: 'result',
    timeRemaining: Math.floor(duration / 1000),
    roundId: round?.id || null,
  });

  console.log(`[DragonTiger] Result displayed: ${round?.result}`);

  // Perform settlement
  if (round && round.result) {
    // Map result to GameResult enum
    let dbResult: 'dragon' | 'tiger' | 'dt_tie' = 'dt_tie';
    if (round.result === 'dragon') dbResult = 'dragon';
    else if (round.result === 'tiger') dbResult = 'tiger';

    // Persist round to database
    const savedRound = await prisma.dragonTigerRound.create({
      data: {
        shoeNumber: round.shoeNumber,
        dragonCard: round.dragonCard as any,
        tigerCard: round.tigerCard as any,
        dragonValue: round.dragonValue,
        tigerValue: round.tigerValue,
        result: dbResult,
        isSuitedTie: round.isSuitedTie,
      },
    });

    console.log(`[DragonTiger] Round #${round.roundNumber} saved to database with ID: ${savedRound.id}`);

    // Settle all bets and emit personal results
    const settlements = await settleAllBets(savedRound.id);

    for (const settlement of settlements) {
      // Emit to user's personal room
      io.to(`user:${settlement.userId}`).emit('dt:settlement', {
        roundId: savedRound.id,
        bets: settlement.betResults,
        totalBet: settlement.totalBet,
        totalPayout: settlement.totalPayout,
        netResult: settlement.netResult,
        newBalance: settlement.newBalance,
      });

      console.log(
        `[DragonTiger] Settled for user ${settlement.userId}: bet=${settlement.totalBet}, payout=${settlement.totalPayout}, net=${settlement.netResult}`
      );
    }

    // Emit roadmap update to all
    const recentRounds = await getRecentRounds(100);
    io.to('table:dragontiger').emit('dt:roadmap', {
      recentRounds,
    });

    // Clear bets for next round
    clearAllBets();

    // Update persisted deck state
    setShuffledDeck(currentShoe);
    setCardsRemaining(currentShoe.length);
    await savePersistedState();

    console.log(`[DragonTiger] Settlement complete, ${currentShoe.length} cards remaining in shoe #${getShoeNumber()}`);
  }

  await delay(duration);

  // Start next round
  runPhase(io, 'betting');
}
