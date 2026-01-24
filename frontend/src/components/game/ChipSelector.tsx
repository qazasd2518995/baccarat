import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { useGameStore, ALL_CHIP_OPTIONS } from '../../store/gameStore';
import ChipSettingsModal from './ChipSettingsModal';

function formatChipValue(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return k >= 1000 ? `${k / 1000}M` : `${k}K`;
  }
  return value.toString();
}

interface ChipSelectorProps {
  showSettings?: boolean;
}

export default function ChipSelector({ showSettings = true }: ChipSelectorProps) {
  const { selectedChip, setSelectedChip, balance, displayedChips } = useGameStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Get chip colors from ALL_CHIP_OPTIONS
  const getChipColor = (value: number) => {
    const chip = ALL_CHIP_OPTIONS.find(c => c.value === value);
    return chip?.color || 'from-gray-500 to-gray-700';
  };

  return (
    <>
      <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/30 backdrop-blur-sm">
        {displayedChips.map((value) => {
          const isSelected = selectedChip === value;
          const isDisabled = value > balance;
          const color = getChipColor(value);

          return (
            <motion.button
              key={value}
              whileHover={!isDisabled ? { scale: 1.05 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              onClick={() => !isDisabled && setSelectedChip(value)}
              disabled={isDisabled}
              className={`
                relative w-14 h-14 rounded-full flex items-center justify-center font-bold text-xs
                bg-gradient-to-br ${color}
                border-4 border-white/30
                shadow-lg transition-all duration-200
                ${isSelected ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-slate-900' : ''}
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Inner circle decoration */}
              <div className="absolute inset-2 rounded-full border-2 border-white/20" />

              {/* Chip value */}
              <span className="relative z-10 text-white font-black drop-shadow-lg text-[10px]">
                {formatChipValue(value)}
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

        {/* Settings button */}
        {showSettings && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSettingsOpen(true)}
            className="relative w-14 h-14 rounded-full flex items-center justify-center font-bold text-xs bg-gradient-to-br from-gray-500 to-gray-700 border-4 border-white/30 shadow-lg transition-all duration-200 cursor-pointer"
          >
            {/* Inner circle decoration */}
            <div className="absolute inset-2 rounded-full border-2 border-white/20" />

            {/* Icon */}
            <Coins className="relative z-10 w-6 h-6 text-white drop-shadow-lg" />

            {/* Glossy effect */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
              }}
            />

            {/* Edge notches */}
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
        )}
      </div>

      <ChipSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
