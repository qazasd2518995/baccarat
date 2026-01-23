import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { gameApi } from '../services/api';
import type { GameRound } from '../types';
import { CardGroup } from '../components/PlayingCard';

export default function GameRounds() {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    fetchRounds();
  }, [page]);

  const fetchRounds = async () => {
    try {
      const { data } = await gameApi.getRounds({ page, limit: 20 });
      setRounds(data.rounds || []);
      setTotal(data.pagination?.total || data.total || 0);
    } catch (error) {
      console.error('Failed to fetch rounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'player': return 'text-blue-400 bg-blue-500/20';
      case 'banker': return 'text-red-400 bg-red-500/20';
      case 'tie': return 'text-green-400 bg-green-500/20';
      default: return 'text-slate-400 bg-slate-500/20';
    }
  };

  const getResultText = (result: string) => {
    switch (result) {
      case 'player': return '闲';
      case 'banker': return '庄';
      case 'tie': return '和';
      default: return '-';
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('gameRounds')}</h1>
        <div className="text-slate-400">
          共 {total} 局
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-4 py-4 text-left text-sm font-medium text-slate-300 w-10"></th>
              <th className="px-4 py-4 text-left text-sm font-medium text-slate-300">局号</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-slate-300">靴号</th>
              <th className="px-4 py-4 text-center text-sm font-medium text-slate-300">结果</th>
              <th className="px-4 py-4 text-center text-sm font-medium text-slate-300">闲点数</th>
              <th className="px-4 py-4 text-center text-sm font-medium text-slate-300">庄点数</th>
              <th className="px-4 py-4 text-center text-sm font-medium text-slate-300">对子</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-slate-300">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">{t('loading')}</td>
              </tr>
            ) : rounds.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">{t('noData')}</td>
              </tr>
            ) : (
              rounds.map((round) => (
                <>
                  <tr
                    key={round.id}
                    className="hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(round.id)}
                  >
                    <td className="px-4 py-4 text-slate-400">
                      {expandedRow === round.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-white font-medium">#{round.roundNumber}</td>
                    <td className="px-4 py-4 text-slate-300">#{round.shoeNumber}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getResultColor(round.result || '')}`}>
                        {getResultText(round.result || '')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xl font-bold text-blue-400">{round.playerPoints}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-xl font-bold text-red-400">{round.bankerPoints}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {round.playerPair && (
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">闲对</span>
                        )}
                        {round.bankerPair && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">庄对</span>
                        )}
                        {!round.playerPair && !round.bankerPair && (
                          <span className="text-slate-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-400 text-sm">
                      {new Date(round.createdAt).toLocaleString('zh-TW')}
                    </td>
                  </tr>
                  {/* Expanded row with cards */}
                  <AnimatePresence>
                    {expandedRow === round.id && (
                      <tr key={`${round.id}-expanded`}>
                        <td colSpan={8} className="px-4 py-0 bg-slate-800/50">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="py-4 flex gap-6 items-start">
                              {/* Player Cards */}
                              {round.playerCards && round.playerCards.length > 0 ? (
                                <CardGroup
                                  cards={round.playerCards}
                                  points={round.playerPoints}
                                  label="闲家"
                                  color="blue"
                                  size="md"
                                />
                              ) : (
                                <div className="text-slate-500 text-sm">无闲家牌数据</div>
                              )}

                              {/* Banker Cards */}
                              {round.bankerCards && round.bankerCards.length > 0 ? (
                                <CardGroup
                                  cards={round.bankerCards}
                                  points={round.bankerPoints}
                                  label="庄家"
                                  color="red"
                                  size="md"
                                />
                              ) : (
                                <div className="text-slate-500 text-sm">无庄家牌数据</div>
                              )}
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg"
          >
            上一页
          </button>
          <span className="text-slate-400 px-4">
            第 {page} 页 / 共 {Math.ceil(total / 20)} 页
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
