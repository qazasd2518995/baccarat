import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CasinoChip from './CasinoChip';
import { formatAmount } from '../../utils/format';

// ============================================================
// Hook: Progressive fake chip amounts during betting phase
// ============================================================

export function useFakeChipAmounts(
  targetBets: Record<string, number>,
  phase: string,
): Record<string, number> {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef(0);
  const prevPhaseRef = useRef(phase);

  // Single combined effect handles both phase transitions and targetBets changes
  useEffect(() => {
    const keys = Object.keys(targetBets).filter(k => targetBets[k] > 0);

    // Phase just changed to betting → reset tick counter
    if (phase === 'betting' && prevPhaseRef.current !== 'betting') {
      tickRef.current = 0;
      setAmounts({});
    }
    prevPhaseRef.current = phase;

    // Not in betting phase or no bets → show final amounts directly
    if (phase !== 'betting') {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      // Outside betting, show target amounts directly (so stats panel stays visible)
      if (keys.length > 0) {
        setAmounts({ ...targetBets });
      }
      return;
    }

    // In betting phase but no bet data yet → wait for data
    if (keys.length === 0) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }

    // Already fully ramped → just update with new targets
    const totalTicks = 8 + Math.floor(Math.random() * 4); // 8-11 ticks
    if (tickRef.current >= totalTicks) {
      setAmounts({ ...targetBets });
      return;
    }

    // Clear any existing timer before starting new schedule
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    const scheduleNext = () => {
      const delay = tickRef.current === 0
        ? 1500 + Math.random() * 1000  // first update after 1.5-2.5s
        : 600 + Math.random() * 800;   // then 600-1400ms apart

      timerRef.current = setTimeout(() => {
        tickRef.current++;
        const t = tickRef.current;
        const progress = Math.min(t / totalTicks, 1);

        setAmounts(() => {
          const next: Record<string, number> = {};
          for (const key of keys) {
            const target = targetBets[key];
            const p = Math.min(progress * (0.8 + Math.random() * 0.4), 1);
            next[key] = Math.round(target * p);
          }
          return next;
        });

        if (t < totalTicks) scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [phase, targetBets]);

  return amounts;
}

// ============================================================
// Component: Small chip stack shown inside each bet button
// ============================================================

interface FakeChipStackProps {
  amount: number;
  compact?: boolean;
}

function pickDenomination(amount: number): number {
  if (amount >= 100000) return 100000;
  if (amount >= 50000) return 50000;
  if (amount >= 10000) return 10000;
  if (amount >= 5000) return 5000;
  if (amount >= 1000) return 1000;
  if (amount >= 500) return 500;
  return 100;
}

function getStackCount(amount: number): number {
  if (amount >= 50000) return 6;
  if (amount >= 20000) return 5;
  if (amount >= 10000) return 4;
  if (amount >= 5000) return 3;
  if (amount >= 1000) return 2;
  return 1;
}

export const FakeChipStack = memo(function FakeChipStack({ amount, compact = false }: FakeChipStackProps) {
  if (amount <= 0) return null;

  const denomination = pickDenomination(amount);
  const count = getStackCount(amount);

  // Chip sizes per breakpoint
  const mobileSize = compact ? 10 : 12;
  const desktopSize = compact ? 20 : 26;

  // Vertical offset between chips in the stack
  const mobileGap = 2;
  const desktopGap = 3;

  const mobileStackH = mobileSize + (count - 1) * mobileGap;
  const desktopStackH = desktopSize + (count - 1) * desktopGap;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 0.75, scale: 1 }}
      className="pointer-events-none"
    >
      {/* Mobile chip stack */}
      <div className="relative sm:hidden" style={{ width: mobileSize, height: mobileStackH }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="absolute left-0" style={{ bottom: i * mobileGap }}>
            <CasinoChip size={mobileSize} value={denomination} />
          </div>
        ))}
      </div>
      {/* Desktop chip stack */}
      <div className="relative hidden sm:block" style={{ width: desktopSize, height: desktopStackH }}>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="absolute left-0" style={{ bottom: i * desktopGap }}>
            <CasinoChip size={desktopSize} value={denomination} />
          </div>
        ))}
      </div>
    </motion.div>
  );
});

// ============================================================
// Component: Stats panel shown next to dealer
// ============================================================

interface FakeBetStatsProps {
  fakeBets: Record<string, number>;
  gameType?: 'baccarat' | 'dragonTiger';
}

export const FakeBetStats = memo(function FakeBetStats({ fakeBets, gameType = 'baccarat' }: FakeBetStatsProps) {
  let playerTotal: number;
  let bankerTotal: number;
  let tieTotal: number;

  if (gameType === 'dragonTiger') {
    playerTotal = (fakeBets.dragon || 0) + (fakeBets.dragon_big || 0) + (fakeBets.dragon_small || 0) +
      (fakeBets.dragon_odd || 0) + (fakeBets.dragon_even || 0) + (fakeBets.dragon_red || 0) + (fakeBets.dragon_black || 0);
    bankerTotal = (fakeBets.tiger || 0) + (fakeBets.tiger_big || 0) + (fakeBets.tiger_small || 0) +
      (fakeBets.tiger_odd || 0) + (fakeBets.tiger_even || 0) + (fakeBets.tiger_red || 0) + (fakeBets.tiger_black || 0);
    tieTotal = (fakeBets.dt_tie || 0) + (fakeBets.dt_suited_tie || 0);
  } else {
    playerTotal = (fakeBets.player || 0) + (fakeBets.player_pair || 0) + (fakeBets.player_bonus || 0);
    bankerTotal = (fakeBets.banker || 0) + (fakeBets.banker_pair || 0) + (fakeBets.banker_bonus || 0) + (fakeBets.super_six || 0);
    tieTotal = (fakeBets.tie || 0);
  }

  const total = playerTotal + bankerTotal + tieTotal;
  if (total <= 0) return null;

  const labels = gameType === 'dragonTiger'
    ? { player: '龍', tie: '和', banker: '虎' }
    : { player: '閒', tie: '和', banker: '莊' };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        className="flex flex-col gap-0.5 bg-black/40 backdrop-blur-sm rounded px-1.5 py-1 border border-white/5"
      >
        <div className="text-[8px] sm:text-[9px] text-[#d4af37]/60 font-bold tracking-wider mb-0.5">本桌下注</div>
        {playerTotal > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8px] sm:text-[9px] text-blue-400 font-bold">{labels.player}</span>
            <span className="text-[8px] sm:text-[9px] text-white/50 font-mono">{formatAmount(playerTotal)}</span>
          </div>
        )}
        {tieTotal > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8px] sm:text-[9px] text-green-400 font-bold">{labels.tie}</span>
            <span className="text-[8px] sm:text-[9px] text-white/50 font-mono">{formatAmount(tieTotal)}</span>
          </div>
        )}
        {bankerTotal > 0 && (
          <div className="flex items-center justify-between gap-2">
            <span className="text-[8px] sm:text-[9px] text-red-400 font-bold">{labels.banker}</span>
            <span className="text-[8px] sm:text-[9px] text-white/50 font-mono">{formatAmount(bankerTotal)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-0.5 mt-0.5">
          <span className="text-[7px] sm:text-[8px] text-white/30">總計</span>
          <span className="text-[8px] sm:text-[9px] text-[#d4af37]/70 font-mono font-bold">{formatAmount(total)}</span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

// Keep default export for backwards compatibility (unused, but prevents import errors)
export default memo(function TableChipDisplay() { return null; });
