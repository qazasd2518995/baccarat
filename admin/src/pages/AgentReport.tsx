import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Download,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
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

interface SummaryData {
  agentLevel: number;
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
  memberRebate: number;
  personalShare: number;
  personalRebate: number;
  receivable: number;
  payable: number;
  profit: number;
}

interface BreadcrumbItem {
  id: string;
  username: string;
  nickname: string | null;
}

interface ReportResponse {
  currentUser: AgentReportData;
  agents?: AgentReportData[];
  members?: MemberReportData[];
  subAgentsSummary?: SummaryData;
  directMembersSummary?: SummaryData;
  breadcrumb?: BreadcrumbItem[];
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

interface PlatformDetail {
  platform: string;
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
  sharePercent: number;
  rebatePercent: number;
}

// Platform categories - JW Games
const PLATFORM_CATEGORIES = [
  { key: 'jw_live', label: 'JW真人' },
];

const ALL_PLATFORMS = [
  'JW百家樂',
  'JW龍虎',
  'JW牛牛',
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
  const [viewAgentId, setViewAgentId] = useState<string | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailAgent, setDetailAgent] = useState<AgentReportData | null>(null);
  const [platformDetails, setPlatformDetails] = useState<PlatformDetail[]>([]);
  const [memberDetailModalOpen, setMemberDetailModalOpen] = useState(false);
  const [detailMember, setDetailMember] = useState<MemberReportData | null>(null);
  const [memberPlatformDetails, setMemberPlatformDetails] = useState<PlatformDetail[]>([]);

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
  }, [activeTab, quickFilter, viewAgentId]);

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
      if (viewAgentId) {
        params.viewAgentId = viewAgentId;
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

    let csvContent = '\uFEFF';

    if (activeTab === 'agent') {
      csvContent += '代理帳號,名稱,層級,注單筆數,下注金額,有效投注,會員輸贏,會員退水,個人佔成,個人退水,應收下線,應繳上線,個人盈虧\n';
      data.agents?.forEach((a) => {
        csvContent += `${a.username},${a.nickname || ''},${a.agentLevel}級代理,${a.betCount},${a.betAmount},${a.validBet},${a.memberWinLoss},${a.memberRebate},${a.personalShare},${a.personalRebate},${a.receivable},${a.payable},${a.profit}\n`;
      });
    } else {
      csvContent += '會員帳號,名稱,注單筆數,下注金額,有效投注,會員輸贏\n';
      data.members?.forEach((m) => {
        csvContent += `${m.username},${m.nickname || ''},${m.betCount},${m.betAmount},${m.validBet},${m.memberWinLoss}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTab === 'agent' ? '代理報表' : '會員報表'}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getValueColor = (value: number) => {
    if (value > 0) return 'text-green-500';
    if (value < 0) return 'text-red-500';
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

  const selectAllPlatforms = () => setSelectedPlatforms(new Set(ALL_PLATFORMS));
  const invertSelection = () => {
    setSelectedPlatforms((prev) => {
      const newSet = new Set<string>();
      ALL_PLATFORMS.forEach((p) => {
        if (!prev.has(p)) newSet.add(p);
      });
      return newSet;
    });
  };
  const clearSelection = () => setSelectedPlatforms(new Set());

  const handleAgentClick = (agentId: string) => {
    setViewAgentId(agentId);
  };

  const handleBreadcrumbClick = (agentId: string, index: number) => {
    if (index === 0) {
      setViewAgentId(null);
    } else {
      setViewAgentId(agentId);
    }
  };

  const handleGoBack = () => {
    if (data?.breadcrumb && data.breadcrumb.length > 1) {
      const parentIndex = data.breadcrumb.length - 2;
      if (parentIndex === 0) {
        setViewAgentId(null);
      } else {
        setViewAgentId(data.breadcrumb[parentIndex].id);
      }
    }
  };

  const handleDetailClick = async (agent: AgentReportData) => {
    setDetailAgent(agent);
    setPlatformDetails([]);
    setDetailModalOpen(true);

    try {
      const params: any = {
        targetId: agent.id,
        targetType: 'agent',
        quickFilter
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        delete params.quickFilter;
      }

      const res = await agentReportApi.getPlatformDetail(params);
      setPlatformDetails(res.data.platforms || []);
    } catch (err) {
      console.error('Failed to fetch platform detail:', err);
    }
  };

  const handleMemberDetailClick = async (member: MemberReportData) => {
    setDetailMember(member);
    setMemberPlatformDetails([]);
    setMemberDetailModalOpen(true);

    try {
      const params: any = {
        targetId: member.id,
        targetType: 'member',
        quickFilter
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        delete params.quickFilter;
      }

      const res = await agentReportApi.getPlatformDetail(params);
      setMemberPlatformDetails(res.data.platforms || []);
    } catch (err) {
      console.error('Failed to fetch member platform detail:', err);
    }
  };

  // Pagination
  const items = activeTab === 'agent' ? (data?.agents || []) : (data?.members || []);
  const totalPages = Math.ceil(items.length / pageSize);
  const paginatedItems = items.slice((page - 1) * pageSize, page * pageSize);

  // Summary Row Component (for top cards when viewing sub-agent)
  const SummaryCard = ({ title, summaryData, showDetailBtn = false }: { title: string; summaryData: SummaryData | AgentReportData; showDetailBtn?: boolean }) => (
    <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
      <table className="w-full text-sm table-fixed">
        <colgroup>
          <col style={{ width: '10%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '7%' }} />
          <col style={{ width: '8%' }} />
          <col style={{ width: '9%' }} />
        </colgroup>
        <tbody>
          <tr>
            <td className="px-3 py-3 border-r border-[#333]">
              <div className="text-white font-medium truncate">{title}</div>
              {'username' in summaryData && (
                <div className="text-gray-500 text-xs truncate">{summaryData.username}</div>
              )}
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">代理層級</div>
              <div className="text-white">{summaryData.agentLevel >= 0 ? `${summaryData.agentLevel}級代理` : '5級代理'}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">注單筆數</div>
              <div className="text-white">{summaryData.betCount.toLocaleString()}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">下注金額</div>
              <div className="text-white">{formatCurrency(summaryData.betAmount)}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">有效投注</div>
              <div className="text-white">{formatCurrency(summaryData.validBet)}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">會員輸贏</div>
              <div className={getValueColor(summaryData.memberWinLoss)}>{formatCurrency(summaryData.memberWinLoss)}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">會員退水</div>
              <div className="text-white">{formatCurrency(summaryData.memberRebate)}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">個人佔成</div>
              <div className="text-white">{formatCurrency(summaryData.personalShare)}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">個人退水</div>
              <div className={getValueColor(summaryData.personalRebate)}>{formatCurrency(summaryData.personalRebate)}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">應收下線</div>
              <div className="text-white">{formatCurrency(summaryData.receivable)}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">應繳上線</div>
              <div className={getValueColor(summaryData.payable)}>{formatCurrency(summaryData.payable)}</div>
            </td>
            <td className="px-2 py-3 text-center border-r border-[#333]">
              <div className="text-gray-500 text-xs">個人盈虧</div>
              <div className={getValueColor(summaryData.profit)}>{formatCurrency(summaryData.profit)}</div>
            </td>
            <td className="px-2 py-3 text-center">
              {showDetailBtn && 'id' in summaryData ? (
                <button
                  onClick={() => handleDetailClick(summaryData as AgentReportData)}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-black text-xs font-medium rounded transition-colors"
                >
                  明細
                </button>
              ) : (
                <span className="px-3 py-1 text-xs invisible">佔位</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top Summary Cards - Show when viewing sub-agent */}
      {viewAgentId && data && (
        <div className="space-y-2">
          {data.subAgentsSummary && (
            <SummaryCard title="下線代理輸贏總和" summaryData={data.subAgentsSummary} />
          )}
          {data.directMembersSummary && (
            <SummaryCard title="直屬會員輸贏總和" summaryData={data.directMembersSummary} />
          )}
          <SummaryCard
            title={data.currentUser.nickname || data.currentUser.username}
            summaryData={data.currentUser}
            showDetailBtn={true}
          />
        </div>
      )}

      {/* Current User Summary Card - Show only at root level */}
      {!viewAgentId && data && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden"
        >
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="px-4 py-3 border-r border-[#333]">
                  <div className="text-amber-400 font-bold">{data.currentUser.nickname || data.currentUser.username}</div>
                  <div className="text-gray-500 text-xs">{data.currentUser.username}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">代理層級</div>
                  <div className="text-white">{data.currentUser.agentLevel === 0 ? '管理員' : `${data.currentUser.agentLevel}級代理`}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">注單筆數</div>
                  <div className="text-white">{data.currentUser.betCount.toLocaleString()}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">下注金額</div>
                  <div className="text-white">{formatCurrency(data.currentUser.betAmount)}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">有效投注</div>
                  <div className="text-white">{formatCurrency(data.currentUser.validBet)}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">會員輸贏</div>
                  <div className={getValueColor(data.currentUser.memberWinLoss)}>{formatCurrency(data.currentUser.memberWinLoss)}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">會員退水</div>
                  <div className="text-white">{formatCurrency(data.currentUser.memberRebate)}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">個人佔成</div>
                  <div className="text-white">{formatCurrency(data.currentUser.personalShare)}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">個人退水</div>
                  <div className={getValueColor(data.currentUser.personalRebate)}>{formatCurrency(data.currentUser.personalRebate)}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">應收下線</div>
                  <div className="text-white">{formatCurrency(data.currentUser.receivable)}</div>
                </td>
                <td className="px-4 py-3 text-center border-r border-[#333]">
                  <div className="text-gray-500 text-xs">應繳上線</div>
                  <div className={getValueColor(data.currentUser.payable)}>{formatCurrency(data.currentUser.payable)}</div>
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="text-gray-500 text-xs">個人盈虧</div>
                  <div className={getValueColor(data.currentUser.profit)}>{formatCurrency(data.currentUser.profit)}</div>
                </td>
              </tr>
            </tbody>
          </table>
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
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      className="px-4 py-2 border border-dashed border-gray-600 text-gray-300 text-sm rounded hover:border-amber-500 hover:text-amber-400 transition-colors"
                    >
                      {cat.label}
                    </button>
                  ))}
                  <button onClick={selectAllPlatforms} className="px-4 py-2 border border-dashed border-gray-600 text-gray-300 text-sm rounded hover:border-amber-500 hover:text-amber-400 transition-colors">
                    全 選
                  </button>
                  <button onClick={invertSelection} className="px-4 py-2 border border-dashed border-gray-600 text-gray-300 text-sm rounded hover:border-amber-500 hover:text-amber-400 transition-colors">
                    反 選
                  </button>
                  <button onClick={clearSelection} className="px-4 py-2 border border-dashed border-gray-600 text-gray-300 text-sm rounded hover:border-amber-500 hover:text-amber-400 transition-colors">
                    清 除
                  </button>
                </div>

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

        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">{activeTab === 'agent' ? '代理帳號' : '會員帳號'}</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="請輸入代理帳號"
            className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded text-white text-sm focus:outline-none focus:border-amber-500 w-40"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-red-400 text-sm">*</span>
          <span className="text-gray-400 text-sm">查詢時間</span>
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

        <div className="flex-1" />

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

      {/* Breadcrumb */}
      {data?.breadcrumb && data.breadcrumb.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          {data.breadcrumb.map((item, index) => (
            <span key={item.id} className="flex items-center gap-2">
              {index > 0 && <span className="text-gray-500">/</span>}
              <button
                onClick={() => handleBreadcrumbClick(item.id, index)}
                className={`hover:underline transition-colors ${
                  index === data.breadcrumb!.length - 1 ? 'text-white' : 'text-amber-400'
                }`}
              >
                {item.nickname || item.username}
              </button>
            </span>
          ))}
          <button
            onClick={handleGoBack}
            className="ml-4 text-gray-400 hover:text-white text-sm transition-colors"
          >
            返回上一級
          </button>
        </div>
      )}

      {/* Data Display */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">加載中...</div>
        </div>
      ) : activeTab === 'agent' ? (
        <div className="space-y-3">
          {/* Agent Table */}
          {paginatedItems.length > 0 ? (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#252525] text-gray-400">
                      <th className="px-4 py-3 text-left">代理帳號</th>
                      <th className="px-4 py-3 text-center">代理層級</th>
                      <th className="px-4 py-3 text-right">注單筆數</th>
                      <th className="px-4 py-3 text-right">下注金額</th>
                      <th className="px-4 py-3 text-right">有效投注</th>
                      <th className="px-4 py-3 text-right">會員輸贏</th>
                      <th className="px-4 py-3 text-right">會員退水</th>
                      <th className="px-4 py-3 text-right">個人佔成</th>
                      <th className="px-4 py-3 text-right">個人退水</th>
                      <th className="px-4 py-3 text-right">應收下線</th>
                      <th className="px-4 py-3 text-right">應繳上線</th>
                      <th className="px-4 py-3 text-right">個人盈虧</th>
                      <th className="px-4 py-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(paginatedItems as AgentReportData[]).map((agent, index) => (
                      <tr
                        key={agent.id}
                        className={`border-t border-[#333] hover:bg-[#252525] ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e1e]'}`}
                      >
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleAgentClick(agent.id)}
                            className="text-left group cursor-pointer"
                          >
                            <div className="text-amber-400 font-medium group-hover:text-amber-300 group-hover:underline transition-colors flex items-center gap-1">
                              {agent.nickname || agent.username}
                              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-gray-500 text-xs group-hover:text-gray-400 transition-colors">{agent.username}</div>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-center text-white">{agent.agentLevel}級代理</td>
                        <td className="px-4 py-3 text-right text-white">{agent.betCount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.betAmount)}</td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.validBet)}</td>
                        <td className={`px-4 py-3 text-right ${getValueColor(agent.memberWinLoss)}`}>{formatCurrency(agent.memberWinLoss)}</td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.memberRebate)}</td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.personalShare)}</td>
                        <td className={`px-4 py-3 text-right ${getValueColor(agent.personalRebate)}`}>{formatCurrency(agent.personalRebate)}</td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.receivable)}</td>
                        <td className={`px-4 py-3 text-right ${getValueColor(agent.payable)}`}>{formatCurrency(agent.payable)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${getValueColor(agent.profit)}`}>{formatCurrency(agent.profit)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDetailClick(agent)}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-black text-xs font-medium rounded transition-colors"
                            >
                              明細
                            </button>
                            <button className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium rounded transition-colors">
                              佔成/退水
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-8 text-center text-gray-400">
              暫無數據
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedItems.length > 0 ? (
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#252525] text-gray-400">
                      <th className="px-4 py-3 text-left">會員帳號</th>
                      <th className="px-4 py-3 text-right">注單筆數</th>
                      <th className="px-4 py-3 text-right">下注金額</th>
                      <th className="px-4 py-3 text-right">有效投注</th>
                      <th className="px-4 py-3 text-right">會員輸贏</th>
                      <th className="px-4 py-3 text-right">會員退水</th>
                      <th className="px-4 py-3 text-right">個人佔成</th>
                      <th className="px-4 py-3 text-right">個人退水</th>
                      <th className="px-4 py-3 text-right">應收下線</th>
                      <th className="px-4 py-3 text-right">應繳上線</th>
                      <th className="px-4 py-3 text-right">個人盈虧</th>
                      <th className="px-4 py-3 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(paginatedItems as MemberReportData[]).map((member, index) => (
                      <tr
                        key={member.id}
                        className={`border-t border-[#333] hover:bg-[#252525] ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#1e1e1e]'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="text-amber-400 font-medium">{member.nickname || member.username}</div>
                          <div className="text-gray-500 text-xs">{member.username}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-white">{member.betCount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(member.betAmount)}</td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(member.validBet)}</td>
                        <td className={`px-4 py-3 text-right ${getValueColor(member.memberWinLoss)}`}>
                          {formatCurrency(member.memberWinLoss)}
                        </td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(member.memberRebate)}</td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(member.personalShare)}</td>
                        <td className={`px-4 py-3 text-right ${getValueColor(member.personalRebate)}`}>
                          {formatCurrency(member.personalRebate)}
                        </td>
                        <td className="px-4 py-3 text-right text-white">{formatCurrency(member.receivable)}</td>
                        <td className={`px-4 py-3 text-right ${getValueColor(member.payable)}`}>
                          {formatCurrency(member.payable)}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${getValueColor(member.profit)}`}>
                          {formatCurrency(member.profit)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleMemberDetailClick(member)}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-black text-xs font-medium rounded transition-colors"
                          >
                            明細
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detailModalOpen && detailAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setDetailModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#333]">
                <h2 className="text-white font-medium">查看詳情</h2>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
                {/* Agent Summary Row */}
                <div className="bg-[#252525] border border-[#333] rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="px-4 py-3 border-r border-[#333]">
                          <div className="text-gray-500 text-xs">代理帳號</div>
                          <div className="text-amber-400 font-medium">{detailAgent.nickname || detailAgent.username}</div>
                          <div className="text-gray-500 text-xs">{detailAgent.username}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">注單筆數</div>
                          <div className="text-white">{detailAgent.betCount.toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">下注金額</div>
                          <div className="text-white">{formatCurrency(detailAgent.betAmount)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">有效投注</div>
                          <div className="text-white">{formatCurrency(detailAgent.validBet)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">會員輸贏</div>
                          <div className={getValueColor(detailAgent.memberWinLoss)}>{formatCurrency(detailAgent.memberWinLoss)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">會員退水</div>
                          <div className="text-white">{formatCurrency(detailAgent.memberRebate)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">個人佔成</div>
                          <div className="text-white">{formatCurrency(detailAgent.personalShare)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">個人退水</div>
                          <div className={getValueColor(detailAgent.personalRebate)}>{formatCurrency(detailAgent.personalRebate)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">應收下線</div>
                          <div className="text-white">{formatCurrency(detailAgent.receivable)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">應繳上線</div>
                          <div className={getValueColor(detailAgent.payable)}>{formatCurrency(detailAgent.payable)}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-gray-500 text-xs">個人盈虧</div>
                          <div className={getValueColor(detailAgent.profit)}>{formatCurrency(detailAgent.profit)}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Export Button */}
                <div className="flex justify-end mb-4">
                  <button className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded transition-colors">
                    <Download className="w-4 h-4" />
                    導 出
                  </button>
                </div>

                {/* Platform Details Table */}
                <div className="bg-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#252525] text-gray-400">
                        <th className="px-4 py-3 text-left">廠商名稱</th>
                        <th className="px-4 py-3 text-right">注單筆數</th>
                        <th className="px-4 py-3 text-right">下注金額</th>
                        <th className="px-4 py-3 text-right">有效投注</th>
                        <th className="px-4 py-3 text-right">會員輸贏</th>
                        <th className="px-4 py-3 text-right">會員退水</th>
                        <th className="px-4 py-3 text-right">個人佔成</th>
                        <th className="px-4 py-3 text-right">個人退水</th>
                        <th className="px-4 py-3 text-right">應收下線</th>
                        <th className="px-4 py-3 text-right">應繳上線</th>
                        <th className="px-4 py-3 text-right">個人盈虧</th>
                        <th className="px-4 py-3 text-center">佔成</th>
                        <th className="px-4 py-3 text-center">退水</th>
                      </tr>
                    </thead>
                    <tbody>
                      {platformDetails.map((detail, index) => (
                        <tr
                          key={detail.platform}
                          className={`border-t border-[#333] ${index % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#222]'}`}
                        >
                          <td className="px-4 py-3">
                            <div className="text-gray-500 text-xs">廠商名稱</div>
                            <div className="text-white font-medium">{detail.platform}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">注單筆數</div>
                            <div className="text-white">{detail.betCount.toLocaleString()}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">下注金額</div>
                            <div className="text-white">{formatCurrency(detail.betAmount)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">有效投注</div>
                            <div className="text-white">{formatCurrency(detail.validBet)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">會員輸贏</div>
                            <div className={getValueColor(detail.memberWinLoss)}>{formatCurrency(detail.memberWinLoss)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">會員退水</div>
                            <div className="text-white">{formatCurrency(detail.memberRebate)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">個人佔成</div>
                            <div className="text-white">{formatCurrency(detail.personalShare)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">個人退水</div>
                            <div className={getValueColor(detail.personalRebate)}>{formatCurrency(detail.personalRebate)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">應收下線</div>
                            <div className="text-white">{formatCurrency(detail.receivable)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">應繳上線</div>
                            <div className={getValueColor(detail.payable)}>{formatCurrency(detail.payable)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">個人盈虧</div>
                            <div className={getValueColor(detail.profit)}>{formatCurrency(detail.profit)}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="text-gray-500 text-xs">佔成</div>
                            <div className="text-white">{detail.sharePercent}%</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="text-gray-500 text-xs">退水</div>
                            <div className="text-white">{detail.rebatePercent}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member Detail Modal */}
      <AnimatePresence>
        {memberDetailModalOpen && detailMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
            onClick={() => setMemberDetailModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1a1a] border border-[#333] rounded-lg w-full max-w-7xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-[#333]">
                <h2 className="text-white font-medium">查看詳情</h2>
                <button
                  onClick={() => setMemberDetailModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
                {/* Member Summary Row */}
                <div className="bg-[#252525] border border-[#333] rounded-lg overflow-hidden mb-4">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr>
                        <td className="px-4 py-3 border-r border-[#333]">
                          <div className="text-gray-500 text-xs">會員帳號</div>
                          <div className="text-amber-400 font-medium">{detailMember.nickname || detailMember.username}</div>
                          <div className="text-gray-500 text-xs">{detailMember.username}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">注單筆數</div>
                          <div className="text-white">{detailMember.betCount.toLocaleString()}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">下注金額</div>
                          <div className="text-white">{formatCurrency(detailMember.betAmount)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">有效投注</div>
                          <div className="text-white">{formatCurrency(detailMember.validBet)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">會員輸贏</div>
                          <div className={getValueColor(detailMember.memberWinLoss)}>{formatCurrency(detailMember.memberWinLoss)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">會員退水</div>
                          <div className="text-white">{formatCurrency(detailMember.memberRebate)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">個人佔成</div>
                          <div className="text-white">{formatCurrency(detailMember.personalShare)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">個人退水</div>
                          <div className={getValueColor(detailMember.personalRebate)}>{formatCurrency(detailMember.personalRebate)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">應收下線</div>
                          <div className="text-white">{formatCurrency(detailMember.receivable)}</div>
                        </td>
                        <td className="px-4 py-3 text-center border-r border-[#333]">
                          <div className="text-gray-500 text-xs">應繳上線</div>
                          <div className={getValueColor(detailMember.payable)}>{formatCurrency(detailMember.payable)}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-gray-500 text-xs">個人盈虧</div>
                          <div className={getValueColor(detailMember.profit)}>{formatCurrency(detailMember.profit)}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Export Button */}
                <div className="flex justify-end mb-4">
                  <button className="flex items-center gap-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-black text-sm font-medium rounded transition-colors">
                    <Download className="w-4 h-4" />
                    導 出
                  </button>
                </div>

                {/* Platform Details Table */}
                <div className="bg-[#1e1e1e] border border-[#333] rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#252525] text-gray-400">
                        <th className="px-4 py-3 text-left">廠商名稱</th>
                        <th className="px-4 py-3 text-right">注單筆數</th>
                        <th className="px-4 py-3 text-right">下注金額</th>
                        <th className="px-4 py-3 text-right">有效投注</th>
                        <th className="px-4 py-3 text-right">會員輸贏</th>
                        <th className="px-4 py-3 text-right">會員退水</th>
                        <th className="px-4 py-3 text-right">個人佔成</th>
                        <th className="px-4 py-3 text-right">個人退水</th>
                        <th className="px-4 py-3 text-right">應收下線</th>
                        <th className="px-4 py-3 text-right">應繳上線</th>
                        <th className="px-4 py-3 text-right">個人盈虧</th>
                        <th className="px-4 py-3 text-center">退水</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberPlatformDetails.map((detail, index) => (
                        <tr
                          key={detail.platform}
                          className={`border-t border-[#333] ${index % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#222]'}`}
                        >
                          <td className="px-4 py-3">
                            <div className="text-gray-500 text-xs">廠商名稱</div>
                            <div className="text-white font-medium">{detail.platform}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">注單筆數</div>
                            <div className="text-white">{detail.betCount.toLocaleString()}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">下注金額</div>
                            <div className="text-white">{formatCurrency(detail.betAmount)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">有效投注</div>
                            <div className="text-white">{formatCurrency(detail.validBet)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">會員輸贏</div>
                            <div className={getValueColor(detail.memberWinLoss)}>{formatCurrency(detail.memberWinLoss)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">會員退水</div>
                            <div className="text-white">{formatCurrency(detail.memberRebate)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">個人佔成</div>
                            <div className="text-white">{formatCurrency(detail.personalShare)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">個人退水</div>
                            <div className={getValueColor(detail.personalRebate)}>{formatCurrency(detail.personalRebate)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">應收下線</div>
                            <div className="text-white">{formatCurrency(detail.receivable)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">應繳上線</div>
                            <div className={getValueColor(detail.payable)}>{formatCurrency(detail.payable)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="text-gray-500 text-xs">個人盈虧</div>
                            <div className={getValueColor(detail.profit)}>{formatCurrency(detail.profit)}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="text-gray-500 text-xs">退水</div>
                            <div className="text-white">0</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
