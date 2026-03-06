import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CasinoChip from './CasinoChip';
import { formatAmount } from '../../utils/format';

// ============================================================
// Hook: Realistic progressive fake chip amounts during betting
// Each bet area has independent timing, speed, and activity level
// ============================================================

interface BetAreaState {
  currentAmount: number;
  targetAmount: number;
  isActive: boolean;        // Whether this area is receiving bets this round
  activityLevel: number;    // 0-1, how active this bet area is (affects speed)
  nextUpdateTime: number;   // When to update next (ms since betting started)
  incrementSize: number;    // How much to add each update
}

export function useFakeChipAmounts(
  targetBets: Record<string, number>,
  phase: string,
): Record<string, number> {
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const stateRef = useRef<Map<string, BetAreaState>>(new Map());
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const prevPhaseRef = useRef(phase);

  // Initialize or reset bet area states when phase changes to betting
  useEffect(() => {
    const keys = Object.keys(targetBets).filter(k => targetBets[k] > 0);

    // Phase just changed to betting → reset everything with varied settings
    if (phase === 'betting' && prevPhaseRef.current !== 'betting') {
      stateRef.current.clear();
      setAmounts({});
      startTimeRef.current = performance.now();

      // Create varied states for each bet area
      for (const key of keys) {
        const target = targetBets[key];

        // Random activity level - some areas are very active, some quiet
        const activityLevel = Math.random();

        // Some areas don't start betting immediately (0-4 second delay)
        const startDelay = Math.random() * 4000;

        // Very low chance (10%) this area has NO activity this round
        const isActive = Math.random() > 0.1;

        // How many updates to reach target (more for active areas)
        const numUpdates = isActive ? Math.floor(3 + activityLevel * 8) : 0;

        stateRef.current.set(key, {
          currentAmount: 0,
          targetAmount: isActive ? target : 0,
          isActive,
          activityLevel,
          nextUpdateTime: startDelay,
          incrementSize: isActive && numUpdates > 0 ? Math.ceil(target / numUpdates) : 0,
        });
      }
    }
    prevPhaseRef.current = phase;

    // Not in betting phase → show final amounts directly
    if (phase !== 'betting') {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Show actual target amounts outside betting phase
      if (keys.length > 0) {
        setAmounts({ ...targetBets });
      }
      return;
    }

    // No bet data → nothing to animate
    if (keys.length === 0) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    // Animation loop
    const animate = () => {
      const now = performance.now();
      const elapsed = now - startTimeRef.current;
      let hasChanges = false;
      const newAmounts: Record<string, number> = {};

      for (const [key, state] of stateRef.current.entries()) {
        if (!state.isActive) {
          newAmounts[key] = 0;
          continue;
        }

        // Check if it's time to update this area
        if (elapsed >= state.nextUpdateTime && state.currentAmount < state.targetAmount) {
          // Add increment with some randomness (80%-120%)
          const noise = 0.8 + Math.random() * 0.4;
          const increment = Math.round(state.incrementSize * noise);
          state.currentAmount = Math.min(state.currentAmount + increment, state.targetAmount);

          // Schedule next update with varied timing
          const baseInterval = 300 + (1 - state.activityLevel) * 1700;
          const intervalNoise = 0.5 + Math.random(); // 0.5x to 1.5x
          state.nextUpdateTime = elapsed + baseInterval * intervalNoise;

          hasChanges = true;
        }

        newAmounts[key] = state.currentAmount;
      }

      if (hasChanges) {
        setAmounts(newAmounts);
      }

      // Continue animation if any area hasn't reached target
      let anyPending = false;
      for (const state of stateRef.current.values()) {
        if (state.isActive && state.currentAmount < state.targetAmount) {
          anyPending = true;
          break;
        }
      }

      if (anyPending) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [phase, targetBets]);

  return amounts;
}

// ============================================================
// Component: Realistic multi-denomination chip stacks
// Shows varied chip colors/values like real multi-player betting
// ============================================================

interface FakeChipStackProps {
  amount: number;
  compact?: boolean;
}

// Available chip denominations (must match CasinoChip values)
const CHIP_DENOMS = [100, 500, 1000, 5000, 10000, 50000, 100000];

// Generate a realistic mix of chip denominations for a given amount
// Returns array of chip values, simulating multiple players betting different amounts
function generateChipMix(amount: number, seed: number): number[] {
  if (amount <= 0) return [];

  const chips: number[] = [];
  let remaining = amount;

  // Seeded random for consistent results per bet area
  const seededRandom = (i: number) => {
    const x = Math.sin(seed * (i + 1) * 9999) * 10000;
    return x - Math.floor(x);
  };

  let iteration = 0;
  const maxChips = 8; // Limit stack height

  while (remaining > 0 && chips.length < maxChips) {
    // Find valid denominations for remaining amount
    const validDenoms = CHIP_DENOMS.filter(d => d <= remaining);
    if (validDenoms.length === 0) break;

    // Weighted random selection - prefer variety over efficiency
    // Sometimes pick smaller chips even when larger ones fit
    const randomFactor = seededRandom(iteration * 7);

    let selectedDenom: number;
    if (randomFactor < 0.3 && validDenoms.length > 1) {
      // 30% chance: pick a smaller denomination for variety
      const smallerIndex = Math.floor(seededRandom(iteration * 13) * Math.min(3, validDenoms.length));
      selectedDenom = validDenoms[smallerIndex];
    } else if (randomFactor < 0.6 && validDenoms.length > 2) {
      // 30% chance: pick middle denomination
      const midIndex = Math.floor(validDenoms.length / 2);
      selectedDenom = validDenoms[midIndex];
    } else {
      // 40% chance: pick largest valid denomination
      selectedDenom = validDenoms[validDenoms.length - 1];
    }

    chips.push(selectedDenom);
    remaining -= selectedDenom;
    iteration++;
  }

  // Shuffle chips slightly for more natural look (not perfectly sorted)
  for (let i = chips.length - 1; i > 0; i--) {
    if (seededRandom(i * 17) < 0.3) {
      const j = Math.max(0, i - 1 - Math.floor(seededRandom(i * 23) * 2));
      [chips[i], chips[j]] = [chips[j], chips[i]];
    }
  }

  return chips;
}

// Track visible chips with progressive reveal
function useProgressiveChips(targetChips: number[]) {
  const [visibleCount, setVisibleCount] = useState(0);
  const prevLengthRef = useRef(0);
  const delayMultiplierRef = useRef(1);

  // Initialize delay multiplier once (varies per instance)
  useEffect(() => {
    delayMultiplierRef.current = 0.6 + Math.random() * 0.8; // 0.6x to 1.4x
  }, []);

  useEffect(() => {
    const targetCount = targetChips.length;

    // If target decreased (new round), reset
    if (targetCount < prevLengthRef.current) {
      setVisibleCount(0);
      prevLengthRef.current = targetCount;
      return;
    }
    prevLengthRef.current = targetCount;

    if (visibleCount >= targetCount) return;

    // Add chips one by one with varied delay
    const baseDelay = 80 + Math.random() * 250;
    const delay = baseDelay * delayMultiplierRef.current;
    const timer = setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + 1, targetCount));
    }, delay);

    return () => clearTimeout(timer);
  }, [targetChips.length, visibleCount]);

  return visibleCount;
}

export const FakeChipStack = memo(function FakeChipStack({ amount, compact = false }: FakeChipStackProps) {
  // Generate stable seed from amount (changes each round but stable during animation)
  const seedRef = useRef(Math.random() * 10000);
  const prevAmountRef = useRef(0);

  // Reset seed when amount drops significantly (new round)
  if (amount < prevAmountRef.current * 0.3) {
    seedRef.current = Math.random() * 10000;
  }
  prevAmountRef.current = amount;

  // Generate chip mix
  const targetChips = useMemo(
    () => generateChipMix(amount, seedRef.current),
    [amount]
  );

  const visibleCount = useProgressiveChips(targetChips);

  // Chip sizes per breakpoint
  const mobileSize = compact ? 10 : 14;
  const desktopSize = compact ? 18 : 24;

  // Vertical offset between chips in the stack
  const mobileGap = 2;
  const desktopGap = 3;

  // Use target length for container height to prevent layout shift
  const maxChips = targetChips.length;
  const mobileStackH = mobileSize + (maxChips - 1) * mobileGap;
  const desktopStackH = desktopSize + (maxChips - 1) * desktopGap;

  if (amount <= 0 || visibleCount === 0) return null;

  const visibleChips = targetChips.slice(0, visibleCount);

  return (
    <div className="pointer-events-none">
      {/* Mobile chip stack */}
      <div className="relative sm:hidden" style={{ width: mobileSize, height: mobileStackH }}>
        <AnimatePresence>
          {visibleChips.map((chipValue, i) => (
            <motion.div
              key={`${i}-${chipValue}`}
              initial={{ opacity: 0, y: -15, scale: 0.5 }}
              animate={{ opacity: 0.9, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 22,
              }}
              className="absolute left-0"
              style={{ bottom: i * mobileGap, zIndex: i }}
            >
              <CasinoChip size={mobileSize} value={chipValue} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Desktop chip stack */}
      <div className="relative hidden sm:block" style={{ width: desktopSize, height: desktopStackH }}>
        <AnimatePresence>
          {visibleChips.map((chipValue, i) => (
            <motion.div
              key={`${i}-${chipValue}`}
              initial={{ opacity: 0, y: -25, scale: 0.5 }}
              animate={{ opacity: 0.9, y: 0, scale: 1 }}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 22,
              }}
              className="absolute left-0"
              style={{ bottom: i * desktopGap, zIndex: i }}
            >
              <CasinoChip size={desktopSize} value={chipValue} />
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
