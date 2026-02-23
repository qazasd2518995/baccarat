import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CasinoChip from './CasinoChip';

// ============================================================
// Flying chip data type
// ============================================================

interface FlyingChipData {
  id: number;
  value: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// Singleton counter for unique IDs
let flyIdCounter = 0;

// ============================================================
// Flying chip overlay - add to game page root
// ============================================================

interface FlyingChipOverlayProps {
  chips: FlyingChipData[];
  chipSize?: number;
}

export const FlyingChipOverlay = memo(function FlyingChipOverlay({
  chips,
  chipSize = 32
}: FlyingChipOverlayProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      <AnimatePresence>
        {chips.map((chip) => (
          <motion.div
            key={chip.id}
            initial={{
              left: chip.startX,
              top: chip.startY,
              scale: 1,
              opacity: 1,
              rotate: 0,
            }}
            animate={{
              left: chip.endX,
              top: chip.endY,
              scale: 0.7,
              opacity: 1,
              rotate: 180,
            }}
            exit={{
              opacity: 0,
              scale: 0.3,
            }}
            transition={{
              duration: 0.4,
              ease: [0.2, 0.8, 0.3, 1],
            }}
            className="absolute"
            style={{ marginLeft: -chipSize / 2, marginTop: -chipSize / 2 }}
          >
            <CasinoChip size={chipSize} value={chip.value} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

// ============================================================
// Hook for managing flying chip animations
// ============================================================

export function useFlyingChips() {
  const [flyingChips, setFlyingChips] = useState<FlyingChipData[]>([]);

  const addFlyingChip = useCallback((
    value: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => {
    const id = ++flyIdCounter;
    setFlyingChips(prev => [...prev, { id, value, startX, startY, endX, endY }]);

    // Remove after animation completes
    setTimeout(() => {
      setFlyingChips(prev => prev.filter(c => c.id !== id));
    }, 450);

    return id;
  }, []);

  const clearFlyingChips = useCallback(() => {
    setFlyingChips([]);
  }, []);

  return {
    flyingChips,
    addFlyingChip,
    clearFlyingChips,
  };
}

// ============================================================
// Chip stack display component (no animations, just display)
// ============================================================

interface ChipStackProps {
  amount: number;
  chipSize?: number;
  maxChips?: number;
  stackOffset?: number;
  className?: string;
  chipValue?: number; // Optional: force all chips to display as this denomination color
}

export const ChipStack = memo(function ChipStack({
  amount,
  chipSize = 24,
  maxChips = 4,
  stackOffset = 2,
  className = '',
  chipValue,
}: ChipStackProps) {
  if (amount <= 0) return null;

  // Calculate number of chips to display based on bet count
  const chipCount = Math.min(Math.ceil(amount / (chipValue || 500)), maxChips);

  // If chipValue is specified, use that for all chips
  // Otherwise, calculate based on denominations
  let chips: number[] = [];

  if (chipValue) {
    // Use the specified chip value for all chips
    chips = Array(chipCount).fill(chipValue);
  } else {
    // Calculate chips based on denominations
    const denominations = [100000, 50000, 10000, 5000, 1000, 500, 100];
    let remaining = amount;

    for (const denom of denominations) {
      while (remaining >= denom && chips.length < chipCount) {
        chips.push(denom);
        remaining -= denom;
      }
    }

    while (chips.length < chipCount) {
      chips.push(100);
    }
  }

  return (
    <div className={`relative ${className}`} style={{ width: chipSize, height: chipSize + (chips.length - 1) * stackOffset }}>
      <AnimatePresence>
        {chips.map((value, i) => (
          <motion.div
            key={`chip-${i}-${value}`}
            initial={{ scale: 0, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0, y: -10, opacity: 0 }}
            transition={{ delay: i * 0.05, duration: 0.2 }}
            className="absolute left-0"
            style={{ bottom: i * stackOffset, zIndex: i }}
          >
            <CasinoChip size={chipSize} value={value} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});

export default ChipStack;
