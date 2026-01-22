import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, User, Users, Wifi, Loader2 } from 'lucide-react';
import { tablesApi } from '../../../services/api';

interface TableSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable?: (tableId: string) => void;
  currentTableId?: string;
}

interface TableInfo {
  id: string;
  name: string;
  dealer: string;
  dealerAvatar?: string;
  players: number;
  shoeNumber: number;
  roundNumber: number;
  bankerWins: number;
  playerWins: number;
  ties: number;
  isOnline: boolean;
  minBet: number;
  maxBet: number;
}


export default function TableSwitchModal({
  isOpen,
  onClose,
  onSelectTable,
  currentTableId,
}: TableSwitchModalProps) {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState<'all' | 'baccarat' | 'dragonTiger'>('all');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tables when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchTables = async () => {
      setLoading(true);
      try {
        const res = await tablesApi.getTables();
        const mappedTables: TableInfo[] = res.data.tables.map((t: {
          id: string;
          name: string;
          dealer: string;
          dealerAvatar?: string;
          players: number;
          shoeNumber: number;
          roundNumber: number;
          roadmap: { banker: number; player: number; tie: number };
          minBet: number;
          maxBet: number;
          isActive?: boolean;
        }) => ({
          id: t.id,
          name: t.name,
          dealer: t.dealer,
          dealerAvatar: t.dealerAvatar,
          players: t.players,
          shoeNumber: t.shoeNumber,
          roundNumber: t.roundNumber,
          bankerWins: t.roadmap.banker,
          playerWins: t.roadmap.player,
          ties: t.roadmap.tie,
          isOnline: t.isActive !== false,
          minBet: t.minBet,
          maxBet: t.maxBet,
        }));
        setTables(mappedTables);
      } catch (err) {
        console.error('[TableSwitch] Failed to fetch tables:', err);
        // Show empty state when API fails
        setTables([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTables();
  }, [isOpen]);

  const handleSelectTable = (tableId: string) => {
    if (onSelectTable) {
      onSelectTable(tableId);
    }
    onClose();
  };

  if (!isOpen) return null;

  const filteredTables = tables.filter((table) => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'baccarat') return table.name.includes('百家樂');
    if (selectedTab === 'dragonTiger') return table.name.includes('龍虎');
    return true;
  });

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
          className="bg-[#1a2235] rounded-xl w-[700px] max-h-[80vh] overflow-hidden shadow-2xl border border-gray-700/50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-400" />
              <h2 className="text-xl font-bold text-white">{t('switchTable')}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-6 py-3 border-b border-gray-700/50">
            <button
              onClick={() => setSelectedTab('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedTab === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-white'
              }`}
            >
              {t('all')}
            </button>
            <button
              onClick={() => setSelectedTab('baccarat')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedTab === 'baccarat'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-white'
              }`}
            >
              {t('baccarat')}
            </button>
            <button
              onClick={() => setSelectedTab('dragonTiger')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                selectedTab === 'dragonTiger'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-700/50 text-gray-400 hover:text-white'
              }`}
            >
              {t('dragonTiger')}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-orange-400 animate-spin mb-4" />
                <p className="text-gray-400">{t('loading')}...</p>
              </div>
            ) : (
              <>
                {filteredTables.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Users className="w-16 h-16 text-gray-600 mb-4" />
                    <p className="text-gray-400">{t('noTablesAvailable')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {filteredTables.map((table, index) => (
                      <motion.div
                        key={table.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelectTable(table.id)}
                        className={`relative p-4 rounded-xl cursor-pointer transition-all ${
                          currentTableId === table.id
                            ? 'bg-orange-500/20 border-2 border-orange-500'
                            : 'bg-[#2a3548] hover:bg-[#323d52] border border-transparent'
                        }`}
                      >
                        {/* Current indicator */}
                        {currentTableId === table.id && (
                          <div className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                            {t('current')}
                          </div>
                        )}

                        <div className="flex gap-4">
                          {/* Dealer Avatar */}
                          <div className="relative">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center">
                              {table.dealerAvatar ? (
                                <img
                                  src={table.dealerAvatar}
                                  alt={table.dealer}
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <User className="w-8 h-8 text-white" />
                              )}
                            </div>
                            {/* Online indicator */}
                            <div
                              className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#2a3548] flex items-center justify-center ${
                                table.isOnline ? 'bg-green-500' : 'bg-gray-500'
                              }`}
                            >
                              <Wifi className="w-2 h-2 text-white" />
                            </div>
                          </div>

                          {/* Table Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-white font-bold truncate">{table.name}</h3>
                              <span className="text-gray-400 text-xs flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {table.players.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-400 text-sm mb-2">
                              {t('dealer')}: {table.dealer}
                            </p>

                            {/* Stats */}
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-red-400">
                                {t('banker')} {table.bankerWins}
                              </span>
                              <span className="text-blue-400">
                                {t('player')} {table.playerWins}
                              </span>
                              <span className="text-green-400">
                                {t('tie')} {table.ties}
                              </span>
                            </div>

                            {/* Shoe/Round info */}
                            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                              <span>
                                {t('shoe')} {table.shoeNumber} / {t('round')} {table.roundNumber}
                              </span>
                              <span>
                                ${table.minBet.toLocaleString()}-${table.maxBet.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-700/50 bg-[#141922]">
            <p className="text-gray-500 text-sm text-center">
              {t('tableCount', { count: filteredTables.length })}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
