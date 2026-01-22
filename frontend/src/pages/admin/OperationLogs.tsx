import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Calendar,
  User,
  Edit,
  Trash2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  FileText,
  DollarSign,
  PieChart,
  LogIn,
  Download,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Globe,
  Monitor
} from 'lucide-react';
import DataTable from '../../components/admin/common/DataTable';
import { operationLogApi } from '../../services/api';
import i18n from '../../i18n';

interface OperationLog {
  id: string;
  operatorId: string;
  operator: { username: string; nickname?: string };
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetUser?: { username: string; nickname?: string };
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent?: string | null;
  createdAt: string;
}

interface CashLog {
  id: string;
  operatorId: string;
  operator: { username: string; nickname?: string };
  targetUser: { username: string; nickname?: string };
  operationType: string;
  vendor?: string;
  beforeAmount: number;
  amount: number;
  afterAmount: number;
  createdAt: string;
}

interface ShareLog {
  id: string;
  operatorId: string;
  operator: { username: string; nickname?: string };
  targetUser: { username: string; nickname?: string };
  vendor?: string;
  beforeShare: number;
  afterShare: number;
  beforeRebate: number;
  afterRebate: number;
  createdAt: string;
}

interface LoginLog {
  id: string;
  userId: string;
  user: { username: string; nickname?: string };
  operationType: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

type LogTab = 'operation' | 'cash' | 'share' | 'login';

export default function OperationLogs() {
  useTranslation();
  const isZh = i18n.language === 'zh';

  const [activeTab, setActiveTab] = useState<LogTab>('operation');
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [cashLogs, setCashLogs] = useState<CashLog[]>([]);
  const [shareLogs, setShareLogs] = useState<ShareLog[]>([]);
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  // Filters
  const [quickFilter, setQuickFilter] = useState('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [operatorAccount, setOperatorAccount] = useState('');
  const [targetAccount, setTargetAccount] = useState('');
  const [operationType, setOperationType] = useState('all');
  const [ipFilter, setIpFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Stats
  const [totalAmount, setTotalAmount] = useState(0);

  const tabs: { key: LogTab; label: string; icon: React.ReactNode }[] = [
    { key: 'operation', label: isZh ? '操作日誌' : 'Operation Logs', icon: <FileText size={16} /> },
    { key: 'cash', label: isZh ? '現金日誌' : 'Cash Logs', icon: <DollarSign size={16} /> },
    { key: 'share', label: isZh ? '佔成日誌' : 'Share Logs', icon: <PieChart size={16} /> },
    { key: 'login', label: isZh ? '登入日誌' : 'Login Logs', icon: <LogIn size={16} /> },
  ];

  const quickFilters = [
    { key: 'today', label: isZh ? '今日' : 'Today' },
    { key: 'yesterday', label: isZh ? '昨日' : 'Yesterday' },
    { key: 'thisWeek', label: isZh ? '本週' : 'This Week' },
    { key: 'lastWeek', label: isZh ? '上週' : 'Last Week' },
    { key: 'thisMonth', label: isZh ? '本月' : 'This Month' },
    { key: 'lastMonth', label: isZh ? '上月' : 'Last Month' },
  ];

  useEffect(() => {
    fetchLogs();
  }, [activeTab, page, quickFilter, dateFrom, dateTo, operatorAccount, targetAccount, operationType, ipFilter]);

  const getDateRange = (filter: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filter) {
      case 'today':
        return { from: today.toISOString(), to: now.toISOString() };
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday.toISOString(), to: today.toISOString() };
      }
      case 'thisWeek': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        return { from: startOfWeek.toISOString(), to: now.toISOString() };
      }
      case 'lastWeek': {
        const startOfLastWeek = new Date(today);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - startOfLastWeek.getDay() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(endOfLastWeek.getDate() + 7);
        return { from: startOfLastWeek.toISOString(), to: endOfLastWeek.toISOString() };
      }
      case 'thisMonth': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { from: startOfMonth.toISOString(), to: now.toISOString() };
      }
      case 'lastMonth': {
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return { from: startOfLastMonth.toISOString(), to: endOfLastMonth.toISOString() };
      }
      default:
        return { from: '', to: '' };
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const dateRange = quickFilter ? getDateRange(quickFilter) : { from: dateFrom, to: dateTo };
      const params: Record<string, string | number> = { page, limit: 10 };

      if (dateRange.from) params.from = dateRange.from;
      if (dateRange.to) params.to = dateRange.to;
      if (operatorAccount) params.operator = operatorAccount;
      if (targetAccount) params.target = targetAccount;
      if (operationType !== 'all') params.type = operationType;
      if (ipFilter) params.ip = ipFilter;

      // For now, use operation log API for all tabs (would need separate APIs in production)
      const response = await operationLogApi.getLogs(params);

      if (activeTab === 'operation') {
        setLogs(response.data.logs || []);
      } else if (activeTab === 'cash') {
        // Transform to cash log format (mock data structure)
        setCashLogs(response.data.logs?.filter((l: OperationLog) =>
          l.action === 'deposit' || l.action === 'withdraw'
        ).map((l: OperationLog) => ({
          id: l.id,
          operatorId: l.operatorId,
          operator: l.operator,
          targetUser: l.targetUser || { username: l.targetId || '-' },
          operationType: l.action,
          vendor: (l.details as { vendor?: string })?.vendor || '-',
          beforeAmount: (l.details as { beforeAmount?: number })?.beforeAmount || 0,
          amount: (l.details as { amount?: number })?.amount || 0,
          afterAmount: (l.details as { afterAmount?: number })?.afterAmount || 0,
          createdAt: l.createdAt,
        })) || []);
        // Calculate total amount
        const amounts = response.data.logs?.filter((l: OperationLog) =>
          l.action === 'deposit' || l.action === 'withdraw'
        ).map((l: OperationLog) => (l.details as { amount?: number })?.amount || 0) || [];
        setTotalAmount(amounts.reduce((a: number, b: number) => a + b, 0));
      } else if (activeTab === 'share') {
        // Transform to share log format
        setShareLogs(response.data.logs?.filter((l: OperationLog) =>
          l.action.includes('share') || l.action.includes('rebate')
        ).map((l: OperationLog) => ({
          id: l.id,
          operatorId: l.operatorId,
          operator: l.operator,
          targetUser: l.targetUser || { username: l.targetId || '-' },
          vendor: (l.details as { vendor?: string })?.vendor || '-',
          beforeShare: (l.details as { beforeShare?: number })?.beforeShare || 0,
          afterShare: (l.details as { afterShare?: number })?.afterShare || 0,
          beforeRebate: (l.details as { beforeRebate?: number })?.beforeRebate || 0,
          afterRebate: (l.details as { afterRebate?: number })?.afterRebate || 0,
          createdAt: l.createdAt,
        })) || []);
      } else if (activeTab === 'login') {
        // Transform to login log format
        setLoginLogs(response.data.logs?.filter((l: OperationLog) =>
          l.action === 'login' || l.action === 'logout'
        ).map((l: OperationLog) => ({
          id: l.id,
          userId: l.operatorId,
          user: l.operator,
          operationType: l.action,
          ipAddress: l.ipAddress || '-',
          userAgent: l.userAgent || '-',
          createdAt: l.createdAt,
        })) || []);
      }

      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setLogs([]);
      setCashLogs([]);
      setShareLogs([]);
      setLoginLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setQuickFilter('today');
    setDateFrom('');
    setDateTo('');
    setOperatorAccount('');
    setTargetAccount('');
    setOperationType('all');
    setIpFilter('');
    setPage(1);
  };

  const handleExport = () => {
    const data = getCurrentData();
    if (data.length === 0) {
      alert(isZh ? '沒有數據可導出' : 'No data to export');
      return;
    }

    let headers: string[];
    let rows: string[][];

    if (activeTab === 'login') {
      headers = ['Time', 'Type', 'User', 'IP', 'User Agent'];
      rows = (data as LoginLog[]).map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.operationType,
        log.user.username,
        log.ipAddress,
        log.userAgent,
      ]);
    } else if (activeTab === 'cash') {
      headers = ['Time', 'Type', 'Operator', 'Target', 'Before', 'Amount', 'After'];
      rows = (data as CashLog[]).map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.operationType,
        log.operator.username,
        log.targetUser.username,
        log.beforeAmount.toString(),
        log.amount.toString(),
        log.afterAmount.toString(),
      ]);
    } else if (activeTab === 'share') {
      headers = ['Time', 'Operator', 'Target', 'Before Share', 'After Share', 'Before Rebate', 'After Rebate'];
      rows = (data as ShareLog[]).map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.operator.username,
        log.targetUser.username,
        log.beforeShare.toString(),
        log.afterShare.toString(),
        log.beforeRebate.toString(),
        log.afterRebate.toString(),
      ]);
    } else {
      headers = ['Time', 'Operator', 'Action', 'Target', 'Details'];
      rows = (data as OperationLog[]).map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.operator.username,
        log.action,
        log.targetUser?.username || log.targetId || '-',
        JSON.stringify(log.details || {}),
      ]);
    }

    // Generate CSV
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${activeTab}_logs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getActionIcon = (action: string) => {
    if (action.startsWith('create')) return <Plus size={14} className="text-green-400" />;
    if (action.startsWith('edit') || action.startsWith('update')) return <Edit size={14} className="text-blue-400" />;
    if (action.startsWith('delete')) return <Trash2 size={14} className="text-red-400" />;
    if (action === 'deposit') return <ArrowUpRight size={14} className="text-green-400" />;
    if (action === 'withdraw') return <ArrowDownRight size={14} className="text-red-400" />;
    if (action === 'login') return <LogIn size={14} className="text-blue-400" />;
    return <Settings size={14} className="text-gray-400" />;
  };

  const getActionBadge = (action: string) => {
    if (action.startsWith('create')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (action.startsWith('edit') || action.startsWith('update')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (action.startsWith('delete')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (action === 'deposit') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (action === 'withdraw') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (action === 'login') return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (action === 'logout') return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      'create_member': isZh ? '創建會員' : 'Create Member',
      'edit_member': isZh ? '編輯會員' : 'Edit Member',
      'create_agent': isZh ? '創建代理' : 'Create Agent',
      'edit_agent': isZh ? '編輯代理' : 'Edit Agent',
      'deposit': isZh ? '入點' : 'Deposit',
      'withdraw': isZh ? '出點' : 'Withdraw',
      'login': isZh ? '登入' : 'Login',
      'logout': isZh ? '登出' : 'Logout',
      'update_share': isZh ? '修改佔成' : 'Update Share',
      'update_rebate': isZh ? '修改退水' : 'Update Rebate',
    };
    return actionMap[action] || action.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatDetails = (details: Record<string, unknown> | null) => {
    if (!details) return '-';
    const entries = Object.entries(details);
    if (entries.length === 0) return '-';

    return entries
      .slice(0, 2)
      .map(([key, value]) => {
        if (typeof value === 'object') return `${key}: {...}`;
        return `${key}: ${value}`;
      })
      .join(', ');
  };

  // Operation Log Columns
  const operationColumns = [
    {
      key: 'createdAt',
      header: isZh ? '時間/日期' : 'Time/Date',
      render: (log: OperationLog) => (
        <div className="text-xs">
          <p className="text-white">{new Date(log.createdAt).toLocaleDateString()}</p>
          <p className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
        </div>
      ),
    },
    {
      key: 'operator',
      header: isZh ? '操作人帳號' : 'Operator',
      render: (log: OperationLog) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm">{log.operator.username}</p>
            {log.operator.nickname && (
              <p className="text-xs text-gray-400">{log.operator.nickname}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'action',
      header: isZh ? '操作類型' : 'Action Type',
      render: (log: OperationLog) => (
        <div className="flex items-center gap-2">
          {getActionIcon(log.action)}
          <span className={`px-2 py-0.5 text-xs rounded border ${getActionBadge(log.action)}`}>
            {formatAction(log.action)}
          </span>
        </div>
      ),
    },
    {
      key: 'target',
      header: isZh ? '變動者帳號' : 'Target Account',
      render: (log: OperationLog) => (
        <div>
          <p className="text-white text-sm">{log.targetUser?.username || log.targetId || '-'}</p>
          {log.targetType && (
            <p className="text-xs text-gray-500">
              {log.targetType.charAt(0).toUpperCase() + log.targetType.slice(1)}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'details',
      header: isZh ? '更改訊息' : 'Details',
      render: (log: OperationLog) => (
        <span className="text-gray-400 text-sm truncate max-w-[200px] block">
          {formatDetails(log.details)}
        </span>
      ),
    },
  ];

  // Cash Log Columns
  const cashColumns = [
    {
      key: 'createdAt',
      header: isZh ? '時間/日期' : 'Time/Date',
      render: (log: CashLog) => (
        <div className="text-xs">
          <p className="text-white">{new Date(log.createdAt).toLocaleDateString()}</p>
          <p className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
        </div>
      ),
    },
    {
      key: 'operationType',
      header: isZh ? '操作類型' : 'Operation Type',
      render: (log: CashLog) => (
        <div className="flex items-center gap-2">
          {getActionIcon(log.operationType)}
          <span className={`px-2 py-0.5 text-xs rounded border ${getActionBadge(log.operationType)}`}>
            {formatAction(log.operationType)}
          </span>
        </div>
      ),
    },
    {
      key: 'operator',
      header: isZh ? '操作人帳號' : 'Operator',
      render: (log: CashLog) => (
        <span className="text-white text-sm">{log.operator.username}</span>
      ),
    },
    {
      key: 'targetUser',
      header: isZh ? '變動者帳號' : 'Target Account',
      render: (log: CashLog) => (
        <span className="text-white text-sm">{log.targetUser.username}</span>
      ),
    },
    {
      key: 'vendor',
      header: isZh ? '廠商' : 'Vendor',
      render: (log: CashLog) => (
        <span className="text-gray-400 text-sm">{log.vendor || '-'}</span>
      ),
    },
    {
      key: 'beforeAmount',
      header: isZh ? '操作前金額' : 'Before Amount',
      render: (log: CashLog) => (
        <span className="text-white text-sm font-mono">
          {log.beforeAmount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'amount',
      header: isZh ? '操作金額' : 'Amount',
      render: (log: CashLog) => (
        <span className={`text-sm font-mono font-semibold ${
          log.operationType === 'deposit' ? 'text-green-400' : 'text-red-400'
        }`}>
          {log.operationType === 'deposit' ? '+' : '-'}{Math.abs(log.amount).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'afterAmount',
      header: isZh ? '操作後金額' : 'After Amount',
      render: (log: CashLog) => (
        <span className="text-white text-sm font-mono">
          {log.afterAmount.toLocaleString()}
        </span>
      ),
    },
  ];

  // Share Log Columns
  const shareColumns = [
    {
      key: 'createdAt',
      header: isZh ? '時間/日期' : 'Time/Date',
      render: (log: ShareLog) => (
        <div className="text-xs">
          <p className="text-white">{new Date(log.createdAt).toLocaleDateString()}</p>
          <p className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
        </div>
      ),
    },
    {
      key: 'operator',
      header: isZh ? '操作人帳號' : 'Operator',
      render: (log: ShareLog) => (
        <span className="text-white text-sm">{log.operator.username}</span>
      ),
    },
    {
      key: 'targetUser',
      header: isZh ? '變動者帳號' : 'Target Account',
      render: (log: ShareLog) => (
        <span className="text-white text-sm">{log.targetUser.username}</span>
      ),
    },
    {
      key: 'vendor',
      header: isZh ? '廠商' : 'Vendor',
      render: (log: ShareLog) => (
        <span className="text-gray-400 text-sm">{log.vendor || '-'}</span>
      ),
    },
    {
      key: 'share',
      header: isZh ? '佔成變更' : 'Share Change',
      render: (log: ShareLog) => (
        <div className="text-sm">
          <span className="text-gray-400">{log.beforeShare}%</span>
          <span className="text-orange-400 mx-1">→</span>
          <span className="text-white font-semibold">{log.afterShare}%</span>
        </div>
      ),
    },
    {
      key: 'rebate',
      header: isZh ? '退水變更' : 'Rebate Change',
      render: (log: ShareLog) => (
        <div className="text-sm">
          <span className="text-gray-400">{log.beforeRebate}%</span>
          <span className="text-orange-400 mx-1">→</span>
          <span className="text-white font-semibold">{log.afterRebate}%</span>
        </div>
      ),
    },
  ];

  // Login Log Columns
  const loginColumns = [
    {
      key: 'operationType',
      header: isZh ? '操作類型' : 'Operation Type',
      render: (log: LoginLog) => (
        <div className="flex items-center gap-2">
          {log.operationType === 'login' ? (
            <LogIn size={14} className="text-green-400" />
          ) : (
            <LogIn size={14} className="text-gray-400 rotate-180" />
          )}
          <span className={`px-2 py-0.5 text-xs rounded border ${getActionBadge(log.operationType)}`}>
            {formatAction(log.operationType)}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      header: isZh ? '操作人帳號' : 'User Account',
      render: (log: LoginLog) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm">{log.user.username}</p>
            {log.user.nickname && (
              <p className="text-xs text-gray-400">{log.user.nickname}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: isZh ? '時間/日期' : 'Time/Date',
      render: (log: LoginLog) => (
        <div className="text-xs">
          <p className="text-white">{new Date(log.createdAt).toLocaleDateString()}</p>
          <p className="text-gray-400">{new Date(log.createdAt).toLocaleTimeString()}</p>
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP',
      render: (log: LoginLog) => (
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-gray-500" />
          <span className="text-gray-300 text-sm font-mono">{log.ipAddress}</span>
        </div>
      ),
    },
    {
      key: 'userAgent',
      header: 'UA',
      render: (log: LoginLog) => (
        <div className="flex items-center gap-2 max-w-[200px]">
          <Monitor size={14} className="text-gray-500 flex-shrink-0" />
          <span className="text-gray-400 text-xs truncate" title={log.userAgent}>
            {log.userAgent}
          </span>
        </div>
      ),
    },
  ];

  const operationTypeOptions = activeTab === 'operation' ? [
    { value: 'all', label: isZh ? '全部操作' : 'All Operations' },
    { value: 'create_member', label: isZh ? '創建會員' : 'Create Member' },
    { value: 'edit_member', label: isZh ? '編輯會員' : 'Edit Member' },
    { value: 'create_agent', label: isZh ? '創建代理' : 'Create Agent' },
    { value: 'edit_agent', label: isZh ? '編輯代理' : 'Edit Agent' },
    { value: 'deposit', label: isZh ? '入點' : 'Deposit' },
    { value: 'withdraw', label: isZh ? '出點' : 'Withdraw' },
  ] : activeTab === 'cash' ? [
    { value: 'all', label: isZh ? '全部操作' : 'All Operations' },
    { value: 'deposit', label: isZh ? '入點' : 'Deposit' },
    { value: 'withdraw', label: isZh ? '出點' : 'Withdraw' },
  ] : activeTab === 'login' ? [
    { value: 'all', label: isZh ? '全部操作' : 'All Operations' },
    { value: 'login', label: isZh ? '登入' : 'Login' },
    { value: 'logout', label: isZh ? '登出' : 'Logout' },
  ] : [];

  const getCurrentColumns = () => {
    switch (activeTab) {
      case 'cash': return cashColumns;
      case 'share': return shareColumns;
      case 'login': return loginColumns;
      default: return operationColumns;
    }
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'cash': return cashLogs;
      case 'share': return shareLogs;
      case 'login': return loginLogs;
      default: return logs;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-[#0d1117] p-1 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key);
              setPage(1);
              setOperationType('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white hover:bg-[#1e2a3a]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-[#1e2a3a] rounded-xl border border-gray-700/50 overflow-hidden">
        {/* Advanced Filter Toggle */}
        <button
          onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
          className="w-full px-4 py-3 flex items-center justify-between text-gray-400 hover:bg-[#2a3548] transition-colors border-b border-gray-700/50"
        >
          <span className="text-sm">{isZh ? '進階篩選' : 'Advanced Filter'}</span>
          {showAdvancedFilter ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {/* Quick Filters */}
        <div className="p-4 space-y-4">
          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {quickFilters.map((filter) => (
              <button
                key={filter.key}
                onClick={() => {
                  setQuickFilter(filter.key);
                  setDateFrom('');
                  setDateTo('');
                }}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  quickFilter === filter.key
                    ? 'bg-orange-500 text-white'
                    : 'bg-[#2a3548] text-gray-400 hover:text-white border border-gray-700/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{isZh ? '指定範圍：' : 'Date Range:'}</span>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setQuickFilter('');
                  }}
                  className="pl-9 pr-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <span>→</span>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setQuickFilter('');
                  }}
                  className="pl-9 pr-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilter && (
            <div className="pt-4 border-t border-gray-700/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Operator Account */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {isZh ? '操作人帳號' : 'Operator Account'}
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={operatorAccount}
                    onChange={(e) => setOperatorAccount(e.target.value)}
                    placeholder={isZh ? '輸入帳號' : 'Enter account'}
                    className="w-full pl-9 pr-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Target Account */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  {isZh ? '變動者帳號' : 'Target Account'}
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    value={targetAccount}
                    onChange={(e) => setTargetAccount(e.target.value)}
                    placeholder={isZh ? '輸入帳號' : 'Enter account'}
                    className="w-full pl-9 pr-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Operation Type */}
              {(activeTab === 'operation' || activeTab === 'cash' || activeTab === 'login') && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {isZh ? '操作類型' : 'Operation Type'}
                  </label>
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value)}
                    className="w-full px-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500"
                  >
                    {operationTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* IP Filter (Login tab only) */}
              {activeTab === 'login' && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">IP</label>
                  <div className="relative">
                    <Globe size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={ipFilter}
                      onChange={(e) => setIpFilter(e.target.value)}
                      placeholder="192.168.1.1"
                      className="w-full pl-9 pr-3 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
            >
              <RefreshCw size={14} />
              {isZh ? '重置' : 'Reset'}
            </button>
            <button
              onClick={() => fetchLogs()}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-white text-sm transition-colors"
            >
              <Search size={14} />
              {isZh ? '查詢' : 'Search'}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-transparent border border-orange-500 rounded-lg text-orange-400 hover:bg-orange-500/10 text-sm transition-colors ml-auto"
            >
              <Download size={14} />
              {isZh ? '導出數據' : 'Export Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary (Cash Log only) */}
      {activeTab === 'cash' && (
        <div className="bg-[#1e2a3a] rounded-xl border border-gray-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-orange-400" />
              <span className="text-gray-400 text-sm">{isZh ? '操作金額' : 'Operation Amount'}</span>
            </div>
            <span className="text-xl font-bold text-white">
              {totalAmount.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-[#1e2a3a] rounded-xl border border-gray-700/50 overflow-hidden">
        <DataTable
          columns={getCurrentColumns()}
          data={getCurrentData()}
          keyField="id"
          loading={loading}
          emptyMessage={isZh ? '暫無數據' : 'No data available'}
          pagination={{
            page,
            totalPages,
            total,
            onPageChange: setPage,
          }}
        />
      </div>
    </div>
  );
}
