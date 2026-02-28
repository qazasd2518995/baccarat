import axios from 'axios';
import type {
  User,
  Transaction,
  UsersResponse,
  TransactionsResponse,
  GameRoundsResponse,
  LoginResponse,
  DashboardStats,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { username, password }),

  me: () => api.get<User>('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// User API
export const userApi = {
  getUsers: (params?: {
    role?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => api.get<UsersResponse>('/users', { params }),

  getUser: (id: string) => api.get<User>(`/users/${id}`),

  createUser: (data: {
    username: string;
    password: string;
    nickname?: string;
    role: 'agent' | 'member';
  }) => api.post<User>('/users', data),

  updateUser: (id: string, data: Partial<User>) =>
    api.put<User>(`/users/${id}`, data),

  deleteUser: (id: string) => api.delete(`/users/${id}`),
};

// Transaction API
export const transactionApi = {
  getTransactions: (params?: {
    userId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get<TransactionsResponse>('/transactions', { params }),

  createTransaction: (data: {
    userId: string;
    type: 'deposit' | 'withdraw' | 'adjustment';
    amount: number;
    note?: string;
  }) => api.post<Transaction>('/transactions', data),
};

// Game API
export const gameApi = {
  getRounds: (params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get<GameRoundsResponse>('/game/rounds', { params }),

  getStats: () => api.get<DashboardStats>('/game/stats'),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => api.get<{ data: DashboardStats }>('/admin/stats'),
};

// Notice API
export const noticeApi = {
  getNotices: (params?: {
    page?: number;
    limit?: number;
    type?: string;
    published?: boolean;
  }) => api.get('/notices', { params }),

  createNotice: (data: {
    title: string;
    content: string;
    type?: 'info' | 'warning' | 'urgent';
    isPinned?: boolean;
    isPublished?: boolean;
  }) => api.post('/notices', data),

  updateNotice: (id: string, data: {
    title?: string;
    content?: string;
    type?: 'info' | 'warning' | 'urgent';
    isPinned?: boolean;
    isPublished?: boolean;
  }) => api.put(`/notices/${id}`, data),

  deleteNotice: (id: string) => api.delete(`/notices/${id}`),
};

// Operation Log API
export const operationLogApi = {
  getLogs: (params?: {
    page?: number;
    limit?: number;
    action?: string;
    operatorId?: string;
    targetType?: string;
    from?: string;
    to?: string;
  }) => api.get('/operation-logs', { params }),
};

// Report API
export const reportApi = {
  getReport: (params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
  }) => api.get('/reports', { params }),
};

// Game Control API
export const gameControlApi = {
  getDepositControl: (userId: string) => api.get(`/game-control/deposit-control/${userId}`),
  setDepositControl: (userId: string, data: {
    enabled: boolean;
    minAmount?: number;
    maxAmount?: number;
    note?: string;
  }) => api.put(`/game-control/deposit-control/${userId}`, data),

  getWithdrawControl: (userId: string) => api.get(`/game-control/withdraw-control/${userId}`),
  setWithdrawControl: (userId: string, data: {
    enabled: boolean;
    minAmount?: number;
    maxAmount?: number;
    note?: string;
  }) => api.put(`/game-control/withdraw-control/${userId}`, data),

  getBettingControl: (userId: string) => api.get(`/game-control/betting-control/${userId}`),
  setBettingControl: (userId: string, data: {
    enabled: boolean;
    minBet?: number;
    maxBet?: number;
    note?: string;
  }) => api.put(`/game-control/betting-control/${userId}`, data),
};

// Betting Limit API
export const bettingLimitApi = {
  getLimits: () => api.get('/betting-limits'),
  updateLimits: (data: any) => api.put('/betting-limits', data),
};

// ============================================
// New Agent Management APIs
// ============================================

// Agent Management API
export const agentManagementApi = {
  // Dashboard
  getDashboard: () => api.get('/agent-management/dashboard'),

  // Agents
  getAgents: (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get('/agent-management/agents', { params }),

  createAgent: (data: {
    username: string;
    password: string;
    nickname?: string;
    initialBalance?: number;
    sharePercent?: number;
    rebatePercent?: number;
    betLimits?: string[];
    platforms?: string[];
  }) => api.post('/agent-management/agents', data),

  // Members
  getMembers: (params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) => api.get('/agent-management/members', { params }),

  createMember: (data: {
    username: string;
    password: string;
    nickname?: string;
    initialBalance?: number;
  }) => api.post('/agent-management/members', data),

  // User Status
  updateUserStatus: (userId: string, data: {
    isLocked?: boolean;
    isFullDisabled?: boolean;
    isReadonly?: boolean;
    status?: string;
  }) => api.put(`/agent-management/users/${userId}/status`, data),

  // Share Settings
  getShareSettings: (userId: string) => api.get(`/agent-management/users/${userId}/share-settings`),
  updateShareSettings: (userId: string, data: {
    sharePercent?: number;
    rebatePercent?: number;
    gameCategory?: string;
    platform?: string;
    settings?: Array<{
      gameCategory: string;
      platform: string;
      sharePercent: number;
      rebatePercent: number;
    }>;
  }) => api.put(`/agent-management/users/${userId}/share-settings`, data),
  getShareHistory: (userId: string, params?: {
    page?: number;
    limit?: number;
  }) => api.get(`/agent-management/users/${userId}/share-history`, { params }),

  // Bet Limits
  getBetLimits: (userId: string) => api.get(`/agent-management/users/${userId}/bet-limits`),
  updateBetLimits: (userId: string, data: {
    limits: Array<{ limitRange: string; enabled: boolean }>;
  }) => api.put(`/agent-management/users/${userId}/bet-limits`, data),

  // Withdraw All
  withdrawAll: (userId: string) => api.post(`/agent-management/users/${userId}/withdraw-all`),

  // Balance Adjustment
  adjustBalance: (userId: string, data: {
    type: 'deposit' | 'withdraw';
    amount: number;
    note?: string;
  }) => api.post(`/agent-management/users/${userId}/balance`, data),

  // Sub-accounts
  getSubAccounts: () => api.get('/agent-management/sub-accounts'),
  createSubAccount: (data: {
    username: string;
    password: string;
    nickname?: string;
    permissions?: object;
  }) => api.post('/agent-management/sub-accounts', data),
  updateSubAccount: (id: string, data: {
    password?: string;
    nickname?: string;
    permissions?: object;
    status?: string;
  }) => api.put(`/agent-management/sub-accounts/${id}`, data),
  deleteSubAccount: (id: string) => api.delete(`/agent-management/sub-accounts/${id}`),

  // Platforms
  getPlatforms: () => api.get('/agent-management/platforms'),

  // Update Agent
  updateAgent: (id: string, data: { password?: string; nickname?: string }) =>
    api.put(`/agent-management/agents/${id}`, data),
};

// Agent Report API
export const agentReportApi = {
  getAgentReport: (params?: {
    agentId?: string;
    quickFilter?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/agent-report/agent', { params }),

  getMemberReport: (params?: {
    memberId?: string;
    quickFilter?: string;
    startDate?: string;
    endDate?: string;
  }) => api.get('/agent-report/member', { params }),

  getDashboard: () => api.get('/agent-report/dashboard'),
};

// Logs API
export const logsApi = {
  getOperationLogs: (params?: {
    operatorId?: string;
    targetId?: string;
    quickFilter?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/logs/operation', { params }),

  getCashLogs: (params?: {
    operatorId?: string;
    targetId?: string;
    quickFilter?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/logs/cash', { params }),

  getShareLogs: (params?: {
    operatorId?: string;
    targetId?: string;
    quickFilter?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/logs/share', { params }),

  getLoginLogs: (params?: {
    userId?: string;
    quickFilter?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/logs/login', { params }),
};

// Betting Records API
export const bettingApi = {
  getBettingRecords: (params?: {
    userId?: string;
    gameType?: string;
    status?: string;
    quickFilter?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/game/bets', { params }),
};

export default api;
