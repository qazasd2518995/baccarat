import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, Play, Pause, RefreshCw, Trash2, History, Activity, X } from 'lucide-react';
import { manualDetectionApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import ConfirmModal from '../components/ConfirmModal';

interface ControlRecord {
  id: string;
  scope: 'all' | 'agent_line' | 'member';
  targetAgentId: string | null;
  targetAgentUsername: string | null;
  targetMemberUsername: string | null;
  targetSettlement: number;
  controlPercentage: number;
  startSettlement: number;
  isActive: boolean;
  isCompleted: boolean;
  completedAt: string | null;
  completionSettlement: number | null;
  operatorUsername: string | null;
  createdAt: string;
  currentSettlement?: number;
  progress?: number;
}

interface Agent {
  id: string;
  username: string;
  nickname: string | null;
  agentLevel: number;
}

interface Member {
  id: string;
  username: string;
  nickname: string | null;
}

type TabType = 'active' | 'history';

export default function ManualDetection() {
  const { t } = useTranslation();
  const toast = useToastStore();
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [activeControls, setActiveControls] = useState<ControlRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<ControlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    scope: 'all' as 'all' | 'agent_line' | 'member',
    targetAgentId: '',
    targetAgentUsername: '',
    targetMemberUsername: '',
    targetSettlement: '',
    controlPercentage: '50',
  });
  const [currentSettlement, setCurrentSettlement] = useState<number | null>(null);
  const [loadingSettlement, setLoadingSettlement] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  // Search states
  const [agentSearch, setAgentSearch] = useState('');
  const [memberSearch, setMemberSearch] = useState('');

  const fetchActiveControls = useCallback(async () => {
    try {
      const { data } = await manualDetectionApi.getStatus();
      setActiveControls(data.data || []);
    } catch (error) {
      console.error('Failed to fetch active controls:', error);
    }
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await manualDetectionApi.getHistory({ limit: 50 });
      setHistoryRecords(data.data || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const fetchAgents = async (search?: string) => {
    try {
      const { data } = await manualDetectionApi.getAgents({ search });
      setAgents(data.data || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const fetchMembers = async (search?: string) => {
    try {
      const { data } = await manualDetectionApi.getMembers({ search });
      setMembers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchCurrentSettlement = async () => {
    setLoadingSettlement(true);
    try {
      const params: any = { scope: createForm.scope };
      if (createForm.scope === 'agent_line' && createForm.targetAgentId) {
        params.agent_id = createForm.targetAgentId;
      }
      if (createForm.scope === 'member' && createForm.targetMemberUsername) {
        params.member_username = createForm.targetMemberUsername;
      }
      const { data } = await manualDetectionApi.getSettlement(params);
      setCurrentSettlement(data.data.superiorSettlement);
    } catch (error) {
      console.error('Failed to fetch settlement:', error);
    } finally {
      setLoadingSettlement(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchActiveControls();
      await fetchHistory();
      await fetchAgents();
      await fetchMembers();
      setLoading(false);
    };
    init();
  }, [fetchActiveControls]);

  useEffect(() => {
    if (activeTab === 'active') {
      const interval = setInterval(fetchActiveControls, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchActiveControls]);

  useEffect(() => {
    if (showCreateModal) {
      fetchCurrentSettlement();
    }
  }, [showCreateModal, createForm.scope, createForm.targetAgentId, createForm.targetMemberUsername]);

  const handleActivate = async () => {
    if (!createForm.targetSettlement || !createForm.controlPercentage) {
      toast.error('請填寫目標交收和控制機率');
      return;
    }

    if (createForm.scope === 'agent_line' && !createForm.targetAgentId) {
      toast.error('請選擇目標代理');
      return;
    }

    if (createForm.scope === 'member' && !createForm.targetMemberUsername) {
      toast.error('請選擇目標會員');
      return;
    }

    try {
      await manualDetectionApi.activate({
        scope: createForm.scope,
        targetAgentId: createForm.targetAgentId || undefined,
        targetAgentUsername: createForm.targetAgentUsername || undefined,
        targetMemberUsername: createForm.targetMemberUsername || undefined,
        targetSettlement: Number(createForm.targetSettlement),
        controlPercentage: Number(createForm.controlPercentage),
      });
      toast.success('控制已啟用');
      setShowCreateModal(false);
      fetchActiveControls();
      fetchHistory();
      // Reset form
      setCreateForm({
        scope: 'all',
        targetAgentId: '',
        targetAgentUsername: '',
        targetMemberUsername: '',
        targetSettlement: '',
        controlPercentage: '50',
      });
    } catch (error) {
      console.error('Failed to activate control:', error);
      toast.error('啟用失敗');
    }
  };

  const handleDeactivate = async (id: string) => {
    try {
      await manualDetectionApi.deactivate(id);
      toast.success('控制已停用');
      fetchActiveControls();
      fetchHistory();
    } catch (error) {
      console.error('Failed to deactivate control:', error);
      toast.error('停用失敗');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await manualDetectionApi.reactivate(id);
      toast.success('控制已重新啟用');
      fetchActiveControls();
      fetchHistory();
    } catch (error) {
      console.error('Failed to reactivate control:', error);
      toast.error('啟用失敗');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id) return;
    setDeleting(true);
    try {
      await manualDetectionApi.deleteRecord(deleteConfirm.id);
      toast.success('記錄已刪除');
      setDeleteConfirm({ open: false, id: null });
      fetchHistory();
    } catch (error) {
      console.error('Failed to delete record:', error);
      toast.error('刪除失敗');
    } finally {
      setDeleting(false);
    }
  };

  const getScopeText = (scope: string) => {
    switch (scope) {
      case 'all': return '全盤';
      case 'agent_line': return '代理線';
      case 'member': return '會員';
      default: return scope;
    }
  };

  const getTargetText = (record: ControlRecord) => {
    if (record.scope === 'all') return '全部';
    if (record.scope === 'agent_line') return record.targetAgentUsername || record.targetAgentId;
    if (record.scope === 'member') return record.targetMemberUsername;
    return '-';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">自動偵測</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
        >
          <Play className="w-4 h-4" />
          新增控制
        </motion.button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#333] pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'active'
              ? 'bg-amber-500 text-black font-medium'
              : 'bg-[#252525] text-gray-300 hover:bg-[#333]'
          }`}
        >
          <Activity className="w-4 h-4" />
          進行中 ({activeControls.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'history'
              ? 'bg-amber-500 text-black font-medium'
              : 'bg-[#252525] text-gray-300 hover:bg-[#333]'
          }`}
        >
          <History className="w-4 h-4" />
          歷史記錄
        </button>
      </div>

      {/* Active Controls */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">{t('loading')}</div>
          ) : activeControls.length === 0 ? (
            <div className="bg-[#1e1e1e] rounded-xl border border-[#333] p-8 text-center">
              <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">目前沒有進行中的控制</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors"
              >
                新增控制
              </button>
            </div>
          ) : (
            activeControls.map((control) => (
              <div
                key={control.id}
                className="bg-[#1e1e1e] rounded-xl border border-amber-500/50 p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      control.scope === 'all' ? 'bg-purple-500/20 text-purple-400' :
                      control.scope === 'agent_line' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {getScopeText(control.scope)}
                    </span>
                    <span className="text-white font-medium">{getTargetText(control)}</span>
                  </div>
                  <button
                    onClick={() => handleDeactivate(control.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    停用
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400 text-sm">起始交收</p>
                    <p className={`text-lg font-bold ${Number(control.startSettlement) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {Number(control.startSettlement).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">目標交收</p>
                    <p className={`text-lg font-bold ${Number(control.targetSettlement) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {Number(control.targetSettlement).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">當前交收</p>
                    <p className={`text-lg font-bold ${(control.currentSettlement || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(control.currentSettlement || 0).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">控制機率</p>
                    <p className="text-lg font-bold text-amber-400">{control.controlPercentage}%</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative h-3 bg-[#333] rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, control.progress || 0))}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-400">
                  <span>進度: {(control.progress || 0).toFixed(1)}%</span>
                  <span>操作員: {control.operatorUsername || '-'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="bg-[#1e1e1e] rounded-xl border border-[#333] overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-[#252525]">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">範圍</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">目標</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">目標交收</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">控制機率</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">狀態</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">時間</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#333]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">{t('loading')}</td>
                </tr>
              ) : historyRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">{t('noData')}</td>
                </tr>
              ) : (
                historyRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-[#252525] transition-colors">
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.scope === 'all' ? 'bg-purple-500/20 text-purple-400' :
                        record.scope === 'agent_line' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {getScopeText(record.scope)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white">{getTargetText(record)}</td>
                    <td className="px-6 py-4">
                      <span className={Number(record.targetSettlement) > 0 ? 'text-green-400' : 'text-red-400'}>
                        {Number(record.targetSettlement).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-amber-400">{record.controlPercentage}%</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        record.isActive ? 'bg-green-500/20 text-green-400' :
                        record.isCompleted ? 'bg-blue-500/20 text-blue-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {record.isActive ? '進行中' : record.isCompleted ? '已達標' : '已停用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {!record.isActive && (
                          <>
                            <button
                              onClick={() => handleReactivate(record.id)}
                              className="p-2 hover:bg-[#333] text-gray-400 hover:text-green-400 rounded-lg transition-colors"
                              title="重新啟用"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ open: true, id: record.id })}
                              className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                              title="刪除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-lg mx-4 border border-[#333] max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">新增控制</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">控制範圍</label>
                <select
                  value={createForm.scope}
                  onChange={(e) => setCreateForm({
                    ...createForm,
                    scope: e.target.value as any,
                    targetAgentId: '',
                    targetAgentUsername: '',
                    targetMemberUsername: '',
                  })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="all">全盤</option>
                  <option value="agent_line">代理線</option>
                  <option value="member">會員</option>
                </select>
              </div>

              {/* Agent Selection */}
              {createForm.scope === 'agent_line' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">目標代理</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜尋代理..."
                      value={agentSearch}
                      onChange={(e) => {
                        setAgentSearch(e.target.value);
                        fetchAgents(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-[#252525] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <select
                    value={createForm.targetAgentId}
                    onChange={(e) => {
                      const agent = agents.find(a => a.id === e.target.value);
                      setCreateForm({
                        ...createForm,
                        targetAgentId: e.target.value,
                        targetAgentUsername: agent?.username || '',
                      });
                    }}
                    className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">選擇代理</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.username} ({agent.nickname || 'L' + agent.agentLevel})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Member Selection */}
              {createForm.scope === 'member' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">目標會員</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="搜尋會員..."
                      value={memberSearch}
                      onChange={(e) => {
                        setMemberSearch(e.target.value);
                        fetchMembers(e.target.value);
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-[#252525] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <select
                    value={createForm.targetMemberUsername}
                    onChange={(e) => setCreateForm({ ...createForm, targetMemberUsername: e.target.value })}
                    className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">選擇會員</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.username}>
                        {member.username} {member.nickname ? `(${member.nickname})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Current Settlement */}
              <div className="p-4 bg-[#252525] rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">當前上級交收</span>
                  <span className={`text-xl font-bold ${
                    loadingSettlement ? 'text-gray-400' :
                    (currentSettlement || 0) > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {loadingSettlement ? '計算中...' : (currentSettlement || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {(currentSettlement || 0) > 0 ? '綠色(平台虧損)' : '紅色(平台盈利)'}
                </p>
              </div>

              {/* Target Settlement */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">目標上級交收</label>
                <input
                  type="number"
                  value={createForm.targetSettlement}
                  onChange={(e) => setCreateForm({ ...createForm, targetSettlement: e.target.value })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="輸入目標金額（負數=平台盈利）"
                />
              </div>

              {/* Control Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  控制機率: {createForm.controlPercentage}%
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={createForm.controlPercentage}
                  onChange={(e) => setCreateForm({ ...createForm, controlPercentage: e.target.value })}
                  className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>1%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <button
                onClick={handleActivate}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
              >
                啟用控制
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDeleteConfirm}
        title="刪除記錄"
        message="確定要刪除這條控制記錄嗎？此操作無法撤銷。"
        confirmText="刪除"
        cancelText="取消"
        type="danger"
        loading={deleting}
      />
    </div>
  );
}
