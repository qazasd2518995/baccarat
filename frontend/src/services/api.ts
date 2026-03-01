import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),

  me: () => api.get('/auth/me'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// User API
export const userApi = {
  getUsers: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    api.get('/users', { params }),

  getUser: (id: string) => api.get(`/users/${id}`),

  createUser: (data: { username: string; password: string; nickname?: string; role: 'agent' | 'member' }) =>
    api.post('/users', data),

  updateUser: (id: string, data: { nickname?: string; status?: string }) =>
    api.put(`/users/${id}`, data),

  resetPassword: (id: string, newPassword: string) =>
    api.post(`/users/${id}/reset-password`, { newPassword }),

  getSubUsers: (id: string) => api.get(`/users/${id}/sub-users`),

  getNotificationSettings: (id: string) =>
    api.get(`/users/${id}/notification-settings`),

  updateNotificationSettings: (id: string, data: {
    settlementNotifications?: boolean;
    balanceAlerts?: boolean;
    systemAnnouncements?: boolean;
    soundEffects?: boolean;
  }) =>
    api.patch(`/users/${id}/notification-settings`, data),
};

// Transaction API
export const transactionApi = {
  getTransactions: (params?: { userId?: string; type?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) =>
    api.get('/transactions', { params }),

  createTransaction: (data: { userId: string; type: 'deposit' | 'withdraw' | 'adjustment'; amount: number; note?: string }) =>
    api.post('/transactions', data),

  getBalance: (userId: string) => api.get(`/transactions/balance/${userId}`),

  getSummary: (params?: { userId?: string; startDate?: string; endDate?: string }) =>
    api.get('/transactions/summary', { params }),
};

// Game API
export const gameApi = {
  getGameState: () => api.get('/game/state'),

  play: (bets: { type: string; amount: number }[]) =>
    api.post('/game/play', { bets }),

  getHistory: (params?: { page?: number; limit?: number }) =>
    api.get('/game/history', { params }),

  getRoadmap: (shoeNumber?: number) =>
    api.get('/game/roadmap', { params: { shoeNumber } }),

  getStats: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/game/stats', { params }),

  newShoe: () => api.post('/game/new-shoe'),

  getRounds: (params?: { page?: number; limit?: number; result?: string; from?: string; to?: string }) =>
    api.get('/game/rounds', { params }),

  getMyLimits: () => api.get('/game/my-limits'),
};

// Reports API
export const reportApi = {
  getMemberReport: (params?: { from?: string; to?: string }) =>
    api.get('/reports/members', { params }),

  getAgentReport: (params?: { from?: string; to?: string }) =>
    api.get('/reports/agents', { params }),

  getDashboard: () => api.get('/reports/dashboard'),

  getBetHistory: (params?: {
    page?: number;
    limit?: number;
    from?: string;
    to?: string;
    memberId?: string;
    platform?: string;
    status?: string;
  }) => api.get('/reports/bet-history', { params }),
};

// Notice API
export const noticeApi = {
  getNotices: (params?: { page?: number; limit?: number; type?: string; published?: string }) =>
    api.get('/notices', { params }),

  getNotice: (id: string) => api.get(`/notices/${id}`),

  createNotice: (data: { title: string; content: string; type?: string; isPinned?: boolean; isPublished?: boolean }) =>
    api.post('/notices', data),

  updateNotice: (id: string, data: { title?: string; content?: string; type?: string; isPinned?: boolean; isPublished?: boolean }) =>
    api.put(`/notices/${id}`, data),

  deleteNotice: (id: string) => api.delete(`/notices/${id}`),

  togglePin: (id: string) => api.patch(`/notices/${id}/pin`),

  togglePublish: (id: string) => api.patch(`/notices/${id}/publish`),

  getPublicNotices: (target?: 'agent_dashboard' | 'game_marquee') =>
    api.get('/notices/public', { params: target ? { target } : {} }),
};

// Operation Log API
export const operationLogApi = {
  getLogs: (params?: { page?: number; limit?: number; action?: string; operatorId?: string; targetType?: string; from?: string; to?: string }) =>
    api.get('/operation-logs', { params }),

  getActions: () => api.get('/operation-logs/actions'),

  getTargetTypes: () => api.get('/operation-logs/target-types'),

  getOperators: () => api.get('/operation-logs/operators'),

  getStatsSummary: (params?: { from?: string; to?: string }) =>
    api.get('/operation-logs/stats/summary', { params }),
};

// Betting Limit API
export const bettingLimitApi = {
  getLimits: () => api.get('/betting-limits'),

  getLimit: (id: string) => api.get(`/betting-limits/${id}`),

  createLimit: (data: {
    name: string;
    playerMin: number;
    playerMax: number;
    bankerMin: number;
    bankerMax: number;
    tieMin: number;
    tieMax: number;
    pairMin: number;
    pairMax: number;
    isDefault?: boolean;
  }) => api.post('/betting-limits', data),

  updateLimit: (id: string, data: Partial<{
    name: string;
    playerMin: number;
    playerMax: number;
    bankerMin: number;
    bankerMax: number;
    tieMin: number;
    tieMax: number;
    pairMin: number;
    pairMax: number;
    isDefault: boolean;
  }>) => api.put(`/betting-limits/${id}`, data),

  deleteLimit: (id: string) => api.delete(`/betting-limits/${id}`),

  setDefault: (id: string) => api.patch(`/betting-limits/${id}/set-default`),

  assignToUser: (id: string, userId: string) =>
    api.post(`/betting-limits/${id}/assign`, { userId }),
};

// Leaderboard API
export const leaderboardApi = {
  getLeaderboard: (params?: { period?: 'daily' | 'weekly' | 'monthly' | 'all'; limit?: number }) =>
    api.get('/leaderboard', { params }),

  getMyRank: (params?: { period?: 'daily' | 'weekly' | 'monthly' | 'all' }) =>
    api.get('/leaderboard/my-rank', { params }),
};

// Chat API
export const chatApi = {
  getHistory: (params?: { limit?: number; before?: string }) =>
    api.get('/chat/history', { params }),
};

// Gift API
export const giftApi = {
  getGifts: () => api.get('/gifts'),

  sendGift: (data: { giftType: string; dealerName: string; quantity?: number }) =>
    api.post('/gifts/send', data),

  getHistory: (params?: { page?: number; limit?: number; from?: string; to?: string }) =>
    api.get('/gifts/history', { params }),
};

// Dealer Follow API
export const dealerApi = {
  getFollowing: () => api.get('/dealers/following'),

  followDealer: (dealerName: string) =>
    api.post('/dealers/follow', { dealerName }),

  unfollowDealer: (dealerName: string) =>
    api.delete(`/dealers/follow/${encodeURIComponent(dealerName)}`),

  isFollowing: (dealerName: string) =>
    api.get(`/dealers/follow/${encodeURIComponent(dealerName)}`),
};

// Tables API
export const tablesApi = {
  getTables: (params?: { gameType?: string; active?: string }) =>
    api.get('/tables', { params }),

  getTable: (id: string) =>
    api.get(`/tables/${id}`),

  createTable: (data: {
    name: string;
    dealerName: string;
    gameType?: string;
    minBet?: number;
    maxBet?: number;
    sortOrder?: number;
  }) => api.post('/tables', data),

  updateTable: (id: string, data: {
    name?: string;
    dealerName?: string;
    gameType?: string;
    minBet?: number;
    maxBet?: number;
    isActive?: boolean;
    sortOrder?: number;
  }) => api.put(`/tables/${id}`, data),

  deleteTable: (id: string) =>
    api.delete(`/tables/${id}`),
};

// Game Control API
export const gameControlApi = {
  // Deposit Control
  getDepositControl: (userId: string) =>
    api.get(`/game-control/deposit-control/${userId}`),

  setDepositControl: (userId: string, data: { enabled: boolean; minAmount?: number | null; maxAmount?: number | null; note?: string | null }) =>
    api.put(`/game-control/deposit-control/${userId}`, data),

  // Win Cap Control
  getWinCapControl: (userId: string) =>
    api.get(`/game-control/win-cap/${userId}`),

  setWinCapControl: (userId: string, data: { enabled: boolean; dailyCap?: number | null; weeklyCap?: number | null; monthlyCap?: number | null; note?: string | null }) =>
    api.put(`/game-control/win-cap/${userId}`, data),

  resetWinCap: (userId: string) =>
    api.post(`/game-control/win-cap/${userId}/reset`),

  // Agent Line Win Cap
  getAgentLineWinCap: (agentId: string) =>
    api.get(`/game-control/agent-line-cap/${agentId}`),

  setAgentLineWinCap: (agentId: string, data: { enabled: boolean; dailyCap?: number | null; weeklyCap?: number | null; monthlyCap?: number | null; note?: string | null }) =>
    api.put(`/game-control/agent-line-cap/${agentId}`, data),

  // Summary
  getControlsSummary: (userId: string) =>
    api.get(`/game-control/summary/${userId}`),
};

export default api;
