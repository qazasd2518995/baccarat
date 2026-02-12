// Fake player count manager — maintains per-table player counts
// that fluctuate slightly each round for realism

interface TablePlayerState {
  baseCount: number;
  currentCount: number;
}

const tablePlayerCounts = new Map<string, TablePlayerState>();

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function initTablePlayerCount(tableId: string): void {
  if (tablePlayerCounts.has(tableId)) return;
  const baseCount = randInt(600, 2000);
  tablePlayerCounts.set(tableId, {
    baseCount,
    currentCount: baseCount,
  });
}

export function getTablePlayerCount(tableId: string): number {
  const state = tablePlayerCounts.get(tableId);
  if (!state) {
    initTablePlayerCount(tableId);
    return tablePlayerCounts.get(tableId)!.currentCount;
  }
  return state.currentCount;
}

export function fluctuatePlayerCount(tableId: string): number {
  let state = tablePlayerCounts.get(tableId);
  if (!state) {
    initTablePlayerCount(tableId);
    state = tablePlayerCounts.get(tableId)!;
  }

  // Fluctuate ±10~30
  const delta = randInt(-30, 30);
  let newCount = state.currentCount + delta;

  // Clamp to [baseCount - 100, baseCount + 100] and absolute [600, 2000]
  newCount = Math.max(state.baseCount - 100, Math.min(state.baseCount + 100, newCount));
  newCount = Math.max(600, Math.min(2000, newCount));

  state.currentCount = newCount;
  return newCount;
}
