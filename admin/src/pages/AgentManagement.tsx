import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Building2,
  Wallet,
  Search,
  Lock,
  Unlock,
  Plus,
  X,
  Copy,
  Edit
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
}

interface Member {
  id: string;
  username: string;
  nickname: string;
  balance: number;
  status: string;
  isLocked: boolean;
  isReadonly: boolean;
  createdAt: string;
  lastLoginAt: string | null;
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

  // Modal states
  const [shareSettingModal, setShareSettingModal] = useState<{ open: boolean; agent: Agent | null }>({ open: false, agent: null });
  const [betLimitModal, setBetLimitModal] = useState<{ open: boolean; agent: Agent | null }>({ open: false, agent: null });
  const [balanceModal, setBalanceModal] = useState<{ open: boolean; agent: Agent | null }>({ open: false, agent: null });
  const [subAccountModal, setSubAccountModal] = useState<{ open: boolean; subAccount: SubAccount | null }>({ open: false, subAccount: null });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; agent: Agent | null; action: string }>({ open: false, agent: null, action: '' });
  const [editAgentModal, setEditAgentModal] = useState<{ open: boolean; agent: Agent | null }>({ open: false, agent: null });
  const [shareHistoryModal, setShareHistoryModal] = useState<{ open: boolean; agent: Agent | null }>({ open: false, agent: null });

  // Create form state
  const [createForm, setCreateForm] = useState({
    username: '',
    password: '',
    nickname: '',
    initialBalance: 0,
    sharePercent: 0,
    rebatePercent: 0,
    betLimits: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const dashRes = await agentManagementApi.getDashboard();
      setDashboard(dashRes.data);

      if (activeTab === 'agents') {
        const res = await agentManagementApi.getAgents({ search: searchQuery });
        setAgents(res.data.agents);
      } else if (activeTab === 'members') {
        const res = await agentManagementApi.getMembers({ search: searchQuery });
        setMembers(res.data.members);
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
      await agentManagementApi.createAgent(createForm);
      setShowCreateModal(false);
      setCreateStep(1);
      setCreateForm({
        username: '',
        password: '',
        nickname: '',
        initialBalance: 0,
        sharePercent: 0,
        rebatePercent: 0,
        betLimits: [],
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create agent:', err);
    }
  };

  const handleCreateMember = async () => {
    try {
      await agentManagementApi.createMember({
        username: createForm.username,
        password: createForm.password,
        nickname: createForm.nickname,
        initialBalance: createForm.initialBalance,
      });
      setShowCreateModal(false);
      setCreateForm({
        username: '',
        password: '',
        nickname: '',
        initialBalance: 0,
        sharePercent: 0,
        rebatePercent: 0,
        betLimits: [],
      });
      fetchData();
    } catch (err) {
      console.error('Failed to create member:', err);
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
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
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
          className="bg-[#252525] border border-[#333] rounded-xl p-3 flex items-center gap-6 text-sm"
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

      {/* Tabs */}
      <div className="flex items-center border-b border-[#333]">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-6 py-3 transition-all border-b-2 -mb-[2px] ${
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'agents' ? '请输入代理账号' : activeTab === 'members' ? '请输入会员账号' : '搜索子账号...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-[#1e1e1e] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-[#1e1e1e] border border-[#333] text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
          >
            重置
          </button>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium text-sm rounded-lg transition-colors"
          >
            查询
          </button>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'subAccounts') {
              setSubAccountModal({ open: true, subAccount: null });
            } else {
              setShowCreateModal(true);
            }
          }}
          className="flex items-center gap-2 px-4 py-2 border border-amber-500 text-amber-400 hover:bg-amber-500/10 font-medium text-sm rounded-lg transition-colors"
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
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Left: Agent Info */}
                    <div className="flex items-start gap-4">
                      <div className="text-center">
                        <p className="text-gray-400 text-xs mb-1">代理层级</p>
                        <p className="text-white font-medium">{agent.agentLevel}级代理</p>
                      </div>

                      <div>
                        <p className="text-gray-400 text-xs mb-1">账号/复制账号密码</p>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400 font-medium">{agent.username}</span>
                          <button
                            onClick={() => copyToClipboard(`${agent.username}`)}
                            className="text-gray-400 hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-gray-400 text-sm">({agent.nickname || '无名称'})</p>
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
                    <div className="flex items-start gap-6">
                      <div className="space-y-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agent.isLocked}
                            onChange={() => handleStatusChange(agent.id, agent.isLocked ? 'unlock' : 'lock')}
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded"
                          />
                          <span className="text-white text-sm">锁定登入</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agent.isFullDisabled}
                            onChange={() => handleStatusChange(agent.id, agent.isFullDisabled ? 'enable' : 'disable')}
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded"
                          />
                          <span className="text-white text-sm">全线禁用</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={agent.isReadonly}
                            onChange={() => handleStatusChange(agent.id, agent.isReadonly ? 'unreadonly' : 'readonly')}
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded"
                          />
                          <span className="text-white text-sm">禁止投注/操作</span>
                        </label>
                      </div>

                      <div className="text-center">
                        <button
                          onClick={() => setConfirmModal({ open: true, agent, action: 'withdrawAll' })}
                          className="text-amber-400 hover:text-amber-300 text-sm"
                        >
                          抽取全线额度
                        </button>
                        <br />
                        <button
                          onClick={() => setEditAgentModal({ open: true, agent })}
                          className="text-amber-400 hover:text-amber-300 text-sm"
                        >
                          修改账号
                        </button>
                      </div>

                      <div className="text-center">
                        <p className="text-gray-400 text-xs mb-1">邀请码/复制邀请链接</p>
                        <div className="flex items-center gap-2">
                          <span className="text-white">{agent.inviteCode || '-'}</span>
                          {agent.inviteCode && (
                            <button
                              onClick={() => copyToClipboard(agent.inviteCode)}
                              className="text-gray-400 hover:text-white"
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
                className="bg-[#1e1e1e] border border-[#333] rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{member.username}</span>
                        <span className="text-gray-400 text-sm">({member.nickname || '无名称'})</span>
                        {getStatusBadge(member.status, member.isLocked, false)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span>创建时间：{new Date(member.createdAt).toLocaleString('zh-CN')}</span>
                        <span>最后登入：{member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleString('zh-CN') : '从未登入'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-amber-400 font-bold">{formatCurrency(member.balance)}</p>
                      <p className="text-xs text-gray-400">余额</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.isLocked ? (
                        <button
                          onClick={() => handleStatusChange(member.id, 'unlock')}
                          className="p-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
                          title="解锁登入"
                        >
                          <Unlock className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(member.id, 'lock')}
                          className="p-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
                          title="锁定登入"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                      )}
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
                {activeTab === 'agents' ? `创建代理 (${createStep}/5)` : '创建会员'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateStep(1);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeTab === 'agents' ? (
              <>
                {createStep === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">账号 *</label>
                      <input
                        type="text"
                        value={createForm.username}
                        onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="请输入账号"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">密码 *</label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="请输入密码"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">名称</label>
                      <input
                        type="text"
                        value={createForm.nickname}
                        onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })}
                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="请输入名称"
                      />
                    </div>
                  </div>
                )}

                {createStep === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">初始额度</label>
                      <input
                        type="number"
                        value={createForm.initialBalance}
                        onChange={(e) => setCreateForm({ ...createForm, initialBalance: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                  </div>
                )}

                {createStep === 3 && (
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">厂商设定（预设开放所有）</p>
                    <div className="bg-[#2a2a2a] rounded-lg p-4">
                      <p className="text-white text-sm">此步骤暂时跳过，稍后可在占成设定中配置</p>
                    </div>
                  </div>
                )}

                {createStep === 4 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">占成比例 (%)</label>
                      <input
                        type="number"
                        value={createForm.sharePercent}
                        onChange={(e) => setCreateForm({ ...createForm, sharePercent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="0"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">退水比例 (%)</label>
                      <input
                        type="number"
                        value={createForm.rebatePercent}
                        onChange={(e) => setCreateForm({ ...createForm, rebatePercent: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                        placeholder="0"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                )}

                {createStep === 5 && (
                  <div className="space-y-4">
                    <label className="block text-gray-400 text-sm mb-2">限红设定</label>
                    <div className="grid grid-cols-2 gap-2">
                      {betLimitOptions.map((limit) => (
                        <label
                          key={limit}
                          className="flex items-center gap-2 p-2 bg-[#2a2a2a] rounded-lg cursor-pointer hover:bg-[#333] transition-colors"
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
                            className="w-4 h-4 text-amber-500 bg-[#333] border-[#444] rounded focus:ring-amber-500"
                          />
                          <span className="text-white text-sm">{limit}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setCreateStep(Math.max(1, createStep - 1))}
                    disabled={createStep === 1}
                    className="px-4 py-2 bg-[#2a2a2a] text-gray-400 rounded-lg disabled:opacity-50"
                  >
                    上一步
                  </button>
                  {createStep < 5 ? (
                    <button
                      onClick={() => setCreateStep(createStep + 1)}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg"
                    >
                      下一步
                    </button>
                  ) : (
                    <button
                      onClick={handleCreateAgent}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                    >
                      确认创建
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">账号 *</label>
                    <input
                      type="text"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                      className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                      placeholder="请输入账号"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">密码 *</label>
                    <input
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                      placeholder="请输入密码"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">名称</label>
                    <input
                      type="text"
                      value={createForm.nickname}
                      onChange={(e) => setCreateForm({ ...createForm, nickname: e.target.value })}
                      className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                      placeholder="请输入名称"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-sm mb-1">初始额度</label>
                    <input
                      type="number"
                      value={createForm.initialBalance}
                      onChange={(e) => setCreateForm({ ...createForm, initialBalance: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white focus:outline-none focus:border-amber-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <button
                    onClick={handleCreateMember}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg"
                  >
                    确认创建
                  </button>
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
        onClose={() => setEditAgentModal({ open: false, agent: null })}
        agent={editAgentModal.agent}
        onSuccess={fetchData}
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
