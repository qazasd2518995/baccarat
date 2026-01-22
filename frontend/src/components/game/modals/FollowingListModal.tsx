import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Heart, User, Play, HeartOff, Loader2 } from 'lucide-react';
import { dealerApi } from '../../../services/api';

interface FollowingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToTable?: (tableId: string) => void;
}

interface FollowedDealer {
  id: string;
  dealerName: string;
  followedAt: string;
  // These could come from joining with tables data in the future
  tableId?: string;
  tableName?: string;
  isOnline?: boolean;
  followers?: number;
}

export default function FollowingListModal({ isOpen, onClose, onGoToTable }: FollowingListModalProps) {
  const { t } = useTranslation();
  const [followedDealers, setFollowedDealers] = useState<FollowedDealer[]>([]);
  const [loading, setLoading] = useState(false);
  const [unfollowingId, setUnfollowingId] = useState<string | null>(null);

  // Fetch following list when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFollowingList();
    }
  }, [isOpen]);

  const fetchFollowingList = async () => {
    setLoading(true);
    try {
      const res = await dealerApi.getFollowing();
      setFollowedDealers(res.data.following);
    } catch (err) {
      console.error('[FollowingList] Failed to fetch following list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (dealerName: string, id: string) => {
    setUnfollowingId(id);
    try {
      await dealerApi.unfollowDealer(dealerName);
      setFollowedDealers((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('[FollowingList] Failed to unfollow:', err);
    } finally {
      setUnfollowingId(null);
    }
  };

  const handleGoToTable = (tableId: string) => {
    if (onGoToTable) {
      onGoToTable(tableId);
    }
    onClose();
  };

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
          className="bg-[#1a2235] rounded-xl w-[480px] max-h-[80vh] overflow-hidden shadow-2xl border border-gray-700/50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-400" />
              <h2 className="text-xl font-bold text-white">{t('followingList')}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              /* Loading State */
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <Loader2 className="w-10 h-10 text-gray-400 animate-spin mb-4" />
                <p className="text-gray-400 text-center">{t('loading')}</p>
              </div>
            ) : followedDealers.length === 0 ? (
              /* Empty State */
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
                  <HeartOff className="w-10 h-10 text-gray-600" />
                </div>
                <p className="text-gray-400 text-center mb-2">{t('noFollowingDealers')}</p>
                <p className="text-gray-500 text-sm text-center">{t('followDealerHint')}</p>
              </div>
            ) : (
              /* Dealer List */
              <div className="p-4 space-y-3">
                {followedDealers.map((dealer, index) => (
                  <motion.div
                    key={dealer.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 bg-[#2a3548] rounded-xl hover:bg-[#323d52] transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                        <User className="w-7 h-7 text-white" />
                      </div>
                      {/* Online indicator - always show as online for now */}
                      <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#2a3548] bg-green-500" />
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{dealer.dealerName}</h3>
                      <p className="text-gray-500 text-xs">
                        {t('followedOn')} {new Date(dealer.followedAt).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {dealer.tableId && (
                        <button
                          onClick={() => handleGoToTable(dealer.tableId!)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm rounded-lg transition"
                        >
                          <Play className="w-4 h-4" />
                          {t('enter')}
                        </button>
                      )}
                      <button
                        onClick={() => handleUnfollow(dealer.dealerName, dealer.id)}
                        disabled={unfollowingId === dealer.id}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                        title={t('unfollow')}
                      >
                        {unfollowingId === dealer.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <HeartOff className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {followedDealers.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-700/50 bg-[#141922]">
              <p className="text-gray-500 text-sm text-center">
                {t('followingCount', { count: followedDealers.length })}
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
