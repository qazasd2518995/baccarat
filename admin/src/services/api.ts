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

export default api;
