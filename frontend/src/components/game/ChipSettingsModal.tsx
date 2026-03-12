import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ALL_CHIP_OPTIONS, useGameStore } from '../../store/gameStore';
import CasinoChip, { formatChipValue } from './CasinoChip';

interface ChipSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChipSettingsModal({ isOpen, onClose }: ChipSettingsModalProps) {
  const { t } = useTranslation();
  const { displayedChips, setDisplayedChips, customChips, addCustomChip, removeCustomChip } = useGameStore();
  const [selected, setSelected] = useState<number[]>([]);
  const [customInputs, setCustomInputs] = useState<string[]>(['', '', '', '']);
  const [localCustomChips, setLocalCustomChips] = useState<number[]>([]);

  // Reset selected to current displayedChips when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected([...displayedChips]);
      setLocalCustomChips([...customChips]);
      // Initialize custom inputs with existing custom chip values
      const inputs = customChips.map(v => v.toString());
      while (inputs.length < 4) inputs.push('');
      setCustomInputs(inputs);
    }
  }, [isOpen, displayedChips, customChips]);

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

  const handleCustomInputChange = (index: number, value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    const newInputs = [...customInputs];
    newInputs[index] = numericValue;
    setCustomInputs(newInputs);
  };

  const handleAddCustomChip = (index: number) => {
    const value = parseInt(customInputs[index]);
    if (isNaN(value) || value <= 0) return;

    // Check if value already exists
    const allValues = [...ALL_CHIP_OPTIONS.map(c => c.value), ...localCustomChips];
    if (allValues.includes(value)) return;

    if (localCustomChips.length >= 4) return;

    const newLocalCustomChips = [...localCustomChips, value];
    setLocalCustomChips(newLocalCustomChips);

    // Update input to show the value is set
    const newInputs = [...customInputs];
    newInputs[index] = value.toString();
    setCustomInputs(newInputs);
  };

  const handleRemoveCustomChip = (value: number) => {
    setLocalCustomChips(prev => prev.filter(v => v !== value));
    // Also remove from selected if present
    setSelected(prev => prev.filter(v => v !== value));
    // Clear the input
    const index = localCustomChips.indexOf(value);
    if (index >= 0) {
      const newInputs = [...customInputs];
      newInputs[index] = '';
      setCustomInputs(newInputs);
    }
  };

  const handleConfirm = () => {
    if (selected.length > 0 && selected.length <= 6) {
      // First update custom chips
      // Remove chips that are no longer in localCustomChips
      customChips.forEach(chip => {
        if (!localCustomChips.includes(chip)) {
          removeCustomChip(chip);
        }
      });
      // Add new custom chips
      localCustomChips.forEach(chip => {
        if (!customChips.includes(chip)) {
          addCustomChip(chip);
        }
      });

      // Then update displayed chips
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[420px] max-h-[90vh] overflow-y-auto bg-[#1a1f2e] rounded-xl shadow-2xl z-50"
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

            {/* Standard Chip grid */}
            <div className="p-3 sm:p-4 grid grid-cols-5 gap-2 sm:gap-3 justify-items-center">
              {ALL_CHIP_OPTIONS.map((chip) => {
                const isSelected = selected.includes(chip.value);
                const isDisabled = !isSelected && selected.length >= 6;

                return (
                  <div key={chip.value} className="relative flex items-center justify-center" style={{ width: 62, height: 62 }}>
                    {/* Green border circle behind chip */}
                    {isSelected && (
                      <div
                        className="absolute rounded-full border-[3px] border-green-400"
                        style={{ width: 60, height: 60 }}
                      />
                    )}
                    <motion.button
                      whileHover={!isDisabled ? { scale: 1.05 } : {}}
                      whileTap={!isDisabled ? { scale: 0.95 } : {}}
                      onClick={() => toggleChip(chip.value)}
                      disabled={isDisabled}
                      className={`
                        relative shadow-lg transition-all duration-200
                        ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      <CasinoChip size={52} value={chip.value} label={formatChipValue(chip.value)} />
                    </motion.button>

                    {/* Check indicator */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow z-10"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Custom Chips Section */}
            <div className="px-4 pb-4">
              <div className="text-gray-400 text-sm mb-3 border-t border-gray-700/50 pt-3">
                {t('customChips', '自定义筹码')}
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((index) => {
                  const customValue = localCustomChips[index];
                  const hasValue = customValue !== undefined;
                  const isSelected = hasValue && selected.includes(customValue);
                  const isDisabled = !isSelected && selected.length >= 6;

                  return (
                    <div key={index} className="flex flex-col items-center gap-1.5">
                      {hasValue ? (
                        // Show custom chip
                        <div className="relative flex items-center justify-center" style={{ width: 62, height: 62 }}>
                          {isSelected && (
                            <div
                              className="absolute rounded-full border-[3px] border-green-400"
                              style={{ width: 60, height: 60 }}
                            />
                          )}
                          <motion.button
                            whileHover={!isDisabled ? { scale: 1.05 } : {}}
                            whileTap={!isDisabled ? { scale: 0.95 } : {}}
                            onClick={() => toggleChip(customValue)}
                            disabled={isDisabled}
                            className={`
                              relative shadow-lg transition-all duration-200
                              ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                          >
                            <CasinoChip size={52} value={customValue} label={formatChipValue(customValue)} />
                          </motion.button>

                          {/* Check indicator */}
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shadow z-10"
                            >
                              <Check className="w-3 h-3 text-white" />
                            </motion.div>
                          )}

                          {/* Remove button */}
                          <button
                            onClick={() => handleRemoveCustomChip(customValue)}
                            className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow hover:bg-red-600 transition z-10"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      ) : (
                        // Show add button placeholder
                        <button
                          onClick={() => handleAddCustomChip(index)}
                          disabled={!customInputs[index] || localCustomChips.length >= 4}
                          className={`
                            w-[52px] h-[52px] rounded-full border-2 border-dashed
                            flex items-center justify-center transition-all
                            ${customInputs[index] ? 'border-green-500 hover:bg-green-500/20 cursor-pointer' : 'border-gray-600 cursor-default'}
                          `}
                        >
                          <Plus className={`w-6 h-6 ${customInputs[index] ? 'text-green-500' : 'text-gray-600'}`} />
                        </button>
                      )}

                      {/* Input field */}
                      <input
                        type="text"
                        inputMode="numeric"
                        value={hasValue ? customValue.toString() : customInputs[index]}
                        onChange={(e) => !hasValue && handleCustomInputChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !hasValue) {
                            handleAddCustomChip(index);
                          }
                        }}
                        disabled={hasValue}
                        placeholder={t('chipAmount', '金额')}
                        className={`
                          w-full px-2 py-1 text-center text-sm rounded
                          bg-gray-800 border border-gray-600
                          ${hasValue ? 'text-gray-400' : 'text-white'}
                          focus:outline-none focus:border-orange-500
                        `}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-700/50 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition"
              >
                {t('cancel') || '取消'}
              </button>
              <button
                onClick={handleConfirm}
                disabled={selected.length === 0}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg hover:from-orange-600 hover:to-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
