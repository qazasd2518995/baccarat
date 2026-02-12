import { memo, useMemo } from 'react';
import CasinoChip, { CHIP_COLORS } from './CasinoChip';
import { formatAmount } from '../../utils/format';

interface TableChipDisplayProps {
  fakeBets: Record<string, number>;
}

// Chip values to visually represent, from large to small
const CHIP_VALUES = [100000, 50000, 10000, 5000, 1000, 500, 100, 50, 10];

// Convert a total amount into a visual chip stack (max 6 chips)
function amountToChips(amount: number): number[] {
  if (amount <= 0) return [];
  const chips: number[] = [];
  let remaining = amount;
  for (const val of CHIP_VALUES) {
    while (remaining >= val && chips.length < 6) {
      chips.push(val);
      remaining -= val;
    }
  }
  return chips.slice(0, 6);
}

// Seeded random for consistent scatter positions
function seededRandom(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

interface ChipZoneProps {
  label: string;
  labelColor: string;
  amount: number;
  seed: number;
}

function ChipZone({ label, labelColor, amount, seed }: ChipZoneProps) {
  const chips = useMemo(() => amountToChips(amount), [amount]);

  if (amount <= 0) return null;

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Stacked chips */}
      <div className="relative" style={{ width: 40, height: 40 }}>
        {chips.map((val, i) => {
          const r = seededRandom(seed + i);
          const offsetX = (r - 0.5) * 8;
          const offsetY = -i * 3;
          const rotation = (seededRandom(seed + i + 100) - 0.5) * 20;
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: `calc(50% - 14px + ${offsetX}px)`,
                bottom: 0 - offsetY,
                zIndex: i,
                transform: `rotate(${rotation}deg)`,
              }}
            >
              <CasinoChip size={28} value={val} />
            </div>
          );
        })}
      </div>
      {/* Amount label */}
      <div className="text-center">
        <div className={`text-[10px] font-bold ${labelColor}`}>{label}</div>
        <div className="text-[10px] text-white/60 font-mono">{formatAmount(amount)}</div>
      </div>
    </div>
  );
}

function TableChipDisplay({ fakeBets }: TableChipDisplayProps) {
  const playerTotal = (fakeBets.player || 0) + (fakeBets.player_pair || 0) + (fakeBets.player_bonus || 0);
  const bankerTotal = (fakeBets.banker || 0) + (fakeBets.banker_pair || 0) + (fakeBets.banker_bonus || 0) + (fakeBets.super_six || 0);
  const tieTotal = (fakeBets.tie || 0);

  if (playerTotal === 0 && bankerTotal === 0 && tieTotal === 0) return null;

  return (
    <div className="absolute bottom-2 left-0 right-0 z-10 flex items-end justify-center gap-6 sm:gap-12 pointer-events-none">
      <ChipZone label="閒" labelColor="text-blue-400" amount={playerTotal} seed={1} />
      <ChipZone label="和" labelColor="text-green-400" amount={tieTotal} seed={20} />
      <ChipZone label="莊" labelColor="text-red-400" amount={bankerTotal} seed={40} />
    </div>
  );
}

export default memo(TableChipDisplay);
