import { useState } from 'react';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import CasinoChip, { formatChipValue } from './CasinoChip';
import ChipSettingsModal from './ChipSettingsModal';

interface ChipSelectorProps {
  showSettings?: boolean;
}

export default function ChipSelector({ showSettings = true }: ChipSelectorProps) {
  const { selectedChip, setSelectedChip, balance, displayedChips } = useGameStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/30 backdrop-blur-sm">
        {displayedChips.map((value) => {
          const isSelected = selectedChip === value;
          const isDisabled = value > balance;

          return (
            <motion.button
              key={value}
              whileHover={!isDisabled ? { scale: 1.05 } : {}}
              whileTap={!isDisabled ? { scale: 0.95 } : {}}
              onClick={() => !isDisabled && setSelectedChip(value)}
              disabled={isDisabled}
              className={`
                relative rounded-full
                shadow-lg transition-all duration-200
                ${isSelected ? 'ring-2 ring-green-400 ring-offset-1 ring-offset-slate-900' : ''}
                ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <CasinoChip size={56} value={value} label={formatChipValue(value)} />
            </motion.button>
          );
        })}

        {/* Settings button */}
        {showSettings && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsSettingsOpen(true)}
            className="relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-br from-gray-500 to-gray-700 border-2 border-white/20 shadow-lg transition-all duration-200 cursor-pointer"
          >
            <Coins className="relative z-10 w-6 h-6 text-white drop-shadow-lg" />
          </motion.button>
        )}
      </div>

      <ChipSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
}
