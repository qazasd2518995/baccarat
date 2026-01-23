import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, TrendingUp } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';

interface ResultsProportionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResultsProportionModal({ isOpen, onClose }: ResultsProportionModalProps) {
  const { t } = useTranslation();
  const { roadmapData } = useGameStore();

  // Calculate statistics from roadmapData
  const bankerWins = roadmapData.filter(r => r.result === 'banker').length;
  const playerWins = roadmapData.filter(r => r.result === 'player').length;
  const ties = roadmapData.filter(r => r.result === 'tie').length;
  const total = roadmapData.length;

  // Calculate percentages
  const bankerPercent = total > 0 ? Math.round((bankerWins / total) * 100) : 0;
  const playerPercent = total > 0 ? Math.round((playerWins / total) * 100) : 0;
  const tiePercent = total > 0 ? Math.round((ties / total) * 100) : 0;

  // Calculate pairs
  const playerPairCount = roadmapData.filter(r => r.playerPair).length;
  const bankerPairCount = roadmapData.filter(r => r.bankerPair).length;
  const playerPairPercent = total > 0 ? Math.round((playerPairCount / total) * 100) : 0;
  const bankerPairPercent = total > 0 ? Math.round((bankerPairCount / total) * 100) : 0;

  // Calculate big/small
  const smallCount = roadmapData.filter(r => r.totalCards === 4).length;
  const bigCount = roadmapData.filter(r => r.totalCards === 5 || r.totalCards === 6).length;
  const smallPercent = total > 0 ? Math.round((smallCount / total) * 100) : 0;
  const bigPercent = total > 0 ? Math.round((bigCount / total) * 100) : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#1a2235] rounded-xl w-[400px] overflow-hidden shadow-2xl border border-gray-700/50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gradient-to-r from-orange-500/20 to-transparent">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-white">{t('resultsProportion')}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Total Rounds */}
            <div className="text-center">
              <span className="text-gray-400 text-sm">總局數</span>
              <div className="text-3xl font-bold text-white mt-1">{total}</div>
            </div>

            {/* Main Results */}
            <div className="space-y-4">
              <h3 className="text-sm text-gray-400 font-medium">主要結果</h3>

              {/* Banker */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-red-400 font-medium">{t('banker')}</span>
                  <span className="text-white">{bankerWins} 局 ({bankerPercent}%)</span>
                </div>
                <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${bankerPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                  />
                </div>
              </div>

              {/* Player */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-blue-400 font-medium">{t('player')}</span>
                  <span className="text-white">{playerWins} 局 ({playerPercent}%)</span>
                </div>
                <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${playerPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                  />
                </div>
              </div>

              {/* Tie */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-400 font-medium">{t('tie')}</span>
                  <span className="text-white">{ties} 局 ({tiePercent}%)</span>
                </div>
                <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${tiePercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
                    className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
                  />
                </div>
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700/50">
              {/* Pairs */}
              <div className="space-y-3">
                <h3 className="text-sm text-gray-400 font-medium">對子</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-400">{t('playerPair')}</span>
                  <span className="text-white">{playerPairCount} ({playerPairPercent}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-red-400">{t('bankerPair')}</span>
                  <span className="text-white">{bankerPairCount} ({bankerPairPercent}%)</span>
                </div>
              </div>

              {/* Big/Small */}
              <div className="space-y-3">
                <h3 className="text-sm text-gray-400 font-medium">大小</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-400">小 (4張)</span>
                  <span className="text-white">{smallCount} ({smallPercent}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-400">大 (5-6張)</span>
                  <span className="text-white">{bigCount} ({bigPercent}%)</span>
                </div>
              </div>
            </div>

            {/* Info */}
            {total === 0 && (
              <div className="text-center text-gray-500 text-sm py-4">
                暫無數據，等待開牌後顯示統計
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
