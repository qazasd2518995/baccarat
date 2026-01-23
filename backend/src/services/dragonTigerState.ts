import { PrismaClient } from '@prisma/client';
import type { Card, DragonTigerRoundResult, DragonTigerBetType } from '../utils/dragonTigerLogic.js';
import { calculateDTBetResult } from '../utils/dragonTigerLogic.js';

// Re-export GamePhase type for other modules
export type GamePhase = 'betting' | 'sealed' | 'dealing' | 'result';

const prisma = new PrismaClient();

// Current round info stored in memory
export interface DragonTigerCurrentRound {
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
}

// Bet entry for Dragon Tiger
export interface DTBetEntry {
  type: DragonTigerBetType;
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
let currentRound: DragonTigerCurrentRound | null = null;
let roundCounter = 0;
let shoeNumber = 1;
let cardsRemaining = 416;
let shuffledDeck: Card[] | null = null;
let timeRemaining = 0;

// Map of userId -> their bets for current round
const currentBets = new Map<string, DTBetEntry[]>();

// Map of userId -> reserved balance (already deducted from DB)
const reservedBalances = new Map<string, number>();

// ============================================
// State Persistence
// ============================================

const SINGLETON_ID = 'dt_singleton';

export async function loadPersistedState(): Promise<void> {
  try {
    let state = await prisma.dragonTigerGameState.findUnique({
      where: { id: SINGLETON_ID },
    });

    if (!state) {
      // Create initial state
      state = await prisma.dragonTigerGameState.create({
        data: {
          id: SINGLETON_ID,
          shoeNumber: 1,
          roundCounter: 0,
          cardsRemaining: 416,
        },
      });
      console.log('[DragonTigerState] Created initial persisted state');
    }

    shoeNumber = state.shoeNumber;
    roundCounter = state.roundCounter;
    cardsRemaining = state.cardsRemaining;
    shuffledDeck = state.shuffledDeck as Card[] | null;

    console.log(`[DragonTigerState] Loaded persisted state: shoe #${shoeNumber}, round #${roundCounter}, cards remaining: ${cardsRemaining}`);
  } catch (error) {
    console.error('[DragonTigerState] Failed to load persisted state:', error);
    // Continue with default values
  }
}

export async function savePersistedState(): Promise<void> {
  try {
    await prisma.dragonTigerGameState.upsert({
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
    console.error('[DragonTigerState] Failed to save persisted state:', error);
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

export function getCurrentRound(): DragonTigerCurrentRound | null {
  return currentRound;
}

export function getRoundCounter(): number {
  return roundCounter;
}

export async function createNewRound(): Promise<DragonTigerCurrentRound> {
  roundCounter++;
  currentRound = {
    id: `dt-round-${Date.now()}-${roundCounter}`,
    roundNumber: roundCounter,
    shoeNumber,
    startedAt: new Date(),
    dragonCard: null,
    tigerCard: null,
    dragonValue: 0,
    tigerValue: 0,
    result: null,
    isSuitedTie: false,
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
  console.log(`[DragonTigerState] Started new shoe #${shoeNumber}`);
}

export function setRoundResult(result: DragonTigerRoundResult): void {
  if (currentRound) {
    currentRound.dragonCard = result.dragonCard;
    currentRound.tigerCard = result.tigerCard;
    currentRound.dragonValue = result.dragonValue;
    currentRound.tigerValue = result.tigerValue;
    currentRound.result = result.result;
    currentRound.isSuitedTie = result.isSuitedTie;
  }
}

// ============================================
// Bet Management
// ============================================

// Default betting limits for Dragon Tiger
const DEFAULT_LIMITS = {
  dragonMin: 10, dragonMax: 100000,
  tigerMin: 10, tigerMax: 100000,
  tieMin: 10, tieMax: 50000,
  suitedTieMin: 10, suitedTieMax: 10000,
  bigSmallMin: 10, bigSmallMax: 50000,
};

// Helper function to get min/max for bet type
function getLimitForBetType(
  limit: typeof DEFAULT_LIMITS,
  betType: DragonTigerBetType
): { min: number; max: number } {
  switch (betType) {
    case 'dragon':
      return { min: limit.dragonMin, max: limit.dragonMax };
    case 'tiger':
      return { min: limit.tigerMin, max: limit.tigerMax };
    case 'dt_tie':
      return { min: limit.tieMin, max: limit.tieMax };
    case 'dt_suited_tie':
      return { min: limit.suitedTieMin, max: limit.suitedTieMax };
    case 'dragon_big':
    case 'dragon_small':
    case 'tiger_big':
    case 'tiger_small':
      return { min: limit.bigSmallMin, max: limit.bigSmallMax };
    default:
      return { min: limit.dragonMin, max: limit.dragonMax };
  }
}

export async function placeBet(
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

export function getAllBets(): Map<string, DTBetEntry[]> {
  return currentBets;
}

export function getUserBets(userId: string): DTBetEntry[] {
  return currentBets.get(userId) || [];
}

// ============================================
// Settlement
// ============================================

export interface SettlementResult {
  userId: string;
  betResults: Array<{
    type: DragonTigerBetType;
    amount: number;
    won: boolean;
    payout: number;
  }>;
  totalBet: number;
  totalPayout: number;
  netResult: number;
  newBalance: number;
}

export async function settleAllBets(savedRoundId: string): Promise<SettlementResult[]> {
  const settlements: SettlementResult[] = [];
  const round = currentRound;

  if (!round || !round.result) {
    return [];
  }

  const roundResult: DragonTigerRoundResult = {
    dragonCard: round.dragonCard!,
    tigerCard: round.tigerCard!,
    dragonValue: round.dragonValue,
    tigerValue: round.tigerValue,
    result: round.result,
    isSuitedTie: round.isSuitedTie,
  };

  for (const [userId, bets] of currentBets.entries()) {
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

    // Calculate total payout
    // For Dragon Tiger:
    // - Win: return stake + winnings
    // - Half-loss (tie on dragon/tiger bet): return half stake
    // - Push (7 on big/small): return full stake
    // - Full loss: nothing returned
    let totalPayout = 0;
    for (const result of betResults) {
      if (result.won) {
        // Won: get back stake + winnings
        totalPayout += result.amount + result.payout;
      } else if (result.payout === 0) {
        // Push: get back stake only
        totalPayout += result.amount;
      } else if (result.payout === -result.amount * 0.5) {
        // Half loss (tie on dragon/tiger): get back half stake
        totalPayout += result.amount * 0.5;
      }
      // Full loss: payout is -amount, nothing returned
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
      let status: 'won' | 'lost' | 'refunded';
      let payoutAmount: number;

      if (bet.won) {
        status = 'won';
        payoutAmount = bet.amount + bet.payout;
      } else if (bet.payout === 0) {
        status = 'refunded';
        payoutAmount = bet.amount;
      } else if (bet.payout === -bet.amount * 0.5) {
        // Half refund for tie
        status = 'refunded';
        payoutAmount = bet.amount * 0.5;
      } else {
        status = 'lost';
        payoutAmount = 0;
      }

      await prisma.bet.create({
        data: {
          userId,
          dragonTigerRoundId: savedRoundId,
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
        note: `Dragon Tiger Round #${round.roundNumber} - Bets: ${bets.map((b) => `${b.type}:${b.amount}`).join(', ')}`,
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
          note: `Dragon Tiger Round #${round.roundNumber} - ${round.result?.toUpperCase()} wins`,
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
    dragonCard: currentRound?.dragonCard || null,
    tigerCard: currentRound?.tigerCard || null,
    dragonValue: currentRound?.dragonValue,
    tigerValue: currentRound?.tigerValue,
    result: currentRound?.result,
    isSuitedTie: currentRound?.isSuitedTie,
    myBets: userId ? currentBets.get(userId) || [] : [],
  };
}

// Get recent rounds for roadmap (from database)
export async function getRecentRounds(limit: number = 100) {
  const rounds = await prisma.dragonTigerRound.findMany({
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
