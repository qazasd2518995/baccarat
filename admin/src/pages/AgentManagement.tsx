import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Building2,
  Wallet,
  Plus,
  X,
  Copy,
  Edit,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { agentManagementApi } from '../services/api';
import ShareSettingModal from '../components/ShareSettingModal';
import BetLimitModal from '../components/BetLimitModal';
import BalanceModal from '../components/BalanceModal';
import SubAccountModal from '../components/SubAccountModal';
import ConfirmModal from '../components/ConfirmModal';
import EditAgentModal from '../components/EditAgentModal';
import ShareHistoryModal from '../components/ShareHistoryModal';

type TabType = 'agents' | 'members' | 'subAccounts';

interface DashboardData {
  balance: number;
  agentCount: number;
  directMemberCount: number;
  totalMemberCount: number;
  status: string;
  username: string;
  nickname: string;
  agentLevel: number;
  sharePercent: number;
  rebatePercent: number;
}

interface Agent {
  id: string;
  username: string;
  nickname: string;
  agentLevel: number;
  balance: number;
  status: string;
  isLocked: boolean;
  isFullDisabled: boolean;
  isReadonly: boolean;
  sharePercent: number;
  rebatePercent: number;
  inviteCode: string;
  agentCount: number;
  memberCount: number;
  createdAt: string;
  lastLoginAt: string | null;
  remark?: string;
}

interface Member {
  id: string;
  username: string;
  nickname: string;
  balance: number;
  status: string;
  isLocked: boolean;
  isFullDisabled: boolean;
  isReadonly: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  remark?: string;
  parentAgent?: {
    id: string;
    username: string;
    nickname: string | null;
  } | null;
}

interface SubAccount {
  id: string;
  username: string;
  nickname: string;
  status: string;
  permissions?: Record<string, boolean>;
  createdAt: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  agentManagement: '代理管理',
  memberManagement: '会员管理',
  shareSettings: '占成设定',
  betLimits: '限红设定',
  balanceOps: '存取款',
  viewReports: '报表查看',
  viewLogs: '日志查看',
};

interface BreadcrumbItem {
  id: string;
  username: string;
  nickname: string | null;
}

export default function AgentManagement() {
  const [activeTab, setActiveTab] = useState<TabType>('agents');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);

  // Navigation state for viewing sub-agent's downline
  const [viewAgentId, setViewAgentId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [viewAgent, setViewAgent] = useState<{ id: string; username: string; nickname: string | null; agentLevel: number; balance: number } | null>(null);

  // Modal states
  const [shareSettingModal, setShareSettingModal] = useState<{ open: boolean; agent: Agent | null }>({ open: false, agent: null });
  const [betLimitModal, setBetLimitModal] = useState<{ open: boolean; agent: Agent | null }>({ open: false, agent: null });
  const [balanceModal, setBalanceModal] = useState<{ open: boolean; agent: Agent | null }>({ open: false, agent: null });
  const [subAccountModal, setSubAccountModal] = useState<{ open: boolean; subAccount: SubAccount | null }>({ open: false, subAccount: null });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; agent: Agent | null; action: string }>({ open: false, agent: null, action: '' });
  const [editAgentModal, setEditAgentModal] = useState<{ open: boolean; agent: Agent | Member | null; type: 'agent' | 'member' }>({ open: false, agent: null, type: 'agent' });
  const [shareHistoryModal, setShareHistoryModal] = useState<{ open: boolean; agent: Agent | null }>({ open: false, agent: null });

  // Create form state
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    initialBalance: 0,
    sharePercent: 0,
    rebatePercent: 0,
    betLimits: [] as string[],
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createError, setCreateError] = useState('');
  const [availableBetLimits, setAvailableBetLimits] = useState<string[]>([]);
  const [memberCreateStep, setMemberCreateStep] = useState(1);

  // Member search filters
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab, viewAgentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const dashRes = await agentManagementApi.getDashboard();
      setDashboard(dashRes.data);
      // 設定可用的限紅選項
      if (dashRes.data.availableBetLimits) {
        setAvailableBetLimits(dashRes.data.availableBetLimits);
      }

      if (activeTab === 'agents') {
        const res = await agentManagementApi.getAgents({
          search: searchQuery,
          viewAgentId: viewAgentId || undefined
        });
        setAgents(res.data.agents);
        setBreadcrumb(res.data.breadcrumb || []);
        setViewAgent(res.data.viewAgent || null);
      } else if (activeTab === 'members') {
        const res = await agentManagementApi.getMembers({
          search: searchQuery,
          viewAgentId: viewAgentId || undefined,
          status: statusFilter || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined
        });
        setMembers(res.data.members);
        setBreadcrumb(res.data.breadcrumb || []);
        setViewAgent(res.data.viewAgent || null);
      } else if (activeTab === 'subAccounts') {
        const res = await agentManagementApi.getSubAccounts();
        setSubAccounts(res.data.subAccounts || []);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle clicking on an agent to drill down
  const handleAgentClick = (agentId: string) => {
    setViewAgentId(agentId);
    setCurrentPage(1);
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (agentId: string, index: number) => {
    if (index === 0) {
      setViewAgentId(null);
    } else {
      setViewAgentId(agentId);
    }
    setCurrentPage(1);
  };

  // Handle go back
  const handleGoBack = () => {
    if (breadcrumb.length > 1) {
      const parentIndex = breadcrumb.length - 2;
      if (parentIndex === 0) {
        setViewAgentId(null);
      } else {
        setViewAgentId(breadcrumb[parentIndex].id);
      }
      setCurrentPage(1);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchData();
  };

  const handleStatusChange = async (userId: string, action: 'lock' | 'unlock' | 'disable' | 'enable' | 'readonly' | 'unreadonly') => {
    try {
      const data: any = {};
      switch (action) {
        case 'lock':
          data.isLocked = true;
          break;
        case 'unlock':
          data.isLocked = false;
          break;
        case 'disable':
          data.isFullDisabled = true;
          break;
        case 'enable':
          data.isFullDisabled = false;
          break;
        case 'readonly':
          data.isReadonly = true;
          break;
        case 'unreadonly':
          data.isReadonly = false;
          break;
      }
      await agentManagementApi.updateUserStatus(userId, data);
      fetchData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleWithdrawAll = async () => {
    if (!confirmModal.agent) return;
    try {
      await agentManagementApi.withdrawAll(confirmModal.agent.id);
      setConfirmModal({ open: false, agent: null, action: '' });
      fetchData();
    } catch (err) {
      console.error('Failed to withdraw all:', err);
    }
  };

  const handleCreateAgent = async () => {
    try {
      await agentManagementApi.createAgent({
        username: createForm.username,
        password: createForm.password,
        nickname: createForm.nickname,
        initialBalance: createForm.initialBalance,
        sharePercent: createForm.sharePercent,
        rebatePercent: createForm.rebatePercent,
        betLimits: createForm.betLimits,
      });
      setShowCreateModal(false);
      setCreateStep(1);
      setCreateError('');
      setCreateForm({
        username: '',
        password: '',
        confirmPassword: '',
        nickname: '',
        initialBalance: 0,
        sharePercent: 0,
        rebatePercent: 0,
        betLimits: [],
      });
      fetchData();
    } catch (err: any) {
      console.error('Failed to create agent:', err);
      setCreateError(err.response?.data?.error || '創建代理失敗');
    }
  };

  const handleCreateMember = async () => {
    try {
      await agentManagementApi.createMember({
        username: createForm.username,
        password: createForm.password,
        nickname: createForm.nickname,
        initialBalance: createForm.initialBalance,
        betLimits: createForm.betLimits,
      });
      setShowCreateModal(false);
      setMemberCreateStep(1);
      setCreateError('');
      setCreateForm({
        username: '',
        password: '',
        confirmPassword: '',
        nickname: '',
        initialBalance: 0,
        sharePercent: 0,
        rebatePercent: 0,
        betLimits: [],
      });
      fetchData();
    } catch (err: any) {
      console.error('Failed to create member:', err);
      setCreateError(err.response?.data?.error || '創建會員失敗');
    }
  };

  const handleDeleteSubAccount = async (id: string) => {
    try {
      await agentManagementApi.deleteSubAccount(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete sub account:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getCurrentItems = <T,>(items: T[]) => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const getTotalPages = (total: number) => Math.max(1, Math.ceil(total / pageSize));

  const formatCurrency = (value: number) => {
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string, isLocked: boolean, isFullDisabled: boolean) => {
    if (isFullDisabled) return <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400">全线禁用</span>;
    if (isLocked) return <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">锁定</span>;
    if (status === 'active') return <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">正常</span>;
    if (status === 'suspended') return <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/20 text-yellow-400">停用</span>;
    return <span className="px-2 py-0.5 rounded text-xs bg-gray-500/20 text-gray-400">{status}</span>;
  };

  const tabs = [
    { key: 'agents' as TabType, label: '代理管理', icon: Building2 },
    { key: 'members' as TabType, label: '会员管理', icon: Users },
    { key: 'subAccounts' as TabType, label: '子账号', icon: UserPlus },
  ];

  const betLimitOptions = [
    '100-1000', '100-3000', '100-5000', '100-10000',
    '500-5000', '500-10000', '500-30000',
    '1000-10000', '1000-30000', '1000-50000',
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      {dashboard && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4"
        >
          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">剩余额度</p>
                <p className="text-white font-bold">{formatCurrency(dashboard.balance)}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">拥有代理数</p>
                <p className="text-white font-bold">{dashboard.agentCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">直属会员数</p>
                <p className="text-white font-bold">{dashboard.directMemberCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-gray-400 text-xs">总会员数</p>
                <p className="text-white font-bold">{dashboard.totalMemberCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className={`w-3 h-3 rounded-full ${dashboard.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
              <div>
                <p className="text-gray-400 text-xs">账号状态</p>
                <p className={`font-bold ${dashboard.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                  {dashboard.status === 'active' ? '账号正常' : '异常'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Current User Info Bar */}
      {dashboard && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#252525] border border-[#333] rounded-xl p-3 flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm"
        >
          <span className="text-gray-400">
            代理层级：<span className="text-amber-400">{dashboard.agentLevel === 0 ? '管理员' : `${dashboard.agentLevel}级代理`}</span>
          </span>
          <span className="text-gray-400">
            账号：<span className="text-white">{dashboard.username}</span>
          </span>
          <span className="text-gray-400">
            剩余额度：<span className="text-amber-400 font-medium">{formatCurrency(dashboard.balance)}</span>
          </span>
          <span className="text-gray-400">
            账号状态：<span className={dashboard.status === 'active' ? 'text-green-400' : 'text-red-400'}>
              {dashboard.status === 'active' ? '账号正常' : '异常'}
            </span>
          </span>
        </motion.div>
      )}

      {/* Breadcrumb Navigation */}
      {breadcrumb.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#252525] border border-[#333] rounded-xl p-3 flex flex-wrap items-center gap-2"
        >
          <button
            onClick={handleGoBack}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#333] hover:bg-[#444] text-white text-sm rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上级
          </button>
          <div className="flex items-center gap-1 text-sm">
            {breadcrumb.map((item, index) => (
              <div key={item.id} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500" />}
                <button
                  onClick={() => handleBreadcrumbClick(item.id, index)}
                  className={`px-2 py-1 rounded transition-colors ${
                    index === breadcrumb.length - 1
                      ? 'bg-amber-500/20 text-amber-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-[#333]'
                  }`}
                >
                  {item.nickname || item.username}
                </button>
              </div>
            ))}
          </div>
          {viewAgent && (
            <div className="ml-auto text-sm text-gray-400">
              <span className="text-amber-400">{viewAgent.agentLevel}级代理</span>
              <span className="mx-2">|</span>
              余额: <span className="text-amber-400 font-medium">{formatCurrency(viewAgent.balance)}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-[#333] overflow-x-auto">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-3 transition-all border-b-2 -mb-[2px] whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 flex-1">
          {/* 帳號搜索 */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
              {activeTab === 'members' ? '会员账号' : activeTab === 'agents' ? '代理账号' : '子账号'}
            </span>
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder={activeTab === 'agents' ? '请输入代理账号' : activeTab === 'members' ? '请输入会员账号' : '搜索子账号...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full sm:w-48 px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* 帳號狀態 (會員管理才顯示) */}
          {activeTab === 'members' && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm whitespace-nowrap">账号状态</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="">请选择</option>
                <option value="active">正常</option>
                <option value="locked">锁定</option>
                <option value="disabled">禁用</option>
              </select>
            </div>
          )}

          {/* 創建時間 (會員管理才顯示) */}
          {activeTab === 'members' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">创建时间</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="开始日期"
              />
              <span className="text-gray-400 hidden sm:inline">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                placeholder="结束日期"
              />
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="flex-1 sm:flex-none px-4 py-2 min-h-[44px] sm:min-h-0 bg-[#1e1e1e] border border-[#333] text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
            >
              重置
            </button>
            <button
              onClick={handleSearch}
              className="flex-1 sm:flex-none px-4 py-2 min-h-[44px] sm:min-h-0 bg-amber-500 hover:bg-amber-600 text-black font-medium text-sm rounded-lg transition-colors"
            >
              查询
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'subAccounts') {
              setSubAccountModal({ open: true, subAccount: null });
            } else {
              setShowCreateModal(true);
            }
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-amber-500 text-amber-400 hover:bg-amber-500/10 font-medium text-sm rounded-lg transition-colors w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'agents' ? '新建代理' : activeTab === 'members' ? '新建会员' : '新建'}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">加载中...</div>
        </div>
      ) : activeTab === 'agents' ? (
        <div className="space-y-3">
          {agents.length === 0 ? (
            <div className="text-center py-12 text-gray-400">暂无数据</div>
          ) : (
            getCurrentItems(agents).map((agent) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden"
              >
                {/* Agent Card */}
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0">
                    {/* Left: Agent Info */}
                    <div className="flex flex-wrap items-start gap-3 sm:gap-4">
                      <div className="text-center min-w-[60px]">
                        <p className="text-gray-400 text-xs mb-1">代理层级</p>
                        <p className="text-white font-medium text-sm sm:text-base">{agent.agentLevel}级代理</p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-xs mb-1">账号/复制账号密码</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAgentClick(agent.id)}
                            className="text-amber-400 font-medium hover:text-amber-300 hover:underline transition-colors"
                            title="点击查看下线"
                          >
                            {agent.username}
                          </button>
                          <button
                            onClick={() => copyToClipboard(`${agent.username}`)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-gray-400 text-sm">({agent.nickname || '无名称'})</p>
                        {agent.remark && (
                          <p className="text-gray-500 text-xs mt-0.5 italic">备注: {agent.remark}</p>
                        )}
                      </div>

                      <div className="text-center">
                        <p className="text-gray-400 text-xs mb-1">剩余额度</p>
                        <p
                          className="text-amber-400 font-medium cursor-pointer hover:text-amber-300"
                          onClick={() => setBalanceModal({ open: true, agent })}
                        >
                          {formatCurrency(agent.balance)}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-400 text-xs mb-1">&nbsp;</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShareSettingModal({ open: true, agent })}
                            className="text-amber-400 hover:text-amber-300 text-sm"
                          >
                            厂商
                          </button>
                          <button
                            onClick={() => setShareSettingModal({ open: true, agent })}
                            className="text-amber-400 hover:text-amber-300 text-sm"
                          >
                            占成/退水
                          </button>
                          <button
                            onClick={() => setBetLimitModal({ open: true, agent })}
                            className="text-amber-400 hover:text-amber-300 text-sm"
                          >
                            限红
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status & Actions */}
                    <div className="flex flex-wrap items-start gap-4 sm:gap-6 w-full sm:w-auto">
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                          <input
                            type="checkbox"
                            checked={agent.isLocked}
                            onChange={() => handleStatusChange(agent.id, agent.isLocked ? 'unlock' : 'lock')}
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded"
                          />
                          <span className="text-white text-xs sm:text-sm">锁定登入</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                          <input
                            type="checkbox"
                            checked={agent.isFullDisabled}
                            onChange={() => handleStatusChange(agent.id, agent.isFullDisabled ? 'enable' : 'disable')}
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded"
                          />
                          <span className="text-white text-xs sm:text-sm">全线禁用</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                          <input
                            type="checkbox"
                            checked={agent.isReadonly}
                            onChange={() => handleStatusChange(agent.id, agent.isReadonly ? 'unreadonly' : 'readonly')}
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded"
                          />
                          <span className="text-white text-xs sm:text-sm">禁止投注/操作</span>
                        </label>
                      </div>

                      <div className="text-center">
                        <button
                          onClick={() => setConfirmModal({ open: true, agent, action: 'withdrawAll' })}
                          className="text-amber-400 hover:text-amber-300 text-xs sm:text-sm min-h-[32px]"
                        >
                          抽取全线额度
                        </button>
                        <br />
                        <button
                          onClick={() => setEditAgentModal({ open: true, agent, type: 'agent' })}
                          className="text-amber-400 hover:text-amber-300 text-xs sm:text-sm min-h-[32px]"
                        >
                          修改账号
                        </button>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-400 text-xs mb-1">邀请码/复制邀请链接</p>
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{agent.inviteCode || '-'}</span>
                          {agent.inviteCode && (
                            <button
                              onClick={() => copyToClipboard(agent.inviteCode)}
                              className="text-gray-400 hover:text-white p-1"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : activeTab === 'members' ? (
        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="text-center py-12 text-gray-400">暂无数据</div>
          ) : (
            getCurrentItems(members).map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1e1e1e] border border-[#333] rounded-xl overflow-hidden"
              >
                {/* Member Card */}
                <div className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0">
                    {/* Left: Member Info */}
                    <div className="flex flex-wrap items-start gap-3 sm:gap-4">
                      <div className="text-center min-w-[80px]">
                        <p className="text-gray-400 text-xs mb-1">会员账号/复制账号</p>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-medium text-sm sm:text-base">{member.username}</span>
                          <button
                            onClick={() => copyToClipboard(member.username)}
                            className="text-gray-400 hover:text-white p-1"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-gray-400 text-xs sm:text-sm">({member.nickname || '无名称'})</p>
                        {member.remark && (
                          <p className="text-gray-500 text-xs mt-0.5 italic">备注: {member.remark}</p>
                        )}
                      </div>

                      <div className="text-center min-w-[80px]">
                        <p className="text-gray-400 text-xs mb-1">所属代理名称</p>
                        <p className="text-white font-medium text-sm sm:text-base">
                          {member.parentAgent?.nickname || member.parentAgent?.username || '-'}
                        </p>
                        <p className="text-gray-400 text-xs sm:text-sm">
                          ({member.parentAgent?.username || '-'})
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-400 text-xs mb-1">余额</p>
                        <p
                          className="text-amber-400 font-medium cursor-pointer hover:text-amber-300"
                          onClick={() => setBalanceModal({ open: true, agent: member as any })}
                        >
                          {formatCurrency(member.balance)}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-400 text-xs mb-1">&nbsp;</p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShareSettingModal({ open: true, agent: member as any })}
                            className="text-amber-400 hover:text-amber-300 text-sm"
                          >
                            厂商
                          </button>
                          <button
                            className="text-amber-400 hover:text-amber-300 text-sm"
                          >
                            退水
                          </button>
                          <button
                            onClick={() => setBetLimitModal({ open: true, agent: member as any })}
                            className="text-amber-400 hover:text-amber-300 text-sm"
                          >
                            限红
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Right: Status & Actions */}
                    <div className="flex flex-wrap items-start gap-4 sm:gap-6 w-full sm:w-auto">
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                          <input
                            type="checkbox"
                            checked={member.isLocked}
                            onChange={() => handleStatusChange(member.id, member.isLocked ? 'unlock' : 'lock')}
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded"
                          />
                          <span className="text-white text-xs sm:text-sm">锁定登入</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                          <input
                            type="checkbox"
                            checked={member.isFullDisabled}
                            onChange={() => handleStatusChange(member.id, member.isFullDisabled ? 'enable' : 'disable')}
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded"
                          />
                          <span className="text-white text-xs sm:text-sm">全线禁用</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer min-h-[32px]">
                          <input
                            type="checkbox"
                            checked={member.isReadonly}
                            onChange={() => handleStatusChange(member.id, member.isReadonly ? 'unreadonly' : 'readonly')}
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded"
                          />
                          <span className="text-white text-xs sm:text-sm">禁止投注/操作</span>
                        </label>
                      </div>

                      <div className="text-center">
                        <button
                          onClick={() => setConfirmModal({ open: true, agent: member as any, action: 'withdrawAll' })}
                          className="text-amber-400 hover:text-amber-300 text-xs sm:text-sm min-h-[32px]"
                        >
                          抽取全线额度
                        </button>
                        <br />
                        <button
                          onClick={() => setEditAgentModal({ open: true, agent: member, type: 'member' })}
                          className="text-amber-400 hover:text-amber-300 text-xs sm:text-sm min-h-[32px]"
                        >
                          修改账号
                        </button>
                      </div>

                      <div className="text-center hidden sm:block">
                        <p className="text-gray-400 text-xs mb-1">手机号</p>
                        <p className="text-white text-sm">-</p>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-400 text-xs mb-1">创建时间</p>
                        <p className="text-white text-xs sm:text-sm">
                          {new Date(member.createdAt).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).replace(/\//g, '-')}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-400 text-xs mb-1">最后登入时间</p>
                        <p className="text-white text-sm">
                          {member.lastLoginAt
                            ? new Date(member.lastLoginAt).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }).replace(/\//g, '-')
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        // Sub Accounts Tab
        <div className="space-y-3">
          {subAccounts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">暂无数据</div>
          ) : (
            getCurrentItems(subAccounts).map((sub) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{sub.username}</span>
                        <span className="text-gray-400 text-sm">({sub.nickname || '无名称'})</span>
                        {getStatusBadge(sub.status, false, false)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span>创建时间：{new Date(sub.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                      {sub.permissions && Object.entries(sub.permissions).some(([, v]) => v) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Object.entries(sub.permissions)
                            .filter(([, v]) => v)
                            .map(([key]) => (
                              <span
                                key={key}
                                className="px-1.5 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400"
                              >
                                {PERMISSION_LABELS[key] || key}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSubAccountModal({ open: true, subAccount: sub })}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSubAccount(sub.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                      title="删除"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {(() => {
        const totalItems = activeTab === 'agents' ? agents.length : activeTab === 'members' ? members.length : subAccounts.length;
        const totalPages = getTotalPages(totalItems);
        return (
          <div className="flex items-center justify-end gap-3">
            <span className="text-gray-400 text-sm">
              {currentPage} / {totalPages} (共 {totalItems} 条)
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 bg-[#1e1e1e] border border-[#333] rounded text-white text-sm disabled:opacity-40 hover:bg-[#2a2a2a] transition-colors"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 bg-[#1e1e1e] border border-[#333] rounded text-white text-sm disabled:opacity-40 hover:bg-[#2a2a2a] transition-colors"
              >
                下一页
              </button>
            </div>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 bg-[#1e1e1e] border border-[#333] rounded text-white text-sm"
            >
              <option value={10}>10 条/页</option>
              <option value={20}>20 条/页</option>
              <option value={50}>50 条/页</option>
            </select>
          </div>
        );
      })()}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e1e1e] border border-[#333] rounded-xl w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white text-lg font-bold">
                {activeTab === 'agents' ? `創建代理 (${createStep}/2)` : `創建會員 (${memberCreateStep}/2)`}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateStep(1);
                  setCreateError('');
                  setCreateForm({
                    username: '',
                    password: '',
                    confirmPassword: '',
                    nickname: '',
                    initialBalance: 0,
                    sharePercent: 0,
                    rebatePercent: 0,
                    betLimits: [],
                  });
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {createError}
              </div>
            )}

            {activeTab === 'agents' ? (
              <>
                {createStep === 1 && (
                  <div className="space-y-4">
                    {/* 帳號設置 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">
                        <span className="text-red-400">*</span> 帳號設置
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={createForm.username}
                          onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                          className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                          placeholder="請輸入帳號"
                          minLength={6}
                          maxLength={12}
                        />
                        <button
                          onClick={() => {
                            // 自動生成帳號：6-12位英文加數字
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            const length = Math.floor(Math.random() * 7) + 6; // 6-12
                            let result = '';
                            // 確保至少有一個字母和一個數字
                            result += chars.charAt(Math.floor(Math.random() * 52)); // 字母
                            result += chars.charAt(52 + Math.floor(Math.random() * 10)); // 數字
                            for (let i = 2; i < length; i++) {
                              result += chars.charAt(Math.floor(Math.random() * chars.length));
                            }
                            // 打亂順序
                            result = result.split('').sort(() => Math.random() - 0.5).join('');
                            setCreateForm({ ...createForm, username: result });
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          自動生成
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">帳號為英文加數字組成，格式為6-12位</p>
                    </div>

                    {/* 密碼設置 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">
                        <span className="text-red-400">*</span> 密碼設置
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={createForm.password}
                          onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                          className="w-full px-4 py-2 pr-10 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                          placeholder="請輸入密碼"
                          minLength={8}
                          maxLength={16}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">8-16位字符</p>
                    </div>

                    {/* 確認密碼 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">
                        <span className="text-red-400">*</span> 確認密碼
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={createForm.confirmPassword}
                          onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 pr-10 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                          placeholder="再次確認密碼"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* 代理名稱 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">
                        <span className="text-red-400">*</span> 代理名稱
                      </label>
                      <input
                        type="text"
                        value={createForm.nickname}
                        onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })}
                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="請輸入代理名稱"
                      />
                    </div>
                  </div>
                )}

                {createStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-gray-400 text-sm">限紅設定</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCreateForm({ ...createForm, betLimits: [...betLimitOptions] })}
                          className="px-3 py-1 bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#444] text-sm rounded transition-colors"
                        >
                          全選
                        </button>
                        <button
                          onClick={() => {
                            const inverted = betLimitOptions.filter(l => !createForm.betLimits.includes(l));
                            setCreateForm({ ...createForm, betLimits: inverted });
                          }}
                          className="px-3 py-1 bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#444] text-sm rounded transition-colors"
                        >
                          反選
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {betLimitOptions.map((limit) => (
                        <label
                          key={limit}
                          className="flex items-center gap-3 p-3 bg-[#2a2a2a] rounded-lg cursor-pointer hover:bg-[#333] transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={createForm.betLimits.includes(limit)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCreateForm({ ...createForm, betLimits: [...createForm.betLimits, limit] });
                              } else {
                                setCreateForm({ ...createForm, betLimits: createForm.betLimits.filter(l => l !== limit) });
                              }
                            }}
                            className="w-5 h-5 text-amber-500 bg-[#333] border-[#444] rounded focus:ring-amber-500"
                          />
                          <span className="text-white text-sm">{limit}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateStep(1);
                      setCreateError('');
                    }}
                    className="px-6 py-2 bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#444] rounded-lg"
                  >
                    取 消
                  </button>
                  {createStep > 1 && (
                    <button
                      onClick={() => setCreateStep(createStep - 1)}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg"
                    >
                      上一步
                    </button>
                  )}
                  {createStep < 2 ? (
                    <button
                      onClick={() => {
                        // 驗證 Step 1
                        if (!createForm.username || createForm.username.length < 6 || createForm.username.length > 12) {
                          setCreateError('帳號必須為6-12位');
                          return;
                        }
                        if (!/^[a-zA-Z0-9]+$/.test(createForm.username)) {
                          setCreateError('帳號只能包含英文和數字');
                          return;
                        }
                        if (!createForm.password || createForm.password.length < 8 || createForm.password.length > 16) {
                          setCreateError('密碼必須為8-16位字符');
                          return;
                        }
                        if (createForm.password !== createForm.confirmPassword) {
                          setCreateError('兩次密碼不一致');
                          return;
                        }
                        if (!createForm.nickname) {
                          setCreateError('請輸入代理名稱');
                          return;
                        }
                        setCreateError('');
                        setCreateStep(createStep + 1);
                      }}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg"
                    >
                      下一步
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (createForm.betLimits.length === 0) {
                          setCreateError('請至少選擇一個限紅');
                          return;
                        }
                        setCreateError('');
                        handleCreateAgent();
                      }}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg"
                    >
                      下一步
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* 創建會員 - 2步驟流程 */}
                {memberCreateStep === 1 && (
                  <div className="space-y-4">
                    {/* 帳號設置 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">
                        <span className="text-red-400">*</span> 帳號設置
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={createForm.username}
                          onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                          className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                          placeholder="請輸入帳號"
                          minLength={6}
                          maxLength={12}
                        />
                        <button
                          onClick={() => {
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                            const length = Math.floor(Math.random() * 7) + 6;
                            let result = '';
                            result += chars.charAt(Math.floor(Math.random() * 52));
                            result += chars.charAt(52 + Math.floor(Math.random() * 10));
                            for (let i = 2; i < length; i++) {
                              result += chars.charAt(Math.floor(Math.random() * chars.length));
                            }
                            result = result.split('').sort(() => Math.random() - 0.5).join('');
                            setCreateForm({ ...createForm, username: result });
                          }}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          自動生成
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">帳號為英文加數字組成，格式為6-12位</p>
                    </div>

                    {/* 密碼設置 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">
                        <span className="text-red-400">*</span> 密碼設置
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={createForm.password}
                          onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                          className="w-full px-4 py-2 pr-10 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                          placeholder="請輸入密碼"
                          minLength={8}
                          maxLength={16}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">8-16位字符</p>
                    </div>

                    {/* 確認密碼 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">
                        <span className="text-red-400">*</span> 確認密碼
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={createForm.confirmPassword}
                          onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                          className="w-full px-4 py-2 pr-10 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                          placeholder="再次確認密碼"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* 會員名稱 */}
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">
                        <span className="text-red-400">*</span> 會員名稱
                      </label>
                      <input
                        type="text"
                        value={createForm.nickname}
                        onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })}
                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="請輸入會員名稱"
                      />
                    </div>
                  </div>
                )}

                {memberCreateStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-gray-400 text-sm">限紅設定</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCreateForm({ ...createForm, betLimits: [...availableBetLimits] })}
                          className="px-3 py-1 bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#444] text-sm rounded transition-colors"
                        >
                          全選
                        </button>
                        <button
                          onClick={() => {
                            const inverted = availableBetLimits.filter(l => !createForm.betLimits.includes(l));
                            setCreateForm({ ...createForm, betLimits: inverted });
                          }}
                          className="px-3 py-1 bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#444] text-sm rounded transition-colors"
                        >
                          反選
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {availableBetLimits.map((limit) => (
                        <label
                          key={limit}
                          className="flex items-center gap-3 p-3 bg-[#2a2a2a] rounded-lg cursor-pointer hover:bg-[#333] transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={createForm.betLimits.includes(limit)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCreateForm({ ...createForm, betLimits: [...createForm.betLimits, limit] });
                              } else {
                                setCreateForm({ ...createForm, betLimits: createForm.betLimits.filter(l => l !== limit) });
                              }
                            }}
                            className="w-5 h-5 text-amber-500 bg-[#333] border-[#444] rounded focus:ring-amber-500"
                          />
                          <span className="text-white text-sm">{limit}</span>
                        </label>
                      ))}
                    </div>
                    {availableBetLimits.length === 0 && (
                      <p className="text-gray-400 text-sm text-center py-4">暫無可用的限紅選項</p>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setMemberCreateStep(1);
                      setCreateError('');
                    }}
                    className="px-6 py-2 bg-[#2a2a2a] text-gray-300 hover:text-white border border-[#444] rounded-lg"
                  >
                    取 消
                  </button>
                  {memberCreateStep > 1 && (
                    <button
                      onClick={() => setMemberCreateStep(memberCreateStep - 1)}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg"
                    >
                      上一步
                    </button>
                  )}
                  {memberCreateStep < 2 ? (
                    <button
                      onClick={() => {
                        // 驗證 Step 1
                        if (!createForm.username || createForm.username.length < 6 || createForm.username.length > 12) {
                          setCreateError('帳號必須為6-12位');
                          return;
                        }
                        if (!/^[a-zA-Z0-9]+$/.test(createForm.username)) {
                          setCreateError('帳號只能包含英文和數字');
                          return;
                        }
                        if (!createForm.password || createForm.password.length < 8 || createForm.password.length > 16) {
                          setCreateError('密碼必須為8-16位字符');
                          return;
                        }
                        if (createForm.password !== createForm.confirmPassword) {
                          setCreateError('兩次密碼不一致');
                          return;
                        }
                        if (!createForm.nickname) {
                          setCreateError('請輸入會員名稱');
                          return;
                        }
                        setCreateError('');
                        setMemberCreateStep(2);
                      }}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg"
                    >
                      下一步
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (createForm.betLimits.length === 0) {
                          setCreateError('請至少選擇一個限紅');
                          return;
                        }
                        setCreateError('');
                        handleCreateMember();
                      }}
                      className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg"
                    >
                      下一步
                    </button>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Share Setting Modal */}
      <ShareSettingModal
        isOpen={shareSettingModal.open}
        onClose={() => setShareSettingModal({ open: false, agent: null })}
        agentId={shareSettingModal.agent?.id || ''}
        agentName={shareSettingModal.agent?.nickname || shareSettingModal.agent?.username || ''}
        onSuccess={fetchData}
        onOpenHistory={() => setShareHistoryModal({ open: true, agent: shareSettingModal.agent })}
      />

      {/* Bet Limit Modal */}
      <BetLimitModal
        isOpen={betLimitModal.open}
        onClose={() => setBetLimitModal({ open: false, agent: null })}
        agentId={betLimitModal.agent?.id || ''}
        agentName={betLimitModal.agent?.nickname || betLimitModal.agent?.username || ''}
        onSuccess={fetchData}
      />

      {/* Balance Modal */}
      <BalanceModal
        isOpen={balanceModal.open}
        onClose={() => setBalanceModal({ open: false, agent: null })}
        agentId={balanceModal.agent?.id || ''}
        agentName={balanceModal.agent?.nickname || balanceModal.agent?.username || ''}
        currentBalance={balanceModal.agent?.balance || 0}
        myBalance={dashboard?.balance || 0}
        onSuccess={fetchData}
      />

      {/* Sub Account Modal */}
      <SubAccountModal
        isOpen={subAccountModal.open}
        onClose={() => setSubAccountModal({ open: false, subAccount: null })}
        subAccount={subAccountModal.subAccount}
        onSuccess={fetchData}
      />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, agent: null, action: '' })}
        onConfirm={handleWithdrawAll}
        title="确定执行此操作？"
        message={`即将把所选代理及其所有下级代理和会员的余额转移到该代理的上级代理账户中`}
        type="warning"
      />

      {/* Edit Agent Modal */}
      <EditAgentModal
        isOpen={editAgentModal.open}
        onClose={() => setEditAgentModal({ open: false, agent: null, type: 'agent' })}
        agent={editAgentModal.agent}
        onSuccess={fetchData}
        type={editAgentModal.type}
      />

      {/* Share History Modal */}
      <ShareHistoryModal
        isOpen={shareHistoryModal.open}
        onClose={() => setShareHistoryModal({ open: false, agent: null })}
        agentId={shareHistoryModal.agent?.id || ''}
        agentName={shareHistoryModal.agent?.nickname || shareHistoryModal.agent?.username || ''}
      />
    </div>
  );
}
