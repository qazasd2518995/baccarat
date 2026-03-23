/**
 * Rebate (退水) Calculation System
 *
 * 百家樂滿水 = 1% (stored as 1.0, calculated as 1.0 / 100 = 0.01)
 *
 * Rebate Modes:
 * - 'all':        Agent keeps ALL rebate, downline gets 0
 * - 'none':       Agent gives ALL to downline, keeps 0
 * - 'percentage': Agent specifies exact distribution
 *
 * Earned Rebate (賺水):
 * = (parentRate - childEffectiveRate) × betAmount / 100
 */

import { PrismaClient, Prisma } from '@prisma/client';

export const MAX_REBATE_PERCENT = 1.0; // 1% — 百家樂滿水
export const EPSILON = 0.0000001;

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

/**
 * Get the effective rebate percentage that an agent's downline actually receives.
 * - mode='all': agent keeps all → downline gets 0
 * - mode='none': agent gives all → downline gets agent's full rate
 * - mode='percentage': downline gets agent's specified rate
 */
export function getEffectiveRebateForDownline(
  rebateMode: string,
  rebatePercent: number,
): number {
  if (rebateMode === 'all') return 0;
  // For both 'none' and 'percentage', the rebatePercent IS what downline receives
  return rebatePercent;
}

/**
 * Calculate max rebate a child agent can have based on parent's settings
 */
export function calculateChildMaxRebate(
  parentRebateMode: string,
  parentRebatePercent: number,
): number {
  if (parentRebateMode === 'all') return 0; // Parent keeps all, child gets nothing
  return parentRebatePercent; // Child can have up to parent's rate
}

/**
 * Validate that child's rebate doesn't exceed parent's allocation
 */
export function validateChildRebate(
  parentRebateMode: string,
  parentRebatePercent: number,
  childRebatePercent: number,
): { valid: boolean; error?: string; maxAllowed: number } {
  const maxAllowed = calculateChildMaxRebate(parentRebateMode, parentRebatePercent);

  if (childRebatePercent > maxAllowed + EPSILON) {
    return {
      valid: false,
      error: `退水比例不可超過上級分配的 ${maxAllowed}%`,
      maxAllowed,
    };
  }
  return { valid: true, maxAllowed };
}

/**
 * Distribute rebate to agent hierarchy after a member's bets are settled.
 * Called INSIDE prisma.$transaction.
 *
 * Walks up the materializedPath from member's direct parent to root.
 * Each agent earns the difference between what they receive and what they give to their child.
 *
 * Example: Admin(1%) → AgentA(0.8%) → AgentB(0.5%) → Member bets 10000
 * - AgentB gets direct rebate: 10000 × 0.5% / 100 = 0.5 (if mode != 'all')
 * - AgentA earns: 10000 × (0.8% - 0.5%) / 100 = 0.3
 * - Admin earns: 10000 × (1.0% - 0.8%) / 100 = 0.2
 */
export async function distributeRebateForBets(
  tx: TxClient,
  memberId: string,
  totalBetAmount: number,
  gameType: string,
  roundId: string | null,
): Promise<number> {
  if (totalBetAmount <= 0) return 0;

  // Get member's materializedPath to find all ancestors
  const member = await tx.user.findUnique({
    where: { id: memberId },
    select: { materializedPath: true, parentAgentId: true },
  });

  if (!member?.materializedPath || !member.parentAgentId) return 0;

  // Get all ancestor IDs from path (excluding the member themselves)
  const pathIds = member.materializedPath.split('.');
  const memberIndex = pathIds.indexOf(memberId);
  const ancestorIds = memberIndex > 0 ? pathIds.slice(0, memberIndex) : pathIds.slice(0, -1);

  if (ancestorIds.length === 0) return 0;

  // Fetch all ancestors in one query
  const ancestors = await tx.user.findMany({
    where: { id: { in: ancestorIds } },
    select: {
      id: true,
      rebatePercent: true,
      rebateMode: true,
      parentAgentId: true,
    },
  });

  // Build lookup map
  const ancestorMap = new Map(ancestors.map(a => [a.id, a]));

  // Walk from root to member's direct parent, calculating each agent's earned rebate
  // We need to know each agent's rate and their child's effective rate
  let totalDistributed = 0;
  const rebateRecords: Array<{
    agentId: string;
    rebatePercent: number;
    rebateAmount: number;
    rebateType: string;
  }> = [];

  // Process from direct parent up to root
  // ancestorIds is ordered root → ... → directParent
  for (let i = ancestorIds.length - 1; i >= 0; i--) {
    const agentId = ancestorIds[i];
    const agent = ancestorMap.get(agentId);
    if (!agent) continue;

    const agentRate = Number(agent.rebatePercent);

    // Determine what this agent's child (next in chain toward member) gets
    let childRate = 0;
    if (i < ancestorIds.length - 1) {
      // This agent's child is the next ancestor in the chain
      const childId = ancestorIds[i + 1];
      const child = ancestorMap.get(childId);
      if (child) {
        childRate = Number(child.rebatePercent);
      }
    } else {
      // This is the direct parent of the member — child is the member (rate = 0)
      childRate = 0;
    }

    // Earned rebate for this agent = (their rate - child's rate) × betAmount
    const earnedPercent = agentRate - childRate;

    if (earnedPercent > EPSILON) {
      const rebateAmount = Math.round(totalBetAmount * (earnedPercent / 100) * 100) / 100;

      if (rebateAmount > 0) {
        // Credit agent balance
        await tx.user.update({
          where: { id: agentId },
          data: { balance: { increment: rebateAmount } },
        });

        rebateRecords.push({
          agentId,
          rebatePercent: earnedPercent,
          rebateAmount,
          rebateType: i === ancestorIds.length - 1 ? 'direct' : 'earned',
        });

        totalDistributed += rebateAmount;
      }
    }
  }

  // Batch create rebate transaction records
  if (rebateRecords.length > 0) {
    await tx.rebateTransaction.createMany({
      data: rebateRecords.map(r => ({
        agentId: r.agentId,
        memberId,
        roundId,
        gameType,
        betAmount: totalBetAmount,
        rebatePercent: r.rebatePercent,
        rebateAmount: r.rebateAmount,
        rebateType: r.rebateType,
      })),
    });
  }

  return totalDistributed;
}
