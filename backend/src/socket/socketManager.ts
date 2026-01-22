import { Server } from 'socket.io';
import type { ServerToClientEvents, ClientToServerEvents } from './types.js';

// Type-safe Socket.io server
export type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

let ioInstance: TypedServer | null = null;

export function setSocketInstance(io: TypedServer): void {
  ioInstance = io;
}

export function getSocketInstance(): TypedServer | null {
  return ioInstance;
}

/**
 * 發送餘額更新給特定用戶
 * @param userId 用戶 ID
 * @param balance 新餘額
 * @param reason 更新原因
 */
export function emitBalanceUpdate(
  userId: string,
  balance: number,
  reason: 'bet_placed' | 'bet_cleared' | 'settlement' | 'deposit' | 'withdraw'
): void {
  if (!ioInstance) {
    console.warn('[SocketManager] Socket.io not initialized, cannot emit balance update');
    return;
  }

  // 發送到用戶的專屬房間
  ioInstance.to(`user:${userId}`).emit('user:balance', {
    balance,
    reason,
  });

  console.log(`[SocketManager] Balance update sent to user:${userId} - balance=${balance}, reason=${reason}`);
}

/**
 * 廣播牌局結果給所有在桌台的用戶
 * @param tableId 桌台 ID
 * @param result 牌局結果
 */
export function broadcastGameResult(tableId: string, result: any): void {
  if (!ioInstance) {
    console.warn('[SocketManager] Socket.io not initialized, cannot broadcast game result');
    return;
  }

  ioInstance.to(`table:${tableId}`).emit('game:result', result);
  console.log(`[SocketManager] Game result broadcast to table:${tableId}`);
}

/**
 * 廣播遊戲階段變更
 * @param tableId 桌台 ID
 * @param phase 遊戲階段
 * @param timeRemaining 剩餘時間
 * @param roundId 牌局 ID
 */
export function broadcastPhaseChange(
  tableId: string,
  phase: string,
  timeRemaining: number,
  roundId: string | null
): void {
  if (!ioInstance) {
    console.warn('[SocketManager] Socket.io not initialized, cannot broadcast phase change');
    return;
  }

  ioInstance.to(`table:${tableId}`).emit('game:phase', {
    phase: phase as any,
    timeRemaining,
    roundId,
  });
}

/**
 * 廣播路單更新
 * @param tableId 桌台 ID
 * @param recentRounds 最近的牌局結果
 */
export function broadcastRoadmapUpdate(tableId: string, recentRounds: any[]): void {
  if (!ioInstance) {
    console.warn('[SocketManager] Socket.io not initialized, cannot broadcast roadmap');
    return;
  }

  ioInstance.to(`table:${tableId}`).emit('game:roadmap', {
    recentRounds,
  });
}
