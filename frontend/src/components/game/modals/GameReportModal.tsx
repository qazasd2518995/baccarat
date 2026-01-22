import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Calendar, ChevronLeft, ChevronRight, Search, Loader2 } from 'lucide-react';
import { gameApi, transactionApi, giftApi } from '../../../services/api';

interface GameReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportTab = 'betting' | 'balance' | 'tips';

interface BettingRecord {
  roundId: string;
  game: string;
  settleTime: string;
  table: string;
  shoe: number;
  round: number;
  betAmount: number;
  validBet: number;
  result: string;
  winLoss: number;
}

interface BalanceRecord {
  orderId: string;
  type: string;
  time: string;
  beforeAmount: number;
  amount: number;
  afterAmount: number;
  note: string;
}

interface TipsRecord {
  orderId: string;
  settleTime: string;
  tableName: string;
  item: string;
  price: number;
  quantity: number;
  total: number;
  dealer: string;
}


export default function GameReportModal({ isOpen, onClose }: GameReportModalProps) {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<ReportTab>('betting');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Real data states
  const [bettingRecords, setBettingRecords] = useState<BettingRecord[]>([]);
  const [balanceRecords, setBalanceRecords] = useState<BalanceRecord[]>([]);
  const [tipsRecords, setTipsRecords] = useState<TipsRecord[]>([]);

  const tabs: { id: ReportTab; labelKey: string }[] = [
    { id: 'betting', labelKey: 'bettingReport' },
    { id: 'balance', labelKey: 'balanceReport' },
    { id: 'tips', labelKey: 'tipsReport' },
  ];

  // Fetch betting history
  const fetchBettingHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; from?: string; to?: string } = {
        page: currentPage,
        limit: 20,
      };
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;

      const response = await gameApi.getHistory(params);
      const rounds = response.data?.rounds || [];

      // Map backend data to BettingRecord format
      const records: BettingRecord[] = rounds.map((round: any) => {
        const bets = round.bets || [];
        const totalBet = bets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
        const totalPayout = bets.reduce((sum: number, b: any) => sum + Number(b.payout), 0);
        const netResult = totalPayout - totalBet;

        // Determine result text
        let resultText = round.result;
        if (i18n.language === 'zh') {
          resultText = round.result === 'player' ? '閒贏' :
                       round.result === 'banker' ? '莊贏' :
                       round.result === 'tie' ? '和局' : round.result;
        } else {
          resultText = round.result === 'player' ? 'Player' :
                       round.result === 'banker' ? 'Banker' :
                       round.result === 'tie' ? 'Tie' : round.result;
        }

        return {
          roundId: round.id.slice(0, 8),
          game: i18n.language === 'zh' ? '百家樂' : 'Baccarat',
          settleTime: new Date(round.createdAt).toLocaleString(i18n.language === 'zh' ? 'zh-TW' : 'en-US'),
          table: 'Table 1',
          shoe: round.shoeNumber || 1,
          round: round.roundNumber || 0,
          betAmount: totalBet,
          validBet: totalBet,
          result: resultText,
          winLoss: netResult,
        };
      });

      setBettingRecords(records);
      setTotalPages(response.data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch betting history:', error);
      setBettingRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, startDate, endDate, i18n.language]);

  // Fetch balance history
  const fetchBalanceHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; startDate?: string; endDate?: string } = {
        page: currentPage,
        limit: 20,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await transactionApi.getTransactions(params);
      const transactions = response.data?.transactions || [];

      // Map backend data to BalanceRecord format
      const records: BalanceRecord[] = transactions.map((tx: any) => {
        // Determine type text
        let typeText = tx.type;
        if (i18n.language === 'zh') {
          typeText = tx.type === 'deposit' ? '入金' :
                     tx.type === 'withdraw' ? '出金' :
                     tx.type === 'bet' ? '下注' :
                     tx.type === 'win' ? '派彩' :
                     tx.type === 'adjustment' ? '調整' : tx.type;
        } else {
          typeText = tx.type === 'deposit' ? 'Deposit' :
                     tx.type === 'withdraw' ? 'Withdraw' :
                     tx.type === 'bet' ? 'Bet' :
                     tx.type === 'win' ? 'Win' :
                     tx.type === 'adjustment' ? 'Adjustment' : tx.type;
        }

        return {
          orderId: tx.id.slice(0, 8),
          type: typeText,
          time: new Date(tx.createdAt).toLocaleString(i18n.language === 'zh' ? 'zh-TW' : 'en-US'),
          beforeAmount: Number(tx.balanceBefore),
          amount: Number(tx.amount),
          afterAmount: Number(tx.balanceAfter),
          note: tx.note || '',
        };
      });

      setBalanceRecords(records);
      setTotalPages(response.data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch balance history:', error);
      setBalanceRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, startDate, endDate, i18n.language]);

  // Fetch tips history
  const fetchTipsHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; from?: string; to?: string } = {
        page: currentPage,
        limit: 20,
      };
      if (startDate) params.from = startDate;
      if (endDate) params.to = endDate;

      const response = await giftApi.getHistory(params);
      const gifts = response.data?.records || [];

      // Map backend data to TipsRecord format
      const records: TipsRecord[] = gifts.map((gift: any) => ({
        orderId: gift.id.slice(0, 8).toUpperCase(),
        settleTime: new Date(gift.createdAt).toLocaleString(i18n.language === 'zh' ? 'zh-TW' : 'en-US'),
        tableName: 'Table 1', // Table info not stored in gift transaction
        item: gift.giftName,
        price: Number(gift.price),
        quantity: gift.quantity,
        total: Number(gift.total),
        dealer: gift.dealerName,
      }));

      setTipsRecords(records);
      setTotalPages(response.data?.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch tips history:', error);
      setTipsRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, startDate, endDate, i18n.language]);

  // Fetch data when tab or page changes
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'betting') {
      fetchBettingHistory();
    } else if (activeTab === 'balance') {
      fetchBalanceHistory();
    } else if (activeTab === 'tips') {
      fetchTipsHistory();
    }
  }, [isOpen, activeTab, currentPage, fetchBettingHistory, fetchBalanceHistory, fetchTipsHistory]);

  // Reset page when switching tabs
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleSearch = () => {
    setCurrentPage(1);
    if (activeTab === 'betting') {
      fetchBettingHistory();
    } else if (activeTab === 'balance') {
      fetchBalanceHistory();
    } else if (activeTab === 'tips') {
      fetchTipsHistory();
    }
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
          className="bg-[#1a2235] rounded-xl w-[900px] max-h-[85vh] overflow-hidden shadow-2xl border border-gray-700/50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
            <h2 className="text-xl font-bold text-white">{t('gameReport')}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700/50 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-700/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setCurrentPage(1);
                }}
                className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-orange-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {t(tab.labelKey)}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeReportTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-400"
                  />
                )}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-700/50 bg-[#141922]">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-[#2a3548] text-white text-sm px-3 py-2 rounded border border-gray-600/50 outline-none focus:border-orange-500/50"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-[#2a3548] text-white text-sm px-3 py-2 rounded border border-gray-600/50 outline-none focus:border-orange-500/50"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {t('search')}
            </button>
          </div>

          {/* Table Content */}
          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
              </div>
            ) : (
              <>
                {activeTab === 'betting' && (
                  <table className="w-full text-sm">
                    <thead className="bg-[#2a3548] text-gray-400">
                      <tr>
                        <th className="px-3 py-3 text-left">{t('roundId')}</th>
                        <th className="px-3 py-3 text-left">{t('game')}</th>
                        <th className="px-3 py-3 text-left">{t('settleTime')}</th>
                        <th className="px-3 py-3 text-left">{t('table')}</th>
                        <th className="px-3 py-3 text-center">{t('shoe')}</th>
                        <th className="px-3 py-3 text-center">{t('round')}</th>
                        <th className="px-3 py-3 text-right">{t('betAmount')}</th>
                        <th className="px-3 py-3 text-right">{t('validBet')}</th>
                        <th className="px-3 py-3 text-center">{t('result')}</th>
                        <th className="px-3 py-3 text-right">{t('winLoss')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bettingRecords.map((record) => (
                        <tr key={record.roundId} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                          <td className="px-3 py-3 text-gray-300">{record.roundId}</td>
                          <td className="px-3 py-3 text-gray-300">{record.game}</td>
                          <td className="px-3 py-3 text-gray-400">{record.settleTime}</td>
                          <td className="px-3 py-3 text-gray-300">{record.table}</td>
                          <td className="px-3 py-3 text-center text-gray-400">{record.shoe}</td>
                          <td className="px-3 py-3 text-center text-gray-400">{record.round}</td>
                          <td className="px-3 py-3 text-right text-gray-300">{record.betAmount.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-gray-300">{record.validBet.toLocaleString()}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs ${
                              record.result.includes('莊') || record.result === 'Banker' ? 'bg-red-500/20 text-red-400' :
                              record.result.includes('閒') || record.result === 'Player' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {record.result}
                            </span>
                          </td>
                          <td className={`px-3 py-3 text-right font-medium ${
                            record.winLoss > 0 ? 'text-green-400' :
                            record.winLoss < 0 ? 'text-red-400' :
                            'text-gray-400'
                          }`}>
                            {record.winLoss > 0 ? '+' : ''}{record.winLoss.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'balance' && (
                  <table className="w-full text-sm">
                    <thead className="bg-[#2a3548] text-gray-400">
                      <tr>
                        <th className="px-3 py-3 text-left">{t('orderId')}</th>
                        <th className="px-3 py-3 text-left">{t('transactionType')}</th>
                        <th className="px-3 py-3 text-left">{t('time')}</th>
                        <th className="px-3 py-3 text-right">{t('beforeAmount')}</th>
                        <th className="px-3 py-3 text-right">{t('amount')}</th>
                        <th className="px-3 py-3 text-right">{t('afterAmount')}</th>
                        <th className="px-3 py-3 text-left">{t('note')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balanceRecords.map((record) => (
                        <tr key={record.orderId} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                          <td className="px-3 py-3 text-gray-300">{record.orderId}</td>
                          <td className="px-3 py-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              record.type === '入金' || record.type === 'Deposit' ? 'bg-green-500/20 text-green-400' :
                              record.type === '下注' || record.type === 'Bet' ? 'bg-orange-500/20 text-orange-400' :
                              record.type === '派彩' || record.type === 'Win' ? 'bg-blue-500/20 text-blue-400' :
                              record.type === '出金' || record.type === 'Withdraw' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {record.type}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-gray-400">{record.time}</td>
                          <td className="px-3 py-3 text-right text-gray-300">{record.beforeAmount.toLocaleString()}</td>
                          <td className={`px-3 py-3 text-right font-medium ${
                            record.amount > 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {record.amount > 0 ? '+' : ''}{record.amount.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-gray-300">{record.afterAmount.toLocaleString()}</td>
                          <td className="px-3 py-3 text-gray-400">{record.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'tips' && (
                  <table className="w-full text-sm">
                    <thead className="bg-[#2a3548] text-gray-400">
                      <tr>
                        <th className="px-3 py-3 text-left">{t('orderId')}</th>
                        <th className="px-3 py-3 text-left">{t('settleTime')}</th>
                        <th className="px-3 py-3 text-left">{t('tableName')}</th>
                        <th className="px-3 py-3 text-left">{t('item')}</th>
                        <th className="px-3 py-3 text-right">{t('price')}</th>
                        <th className="px-3 py-3 text-center">{t('quantity')}</th>
                        <th className="px-3 py-3 text-right">{t('total')}</th>
                        <th className="px-3 py-3 text-left">{t('dealer')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipsRecords.map((record) => (
                        <tr key={record.orderId} className="border-b border-gray-700/30 hover:bg-gray-800/30">
                          <td className="px-3 py-3 text-gray-300">{record.orderId}</td>
                          <td className="px-3 py-3 text-gray-400">{record.settleTime}</td>
                          <td className="px-3 py-3 text-gray-300">{record.tableName}</td>
                          <td className="px-3 py-3 text-gray-300">{record.item}</td>
                          <td className="px-3 py-3 text-right text-gray-300">{record.price.toLocaleString()}</td>
                          <td className="px-3 py-3 text-center text-gray-400">{record.quantity}</td>
                          <td className="px-3 py-3 text-right text-yellow-400 font-medium">{record.total.toLocaleString()}</td>
                          <td className="px-3 py-3 text-pink-400">{record.dealer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Empty State */}
                {((activeTab === 'betting' && bettingRecords.length === 0) ||
                  (activeTab === 'balance' && balanceRecords.length === 0) ||
                  (activeTab === 'tips' && tipsRecords.length === 0)) && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                    <div className="text-4xl mb-4">📋</div>
                    <p>{t('noRecords')}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-gray-700/50 bg-[#141922]">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className="p-2 rounded bg-[#2a3548] text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  disabled={loading}
                  className={`w-8 h-8 rounded text-sm ${
                    currentPage === page
                      ? 'bg-orange-500 text-white'
                      : 'bg-[#2a3548] text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
              className="p-2 rounded bg-[#2a3548] text-gray-400 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
