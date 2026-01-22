import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Copy,
  Check,
  Lock,
  DollarSign,
  Edit2,
  RefreshCw,
  User,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { userApi, transactionApi, authApi } from '../../services/api';
import type { User as UserType } from '../../types';

type TabType = 'agents' | 'members' | 'subaccounts';

interface PersonalStats {
  remainingCredit: number;
  agentCount: number;
  directMemberCount: number;
  totalMemberCount: number;
  accountStatus: 'active' | 'suspended' | 'banned';
}

interface CreateAgentStep {
  step: number;
  total: number;
}

export default function Agents() {
  const { i18n } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const isZh = i18n.language === 'zh';

  const [activeTab, setActiveTab] = useState<TabType>('agents');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Data
  const [agents, setAgents] = useState<UserType[]>([]);
  const [members, setMembers] = useState<UserType[]>([]);
  const [personalStats, setPersonalStats] = useState<PersonalStats>({
    remainingCredit: user?.balance || 0,
    agentCount: 0,
    directMemberCount: 0,
    totalMemberCount: 0,
    accountStatus: 'active',
  });

  // Modal states
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [showCreateMemberModal, setShowCreateMemberModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create agent form
  const [createStep, setCreateStep] = useState<CreateAgentStep>({ step: 1, total: 5 });
  const [agentForm, setAgentForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    initialCredit: '',
  });

  // Create member form
  const [memberForm, setMemberForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });

  // Points form
  const [pointsForm, setPointsForm] = useState({
    type: 'deposit' as 'deposit' | 'withdraw',
    amount: '',
    note: '',
  });

  // Edit form
  const [editForm, setEditForm] = useState({
    password: '',
    confirmPassword: '',
    nickname: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab, search, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const role = activeTab === 'members' ? 'member' : 'agent';
      const params: Record<string, string | number> = {
        page: 1,
        limit: 50,
        role,
      };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;

      // Fetch users and current user's latest balance in parallel
      const [usersResponse, meResponse] = await Promise.all([
        userApi.getUsers(params),
        authApi.me(),
      ]);

      const users = usersResponse.data.users || [];
      const currentUserData = meResponse.data.user || meResponse.data;

      // Update authStore with latest balance
      if (currentUserData?.balance !== undefined) {
        updateUser({ balance: currentUserData.balance });
      }

      if (activeTab === 'members') {
        setMembers(users);
      } else {
        setAgents(users);
      }

      // Update personal stats with fresh balance
      const latestBalance = currentUserData?.balance ?? user?.balance ?? 0;
      setPersonalStats({
        remainingCredit: typeof latestBalance === 'string' ? parseFloat(latestBalance) : latestBalance,
        agentCount: activeTab === 'agents' ? users.length : personalStats.agentCount,
        directMemberCount: activeTab === 'members' ? users.length : personalStats.directMemberCount,
        totalMemberCount: personalStats.totalMemberCount,
        accountStatus: 'active',
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return `$${formatted}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="text-green-400 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>{isZh ? '正常' : 'Active'}</span>;
      case 'suspended':
        return <span className="text-yellow-400 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>{isZh ? '停用' : 'Suspended'}</span>;
      case 'banned':
        return <span className="text-red-400 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>{isZh ? '封禁' : 'Banned'}</span>;
      default:
        return null;
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (createStep.step < 5) {
      // Validate current step
      if (createStep.step === 1) {
        if (!agentForm.username) {
          setFormErrors({ username: isZh ? '請輸入帳號' : 'Username required' });
          return;
        }
        if (!agentForm.password || agentForm.password.length < 6) {
          setFormErrors({ password: isZh ? '密碼至少6位' : 'Password min 6 chars' });
          return;
        }
        if (agentForm.password !== agentForm.confirmPassword) {
          setFormErrors({ confirmPassword: isZh ? '密碼不一致' : 'Passwords do not match' });
          return;
        }
      }
      setCreateStep({ ...createStep, step: createStep.step + 1 });
      return;
    }

    // Final step - submit
    setSubmitting(true);
    try {
      await userApi.createUser({
        username: agentForm.username,
        password: agentForm.password,
        nickname: agentForm.nickname || undefined,
        role: 'agent',
      });

      setShowCreateAgentModal(false);
      setCreateStep({ step: 1, total: 5 });
      setAgentForm({ username: '', password: '', confirmPassword: '', nickname: '', initialCredit: '' });
      fetchData();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || 'Failed to create agent' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    if (!memberForm.username) {
      setFormErrors({ username: isZh ? '請輸入帳號' : 'Username required' });
      return;
    }
    if (!memberForm.password || memberForm.password.length < 6) {
      setFormErrors({ password: isZh ? '密碼至少6位' : 'Password min 6 chars' });
      return;
    }
    if (memberForm.password !== memberForm.confirmPassword) {
      setFormErrors({ confirmPassword: isZh ? '密碼不一致' : 'Passwords do not match' });
      return;
    }

    setSubmitting(true);
    try {
      await userApi.createUser({
        username: memberForm.username,
        password: memberForm.password,
        nickname: memberForm.nickname || undefined,
        role: 'member',
      });

      setShowCreateMemberModal(false);
      setMemberForm({ username: '', password: '', confirmPassword: '', nickname: '' });
      fetchData();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || 'Failed to create member' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePointsOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormErrors({});
    const amount = parseFloat(pointsForm.amount);
    if (isNaN(amount) || amount <= 0) {
      setFormErrors({ amount: isZh ? '金額無效' : 'Invalid amount' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await transactionApi.createTransaction({
        userId: selectedUser.id,
        type: pointsForm.type,
        amount,
        note: pointsForm.note || undefined,
      });

      // Update current user's balance in authStore from API response
      if (response.data.operatorBalance !== undefined) {
        updateUser({ balance: response.data.operatorBalance });
      }

      setShowPointsModal(false);
      setPointsForm({ type: 'deposit', amount: '', note: '' });
      setSelectedUser(null);
      fetchData();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setFormErrors({});

    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      setFormErrors({ confirmPassword: isZh ? '密碼不一致' : 'Passwords do not match' });
      return;
    }

    setSubmitting(true);
    try {
      const updates: Record<string, string> = {};
      if (editForm.password) updates.password = editForm.password;
      if (editForm.nickname) updates.nickname = editForm.nickname;

      await userApi.updateUser(selectedUser.id, updates);

      setShowEditModal(false);
      setEditForm({ password: '', confirmPassword: '', nickname: '' });
      setSelectedUser(null);
      fetchData();
    } catch (error: any) {
      setFormErrors({ submit: error.response?.data?.error || 'Update failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (user: UserType, newStatus: 'active' | 'suspended' | 'banned') => {
    try {
      await userApi.updateUser(user.id, { status: newStatus });
      fetchData();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const tabs = [
    { id: 'agents' as TabType, label: '代理管理', labelEn: 'Agent Management' },
    { id: 'members' as TabType, label: '會員管理', labelEn: 'Member Management' },
    { id: 'subaccounts' as TabType, label: '子帳號', labelEn: 'Sub-accounts' },
  ];

  const currentData = activeTab === 'members' ? members : agents;

  return (
    <div className="space-y-6">
      {/* Personal Stats Panel */}
      <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">{isZh ? '剩餘額度' : 'Remaining Credit'}</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(personalStats.remainingCredit)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">{isZh ? '擁有代理數' : 'Agents'}</p>
            <p className="text-2xl font-bold text-blue-400">{personalStats.agentCount}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">{isZh ? '直屬會員數' : 'Direct Members'}</p>
            <p className="text-2xl font-bold text-green-400">{personalStats.directMemberCount}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">{isZh ? '總會員數' : 'Total Members'}</p>
            <p className="text-2xl font-bold text-purple-400">{personalStats.totalMemberCount}</p>
          </div>
          <div>
            <p className="text-gray-400 text-sm mb-1">{isZh ? '帳號狀態' : 'Status'}</p>
            <span className="text-green-400 font-medium flex items-center gap-1 text-lg">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              {isZh ? '正常' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {/* Current Account Info Bar */}
      <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '代理層級' : 'Level'}:</span>
            <span className="text-orange-400">{user?.role === 'admin' ? (isZh ? '系統管理員' : 'Admin') : '4級代理'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '帳號' : 'Account'}:</span>
            <span className="text-white">{user?.username}</span>
            <button
              onClick={() => copyToClipboard(user?.username || '', 'username')}
              className="text-gray-400 hover:text-orange-400 transition-colors"
            >
              {copiedId === 'username' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '剩餘額度' : 'Credit'}:</span>
            <span className="text-green-400 font-medium">{formatCurrency(user?.balance || 0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '帳號狀態' : 'Status'}:</span>
            <span className="text-green-400">{isZh ? '正常' : 'Active'}</span>
            <button className="text-orange-400 hover:underline text-xs">{isZh ? '修改帳號' : 'Edit'}</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{isZh ? '邀請碼' : 'Invite Code'}:</span>
            <span className="text-white font-mono">ABC123</span>
            <button
              onClick={() => copyToClipboard('ABC123', 'invite')}
              className="text-gray-400 hover:text-orange-400 transition-colors"
            >
              {copiedId === 'invite' ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button className="text-orange-400 hover:underline text-xs">{isZh ? '複製邀請連結' : 'Copy Link'}</button>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 p-1 bg-[#141922] rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {isZh ? tab.label : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Filter & Actions */}
      <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder={isZh ? (activeTab === 'agents' ? '代理帳號' : '會員帳號') : 'Search account'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
          >
            <option value="all">{isZh ? '帳號狀態' : 'All Status'}</option>
            <option value="active">{isZh ? '正常' : 'Active'}</option>
            <option value="suspended">{isZh ? '停用' : 'Suspended'}</option>
            <option value="banned">{isZh ? '封禁' : 'Banned'}</option>
          </select>

          <button
            onClick={fetchData}
            className="px-4 py-2 bg-[#2a3548] text-gray-400 rounded-lg hover:text-white transition-colors"
          >
            <RefreshCw size={18} />
          </button>

          <div className="flex-1" />

          <button
            onClick={() => activeTab === 'agents' ? setShowCreateAgentModal(true) : setShowCreateMemberModal(true)}
            className="flex items-center gap-2 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
          >
            <Plus size={18} />
            {isZh ? (activeTab === 'agents' ? '新建代理' : '新建會員') : (activeTab === 'agents' ? 'New Agent' : 'New Member')}
          </button>
        </div>
      </div>

      {/* Data List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-12 text-center">
            <RefreshCw size={24} className="animate-spin text-gray-400 mx-auto mb-2" />
            <p className="text-gray-400">{isZh ? '載入中...' : 'Loading...'}</p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-12 text-center">
            <p className="text-gray-500">{isZh ? '暫無數據' : 'No data'}</p>
          </div>
        ) : (
          currentData.map((item) => (
            <div
              key={item.id}
              className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-5 hover:border-gray-600/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                    <User size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-orange-400 text-sm">{activeTab === 'agents' ? '5級代理' : (isZh ? '會員' : 'Member')}</span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{item.username}</span>
                      <button
                        onClick={() => copyToClipboard(item.username, item.id)}
                        className="text-gray-400 hover:text-orange-400 transition-colors"
                      >
                        {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                    {item.nickname && (
                      <p className="text-gray-500 text-sm">{item.nickname}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Balance */}
                  <div className="text-right">
                    <p className="text-gray-400 text-xs mb-1">{isZh ? '剩餘額度' : 'Balance'}</p>
                    <p className="text-green-400 font-bold">{formatCurrency(item.balance)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedUser(item);
                        setPointsForm({ type: 'deposit', amount: '', note: '' });
                        setShowPointsModal(true);
                      }}
                      className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                    >
                      <DollarSign size={14} className="inline mr-1" />
                      {isZh ? '入點' : 'Deposit'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(item);
                        setPointsForm({ type: 'withdraw', amount: '', note: '' });
                        setShowPointsModal(true);
                      }}
                      className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                    >
                      <DollarSign size={14} className="inline mr-1" />
                      {isZh ? '出點' : 'Withdraw'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(item);
                        setEditForm({ password: '', confirmPassword: '', nickname: item.nickname || '' });
                        setShowEditModal(true);
                      }}
                      className="px-3 py-1.5 bg-[#2a3548] text-gray-400 rounded-lg hover:text-white transition-colors text-sm"
                    >
                      <Edit2 size={14} className="inline mr-1" />
                      {isZh ? '修改' : 'Edit'}
                    </button>
                    {item.status === 'active' ? (
                      <button
                        onClick={() => handleStatusChange(item, 'suspended')}
                        className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors text-sm"
                      >
                        <Lock size={14} className="inline mr-1" />
                        {isZh ? '停用' : 'Disable'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(item, 'active')}
                        className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                      >
                        <Check size={14} className="inline mr-1" />
                        {isZh ? '啟用' : 'Enable'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Additional Info Row */}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-700/30 text-sm">
                {activeTab === 'agents' && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{isZh ? '廠商連結' : 'Links'}:</span>
                      <button className="text-orange-400 hover:underline">{isZh ? '佔成/退水' : 'Share/Rebate'}</button>
                      <span className="text-gray-600">|</span>
                      <button className="text-orange-400 hover:underline">{isZh ? '限紅' : 'Limits'}</button>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{isZh ? '邀請碼' : 'Invite'}:</span>
                  <span className="text-white font-mono">{item.id.slice(0, 8).toUpperCase()}</span>
                  <button
                    onClick={() => copyToClipboard(item.id.slice(0, 8).toUpperCase(), `invite-${item.id}`)}
                    className="text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    {copiedId === `invite-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">{isZh ? '創建時間' : 'Created'}:</span>
                  <span className="text-gray-400">{new Date(item.createdAt).toLocaleDateString(isZh ? 'zh-TW' : 'en-US')}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Agent Modal */}
      {showCreateAgentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1e2a3a] rounded-xl w-full max-w-md border border-gray-700/50 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">
                {isZh ? `創建代理 (${createStep.step}/${createStep.total})` : `Create Agent (${createStep.step}/${createStep.total})`}
              </h2>
              <button onClick={() => { setShowCreateAgentModal(false); setCreateStep({ step: 1, total: 5 }); }} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateAgent} className="p-6 space-y-4">
              {createStep.step === 1 && (
                <>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{isZh ? '帳號設置' : 'Username'}</label>
                    <input
                      type="text"
                      value={agentForm.username}
                      onChange={(e) => setAgentForm({ ...agentForm, username: e.target.value })}
                      className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      placeholder={isZh ? '輸入帳號' : 'Enter username'}
                    />
                    {formErrors.username && <p className="text-red-400 text-xs mt-1">{formErrors.username}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{isZh ? '密碼設置' : 'Password'}</label>
                    <input
                      type="password"
                      value={agentForm.password}
                      onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                      className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      placeholder={isZh ? '輸入密碼' : 'Enter password'}
                    />
                    {formErrors.password && <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{isZh ? '確認密碼' : 'Confirm Password'}</label>
                    <input
                      type="password"
                      value={agentForm.confirmPassword}
                      onChange={(e) => setAgentForm({ ...agentForm, confirmPassword: e.target.value })}
                      className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      placeholder={isZh ? '再次輸入密碼' : 'Confirm password'}
                    />
                    {formErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">{isZh ? '代理名稱' : 'Nickname'}</label>
                    <input
                      type="text"
                      value={agentForm.nickname}
                      onChange={(e) => setAgentForm({ ...agentForm, nickname: e.target.value })}
                      className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                      placeholder={isZh ? '輸入名稱（選填）' : 'Enter nickname (optional)'}
                    />
                  </div>
                </>
              )}
              {createStep.step === 2 && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">{isZh ? '初始額度' : 'Initial Credit'}</label>
                  <input
                    type="number"
                    value={agentForm.initialCredit}
                    onChange={(e) => setAgentForm({ ...agentForm, initialCredit: e.target.value })}
                    className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                    placeholder="0"
                  />
                  <p className="text-gray-500 text-xs mt-2">{isZh ? '可用額度：' : 'Available: '}{formatCurrency(user?.balance || 0)}</p>
                </div>
              )}
              {createStep.step === 3 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">{isZh ? '廠商設定（暫略）' : 'Platform settings (skip for now)'}</p>
                </div>
              )}
              {createStep.step === 4 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">{isZh ? '佔成/退水設定（暫略）' : 'Share/Rebate settings (skip for now)'}</p>
                </div>
              )}
              {createStep.step === 5 && (
                <div className="text-center py-8">
                  <p className="text-gray-400">{isZh ? '限紅設定（暫略）' : 'Bet limit settings (skip for now)'}</p>
                </div>
              )}

              {formErrors.submit && <p className="text-red-400 text-sm">{formErrors.submit}</p>}

              <div className="flex gap-3 pt-4">
                {createStep.step > 1 && (
                  <button
                    type="button"
                    onClick={() => setCreateStep({ ...createStep, step: createStep.step - 1 })}
                    className="flex-1 px-4 py-2 bg-[#2a3548] text-gray-400 rounded-lg hover:text-white transition-colors"
                  >
                    {isZh ? '上一步' : 'Previous'}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? (isZh ? '處理中...' : 'Processing...') : createStep.step === createStep.total ? (isZh ? '確認創建' : 'Create') : (isZh ? '下一步' : 'Next')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Member Modal */}
      {showCreateMemberModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1e2a3a] rounded-xl w-full max-w-md border border-gray-700/50 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">{isZh ? '新建會員' : 'Create Member'}</h2>
              <button onClick={() => setShowCreateMemberModal(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">{isZh ? '會員帳號' : 'Username'}</label>
                <input
                  type="text"
                  value={memberForm.username}
                  onChange={(e) => setMemberForm({ ...memberForm, username: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
                {formErrors.username && <p className="text-red-400 text-xs mt-1">{formErrors.username}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{isZh ? '密碼' : 'Password'}</label>
                <input
                  type="password"
                  value={memberForm.password}
                  onChange={(e) => setMemberForm({ ...memberForm, password: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
                {formErrors.password && <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{isZh ? '確認密碼' : 'Confirm Password'}</label>
                <input
                  type="password"
                  value={memberForm.confirmPassword}
                  onChange={(e) => setMemberForm({ ...memberForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
                {formErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{isZh ? '暱稱' : 'Nickname'}</label>
                <input
                  type="text"
                  value={memberForm.nickname}
                  onChange={(e) => setMemberForm({ ...memberForm, nickname: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {formErrors.submit && <p className="text-red-400 text-sm">{formErrors.submit}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateMemberModal(false)}
                  className="flex-1 px-4 py-2 bg-[#2a3548] text-gray-400 rounded-lg hover:text-white transition-colors"
                >
                  {isZh ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? (isZh ? '創建中...' : 'Creating...') : (isZh ? '創建會員' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Points Modal */}
      {showPointsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1e2a3a] rounded-xl w-full max-w-md border border-gray-700/50 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">
                {pointsForm.type === 'deposit' ? (isZh ? '入點' : 'Deposit') : (isZh ? '出點' : 'Withdraw')}
              </h2>
              <button onClick={() => { setShowPointsModal(false); setSelectedUser(null); }} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePointsOperation} className="p-6 space-y-4">
              <div className="p-4 bg-[#141922] rounded-lg">
                <p className="text-gray-400 text-sm">{isZh ? '目標帳號' : 'Target'}</p>
                <p className="text-white font-medium">{selectedUser.username}</p>
                <p className="text-orange-400">{isZh ? '當前餘額' : 'Balance'}: {formatCurrency(selectedUser.balance)}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{isZh ? '金額' : 'Amount'}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pointsForm.amount}
                  onChange={(e) => setPointsForm({ ...pointsForm, amount: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
                {formErrors.amount && <p className="text-red-400 text-xs mt-1">{formErrors.amount}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{isZh ? '備註' : 'Note'}</label>
                <input
                  type="text"
                  value={pointsForm.note}
                  onChange={(e) => setPointsForm({ ...pointsForm, note: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {formErrors.submit && <p className="text-red-400 text-sm">{formErrors.submit}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowPointsModal(false); setSelectedUser(null); }}
                  className="flex-1 px-4 py-2 bg-[#2a3548] text-gray-400 rounded-lg hover:text-white transition-colors"
                >
                  {isZh ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${
                    pointsForm.type === 'deposit'
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  {submitting ? (isZh ? '處理中...' : 'Processing...') : (isZh ? '確認' : 'Confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1e2a3a] rounded-xl w-full max-w-md border border-gray-700/50 shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
              <h2 className="text-xl font-bold text-white">{isZh ? '修改帳號' : 'Edit Account'}</h2>
              <button onClick={() => { setShowEditModal(false); setSelectedUser(null); }} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div className="p-4 bg-[#141922] rounded-lg">
                <p className="text-gray-400 text-sm">{isZh ? '帳號' : 'Account'}</p>
                <p className="text-white font-medium">{selectedUser.username}</p>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{isZh ? '新密碼（留空則不修改）' : 'New Password (leave empty to keep)'}</label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{isZh ? '確認新密碼' : 'Confirm New Password'}</label>
                <input
                  type="password"
                  value={editForm.confirmPassword}
                  onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
                {formErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">{isZh ? '暱稱' : 'Nickname'}</label>
                <input
                  type="text"
                  value={editForm.nickname}
                  onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2a3548] border border-gray-700/50 rounded-lg text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              {formErrors.submit && <p className="text-red-400 text-sm">{formErrors.submit}</p>}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); }}
                  className="flex-1 px-4 py-2 bg-[#2a3548] text-gray-400 rounded-lg hover:text-white transition-colors"
                >
                  {isZh ? '取消' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? (isZh ? '保存中...' : 'Saving...') : (isZh ? '保存修改' : 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
