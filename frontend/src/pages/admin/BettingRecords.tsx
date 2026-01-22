import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Check,
} from 'lucide-react';
import { gameApi, transactionApi } from '../../services/api';

type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';

interface BetRecord {
  id: string;
  betTime: string;
  status: 'settled' | 'pending' | 'cancelled';
  platform: string;
  game: string;
  memberAccount: string;
  agentName: string;
  betAmount: number;
  validBets: number;
  winLoss: number;
}

interface StatsSummary {
  machineDeposit: number;
  creditDeposit: number;
  creditWithdraw: number;
  memberWinLoss: number;
}

// Game platform categories based on Richpanda
const PLATFORM_CATEGORIES = [
  { id: 'electronic', label: '電子', labelEn: 'Electronic' },
  { id: 'lucky', label: '幸運奪寶', labelEn: 'Lucky' },
  { id: 'bingo', label: 'BINGO_TW', labelEn: 'BINGO_TW' },
  { id: 'live1', label: '真人百家1館', labelEn: 'Live Casino 1' },
  { id: 'live2', label: '真人百家2館', labelEn: 'Live Casino 2' },
  { id: 'sports', label: '體育', labelEn: 'Sports' },
];

// Platform providers
const PLATFORM_PROVIDERS = [
  'WOW', 'QT', 'GB', 'RSG', 'PANDA', 'Hacksaw', 'PG', 'PP', 'JDB',
  'JILI', 'CQ9', 'MG', 'SG', 'KA', 'FC', 'RT', 'PS', 'SPADE',
  'RED', 'BNG', 'EVO', 'WM', 'DG', 'AG', 'SA', 'OG', 'SEXY',
  'BET365', 'SBOBET', 'IBC'
];

export default function BettingRecords() {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('thisMonth');
  const [searchAccount, setSearchAccount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  // Platform filter states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  // Data
  const [records, setRecords] = useState<BetRecord[]>([]);
  const [summary, setSummary] = useState<StatsSummary>({
    machineDeposit: 0,
    creditDeposit: 0,
    creditWithdraw: 0,
    memberWinLoss: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Quick filter date calculation
  const getDateRange = (filter: QuickFilter): { from: string; to: string } => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    switch (filter) {
      case 'today':
        return { from: formatDate(today), to: formatDate(today) };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: formatDate(yesterday), to: formatDate(yesterday) };
      }
      case 'thisWeek': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return { from: formatDate(startOfWeek), to: formatDate(today) };
      }
      case 'lastWeek': {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
        return { from: formatDate(startOfLastWeek), to: formatDate(endOfLastWeek) };
      }
      case 'thisMonth': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: formatDate(startOfMonth), to: formatDate(today) };
      }
      case 'lastMonth': {
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: formatDate(startOfLastMonth), to: formatDate(endOfLastMonth) };
      }
      default:
        return { from: formatDate(today), to: formatDate(today) };
    }
  };

  useEffect(() => {
    const range = getDateRange(quickFilter);
    setDateFrom(range.from);
    setDateTo(range.to);
  }, [quickFilter]);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchRecords();
    }
  }, [dateFrom, dateTo]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Use game history API for betting records
      const [historyRes, summaryRes] = await Promise.all([
        gameApi.getHistory({ page: currentPage, limit: pageSize }),
        transactionApi.getSummary({ startDate: dateFrom, endDate: dateTo }),
      ]);

      // API returns { rounds: [...], pagination: {...} }
      const rounds = historyRes.data?.rounds || historyRes.data?.history || [];
      const roundsArray = Array.isArray(rounds) ? rounds : [];

      setRecords(roundsArray.map((round: any) => ({
        id: round.id,
        betTime: round.createdAt,
        status: 'settled' as const,
        platform: 'Baccarat',
        game: round.result || 'Baccarat',
        memberAccount: '-',
        agentName: '-',
        betAmount: 0,
        validBets: 0,
        winLoss: 0,
      })));

      // Summary from transaction API - it returns an array grouped by type
      const summaryData = summaryRes.data || [];
      const summaryArray = Array.isArray(summaryData) ? summaryData : [];

      let totalDeposit = 0;
      let totalWithdraw = 0;

      summaryArray.forEach((item: any) => {
        if (item.type === 'deposit') {
          totalDeposit = parseFloat(item._sum?.amount) || 0;
        } else if (item.type === 'withdraw') {
          totalWithdraw = Math.abs(parseFloat(item._sum?.amount) || 0);
        }
      });

      setSummary({
        machineDeposit: 0,
        creditDeposit: totalDeposit,
        creditWithdraw: totalWithdraw,
        memberWinLoss: totalDeposit - totalWithdraw,
      });
    } catch (error) {
      console.error('Failed to fetch betting records:', error);
      // Set empty data on error
      setRecords([]);
      setSummary({
        machineDeposit: 0,
        creditDeposit: 0,
        creditWithdraw: 0,
        memberWinLoss: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRecords();
  };

  const handleReset = () => {
    setSearchAccount('');
    setQuickFilter('thisMonth');
    setSelectedCategories([]);
    setSelectedProviders([]);
    setCurrentPage(1);
  };

  const handleSelectAll = () => {
    setSelectedProviders([...PLATFORM_PROVIDERS]);
  };

  const handleDeselectAll = () => {
    setSelectedProviders([]);
  };

  const handleInvertSelection = () => {
    const inverted = PLATFORM_PROVIDERS.filter(p => !selectedProviders.includes(p));
    setSelectedProviders(inverted);
  };

  const toggleProvider = (provider: string) => {
    if (selectedProviders.includes(provider)) {
      setSelectedProviders(selectedProviders.filter(p => p !== provider));
    } else {
      setSelectedProviders([...selectedProviders, provider]);
    }
  };

  const handleExport = () => {
    const headers = ['投注時間', '狀態', '投注平台', '投注遊戲', '會員帳號', '所屬代理', '下注金額', '有效投注', '輸贏'];
    const rows = records.map((r) => [
      new Date(r.betTime).toLocaleString('zh-TW'),
      r.status === 'settled' ? '已結算' : r.status === 'pending' ? '待結算' : '已取消',
      r.platform,
      r.game,
      r.memberAccount,
      r.agentName,
      r.betAmount,
      r.validBets,
      r.winLoss,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `betting-records-${dateFrom}-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return amount < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(isZh ? 'zh-TW' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'settled':
        return <span className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-400">{isZh ? '已結算' : 'Settled'}</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400">{isZh ? '待結算' : 'Pending'}</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400">{isZh ? '已取消' : 'Cancelled'}</span>;
      default:
        return null;
    }
  };

  const quickFilters: { key: QuickFilter; label: string; labelEn: string }[] = [
    { key: 'today', label: '今日', labelEn: 'Today' },
    { key: 'yesterday', label: '昨日', labelEn: 'Yesterday' },
    { key: 'thisWeek', label: '本週', labelEn: 'This Week' },
    { key: 'lastWeek', label: '上週', labelEn: 'Last Week' },
    { key: 'thisMonth', label: '本月', labelEn: 'This Month' },
    { key: 'lastMonth', label: '上月', labelEn: 'Last Month' },
  ];

  const totalPages = Math.ceil(records.length / pageSize);
  const paginatedRecords = records.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl overflow-hidden">
        {/* Advanced Filter Toggle */}
        <button
          onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          className="w-full flex items-center justify-between px-4 py-3 text-gray-400 hover:text-white transition-colors border-b border-gray-700/50"
        >
          <span className="text-sm">{isZh ? '進階篩選' : 'Advanced Filter'}</span>
          {showAdvancedFilter ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {/* Advanced Filter Content - Platform Selection */}
        {showAdvancedFilter && (
          <div className="p-4 border-b border-gray-700/50 space-y-4">
            {/* Platform Categories */}
            <div>
              <p className="text-gray-400 text-sm mb-2">{isZh ? '遊戲平台分類' : 'Platform Categories'}</p>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (selectedCategories.includes(cat.id)) {
                        setSelectedCategories(selectedCategories.filter(c => c !== cat.id));
                      } else {
                        setSelectedCategories([...selectedCategories, cat.id]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedCategories.includes(cat.id)
                        ? 'bg-orange-500 text-white'
                        : 'bg-[#2a3548] text-gray-400 hover:text-white'
                    }`}
                  >
                    {isZh ? cat.label : cat.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Selection Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="px-3 py-1.5 text-xs bg-[#2a3548] text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                {isZh ? '全選' : 'Select All'}
              </button>
              <button
                onClick={handleInvertSelection}
                className="px-3 py-1.5 text-xs bg-[#2a3548] text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                {isZh ? '反選' : 'Invert'}
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-3 py-1.5 text-xs bg-[#2a3548] text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                {isZh ? '清除' : 'Clear'}
              </button>
            </div>

            {/* Platform Providers Grid */}
            <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
              {PLATFORM_PROVIDERS.map((provider) => (
                <label
                  key={provider}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <div
                    onClick={() => toggleProvider(provider)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      selectedProviders.includes(provider)
                        ? 'bg-orange-500 border-orange-500'
                        : 'border-gray-600 group-hover:border-orange-400'
                    }`}
                  >
                    {selectedProviders.includes(provider) && (
                      <Check size={12} className="text-white" />
                    )}
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-white">{provider}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Main Filter Bar */}
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setQuickFilter(filter.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    quickFilter === filter.key
                      ? 'bg-orange-500 text-white'
                      : 'bg-[#2a3548] text-gray-400 hover:text-white hover:bg-[#323d52]'
                  }`}
                >
                  {isZh ? filter.label : filter.labelEn}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Search Input */}
            <input
              type="text"
              placeholder={isZh ? '會員帳號' : 'Member Account'}
              value={searchAccount}
              onChange={(e) => setSearchAccount(e.target.value)}
              className="w-40 px-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">{isZh ? '投注時間' : 'Bet Time'}:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
              <span className="text-gray-500">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-[#2a3548] text-gray-400 rounded-lg hover:text-white transition-colors text-sm"
            >
              {isZh ? '重置' : 'Reset'}
            </button>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              <Search size={16} />
              {isZh ? '查詢' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">{isZh ? '機台充值' : 'Machine Deposit'}</p>
          <p className="text-xl font-bold text-blue-400">{formatCurrency(summary.machineDeposit)}</p>
        </div>
        <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">{isZh ? '額度存入' : 'Credit Deposit'}</p>
          <p className="text-xl font-bold text-green-400">{formatCurrency(summary.creditDeposit)}</p>
        </div>
        <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">{isZh ? '額度提取' : 'Credit Withdraw'}</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(summary.creditWithdraw)}</p>
        </div>
        <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">{isZh ? '會員輸贏' : 'Member W/L'}</p>
          <p className={`text-xl font-bold ${summary.memberWinLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(summary.memberWinLoss)}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl overflow-hidden">
        {/* Table Header with Export */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
          <h2 className="text-white font-medium">{isZh ? '投注記錄' : 'Betting Records'}</h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-1.5 border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500/10 transition-colors text-sm"
          >
            <Download size={16} />
            {isZh ? '導出數據' : 'Export'}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#2a3548]">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '投注時間' : 'Bet Time'}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '狀態' : 'Status'}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '投注平台' : 'Platform'}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '投注遊戲' : 'Game'}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '會員帳號' : 'Member'}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '所屬代理名稱' : 'Agent'}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '下注金額' : 'Bet Amount'}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '有效投注' : 'Valid Bets'}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '輸贏' : 'W/L'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw size={18} className="animate-spin" />
                      {isZh ? '載入中...' : 'Loading...'}
                    </div>
                  </td>
                </tr>
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    {isZh ? '暫無數據' : 'No data'}
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => (
                  <tr
                    key={record.id}
                    className={`border-t border-gray-700/30 hover:bg-[#2a3548]/50 transition-colors ${
                      index % 2 === 0 ? 'bg-[#1e2a3a]' : 'bg-[#232d3f]'
                    }`}
                  >
                    <td className="px-4 py-3 text-gray-300 text-sm">{formatDateTime(record.betTime)}</td>
                    <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                    <td className="px-4 py-3 text-white">{record.platform}</td>
                    <td className="px-4 py-3 text-gray-300">{record.game}</td>
                    <td className="px-4 py-3 text-white">{record.memberAccount}</td>
                    <td className="px-4 py-3 text-orange-400">{record.agentName}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(record.betAmount)}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(record.validBets)}</td>
                    <td className={`px-4 py-3 text-right ${record.winLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(record.winLoss)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
            <div className="text-sm text-gray-400">
              {isZh ? `共 ${records.length} 條記錄` : `Total ${records.length} records`}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-[#2a3548] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isZh ? '上一頁' : 'Prev'}
              </button>
              <span className="text-sm text-gray-400">
                {currentPage} / {Math.max(1, totalPages)}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 rounded bg-[#2a3548] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isZh ? '下一頁' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
