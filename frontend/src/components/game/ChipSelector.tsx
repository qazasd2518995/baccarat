import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

const CHIPS = [
  { value: 10, color: 'from-slate-400 to-slate-600', borderColor: 'border-slate-300' },
  { value: 50, color: 'from-green-500 to-green-700', borderColor: 'border-green-400' },
  { value: 100, color: 'from-red-500 to-red-700', borderColor: 'border-red-400' },
  { value: 500, color: 'from-purple-500 to-purple-700', borderColor: 'border-purple-400' },
  { value: 1000, color: 'from-amber-500 to-amber-700', borderColor: 'border-amber-400' },
  { value: 5000, color: 'from-cyan-500 to-cyan-700', borderColor: 'border-cyan-400' },
  { value: 10000, color: 'from-fuchsia-500 to-fuchsia-700', borderColor: 'border-fuchsia-400' },
];

function formatChipValue(value: number): string {
  if (value >= 1000) {
    return `${value / 1000}K`;
  }
  return value.toString();
}

export default function ChipSelector() {
  const { selectedChip, setSelectedChip, balance } = useGameStore();

  return (
    <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/30 backdrop-blur-sm">
      {CHIPS.map((chip) => {
        const isSelected = selectedChip === chip.value;
        const isDisabled = chip.value > balance;

        return (
          <motion.button
            key={chip.value}
            whileHover={!isDisabled ? { scale: 1.1, y: -4 } : {}}
            whileTap={!isDisabled ? { scale: 0.95 } : {}}
            onClick={() => !isDisabled && setSelectedChip(chip.value)}
            disabled={isDisabled}
            className={`
              relative w-14 h-14 rounded-full flex items-center justify-center font-bold text-xs
              bg-gradient-to-br ${chip.color}
              border-4 ${chip.borderColor}
              shadow-lg
              transition-all duration-200
              ${isSelected ? 'ring-4 ring-white/50 ring-offset-2 ring-offset-slate-900 scale-110' : ''}
              ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {/* Inner circle decoration */}
            <div className="absolute inset-2 rounded-full border-2 border-white/20" />

            {/* Chip value */}
            <span className="relative z-10 text-white font-black drop-shadow-lg">
              {formatChipValue(chip.value)}
            </span>

            {/* Glossy effect */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
              }}
            />

            {/* Edge notches (casino chip style) */}
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-2 bg-white/30 rounded-sm"
                style={{
                  transform: `rotate(${i * 45}deg) translateY(-24px)`,
                }}
              />
            ))}
          </motion.button>
        );
      })}
    </div>
  );
}
