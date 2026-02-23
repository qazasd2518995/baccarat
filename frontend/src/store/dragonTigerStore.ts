import { create } from 'zustand';
import type { Card } from '../types';

// Dragon Tiger specific types
export type DragonTigerResult = 'dragon' | 'tiger' | 'tie';
export type DragonTigerBetType =
  | 'dragon'           // 龍 1:1
  | 'tiger'            // 虎 1:1
  | 'dt_tie'           // 和 1:8
  | 'dragon_odd'       // 龍單 1:0.75 (牌點數為奇數)
  | 'dragon_even'      // 龍雙 1:1.05 (牌點數為偶數)
  | 'tiger_odd'        // 虎單 1:0.75
  | 'tiger_even'       // 虎雙 1:1.05
  | 'dragon_red'       // 龍紅 1:0.9 (紅心/方塊)
  | 'dragon_black'     // 龍黑 1:0.9 (黑桃/梅花)
  | 'tiger_red'        // 虎紅 1:0.9
  | 'tiger_black'      // 虎黑 1:0.9
  | 'dt_suited_tie'    // 同花和 1:50
  | 'dragon_big'       // 龍大 1:1 (8-13)
  | 'dragon_small'     // 龍小 1:1 (1-6)
  | 'tiger_big'        // 虎大 1:1 (8-13)
  | 'tiger_small';     // 虎小 1:1 (1-6)

export type GamePhase = 'betting' | 'sealed' | 'dealing' | 'result';

export interface DTBet {
  type: DragonTigerBetType;
  amount: number;
  chipValue?: number; // Last chip value used for this bet (for display)
}

export interface DTBetResult extends DTBet {
  won: boolean;
  payout: number;
}

interface DragonTigerStore {
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
  pendingBets: DTBet[];
  selectedChip: number;
  setSelectedChip: (amount: number) => void;
  addPendingBet: (type: DragonTigerBetType) => boolean;
  clearPendingBets: () => void;
  getPendingTotal: () => number;

  // Confirmed bets (server acknowledged)
  confirmedBets: DTBet[];
  setConfirmedBets: (bets: DTBet[]) => void;
  clearConfirmedBets: () => void;
  getConfirmedTotal: () => number;

  // Last round bets (for repeat functionality)
  lastBets: DTBet[];
  saveLastBets: () => void;
  loadRepeatBets: () => boolean;

  // Get total bet for a specific type (pending + confirmed)
  getBetAmount: (type: DragonTigerBetType) => number;

  // Get chip value for display (last used chip for this bet type)
  getBetChipValue: (type: DragonTigerBetType) => number | undefined;

  // Card state
  dragonCard: Card | null;
  tigerCard: Card | null;
  dragonValue: number | null;
  tigerValue: number | null;
  dragonFlipped: boolean;
  tigerFlipped: boolean;
  setDragonCard: (card: Card, value: number) => void;
  setTigerCard: (card: Card, value: number) => void;
  setDragonFlipped: (v: boolean) => void;
  setTigerFlipped: (v: boolean) => void;
  clearCards: () => void;

  // Result display
  lastResult: DragonTigerResult | null;
  isSuitedTie: boolean;
  setLastResult: (result: DragonTigerResult | null, isSuitedTie?: boolean) => void;
  lastSettlement: {
    bets: DTBetResult[];
    totalPayout: number;
    netResult: number;
  } | null;
  setLastSettlement: (settlement: { bets: DTBetResult[]; totalPayout: number; netResult: number } | null) => void;

  // Roadmap data
  roadmapData: Array<{
    roundNumber: number;
    result: DragonTigerResult;
    isSuitedTie: boolean;
    dragonValue: number;
    tigerValue: number;
  }>;
  setRoadmapData: (data: Array<{
    roundNumber: number;
    result: DragonTigerResult;
    isSuitedTie: boolean;
    dragonValue: number;
    tigerValue: number;
  }>) => void;

  // Shoe info
  shoeNumber: number;
  cardsRemaining: number;
  setShoeInfo: (shoeNumber: number, cardsRemaining: number) => void;

  // Fake bets (visual only)
  fakeBets: Record<string, number>;
  setFakeBets: (bets: Record<string, number>) => void;

  // Reset for new round
  resetForNewRound: () => void;

  // Full state reset
  resetAll: () => void;
}

export const CHIP_VALUES = [5, 10, 25, 50, 100, 500];

export const useDragonTigerStore = create<DragonTigerStore>((set, get) => ({
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
  selectedChip: 10,
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
          chipValue: state.selectedChip, // Update to latest chip value
        };
        return { pendingBets: newBets };
      }
      return {
        pendingBets: [...state.pendingBets, { type, amount: state.selectedChip, chipValue: state.selectedChip }],
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

  // Get chip value for display
  getBetChipValue: (type) => {
    const state = get();
    // Prefer pending bet's chip value (most recent), fall back to confirmed
    const pendingBet = state.pendingBets.find((b) => b.type === type);
    if (pendingBet?.chipValue) return pendingBet.chipValue;
    const confirmedBet = state.confirmedBets.find((b) => b.type === type);
    return confirmedBet?.chipValue;
  },

  // Cards
  dragonCard: null,
  tigerCard: null,
  dragonValue: null,
  tigerValue: null,
  dragonFlipped: false,
  tigerFlipped: false,

  setDragonCard: (card, value) => set({ dragonCard: card, dragonValue: value }),
  setTigerCard: (card, value) => set({ tigerCard: card, tigerValue: value }),
  setDragonFlipped: (v) => set({ dragonFlipped: v }),
  setTigerFlipped: (v) => set({ tigerFlipped: v }),
  clearCards: () => set({
    dragonCard: null,
    tigerCard: null,
    dragonValue: null,
    tigerValue: null,
    dragonFlipped: false,
    tigerFlipped: false,
  }),

  // Result
  lastResult: null,
  isSuitedTie: false,
  setLastResult: (result, isSuitedTie = false) => set({ lastResult: result, isSuitedTie }),
  lastSettlement: null,
  setLastSettlement: (settlement) => set({ lastSettlement: settlement }),

  // Roadmap
  roadmapData: [],
  setRoadmapData: (data) => set({ roadmapData: data }),

  // Shoe
  shoeNumber: 1,
  cardsRemaining: 416,
  setShoeInfo: (shoeNumber, cardsRemaining) => set({ shoeNumber, cardsRemaining }),

  // Fake bets (visual only)
  fakeBets: {},
  setFakeBets: (bets) => set({ fakeBets: bets }),

  // Reset for new round
  resetForNewRound: () =>
    set({
      pendingBets: [],
      confirmedBets: [],
      dragonCard: null,
      tigerCard: null,
      dragonValue: null,
      tigerValue: null,
      dragonFlipped: false,
      tigerFlipped: false,
      lastResult: null,
      isSuitedTie: false,
      lastSettlement: null,
      fakeBets: {},
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
      selectedChip: 10,
      dragonCard: null,
      tigerCard: null,
      dragonValue: null,
      tigerValue: null,
      dragonFlipped: false,
      tigerFlipped: false,
      lastResult: null,
      isSuitedTie: false,
      lastSettlement: null,
      roadmapData: [],
      shoeNumber: 1,
      cardsRemaining: 416,
      fakeBets: {},
    }),
}));
