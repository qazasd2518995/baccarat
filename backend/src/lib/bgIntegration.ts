import { prisma } from './prisma.js';

const BG_API_BASE = (process.env.BG_API_BASE || 'http://localhost:3000').replace(/\/+$/, '');
const BG_INTEGRATION_SECRET = process.env.BG_INTEGRATION_SECRET || 'dev-baccarat-integration-secret';

interface BalanceResponse {
  balance: string;
}


async function resolveBgUserId(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { bgUserId: true },
  });
  return user?.bgUserId || userId;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BG_API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-baccarat-secret': BG_INTEGRATION_SECRET,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    let message = `BG integration request failed: ${res.status}`;
    try {
      const body = await res.json() as { message?: string; error?: string };
      message = body.message || body.error || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function bgGetBalance(userId: string): Promise<number> {
  const bgUserId = await resolveBgUserId(userId);
  const data = await request<BalanceResponse>(`/api/integrations/baccarat/users/${encodeURIComponent(bgUserId)}/balance`);
  return Number(data.balance || 0);
}

export async function bgPlaceBet(userId: string, amount: number, meta?: unknown): Promise<number> {
  const bgUserId = await resolveBgUserId(userId);
  const data = await request<BalanceResponse>('/api/integrations/baccarat/bet-place', {
    method: 'POST',
    body: JSON.stringify({ userId: bgUserId, amount, meta }),
  });
  return Number(data.balance || 0);
}

export async function bgClearBet(userId: string, amount: number, meta?: unknown): Promise<number> {
  const bgUserId = await resolveBgUserId(userId);
  const data = await request<BalanceResponse>('/api/integrations/baccarat/bet-clear', {
    method: 'POST',
    body: JSON.stringify({ userId: bgUserId, amount, meta }),
  });
  return Number(data.balance || 0);
}

export async function bgSettleRound(input: {
  userId: string;
  amount: number;
  payout: number;
  gameId?: string;
  resultData?: unknown;
}): Promise<{ balance: number; betId?: string }> {
  const bgUserId = await resolveBgUserId(input.userId);
  const data = await request<{ balance: string; betId?: string }>('/api/integrations/baccarat/settle', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      userId: bgUserId,
      gameId: input.gameId || 'baccarat',
    }),
  });
  return {
    balance: Number(data.balance || 0),
    betId: data.betId,
  };
}
