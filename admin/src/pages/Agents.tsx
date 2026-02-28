import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { UserPlus, Search, X, Plus, Minus } from 'lucide-react';
import { userApi, transactionApi } from '../services/api';
import type { User } from '../types';

export default function Agents() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<User | null>(null);
  const [transferType, setTransferType] = useState<'deposit' | 'withdraw'>('deposit');
  const [transferAmount, setTransferAmount] = useState('');
  const [newAgent, setNewAgent] = useState({ username: '', password: '', nickname: '' });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data } = await userApi.getUsers({ role: 'agent' });
      setAgents(data.users || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async () => {
    try {
      await userApi.createUser({
        ...newAgent,
        role: 'agent',
      });
      setShowCreateModal(false);
      setNewAgent({ username: '', password: '', nickname: '' });
      fetchAgents();
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAgent || !transferAmount) return;
    try {
      await transactionApi.createTransaction({
        userId: selectedAgent.id,
        type: transferType,
        amount: Number(transferAmount),
      });
      setShowTransferModal(false);
      setTransferAmount('');
      setSelectedAgent(null);
      fetchAgents();
    } catch (error) {
      console.error('Failed to transfer:', error);
    }
  };

  const filteredAgents = agents.filter(agent =>
    agent.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('agents')}</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {t('createUser')}
        </motion.button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-[#1e1e1e] border border-[#333] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-[#1e1e1e] rounded-xl border border-[#333] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#252525]/50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">{t('username')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">{t('nickname')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">{t('balance')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">{t('status')}</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-300">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333]">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">{t('loading')}</td>
              </tr>
            ) : filteredAgents.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">{t('noData')}</td>
              </tr>
            ) : (
              filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-[#252525]/30 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{agent.username}</td>
                  <td className="px-6 py-4 text-gray-300">{agent.nickname || '-'}</td>
                  <td className="px-6 py-4 text-amber-400 font-medium">
                    {Number(agent.balance).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      agent.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      agent.status === 'suspended' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {t(agent.status || 'active')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedAgent(agent);
                          setTransferType('deposit');
                          setShowTransferModal(true);
                        }}
                        className="p-2 hover:bg-green-500/20 text-green-400 rounded-lg transition-colors"
                        title={t('deposit')}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAgent(agent);
                          setTransferType('withdraw');
                          setShowTransferModal(true);
                        }}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title={t('withdraw')}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-md border border-[#333]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{t('createUser')}</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('username')}</label>
                <input
                  type="text"
                  value={newAgent.username}
                  onChange={(e) => setNewAgent({ ...newAgent, username: e.target.value })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('password')}</label>
                <input
                  type="password"
                  value={newAgent.password}
                  onChange={(e) => setNewAgent({ ...newAgent, password: e.target.value })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('nickname')}</label>
                <input
                  type="text"
                  value={newAgent.nickname}
                  onChange={(e) => setNewAgent({ ...newAgent, nickname: e.target.value })}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                onClick={handleCreateAgent}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
              >
                {t('confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e1e1e] rounded-2xl p-6 w-full max-w-md border border-[#333]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {transferType === 'deposit' ? t('deposit') : t('withdraw')} - {selectedAgent.username}
              </h2>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-[#252525]/50 rounded-xl">
                <div className="text-sm text-gray-400 mb-1">{t('balance')}</div>
                <div className="text-2xl font-bold text-amber-400">
                  {Number(selectedAgent.balance).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t('amount')}</label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[#252525] border border-[#444] rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="0"
                />
              </div>
              <button
                onClick={handleTransfer}
                className={`w-full py-3 font-medium rounded-xl transition-colors ${
                  transferType === 'deposit'
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                {t('confirm')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
