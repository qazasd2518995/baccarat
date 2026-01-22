// User types
export type UserRole = 'admin' | 'agent' | 'member';
export type UserStatus = 'active' | 'suspended' | 'banned';

export interface User {
  id: string;
  username: string;
  nickname?: string;
  role: UserRole;
  balance: number;
  status: UserStatus;
  createdAt: string;
  parentAgent?: {
    id: string;
    username: string;
    nickname?: string;
  };
}

// Card types
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string;
  value: number;
}

// Game types
export type GameResult = 'player' | 'banker' | 'tie';
export type BetType = 'player' | 'banker' | 'tie' | 'player_pair' | 'banker_pair' | 'super_six';
export type BetStatus = 'pending' | 'won' | 'lost' | 'refunded';

export interface GameRound {
  id: string;
  roundNumber: number;
  shoeNumber: number;
  playerCards: Card[];
  bankerCards: Card[];
  playerPoints: number;
  bankerPoints: number;
  result: GameResult;
  playerPair: boolean;
  bankerPair: boolean;
  createdAt: string;
}

export interface Bet {
  type: BetType;
  amount: number;
}

export interface BetResult extends Bet {
  won: boolean;
  payout: number;
}

export interface PlayGameResponse {
  round: GameRound;
  bets: BetResult[];
  totalBet: number;
  totalPayout: number;
  netResult: number;
  newBalance: number;
}

export interface GameState {
  balance: number;
  shoeNumber: number;
  cardsRemaining: number;
  recentRounds: GameRound[];
}

// Transaction types
export type TransactionType = 'deposit' | 'withdraw' | 'bet' | 'win' | 'refund' | 'adjustment';

export interface Transaction {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    nickname?: string;
  };
  operatorId: string;
  operator: {
    id: string;
    username: string;
    nickname?: string;
  };
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
}

// API response types
export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UsersResponse extends PaginatedResponse<User> {
  users: User[];
}

export interface TransactionsResponse extends PaginatedResponse<Transaction> {
  transactions: Transaction[];
}

// Roadmap types for display
export interface RoadmapEntry {
  id: string;
  roundNumber: number;
  result: GameResult;
  playerPair: boolean;
  bankerPair: boolean;
}
