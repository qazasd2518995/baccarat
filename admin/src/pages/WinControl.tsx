import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, X, Users, UserCheck, RotateCcw, Settings } from 'lucide-react';
import { winControlApi } from '../services/api';
import { useToastStore } from '../store/toastStore';

interface WinCapControl {
  id: string;
  enabled: boolean;
  dailyCap: number | null;
  weeklyCap: number | null;
  monthlyCap: number | null;
  currentWin: number;
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
    dailyCap: '',
    weeklyCap: '',
    monthlyCap: '',
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
      dailyCap: winCap?.dailyCap?.toString() || '',
      weeklyCap: winCap?.weeklyCap?.toString() || '',
      monthlyCap: winCap?.monthlyCap?.toString() || '',
      note: winCap?.note || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    try {
      const data = {
        enabled: formData.enabled,
        dailyCap: formData.dailyCap ? Number(formData.dailyCap) : null,
        weeklyCap: formData.weeklyCap ? Number(formData.weeklyCap) : null,
        monthlyCap: formData.monthlyCap ? Number(formData.monthlyCap) : null,
        note: formData.note || null,
      };

      if (activeTab === 'members') {
        await winControlApi.setMemberWinCap(selectedItem.id, data);
      } else {
        await winControlApi.setAgentLineWinCap(selectedItem.id, data);
      }

      toast.success('保存成功');
      setShowModal(false);
      if (activeTab === 'members') {
        fetchMembers();
      } else {
        fetchAgents();
      }
    } catch (error) {
      console.error('Failed to save win cap:', error);
      toast.error('保存失敗');
    }
  };

  const handleReset = async (item: Member | Agent) => {
    try {
      if (activeTab === 'members') {
        await winControlApi.resetMemberWinCap(item.id);
      } else {
        await winControlApi.resetAgentLineWinCap(item.id);
      }
      toast.success('重置成功');
      if (activeTab === 'members') {
        fetchMembers();
      } else {
        fetchAgents();
      }
    } catch (error) {
      console.error('Failed to reset win cap:', error);
      toast.error('重置失敗');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">輸贏控制</h1>
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
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">控制狀態</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">當前贏取</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={activeTab === 'members' ? 7 : 7} className="px-6 py-8 text-center text-gray-400">
                  {t('loading')}
                </td>
              </tr>
            ) : (activeTab === 'members' ? members : agents).length === 0 ? (
              <tr>
                <td colSpan={activeTab === 'members' ? 7 : 7} className="px-6 py-8 text-center text-gray-400">
                  {t('noData')}
                </td>
              </tr>
            ) : activeTab === 'members' ? (
              members.map((member) => (
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.winCapControl?.enabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {member.winCapControl?.enabled ? '已啟用' : '未啟用'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${
                      Number(member.winCapControl?.currentWin || 0) > 0 ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {Number(member.winCapControl?.currentWin || 0).toLocaleString()}
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
                          onClick={() => handleReset(member)}
                          className="p-2 hover:bg-[#333] text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                          title="重置計數"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              agents.map((agent) => (
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
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.agentLineWinCap?.enabled
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {agent.agentLineWinCap?.enabled ? '已啟用' : '未啟用'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${
                      Number(agent.agentLineWinCap?.currentWin || 0) > 0 ? 'text-green-400' : 'text-gray-400'
                    }`}>
                      {Number(agent.agentLineWinCap?.currentWin || 0).toLocaleString()}
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
                          onClick={() => handleReset(agent)}
                          className="p-2 hover:bg-[#333] text-gray-400 hover:text-blue-400 rounded-lg transition-colors"
                          title="重置計數"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
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

              {/* Daily Cap */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">日封頂金額</label>
                <input
                  type="number"
                  value={formData.dailyCap}
                  onChange={(e) => setFormData({ ...formData, dailyCap: e.target.value })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="不限制"
                />
              </div>

              {/* Weekly Cap */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">週封頂金額</label>
                <input
                  type="number"
                  value={formData.weeklyCap}
                  onChange={(e) => setFormData({ ...formData, weeklyCap: e.target.value })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="不限制"
                />
              </div>

              {/* Monthly Cap */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">月封頂金額</label>
                <input
                  type="number"
                  value={formData.monthlyCap}
                  onChange={(e) => setFormData({ ...formData, monthlyCap: e.target.value })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="不限制"
                />
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
