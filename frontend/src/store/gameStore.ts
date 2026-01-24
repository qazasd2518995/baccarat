import { create } from 'zustand';
import type { Bet, BetType, Card, GameResult, BetResult } from '../types';
import type { GamePhase, BetEntry } from '../services/socket';

// All available chip values
export const ALL_CHIP_OPTIONS = [
  { value: 10, color: 'from-slate-400 to-slate-600' },
  { value: 50, color: 'from-green-500 to-green-700' },
  { value: 100, color: 'from-red-500 to-red-700' },
  { value: 500, color: 'from-purple-500 to-purple-700' },
  { value: 1000, color: 'from-amber-500 to-amber-700' },
  { value: 5000, color: 'from-cyan-500 to-cyan-700' },
  { value: 10000, color: 'from-fuchsia-500 to-fuchsia-700' },
  { value: 20000, color: 'from-rose-500 to-rose-700' },
  { value: 50000, color: 'from-indigo-500 to-indigo-700' },
  { value: 100000, color: 'from-yellow-500 to-yellow-700' },
];

// Default selected chips (6 chips)
const DEFAULT_SELECTED_CHIPS = [10, 50, 100, 500, 1000, 5000];

// LocalStorage key for chip preferences
const CHIP_PREFERENCES_KEY = 'baccarat_chip_preferences';

// Load chip preferences from localStorage
function loadChipPreferences(): number[] {
  try {
    const stored = localStorage.getItem(CHIP_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 6) {
        // Validate all values are valid chip options
        const validValues = ALL_CHIP_OPTIONS.map(c => c.value);
        if (parsed.every(v => validValues.includes(v))) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load chip preferences:', e);
  }
  return DEFAULT_SELECTED_CHIPS;
}

// Save chip preferences to localStorage
function saveChipPreferences(chips: number[]): void {
  try {
    localStorage.setItem(CHIP_PREFERENCES_KEY, JSON.stringify(chips));
  } catch (e) {
    console.error('Failed to save chip preferences:', e);
  }
}

interface GameStore {
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
  pendingBets: Bet[];
  selectedChip: number;
  setSelectedChip: (amount: number) => void;
  addPendingBet: (type: BetType) => boolean;
  clearPendingBets: () => void;
  getPendingTotal: () => number;

  // Confirmed bets (server acknowledged)
  confirmedBets: Bet[];
  setConfirmedBets: (bets: BetEntry[]) => void;
  clearConfirmedBets: () => void;
  getConfirmedTotal: () => number;

  // Last round bets (for repeat functionality)
  lastBets: Bet[];
  saveLastBets: () => void;
  loadRepeatBets: () => boolean;

  // Get total bet for a specific type (pending + confirmed)
  getBetAmount: (type: BetType) => number;

  // Card dealing state
  playerCards: Card[];
  bankerCards: Card[];
  playerPoints: number | null;
  bankerPoints: number | null;
  addPlayerCard: (card: Card, points: number) => void;
  addBankerCard: (card: Card, points: number) => void;
  setCards: (playerCards: Card[], bankerCards: Card[], playerPoints: number, bankerPoints: number) => void;
  clearCards: () => void;

  // Result display
  lastResult: GameResult | null;
  setLastResult: (result: GameResult | null) => void;
  lastSettlement: {
    bets: BetResult[];
    totalPayout: number;
    netResult: number;
  } | null;
  setLastSettlement: (settlement: { bets: BetResult[]; totalPayout: number; netResult: number } | null) => void;

  // Roadmap data
  roadmapData: Array<{
    roundNumber: number;
    result: GameResult;
    playerPair: boolean;
    bankerPair: boolean;
    playerPoints: number;
    bankerPoints: number;
    totalCards: number;
  }>;
  setRoadmapData: (data: Array<{
    roundNumber: number;
    result: GameResult;
    playerPair: boolean;
    bankerPair: boolean;
    playerPoints: number;
    bankerPoints: number;
    totalCards: number;
  }>) => void;

  // Shoe info
  shoeNumber: number;
  cardsRemaining: number;
  setShoeInfo: (shoeNumber: number, cardsRemaining: number) => void;

  // Betting limits
  bettingLimits: {
    player: { min: number; max: number };
    banker: { min: number; max: number };
    tie: { min: number; max: number };
    playerPair: { min: number; max: number };
    bankerPair: { min: number; max: number };
    super6: { min: number; max: number };
  } | null;
  setBettingLimits: (limits: {
    player: { min: number; max: number };
    banker: { min: number; max: number };
    tie: { min: number; max: number };
    playerPair: { min: number; max: number };
    bankerPair: { min: number; max: number };
    super6: { min: number; max: number };
  } | null) => void;

  // Reset for new round
  resetForNewRound: () => void;

  // Full state reset
  resetAll: () => void;

  // Chip preferences (customizable displayed chips)
  displayedChips: number[];
  setDisplayedChips: (chips: number[]) => void;
}

export const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000, 10000];

// Initialize displayed chips from localStorage
const initialDisplayedChips = loadChipPreferences();

export const useGameStore = create<GameStore>((set, get) => ({
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

    // Check if betting is allowed
    if (state.phase !== 'betting') {
      return false;
    }

    const totalPending = state.pendingBets.reduce((sum, b) => sum + b.amount, 0);
    const totalConfirmed = state.confirmedBets.reduce((sum, b) => sum + b.amount, 0);

    if (totalPending + totalConfirmed + state.selectedChip > state.balance) {
      return false; // Insufficient balance
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
    confirmedBets: bets.map(b => ({ type: b.type, amount: b.amount })),
    pendingBets: [], // Clear pending when confirmed
  }),
  clearConfirmedBets: () => set({ confirmedBets: [] }),
  getConfirmedTotal: () => get().confirmedBets.reduce((sum, bet) => sum + bet.amount, 0),

  // Last round bets (for repeat functionality)
  lastBets: [],
  saveLastBets: () => {
    const state = get();
    // Save confirmed bets as last bets for repeat
    if (state.confirmedBets.length > 0) {
      set({ lastBets: [...state.confirmedBets] });
    }
  },
  loadRepeatBets: () => {
    const state = get();

    // Check if betting phase
    if (state.phase !== 'betting') {
      return false;
    }

    // Check if there are last bets to repeat
    if (state.lastBets.length === 0) {
      return false;
    }

    // Calculate total of last bets
    const totalLastBets = state.lastBets.reduce((sum, b) => sum + b.amount, 0);

    // Check balance
    if (totalLastBets > state.balance) {
      return false;
    }

    // Load last bets as pending bets
    set({ pendingBets: [...state.lastBets] });
    return true;
  },

  // Get bet amount for specific type
  getBetAmount: (type) => {
    const state = get();
    const pending = state.pendingBets.find((b) => b.type === type)?.amount || 0;
    const confirmed = state.confirmedBets.find((b) => b.type === type)?.amount || 0;
    return pending + confirmed;
  },

  // Cards
  playerCards: [],
  bankerCards: [],
  playerPoints: null,
  bankerPoints: null,

  addPlayerCard: (card, points) =>
    set((state) => ({
      playerCards: [...state.playerCards, card],
      playerPoints: points,
    })),

  addBankerCard: (card, points) =>
    set((state) => ({
      bankerCards: [...state.bankerCards, card],
      bankerPoints: points,
    })),

  setCards: (playerCards, bankerCards, playerPoints, bankerPoints) =>
    set({ playerCards, bankerCards, playerPoints, bankerPoints }),

  clearCards: () =>
    set({
      playerCards: [],
      bankerCards: [],
      playerPoints: null,
      bankerPoints: null,
    }),

  // Result
  lastResult: null,
  setLastResult: (result) => set({ lastResult: result }),
  lastSettlement: null,
  setLastSettlement: (settlement) => set({ lastSettlement: settlement }),

  // Roadmap
  roadmapData: [],
  setRoadmapData: (data) => set({ roadmapData: data }),

  // Shoe
  shoeNumber: 1,
  cardsRemaining: 416,
  setShoeInfo: (shoeNumber, cardsRemaining) => set({ shoeNumber, cardsRemaining }),

  // Betting limits
  bettingLimits: null,
  setBettingLimits: (limits) => set({ bettingLimits: limits }),

  // Reset for new round (when betting phase starts)
  resetForNewRound: () =>
    set({
      pendingBets: [],
      confirmedBets: [],
      playerCards: [],
      bankerCards: [],
      playerPoints: null,
      bankerPoints: null,
      lastResult: null,
      lastSettlement: null,
    }),

  // Full reset (on disconnect/logout)
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
      lastBets: [], // Reset last bets on full reset
      selectedChip: 100,
      playerCards: [],
      bankerCards: [],
      playerPoints: null,
      bankerPoints: null,
      lastResult: null,
      lastSettlement: null,
      roadmapData: [],
      shoeNumber: 1,
      cardsRemaining: 416,
      bettingLimits: null,
    }),

  // Chip preferences
  displayedChips: initialDisplayedChips,
  setDisplayedChips: (chips) => {
    saveChipPreferences(chips);
    const state = get();
    // If current selected chip is not in the new list, select the first available
    if (!chips.includes(state.selectedChip)) {
      set({ displayedChips: chips, selectedChip: chips[0] });
    } else {
      set({ displayedChips: chips });
    }
  },
}));
