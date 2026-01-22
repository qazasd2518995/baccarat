import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { gameApi } from '../services/api';
import type { GameRound, GameResult } from '../types';

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('gameHistory')}</h1>
        <p className="text-slate-400 mt-1">View all game rounds</p>
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
              <p className="text-blue-400 text-sm">Player Wins</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.player}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
              P
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
              <p className="text-red-400 text-sm">Banker Wins</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.banker}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white font-bold">
              B
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
              <p className="text-green-400 text-sm">Ties</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.tie}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
              T
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <input
          type="date"
          value={filter.startDate}
          onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
          className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:border-amber-500/50"
        />
        <input
          type="date"
          value={filter.endDate}
          onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
          className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:border-amber-500/50"
        />
        <button
          onClick={() => setFilter({ startDate: '', endDate: '' })}
          className="px-4 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-white"
        >
          Clear
        </button>
      </div>

      {/* Games Table */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Round</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Shoe</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Time</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-slate-400">Player</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-slate-400">Banker</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-slate-400">Result</th>
              <th className="px-6 py-4 text-center text-sm font-medium text-slate-400">Pairs</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  {t('loading')}
                </td>
              </tr>
            ) : rounds.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                  {t('noData')}
                </td>
              </tr>
            ) : (
              rounds.map((round) => (
                <motion.tr
                  key={round.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-slate-700/30 hover:bg-slate-700/20"
                >
                  <td className="px-6 py-4 text-white font-medium">
                    #{round.roundNumber}
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    Shoe {round.shoeNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {formatDate(round.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-2xl font-bold text-blue-400">{round.playerPoints}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-2xl font-bold text-red-400">{round.bankerPoints}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${round.result ? RESULT_COLORS[round.result] : 'bg-gray-500'} text-white font-bold text-sm`}>
                      {round.result ? round.result[0].toUpperCase() : '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {round.playerPair && (
                        <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">PP</span>
                      )}
                      {round.bankerPair && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">BP</span>
                      )}
                      {!round.playerPair && !round.bankerPair && (
                        <span className="text-slate-500">-</span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50">
            <div className="text-sm text-slate-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-slate-400">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
