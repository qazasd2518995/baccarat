import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { reportApi } from '../../services/api';

type ReportTab = 'agent' | 'member';
type QuickFilter = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';

interface AccountSummary {
  accountType: string;
  agentLevel: string;
  betCount: number;
  betAmount: number;
  validBets: number;
  memberWinLoss: number;
  memberRebate: number;
  personalShare: number;
  personalRebate: number;
}

interface AgentReportItem {
  agentId: string;
  username: string;
  level: number;
  betCount: number;
  betAmount: number;
  validBets: number;
  winLoss: number;
  rebate: number;
  share: number;
}

interface MemberReportItem {
  memberId: string;
  username: string;
  agentUsername: string;
  betCount: number;
  betAmount: number;
  validBets: number;
  winLoss: number;
}

export default function Reports() {
  const { i18n } = useTranslation();
  useAuthStore();
  const isZh = i18n.language === 'zh';

  const [activeTab, setActiveTab] = useState<ReportTab>('agent');
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('thisMonth');
  const [searchAccount, setSearchAccount] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  // Data
  const [summary, setSummary] = useState<AccountSummary>({
    accountType: '信用客服帳號',
    agentLevel: '4級代理',
    betCount: 0,
    betAmount: 0,
    validBets: 0,
    memberWinLoss: 0,
    memberRebate: 0,
    personalShare: 0,
    personalRebate: 0,
  });
  const [agentReports, setAgentReports] = useState<AgentReportItem[]>([]);
  const [memberReports, setMemberReports] = useState<MemberReportItem[]>([]);
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
      fetchReport();
    }
  }, [activeTab, dateFrom, dateTo]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { from: dateFrom, to: dateTo };

      if (activeTab === 'member') {
        const response = await reportApi.getMemberReport(params);
        const reports = response.data.report || [];
        setMemberReports(reports.map((r: any) => ({
          memberId: r.userId,
          username: r.username,
          agentUsername: r.agentUsername || '-',
          betCount: r.roundsPlayed || 0,
          betAmount: r.totalBets || 0,
          validBets: r.totalBets || 0,
          winLoss: r.netResult || 0,
        })));

        const totals = response.data.totals || {};
        setSummary(prev => ({
          ...prev,
          betCount: totals.totalRounds || 0,
          betAmount: totals.totalBets || 0,
          validBets: totals.totalBets || 0,
          memberWinLoss: totals.netProfit || 0,
        }));
      } else {
        const response = await reportApi.getAgentReport(params);
        const reports = response.data.report || [];
        setAgentReports(reports.map((r: any) => ({
          agentId: r.agentId,
          username: r.username,
          level: r.level || 5,
          betCount: r.betCount || 0,
          betAmount: r.totalBets || 0,
          validBets: r.totalBets || 0,
          winLoss: r.netProfit || 0,
          rebate: r.rebate || 0,
          share: r.share || 0,
        })));

        const totals = response.data.totals || {};
        setSummary(prev => ({
          ...prev,
          betCount: totals.totalRounds || 0,
          betAmount: totals.totalBets || 0,
          validBets: totals.totalBets || 0,
          memberWinLoss: totals.netProfit || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setAgentReports([]);
      setMemberReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchReport();
  };

  const handleReset = () => {
    setSearchAccount('');
    setQuickFilter('thisMonth');
    setCurrentPage(1);
  };

  const handleExport = () => {
    let headers: string[];
    let rows: (string | number)[][];

    if (activeTab === 'member') {
      headers = ['會員帳號', '所屬代理', '注單筆數', '下注金額', '有效投注', '輸贏'];
      rows = memberReports.map((r) => [
        r.username,
        r.agentUsername,
        r.betCount,
        r.betAmount,
        r.validBets,
        r.winLoss,
      ]);
    } else {
      headers = ['代理帳號', '層級', '注單筆數', '下注金額', '有效投注', '輸贏', '退水', '佔成'];
      rows = agentReports.map((r) => [
        r.username,
        `${r.level}級代理`,
        r.betCount,
        r.betAmount,
        r.validBets,
        r.winLoss,
        r.rebate,
        r.share,
      ]);
    }

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-report-${dateFrom}-${dateTo}.csv`;
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const quickFilters: { key: QuickFilter; label: string; labelEn: string }[] = [
    { key: 'today', label: '今日', labelEn: 'Today' },
    { key: 'yesterday', label: '昨日', labelEn: 'Yesterday' },
    { key: 'thisWeek', label: '本週', labelEn: 'This Week' },
    { key: 'lastWeek', label: '上週', labelEn: 'Last Week' },
    { key: 'thisMonth', label: '本月', labelEn: 'This Month' },
    { key: 'lastMonth', label: '上月', labelEn: 'Last Month' },
  ];

  // Calculate pagination
  const currentData = activeTab === 'agent' ? agentReports : memberReports;
  const totalPages = Math.ceil(currentData.length / pageSize);
  const paginatedData = currentData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Top Account Summary Bar */}
      <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '信用客服帳號' : 'Credit Service'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '代理層級' : 'Agent Level'}:</span>
            <span className="text-orange-400">{summary.agentLevel}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '注單筆數' : 'Bet Count'}:</span>
            <span className="text-white">{formatNumber(summary.betCount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '下注金額' : 'Bet Amount'}:</span>
            <span className="text-white">{formatCurrency(summary.betAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '有效投注' : 'Valid Bets'}:</span>
            <span className="text-white">{formatCurrency(summary.validBets)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '會員輸贏' : 'Member W/L'}:</span>
            <span className={summary.memberWinLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
              {formatCurrency(summary.memberWinLoss)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '會員退水' : 'Member Rebate'}:</span>
            <span className="text-blue-400">{formatCurrency(summary.memberRebate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '個人佔成' : 'Personal Share'}:</span>
            <span className="text-purple-400">{formatCurrency(summary.personalShare)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '個人退水' : 'Personal Rebate'}:</span>
            <span className="text-orange-400 font-medium">{formatCurrency(summary.personalRebate)}</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-[#141922] rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('agent')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'agent'
              ? 'bg-orange-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {isZh ? '遊戲代理報表' : 'Agent Report'}
        </button>
        <button
          onClick={() => setActiveTab('member')}
          className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'member'
              ? 'bg-orange-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {isZh ? '遊戲會員報表' : 'Member Report'}
        </button>
      </div>

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

        {/* Advanced Filter Content */}
        {showAdvancedFilter && (
          <div className="p-4 border-b border-gray-700/50">
            <p className="text-gray-500 text-sm">{isZh ? '遊戲平台篩選（暫無）' : 'Game platform filter (none)'}</p>
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
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={isZh ? (activeTab === 'agent' ? '代理帳號' : '會員帳號') : (activeTab === 'agent' ? 'Agent Account' : 'Member Account')}
                value={searchAccount}
                onChange={(e) => setSearchAccount(e.target.value)}
                className="w-40 px-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">{isZh ? '查詢時間' : 'Date Range'}:</span>
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

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 border border-orange-500 text-orange-400 rounded-lg hover:bg-orange-500/10 transition-colors text-sm"
            >
              <Download size={16} />
              {isZh ? '導出' : 'Export'}
            </button>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
            >
              <Search size={16} />
              {isZh ? '查詢' : 'Search'}
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-[#2a3548] text-gray-400 rounded-lg hover:text-white transition-colors text-sm"
            >
              <RefreshCw size={16} />
              {isZh ? '重置' : 'Reset'}
            </button>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl overflow-hidden">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#2a3548]">
                {activeTab === 'agent' ? (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '代理帳號' : 'Agent'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '層級' : 'Level'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '注單筆數' : 'Bet Count'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '下注金額' : 'Bet Amount'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '有效投注' : 'Valid Bets'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '輸贏' : 'W/L'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '退水' : 'Rebate'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '佔成' : 'Share'}</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '會員帳號' : 'Member'}</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">{isZh ? '所屬代理' : 'Agent'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '注單筆數' : 'Bet Count'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '下注金額' : 'Bet Amount'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '有效投注' : 'Valid Bets'}</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">{isZh ? '輸贏' : 'W/L'}</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeTab === 'agent' ? 8 : 6} className="px-4 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-400">
                      <RefreshCw size={18} className="animate-spin" />
                      {isZh ? '載入中...' : 'Loading...'}
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'agent' ? 8 : 6} className="px-4 py-12 text-center text-gray-500">
                    {isZh ? '暫無數據' : 'No data'}
                  </td>
                </tr>
              ) : activeTab === 'agent' ? (
                (paginatedData as AgentReportItem[]).map((item, index) => (
                  <tr
                    key={item.agentId}
                    className={`border-t border-gray-700/30 hover:bg-[#2a3548]/50 transition-colors ${
                      index % 2 === 0 ? 'bg-[#1e2a3a]' : 'bg-[#232d3f]'
                    }`}
                  >
                    <td className="px-4 py-3 text-white">{item.username}</td>
                    <td className="px-4 py-3 text-orange-400">{item.level}{isZh ? '級代理' : ' Level'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{formatNumber(item.betCount)}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(item.betAmount)}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(item.validBets)}</td>
                    <td className={`px-4 py-3 text-right ${item.winLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(item.winLoss)}
                    </td>
                    <td className="px-4 py-3 text-right text-blue-400">{formatCurrency(item.rebate)}</td>
                    <td className="px-4 py-3 text-right text-purple-400">{formatCurrency(item.share)}</td>
                  </tr>
                ))
              ) : (
                (paginatedData as MemberReportItem[]).map((item, index) => (
                  <tr
                    key={item.memberId}
                    className={`border-t border-gray-700/30 hover:bg-[#2a3548]/50 transition-colors ${
                      index % 2 === 0 ? 'bg-[#1e2a3a]' : 'bg-[#232d3f]'
                    }`}
                  >
                    <td className="px-4 py-3 text-white">{item.username}</td>
                    <td className="px-4 py-3 text-orange-400">{item.agentUsername}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{formatNumber(item.betCount)}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(item.betAmount)}</td>
                    <td className="px-4 py-3 text-right text-white">{formatCurrency(item.validBets)}</td>
                    <td className={`px-4 py-3 text-right ${item.winLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(item.winLoss)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50">
            <div className="text-sm text-gray-400">
              {isZh ? `共 ${currentData.length} 條記錄` : `Total ${currentData.length} records`}
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
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-[#2a3548] text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isZh ? '下一頁' : 'Next'}
              </button>
              <select
                value={pageSize}
                onChange={() => {}}
                className="px-2 py-1 bg-[#2a3548] border border-gray-700/50 rounded text-sm text-gray-300"
              >
                <option value={10}>10{isZh ? '條/頁' : '/page'}</option>
                <option value={20}>20{isZh ? '條/頁' : '/page'}</option>
                <option value={50}>50{isZh ? '條/頁' : '/page'}</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
