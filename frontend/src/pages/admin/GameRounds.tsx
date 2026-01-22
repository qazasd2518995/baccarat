import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import DataTable from '../../components/admin/common/DataTable';
// import { useAuthStore } from '../../store/authStore';
import { gameApi } from '../../services/api';
import type { GameRound, Card } from '../../types';

export default function GameRounds() {
  const { t } = useTranslation();
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultFilter, setResultFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchRounds();
  }, [page, resultFilter, dateFrom, dateTo]);

  const fetchRounds = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (resultFilter !== 'all') params.result = resultFilter;
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const response = await gameApi.getRounds(params);

      setRounds(response.data.rounds || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch rounds:', error);
      setRounds([]);
    } finally {
      setLoading(false);
    }
  };

  const getSuitSymbol = (suit: string) => {
    const suits: Record<string, string> = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠',
    };
    return suits[suit] || suit;
  };

  const getSuitColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-white';
  };

  const renderCards = (cards: Card[]) => {
    return (
      <div className="flex gap-1">
        {cards.map((card, i) => (
          <div
            key={i}
            className="w-8 h-10 bg-white rounded flex flex-col items-center justify-center text-xs font-bold"
          >
            <span className={getSuitColor(card.suit)}>{card.rank}</span>
            <span className={getSuitColor(card.suit)}>{getSuitSymbol(card.suit)}</span>
          </div>
        ))}
      </div>
    );
  };

  const getResultBadge = (result: string) => {
    const styles: Record<string, string> = {
      player: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      banker: 'bg-red-500/20 text-red-400 border-red-500/30',
      tie: 'bg-green-500/20 text-green-400 border-green-500/30',
    };
    return styles[result] || styles.tie;
  };

  const columns = [
    {
      key: 'roundNumber',
      header: t('roundNumber'),
      render: (round: GameRound) => (
        <span className="text-slate-400 font-mono">{round.roundNumber}</span>
      ),
    },
    {
      key: 'shoeNumber',
      header: t('shoeNumber'),
      render: (round: GameRound) => (
        <span className="text-slate-400">{round.shoeNumber}</span>
      ),
    },
    {
      key: 'playerCards',
      header: t('player'),
      render: (round: GameRound) => (
        <div className="flex items-center gap-2">
          {renderCards(round.playerCards)}
          <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-sm font-bold">
            {round.playerPoints}
          </span>
          {round.playerPair && (
            <span className="px-1.5 py-0.5 bg-blue-500/30 text-blue-300 rounded text-xs">
              PAIR
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'bankerCards',
      header: t('banker'),
      render: (round: GameRound) => (
        <div className="flex items-center gap-2">
          {renderCards(round.bankerCards)}
          <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-sm font-bold">
            {round.bankerPoints}
          </span>
          {round.bankerPair && (
            <span className="px-1.5 py-0.5 bg-red-500/30 text-red-300 rounded text-xs">
              PAIR
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'result',
      header: t('result'),
      render: (round: GameRound) => (
        <span className={`px-3 py-1 rounded border ${getResultBadge(round.result)} font-medium text-sm`}>
          {round.result.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('time'),
      render: (round: GameRound) => (
        <div className="text-xs">
          <p className="text-white">{new Date(round.createdAt).toLocaleDateString()}</p>
          <p className="text-slate-400">{new Date(round.createdAt).toLocaleTimeString()}</p>
        </div>
      ),
    },
  ];

  // Calculate statistics
  const stats = {
    total: rounds.length,
    player: rounds.filter((r) => r.result === 'player').length,
    banker: rounds.filter((r) => r.result === 'banker').length,
    tie: rounds.filter((r) => r.result === 'tie').length,
    playerPair: rounds.filter((r) => r.playerPair).length,
    bankerPair: rounds.filter((r) => r.bankerPair).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('gameRoundsTitle')}</h1>
          <p className="text-slate-400 mt-1">{t('gameRoundsSubtitle')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('all')} {t('result')}</option>
          <option value="player">{t('player')}</option>
          <option value="banker">{t('banker')}</option>
          <option value="tie">{t('tie')}</option>
        </select>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400">{t('to')}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-xs text-slate-400">{t('totalRounds')}</p>
        </div>
        <div className="bg-slate-800 border border-blue-500/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{stats.player}</p>
          <p className="text-xs text-slate-400">{t('player')} {t('wins')}</p>
        </div>
        <div className="bg-slate-800 border border-red-500/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{stats.banker}</p>
          <p className="text-xs text-slate-400">{t('banker')} {t('wins')}</p>
        </div>
        <div className="bg-slate-800 border border-green-500/30 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{stats.tie}</p>
          <p className="text-xs text-slate-400">{t('tie')}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-300">{stats.playerPair}</p>
          <p className="text-xs text-slate-400">{t('playerPair')}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-300">{stats.bankerPair}</p>
          <p className="text-xs text-slate-400">{t('bankerPair')}</p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rounds}
        keyField="id"
        loading={loading}
        emptyMessage={t('noData')}
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
