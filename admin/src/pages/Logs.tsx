import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronRight,
  FileText,
  Coins,
  BarChart3,
  LogIn
} from 'lucide-react';
import { logsApi } from '../services/api';

type TabType = 'operation' | 'cash' | 'share' | 'login';

interface QuickFilter {
  key: string;
  label: string;
}

interface OperationLog {
  id: string;
  operatorUsername: string;
  operatorNickname: string;
  action: string;
  targetUsername?: string;
  targetNickname?: string;
  details: any;
  ipAddress: string;
  createdAt: string;
}

interface CashLog {
  id: string;
  operatorUsername: string;
  operatorNickname: string;
  targetUsername: string;
  targetNickname: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  note?: string;
  createdAt: string;
}

interface ShareLog {
  id: string;
  operatorUsername?: string;
  operatorNickname?: string;
  targetUsername?: string;
  targetNickname?: string;
  changeType: string;
  oldValue: number;
  newValue: number;
  gameCategory: string;
  platform: string;
  createdAt: string;
}

interface LoginLog {
  id: string;
  username: string;
  nickname: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  createdAt: string;
}

export default function Logs() {
  const [activeTab, setActiveTab] = useState<TabType>('operation');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [quickFilter, setQuickFilter] = useState('today');
  const [operatorSearch, setOperatorSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [cashLogs, setCashLogs] = useState<CashLog[]>([]);
  const [shareLogs, setShareLogs] = useState<ShareLog[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const quickFilters: QuickFilter[] = [
    { key: 'today', label: '今日' },
    { key: 'yesterday', label: '昨日' },
    { key: 'thisWeek', label: '本週' },
    { key: 'lastWeek', label: '上週' },
    { key: 'thisMonth', label: '本月' },
    { key: 'lastMonth', label: '上月' },
  ];

  const tabs = [
    { key: 'operation' as TabType, label: '操作日誌', icon: FileText },
    { key: 'cash' as TabType, label: '現金日誌', icon: Coins },
    { key: 'share' as TabType, label: '佔成日誌', icon: BarChart3 },
    { key: 'login' as TabType, label: '登入日誌', icon: LogIn },
  ];

  useEffect(() => {
    fetchData();
  }, [activeTab, quickFilter, page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = { quickFilter, page, limit: 20 };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        delete params.quickFilter;
      }
      if (operatorSearch) {
        params.operatorId = operatorSearch;
      }
      if (targetSearch) {
        params.targetId = targetSearch;
      }

      let res: any;
      switch (activeTab) {
        case 'operation':
          res = await logsApi.getOperationLogs(params);
          setOperationLogs(res.data.logs);
          break;
        case 'cash':
          res = await logsApi.getCashLogs(params);
          setCashLogs(res.data.logs);
          break;
        case 'share':
          res = await logsApi.getShareLogs(params);
          setShareLogs(res.data.logs);
          break;
        case 'login':
          if (targetSearch) {
            params.userId = targetSearch;
            delete params.targetId;
          }
          res = await logsApi.getLoginLogs(params);
          setLoginLogs(res.data.logs);
          break;
      }
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchData();
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getActionText = (action: string) => {
    const actionMap: Record<string, string> = {
      create_agent: '創建代理',
      create_member: '創建會員',
      update_status: '修改狀態',
      update_share: '修改佔成',
      update_bet_limit: '修改限紅',
      deposit: '存入額度',
      withdraw: '提取額度',
      adjustment: '額度調整',
      login: '登入',
    };
    return actionMap[action] || action;
  };

  const getTypeColor = (type: string) => {
    const colorMap: Record<string, string> = {
      deposit: 'text-green-400 bg-green-500/20',
      withdraw: 'text-red-400 bg-red-500/20',
      adjustment: 'text-blue-400 bg-blue-500/20',
    };
    return colorMap[type] || 'text-gray-400 bg-gray-500/20';
  };

  const getTypeText = (type: string) => {
    const textMap: Record<string, string> = {
      deposit: '存入',
      withdraw: '提取',
      adjustment: '調整',
    };
    return textMap[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">日誌</h1>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
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
            <div className="flex items-center gap-4 flex-wrap">
              {activeTab !== 'login' && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm">操作人帳號：</span>
                  <input
                    type="text"
                    value={operatorSearch}
                    onChange={(e) => setOperatorSearch(e.target.value)}
                    className="px-3 py-1.5 bg-[#2a2a2a] border border-[#444] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500 w-40"
                    placeholder="輸入帳號"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">
                  {activeTab === 'login' ? '帳號：' : '變動者帳號：'}
                </span>
                <input
                  type="text"
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
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
                onClick={() => {
                  setOperatorSearch('');
                  setTargetSearch('');
                  setStartDate('');
                  setEndDate('');
                  setQuickFilter('today');
                  setPage(1);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重置
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">載入中...</div>
        </div>
      ) : (
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'operation' && (
              <table className="w-full">
                <thead className="bg-[#252525]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">操作人</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">操作</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">對象</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">詳情</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {operationLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">暫無數據</td>
                    </tr>
                  ) : (
                    operationLogs.map((log, index) => (
                      <tr key={log.id} className={`border-t border-[#333] ${index % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#222]'}`}>
                        <td className="px-4 py-3">
                          <span className="text-white">{log.operatorUsername}</span>
                          {log.operatorNickname && <span className="text-gray-400 text-sm ml-1">({log.operatorNickname})</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
                            {getActionText(log.action)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {log.targetUsername ? (
                            <>
                              <span className="text-white">{log.targetUsername}</span>
                              {log.targetNickname && <span className="text-gray-400 text-sm ml-1">({log.targetNickname})</span>}
                            </>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm max-w-xs truncate">
                          {log.details ? JSON.stringify(log.details) : '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{log.ipAddress}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{new Date(log.createdAt).toLocaleString('zh-TW')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'cash' && (
              <table className="w-full">
                <thead className="bg-[#252525]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">操作人</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">對象</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">類型</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">金額</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">變動前</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">變動後</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">備註</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {cashLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">暫無數據</td>
                    </tr>
                  ) : (
                    cashLogs.map((log, index) => (
                      <tr key={log.id} className={`border-t border-[#333] ${index % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#222]'}`}>
                        <td className="px-4 py-3">
                          <span className="text-white">{log.operatorUsername}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white">{log.targetUsername}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(log.type)}`}>
                            {getTypeText(log.type)}
                          </span>
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${log.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {log.amount >= 0 ? '+' : ''}{formatCurrency(log.amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-400">{formatCurrency(log.balanceBefore)}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(log.balanceAfter)}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{log.note || '-'}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{new Date(log.createdAt).toLocaleString('zh-TW')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'share' && (
              <table className="w-full">
                <thead className="bg-[#252525]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">操作人</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">對象</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">類型</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">遊戲類別</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">平台</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">舊值</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">新值</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {shareLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400">暫無數據</td>
                    </tr>
                  ) : (
                    shareLogs.map((log, index) => (
                      <tr key={log.id} className={`border-t border-[#333] ${index % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#222]'}`}>
                        <td className="px-4 py-3">
                          <span className="text-white">{log.operatorUsername || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-white">{log.targetUsername || '-'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-xs ${log.changeType === 'share' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                            {log.changeType === 'share' ? '佔成' : '退水'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400">{log.gameCategory}</td>
                        <td className="px-4 py-3 text-gray-400">{log.platform}</td>
                        <td className="px-4 py-3 text-right text-red-400">{log.oldValue}%</td>
                        <td className="px-4 py-3 text-right text-green-400">{log.newValue}%</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{new Date(log.createdAt).toLocaleString('zh-TW')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'login' && (
              <table className="w-full">
                <thead className="bg-[#252525]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">帳號</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">名稱</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-400 uppercase">狀態</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">IP 地址</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">瀏覽器</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">時間</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400">暫無數據</td>
                    </tr>
                  ) : (
                    loginLogs.map((log, index) => (
                      <tr key={log.id} className={`border-t border-[#333] ${index % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#222]'}`}>
                        <td className="px-4 py-3 text-white">{log.username}</td>
                        <td className="px-4 py-3 text-gray-400">{log.nickname || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs ${log.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {log.success ? '成功' : '失敗'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{log.ipAddress}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm max-w-xs truncate">{log.userAgent}</td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{new Date(log.createdAt).toLocaleString('zh-TW')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-[#333] p-4 flex items-center justify-between">
              <div className="text-gray-400 text-sm">
                共 {total} 條記錄，第 {page} / {totalPages} 頁
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-[#2a2a2a] text-gray-400 rounded-lg disabled:opacity-50 hover:text-white transition-colors"
                >
                  上一頁
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 bg-[#2a2a2a] text-gray-400 rounded-lg disabled:opacity-50 hover:text-white transition-colors"
                >
                  下一頁
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
