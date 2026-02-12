import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CasinoChip from './CasinoChip';
import { formatAmount } from '../../utils/format';

interface TableChipDisplayProps {
  /** Target fake bet totals from backend (final amounts for this round) */
  targetBets: Record<string, number>;
  /** Current game phase */
  phase: string;
}

// Seeded random for consistent scatter positions per chip
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// Pick a random chip value based on amount range
function pickChipValue(amount: number): number {
  if (amount >= 50_000_000) return [10000, 50000, 100000][Math.floor(Math.random() * 3)];
  if (amount >= 10_000_000) return [5000, 10000, 50000][Math.floor(Math.random() * 3)];
  if (amount >= 1_000_000) return [1000, 5000, 10000][Math.floor(Math.random() * 3)];
  return [100, 500, 1000][Math.floor(Math.random() * 3)];
}

interface ChipData {
  id: number;
  value: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

interface ZoneState {
  chips: ChipData[];
  currentAmount: number;
}

interface ChipZoneProps {
  label: string;
  labelColor: string;
  chips: ChipData[];
  amount: number;
}

function ChipZone({ label, labelColor, chips, amount }: ChipZoneProps) {
  if (amount <= 0 && chips.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Stacked chips */}
      <div className="relative" style={{ width: 48, height: 48 }}>
        <AnimatePresence>
          {chips.map((chip, i) => (
            <motion.div
              key={chip.id}
              initial={{ opacity: 0, scale: 0.3, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute"
              style={{
                left: `calc(50% - 14px + ${chip.offsetX}px)`,
                bottom: i * 3,
                zIndex: i,
                transform: `rotate(${chip.rotation}deg)`,
              }}
            >
              <CasinoChip size={28} value={chip.value} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {/* Amount label */}
      {amount > 0 && (
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className={`text-[10px] font-bold ${labelColor}`}>{label}</div>
          <div className="text-[10px] text-white/60 font-mono">{formatAmount(amount)}</div>
        </motion.div>
      )}
    </div>
  );
}

let chipIdCounter = 0;

function TableChipDisplay({ targetBets, phase }: TableChipDisplayProps) {
  const [playerZone, setPlayerZone] = useState<ZoneState>({ chips: [], currentAmount: 0 });
  const [tieZone, setTieZone] = useState<ZoneState>({ chips: [], currentAmount: 0 });
  const [bankerZone, setBankerZone] = useState<ZoneState>({ chips: [], currentAmount: 0 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickCountRef = useRef(0);

  // Calculate targets
  const playerTarget = (targetBets.player || 0) + (targetBets.player_pair || 0) + (targetBets.player_bonus || 0);
  const bankerTarget = (targetBets.banker || 0) + (targetBets.banker_pair || 0) + (targetBets.banker_bonus || 0) + (targetBets.super_six || 0);
  const tieTarget = (targetBets.tie || 0);

  const createChip = useCallback((amount: number): ChipData => {
    const id = ++chipIdCounter;
    return {
      id,
      value: pickChipValue(amount),
      offsetX: (Math.random() - 0.5) * 12,
      offsetY: 0,
      rotation: (Math.random() - 0.5) * 25,
    };
  }, []);

  // Reset when entering betting phase
  useEffect(() => {
    if (phase === 'betting') {
      setPlayerZone({ chips: [], currentAmount: 0 });
      setTieZone({ chips: [], currentAmount: 0 });
      setBankerZone({ chips: [], currentAmount: 0 });
      tickCountRef.current = 0;
    }
  }, [phase]);

  // Progressive chip adding during betting phase
  useEffect(() => {
    if (phase !== 'betting' || (playerTarget === 0 && bankerTarget === 0 && tieTarget === 0)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start adding chips after a 2s initial delay, then every 0.8-1.5s
    const startDelay = setTimeout(() => {
      // Total ticks to spread across ~12 seconds of betting (15s minus 2s delay minus buffer)
      const totalTicks = 8 + Math.floor(Math.random() * 4); // 8-11 ticks
      const maxPlayerChips = 4 + Math.floor(Math.random() * 3); // 4-6 chips
      const maxBankerChips = 4 + Math.floor(Math.random() * 3); // 4-6 chips
      const maxTieChips = tieTarget > 0 ? 1 + Math.floor(Math.random() * 2) : 0; // 1-2 chips (much less)

      const scheduleNextTick = () => {
        const delay = 800 + Math.random() * 700; // 0.8-1.5s between ticks
        intervalRef.current = setTimeout(() => {
          tickCountRef.current++;
          const tick = tickCountRef.current;
          const progress = Math.min(tick / totalTicks, 1);

          // Player zone — ramp up
          setPlayerZone(prev => {
            const targetChipCount = Math.round(maxPlayerChips * progress);
            if (prev.chips.length < targetChipCount && playerTarget > 0) {
              const stepAmount = Math.round(playerTarget / maxPlayerChips);
              const newAmount = Math.min(prev.currentAmount + stepAmount + Math.floor((Math.random() - 0.3) * stepAmount * 0.5), playerTarget);
              return {
                chips: [...prev.chips, createChip(playerTarget)],
                currentAmount: newAmount,
              };
            }
            return prev;
          });

          // Banker zone — ramp up (slightly different timing)
          setBankerZone(prev => {
            const targetChipCount = Math.round(maxBankerChips * Math.min((tick + 1) / totalTicks, 1));
            if (prev.chips.length < targetChipCount && bankerTarget > 0) {
              const stepAmount = Math.round(bankerTarget / maxBankerChips);
              const newAmount = Math.min(prev.currentAmount + stepAmount + Math.floor((Math.random() - 0.3) * stepAmount * 0.5), bankerTarget);
              return {
                chips: [...prev.chips, createChip(bankerTarget)],
                currentAmount: newAmount,
              };
            }
            return prev;
          });

          // Tie zone — much less frequent, appears later
          if (tick >= Math.floor(totalTicks * 0.4) && tieTarget > 0) {
            setTieZone(prev => {
              const tieProgress = (tick - Math.floor(totalTicks * 0.4)) / (totalTicks * 0.6);
              const targetChipCount = Math.round(maxTieChips * Math.min(tieProgress, 1));
              if (prev.chips.length < targetChipCount) {
                const stepAmount = Math.round(tieTarget / Math.max(maxTieChips, 1));
                const newAmount = Math.min(prev.currentAmount + stepAmount, tieTarget);
                return {
                  chips: [...prev.chips, createChip(tieTarget)],
                  currentAmount: newAmount,
                };
              }
              return prev;
            });
          }

          if (tick < totalTicks) {
            scheduleNextTick();
          }
        }, delay) as any;
      };

      scheduleNextTick();
    }, 2000); // 2s initial delay

    return () => {
      clearTimeout(startDelay);
      if (intervalRef.current) {
        clearTimeout(intervalRef.current as any);
        intervalRef.current = null;
      }
    };
  }, [phase, playerTarget, bankerTarget, tieTarget, createChip]);

  const hasContent = playerZone.currentAmount > 0 || bankerZone.currentAmount > 0 || tieZone.currentAmount > 0;
  if (!hasContent) return null;

  return (
    <div className="absolute bottom-2 left-0 right-0 z-10 flex items-end justify-center gap-6 sm:gap-12 pointer-events-none">
      <ChipZone label="閒" labelColor="text-blue-400" chips={playerZone.chips} amount={playerZone.currentAmount} />
      <ChipZone label="和" labelColor="text-green-400" chips={tieZone.chips} amount={tieZone.currentAmount} />
      <ChipZone label="莊" labelColor="text-red-400" chips={bankerZone.chips} amount={bankerZone.currentAmount} />
    </div>
  );
}

export default memo(TableChipDisplay);
