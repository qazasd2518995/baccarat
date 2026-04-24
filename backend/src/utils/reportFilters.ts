import { prisma } from '../lib/prisma.js';
import type { JWTPayload } from '../middleware/auth.js';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseTaipeiReportDate(value: unknown, endOfDay = false): Date | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (typeof rawValue !== 'string') return undefined;

  const raw = rawValue.trim();
  if (!raw) return undefined;

  if (DATE_ONLY_RE.test(raw)) {
    const time = endOfDay ? '23:59:59.999' : '00:00:00.000';
    return new Date(`${raw}T${time}+08:00`);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function resolveReportUserIds(currentUser: JWTPayload): Promise<string[]> {
  const ids = new Set<string>();
  if (currentUser.userId) ids.add(currentUser.userId);
  if (currentUser.bgUserId) ids.add(currentUser.bgUserId);

  const candidates = [
    currentUser.userId ? { id: currentUser.userId } : null,
    currentUser.userId ? { bgUserId: currentUser.userId } : null,
    currentUser.bgUserId ? { id: currentUser.bgUserId } : null,
    currentUser.bgUserId ? { bgUserId: currentUser.bgUserId } : null,
    currentUser.username ? { username: currentUser.username } : null,
  ].filter((item): item is { id: string } | { bgUserId: string } | { username: string } => Boolean(item));

  if (candidates.length === 0) return Array.from(ids);

  const users = await prisma.user.findMany({
    where: { OR: candidates },
    select: { id: true, bgUserId: true },
  });

  for (const user of users) {
    ids.add(user.id);
    if (user.bgUserId) ids.add(user.bgUserId);
  }

  return Array.from(ids);
}
