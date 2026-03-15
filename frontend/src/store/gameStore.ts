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

// LocalStorage keys
const CHIP_PREFERENCES_KEY = 'baccarat_chip_preferences';
const CUSTOM_CHIPS_KEY = 'baccarat_custom_chips';

// Load custom chips from localStorage
function loadCustomChips(): number[] {
  try {
    const stored = localStorage.getItem(CUSTOM_CHIPS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length <= 4) {
        // Validate all values are positive numbers
        if (parsed.every(v => typeof v === 'number' && v > 0)) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load custom chips:', e);
  }
  return [];
}

// Save custom chips to localStorage
function saveCustomChips(chips: number[]): void {
  try {
    localStorage.setItem(CUSTOM_CHIPS_KEY, JSON.stringify(chips));
  } catch (e) {
    console.error('Failed to save custom chips:', e);
  }
}

// Load chip preferences from localStorage
function loadChipPreferences(): number[] {
  try {
    const stored = localStorage.getItem(CHIP_PREFERENCES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 6) {
        // Validate all values are valid chip options or custom chips
        const validValues = ALL_CHIP_OPTIONS.map(c => c.value);
        const customChips = loadCustomChips();
        const allValidValues = [...validValues, ...customChips];
        if (parsed.every(v => allValidValues.includes(v) || customChips.includes(v))) {
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
  roundNumber: string;  // Format: YYYYMMDDNNN (e.g., 20260228001)
  setRoundNumber: (num: string) => void;

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
  lastPlayerPair: boolean;
  lastBankerPair: boolean;
  setLastResult: (result: GameResult | null, playerPair?: boolean, bankerPair?: boolean) => void;
  lastSettlement: {
    bets: BetResult[];
    totalPayout: number;
    netResult: number;
  } | null;
  setLastSettlement: (settlement: { bets: BetResult[]; totalPayout: number; netResult: number } | null) => void;

  // Roadmap data
  roadmapData: Array<{
    roundNumber: string;
    result: GameResult;
    playerPair: boolean;
    bankerPair: boolean;
    playerPoints: number;
    bankerPoints: number;
    totalCards: number;
  }>;
  pendingRoadmapData: Array<{
    roundNumber: string;
    result: GameResult;
    playerPair: boolean;
    bankerPair: boolean;
    playerPoints: number;
    bankerPoints: number;
    totalCards: number;
  }> | null;
  setRoadmapData: (data: Array<{
    roundNumber: string;
    result: GameResult;
    playerPair: boolean;
    bankerPair: boolean;
    playerPoints: number;
    bankerPoints: number;
    totalCards: number;
  }>) => void;
  setPendingRoadmapData: (data: Array<{
    roundNumber: string;
    result: GameResult;
    playerPair: boolean;
    bankerPair: boolean;
    playerPoints: number;
    bankerPoints: number;
    totalCards: number;
  }> | null) => void;
  applyPendingRoadmap: () => void;

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

  // Fake bets (visual only)
  fakeBets: Record<string, number>;
  setFakeBets: (bets: Record<string, number>) => void;

  // Fake broadcasts (visual only)
  fakeBroadcasts: Array<{ id: number; username: string; text: string; color: string }>;
  addFakeBroadcast: (broadcast: { username: string; text: string; color: string }) => void;
  removeFakeBroadcast: (id: number) => void;

  // Shuffling (new shoe)
  isShuffling: boolean;
  setIsShuffling: (v: boolean) => void;

  // Reset for new round
  resetForNewRound: () => void;

  // Full state reset
  resetAll: () => void;

  // Chip preferences (customizable displayed chips)
  displayedChips: number[];
  setDisplayedChips: (chips: number[]) => void;

  // Custom chips (user-defined chip values, max 4)
  customChips: number[];
  setCustomChips: (chips: number[]) => void;
  addCustomChip: (value: number) => boolean;
  removeCustomChip: (value: number) => void;
}

export const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000, 10000];

// Initialize from localStorage
const initialDisplayedChips = loadChipPreferences();
const initialCustomChips = loadCustomChips();

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
  roundNumber: '',
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
  lastPlayerPair: false,
  lastBankerPair: false,
  setLastResult: (result, playerPair, bankerPair) => set({
    lastResult: result,
    lastPlayerPair: playerPair ?? false,
    lastBankerPair: bankerPair ?? false,
  }),
  lastSettlement: null,
  setLastSettlement: (settlement) => set({ lastSettlement: settlement }),

  // Roadmap
  roadmapData: [],
  pendingRoadmapData: null,
  setRoadmapData: (data) => set({ roadmapData: data }),
  setPendingRoadmapData: (data) => set({ pendingRoadmapData: data }),
  applyPendingRoadmap: () => {
    const { pendingRoadmapData } = get();
    if (pendingRoadmapData) {
      set({ roadmapData: pendingRoadmapData, pendingRoadmapData: null });
    }
  },

  // Shoe
  shoeNumber: 1,
  cardsRemaining: 416,
  setShoeInfo: (shoeNumber, cardsRemaining) => set({ shoeNumber, cardsRemaining }),

  // Betting limits
  bettingLimits: null,
  setBettingLimits: (limits) => set({ bettingLimits: limits }),

  // Fake bets (visual only)
  fakeBets: {},
  setFakeBets: (bets) => set({ fakeBets: bets }),

  // Fake broadcasts (visual only)
  fakeBroadcasts: [],
  addFakeBroadcast: (broadcast) => set((state) => ({
    fakeBroadcasts: [...state.fakeBroadcasts, { ...broadcast, id: Date.now() + Math.random() }]
  })),
  removeFakeBroadcast: (id) => set((state) => ({
    fakeBroadcasts: state.fakeBroadcasts.filter((b) => b.id !== id)
  })),

  // Shuffling (new shoe)
  isShuffling: false,
  setIsShuffling: (v) => set({ isShuffling: v }),

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
      lastPlayerPair: false,
      lastBankerPair: false,
      lastSettlement: null,
    }),

  // Full reset (on disconnect/logout)
  resetAll: () =>
    set({
      isConnected: false,
      phase: 'betting',
      timeRemaining: 0,
      roundId: null,
      roundNumber: '',
      balance: 0,
      pendingBets: [],
      confirmedBets: [],
      lastBets: [],
      selectedChip: 100,
      playerCards: [],
      bankerCards: [],
      playerPoints: null,
      bankerPoints: null,
      lastResult: null,
      lastPlayerPair: false,
      lastBankerPair: false,
      lastSettlement: null,
      roadmapData: [],
      pendingRoadmapData: null,
      shoeNumber: 1,
      cardsRemaining: 416,
      bettingLimits: null,
      fakeBets: {},
      fakeBroadcasts: [],
      isShuffling: false,
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

  // Custom chips
  customChips: initialCustomChips,
  setCustomChips: (chips) => {
    saveCustomChips(chips);
    set({ customChips: chips });
  },
  addCustomChip: (value) => {
    const state = get();
    // Max 4 custom chips
    if (state.customChips.length >= 4) return false;
    // Value must be positive
    if (value <= 0) return false;
    // Value must not already exist in custom chips
    if (state.customChips.includes(value)) return false;
    const newCustomChips = [...state.customChips, value];
    saveCustomChips(newCustomChips);
    set({ customChips: newCustomChips });
    return true;
  },
  removeCustomChip: (value) => {
    const state = get();
    const newCustomChips = state.customChips.filter(v => v !== value);
    saveCustomChips(newCustomChips);
    // Also remove from displayed chips if present
    const newDisplayedChips = state.displayedChips.filter(v => v !== value);
    if (newDisplayedChips.length !== state.displayedChips.length) {
      saveChipPreferences(newDisplayedChips);
      // If current selected chip was removed, select first available
      if (state.selectedChip === value && newDisplayedChips.length > 0) {
        set({ customChips: newCustomChips, displayedChips: newDisplayedChips, selectedChip: newDisplayedChips[0] });
      } else {
        set({ customChips: newCustomChips, displayedChips: newDisplayedChips });
      }
    } else {
      set({ customChips: newCustomChips });
    }
  },
}));
