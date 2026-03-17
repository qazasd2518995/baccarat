/**
 * Materialized Path utilities for agent hierarchy
 *
 * Path format: "ancestorId.parentId.selfId"
 * - Admin (root): "adminId"
 * - Level 1 agent: "adminId.agent1Id"
 * - Level 2 agent: "adminId.agent1Id.agent2Id"
 * - Member under agent2: "adminId.agent1Id.agent2Id.memberId"
 *
 * Query patterns:
 * - All downline of X:  WHERE materialized_path LIKE 'X.%' (starts with X followed by dot)
 * - Is Y under X:       Y.materializedPath starts with X.materializedPath + '.'
 * - All ancestors of Y:  Split Y.materializedPath by '.'
 */

import { prisma } from '../lib/prisma.js';

/**
 * Build materialized path for a user given their parent's path
 */
export function buildPath(parentPath: string | null, userId: string): string {
  if (!parentPath) return userId;
  return `${parentPath}.${userId}`;
}

/**
 * Get all downline user IDs (members + agents) under a given user
 * Single query using LIKE on materialized_path
 */
export async function getDownlineUserIds(
  userId: string,
  roleFilter?: 'agent' | 'member'
): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { materializedPath: true },
  });
  if (!user?.materializedPath) return [];

  const where: any = {
    materializedPath: { startsWith: `${user.materializedPath}.` },
  };
  if (roleFilter) {
    where.role = roleFilter;
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });
  return users.map(u => u.id);
}

/**
 * Get all downline member IDs under a given user
 */
export async function getDownlineMemberIds(userId: string): Promise<string[]> {
  return getDownlineUserIds(userId, 'member');
}

/**
 * Get all downline agent IDs under a given user
 */
export async function getDownlineAgentIds(userId: string): Promise<string[]> {
  return getDownlineUserIds(userId, 'agent');
}

/**
 * Check if targetUserId is in the downline of rootUserId
 * No DB query needed if both have materializedPath
 */
export async function isInDownline(rootUserId: string, targetUserId: string): Promise<boolean> {
  const [root, target] = await prisma.user.findMany({
    where: { id: { in: [rootUserId, targetUserId] } },
    select: { id: true, materializedPath: true },
  });

  const rootUser = root?.id === rootUserId ? root : target;
  const targetUser = target?.id === targetUserId ? target : root;

  if (!rootUser?.materializedPath || !targetUser?.materializedPath) return false;

  return targetUser.materializedPath.startsWith(`${rootUser.materializedPath}.`);
}

/**
 * Get ancestor IDs from materialized path (excluding self)
 */
export function getAncestorIds(materializedPath: string): string[] {
  const parts = materializedPath.split('.');
  return parts.slice(0, -1); // all except last (self)
}

/**
 * Count downline users with optional role filter
 */
export async function countDownline(
  userId: string,
  roleFilter?: 'agent' | 'member'
): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { materializedPath: true },
  });
  if (!user?.materializedPath) return 0;

  const where: any = {
    materializedPath: { startsWith: `${user.materializedPath}.` },
  };
  if (roleFilter) {
    where.role = roleFilter;
  }

  return prisma.user.count({ where });
}

/**
 * Rebuild materialized paths for all users in the database
 * Run this once after adding the field, or when hierarchy data is corrupted
 */
export async function rebuildAllPaths(): Promise<{ updated: number }> {
  // Get all users with hierarchy info
  const allUsers = await prisma.user.findMany({
    select: { id: true, parentAgentId: true, role: true },
    orderBy: { createdAt: 'asc' },
  });

  // Build parent lookup
  const parentMap = new Map<string, string | null>();
  for (const u of allUsers) {
    parentMap.set(u.id, u.parentAgentId);
  }

  // Build path for each user (memoized)
  const pathCache = new Map<string, string>();

  function computePath(userId: string): string {
    if (pathCache.has(userId)) return pathCache.get(userId)!;

    const parentId = parentMap.get(userId);
    if (!parentId) {
      // Root user (admin or orphan)
      pathCache.set(userId, userId);
      return userId;
    }

    const parentPath = computePath(parentId);
    const path = `${parentPath}.${userId}`;
    pathCache.set(userId, path);
    return path;
  }

  // Compute all paths
  for (const u of allUsers) {
    computePath(u.id);
  }

  // Batch update in chunks
  let updated = 0;
  const CHUNK = 100;
  const entries = Array.from(pathCache.entries());

  for (let i = 0; i < entries.length; i += CHUNK) {
    const chunk = entries.slice(i, i + CHUNK);
    await prisma.$transaction(
      chunk.map(([id, path]) =>
        prisma.user.update({
          where: { id },
          data: { materializedPath: path },
        })
      )
    );
    updated += chunk.length;
  }

  console.log(`[MaterializedPath] Rebuilt paths for ${updated} users`);
  return { updated };
}

/**
 * Update path for a single user and all their descendants
 * Call this when a user's parentAgentId changes
 */
export async function updateUserPath(userId: string, newParentId: string | null): Promise<void> {
  // Get new parent's path
  let newParentPath: string | null = null;
  if (newParentId) {
    const parent = await prisma.user.findUnique({
      where: { id: newParentId },
      select: { materializedPath: true },
    });
    newParentPath = parent?.materializedPath ?? null;
  }

  const newPath = buildPath(newParentPath, userId);

  // Get old path
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { materializedPath: true },
  });
  const oldPath = user?.materializedPath;

  // Update this user
  await prisma.user.update({
    where: { id: userId },
    data: { materializedPath: newPath },
  });

  // Update all descendants: replace old path prefix with new path prefix
  if (oldPath) {
    const descendants = await prisma.user.findMany({
      where: { materializedPath: { startsWith: `${oldPath}.` } },
      select: { id: true, materializedPath: true },
    });

    if (descendants.length > 0) {
      await prisma.$transaction(
        descendants.map(d => prisma.user.update({
          where: { id: d.id },
          data: {
            materializedPath: newPath + d.materializedPath!.substring(oldPath.length),
          },
        }))
      );
    }
  }
}
