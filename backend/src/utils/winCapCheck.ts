import type { Prisma } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

/**
 * Apply win cap enforcement inside a settlement transaction.
 * Checks WinCapControl (user-level daily/weekly/monthly caps) and
 * AgentLineWinCap (parent agent caps). Returns the capped net win.
 */
export async function applyWinCap(
  tx: TransactionClient,
  userId: string,
  proposedNetWin: number
): Promise<number> {
  if (proposedNetWin <= 0) return proposedNetWin;

  let cappedWin = proposedNetWin;

  // Check user-level win cap
  const winCap = await tx.winCapControl.findUnique({
    where: { userId },
  });

  if (winCap && winCap.enabled) {
    const currentWin = Number(winCap.currentWin);

    // Check daily cap
    if (winCap.dailyCap !== null) {
      const dailyLimit = Number(winCap.dailyCap);
      const remaining = Math.max(0, dailyLimit - currentWin);
      cappedWin = Math.min(cappedWin, remaining);
    }

    // Check weekly cap
    if (winCap.weeklyCap !== null) {
      const weeklyLimit = Number(winCap.weeklyCap);
      const remaining = Math.max(0, weeklyLimit - currentWin);
      cappedWin = Math.min(cappedWin, remaining);
    }

    // Check monthly cap
    if (winCap.monthlyCap !== null) {
      const monthlyLimit = Number(winCap.monthlyCap);
      const remaining = Math.max(0, monthlyLimit - currentWin);
      cappedWin = Math.min(cappedWin, remaining);
    }

    // Update currentWin counter
    if (cappedWin > 0) {
      await tx.winCapControl.update({
        where: { userId },
        data: { currentWin: { increment: cappedWin } },
      });
    }
  }

  // Check parent agent line win cap
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { parentAgentId: true },
  });

  if (user?.parentAgentId) {
    const agentCap = await tx.agentLineWinCap.findUnique({
      where: { agentId: user.parentAgentId },
    });

    if (agentCap && agentCap.enabled) {
      const currentWin = Number(agentCap.currentWin);

      if (agentCap.dailyCap !== null) {
        const remaining = Math.max(0, Number(agentCap.dailyCap) - currentWin);
        cappedWin = Math.min(cappedWin, remaining);
      }

      if (agentCap.weeklyCap !== null) {
        const remaining = Math.max(0, Number(agentCap.weeklyCap) - currentWin);
        cappedWin = Math.min(cappedWin, remaining);
      }

      if (agentCap.monthlyCap !== null) {
        const remaining = Math.max(0, Number(agentCap.monthlyCap) - currentWin);
        cappedWin = Math.min(cappedWin, remaining);
      }

      // Update agent line currentWin counter
      if (cappedWin > 0) {
        await tx.agentLineWinCap.update({
          where: { agentId: user.parentAgentId },
          data: { currentWin: { increment: cappedWin } },
        });
      }
    }
  }

  return Math.max(0, cappedWin);
}
