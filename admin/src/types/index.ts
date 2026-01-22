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

// Game types
export type GameResult = 'player' | 'banker' | 'tie';

export interface GameRound {
  id: string;
  roundNumber: number;
  shoeNumber: number;
  playerPoints: number;
  bankerPoints: number;
  playerScore?: number;
  bankerScore?: number;
  result: GameResult | null;
  playerPair: boolean;
  bankerPair: boolean;
  createdAt: string;
}

// API response types
export interface PaginatedResponse<_T> {
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

export interface GameRoundsResponse extends PaginatedResponse<GameRound> {
  rounds: GameRound[];
  total?: number;
}

// Auth types
export interface LoginResponse {
  user: User;
  token: string;
}

// Dashboard stats
export interface DashboardStats {
  totalUsers: number;
  totalAgents: number;
  totalMembers: number;
  totalBalance: number;
  todayDeposits: number;
  todayWithdraws: number;
  todayBets: number;
  todayWins: number;
  recentTransactions: Transaction[];
  recentRounds: GameRound[];
}
