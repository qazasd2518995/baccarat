import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { agentReportApi } from '../services/api';

type TabType = 'agent' | 'member';

interface QuickFilter {
  key: string;
  label: string;
}

interface AgentReportData {
  id: string;
  username: string;
  nickname: string;
  agentLevel: number;
  sharePercent: number;
  rebatePercent: number;
  betCount: number;
  betAmount: number;
  validBet: number;
  memberWinLoss: number;
  memberRebate: number;
  personalShare: number;
  personalRebate: number;
  receivable: number;
  payable: number;
  profit: number;
}

interface MemberReportData {
  id: string;
  username: string;
  nickname: string;
  betCount: number;
  betAmount: number;
  validBet: number;
  memberWinLoss: number;
}

interface ReportResponse {
  currentUser: AgentReportData;
  agents?: AgentReportData[];
  members?: MemberReportData[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// Platform categories and their platforms
const PLATFORM_CATEGORIES = [
  { key: 'electronic', label: '電 子' },
  { key: 'lottery', label: '幸運奪寶' },
  { key: 'bingo', label: 'BINGO_TW' },
  { key: 'live3', label: '真人百家3館' },
  { key: 'live2', label: '真人百家2館' },
  { key: 'live1', label: '真人百家1館' },
  { key: 'sports', label: '體 育' },
];

const ALL_PLATFORMS = [
  'WOW', 'WOW', 'PANDA', 'Slotmill', 'Hacksaw', 'QT',
  'QT', 'RSG', 'RSG', '9Game', 'ATG', 'ATG',
  'GB', 'GB', 'RG', 'ZG', 'EG', 'GR',
  'GR', 'WE', 'GALAXSYS', 'TURBO', 'EVOPLAY', 'AMB',
  '幸運奪寶', 'BINGO_TW', 'Playtech', '御博真人電投', 'SPlus', 'TG',
  'WE Live', 'Sigma', 'PIX', 'IN-OUT', '100HP', '華利高真人電投',
  'MT真人', 'EEAI', 'T9真人', 'DG真人', 'RC真人', '卡利真人',
  '開元棋牌', 'SUPER體育',
];

export default function AgentReport() {
  const [activeTab, setActiveTab] = useState<TabType>('agent');
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('lastMonth');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const quickFilters: QuickFilter[] = [
    { key: 'today', label: '今 日' },
    { key: 'yesterday', label: '昨 日' },
    { key: 'thisWeek', label: '本 週' },
    { key: 'lastWeek', label: '上 週' },
    { key: 'thisMonth', label: '本 月' },
    { key: 'lastMonth', label: '上 月' },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab, quickFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = { quickFilter };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        delete params.quickFilter;
      }
      if (searchQuery) {
        params[activeTab === 'agent' ? 'agentId' : 'memberId'] = searchQuery;
      }

      const res = activeTab === 'agent'
        ? await agentReportApi.getAgentReport(params)
        : await agentReportApi.getMemberReport(params);

      setData(res.data);
      setPage(1);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
  };

  const handleExport = () => {
    if (!data) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel

    if (activeTab === 'agent') {
      csvContent += '代理账号,名称,层级,注单数,下注金额,有效投注,会员输赢,会员退水\n';
      data.agents?.forEach((a) => {
        csvContent += `${a.username},${a.nickname || ''},${a.agentLevel}级代理,${a.betCount},${a.betAmount},${a.validBet},${a.memberWinLoss},${a.memberRebate}\n`;
      });
    } else {
      csvContent += '会员账号,名称,注单数,下注金额,有效投注,会员输赢\n';
      data.members?.forEach((m) => {
        csvContent += `${m.username},${m.nickname || ''},${m.betCount},${m.betAmount},${m.validBet},${m.memberWinLoss}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab === 'agent' ? '代理报表' : '会员报表'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getValueColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(platform)) {
        newSet.delete(platform);
      } else {
        newSet.add(platform);
      }
      return newSet;
    });
  };

  const selectAllPlatforms = () => {
    setSelectedPlatforms(new Set(ALL_PLATFORMS));
  };

  const invertSelection = () => {
    setSelectedPlatforms((prev) => {
      const newSet = new Set<string>();
      ALL_PLATFORMS.forEach((p) => {
        if (!prev.has(p)) newSet.add(p);
      });
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedPlatforms(new Set());
  };

  // Pagination
  const items = activeTab === 'agent' ? (data?.agents || []) : (data?.members || []);
  const totalPages = Math.ceil(items.length / pageSize);
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-4">
      {/* Current User Summary Card */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1a1a] border-2 border-amber-500/50 rounded-lg overflow-hidden"
        >
          <div className="grid grid-cols-7 divide-x divide-[#333]">
            <div className="p-4 text-center">
              <div className="text-amber-400 font-bold text-sm">{data.currentUser.nickname || data.currentUser.username}</div>
              <div className="text-amber-400 text-xs">{data.currentUser.username}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-gray-400 text-xs">代理層級</div>
              <div className="text-white font-medium">{data.currentUser.agentLevel === 0 ? '管理員' : `${data.currentUser.agentLevel}級代理`}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-gray-400 text-xs">注單筆數</div>
              <div className="text-white font-medium">{data.currentUser.betCount.toLocaleString()}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-gray-400 text-xs">下注金額</div>
              <div className="text-white font-medium">{formatCurrency(data.currentUser.betAmount)}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-gray-400 text-xs">有效投注</div>
              <div className="text-white font-medium">{formatCurrency(data.currentUser.validBet)}</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-gray-400 text-xs">會員輸贏</div>
              <div className={`font-medium ${getValueColor(data.currentUser.memberWinLoss)}`}>
                {formatCurrency(data.currentUser.memberWinLoss)}
              </div>
            </div>
            <div className="p-4 text-center">
              <div className="text-gray-400 text-xs">會員退水</div>
              <div className="text-white font-medium">{formatCurrency(data.currentUser.memberRebate)}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-0 bg-[#1a1a1a] rounded-lg overflow-hidden border border-[#333]">
        <button
          onClick={() => setActiveTab('agent')}
          className={`py-3 text-center font-medium transition-all ${
            activeTab === 'agent'
              ? 'bg-amber-500 text-black'
              : 'text-gray-400 hover:text-white hover:bg-[#252525]'
          }`}
        >
          遊戲代理報表
        </button>
        <button
          onClick={() => setActiveTab('member')}
          className={`py-3 text-center font-medium transition-all ${
            activeTab === 'member'
              ? 'bg-amber-500 text-black'
              : 'text-gray-400 hover:text-white hover:bg-[#252525]'
          }`}
        >
          遊戲會員報表
        </button>
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

          {/* Category quick buttons (shown when collapsed) */}
          {!showFilters && (
            <div className="flex flex-wrap gap-2 ml-4">
              {PLATFORM_CATEGORIES.map((cat) => (
                <span
                  key={cat.key}
                  className="px-3 py-1 border border-dashed border-gray-600 text-gray-400 text-sm rounded"
                >
                  {cat.label}
                </span>
              ))}
            </div>
          )}
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
              <div className="p-4 space-y-4">
                {/* Category Buttons */}
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      className="px-4 py-2 border border-dashed border-gray-600 text-gray-300 text-sm rounded hover:border-amber-500 hover:text-amber-400 transition-colors"
                    >
                      {cat.label}
                    </button>
                  ))}
                  <button
                    onClick={selectAllPlatforms}
                    className="px-4 py-2 border border-dashed border-gray-600 text-gray-300 text-sm rounded hover:border-amber-500 hover:text-amber-400 transition-colors"
                  >
                    全 選
                  </button>
                  <button
                    onClick={invertSelection}
                    className="px-4 py-2 border border-dashed border-gray-600 text-gray-300 text-sm rounded hover:border-amber-500 hover:text-amber-400 transition-colors"
                  >
                    反 選
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-4 py-2 border border-dashed border-gray-600 text-gray-300 text-sm rounded hover:border-amber-500 hover:text-amber-400 transition-colors"
                  >
                    清 除
                  </button>
                </div>

                {/* Platform Checkboxes */}
                <div className="grid grid-cols-6 gap-3 pt-2">
                  {ALL_PLATFORMS.map((platform, idx) => (
                    <label
                      key={`${platform}-${idx}`}
                      className="flex items-center gap-2 text-gray-400 text-sm cursor-pointer hover:text-white"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.has(platform)}
                        onChange={() => togglePlatform(platform)}
                        className="w-4 h-4 rounded border-gray-600 bg-transparent text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                      />
                      {platform}
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick Filters, Search, Date Range */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Quick Filters */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">快速篩選</span>
          <div className="flex gap-1">
            {quickFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setQuickFilter(filter.key)}
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

        {/* Agent/Member Search */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{activeTab === 'agent' ? '代理帳號' : '會員帳號'}</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500 w-32"
            placeholder="請輸入代..."
          />
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <span className="text-red-400 text-sm">*</span>
          <span className="text-gray-400 text-sm">查詢時間</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500"
            />
            <span className="text-gray-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Export & Search Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#444] text-sm rounded transition-colors"
          >
            <Download className="w-4 h-4" />
            導出
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

      {/* Data Display */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">加載中...</div>
        </div>
      ) : activeTab === 'agent' ? (
        <div className="space-y-3">
          {/* Section Header */}
          <div className="text-amber-400 font-medium text-sm">
            {data?.currentUser.nickname || data?.currentUser.username}
          </div>

          {/* Agent Cards */}
          {paginatedItems.length > 0 ? (
            (paginatedItems as AgentReportData[]).map((agent) => (
              <div
                key={agent.id}
                className="bg-[#f5f5f5] rounded-lg overflow-hidden"
              >
                <div className="grid grid-cols-7 divide-x divide-gray-300">
                  <div className="p-4 text-center">
                    <div className="text-amber-600 font-bold text-sm">{agent.nickname || agent.username}</div>
                    <div className="text-amber-600 text-xs">{agent.username}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">代理層級</div>
                    <div className="text-gray-800 font-medium">{agent.agentLevel}級代理</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">注單筆數</div>
                    <div className="text-gray-800 font-medium">{agent.betCount.toLocaleString()}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">下注金額</div>
                    <div className="text-gray-800 font-medium">{formatCurrency(agent.betAmount)}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">有效投注</div>
                    <div className="text-gray-800 font-medium">{formatCurrency(agent.validBet)}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">會員輸贏</div>
                    <div className={`font-medium ${agent.memberWinLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(agent.memberWinLoss)}
                    </div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">會員退水</div>
                    <div className="text-gray-800 font-medium">{formatCurrency(agent.memberRebate)}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-8 text-center text-gray-400">
              暫無數據
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Section Header */}
          <div className="text-amber-400 font-medium text-sm">
            {data?.currentUser.nickname || data?.currentUser.username}
          </div>

          {/* Member Cards */}
          {paginatedItems.length > 0 ? (
            (paginatedItems as MemberReportData[]).map((member) => (
              <div
                key={member.id}
                className="bg-[#f5f5f5] rounded-lg overflow-hidden"
              >
                <div className="grid grid-cols-5 divide-x divide-gray-300">
                  <div className="p-4 text-center">
                    <div className="text-amber-600 font-bold text-sm">{member.nickname || member.username}</div>
                    <div className="text-amber-600 text-xs">{member.username}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">注單筆數</div>
                    <div className="text-gray-800 font-medium">{member.betCount.toLocaleString()}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">下注金額</div>
                    <div className="text-gray-800 font-medium">{formatCurrency(member.betAmount)}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">有效投注</div>
                    <div className="text-gray-800 font-medium">{formatCurrency(member.validBet)}</div>
                  </div>
                  <div className="p-4 text-center">
                    <div className="text-gray-500 text-xs">會員輸贏</div>
                    <div className={`font-medium ${member.memberWinLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(member.memberWinLoss)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-8 text-center text-gray-400">
              暫無數據
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {items.length > 0 && (
        <div className="flex items-center justify-end gap-4">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded text-sm transition-colors ${
                    page === pageNum
                      ? 'bg-amber-500 text-black font-medium'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
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
        </div>
      )}
    </div>
  );
}
