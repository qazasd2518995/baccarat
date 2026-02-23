import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CasinoChip from './CasinoChip';
import { formatAmount } from '../../utils/format';

interface TableChipDisplayProps {
  targetBets: Record<string, number>;
  phase: string;
  compact?: boolean;
  gameType?: 'baccarat' | 'dragonTiger';
}

// Random chip value weighted by total pool size
function pickChipValue(): number {
  const r = Math.random();
  if (r < 0.15) return 100;
  if (r < 0.30) return 500;
  if (r < 0.50) return 1000;
  if (r < 0.70) return 5000;
  if (r < 0.85) return 10000;
  if (r < 0.95) return 50000;
  return 100000;
}

interface ChipData {
  id: number;
  value: number;
  // Position within zone as percentage (0-100)
  x: number;
  y: number;
  rotation: number;
  // Random fly-in direction
  flyFromX: number;
  flyFromY: number;
}

interface ZoneState {
  chips: ChipData[];
  currentAmount: number;
}

// Each zone is a wide area; chips scatter randomly within it
function ChipZone({ label, labelColor, chips, amount, compact }: {
  label: string;
  labelColor: string;
  chips: ChipData[];
  amount: number;
  compact?: boolean;
}) {
  if (amount <= 0 && chips.length === 0) return null;

  const chipSize = compact ? 18 : 26;

  return (
    <div className="relative flex-1 h-full">
      {/* Zone label at bottom center */}
      {amount > 0 && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center z-20">
          <span className={`${compact ? 'text-[9px]' : 'text-[11px]'} font-bold ${labelColor} drop-shadow-md`}>{label} </span>
          <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} text-white/50 font-mono`}>{formatAmount(amount)}</span>
        </div>
      )}
      {/* Scattered chips */}
      <AnimatePresence>
        {chips.map((chip) => (
          <motion.div
            key={chip.id}
            initial={{
              opacity: 0,
              scale: 0.4,
              x: chip.flyFromX,
              y: chip.flyFromY,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              x: 0,
              y: 0,
            }}
            transition={{
              duration: 0.4,
              ease: [0.2, 0.8, 0.3, 1], // custom ease for a "toss" feel
            }}
            className="absolute"
            style={{
              left: `${chip.x}%`,
              top: `${chip.y}%`,
              transform: `translate(-50%, -50%) rotate(${chip.rotation}deg)`,
              zIndex: chip.id % 10, // Keep chips below labels (z-20)
            }}
          >
            <CasinoChip size={chipSize} value={chip.value} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

let chipIdCounter = 0;

function createChip(): ChipData {
  const id = ++chipIdCounter;
  // Scatter within zone: x 15-85%, y 5-55% (compact, leave bottom for label)
  const x = 15 + Math.random() * 70;
  const y = 5 + Math.random() * 50;
  const rotation = (Math.random() - 0.5) * 40;
  // Random fly-in from edges
  const angle = Math.random() * Math.PI * 2;
  const dist = 40 + Math.random() * 60;
  return {
    id,
    value: pickChipValue(),
    x,
    y,
    rotation,
    flyFromX: Math.cos(angle) * dist,
    flyFromY: Math.sin(angle) * dist - 30, // bias upward
  };
}

function TableChipDisplay({ targetBets, phase, compact = false, gameType = 'baccarat' }: TableChipDisplayProps) {
  const [playerZone, setPlayerZone] = useState<ZoneState>({ chips: [], currentAmount: 0 });
  const [tieZone, setTieZone] = useState<ZoneState>({ chips: [], currentAmount: 0 });
  const [bankerZone, setBankerZone] = useState<ZoneState>({ chips: [], currentAmount: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef(0);

  const playerTarget = (targetBets.player || 0) + (targetBets.player_pair || 0) + (targetBets.player_bonus || 0);
  const bankerTarget = (targetBets.banker || 0) + (targetBets.banker_pair || 0) + (targetBets.banker_bonus || 0) + (targetBets.super_six || 0);
  const tieTarget = (targetBets.tie || 0);

  // Reset on new betting round
  useEffect(() => {
    if (phase === 'betting') {
      setPlayerZone({ chips: [], currentAmount: 0 });
      setTieZone({ chips: [], currentAmount: 0 });
      setBankerZone({ chips: [], currentAmount: 0 });
      tickRef.current = 0;
    }
  }, [phase]);

  // Progressive chip tossing during betting
  useEffect(() => {
    if (phase !== 'betting' || (playerTarget === 0 && bankerTarget === 0 && tieTarget === 0)) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }

    const maxP = 6 + Math.floor(Math.random() * 5);  // 6-10 player chips
    const maxB = 6 + Math.floor(Math.random() * 5);  // 6-10 banker chips
    const maxT = tieTarget > 0 ? 1 + Math.floor(Math.random() * 3) : 0; // 1-3 tie chips
    const totalTicks = Math.max(maxP, maxB) + 2;

    const addChipToZone = (
      setter: React.Dispatch<React.SetStateAction<ZoneState>>,
      target: number,
      maxChips: number,
      progress: number,
    ) => {
      setter(prev => {
        const want = Math.round(maxChips * progress);
        if (prev.chips.length >= want || target <= 0) return prev;
        // Add 1-2 chips per tick for burstiness
        const toAdd = Math.min(want - prev.chips.length, 1 + Math.floor(Math.random() * 2));
        const newChips = [...prev.chips];
        for (let i = 0; i < toAdd; i++) newChips.push(createChip());
        const step = target / maxChips;
        const newAmount = Math.min(
          Math.round(prev.currentAmount + step * toAdd * (0.8 + Math.random() * 0.4)),
          target,
        );
        return { chips: newChips, currentAmount: newAmount };
      });
    };

    const scheduleNext = () => {
      // Random interval: 600-1400ms
      const delay = tickRef.current === 0
        ? 1500 + Math.random() * 1000  // first chip after 1.5-2.5s
        : 600 + Math.random() * 800;

      timerRef.current = setTimeout(() => {
        tickRef.current++;
        const t = tickRef.current;
        const p = Math.min(t / totalTicks, 1);

        // Player & banker ramp at slightly different rates
        addChipToZone(setPlayerZone, playerTarget, maxP, p);
        addChipToZone(setBankerZone, bankerTarget, maxB, Math.min((t + 1) / totalTicks, 1));

        // Tie: delayed start, fewer chips
        if (t >= Math.floor(totalTicks * 0.35) && tieTarget > 0) {
          const tp = (t - Math.floor(totalTicks * 0.35)) / (totalTicks * 0.65);
          addChipToZone(setTieZone, tieTarget, maxT, Math.min(tp, 1));
        }

        if (t < totalTicks) scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [phase, playerTarget, bankerTarget, tieTarget]);

  const has = playerZone.currentAmount > 0 || bankerZone.currentAmount > 0 || tieZone.currentAmount > 0;
  if (!has) return null;

  // Labels based on game type
  const labels = gameType === 'dragonTiger'
    ? { player: '龍', tie: '和', banker: '虎' }
    : { player: '閒', tie: '和', banker: '莊' };

  // Position classes based on compact mode
  // Compact: smaller chips, parent handles positioning (used by both Dragon Tiger and Baccarat)
  const positionClass = compact
    ? 'relative h-[40px] sm:h-[50px] flex gap-2'
    : 'relative h-[60px] sm:h-[72px] flex gap-2';

  return (
    <div className={positionClass}>
      <ChipZone label={labels.player} labelColor="text-blue-400" chips={playerZone.chips} amount={playerZone.currentAmount} compact={compact} />
      <ChipZone label={labels.tie} labelColor="text-green-400" chips={tieZone.chips} amount={tieZone.currentAmount} compact={compact} />
      <ChipZone label={labels.banker} labelColor="text-red-400" chips={bankerZone.chips} amount={bankerZone.currentAmount} compact={compact} />
    </div>
  );
}

export default memo(TableChipDisplay);
