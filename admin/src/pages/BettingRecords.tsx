import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { gameApi } from '../services/api';
import type { GameRound } from '../types';

export default function BettingRecords() {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRounds();
  }, []);

  const fetchRounds = async () => {
    try {
      const { data } = await gameApi.getRounds({ limit: 50 });
      setRounds(data.rounds || []);
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
        <h1 className="text-2xl font-bold text-white">{t('bettingRecords')}</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">总局数</div>
          <div className="text-2xl font-bold text-white">{rounds.length}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">闲赢</div>
          <div className="text-2xl font-bold text-blue-400">
            {rounds.filter(r => r.result === 'player').length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">庄赢</div>
          <div className="text-2xl font-bold text-red-400">
            {rounds.filter(r => r.result === 'banker').length}
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <div className="text-sm text-slate-400 mb-1">和局</div>
          <div className="text-2xl font-bold text-green-400">
            {rounds.filter(r => r.result === 'tie').length}
          </div>
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
    </div>
  );
}
