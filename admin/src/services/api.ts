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

export default api;
