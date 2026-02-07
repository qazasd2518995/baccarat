import { prisma } from '../lib/prisma.js';
import type { Card, RoundResult, CalculateBetOptions } from '../utils/gameLogic.js';
import { calculateBetResult } from '../utils/gameLogic.js';
import type { BetEntry, BetType } from '../socket/types.js';

// Re-export GamePhase type for other modules
export type GamePhase = 'betting' | 'sealed' | 'dealing' | 'result';


// Current round info stored in memory
export interface CurrentRound {
  id: string;
  roundNumber: number;
  shoeNumber: number;
  startedAt: Date;
  playerCards: Card[];
  bankerCards: Card[];
  playerPoints: number;
  bankerPoints: number;
  result: 'player' | 'banker' | 'tie' | null;
  playerPair: boolean;
  bankerPair: boolean;
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
let currentRound: CurrentRound | null = null;
let roundCounter = 0;
let shoeNumber = 1;
let cardsRemaining = 416;
let shuffledDeck: Card[] | null = null;
let timeRemaining = 0;

// Map of userId -> their bets for current round
const currentBets = new Map<string, BetEntry[]>();

// Map of userId -> reserved balance (already deducted from DB)
const reservedBalances = new Map<string, number>();

// Map of userId -> no commission mode for current round
const noCommissionMode = new Map<string, boolean>();

// ============================================
// State Persistence
// ============================================

const SINGLETON_ID = 'singleton';

export async function loadPersistedState(): Promise<void> {
  try {
    let state = await prisma.gameState.findUnique({
      where: { id: SINGLETON_ID },
    });

    if (!state) {
      // Create initial state
      state = await prisma.gameState.create({
        data: {
          id: SINGLETON_ID,
          shoeNumber: 1,
          roundCounter: 0,
          cardsRemaining: 416,
        },
      });
      console.log('[GameState] Created initial persisted state');
    }

    shoeNumber = state.shoeNumber;
    roundCounter = state.roundCounter;
    cardsRemaining = state.cardsRemaining;
    shuffledDeck = state.shuffledDeck as Card[] | null;

    console.log(`[GameState] Loaded persisted state: shoe #${shoeNumber}, round #${roundCounter}, cards remaining: ${cardsRemaining}`);
  } catch (error) {
    console.error('[GameState] Failed to load persisted state:', error);
    // Continue with default values
  }
}

export async function savePersistedState(): Promise<void> {
  try {
    await prisma.gameState.upsert({
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
    console.error('[GameState] Failed to save persisted state:', error);
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

export function getCurrentRound(): CurrentRound | null {
  return currentRound;
}

export function getRoundCounter(): number {
  return roundCounter;
}

export async function createNewRound(): Promise<CurrentRound> {
  roundCounter++;
  currentRound = {
    id: `round-${Date.now()}-${roundCounter}`,
    roundNumber: roundCounter,
    shoeNumber,
    startedAt: new Date(),
    playerCards: [],
    bankerCards: [],
    playerPoints: 0,
    bankerPoints: 0,
    result: null,
    playerPair: false,
    bankerPair: false,
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
  console.log(`[GameState] Started new shoe #${shoeNumber}`);
}

export function setRoundResult(result: RoundResult): void {
  if (currentRound) {
    currentRound.playerCards = result.playerCards;
    currentRound.bankerCards = result.bankerCards;
    currentRound.playerPoints = result.playerPoints;
    currentRound.bankerPoints = result.bankerPoints;
    currentRound.result = result.result;
    currentRound.playerPair = result.playerPair;
    currentRound.bankerPair = result.bankerPair;
  }
}

// ============================================
// Bet Management
// ============================================

// Default betting limits if user has no specific limit
const DEFAULT_LIMITS = {
  playerMin: 10, playerMax: 100000,
  bankerMin: 10, bankerMax: 100000,
  tieMin: 10, tieMax: 50000,
  pairMin: 10, pairMax: 50000,
  bonusMin: 10, bonusMax: 50000,  // Dragon Bonus limits
};

// Helper function to get min/max for bet type
function getLimitForBetType(
  limit: typeof DEFAULT_LIMITS,
  betType: BetType
): { min: number; max: number } {
  switch (betType) {
    case 'player':
      return { min: limit.playerMin, max: limit.playerMax };
    case 'banker':
      return { min: limit.bankerMin, max: limit.bankerMax };
    case 'tie':
      return { min: limit.tieMin, max: limit.tieMax };
    case 'player_pair':
    case 'banker_pair':
    case 'super_six':
      return { min: limit.pairMin, max: limit.pairMax };
    case 'player_bonus':
    case 'banker_bonus':
      return { min: limit.bonusMin, max: limit.bonusMax };
    default:
      return { min: limit.playerMin, max: limit.playerMax };
  }
}

export async function placeBet(
  userId: string,
  bets: BetEntry[],
  isNoCommission: boolean = false
): Promise<{
  success: boolean;
  roundId?: string;
  bets?: BetEntry[];
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

  // Get user with betting limit
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      balance: true,
      status: true,
      bettingLimit: true,
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

  // Determine betting limits
  const limits = user.bettingLimit
    ? {
        playerMin: Number(user.bettingLimit.playerMin),
        playerMax: Number(user.bettingLimit.playerMax),
        bankerMin: Number(user.bettingLimit.bankerMin),
        bankerMax: Number(user.bettingLimit.bankerMax),
        tieMin: Number(user.bettingLimit.tieMin),
        tieMax: Number(user.bettingLimit.tieMax),
        pairMin: Number(user.bettingLimit.pairMin),
        pairMax: Number(user.bettingLimit.pairMax),
        // Use pair limits as fallback for dragon bonus (until bonus columns added to BettingLimit)
        bonusMin: Number(user.bettingLimit.pairMin),
        bonusMax: Number(user.bettingLimit.pairMax),
      }
    : DEFAULT_LIMITS;

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

  // Validate bet amounts (must be positive) and check limits
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
  noCommissionMode.set(userId, isNoCommission);

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

export function getAllBets(): Map<string, BetEntry[]> {
  return currentBets;
}

export function getUserBets(userId: string): BetEntry[] {
  return currentBets.get(userId) || [];
}

// ============================================
// Settlement
// ============================================

export interface SettlementResult {
  userId: string;
  betResults: Array<{
    type: BetType;
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

  const roundResult: RoundResult = {
    playerCards: round.playerCards,
    bankerCards: round.bankerCards,
    playerPoints: round.playerPoints,
    bankerPoints: round.bankerPoints,
    result: round.result,
    playerPair: round.playerPair,
    bankerPair: round.bankerPair,
  };

  for (const [userId, bets] of currentBets.entries()) {
    const isNoCommission = noCommissionMode.get(userId) || false;
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

    // Calculate total payout
    // For each bet:
    // - If won: return stake + winnings (payout is positive)
    // - If push (tie on player/banker): return stake (payout is 0)
    // - If lost: nothing returned (payout is negative)
    let totalPayout = 0;
    for (const result of betResults) {
      if (result.won) {
        // Won: get back stake + winnings
        totalPayout += result.amount + result.payout;
      } else if (result.payout === 0) {
        // Push: get back stake only
        totalPayout += result.amount;
      }
      // Lost: payout is negative, nothing returned
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
      } else {
        status = 'lost';
        payoutAmount = 0;
      }

      await prisma.bet.create({
        data: {
          userId,
          roundId: savedRoundId,
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

    // Bet transaction (already deducted when placed, so this is just for record)
    await prisma.transaction.create({
      data: {
        userId,
        operatorId: userId, // System operation
        type: 'bet',
        amount: -totalBet,
        balanceBefore: balanceBeforeBet + totalBet,
        balanceAfter: balanceBeforeBet,
        note: `Round #${round.roundNumber} - Bets: ${bets.map((b) => `${b.type}:${b.amount}`).join(', ')}`,
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
          note: `Round #${round.roundNumber} - ${round.result?.toUpperCase()} wins`,
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
  noCommissionMode.clear();
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
    playerCards: currentRound?.playerCards || [],
    bankerCards: currentRound?.bankerCards || [],
    playerPoints: currentRound?.playerPoints,
    bankerPoints: currentRound?.bankerPoints,
    result: currentRound?.result,
    playerPair: currentRound?.playerPair,
    bankerPair: currentRound?.bankerPair,
    myBets: userId ? currentBets.get(userId) || [] : [],
  };
}

// Get recent rounds for roadmap (from database) - baccarat only
export async function getRecentRounds(limit: number = 100) {
  const rounds = await prisma.gameRound.findMany({
    where: {
      result: {
        in: ['player', 'banker', 'tie'],
      },
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

  // Transform to include totalCards count
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
