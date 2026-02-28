/**
 * Round Number Generator
 *
 * Generates round numbers in the format: YYYYMMDD + 3-digit sequence
 * Example: 20260228001, 20260228002, ..., 20260228999
 *
 * Each day starts fresh from 001
 */

// Track current date and sequence for each game type
interface DailyCounter {
  date: string;  // YYYYMMDD format
  sequence: number;
}

const counters: Map<string, DailyCounter> = new Map();

/**
 * Get today's date in YYYYMMDD format
 */
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Generate a new round number for a given game type
 * @param gameType - The game type identifier (e.g., 'baccarat', 'dragon_tiger', 'bull_bull')
 * @param existingSequence - Optional existing sequence to continue from (loaded from DB)
 * @returns Round number string in format YYYYMMDDNNN
 */
export function generateRoundNumber(gameType: string, existingSequence?: number): string {
  const today = getTodayDateString();
  const counter = counters.get(gameType);

  if (!counter || counter.date !== today) {
    // New day or first run - start fresh or use existing sequence
    counters.set(gameType, {
      date: today,
      sequence: existingSequence ?? 0,
    });
  }

  const currentCounter = counters.get(gameType)!;
  currentCounter.sequence++;

  // Format sequence as 3-digit number (001-999)
  const sequenceStr = String(currentCounter.sequence).padStart(3, '0');

  return `${today}${sequenceStr}`;
}

/**
 * Initialize counter from persisted state
 * @param gameType - The game type identifier
 * @param lastRoundNumber - The last round number from database (e.g., "20260228015")
 */
export function initializeCounter(gameType: string, lastRoundNumber: string | null): void {
  if (!lastRoundNumber) {
    // No previous round, start fresh
    counters.set(gameType, {
      date: getTodayDateString(),
      sequence: 0,
    });
    return;
  }

  const today = getTodayDateString();
  const roundDate = lastRoundNumber.substring(0, 8);

  if (roundDate === today) {
    // Same day, continue from last sequence
    const sequence = parseInt(lastRoundNumber.substring(8), 10) || 0;
    counters.set(gameType, {
      date: today,
      sequence,
    });
  } else {
    // Different day, start fresh
    counters.set(gameType, {
      date: today,
      sequence: 0,
    });
  }
}

/**
 * Get current sequence for a game type (for persistence)
 */
export function getCurrentSequence(gameType: string): number {
  return counters.get(gameType)?.sequence ?? 0;
}

/**
 * Parse round number to extract date and sequence
 */
export function parseRoundNumber(roundNumber: string): { date: string; sequence: number } | null {
  if (!roundNumber || roundNumber.length < 9) {
    return null;
  }

  const date = roundNumber.substring(0, 8);
  const sequence = parseInt(roundNumber.substring(8), 10);

  if (isNaN(sequence)) {
    return null;
  }

  return { date, sequence };
}
