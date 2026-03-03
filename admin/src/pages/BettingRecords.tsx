import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ChevronLeft, Search, RotateCcw, X } from 'lucide-react';
import { bettingApi } from '../services/api';

interface BettingRecord {
  id: string;
  createdAt: string;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  platform: string;
  gameName: string;
  roundNumber: string;
  username: string;
  parentAgentPath: string;
  amount: number;
  validBet: number;
  memberWinLoss: number;
  memberRebate: number;
  profit: number;
  betType: string;
}

interface QuickFilter {
  key: string;
  label: string;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const getValueColor = (value: number) => {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-white';
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'won': return '已結算';
    case 'lost': return '已結算';
    case 'refunded': return '已退款';
    case 'pending': return '待結算';
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'won': return 'text-green-400';
    case 'lost': return 'text-red-400';
    case 'refunded': return 'text-yellow-400';
    case 'pending': return 'text-gray-400';
    default: return 'text-white';
  }
};

// 計算快速篩選對應的日期範圍
const getDateRangeForFilter = (filterKey: string): { start: string; end: string } => {
  const today = new Date();
  const formatDateTime = (d: Date, isEnd = false) => {
    const date = d.toISOString().split('T')[0];
    return isEnd ? `${date} 23:59:59` : `${date} 00:00:00`;
  };

  switch (filterKey) {
    case 'today':
      return { start: formatDateTime(today), end: formatDateTime(today, true) };
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: formatDateTime(yesterday), end: formatDateTime(yesterday, true) };
    }
    case 'thisWeek': {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return { start: formatDateTime(startOfWeek), end: formatDateTime(today, true) };
    }
    case 'lastWeek': {
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return { start: formatDateTime(startOfLastWeek), end: formatDateTime(endOfLastWeek, true) };
    }
    case 'thisMonth': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDateTime(startOfMonth), end: formatDateTime(today, true) };
    }
    case 'lastMonth': {
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatDateTime(startOfLastMonth), end: formatDateTime(endOfLastMonth, true) };
    }
    default:
      return { start: formatDateTime(today), end: formatDateTime(today, true) };
  }
};

export default function BettingRecords() {
  const [records, setRecords] = useState<BettingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('lastMonth');
  const [memberSearch, setMemberSearch] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [jumpToPage, setJumpToPage] = useState('');

  // 統計數據
  const [stats, setStats] = useState({
    recharge: 0,
    deposit: 0,
    withdraw: 0,
    memberWinLoss: 0
  });

  const quickFilters: QuickFilter[] = [
    { key: 'today', label: '今日' },
    { key: 'yesterday', label: '昨日' },
    { key: 'thisWeek', label: '本週' },
    { key: 'lastWeek', label: '上週' },
    { key: 'thisMonth', label: '本月' },
    { key: 'lastMonth', label: '上月' },
  ];

  // 初始化日期
  useEffect(() => {
    const { start, end } = getDateRangeForFilter(quickFilter);
    setStartDateTime(start);
    setEndDateTime(end);
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [page, pageSize]);

  const fetchRecords = async () => {
    if (!memberSearch.trim()) {
      setRecords([]);
      setTotal(0);
      setStats({ recharge: 0, deposit: 0, withdraw: 0, memberWinLoss: 0 });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params: any = {
        page,
        limit: pageSize,
        username: memberSearch.trim()
      };

      // Use explicit dates from the datetime pickers
      if (startDateTime && endDateTime) {
        params.startDate = startDateTime.split(' ')[0];
        params.endDate = endDateTime.split(' ')[0];
      } else {
        params.quickFilter = quickFilter;
      }

      const res = await bettingApi.getBettingRecords(params);
      const data = res.data;

      // Backend already returns transformed data
      const transformedRecords: BettingRecord[] = (data.bets || []).map((bet: any) => ({
        id: bet.id,
        createdAt: bet.createdAt,
        status: bet.status,
        platform: bet.platform || 'JW 九贏百家',
        gameName: bet.gameName || '百家樂',
        roundNumber: bet.roundNumber || '',
        username: bet.username || '',
        parentAgentPath: bet.parentAgentPath || '',
        amount: Number(bet.amount),
        validBet: Number(bet.validBet),
        memberWinLoss: Number(bet.memberWinLoss),
        memberRebate: Number(bet.memberRebate || 0),
        profit: Number(bet.profit),
        betType: bet.betType
      }));

      setRecords(transformedRecords);
      setTotal(data.total || 0);

      // Use stats from backend
      setStats({
        recharge: 0,
        deposit: data.stats?.deposit || 0,
        withdraw: data.stats?.withdraw || 0,
        memberWinLoss: data.stats?.memberWinLoss || 0
      });
    } catch (err) {
      console.error('Failed to fetch betting records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFilterClick = (filterKey: string) => {
    const { start, end } = getDateRangeForFilter(filterKey);
    setQuickFilter(filterKey);
    setStartDateTime(start);
    setEndDateTime(end);
  };

  const handleSearch = () => {
    if (!memberSearch.trim()) {
      alert('請輸入會員帳號');
      return;
    }
    setPage(1);
    fetchRecords();
  };

  const handleReset = () => {
    setMemberSearch('');
    setQuickFilter('lastMonth');
    const { start, end } = getDateRangeForFilter('lastMonth');
    setStartDateTime(start);
    setEndDateTime(end);
    setPage(1);
  };

  const handleClearMemberSearch = () => {
    setMemberSearch('');
  };

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      setPage(pageNum);
      setJumpToPage('');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">投注紀錄</h1>
      </div>

      {/* Advanced Filters Collapsible */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center gap-3 p-4 hover:bg-[#252525] transition-colors"
        >
          {showFilters ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-white font-medium">進階篩選</span>
        </button>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-[#333] overflow-hidden"
            >
              <div className="p-4">
                <p className="text-gray-400 text-sm">更多篩選條件將在此顯示...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Filters, Search, Date Range */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">快速篩選</span>
          <div className="flex gap-1">
            {quickFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => handleQuickFilterClick(filter.key)}
                className={`px-3 py-1.5 rounded text-sm transition-all ${
                  quickFilter === filter.key
                    ? 'bg-amber-500 text-black font-medium'
                    : 'bg-[#2a2a2a] text-gray-400 hover:text-white border border-[#444]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-red-400 text-sm">*</span>
          <span className="text-gray-400 text-sm">會員帳號</span>
          <div className="relative">
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder=""
              className="px-3 py-1.5 pr-8 bg-[#2a2a2a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500 w-40"
            />
            {memberSearch && (
              <button
                onClick={handleClearMemberSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-red-400 text-sm">*</span>
          <span className="text-gray-400 text-sm">投注時間</span>
          <input
            type="datetime-local"
            value={startDateTime.replace(' ', 'T').slice(0, 16)}
            onChange={(e) => setStartDateTime(e.target.value.replace('T', ' ') + ':00')}
            className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500"
          />
          <span className="text-gray-400">→</span>
          <input
            type="datetime-local"
            value={endDateTime.replace(' ', 'T').slice(0, 16)}
            onChange={(e) => setEndDateTime(e.target.value.replace('T', ' ') + ':00')}
            className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#444] text-sm rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </button>
          <button
            onClick={handleSearch}
            className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-medium text-sm rounded transition-colors"
          >
            <Search className="w-4 h-4" />
            查詢
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="text-sm text-gray-400">
        機台充值: <span className="text-white">{formatCurrency(stats.recharge)}</span>{' '}
        額度存入: <span className="text-white">{formatCurrency(stats.deposit)}</span>{' '}
        額度提取: <span className="text-white">{formatCurrency(stats.withdraw)}</span>{' '}
        會員輸贏: <span className={getValueColor(stats.memberWinLoss)}>{formatCurrency(stats.memberWinLoss)}</span>
      </div>

      {/* Table */}
      <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#252525] text-gray-400 border-b border-[#333]">
                <th className="px-4 py-3 text-center">投注時間</th>
                <th className="px-4 py-3 text-center">狀態</th>
                <th className="px-4 py-3 text-center">投注平台</th>
                <th className="px-4 py-3 text-center">投注遊戲</th>
                <th className="px-4 py-3 text-center">期號</th>
                <th className="px-4 py-3 text-center">會員帳號</th>
                <th className="px-4 py-3 text-center">所屬代理名稱</th>
                <th className="px-4 py-3 text-right">投注金額</th>
                <th className="px-4 py-3 text-right">有效投注</th>
                <th className="px-4 py-3 text-right">會員輸贏</th>
                <th className="px-4 py-3 text-right">會員退水</th>
                <th className="px-4 py-3 text-right">個人盈虧</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
                    載入中...
                  </td>
                </tr>
              ) : !memberSearch.trim() ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
                    請輸入會員帳號進行查詢
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
                    暫無數據
                  </td>
                </tr>
              ) : (
                records.map((record, index) => (
                  <tr
                    key={record.id}
                    className={`border-t border-[#333] hover:bg-[#252525] ${
                      index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e1e]'
                    }`}
                  >
                    <td className="px-4 py-3 text-center text-white">
                      {new Date(record.createdAt).toLocaleString('zh-TW', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className={`px-4 py-3 text-center ${getStatusColor(record.status)}`}>
                      {getStatusText(record.status)}
                    </td>
                    <td className="px-4 py-3 text-center text-white">{record.platform}</td>
                    <td className="px-4 py-3 text-center text-white">{record.gameName}</td>
                    <td className="px-4 py-3 text-center text-gray-400 text-xs">{record.roundNumber}</td>
                    <td className="px-4 py-3 text-center text-white">{record.username}</td>
                    <td className="px-4 py-3 text-center text-white">{record.parentAgentPath}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(record.amount)}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(record.validBet)}</td>
                    <td className={`px-4 py-3 text-right ${getValueColor(record.memberWinLoss)}`}>
                      {formatCurrency(record.memberWinLoss)}
                    </td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(record.memberRebate)}</td>
                    <td className={`px-4 py-3 text-right ${getValueColor(record.profit)}`}>
                      {formatCurrency(record.profit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-end gap-4">
          <span className="text-gray-400 text-sm">共 {total} 條數據</span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded text-sm transition-colors ${
                    page === pageNum
                      ? 'bg-amber-500 text-black font-medium'
                      : 'text-gray-400 hover:text-white border border-[#444]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || totalPages === 0}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500"
          >
            <option value={10}>10 條/頁</option>
            <option value={20}>20 條/頁</option>
            <option value={50}>50 條/頁</option>
          </select>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">跳至</span>
            <input
              type="text"
              value={jumpToPage}
              onChange={(e) => setJumpToPage(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleJumpToPage()}
              className="w-12 px-2 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-white text-sm text-center focus:outline-none focus:border-amber-500"
            />
            <span className="text-gray-400 text-sm">頁</span>
          </div>
        </div>
      )}
    </div>
  );
}
