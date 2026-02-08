import { create } from 'zustand';
import type { Card } from '../types';

// Bull Bull specific types
export type BullBullBetType = 'bb_banker' | 'bb_player1' | 'bb_player2' | 'bb_player3';
export type BullBullRank =
  | 'five_face'
  | 'bull_bull'
  | 'bull_9'
  | 'bull_8'
  | 'bull_7'
  | 'bull_6'
  | 'bull_5'
  | 'bull_4'
  | 'bull_3'
  | 'bull_2'
  | 'bull_1'
  | 'no_bull';

export type PositionResult = 'win' | 'lose';
export type GamePhase = 'betting' | 'sealed' | 'dealing' | 'result';

export interface BBBet {
  type: BullBullBetType;
  amount: number;
}

export interface BBBetResult extends BBBet {
  won: boolean;
  payout: number;
  multiplier: number;
}

export interface HandResult {
  cards: Card[];
  rank: BullBullRank;
  rankName: string;
}

interface BullBullStore {
  // Socket connection state
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Game phase and timing
  phase: GamePhase;
  setPhase: (phase: GamePhase) => void;
  timeRemaining: number;
  setTimeRemaining: (time: number) => void;
  roundId: string | null;
  setRoundId: (id: string | null) => void;
  roundNumber: number;
  setRoundNumber: (num: number) => void;

  // Balance
  balance: number;
  setBalance: (balance: number) => void;

  // Pending bets (local, before server confirmation)
  pendingBets: BBBet[];
  selectedChip: number;
  setSelectedChip: (amount: number) => void;
  addPendingBet: (type: BullBullBetType) => boolean;
  clearPendingBets: () => void;
  getPendingTotal: () => number;

  // Confirmed bets (server acknowledged)
  confirmedBets: BBBet[];
  setConfirmedBets: (bets: BBBet[]) => void;
  clearConfirmedBets: () => void;
  getConfirmedTotal: () => number;

  // Last round bets (for repeat functionality)
  lastBets: BBBet[];
  saveLastBets: () => void;
  loadRepeatBets: () => boolean;

  // Get total bet for a specific type (pending + confirmed)
  getBetAmount: (type: BullBullBetType) => number;

  // Hands state
  banker: HandResult | null;
  player1: HandResult | null;
  player2: HandResult | null;
  player3: HandResult | null;
  player1Result: PositionResult | null;
  player2Result: PositionResult | null;
  player3Result: PositionResult | null;
  setBanker: (hand: HandResult) => void;
  setPlayer: (position: 1 | 2 | 3, hand: HandResult, result: PositionResult) => void;
  clearHands: () => void;

  // Dealing animation state (cards being dealt and revealed)
  dealingCards: Array<{ target: string; cardIndex: number }>;
  addDealingCard: (target: string, cardIndex: number) => void;
  revealedPositions: Set<string>;
  revealPosition: (position: string) => void;
  clearRevealed: () => void;

  // Settlement
  lastSettlement: {
    bets: BBBetResult[];
    totalPayout: number;
    netResult: number;
  } | null;
  setLastSettlement: (settlement: { bets: BBBetResult[]; totalPayout: number; netResult: number } | null) => void;

  // Roadmap data
  roadmapData: Array<{
    roundNumber: number;
    bankerRank: string;
    player1Rank: string;
    player2Rank: string;
    player3Rank: string;
    player1Result: string;
    player2Result: string;
    player3Result: string;
  }>;
  setRoadmapData: (data: Array<{
    roundNumber: number;
    bankerRank: string;
    player1Rank: string;
    player2Rank: string;
    player3Rank: string;
    player1Result: string;
    player2Result: string;
    player3Result: string;
  }>) => void;

  // Shoe info
  shoeNumber: number;
  cardsRemaining: number;
  setShoeInfo: (shoeNumber: number, cardsRemaining: number) => void;

  // Reset for new round
  resetForNewRound: () => void;

  // Full state reset
  resetAll: () => void;
}

export const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000, 10000];

// Rank display names
export const RANK_NAMES: Record<BullBullRank, string> = {
  five_face: '五花牛',
  bull_bull: '牛牛',
  bull_9: '牛九',
  bull_8: '牛八',
  bull_7: '牛七',
  bull_6: '牛六',
  bull_5: '牛五',
  bull_4: '牛四',
  bull_3: '牛三',
  bull_2: '牛二',
  bull_1: '牛一',
  no_bull: '无牛',
};

export const useBullBullStore = create<BullBullStore>((set, get) => ({
  // Socket connection
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // Phase and timing
  phase: 'betting',
  setPhase: (phase) => set({ phase }),
  timeRemaining: 0,
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  roundId: null,
  setRoundId: (id) => set({ roundId: id }),
  roundNumber: 0,
  setRoundNumber: (num) => set({ roundNumber: num }),

  // Balance
  balance: 0,
  setBalance: (balance) => set({ balance }),

  // Pending bets
  pendingBets: [],
  selectedChip: 100,
  setSelectedChip: (amount) => set({ selectedChip: amount }),

  addPendingBet: (type) => {
    const state = get();

    if (state.phase !== 'betting') {
      return false;
    }

    const totalPending = state.pendingBets.reduce((sum, b) => sum + b.amount, 0);
    const totalConfirmed = state.confirmedBets.reduce((sum, b) => sum + b.amount, 0);

    if (totalPending + totalConfirmed + state.selectedChip > state.balance) {
      return false;
    }

    set((state) => {
      const existingIndex = state.pendingBets.findIndex((b) => b.type === type);
      if (existingIndex >= 0) {
        const newBets = [...state.pendingBets];
        newBets[existingIndex] = {
          ...newBets[existingIndex],
          amount: newBets[existingIndex].amount + state.selectedChip,
        };
        return { pendingBets: newBets };
      }
      return {
        pendingBets: [...state.pendingBets, { type, amount: state.selectedChip }],
      };
    });
    return true;
  },

  clearPendingBets: () => set({ pendingBets: [] }),

  getPendingTotal: () => get().pendingBets.reduce((sum, bet) => sum + bet.amount, 0),

  // Confirmed bets
  confirmedBets: [],
  setConfirmedBets: (bets) => set({
    confirmedBets: bets,
    pendingBets: [],
  }),
  clearConfirmedBets: () => set({ confirmedBets: [] }),
  getConfirmedTotal: () => get().confirmedBets.reduce((sum, bet) => sum + bet.amount, 0),

  // Last round bets
  lastBets: [],
  saveLastBets: () => {
    const state = get();
    if (state.confirmedBets.length > 0) {
      set({ lastBets: [...state.confirmedBets] });
    }
  },
  loadRepeatBets: () => {
    const state = get();

    if (state.phase !== 'betting') {
      return false;
    }

    if (state.lastBets.length === 0) {
      return false;
    }

    const totalLastBets = state.lastBets.reduce((sum, b) => sum + b.amount, 0);

    if (totalLastBets > state.balance) {
      return false;
    }

    set({ pendingBets: [...state.lastBets] });
    return true;
  },

  // Get bet amount
  getBetAmount: (type) => {
    const state = get();
    const pending = state.pendingBets.find((b) => b.type === type)?.amount || 0;
    const confirmed = state.confirmedBets.find((b) => b.type === type)?.amount || 0;
    return pending + confirmed;
  },

  // Hands
  banker: null,
  player1: null,
  player2: null,
  player3: null,
  player1Result: null,
  player2Result: null,
  player3Result: null,

  setBanker: (hand) => set({ banker: hand }),
  setPlayer: (position, hand, result) => {
    switch (position) {
      case 1:
        set({ player1: hand, player1Result: result });
        break;
      case 2:
        set({ player2: hand, player2Result: result });
        break;
      case 3:
        set({ player3: hand, player3Result: result });
        break;
    }
  },
  clearHands: () => set({
    banker: null,
    player1: null,
    player2: null,
    player3: null,
    player1Result: null,
    player2Result: null,
    player3Result: null,
  }),

  // Dealing animation state
  dealingCards: [],
  addDealingCard: (target, cardIndex) => set((state) => ({
    dealingCards: [...state.dealingCards, { target, cardIndex }],
  })),

  // Revealed positions for animation
  revealedPositions: new Set(),
  revealPosition: (position) => set((state) => ({
    revealedPositions: new Set([...state.revealedPositions, position]),
  })),
  clearRevealed: () => set({ revealedPositions: new Set(), dealingCards: [] }),

  // Settlement
  lastSettlement: null,
  setLastSettlement: (settlement) => set({ lastSettlement: settlement }),

  // Roadmap
  roadmapData: [],
  setRoadmapData: (data) => set({ roadmapData: data }),

  // Shoe
  shoeNumber: 1,
  cardsRemaining: 416,
  setShoeInfo: (shoeNumber, cardsRemaining) => set({ shoeNumber, cardsRemaining }),

  // Reset for new round
  resetForNewRound: () =>
    set({
      pendingBets: [],
      confirmedBets: [],
      banker: null,
      player1: null,
      player2: null,
      player3: null,
      player1Result: null,
      player2Result: null,
      player3Result: null,
      dealingCards: [],
      revealedPositions: new Set(),
      lastSettlement: null,
    }),

  // Full reset
  resetAll: () =>
    set({
      isConnected: false,
      phase: 'betting',
      timeRemaining: 0,
      roundId: null,
      roundNumber: 0,
      balance: 0,
      pendingBets: [],
      confirmedBets: [],
      lastBets: [],
      selectedChip: 100,
      banker: null,
      player1: null,
      player2: null,
      player3: null,
      player1Result: null,
      player2Result: null,
      player3Result: null,
      dealingCards: [],
      revealedPositions: new Set(),
      lastSettlement: null,
      roadmapData: [],
      shoeNumber: 1,
      cardsRemaining: 416,
    }),
}));
