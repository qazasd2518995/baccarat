import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ALL_CHIP_OPTIONS, useGameStore } from '../../store/gameStore';

interface ChipSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatChipValue(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return k >= 1000 ? `${k / 1000}M` : `${k}K`;
  }
  return value.toLocaleString();
}

export default function ChipSettingsModal({ isOpen, onClose }: ChipSettingsModalProps) {
  const { t } = useTranslation();
  const { displayedChips, setDisplayedChips } = useGameStore();
  const [selected, setSelected] = useState<number[]>([]);

  // Reset selected to current displayedChips when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected([...displayedChips]);
    }
  }, [isOpen, displayedChips]);

  const toggleChip = (value: number) => {
    setSelected(prev => {
      if (prev.includes(value)) {
        // Don't allow deselecting if only 1 chip is selected
        if (prev.length === 1) return prev;
        return prev.filter(v => v !== value);
      } else {
        // Don't allow selecting more than 6 chips
        if (prev.length >= 6) return prev;
        return [...prev, value].sort((a, b) => a - b);
      }
    });
  };

  const handleConfirm = () => {
    if (selected.length > 0 && selected.length <= 6) {
      setDisplayedChips(selected);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] bg-[#1a1f2e] rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
              <h3 className="text-white font-bold text-lg">
                {t('selectChips') || '选择显示的筹码'}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chip count indicator */}
            <div className="px-4 pt-3 pb-1">
              <span className="text-gray-400 text-sm">
                {t('selectedCount') || '已选择'}: {selected.length}/6
              </span>
            </div>

            {/* Chip grid */}
            <div className="p-4 grid grid-cols-5 gap-3">
              {ALL_CHIP_OPTIONS.map((chip) => {
                const isSelected = selected.includes(chip.value);
                const isDisabled = !isSelected && selected.length >= 6;

                return (
                  <motion.button
                    key={chip.value}
                    whileHover={!isDisabled ? { scale: 1.05 } : {}}
                    whileTap={!isDisabled ? { scale: 0.95 } : {}}
                    onClick={() => toggleChip(chip.value)}
                    disabled={isDisabled}
                    className={`
                      relative w-14 h-14 rounded-full flex items-center justify-center font-bold text-xs
                      bg-gradient-to-br ${chip.color}
                      border-3 ${isSelected ? 'border-white' : 'border-white/20'}
                      shadow-lg transition-all duration-200
                      ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {/* Inner circle decoration */}
                    <div className="absolute inset-1.5 rounded-full border border-white/20" />

                    {/* Chip value */}
                    <span className="relative z-10 text-white font-black drop-shadow-lg text-[10px]">
                      {formatChipValue(chip.value)}
                    </span>

                    {/* Glossy effect */}
                    <div
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
                      }}
                    />

                    {/* Check indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700/50">
              <button
                onClick={handleConfirm}
                disabled={selected.length === 0}
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('confirm') || '确定'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
