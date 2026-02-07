import { prisma } from '../lib/prisma.js';
import type { Card, BullBullRoundResult, BullBullBetType, BullBullRank, HandResult } from '../utils/bullBullLogic.js';
import { calculateBBBetResult, getRankDisplayName } from '../utils/bullBullLogic.js';

// Re-export GamePhase type for other modules
export type GamePhase = 'betting' | 'sealed' | 'dealing' | 'result';


// Current round info stored in memory
export interface BullBullCurrentRound {
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
}

// Bet entry for Bull Bull
export interface BBBetEntry {
  type: BullBullBetType;
  amount: number;
}

// Persistent state (loaded from DB on startup)
interface PersistedState {
  shoeNumber: number;
  roundCounter: number;
  cardsRemaining: number;
  shuffledDeck: Card[] | null;
}

// In-memory state
let currentPhase: GamePhase = 'betting';
let currentRound: BullBullCurrentRound | null = null;
let roundCounter = 0;
let shoeNumber = 1;
let cardsRemaining = 416;
let shuffledDeck: Card[] | null = null;
let timeRemaining = 0;

// Map of userId -> their bets for current round
const currentBets = new Map<string, BBBetEntry[]>();

// Map of userId -> reserved balance (already deducted from DB)
const reservedBalances = new Map<string, number>();

// ============================================
// State Persistence
// ============================================

const SINGLETON_ID = 'bb_singleton';

export async function loadPersistedState(): Promise<void> {
  try {
    let state = await prisma.bullBullGameState.findUnique({
      where: { id: SINGLETON_ID },
    });

    if (!state) {
      // Create initial state
      state = await prisma.bullBullGameState.create({
        data: {
          id: SINGLETON_ID,
          shoeNumber: 1,
          roundCounter: 0,
          cardsRemaining: 416,
        },
      });
      console.log('[BullBullState] Created initial persisted state');
    }

    shoeNumber = state.shoeNumber;
    roundCounter = state.roundCounter;
    cardsRemaining = state.cardsRemaining;
    shuffledDeck = state.shuffledDeck as Card[] | null;

    console.log(`[BullBullState] Loaded persisted state: shoe #${shoeNumber}, round #${roundCounter}, cards remaining: ${cardsRemaining}`);
  } catch (error) {
    console.error('[BullBullState] Failed to load persisted state:', error);
    // Continue with default values
  }
}

export async function savePersistedState(): Promise<void> {
  try {
    await prisma.bullBullGameState.upsert({
      where: { id: SINGLETON_ID },
      update: {
        shoeNumber,
        roundCounter,
        cardsRemaining,
        shuffledDeck: shuffledDeck as any,
      },
      create: {
        id: SINGLETON_ID,
        shoeNumber,
        roundCounter,
        cardsRemaining,
        shuffledDeck: shuffledDeck as any,
      },
    });
  } catch (error) {
    console.error('[BullBullState] Failed to save persisted state:', error);
  }
}

export function getShoeNumber(): number {
  return shoeNumber;
}

export function setShoeNumber(num: number): void {
  shoeNumber = num;
}

export function getCardsRemaining(): number {
  return cardsRemaining;
}

export function setCardsRemaining(count: number): void {
  cardsRemaining = count;
}

export function getShuffledDeck(): Card[] | null {
  return shuffledDeck;
}

export function setShuffledDeck(deck: Card[] | null): void {
  shuffledDeck = deck;
}

// ============================================
// Phase Management
// ============================================

export function setPhase(phase: GamePhase): void {
  currentPhase = phase;
}

export function getPhase(): GamePhase {
  return currentPhase;
}

export function setTimeRemaining(time: number): void {
  timeRemaining = time;
}

export function getTimeRemaining(): number {
  return timeRemaining;
}

// ============================================
// Round Management
// ============================================

export function getCurrentRound(): BullBullCurrentRound | null {
  return currentRound;
}

export function getRoundCounter(): number {
  return roundCounter;
}

export async function createNewRound(): Promise<BullBullCurrentRound> {
  roundCounter++;
  currentRound = {
    id: `bb-round-${Date.now()}-${roundCounter}`,
    roundNumber: roundCounter,
    shoeNumber,
    startedAt: new Date(),
    banker: null,
    player1: null,
    player2: null,
    player3: null,
    player1Result: null,
    player2Result: null,
    player3Result: null,
  };

  // Persist the new round counter
  await savePersistedState();

  return currentRound;
}

// Start a new shoe (reset deck)
export async function startNewShoe(): Promise<void> {
  shoeNumber++;
  cardsRemaining = 416;
  shuffledDeck = null;
  await savePersistedState();
  console.log(`[BullBullState] Started new shoe #${shoeNumber}`);
}

export function setRoundResult(result: BullBullRoundResult): void {
  if (currentRound) {
    currentRound.banker = result.banker;
    currentRound.player1 = result.player1;
    currentRound.player2 = result.player2;
    currentRound.player3 = result.player3;
    currentRound.player1Result = result.player1Result;
    currentRound.player2Result = result.player2Result;
    currentRound.player3Result = result.player3Result;
  }
}

// ============================================
// Bet Management
// ============================================

// Default betting limits for Bull Bull
const DEFAULT_LIMITS = {
  bankerMin: 10, bankerMax: 100000,
  playerMin: 10, playerMax: 100000,
};

// Helper function to get min/max for bet type
function getLimitForBetType(
  limit: typeof DEFAULT_LIMITS,
  betType: BullBullBetType
): { min: number; max: number } {
  switch (betType) {
    case 'bb_banker':
      return { min: limit.bankerMin, max: limit.bankerMax };
    case 'bb_player1':
    case 'bb_player2':
    case 'bb_player3':
      return { min: limit.playerMin, max: limit.playerMax };
    default:
      return { min: limit.playerMin, max: limit.playerMax };
  }
}

export async function placeBet(
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
  // Check phase
  if (currentPhase !== 'betting') {
    return {
      success: false,
      errorCode: 'BETTING_CLOSED',
      errorMessage: 'Betting is closed for this round',
    };
  }

  // Get user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      balance: true,
      status: true,
    },
  });

  if (!user) {
    return {
      success: false,
      errorCode: 'USER_NOT_FOUND',
      errorMessage: 'User not found',
    };
  }

  if (user.status !== 'active') {
    return {
      success: false,
      errorCode: 'USER_INACTIVE',
      errorMessage: 'User account is not active',
    };
  }

  const limits = DEFAULT_LIMITS;

  const currentBalance = Number(user.balance);
  const existingBets = currentBets.get(userId) || [];
  const existingTotal = existingBets.reduce((sum, b) => sum + b.amount, 0);
  const newBetTotal = bets.reduce((sum, b) => sum + b.amount, 0);

  // Calculate total after new bets
  const totalRequired = existingTotal + newBetTotal;

  if (totalRequired > currentBalance) {
    return {
      success: false,
      errorCode: 'INSUFFICIENT_BALANCE',
      errorMessage: 'Insufficient balance',
    };
  }

  // Validate bet amounts and check limits
  for (const bet of bets) {
    if (bet.amount <= 0) {
      return {
        success: false,
        errorCode: 'INVALID_BET_AMOUNT',
        errorMessage: 'Bet amount must be positive',
      };
    }

    // Calculate total for this bet type after merge
    const existingForType = existingBets.find((b) => b.type === bet.type)?.amount || 0;
    const totalForType = existingForType + bet.amount;

    // Get limits for this bet type
    const { min, max } = getLimitForBetType(limits, bet.type);

    if (totalForType < min) {
      return {
        success: false,
        errorCode: 'BET_BELOW_MIN',
        errorMessage: `最低下注 ${min}`,
      };
    }

    if (totalForType > max) {
      return {
        success: false,
        errorCode: 'BET_ABOVE_MAX',
        errorMessage: `最高下注 ${max}`,
      };
    }
  }

  // Merge new bets with existing
  const mergedBets = [...existingBets];
  for (const newBet of bets) {
    const existingIndex = mergedBets.findIndex((b) => b.type === newBet.type);
    if (existingIndex >= 0) {
      mergedBets[existingIndex].amount += newBet.amount;
    } else {
      mergedBets.push({ ...newBet });
    }
  }

  // Deduct balance immediately for the new bets only
  await prisma.user.update({
    where: { id: userId },
    data: { balance: { decrement: newBetTotal } },
  });

  // Update state
  currentBets.set(userId, mergedBets);
  reservedBalances.set(userId, totalRequired);

  return {
    success: true,
    roundId: currentRound?.id,
    bets: mergedBets,
    totalBet: totalRequired,
    newBalance: currentBalance - newBetTotal,
  };
}

export async function clearBets(userId: string): Promise<{
  success: boolean;
  newBalance?: number;
  errorCode?: string;
  errorMessage?: string;
}> {
  if (currentPhase !== 'betting') {
    return {
      success: false,
      errorCode: 'BETTING_CLOSED',
      errorMessage: 'Cannot clear bets after betting phase',
    };
  }

  const existingBets = currentBets.get(userId) || [];
  const totalToRefund = existingBets.reduce((sum, b) => sum + b.amount, 0);

  if (totalToRefund > 0) {
    // Refund the balance
    await prisma.user.update({
      where: { id: userId },
      data: { balance: { increment: totalToRefund } },
    });

    // Get updated balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    // Clear state
    currentBets.delete(userId);
    reservedBalances.delete(userId);

    return {
      success: true,
      newBalance: Number(user?.balance || 0),
    };
  }

  return { success: true };
}

export function getAllBets(): Map<string, BBBetEntry[]> {
  return currentBets;
}

export function getUserBets(userId: string): BBBetEntry[] {
  return currentBets.get(userId) || [];
}

// ============================================
// Settlement
// ============================================

export interface SettlementResult {
  userId: string;
  betResults: Array<{
    type: BullBullBetType;
    amount: number;
    won: boolean;
    payout: number;
    multiplier: number;
  }>;
  totalBet: number;
  totalPayout: number;
  netResult: number;
  newBalance: number;
}

export async function settleAllBets(savedRoundId: string): Promise<SettlementResult[]> {
  const settlements: SettlementResult[] = [];
  const round = currentRound;

  if (!round || !round.banker || !round.player1 || !round.player2 || !round.player3) {
    return [];
  }

  const roundResult: BullBullRoundResult = {
    banker: round.banker,
    player1: round.player1,
    player2: round.player2,
    player3: round.player3,
    player1Result: round.player1Result!,
    player2Result: round.player2Result!,
    player3Result: round.player3Result!,
  };

  for (const [userId, bets] of currentBets.entries()) {
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

    // Calculate total payout
    let totalPayout = 0;
    for (const result of betResults) {
      if (result.won) {
        // Won: get back stake + winnings
        totalPayout += result.amount + result.payout;
      }
      // Lost: nothing returned
    }

    const netResult = totalPayout - totalBet;

    // Update user balance with winnings
    if (totalPayout > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: totalPayout } },
      });
    }

    // Get final balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    // Save bets to database
    for (const bet of betResults) {
      const status = bet.won ? 'won' : 'lost';
      const payoutAmount = bet.won ? bet.amount + bet.payout : 0;

      await prisma.bet.create({
        data: {
          userId,
          bullBullRoundId: savedRoundId,
          betType: bet.type as any,
          amount: bet.amount,
          payout: payoutAmount,
          status,
        },
      });
    }

    // Create transaction records
    const finalBalance = Number(user?.balance || 0);
    const balanceBeforeBet = finalBalance - netResult;

    // Bet transaction
    await prisma.transaction.create({
      data: {
        userId,
        operatorId: userId,
        type: 'bet',
        amount: -totalBet,
        balanceBefore: balanceBeforeBet + totalBet,
        balanceAfter: balanceBeforeBet,
        note: `Bull Bull Round #${round.roundNumber} - Bets: ${bets.map((b) => `${b.type}:${b.amount}`).join(', ')}`,
      },
    });

    if (totalPayout > 0) {
      await prisma.transaction.create({
        data: {
          userId,
          operatorId: userId,
          type: 'win',
          amount: totalPayout,
          balanceBefore: balanceBeforeBet,
          balanceAfter: finalBalance,
          note: `Bull Bull Round #${round.roundNumber}`,
        },
      });
    }

    settlements.push({
      userId,
      betResults,
      totalBet,
      totalPayout,
      netResult,
      newBalance: finalBalance,
    });
  }

  return settlements;
}

export function clearAllBets(): void {
  currentBets.clear();
  reservedBalances.clear();
}

// ============================================
// State Accessors
// ============================================

export function getGameState(userId?: string) {
  return {
    phase: currentPhase,
    roundId: currentRound?.id || null,
    roundNumber: currentRound?.roundNumber || 0,
    shoeNumber: currentRound?.shoeNumber || 1,
    timeRemaining,
    banker: currentRound?.banker || null,
    player1: currentRound?.player1 || null,
    player2: currentRound?.player2 || null,
    player3: currentRound?.player3 || null,
    player1Result: currentRound?.player1Result || null,
    player2Result: currentRound?.player2Result || null,
    player3Result: currentRound?.player3Result || null,
    myBets: userId ? currentBets.get(userId) || [] : [],
  };
}

// Get recent rounds for roadmap (from database)
export async function getRecentRounds(limit: number = 100) {
  const rounds = await prisma.bullBullRound.findMany({
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
