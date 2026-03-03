import { memo, useState, useEffect, useRef, useMemo } from 'react';
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
// Now with progressive stacking animation
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

// Track visible chip count for progressive stacking
function useProgressiveStack(targetCount: number) {
  const [visibleCount, setVisibleCount] = useState(0);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    // If target decreased (new round), reset to 0
    if (targetCount < prevTargetRef.current) {
      setVisibleCount(0);
      prevTargetRef.current = targetCount;
      return;
    }
    prevTargetRef.current = targetCount;

    if (visibleCount >= targetCount) return;

    // Add chips one by one with random delay
    const addNextChip = () => {
      setVisibleCount(prev => {
        if (prev >= targetCount) return prev;
        return prev + 1;
      });
    };

    const delay = 150 + Math.random() * 200; // 150-350ms between chips
    const timer = setTimeout(addNextChip, delay);
    return () => clearTimeout(timer);
  }, [targetCount, visibleCount]);

  return visibleCount;
}

export const FakeChipStack = memo(function FakeChipStack({ amount, compact = false }: FakeChipStackProps) {
  if (amount <= 0) return null;

  const denomination = pickDenomination(amount);
  const targetCount = getStackCount(amount);
  const visibleCount = useProgressiveStack(targetCount);

  // Chip sizes per breakpoint
  const mobileSize = compact ? 10 : 12;
  const desktopSize = compact ? 20 : 26;

  // Vertical offset between chips in the stack
  const mobileGap = 2;
  const desktopGap = 3;

  // Use targetCount for container height to prevent layout shift
  const mobileStackH = mobileSize + (targetCount - 1) * mobileGap;
  const desktopStackH = desktopSize + (targetCount - 1) * desktopGap;

  if (visibleCount === 0) return null;

  return (
    <div className="pointer-events-none">
      {/* Mobile chip stack */}
      <div className="relative sm:hidden" style={{ width: mobileSize, height: mobileStackH }}>
        <AnimatePresence>
          {Array.from({ length: visibleCount }, (_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -20, scale: 0.5 }}
              animate={{ opacity: 0.85, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 20,
                delay: i * 0.05,
              }}
              className="absolute left-0"
              style={{ bottom: i * mobileGap }}
            >
              <CasinoChip size={mobileSize} value={denomination} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Desktop chip stack */}
      <div className="relative hidden sm:block" style={{ width: desktopSize, height: desktopStackH }}>
        <AnimatePresence>
          {Array.from({ length: visibleCount }, (_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: -30, scale: 0.5 }}
              animate={{ opacity: 0.85, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 20,
                delay: i * 0.05,
              }}
              className="absolute left-0"
              style={{ bottom: i * desktopGap }}
            >
              <CasinoChip size={desktopSize} value={denomination} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

// ============================================================
// Hook: Animated counting number (slot machine style)
// ============================================================

function useAnimatedNumber(targetValue: number, duration: number = 800): number {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);
  const prevTargetRef = useRef(0);

  useEffect(() => {
    // If target decreased significantly (new round), reset to 0
    if (targetValue < prevTargetRef.current * 0.5) {
      setDisplayValue(0);
      startValueRef.current = 0;
      prevTargetRef.current = targetValue;
      return;
    }
    prevTargetRef.current = targetValue;

    if (targetValue === displayValue) return;

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    startValueRef.current = displayValue;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function: ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      const current = Math.round(
        startValueRef.current + (targetValue - startValueRef.current) * eased
      );
      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, duration]);

  return displayValue;
}

// ============================================================
// Component: Stats panel shown next to dealer
// Now with animated counting numbers
// ============================================================

interface FakeBetStatsProps {
  fakeBets: Record<string, number>;
  gameType?: 'baccarat' | 'dragonTiger';
}

export const FakeBetStats = memo(function FakeBetStats({ fakeBets, gameType = 'baccarat' }: FakeBetStatsProps) {
  const { playerTotal, bankerTotal, tieTotal, total } = useMemo(() => {
    let p: number, b: number, t: number;

    if (gameType === 'dragonTiger') {
      p = (fakeBets.dragon || 0) + (fakeBets.dragon_big || 0) + (fakeBets.dragon_small || 0) +
        (fakeBets.dragon_odd || 0) + (fakeBets.dragon_even || 0) + (fakeBets.dragon_red || 0) + (fakeBets.dragon_black || 0);
      b = (fakeBets.tiger || 0) + (fakeBets.tiger_big || 0) + (fakeBets.tiger_small || 0) +
        (fakeBets.tiger_odd || 0) + (fakeBets.tiger_even || 0) + (fakeBets.tiger_red || 0) + (fakeBets.tiger_black || 0);
      t = (fakeBets.dt_tie || 0) + (fakeBets.dt_suited_tie || 0);
    } else {
      p = (fakeBets.player || 0) + (fakeBets.player_pair || 0) + (fakeBets.player_bonus || 0);
      b = (fakeBets.banker || 0) + (fakeBets.banker_pair || 0) + (fakeBets.banker_bonus || 0) + (fakeBets.super_six || 0);
      t = (fakeBets.tie || 0);
    }

    return { playerTotal: p, bankerTotal: b, tieTotal: t, total: p + b + t };
  }, [fakeBets, gameType]);

  // Animated values
  const animatedPlayer = useAnimatedNumber(playerTotal, 700);
  const animatedBanker = useAnimatedNumber(bankerTotal, 700);
  const animatedTie = useAnimatedNumber(tieTotal, 700);
  const animatedTotal = useAnimatedNumber(total, 800);

  // Track if panel should be visible
  const [isVisible, setIsVisible] = useState(false);
  const prevTotalRef = useRef(0);

  useEffect(() => {
    // Show panel when total > 0
    if (total > 0 && !isVisible) {
      setIsVisible(true);
    }
    // Hide when total drops to 0 (new round)
    if (total === 0 && prevTotalRef.current > 0) {
      setIsVisible(false);
    }
    prevTotalRef.current = total;
  }, [total, isVisible]);

  if (!isVisible) return null;

  const labels = gameType === 'dragonTiger'
    ? { player: '龍', tie: '和', banker: '虎' }
    : { player: '閒', tie: '和', banker: '莊' };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -10, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -10, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="flex flex-col gap-0.5 bg-black/50 backdrop-blur-sm rounded px-1.5 py-1 border border-white/10 shadow-lg"
      >
        <div className="text-[8px] sm:text-[9px] text-[#d4af37]/70 font-bold tracking-wider mb-0.5">本桌下注</div>
        <AnimatePresence mode="popLayout">
          {animatedPlayer > 0 && (
            <motion.div
              key="player"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-[8px] sm:text-[9px] text-blue-400 font-bold">{labels.player}</span>
              <span className="text-[8px] sm:text-[9px] text-white/60 font-mono tabular-nums">
                {formatAmount(animatedPlayer)}
              </span>
            </motion.div>
          )}
          {animatedTie > 0 && (
            <motion.div
              key="tie"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-[8px] sm:text-[9px] text-green-400 font-bold">{labels.tie}</span>
              <span className="text-[8px] sm:text-[9px] text-white/60 font-mono tabular-nums">
                {formatAmount(animatedTie)}
              </span>
            </motion.div>
          )}
          {animatedBanker > 0 && (
            <motion.div
              key="banker"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between gap-2"
            >
              <span className="text-[8px] sm:text-[9px] text-red-400 font-bold">{labels.banker}</span>
              <span className="text-[8px] sm:text-[9px] text-white/60 font-mono tabular-nums">
                {formatAmount(animatedBanker)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          layout
          className="flex items-center justify-between gap-2 border-t border-white/10 pt-0.5 mt-0.5"
        >
          <span className="text-[7px] sm:text-[8px] text-white/40">總計</span>
          <motion.span
            key={animatedTotal}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-[8px] sm:text-[9px] text-[#d4af37]/80 font-mono font-bold tabular-nums"
          >
            {formatAmount(animatedTotal)}
          </motion.span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});

// Keep default export for backwards compatibility (unused, but prevents import errors)
export default memo(function TableChipDisplay() { return null; });
