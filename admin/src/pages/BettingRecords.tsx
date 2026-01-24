import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { gameApi } from '../services/api';
import type { GameRound } from '../types';
import { CardGroup } from '../components/PlayingCard';

interface QuickFilter {
  key: string;
  label: string;
}

export default function BettingRecords() {
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const quickFilters: QuickFilter[] = [
    { key: 'today', label: '今日' },
    { key: 'yesterday', label: '昨日' },
    { key: 'thisWeek', label: '本周' },
    { key: 'lastWeek', label: '上周' },
    { key: 'thisMonth', label: '本月' },
    { key: 'lastMonth', label: '上月' },
  ];

  useEffect(() => {
    fetchRounds();
  }, [quickFilter]);

  const fetchRounds = async () => {
    try {
      setLoading(true);
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
      default: return 'text-gray-400 bg-gray-500/20';
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

  // Calculate stats
  const stats = {
    totalRounds: rounds.length,
    playerWins: rounds.filter(r => r.result === 'player').length,
    bankerWins: rounds.filter(r => r.result === 'banker').length,
    ties: rounds.filter(r => r.result === 'tie').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">投注记录</h1>
      </div>

      {/* Filters Panel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden"
      >
        {/* Filter Header */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
        >
          <div className="flex items-center gap-2 text-white">
            <Filter className="w-4 h-4" />
            <span className="font-medium">进阶筛选</span>
          </div>
          {showFilters ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Filter Content */}
        {showFilters && (
          <div className="border-t border-[#333] p-4 space-y-4">
            {/* Quick Filters */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm min-w-fit">快速筛选：</span>
              <div className="flex flex-wrap gap-2">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setQuickFilter(filter.key)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      quickFilter === filter.key
                        ? 'bg-amber-500 text-black font-medium'
                        : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Date */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">会员账号：</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 w-40"
                  placeholder="输入账号"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">日期范围：</span>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-gray-400">至</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchRounds}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium text-sm rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                查询
              </button>
              <button
                onClick={fetchRounds}
                className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重置
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">总局数</div>
          <div className="text-2xl font-bold text-white">{stats.totalRounds}</div>
        </div>
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">闲赢</div>
          <div className="text-2xl font-bold text-blue-400">{stats.playerWins}</div>
        </div>
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">庄赢</div>
          <div className="text-2xl font-bold text-red-400">{stats.bankerWins}</div>
        </div>
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-1">和局</div>
          <div className="text-2xl font-bold text-green-400">{stats.ties}</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#252525]">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-400 uppercase w-10"></th>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-400 uppercase">局号</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-400 uppercase">靴号</th>
              <th className="px-4 py-4 text-center text-xs font-medium text-gray-400 uppercase">结果</th>
              <th className="px-4 py-4 text-center text-xs font-medium text-gray-400 uppercase">闲点数</th>
              <th className="px-4 py-4 text-center text-xs font-medium text-gray-400 uppercase">庄点数</th>
              <th className="px-4 py-4 text-center text-xs font-medium text-gray-400 uppercase">对子</th>
              <th className="px-4 py-4 text-left text-xs font-medium text-gray-400 uppercase">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">加载中...</td>
              </tr>
            ) : rounds.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">暂无数据</td>
              </tr>
            ) : (
              rounds.map((round, index) => (
                <>
                  <tr
                    key={round.id}
                    className={`hover:bg-[#252525] transition-colors cursor-pointer ${
                      index % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#222]'
                    }`}
                    onClick={() => toggleExpand(round.id)}
                  >
                    <td className="px-4 py-4 text-gray-400">
                      {expandedRow === round.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </td>
                    <td className="px-4 py-4 text-white font-medium">#{round.roundNumber}</td>
                    <td className="px-4 py-4 text-gray-300">#{round.shoeNumber}</td>
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
                          <span className="text-gray-500">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-400 text-sm">
                      {new Date(round.createdAt).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                  {/* Expanded row with cards */}
                  <AnimatePresence>
                    {expandedRow === round.id && (
                      <tr key={`${round.id}-expanded`}>
                        <td colSpan={8} className="px-4 py-0 bg-[#1a1a1a]">
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
      </div>
    </div>
  );
}
