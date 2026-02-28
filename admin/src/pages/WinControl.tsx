import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, X, Users, UserCheck, Settings, Trash2 } from 'lucide-react';
import { winControlApi } from '../services/api';
import { useToastStore } from '../store/toastStore';

interface WinCapControl {
  id: string;
  enabled: boolean;
  controlDirection: 'win' | 'lose';  // 'win' = 讓他贏, 'lose' = 讓他輸
  controlPercentage: number;  // 控制機率 1-100%
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Member | Agent | null>(null);
  const [formData, setFormData] = useState({
    enabled: false,
    controlDirection: 'win' as 'win' | 'lose',
    controlPercentage: 50,
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
      const { data } = await winControlApi.getMembers({ search: searchTerm, limit: 50 });
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
      const { data } = await winControlApi.getAgents({ search: searchTerm, limit: 50 });
      setAgents(data.data || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      toast.error('獲取代理列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (activeTab === 'members') {
      fetchMembers();
    } else {
      fetchAgents();
    }
  };

  const openEditModal = (item: Member | Agent) => {
    setSelectedItem(item);
    const winCap = activeTab === 'members'
      ? (item as Member).winCapControl
      : (item as Agent).agentLineWinCap;

    setFormData({
      enabled: winCap?.enabled || false,
      controlDirection: winCap?.controlDirection || 'win',
      controlPercentage: winCap?.controlPercentage || 50,
      note: winCap?.note || '',
    });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">輸贏控制</h1>
          <p className="text-gray-400 text-sm mt-1">設定會員或代理線的輸贏機率控制</p>
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
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋帳號..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-12 pr-4 py-3 bg-[#1e1e1e] border border-[#333] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
        >
          搜尋
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1e1e1e] rounded-xl border border-[#333] overflow-hidden overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="bg-[#252525]">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">帳號</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">暱稱</th>
              {activeTab === 'members' && (
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">上級代理</th>
              )}
              {activeTab === 'agents' && (
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">層級/下線</th>
              )}
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">餘額</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">控制設定</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  {t('loading')}
                </td>
              </tr>
            ) : (activeTab === 'members' ? members : agents).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  {t('noData')}
                </td>
              </tr>
            ) : activeTab === 'members' ? (
              members.map((member) => {
                const display = getControlDisplay(member.winCapControl);
                return (
                  <tr key={member.id} className="hover:bg-[#252525] transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{member.username}</td>
                    <td className="px-6 py-4 text-gray-300">{member.nickname || '-'}</td>
                    <td className="px-6 py-4 text-gray-300">
                      {member.parentAgent?.username || '-'}
                    </td>
                    <td className="px-6 py-4 text-amber-400 font-medium">
                      {Number(member.balance).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${display.className}`}>
                        {display.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(member)}
                          className="p-2 hover:bg-[#333] text-gray-400 hover:text-amber-400 rounded-lg transition-colors"
                          title="設定"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {member.winCapControl?.enabled && (
                          <button
                            onClick={() => handleDelete(member)}
                            className="p-2 hover:bg-[#333] text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                            title="刪除控制"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              agents.map((agent) => {
                const display = getControlDisplay(agent.agentLineWinCap);
                return (
                  <tr key={agent.id} className="hover:bg-[#252525] transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{agent.username}</td>
                    <td className="px-6 py-4 text-gray-300">{agent.nickname || '-'}</td>
                    <td className="px-6 py-4 text-gray-300">
                      L{agent.agentLevel} / {agent._count.subUsers} 人
                    </td>
                    <td className="px-6 py-4 text-amber-400 font-medium">
                      {Number(agent.balance).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${display.className}`}>
                        {display.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(agent)}
                          className="p-2 hover:bg-[#333] text-gray-400 hover:text-amber-400 rounded-lg transition-colors"
                          title="設定"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        {agent.agentLineWinCap?.enabled && (
                          <button
                            onClick={() => handleDelete(agent)}
                            className="p-2 hover:bg-[#333] text-gray-400 hover:text-red-400 rounded-lg transition-colors"
                            title="刪除控制"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
                {activeTab === 'members' ? '會員輸贏控制' : '代理線輸贏控制'} - {selectedItem.username}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#252525] rounded-xl">
                <span className="text-white">啟用控制</span>
                <button
                  onClick={() => setFormData({ ...formData, enabled: !formData.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    formData.enabled ? 'bg-amber-500' : 'bg-[#444]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    formData.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Control Direction */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">控制方向</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, controlDirection: 'win' })}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                      formData.controlDirection === 'win'
                        ? 'bg-green-500 text-white'
                        : 'bg-[#252525] text-gray-400 hover:bg-[#333]'
                    }`}
                  >
                    讓他贏
                  </button>
                  <button
                    onClick={() => setFormData({ ...formData, controlDirection: 'lose' })}
                    className={`flex-1 py-3 rounded-xl font-medium transition-colors ${
                      formData.controlDirection === 'lose'
                        ? 'bg-red-500 text-white'
                        : 'bg-[#252525] text-gray-400 hover:bg-[#333]'
                    }`}
                  >
                    讓他輸
                  </button>
                </div>
              </div>

              {/* Control Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  控制機率: <span className="text-amber-400">{formData.controlPercentage}%</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={formData.controlPercentage}
                  onChange={(e) => setFormData({ ...formData, controlPercentage: Number(e.target.value) })}
                  className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  例如設定 70% 贏，表示 70% 機率會控制讓他贏，30% 機率自然開獎
                </p>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">備註</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500 resize-none"
                  rows={3}
                  placeholder="可選"
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
              >
                保存
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
