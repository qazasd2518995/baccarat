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
    // OR: phase is betting and we have new bets but haven't initialized yet
    const phaseJustChangedToBetting = phase === 'betting' && prevPhaseRef.current !== 'betting';
    const needsInitInBetting = phase === 'betting' && keys.length > 0 && stateRef.current.size === 0;

    if (phaseJustChangedToBetting || needsInitInBetting) {
      stateRef.current.clear();
      setAmounts({});
      startTimeRef.current = performance.now();

      // Create varied states for each bet area - bets should span most of the betting period
      for (const key of keys) {
        const target = targetBets[key];

        // Random activity level - some areas are very active, some quiet
        const activityLevel = 0.3 + Math.random() * 0.7; // 0.3 to 1.0

        // Some areas don't start betting immediately (0-8 second delay for more variety)
        const startDelay = Math.random() * 8000;

        // Very low chance (5%) this area has NO activity this round
        const isActive = Math.random() > 0.05;

        // More updates spread across betting duration for realistic feel
        // Active areas: 8-20 updates, quiet areas: 4-8 updates
        const numUpdates = isActive ? Math.floor(4 + activityLevel * 16) : 0;

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
          // Add increment with more randomness (50%-180%) for realistic betting variation
          const noise = 0.5 + Math.random() * 1.3;
          const increment = Math.round(state.incrementSize * noise);
          state.currentAmount = Math.min(state.currentAmount + increment, state.targetAmount);

          // Schedule next update with much more varied timing
          // Slow bettors: 1.5-4 seconds, fast bettors: 0.5-1.5 seconds
          const baseInterval = 500 + (1 - state.activityLevel) * 3500; // 500ms to 4000ms
          const intervalNoise = 0.3 + Math.random() * 1.4; // 0.3x to 1.7x variation
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
  size?: 'normal' | 'large';
}

// Bet type configurations for display (only bet types that exist in betting area)
const BACCARAT_BET_TYPES: Array<{ key: string; label: string; color: string }> = [
  { key: 'player', label: '閒', color: 'text-blue-400' },
  { key: 'banker', label: '莊', color: 'text-red-400' },
  { key: 'tie', label: '和', color: 'text-green-400' },
  { key: 'player_pair', label: '閒對', color: 'text-blue-300' },
  { key: 'banker_pair', label: '莊對', color: 'text-red-300' },
  { key: 'super_six', label: '超六', color: 'text-yellow-400' },
  { key: 'player_bonus', label: '閒龍寶', color: 'text-blue-200' },
  { key: 'banker_bonus', label: '莊龍寶', color: 'text-red-200' },
];

const DRAGON_TIGER_BET_TYPES: Array<{ key: string; label: string; color: string }> = [
  { key: 'dragon', label: '龍', color: 'text-blue-400' },
  { key: 'tiger', label: '虎', color: 'text-red-400' },
  { key: 'dt_tie', label: '和', color: 'text-green-400' },
  { key: 'dt_suited_tie', label: '同花和', color: 'text-green-300' },
  { key: 'dragon_big', label: '龍大', color: 'text-blue-300' },
  { key: 'dragon_small', label: '龍小', color: 'text-blue-200' },
  { key: 'dragon_odd', label: '龍單', color: 'text-cyan-400' },
  { key: 'dragon_even', label: '龍雙', color: 'text-cyan-300' },
  { key: 'tiger_big', label: '虎大', color: 'text-red-300' },
  { key: 'tiger_small', label: '虎小', color: 'text-red-200' },
  { key: 'tiger_odd', label: '虎單', color: 'text-orange-400' },
  { key: 'tiger_even', label: '虎雙', color: 'text-orange-300' },
];

// Helper component for animated bet row - always visible, shows 0 when no bets
function AnimatedBetRow({
  label,
  color,
  amount,
  labelClass,
  valueClass,
  gapClass,
}: {
  label: string;
  color: string;
  amount: number;
  labelClass: string;
  valueClass: string;
  gapClass: string;
}) {
  const animatedAmount = useAnimatedNumber(amount, 700);

  return (
    <div className={gapClass}>
      <span className={`${labelClass} ${color}`}>{label}</span>
      <motion.span
        key={animatedAmount}
        initial={{ scale: animatedAmount > 0 ? 1.15 : 1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
        className={valueClass}
      >
        {formatAmount(animatedAmount)}
      </motion.span>
    </div>
  );
}

export const FakeBetStats = memo(function FakeBetStats({ fakeBets, gameType = 'baccarat', size = 'normal' }: FakeBetStatsProps) {
  const betTypes = gameType === 'dragonTiger' ? DRAGON_TIGER_BET_TYPES : BACCARAT_BET_TYPES;

  const total = useMemo(() => {
    return Object.values(fakeBets).reduce((sum, val) => sum + (val || 0), 0);
  }, [fakeBets]);

  const animatedTotal = useAnimatedNumber(total, 800);

  // Size-based styles
  const isLarge = size === 'large';
  const containerClass = isLarge
    ? "flex flex-col gap-0.5 sm:gap-0.5 lg:gap-1.5 bg-black/70 backdrop-blur-sm rounded sm:rounded-lg lg:rounded-xl px-1.5 sm:px-3 lg:px-5 py-1 sm:py-2 lg:py-3 border border-white/10 sm:border-[#d4af37]/30 lg:border-[#d4af37]/40 shadow-lg lg:shadow-xl lg:min-w-[140px]"
    : "flex flex-col gap-0.5 sm:gap-1 bg-black/60 backdrop-blur-sm rounded sm:rounded-lg px-1.5 sm:px-3 py-1 sm:py-2 border border-white/10 sm:border-[#d4af37]/30 shadow-lg";
  const titleClass = isLarge
    ? "text-[8px] sm:text-xs lg:text-base text-[#d4af37] font-bold tracking-wider mb-0.5 sm:mb-1 lg:mb-2"
    : "text-[8px] sm:text-xs lg:text-sm text-[#d4af37] font-bold tracking-wider mb-0.5 sm:mb-1";
  const labelClass = isLarge
    ? "text-[8px] sm:text-xs lg:text-base font-bold"
    : "text-[8px] sm:text-sm lg:text-base font-bold";
  const valueClass = isLarge
    ? "text-[8px] sm:text-xs lg:text-base text-white/80 font-mono font-semibold tabular-nums"
    : "text-[8px] sm:text-sm lg:text-base text-white/80 font-mono font-semibold tabular-nums";
  const gapClass = isLarge
    ? "flex items-center justify-between gap-2 sm:gap-3 lg:gap-8"
    : "flex items-center justify-between gap-2 sm:gap-4";
  const totalLabelClass = isLarge
    ? "text-[7px] sm:text-xs lg:text-sm text-white/50"
    : "text-[7px] sm:text-xs lg:text-sm text-white/50";
  const totalValueClass = isLarge
    ? "text-[8px] sm:text-xs lg:text-base text-[#d4af37] font-mono font-bold tabular-nums"
    : "text-[8px] sm:text-sm lg:text-base text-[#d4af37] font-mono font-bold tabular-nums";
  const dividerClass = isLarge
    ? "flex items-center justify-between gap-2 sm:gap-3 lg:gap-6 border-t border-white/10 sm:border-[#d4af37]/20 lg:border-[#d4af37]/30 pt-0.5 sm:pt-1 lg:pt-1.5 mt-0.5 sm:mt-1 lg:mt-1"
    : "flex items-center justify-between gap-2 sm:gap-4 border-t border-white/10 sm:border-[#d4af37]/20 pt-0.5 sm:pt-1 mt-0.5 sm:mt-1";

  return (
    <div className={containerClass}>
      <div className={titleClass}>本桌下注</div>
      {betTypes.map(({ key, label, color }) => (
        <AnimatedBetRow
          key={key}
          label={label}
          color={color}
          amount={fakeBets[key] || 0}
          labelClass={labelClass}
          valueClass={valueClass}
          gapClass={gapClass}
        />
      ))}
      <div className={dividerClass}>
        <span className={totalLabelClass}>總計</span>
        <motion.span
          key={animatedTotal}
          initial={{ scale: animatedTotal > 0 ? 1.2 : 1, color: '#fbbf24' }}
          animate={{ scale: 1, color: '#d4af37' }}
          transition={{ duration: 0.3 }}
          className={totalValueClass}
        >
          {formatAmount(animatedTotal)}
        </motion.span>
      </div>
    </div>
  );
});

// Keep default export for backwards compatibility (unused, but prevents import errors)
export default memo(function TableChipDisplay() { return null; });
