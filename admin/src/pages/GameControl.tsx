import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import { userApi, gameControlApi } from '../services/api';
import type { User } from '../types';

export default function GameControl() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showControlModal, setShowControlModal] = useState(false);
  const [controlType, setControlType] = useState<'deposit' | 'withdraw' | 'betting'>('deposit');
  const [controlData, setControlData] = useState({
    enabled: false,
    minAmount: '',
    maxAmount: '',
    note: '',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await userApi.getUsers({ limit: 100 });
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const openControlModal = async (user: User, type: 'deposit' | 'withdraw' | 'betting') => {
    setSelectedUser(user);
    setControlType(type);

    try {
      let response;
      if (type === 'deposit') {
        response = await gameControlApi.getDepositControl(user.id);
      } else if (type === 'withdraw') {
        response = await gameControlApi.getWithdrawControl(user.id);
      } else {
        response = await gameControlApi.getBettingControl(user.id);
      }

      const data = response.data;
      setControlData({
        enabled: data.enabled || false,
        minAmount: data.minAmount?.toString() || '',
        maxAmount: data.maxAmount?.toString() || '',
        note: data.note || '',
      });
    } catch (error) {
      setControlData({
        enabled: false,
        minAmount: '',
        maxAmount: '',
        note: '',
      });
    }

    setShowControlModal(true);
  };

  const handleSaveControl = async () => {
    if (!selectedUser) return;

    try {
      const data = {
        enabled: controlData.enabled,
        minAmount: controlData.minAmount ? Number(controlData.minAmount) : undefined,
        maxAmount: controlData.maxAmount ? Number(controlData.maxAmount) : undefined,
        note: controlData.note || undefined,
      };

      if (controlType === 'deposit') {
        await gameControlApi.setDepositControl(selectedUser.id, data);
      } else if (controlType === 'withdraw') {
        await gameControlApi.setWithdrawControl(selectedUser.id, data);
      } else {
        await gameControlApi.setBettingControl(selectedUser.id, data);
      }

      setShowControlModal(false);
    } catch (error) {
      console.error('Failed to save control:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getControlTypeName = (type: string) => {
    switch (type) {
      case 'deposit': return '入点控制';
      case 'withdraw': return '出点控制';
      case 'betting': return '投注控制';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('gameControl')}</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder={t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">{t('username')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">{t('nickname')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">{t('role')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-300">{t('balance')}</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-slate-300">控制设置</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">{t('loading')}</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">{t('noData')}</td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{user.username}</td>
                  <td className="px-6 py-4 text-slate-300">{user.nickname || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                      user.role === 'agent' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {t(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-amber-400 font-medium">
                    {Number(user.balance).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openControlModal(user, 'deposit')}
                        className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm rounded-lg transition-colors"
                      >
                        入点
                      </button>
                      <button
                        onClick={() => openControlModal(user, 'withdraw')}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors"
                      >
                        出点
                      </button>
                      <button
                        onClick={() => openControlModal(user, 'betting')}
                        className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm rounded-lg transition-colors"
                      >
                        投注
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Control Modal */}
      {showControlModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {getControlTypeName(controlType)} - {selectedUser.username}
              </h2>
              <button onClick={() => setShowControlModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                <span className="text-white">启用控制</span>
                <button
                  onClick={() => setControlData({ ...controlData, enabled: !controlData.enabled })}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    controlData.enabled ? 'bg-amber-500' : 'bg-slate-600'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    controlData.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              {/* Min Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">最小金额</label>
                <input
                  type="number"
                  value={controlData.minAmount}
                  onChange={(e) => setControlData({ ...controlData, minAmount: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="不限制"
                />
              </div>

              {/* Max Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">最大金额</label>
                <input
                  type="number"
                  value={controlData.maxAmount}
                  onChange={(e) => setControlData({ ...controlData, maxAmount: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  placeholder="不限制"
                />
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">备注</label>
                <textarea
                  value={controlData.note}
                  onChange={(e) => setControlData({ ...controlData, note: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-amber-500 resize-none"
                  rows={3}
                  placeholder="可选"
                />
              </div>

              <button
                onClick={handleSaveControl}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-xl transition-colors"
              >
                {t('save')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
