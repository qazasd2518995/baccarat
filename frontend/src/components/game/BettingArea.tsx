import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import CasinoChip from './CasinoChip';
import { formatAmount } from '../../utils/format';
import type { BetType } from '../../types';

interface BetSpotConfig {
  type: BetType;
  label: string;
  payout: string;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
}

const BET_SPOTS: BetSpotConfig[] = [
  {
    type: 'player_pair',
    label: 'playerPair',
    payout: '1:11',
    color: 'text-blue-300',
    bgColor: 'from-blue-900/40 to-blue-950/60',
    borderColor: 'border-blue-500/40',
    glowColor: 'shadow-blue-500/30',
  },
  {
    type: 'player',
    label: 'player',
    payout: '1:1',
    color: 'text-blue-400',
    bgColor: 'from-blue-800/50 to-blue-950/70',
    borderColor: 'border-blue-400/50',
    glowColor: 'shadow-blue-500/40',
  },
  {
    type: 'tie',
    label: 'tie',
    payout: '1:8',
    color: 'text-green-400',
    bgColor: 'from-green-800/50 to-green-950/70',
    borderColor: 'border-green-400/50',
    glowColor: 'shadow-green-500/40',
  },
  {
    type: 'banker',
    label: 'banker',
    payout: '1:0.95',
    color: 'text-red-400',
    bgColor: 'from-red-800/50 to-red-950/70',
    borderColor: 'border-red-400/50',
    glowColor: 'shadow-red-500/40',
  },
  {
    type: 'banker_pair',
    label: 'bankerPair',
    payout: '1:11',
    color: 'text-red-300',
    bgColor: 'from-red-900/40 to-red-950/60',
    borderColor: 'border-red-500/40',
    glowColor: 'shadow-red-500/30',
  },
  {
    type: 'super_six',
    label: 'superSix',
    payout: '1:12',
    color: 'text-amber-400',
    bgColor: 'from-amber-800/50 to-amber-950/70',
    borderColor: 'border-amber-400/50',
    glowColor: 'shadow-amber-500/40',
  },
  {
    type: 'player_bonus',
    label: 'playerBonus',
    payout: '1:1~30',
    color: 'text-blue-300',
    bgColor: 'from-blue-800/40 to-blue-950/60',
    borderColor: 'border-blue-400/40',
    glowColor: 'shadow-blue-400/30',
  },
  {
    type: 'banker_bonus',
    label: 'bankerBonus',
    payout: '1:1~30',
    color: 'text-red-300',
    bgColor: 'from-red-800/40 to-red-950/60',
    borderColor: 'border-red-400/40',
    glowColor: 'shadow-red-400/30',
  },
  {
    type: 'big',
    label: 'big',
    payout: '1:0.54',
    color: 'text-purple-400',
    bgColor: 'from-purple-800/50 to-purple-950/70',
    borderColor: 'border-purple-400/50',
    glowColor: 'shadow-purple-500/40',
  },
  {
    type: 'small',
    label: 'small',
    payout: '1:1.5',
    color: 'text-cyan-400',
    bgColor: 'from-cyan-800/50 to-cyan-950/70',
    borderColor: 'border-cyan-400/50',
    glowColor: 'shadow-cyan-500/40',
  },
];

interface BettingAreaProps {
  disabled?: boolean;
}

interface FlyingChip {
  id: number;
  betType: BetType;
  value: number;
}

let flyIdCounter = 0;

export default function BettingArea({ disabled }: BettingAreaProps) {
  const { t } = useTranslation();
  const { pendingBets, confirmedBets, addPendingBet, selectedChip, fakeBets } = useGameStore();
  const [flyingChips, setFlyingChips] = useState<FlyingChip[]>([]);

  const getBetAmount = (type: BetType) => {
    const pending = pendingBets.find((b) => b.type === type)?.amount || 0;
    const confirmed = confirmedBets.find((b) => b.type === type)?.amount || 0;
    return pending + confirmed;
  };

  const handleBet = useCallback((type: BetType) => {
    if (disabled) return;
    addPendingBet(type);
    const id = ++flyIdCounter;
    setFlyingChips(prev => [...prev, { id, betType: type, value: selectedChip }]);
    setTimeout(() => {
      setFlyingChips(prev => prev.filter(c => c.id !== id));
    }, 500);
  }, [disabled, addPendingBet, selectedChip]);

  return (
    <div className="px-4 py-4">
      <div className="flex items-stretch justify-center gap-2 flex-wrap">
        {BET_SPOTS.map((spot, index) => {
          const betAmount = getBetAmount(spot.type);
          const hasBet = betAmount > 0;
          const isMainBet = spot.type === 'player' || spot.type === 'banker' || spot.type === 'tie';

          const fakeBetAmount = fakeBets[spot.type] || 0;

          return (
            <motion.button
              key={spot.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
              whileTap={!disabled ? { scale: 0.98 } : {}}
              onClick={() => handleBet(spot.type)}
              disabled={disabled}
              className={`
                relative overflow-hidden rounded-2xl
                ${isMainBet ? 'w-40 h-32' : 'w-28 h-28'}
                bg-gradient-to-br ${spot.bgColor}
                border-2 ${hasBet ? spot.borderColor.replace('/40', '') : spot.borderColor}
                ${hasBet ? `shadow-xl ${spot.glowColor}` : 'shadow-lg'}
                transition-all duration-300
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-xl'}
              `}
            >
              {/* Decorative pattern */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 50%, white 1px, transparent 1px)`,
                  backgroundSize: '10px 10px',
                }}
              />

              {/* Fake bet chips decorations */}
              {fakeBetAmount > 0 && (
                <div className="absolute top-1 right-1 z-10 flex flex-col items-center">
                  <div className="relative" style={{ width: 20, height: 20 }}>
                    {[...Array(Math.min(3, Math.ceil(fakeBetAmount / 10_000_000)))].map((_, i) => (
                      <div
                        key={i}
                        className="absolute left-0"
                        style={{ bottom: i * 2, zIndex: 10 - i, opacity: 0.6 }}
                      >
                        <CasinoChip size={20} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-2">
                {/* Label */}
                <motion.div
                  className={`text-lg font-black tracking-wider ${spot.color}`}
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {t(spot.label)}
                </motion.div>

                {/* Payout */}
                <div className="text-xs text-slate-400 mt-1">{spot.payout}</div>

                {/* Fake bet amount */}
                {fakeBetAmount > 0 && (
                  <div className="text-[10px] text-white/50 mt-0.5">{formatAmount(fakeBetAmount)}</div>
                )}

                {/* Bet Amount Display */}
                <AnimatePresence>
                  {hasBet && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="mt-2 px-4 py-1 rounded-full bg-black/40 border border-white/20"
                    >
                      <span className="text-amber-400 font-bold">{betAmount.toLocaleString()}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Stacked Casino Chips */}
                <AnimatePresence>
                  {hasBet && (
                    <motion.div
                      initial={{ scale: 0, y: 20 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0, y: 20 }}
                      className="absolute -bottom-1 left-1/2 transform -translate-x-1/2"
                    >
                      <div className="relative" style={{ width: 28, height: 28 }}>
                        {[...Array(Math.min(3, Math.ceil(betAmount / 500)))].map((_, i) => (
                          <div
                            key={i}
                            className="absolute left-0"
                            style={{ bottom: i * 3, zIndex: 10 - i }}
                          >
                            <CasinoChip size={28} value={selectedChip} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Flying chip animation */}
                <AnimatePresence>
                  {flyingChips
                    .filter(c => c.betType === spot.type)
                    .map(chip => (
                      <motion.div
                        key={chip.id}
                        initial={{ opacity: 1, y: 60, scale: 0.5, rotate: 0 }}
                        animate={{ opacity: 1, y: 0, scale: 0.8, rotate: 180 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="absolute z-20 pointer-events-none"
                      >
                        <CasinoChip size={28} value={chip.value} />
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>

              {/* Hover Indicator */}
              {!disabled && (
                <motion.div
                  className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 transition-opacity"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
