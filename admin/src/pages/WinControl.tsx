import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, X, Users, UserCheck, Settings, Trash2, Plus, RefreshCw } from 'lucide-react';
import { winControlApi } from '../services/api';
import { useToastStore } from '../store/toastStore';

interface WinCapControl {
  id: string;
  enabled: boolean;
  controlDirection: 'win' | 'lose';
  controlPercentage: number;
  note: string | null;
}

interface Member {
  id: string;
  username: string;
  nickname: string | null;
  balance: number;
  parentAgent?: { username: string; nickname: string | null };
  winCapControl: WinCapControl | null;
}

interface Agent {
  id: string;
  username: string;
  nickname: string | null;
  agentLevel: number;
  balance: number;
  agentLineWinCap: WinCapControl | null;
  _count: { subUsers: number };
}

type TabType = 'members' | 'agents';

export default function WinControl() {
  const { t } = useTranslation();
  const toast = useToastStore();
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [members, setMembers] = useState<Member[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Member | Agent | null>(null);
  const [addSearchTerm, setAddSearchTerm] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<(Member | Agent)[]>([]);
  const [addSearchLoading, setAddSearchLoading] = useState(false);
  const [formData, setFormData] = useState({
    enabled: true,
    controlDirection: 'win' as 'win' | 'lose',
    controlPercentage: 70,
    note: '',
  });

  useEffect(() => {
    if (activeTab === 'members') {
      fetchMembers();
    } else {
      fetchAgents();
    }
  }, [activeTab]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data } = await winControlApi.getMembers({ limit: 100 });
      setMembers(data.data || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
      toast.error('獲取會員列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data } = await winControlApi.getAgents({ limit: 100 });
      setAgents(data.data || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      toast.error('獲取代理列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (activeTab === 'members') {
      fetchMembers();
    } else {
      fetchAgents();
    }
  };

  const handleAddSearch = async () => {
    if (!addSearchTerm.trim()) return;

    setAddSearchLoading(true);
    try {
      if (activeTab === 'members') {
        const { data } = await winControlApi.getMembers({ search: addSearchTerm, limit: 20 });
        // 過濾掉已有控制的
        setAddSearchResults((data.data || []).filter((m: Member) => !m.winCapControl?.enabled));
      } else {
        const { data } = await winControlApi.getAgents({ search: addSearchTerm, limit: 20 });
        setAddSearchResults((data.data || []).filter((a: Agent) => !a.agentLineWinCap?.enabled));
      }
    } catch (error) {
      console.error('Failed to search:', error);
      toast.error('搜尋失敗');
    } finally {
      setAddSearchLoading(false);
    }
  };

  const openEditModal = (item: Member | Agent) => {
    setSelectedItem(item);
    const winCap = activeTab === 'members'
      ? (item as Member).winCapControl
      : (item as Agent).agentLineWinCap;

    setFormData({
      enabled: winCap?.enabled || true,
      controlDirection: winCap?.controlDirection || 'win',
      controlPercentage: winCap?.controlPercentage || 70,
      note: winCap?.note || '',
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setAddSearchTerm('');
    setAddSearchResults([]);
    setFormData({
      enabled: true,
      controlDirection: 'win',
      controlPercentage: 70,
      note: '',
    });
    setShowAddModal(true);
  };

  const selectItemToAdd = (item: Member | Agent) => {
    setSelectedItem(item);
    setShowAddModal(false);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    try {
      const data = {
        enabled: formData.enabled,
        controlDirection: formData.controlDirection,
        controlPercentage: formData.controlPercentage,
        note: formData.note || null,
      };

      if (activeTab === 'members') {
        await winControlApi.setMemberControl(selectedItem.id, data);
      } else {
        await winControlApi.setAgentLineControl(selectedItem.id, data);
      }

      toast.success('保存成功');
      setShowModal(false);
      setSelectedItem(null);
      if (activeTab === 'members') {
        fetchMembers();
      } else {
        fetchAgents();
      }
    } catch (error) {
      console.error('Failed to save control:', error);
      toast.error('保存失敗');
    }
  };

  const handleDelete = async (item: Member | Agent) => {
    if (!confirm(`確定要刪除 ${item.username} 的控制設定嗎？`)) return;

    try {
      if (activeTab === 'members') {
        await winControlApi.deleteMemberControl(item.id);
      } else {
        await winControlApi.deleteAgentLineControl(item.id);
      }
      toast.success('刪除成功');
      if (activeTab === 'members') {
        fetchMembers();
      } else {
        fetchAgents();
      }
    } catch (error) {
      console.error('Failed to delete control:', error);
      toast.error('刪除失敗');
    }
  };

  const getControlDisplay = (control: WinCapControl | null) => {
    if (!control?.enabled) {
      return { label: '未啟用', className: 'bg-gray-500/20 text-gray-400' };
    }
    const direction = control.controlDirection === 'win' ? '贏' : '輸';
    return {
      label: `${control.controlPercentage}% ${direction}`,
      className: control.controlDirection === 'win'
        ? 'bg-green-500/20 text-green-400'
        : 'bg-red-500/20 text-red-400'
    };
  };

  // 只顯示有啟用控制的項目
  const activeMembers = members.filter(m => m.winCapControl?.enabled);
  const activeAgents = agents.filter(a => a.agentLineWinCap?.enabled);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">輸贏控制</h1>
          <p className="text-gray-400 text-sm mt-1">設定會員或代理線的輸贏機率控制</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#252525] hover:bg-[#333] text-gray-300 font-medium rounded-xl transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            新增控制
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[#333] pb-2">
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'members'
              ? 'bg-amber-500 text-black font-medium'
              : 'bg-[#252525] text-gray-300 hover:bg-[#333]'
          }`}
        >
          <Users className="w-4 h-4" />
          會員控制
          {activeMembers.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-black/20 rounded text-xs">
              {activeMembers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'agents'
              ? 'bg-amber-500 text-black font-medium'
              : 'bg-[#252525] text-gray-300 hover:bg-[#333]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          代理線控制
          {activeAgents.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-black/20 rounded text-xs">
              {activeAgents.length}
            </span>
          )}
        </button>
      </div>

      {/* Active Controls List */}
      <div className="bg-[#1e1e1e] rounded-xl border border-[#333] overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400">
            {t('loading')}
          </div>
        ) : (activeTab === 'members' ? activeMembers : activeAgents).length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-gray-500 mb-2">暫無控制項目</div>
            <p className="text-gray-600 text-sm">點擊「新增控制」按鈕來添加</p>
          </div>
        ) : (
          <div className="divide-y divide-[#333]">
            {activeTab === 'members' ? (
              activeMembers.map((member) => {
                const display = getControlDisplay(member.winCapControl);
                return (
                  <div key={member.id} className="flex items-center justify-between p-4 hover:bg-[#252525] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{member.username}</div>
                        <div className="text-gray-500 text-sm">
                          {member.nickname || '無暱稱'} · 上級: {member.parentAgent?.username || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${display.className}`}>
                        {display.label}
                      </span>
                      <button
                        onClick={() => openEditModal(member)}
                        className="p-2 hover:bg-[#333] text-gray-400 hover:text-amber-400 rounded-lg transition-colors"
                        title="編輯"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(member)}
                        className="p-2 hover:bg-[#333] text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              activeAgents.map((agent) => {
                const display = getControlDisplay(agent.agentLineWinCap);
                return (
                  <div key={agent.id} className="flex items-center justify-between p-4 hover:bg-[#252525] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                        {agent.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{agent.username}</div>
                        <div className="text-gray-500 text-sm">
                          {agent.nickname || '無暱稱'} · L{agent.agentLevel} · {agent._count.subUsers} 下線
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${display.className}`}>
                        {display.label}
                      </span>
                      <button
                        onClick={() => openEditModal(agent)}
                        className="p-2 hover:bg-[#333] text-gray-400 hover:text-amber-400 rounded-lg transition-colors"
                        title="編輯"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(agent)}
                        className="p-2 hover:bg-[#333] text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                        title="刪除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Add Modal - Search for user */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-lg mx-4 border border-[#333]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                新增{activeTab === 'members' ? '會員' : '代理線'}控制
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={`搜尋${activeTab === 'members' ? '會員' : '代理'}帳號...`}
                  value={addSearchTerm}
                  onChange={(e) => setAddSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSearch()}
                  className="w-full pl-12 pr-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              <button
                onClick={handleAddSearch}
                disabled={addSearchLoading}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-black font-medium rounded-xl transition-colors"
              >
                {addSearchLoading ? '...' : '搜尋'}
              </button>
            </div>

            {/* Search Results */}
            <div className="max-h-[300px] overflow-y-auto">
              {addSearchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {addSearchTerm ? '無搜尋結果' : '請輸入帳號搜尋'}
                </div>
              ) : (
                <div className="space-y-2">
                  {addSearchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => selectItemToAdd(item)}
                      className="w-full flex items-center gap-3 p-3 bg-[#252525] hover:bg-[#333] rounded-xl transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {item.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{item.username}</div>
                        <div className="text-gray-500 text-sm">
                          {item.nickname || '無暱稱'}
                          {activeTab === 'members' && (item as Member).parentAgent && (
                            <> · 上級: {(item as Member).parentAgent?.username}</>
                          )}
                          {activeTab === 'agents' && (
                            <> · L{(item as Agent).agentLevel} · {(item as Agent)._count.subUsers} 下線</>
                          )}
                        </div>
                      </div>
                      <Plus className="w-5 h-5 text-amber-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-md mx-4 border border-[#333]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                設定控制 - {selectedItem.username}
              </h2>
              <button onClick={() => { setShowModal(false); setSelectedItem(null); }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Control Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">控制方向</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setFormData({ ...formData, controlDirection: 'win' })}
                    className={`flex-1 py-4 rounded-xl font-medium transition-all ${
                      formData.controlDirection === 'win'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                        : 'bg-[#252525] text-gray-400 hover:bg-[#333]'
                    }`}
                  >
                    讓他贏
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, controlDirection: 'lose' })}
                    className={`flex-1 py-4 rounded-xl font-medium transition-all ${
                      formData.controlDirection === 'lose'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'bg-[#252525] text-gray-400 hover:bg-[#333]'
                    }`}
                  >
                    讓他輸
                  </button>
                </div>
              </div>

              {/* Control Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  控制機率
                </label>
                <div className="bg-[#252525] rounded-xl p-4">
                  <div className="text-center mb-3">
                    <span className="text-4xl font-bold text-amber-400">{formData.controlPercentage}</span>
                    <span className="text-xl text-gray-400">%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={formData.controlPercentage}
                    onChange={(e) => setFormData({ ...formData, controlPercentage: Number(e.target.value) })}
                    className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>10%</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formData.controlPercentage}% 機率控制，{100 - formData.controlPercentage}% 自然開獎
                </p>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">備註 (選填)</label>
                <input
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="例如：VIP客戶"
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
              >
                確認儲存
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
