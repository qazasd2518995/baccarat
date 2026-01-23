import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { createShoe, playBullBullRound, getRankDisplayName, type Card } from '../utils/bullBullLogic.js';
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
} from './bullBullState.js';

const prisma = new PrismaClient();

// Phase durations in milliseconds (Bull Bull has more cards to show)
const PHASE_DURATIONS: Record<GamePhase, number> = {
  betting: 35000,    // 35 seconds
  sealed: 3000,      // 3 seconds
  dealing: 15000,    // 15 seconds (20 cards total, need more time)
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
export async function startBullBullGameLoop(io: Server): Promise<void> {
  console.log('[BullBull] Starting game loop...');

  // Load persisted state from database
  await loadPersistedState();

  // Restore or create deck
  const persistedDeck = getShuffledDeck();
  if (persistedDeck && persistedDeck.length > 0) {
    currentShoe = persistedDeck;
    console.log(`[BullBull] Restored deck with ${currentShoe.length} cards from shoe #${getShoeNumber()}`);
  } else {
    currentShoe = createShoe();
    setShuffledDeck(currentShoe);
    setCardsRemaining(currentShoe.length);
    await savePersistedState();
    console.log(`[BullBull] Shoe #${getShoeNumber()} created with ${currentShoe.length} cards`);
  }

  runPhase(io, 'betting');
}

// Main phase runner
async function runPhase(io: Server, phase: GamePhase): Promise<void> {
  console.log(`[BullBull] Entering phase: ${phase}`);
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
  console.log(`[BullBull] New round #${round.roundNumber} started in shoe #${round.shoeNumber}`);

  // Broadcast phase change to Bull Bull table
  io.to('table:bullbull').emit('bb:phase', {
    phase: 'betting',
    timeRemaining,
    roundId: round.id,
  });

  // Timer tick every second
  timerInterval = setInterval(() => {
    timeRemaining--;
    setTimeRemaining(timeRemaining);

    io.to('table:bullbull').emit('bb:timer', {
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
  io.to('table:bullbull').emit('bb:phase', {
    phase: 'sealed',
    timeRemaining: Math.floor(duration / 1000),
    roundId: round?.id || null,
  });

  console.log('[BullBull] Betting sealed, no more bets');

  await delay(duration);
  runPhase(io, 'dealing');
}

async function handleDealingPhase(io: Server): Promise<void> {
  const round = getCurrentRound();

  // Check if shoe needs reshuffle (need at least 20 cards for one round)
  if (currentShoe.length < 30) {
    await startNewShoe();
    currentShoe = createShoe();
    setShuffledDeck(currentShoe);
    setCardsRemaining(currentShoe.length);
    await savePersistedState();
    console.log(`[BullBull] New shoe #${getShoeNumber()} created with ${currentShoe.length} cards`);
  }

  // Broadcast phase change
  io.to('table:bullbull').emit('bb:phase', {
    phase: 'dealing',
    timeRemaining: Math.floor(PHASE_DURATIONS.dealing / 1000),
    roundId: round?.id || null,
  });

  // Play the round
  const roundResult = playBullBullRound(currentShoe);

  console.log(
    `[BullBull] Cards dealt: Banker ${getRankDisplayName(roundResult.banker.rank)}, ` +
    `P1 ${getRankDisplayName(roundResult.player1.rank)} (${roundResult.player1Result}), ` +
    `P2 ${getRankDisplayName(roundResult.player2.rank)} (${roundResult.player2Result}), ` +
    `P3 ${getRankDisplayName(roundResult.player3.rank)} (${roundResult.player3Result})`
  );

  // Store result in state
  setRoundResult(roundResult);

  // Emit cards with animation
  // Deal cards in sequence: banker, player1, player2, player3 - 5 cards each
  const positions = ['banker', 'player1', 'player2', 'player3'] as const;
  const hands = [roundResult.banker, roundResult.player1, roundResult.player2, roundResult.player3];

  // First deal all cards face down (initial deal)
  for (let cardIndex = 0; cardIndex < 5; cardIndex++) {
    for (let posIndex = 0; posIndex < 4; posIndex++) {
      io.to('table:bullbull').emit('bb:card', {
        target: positions[posIndex],
        cardIndex,
        card: hands[posIndex].cards[cardIndex],
        isFaceUp: false,
      });
      await delay(200); // Quick dealing
    }
  }

  await delay(1000);

  // Reveal each hand one by one with their rank
  for (let posIndex = 0; posIndex < 4; posIndex++) {
    const hand = hands[posIndex];
    io.to('table:bullbull').emit('bb:reveal', {
      target: positions[posIndex],
      cards: hand.cards,
      rank: hand.rank,
      rankName: getRankDisplayName(hand.rank),
      combination: hand.combination,
    });
    await delay(1500);
  }

  // Emit final result
  io.to('table:bullbull').emit('bb:result', {
    roundId: round?.id || '',
    roundNumber: round?.roundNumber || 0,
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

  // Move to result phase
  runPhase(io, 'result');
}

async function handleResultPhase(io: Server, duration: number): Promise<void> {
  const round = getCurrentRound();

  // Broadcast phase change
  io.to('table:bullbull').emit('bb:phase', {
    phase: 'result',
    timeRemaining: Math.floor(duration / 1000),
    roundId: round?.id || null,
  });

  console.log(`[BullBull] Result displayed`);

  // Perform settlement
  if (round && round.banker && round.player1 && round.player2 && round.player3) {
    // Persist round to database
    const savedRound = await prisma.bullBullRound.create({
      data: {
        shoeNumber: round.shoeNumber,
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

    console.log(`[BullBull] Round #${round.roundNumber} saved to database with ID: ${savedRound.id}`);

    // Settle all bets and emit personal results
    const settlements = await settleAllBets(savedRound.id);

    for (const settlement of settlements) {
      // Emit to user's personal room
      io.to(`user:${settlement.userId}`).emit('bb:settlement', {
        roundId: savedRound.id,
        bets: settlement.betResults,
        totalBet: settlement.totalBet,
        totalPayout: settlement.totalPayout,
        netResult: settlement.netResult,
        newBalance: settlement.newBalance,
      });

      console.log(
        `[BullBull] Settled for user ${settlement.userId}: bet=${settlement.totalBet}, payout=${settlement.totalPayout}, net=${settlement.netResult}`
      );
    }

    // Emit roadmap update to all
    const recentRounds = await getRecentRounds(100);
    io.to('table:bullbull').emit('bb:roadmap', {
      recentRounds,
    });

    // Clear bets for next round
    clearAllBets();

    // Update persisted deck state
    setShuffledDeck(currentShoe);
    setCardsRemaining(currentShoe.length);
    await savePersistedState();

    console.log(`[BullBull] Settlement complete, ${currentShoe.length} cards remaining in shoe #${getShoeNumber()}`);
  }

  await delay(duration);

  // Start next round
  runPhase(io, 'betting');
}
