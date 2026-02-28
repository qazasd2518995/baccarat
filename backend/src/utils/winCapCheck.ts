import type { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

/**
 * Win cap check (DEPRECATED)
 *
 * 新的輸贏控制設計使用機率控制（controlDirection + controlPercentage）
 * 而不是封頂邏輯。這個函數保留以維持向後兼容，但不再進行任何封頂檢查。
 *
 * 實際的控制邏輯在 gameResultControl.ts 中實現。
 */
export async function applyWinCap(
  _tx: TransactionClient,
  _userId: string,
  proposedNetWin: number
): Promise<number> {
  // 不再進行封頂檢查，直接返回原始數值
  return proposedNetWin;
}
