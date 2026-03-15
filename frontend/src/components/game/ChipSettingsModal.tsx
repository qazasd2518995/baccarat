import { useState, useEffect, useRef } from 'react';
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
  const [localCustomChips, setLocalCustomChips] = useState<number[]>([]);

  // Add custom chip flow
  const [isAddingChip, setIsAddingChip] = useState(false);
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState('');
  const addInputRef = useRef<HTMLInputElement>(null);

  // Reset selected to current displayedChips when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected([...displayedChips]);
      setLocalCustomChips([...customChips]);
      setIsAddingChip(false);
      setAddInput('');
      setAddError('');
    }
  }, [isOpen, displayedChips, customChips]);

  // Auto-focus input when adding
  useEffect(() => {
    if (isAddingChip) {
      setTimeout(() => addInputRef.current?.focus(), 100);
    }
  }, [isAddingChip]);

  const toggleChip = (value: number) => {
    setSelected(prev => {
      if (prev.includes(value)) {
        if (prev.length === 1) return prev;
        return prev.filter(v => v !== value);
      } else {
        if (prev.length >= 6) return prev;
        return [...prev, value].sort((a, b) => a - b);
      }
    });
  };

  const handleAddCustomChip = () => {
    const value = parseInt(addInput);
    if (isNaN(value) || value <= 0) {
      setAddError('請輸入有效金額');
      return;
    }

    // Check duplicates against standard chips
    if (ALL_CHIP_OPTIONS.some(c => c.value === value)) {
      setAddError(`${formatChipValue(value)} 已存在於標準籌碼中`);
      return;
    }

    // Check duplicates against existing custom chips
    if (localCustomChips.includes(value)) {
      setAddError(`${formatChipValue(value)} 已存在於自定義籌碼中`);
      return;
    }

    if (localCustomChips.length >= 4) {
      setAddError('最多只能新增 4 個自定義籌碼');
      return;
    }

    const newLocalCustomChips = [...localCustomChips, value];
    setLocalCustomChips(newLocalCustomChips);

    // Auto-select the new chip if under 6
    if (selected.length < 6) {
      setSelected(prev => [...prev, value].sort((a, b) => a - b));
    }

    // Reset add flow
    setIsAddingChip(false);
    setAddInput('');
    setAddError('');
  };

  const handleRemoveCustomChip = (value: number) => {
    setLocalCustomChips(prev => prev.filter(v => v !== value));
    setSelected(prev => prev.filter(v => v !== value));
  };

  const handleConfirm = () => {
    if (selected.length > 0 && selected.length <= 6) {
      customChips.forEach(chip => {
        if (!localCustomChips.includes(chip)) {
          removeCustomChip(chip);
        }
      });
      localCustomChips.forEach(chip => {
        if (!customChips.includes(chip)) {
          addCustomChip(chip);
        }
      });
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
                {t('selectChips') || '選擇顯示的籌碼'}
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
                已選擇: <span className={selected.length >= 6 ? 'text-orange-400' : 'text-white'}>{selected.length}</span>/6
              </span>
            </div>

            {/* Standard Chip grid */}
            <div className="p-3 sm:p-4 grid grid-cols-5 gap-2 sm:gap-3 justify-items-center">
              {ALL_CHIP_OPTIONS.map((chip) => {
                const isSelected = selected.includes(chip.value);
                const isDisabled = !isSelected && selected.length >= 6;

                return (
                  <div key={chip.value} className="relative flex items-center justify-center" style={{ width: 62, height: 62 }}>
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
              <div className="flex items-center justify-between border-t border-gray-700/50 pt-3 mb-3">
                <span className="text-gray-400 text-sm">
                  自定義籌碼 ({localCustomChips.length}/4)
                </span>
              </div>

              {/* Existing custom chips */}
              {localCustomChips.length > 0 && (
                <div className="flex flex-wrap gap-3 mb-3">
                  {localCustomChips.map((chipValue) => {
                    const isSelected = selected.includes(chipValue);
                    const isDisabled = !isSelected && selected.length >= 6;

                    return (
                      <div key={chipValue} className="relative flex items-center justify-center" style={{ width: 62, height: 62 }}>
                        {isSelected && (
                          <div
                            className="absolute rounded-full border-[3px] border-green-400"
                            style={{ width: 60, height: 60 }}
                          />
                        )}
                        <motion.button
                          whileHover={!isDisabled ? { scale: 1.05 } : {}}
                          whileTap={!isDisabled ? { scale: 0.95 } : {}}
                          onClick={() => toggleChip(chipValue)}
                          disabled={isDisabled}
                          className={`
                            relative shadow-lg transition-all duration-200
                            ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <CasinoChip size={52} value={chipValue} label={formatChipValue(chipValue)} />
                        </motion.button>

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
                          onClick={() => handleRemoveCustomChip(chipValue)}
                          className="absolute -top-0.5 -left-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shadow hover:bg-red-600 transition z-10"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add custom chip */}
              {localCustomChips.length < 4 && (
                <AnimatePresence mode="wait">
                  {!isAddingChip ? (
                    // Step 1: Show add button
                    <motion.button
                      key="add-btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => { setIsAddingChip(true); setAddError(''); }}
                      className="w-full py-2.5 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center gap-2 text-gray-400 hover:border-green-500 hover:text-green-400 transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">新增自定義籌碼</span>
                    </motion.button>
                  ) : (
                    // Step 2: Show input field
                    <motion.div
                      key="add-input"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-2"
                    >
                      <div className="flex gap-2">
                        <input
                          ref={addInputRef}
                          type="text"
                          inputMode="numeric"
                          value={addInput}
                          onChange={(e) => {
                            setAddInput(e.target.value.replace(/[^0-9]/g, ''));
                            setAddError('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCustomChip();
                            if (e.key === 'Escape') { setIsAddingChip(false); setAddInput(''); setAddError(''); }
                          }}
                          placeholder="輸入籌碼金額"
                          className="flex-1 px-3 py-2 text-sm rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:border-orange-500 placeholder-gray-500"
                        />
                        <button
                          onClick={handleAddCustomChip}
                          disabled={!addInput}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          確認
                        </button>
                        <button
                          onClick={() => { setIsAddingChip(false); setAddInput(''); setAddError(''); }}
                          className="px-3 py-2 bg-gray-700 text-gray-300 text-sm rounded-lg hover:bg-gray-600 transition"
                        >
                          取消
                        </button>
                      </div>
                      {/* Error message */}
                      {addError && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-400 text-xs px-1"
                        >
                          {addError}
                        </motion.p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {localCustomChips.length >= 4 && (
                <p className="text-gray-500 text-xs text-center">已達自定義籌碼上限 (4/4)</p>
              )}
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
                {t('confirm') || '確定'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
