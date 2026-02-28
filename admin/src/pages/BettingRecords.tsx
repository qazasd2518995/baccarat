import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Search,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';
import { gameApi } from '../services/api';
import type { GameRound } from '../types';
import { CardGroup } from '../components/PlayingCard';
import { useToastStore } from '../store/toastStore';

interface QuickFilter {
  key: string;
  label: string;
}

export default function BettingRecords() {
  const toast = useToastStore();
  const [rounds, setRounds] = useState<GameRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [resultFilter, setResultFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const quickFilters: QuickFilter[] = [
    { key: 'today', label: '今日' },
    { key: 'yesterday', label: '昨日' },
    { key: 'thisWeek', label: '本周' },
    { key: 'lastWeek', label: '上周' },
    { key: 'thisMonth', label: '本月' },
    { key: 'lastMonth', label: '上月' },
  ];

  const getDateRange = (filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let from: Date;
    let to: Date = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);

    switch (filter) {
      case 'yesterday':
        from = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        to = new Date(today.getTime() - 1);
        break;
      case 'thisWeek':
        const dayOfWeek = today.getDay() || 7;
        from = new Date(today.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000);
        break;
      case 'lastWeek':
        const lastWeekDay = today.getDay() || 7;
        from = new Date(today.getTime() - (lastWeekDay + 6) * 24 * 60 * 60 * 1000);
        to = new Date(today.getTime() - lastWeekDay * 24 * 60 * 60 * 1000 - 1);
        break;
      case 'thisMonth':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      default: // today
        from = today;
    }

    return { from, to };
  };

  useEffect(() => {
    fetchRounds();
  }, [quickFilter, currentPage, resultFilter]);

  const fetchRounds = async () => {
    try {
      setLoading(true);

      // Build params
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };

      // Use custom date range if provided, otherwise use quickFilter
      if (startDate && endDate) {
        params.from = startDate;
        params.to = endDate;
      } else {
        const { from, to } = getDateRange(quickFilter);
        params.from = from.toISOString();
        params.to = to.toISOString();
      }

      if (resultFilter !== 'all') {
        params.result = resultFilter;
      }

      const { data } = await gameApi.getRounds(params);
      setRounds(data.rounds || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch rounds:', error);
      toast.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRounds();
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setResultFilter('all');
    setQuickFilter('today');
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (rounds.length === 0) {
      toast.warning('没有数据可导出');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += '局号,靴号,结果,闲点数,庄点数,闲对,庄对,时间\n';

    rounds.forEach((round) => {
      csvContent += `${round.roundNumber},${round.shoeNumber},${getResultText(round.result || '')},${round.playerPoints},${round.bankerPoints},${round.playerPair ? '是' : '否'},${round.bankerPair ? '是' : '否'},${new Date(round.createdAt).toLocaleString('zh-CN')}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `游戏记录_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('导出成功');
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

  // Calculate stats from current data
  const stats = {
    totalRounds: total,
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
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 text-sm min-w-fit">快速筛选：</span>
              <div className="flex flex-wrap gap-2">
                {quickFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => {
                      setQuickFilter(filter.key);
                      setStartDate('');
                      setEndDate('');
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      quickFilter === filter.key && !startDate
                        ? 'bg-amber-500 text-black font-medium'
                        : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Result Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-400 text-sm min-w-fit">结果筛选：</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'all', label: '全部' },
                  { key: 'banker', label: '庄赢' },
                  { key: 'player', label: '闲赢' },
                  { key: 'tie', label: '和局' },
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => {
                      setResultFilter(filter.key);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      resultFilter === filter.key
                        ? 'bg-amber-500 text-black font-medium'
                        : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-4 flex-wrap">
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
                onClick={handleSearch}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium text-sm rounded-lg transition-colors"
              >
                <Search className="w-4 h-4" />
                查询
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重置
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        <div className="overflow-x-auto">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#333]">
            <div className="text-sm text-gray-400">
              共 {total} 条记录，第 {currentPage}/{totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-[#2a2a2a] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
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
                    className={`w-8 h-8 rounded-lg text-sm ${
                      currentPage === page
                        ? 'bg-amber-500 text-black font-medium'
                        : 'bg-[#2a2a2a] text-gray-400 hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-[#2a2a2a] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
