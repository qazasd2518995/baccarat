import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { gameApi } from '../services/api';
import type { GameRound } from '../types';

export default function GameRounds() {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchRounds();
  }, [page]);

  const fetchRounds = async () => {
    try {
      const { data } = await gameApi.getRounds({ page, limit: 20 });
      setRounds(data.rounds || []);
      setTotal(data.total || 0);
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
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">局号</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">靴号</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">结果</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">闲点数</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">庄点数</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">{t('loading')}</td>
              </tr>
            ) : rounds.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">{t('noData')}</td>
              </tr>
            ) : (
              rounds.map((round) => (
                <tr key={round.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">#{round.roundNumber}</td>
                  <td className="px-6 py-4 text-slate-300">#{round.shoeNumber}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getResultColor(round.result || '')}`}>
                      {getResultText(round.result || '')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-blue-400 font-medium">{round.playerScore}</td>
                  <td className="px-6 py-4 text-red-400 font-medium">{round.bankerScore}</td>
                  <td className="px-6 py-4 text-slate-400">
                    {new Date(round.createdAt).toLocaleString('zh-CN')}
                  </td>
                </tr>
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
