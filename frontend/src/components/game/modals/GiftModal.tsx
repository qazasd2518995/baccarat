import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Gift, Heart, Star, Crown, Diamond, Flower2, Sparkles, Gem, Trophy } from 'lucide-react';
import { giftApi } from '../../../services/api';
import { useGameStore } from '../../../store/gameStore';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealerName?: string;
  onSendGift?: (giftId: string, quantity: number) => void;
  balance?: number;
}

interface GiftItem {
  id: string;
  name: string;
  nameEn: string;
  price: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const GIFT_ITEMS: GiftItem[] = [
  {
    id: 'rose',
    name: '玫瑰',
    nameEn: 'Rose',
    price: 10,
    icon: <Flower2 className="w-8 h-8" />,
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/20',
  },
  {
    id: 'heart',
    name: '愛心',
    nameEn: 'Heart',
    price: 20,
    icon: <Heart className="w-8 h-8" />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  {
    id: 'star',
    name: '星星',
    nameEn: 'Star',
    price: 50,
    icon: <Star className="w-8 h-8" />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  {
    id: 'sparkle',
    name: '閃耀',
    nameEn: 'Sparkle',
    price: 100,
    icon: <Sparkles className="w-8 h-8" />,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  {
    id: 'gem',
    name: '寶石',
    nameEn: 'Gem',
    price: 200,
    icon: <Gem className="w-8 h-8" />,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
  },
  {
    id: 'diamond',
    name: '鑽石',
    nameEn: 'Diamond',
    price: 500,
    icon: <Diamond className="w-8 h-8" />,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  {
    id: 'crown',
    name: '皇冠',
    nameEn: 'Crown',
    price: 1000,
    icon: <Crown className="w-8 h-8" />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  {
    id: 'trophy',
    name: '獎盃',
    nameEn: 'Trophy',
    price: 5000,
    icon: <Trophy className="w-8 h-8" />,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
];

const QUANTITY_OPTIONS = [1, 5, 10, 50, 99];

export default function GiftModal({
  isOpen,
  onClose,
  dealerName = '荷官',
  onSendGift,
  balance: propBalance,
}: GiftModalProps) {
  const { t, i18n } = useTranslation();
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sending, setSending] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  // Get balance from store if not provided as prop
  const storeBalance = useGameStore((state) => state.balance);
  const setBalance = useGameStore((state) => state.setBalance);
  const balance = propBalance ?? storeBalance;

  const totalPrice = selectedGift ? selectedGift.price * quantity : 0;
  const canAfford = totalPrice <= balance;

  const handleSendGift = async () => {
    if (!selectedGift || !canAfford || sending) return;

    setSending(true);
    setError(null);

    try {
      const res = await giftApi.sendGift({
        giftType: selectedGift.id,
        dealerName,
        quantity,
      });

      // Update balance in store
      if (res.data.newBalance !== undefined) {
        setBalance(res.data.newBalance);
      }

      // Call callback if provided
      if (onSendGift) {
        onSendGift(selectedGift.id, quantity);
      }

      onClose();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message :
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to send gift';
      setError(errorMsg);
    } finally {
      setSending(false);
    }
  };

  const handleSelectGift = (gift: GiftItem) => {
    setSelectedGift(gift);
    setQuantity(1);
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
          className="bg-[#1a2235] rounded-xl w-[95vw] sm:w-[520px] max-h-[90vh] overflow-hidden shadow-2xl border border-gray-700/50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gradient-to-r from-pink-500/20 to-purple-500/20">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-400" />
              <h2 className="text-xl font-bold text-white">
                {t('sendGiftTo', { name: dealerName })}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Gift Grid */}
          <div className="p-3 sm:p-4 overflow-y-auto flex-1">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {GIFT_ITEMS.map((gift) => (
                <motion.button
                  key={gift.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSelectGift(gift)}
                  className={`relative p-2 sm:p-4 rounded-xl flex flex-col items-center justify-center transition-all ${
                    selectedGift?.id === gift.id
                      ? `${gift.bgColor} ring-2 ring-offset-2 ring-offset-[#1a2235] ring-white/50`
                      : 'bg-[#2a3548] hover:bg-[#323d52]'
                  }`}
                >
                  <div className={`${gift.color} mb-2`}>{gift.icon}</div>
                  <span className="text-white text-sm font-medium">
                    {i18n.language === 'zh' ? gift.name : gift.nameEn}
                  </span>
                  <span className="text-yellow-400 text-xs mt-1">${gift.price}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Quantity Selector */}
          {selectedGift && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-4 pb-4"
            >
              <div className="bg-[#2a3548] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-400">{t('quantity')}</span>
                  <span className="text-white">
                    {i18n.language === 'zh' ? selectedGift.name : selectedGift.nameEn} x {quantity}
                  </span>
                </div>

                <div className="flex gap-2 mb-4">
                  {QUANTITY_OPTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setQuantity(q)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                        quantity === q
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-700/50 text-gray-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Custom Quantity Input */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-gray-400 text-sm">{t('customQuantity')}</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))
                    }
                    className="w-20 bg-gray-700/50 text-white text-center px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                  <span className="text-gray-400">{t('total')}</span>
                  <span className={`text-xl font-bold ${canAfford ? 'text-yellow-400' : 'text-red-400'}`}>
                    ${totalPrice.toLocaleString()}
                  </span>
                </div>

                {!canAfford && (
                  <p className="text-red-400 text-sm mt-2">{t('insufficientBalance')}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-700/50 bg-[#141922] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-gray-400 text-xs sm:text-sm">{t('yourBalance')}</span>
              <span className="text-yellow-400 font-bold text-sm sm:text-base">${balance.toLocaleString()}</span>
            </div>
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 sm:px-6 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition text-sm"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSendGift}
                disabled={!selectedGift || !canAfford}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg font-bold transition flex items-center justify-center gap-2 text-sm ${
                  selectedGift && canAfford
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-400 hover:to-purple-400'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Gift className="w-4 h-4" />
                {t('sendGift')}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
