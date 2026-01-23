import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  Calendar,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Filter
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

export default function AgentReport() {
  const [activeTab, setActiveTab] = useState<TabType>('agent');
  const [data, setData] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const quickFilters: QuickFilter[] = [
    { key: 'today', label: '今日' },
    { key: 'yesterday', label: '昨日' },
    { key: 'thisWeek', label: '本週' },
    { key: 'lastWeek', label: '上週' },
    { key: 'thisMonth', label: '本月' },
    { key: 'lastMonth', label: '上月' },
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
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchData();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getValueColor = (value: number) => {
    if (value > 0) return 'text-green-400';
    if (value < 0) return 'text-red-400';
    return 'text-white';
  };

  const tabs = [
    { key: 'agent' as TabType, label: '遊戲代理報表' },
    { key: 'member' as TabType, label: '遊戲會員報表' },
  ];

  return (
    <div className="space-y-6">
      {/* Current User Summary Bar */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#1e1e1e] to-[#252525] border border-[#333] rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-400">
                帳號：<span className="text-white">{data.currentUser.username}</span>
              </span>
              <span className="text-gray-400">
                層級：<span className="text-amber-400">{data.currentUser.agentLevel}級代理</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-400">
                注單數：<span className="text-white">{data.currentUser.betCount}</span>
              </span>
              <span className="text-gray-400">
                有效投注：<span className="text-white">{formatCurrency(data.currentUser.validBet)}</span>
              </span>
              <span className="text-gray-400">
                會員輸贏：<span className={getValueColor(data.currentUser.memberWinLoss)}>
                  {formatCurrency(data.currentUser.memberWinLoss)}
                </span>
              </span>
              <span className="text-gray-400">
                個人盈虧：<span className={getValueColor(data.currentUser.profit)}>
                  {formatCurrency(data.currentUser.profit)}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-amber-500/20 text-amber-400'
                : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
            <span className="font-medium">進階篩選</span>
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
              <span className="text-gray-400 text-sm min-w-fit">快速篩選：</span>
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
                <span className="text-gray-400 text-sm">{activeTab === 'agent' ? '代理帳號：' : '會員帳號：'}</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 w-40"
                  placeholder="輸入帳號"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">日期範圍：</span>
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
                查詢
              </button>
              <button
                onClick={fetchData}
                className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重置
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 text-sm rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                導出
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Date Range Info */}
      {data && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>
            統計區間：{new Date(data.dateRange.startDate).toLocaleString('zh-TW')} 至{' '}
            {new Date(data.dateRange.endDate).toLocaleString('zh-TW')}
          </span>
        </div>
      )}

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">載入中...</div>
        </div>
      ) : activeTab === 'agent' ? (
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#252525]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">代理帳號</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">層級</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">注單數</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">下注金額</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">有效投注</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">會員輸贏</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">會員退水</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">個人佔成</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">個人退水</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">應收下線</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">應繳上線</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">個人盈虧</th>
                </tr>
              </thead>
              <tbody>
                {data?.agents && data.agents.length > 0 ? (
                  data.agents.map((agent, index) => (
                    <tr
                      key={agent.id}
                      className={`border-t border-[#333] hover:bg-[#252525] transition-colors ${
                        index % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#222]'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-white font-medium">{agent.username}</span>
                          {agent.nickname && (
                            <span className="text-gray-400 text-sm ml-1">({agent.nickname})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400">
                          {agent.agentLevel}級
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{agent.betCount}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.betAmount)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.validBet)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${getValueColor(agent.memberWinLoss)}`}>
                        {formatCurrency(agent.memberWinLoss)}
                      </td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.memberRebate)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.personalShare)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(agent.personalRebate)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${getValueColor(agent.receivable)}`}>
                        {formatCurrency(agent.receivable)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${getValueColor(-agent.payable)}`}>
                        {formatCurrency(agent.payable)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${getValueColor(agent.profit)}`}>
                        {formatCurrency(agent.profit)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className="px-4 py-8 text-center text-gray-400">
                      暫無數據
                    </td>
                  </tr>
                )}
              </tbody>
              {data?.agents && data.agents.length > 0 && (
                <tfoot>
                  <tr className="bg-[#252525] border-t border-[#333]">
                    <td className="px-4 py-3 font-medium text-amber-400" colSpan={2}>合計</td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {data.agents.reduce((sum, a) => sum + a.betCount, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(data.agents.reduce((sum, a) => sum + a.betAmount, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(data.agents.reduce((sum, a) => sum + a.validBet, 0))}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${getValueColor(data.agents.reduce((sum, a) => sum + a.memberWinLoss, 0))}`}>
                      {formatCurrency(data.agents.reduce((sum, a) => sum + a.memberWinLoss, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(data.agents.reduce((sum, a) => sum + a.memberRebate, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(data.agents.reduce((sum, a) => sum + a.personalShare, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(data.agents.reduce((sum, a) => sum + a.personalRebate, 0))}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${getValueColor(data.agents.reduce((sum, a) => sum + a.receivable, 0))}`}>
                      {formatCurrency(data.agents.reduce((sum, a) => sum + a.receivable, 0))}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${getValueColor(-data.agents.reduce((sum, a) => sum + a.payable, 0))}`}>
                      {formatCurrency(data.agents.reduce((sum, a) => sum + a.payable, 0))}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${getValueColor(data.agents.reduce((sum, a) => sum + a.profit, 0))}`}>
                      {formatCurrency(data.agents.reduce((sum, a) => sum + a.profit, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#252525]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">會員帳號</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">注單數</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">下注金額</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">有效投注</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">會員輸贏</th>
                </tr>
              </thead>
              <tbody>
                {data?.members && data.members.length > 0 ? (
                  data.members.map((member, index) => (
                    <tr
                      key={member.id}
                      className={`border-t border-[#333] hover:bg-[#252525] transition-colors ${
                        index % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#222]'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-white font-medium">{member.username}</span>
                          {member.nickname && (
                            <span className="text-gray-400 text-sm ml-1">({member.nickname})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{member.betCount}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(member.betAmount)}</td>
                      <td className="px-4 py-3 text-right text-white">{formatCurrency(member.validBet)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${getValueColor(member.memberWinLoss)}`}>
                        {formatCurrency(member.memberWinLoss)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      暫無數據
                    </td>
                  </tr>
                )}
              </tbody>
              {data?.members && data.members.length > 0 && (
                <tfoot>
                  <tr className="bg-[#252525] border-t border-[#333]">
                    <td className="px-4 py-3 font-medium text-amber-400">合計</td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {data.members.reduce((sum, m) => sum + m.betCount, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(data.members.reduce((sum, m) => sum + m.betAmount, 0))}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-white">
                      {formatCurrency(data.members.reduce((sum, m) => sum + m.validBet, 0))}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${getValueColor(data.members.reduce((sum, m) => sum + m.memberWinLoss, 0))}`}>
                      {formatCurrency(data.members.reduce((sum, m) => sum + m.memberWinLoss, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
