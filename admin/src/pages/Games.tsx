import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { gameApi } from '../services/api';
import type { GameRound, GameResult } from '../types';
import { CardGroup } from '../components/PlayingCard';

const RESULT_COLORS: Record<GameResult, string> = {
  player: 'bg-blue-500',
  banker: 'bg-red-500',
  tie: 'bg-green-500',
};

export default function Games() {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ startDate: '', endDate: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({ player: 0, banker: 0, tie: 0 });

  useEffect(() => {
    fetchRounds();
  }, [filter, pagination.page]);

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const { data } = await gameApi.getRounds({
        startDate: filter.startDate || undefined,
        endDate: filter.endDate || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setRounds(data.rounds);
      setPagination({ ...pagination, ...data.pagination });

      // Calculate stats from all rounds
      const allRounds = data.rounds;
      setStats({
        player: allRounds.filter((r: GameRound) => r.result === 'player').length,
        banker: allRounds.filter((r: GameRound) => r.result === 'banker').length,
        tie: allRounds.filter((r: GameRound) => r.result === 'tie').length,
      });
    } catch (err) {
      console.error('Failed to fetch game rounds:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('gameHistory')}</h1>
        <p className="text-gray-400 mt-1">查看所有游戏局数</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-400 text-sm">闲赢</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.player}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              闲
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-red-500/10 border border-red-500/30 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-sm">庄赢</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.banker}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
              庄
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-green-500/10 border border-green-500/30 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-400 text-sm">和局</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.tie}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
              和
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 rounded-xl bg-[#1e1e1e]/50 border border-[#333]/50">
        <input
          type="date"
          value={filter.startDate}
          onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
          className="px-4 py-2 rounded-lg bg-[#252525]/50 border border-[#444]/50 text-white focus:outline-none focus:border-amber-500/50"
        />
        <input
          type="date"
          value={filter.endDate}
          onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
          className="px-4 py-2 rounded-lg bg-[#252525]/50 border border-[#444]/50 text-white focus:outline-none focus:border-amber-500/50"
        />
        <button
          onClick={() => setFilter({ startDate: '', endDate: '' })}
          className="px-4 py-2 rounded-lg bg-[#252525]/50 hover:bg-[#333]/50 text-white"
        >
          清除
        </button>
      </div>

      {/* Games Table */}
      <div className="rounded-xl bg-[#1e1e1e]/50 border border-[#333]/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#333]/50">
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-400 w-10"></th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-400">局号</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-400">靴号</th>
              <th className="px-4 py-4 text-left text-sm font-medium text-gray-400">时间</th>
              <th className="px-4 py-4 text-center text-sm font-medium text-gray-400">闲点数</th>
              <th className="px-4 py-4 text-center text-sm font-medium text-gray-400">庄点数</th>
              <th className="px-4 py-4 text-center text-sm font-medium text-gray-400">结果</th>
              <th className="px-4 py-4 text-center text-sm font-medium text-gray-400">对子</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  {t('loading')}
                </td>
              </tr>
            ) : rounds.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  {t('noData')}
                </td>
              </tr>
            ) : (
              rounds.map((round) => (
                <>
                  <motion.tr
                    key={round.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-[#333]/30 hover:bg-[#252525]/20 cursor-pointer"
                    onClick={() => toggleExpand(round.id)}
                  >
                    <td className="px-4 py-4 text-gray-400">
                      {expandedRow === round.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-white font-medium">
                      #{round.roundNumber}
                    </td>
                    <td className="px-4 py-4 text-gray-400">
                      #{round.shoeNumber}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-300">
                      {new Date(round.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-2xl font-bold text-blue-400">{round.playerPoints}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="text-2xl font-bold text-red-400">{round.bankerPoints}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${round.result ? RESULT_COLORS[round.result] : 'bg-gray-500'} text-white font-bold text-sm`}>
                        {round.result === 'player' ? '闲' : round.result === 'banker' ? '庄' : round.result === 'tie' ? '和' : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {round.playerPair && (
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">闲对</span>
                        )}
                        {round.bankerPair && (
                          <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">庄对</span>
                        )}
                        {!round.playerPair && !round.bankerPair && (
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                  {/* Expanded row with cards */}
                  <AnimatePresence>
                    {expandedRow === round.id && (
                      <tr key={`${round.id}-expanded`}>
                        <td colSpan={8} className="px-4 py-0 bg-[#1e1e1e]/50">
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
                                <div className="text-gray-500 text-sm">无闲家牌数据</div>
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
                                <div className="text-gray-500 text-sm">无庄家牌数据</div>
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#333]/50">
            <div className="text-sm text-gray-400">
              显示 {(pagination.page - 1) * pagination.limit + 1} 到 {Math.min(pagination.page * pagination.limit, pagination.total)} 共 {pagination.total} 条
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 rounded-lg bg-[#252525]/50 hover:bg-[#333]/50 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                上一页
              </button>
              <span className="px-3 py-1 text-gray-400">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 rounded-lg bg-[#252525]/50 hover:bg-[#333]/50 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                下一页
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
