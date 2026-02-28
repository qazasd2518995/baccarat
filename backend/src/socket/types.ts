import type { Card, GameResult } from '../utils/gameLogic.js';

// Game phases
export type GamePhase = 'betting' | 'sealed' | 'dealing' | 'result';

// Bet types
export type BetType = 'player' | 'banker' | 'tie' | 'player_pair' | 'banker_pair' | 'super_six' | 'player_bonus' | 'banker_bonus';

// Bet entry
export interface BetEntry {
  type: BetType;
  amount: number;
}

// ============================================
// Server -> Client Events
// ============================================

// Game state for sync/reconnection
export interface GameStateEvent {
  phase: GamePhase;
  roundId: string | null;
  roundNumber: string;  // Format: YYYYMMDDNNN (e.g., 20260228001)
  shoeNumber: number;
  timeRemaining: number;
  cardsRemaining: number;
  playerCards?: Card[];
  bankerCards?: Card[];
  playerPoints?: number;
  bankerPoints?: number;
  result?: GameResult;
  playerPair?: boolean;
  bankerPair?: boolean;
  myBets?: BetEntry[];
}

// Phase change notification
export interface PhaseChangeEvent {
  phase: GamePhase;
  timeRemaining: number;
  roundId: string | null;
}

// Timer tick
export interface TimerEvent {
  timeRemaining: number;
  phase: GamePhase;
}

// Card dealt event (for animation)
export interface CardDealtEvent {
  target: 'player' | 'banker';
  cardIndex: number;
  card: Card;
  currentPoints: number;
}

// Round result
export interface RoundResultEvent {
  roundId: string;
  roundNumber: string;  // Format: YYYYMMDDNNN (e.g., 20260228001)
  result: GameResult;
  playerCards: Card[];
  bankerCards: Card[];
  playerPoints: number;
  bankerPoints: number;
  playerPair: boolean;
  bankerPair: boolean;
}

// Bet confirmation
export interface BetConfirmedEvent {
  roundId: string;
  bets: BetEntry[];
  totalBet: number;
}

// Personal settlement
export interface BetSettlementEvent {
  roundId: string;
  bets: Array<{
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

// Balance update
export interface BalanceUpdateEvent {
  balance: number;
  reason: 'bet_placed' | 'bet_cleared' | 'settlement' | 'deposit' | 'withdraw';
}

// Error event
export interface ErrorEvent {
  code: string;
  message: string;
}

// Roadmap update
export interface RoadmapUpdateEvent {
  recentRounds: Array<{
    roundNumber: string;  // Format: YYYYMMDDNNN (e.g., 20260228001)
    result: GameResult;
    playerPair: boolean;
    bankerPair: boolean;
    playerPoints: number;
    bankerPoints: number;
    totalCards: number;  // playerCards.length + bankerCards.length (4, 5, or 6)
  }>;
}

// Table update (for lobby real-time updates)
export interface TableUpdateEvent {
  tableId: string;
  phase: GamePhase;
  timeRemaining: number;
  roundNumber: string;  // Format: YYYYMMDDNNN (e.g., 20260228001)
  shoeNumber: number;
  lastResult?: GameResult;
  lastRoundEntry?: {
    roundNumber: string;
    result: string;
    playerPair: boolean;
    bankerPair: boolean;
  };
  roadmap: {
    banker: number;
    player: number;
    tie: number;
  };
  newShoe?: boolean;
  playerCount?: number;
}

// Fake bets event (visual only)
export interface FakeBetsEvent {
  bets: Record<string, number>;
}

// Shuffle event (new shoe)
export interface ShuffleEvent {
  shoeNumber: number;
}

// ============================================
// Chat Events
// ============================================

// Chat message from server
export interface ChatMessageEvent {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
}

// Chat message payload from client
export interface SendChatPayload {
  message: string;
}

// ============================================
// Client -> Server Events
// ============================================

// Place bet
export interface PlaceBetPayload {
  bets: BetEntry[];
  isNoCommission?: boolean; // 免佣模式
}

// All server-to-client events
export interface ServerToClientEvents {
  'game:state': (data: GameStateEvent) => void;
  'game:phase': (data: PhaseChangeEvent) => void;
  'game:timer': (data: TimerEvent) => void;
  'game:card': (data: CardDealtEvent) => void;
  'game:result': (data: RoundResultEvent) => void;
  'game:roadmap': (data: RoadmapUpdateEvent) => void;
  'bet:confirmed': (data: BetConfirmedEvent) => void;
  'bet:settlement': (data: BetSettlementEvent) => void;
  'user:balance': (data: BalanceUpdateEvent) => void;
  'chat:message': (data: ChatMessageEvent) => void;
  'lobby:tableUpdate': (data: TableUpdateEvent) => void;
  'game:fakeBets': (data: FakeBetsEvent) => void;
  'dt:fakeBets': (data: FakeBetsEvent) => void;
  'bb:fakeBets': (data: FakeBetsEvent) => void;
  'game:shuffle': (data: ShuffleEvent) => void;
  'dt:shuffle': (data: ShuffleEvent) => void;
  'bb:shuffle': (data: ShuffleEvent) => void;
  error: (data: ErrorEvent) => void;
}

// All client-to-server events
export interface ClientToServerEvents {
  'bet:place': (data: PlaceBetPayload) => void;
  'bet:clear': () => void;
  'game:requestState': () => void;
  'chat:send': (data: SendChatPayload) => void;
}
