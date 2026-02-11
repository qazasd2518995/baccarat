import { io, Socket } from 'socket.io-client';
import type { Card, GameResult, BetType } from '../types';

// ============================================
// Socket Event Types (matching backend)
// ============================================

export type GamePhase = 'betting' | 'sealed' | 'dealing' | 'result';

export interface BetEntry {
  type: BetType;
  amount: number;
}

// Server to Client Events
export interface GameStateEvent {
  phase: GamePhase;
  roundId: string | null;
  roundNumber: number;
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

export interface PhaseChangeEvent {
  phase: GamePhase;
  timeRemaining: number;
  roundId: string | null;
}

export interface TimerEvent {
  timeRemaining: number;
  phase: GamePhase;
}

export interface CardDealtEvent {
  target: 'player' | 'banker';
  cardIndex: number;
  card: Card;
  currentPoints: number;
}

export interface RoundResultEvent {
  roundId: string;
  roundNumber: number;
  result: GameResult;
  playerCards: Card[];
  bankerCards: Card[];
  playerPoints: number;
  bankerPoints: number;
  playerPair: boolean;
  bankerPair: boolean;
}

export interface BetConfirmedEvent {
  roundId: string;
  bets: BetEntry[];
  totalBet: number;
}

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

export interface BalanceUpdateEvent {
  balance: number;
  reason: 'bet_placed' | 'bet_cleared' | 'settlement' | 'deposit' | 'withdraw';
}

export interface ErrorEvent {
  code: string;
  message: string;
}

export interface RoadmapUpdateEvent {
  recentRounds: Array<{
    roundNumber: number;
    result: GameResult;
    playerPair: boolean;
    bankerPair: boolean;
    playerPoints: number;
    bankerPoints: number;
    totalCards: number;  // 4, 5, or 6 cards total
  }>;
}

// Chat events
export interface ChatMessageEvent {
  id: string;
  userId: string;
  username: string;
  message: string;
  createdAt: string;
}

// Lobby table update event
export interface TableUpdateEvent {
  tableId: string;
  phase: GamePhase;
  timeRemaining: number;
  roundNumber: number;
  shoeNumber: number;
  lastResult?: GameResult;
  lastRoundEntry?: {
    roundNumber: number;
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
}

// Server to Client Events Interface
interface ServerToClientEvents {
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
  error: (data: ErrorEvent) => void;
}

// Client to Server Events Interface
interface ClientToServerEvents {
  'bet:place': (data: { bets: BetEntry[]; isNoCommission?: boolean }) => void;
  'bet:clear': () => void;
  'game:requestState': (data?: { tableId?: string }) => void;
  'chat:send': (data: { message: string }) => void;
  'join:table': (data: { gameType: string; tableId?: string }) => void;
}

// Typed Socket
type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ============================================
// Socket Connection Management
// ============================================

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: TypedSocket | null = null;

export function getSocket(): TypedSocket | null {
  return socket;
}

export function connectSocket(token: string): TypedSocket {
  if (socket?.connected) {
    return socket;
  }

  // Disconnect existing socket if any
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 60000, // 60 seconds timeout for Render cold start
  }) as TypedSocket;

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    // Don't auto-request state here - let the hook handle it after joining the correct table
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected manually');
  }
}

// ============================================
// Socket Actions
// ============================================

export function placeBet(bets: BetEntry[], isNoCommission: boolean = false): void {
  if (!socket?.connected) {
    console.error('[Socket] Cannot place bet: not connected');
    return;
  }
  socket.emit('bet:place', { bets, isNoCommission });
}

export function clearBets(): void {
  if (!socket?.connected) {
    console.error('[Socket] Cannot clear bets: not connected');
    return;
  }
  socket.emit('bet:clear');
}

export function requestGameState(): void {
  if (!socket?.connected) {
    console.error('[Socket] Cannot request state: not connected');
    return;
  }
  socket.emit('game:requestState');
}

export function sendChatMessage(message: string): void {
  if (!socket?.connected) {
    console.error('[Socket] Cannot send chat: not connected');
    return;
  }
  socket.emit('chat:send', { message });
}

export function joinTable(gameType: string, tableId?: string): void {
  if (!socket?.connected) {
    console.error('[Socket] Cannot join table: not connected');
    return;
  }
  socket.emit('join:table', { gameType, tableId });
  console.log(`[Socket] Joining ${gameType} table${tableId ? ` ${tableId}` : ''}`);
}
