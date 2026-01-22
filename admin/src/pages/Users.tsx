import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Coins } from 'lucide-react';
import { userApi, transactionApi } from '../services/api';
import type { User } from '../types';

export default function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filter, setFilter] = useState({ role: '', status: '', search: '' });

  // Form states
  const [newUser, setNewUser] = useState({ username: '', password: '', nickname: '', role: 'member' as 'agent' | 'member' });
  const [transaction, setTransaction] = useState({ type: 'deposit' as 'deposit' | 'withdraw', amount: 0, note: '' });

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await userApi.getUsers({
        role: filter.role || undefined,
        status: filter.status || undefined,
        search: filter.search || undefined,
      });
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userApi.createUser(newUser);
      setShowCreateModal(false);
      setNewUser({ username: '', password: '', nickname: '', role: 'member' });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await transactionApi.createTransaction({
        userId: selectedUser.id,
        type: transaction.type,
        amount: transaction.amount,
        note: transaction.note,
      });
      setShowTransactionModal(false);
      setTransaction({ type: 'deposit', amount: 0, note: '' });
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to process transaction');
    }
  };

  const handleStatusChange = async (user: User, newStatus: string) => {
    try {
      await userApi.updateUser(user.id, { status: newStatus as any });
      fetchUsers();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-purple-500/20 text-purple-400',
    agent: 'bg-blue-500/20 text-blue-400',
    member: 'bg-slate-500/20 text-slate-400',
  };

  const STATUS_COLORS: Record<string, string> = {
    active: 'border-green-500/50 text-green-400',
    suspended: 'border-yellow-500/50 text-yellow-400',
    banned: 'border-red-500/50 text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('users')}</h1>
          <p className="text-slate-400 mt-1">Manage agents and members</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold"
        >
          + {t('createUser')}
        </motion.button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <input
          type="text"
          placeholder={t('search')}
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="flex-1 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500/50"
        />
        <select
          value={filter.role}
          onChange={(e) => setFilter({ ...filter, role: e.target.value })}
          className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:border-amber-500/50"
        >
          <option value="">All Roles</option>
          <option value="agent">{t('agent')}</option>
          <option value="member">{t('member')}</option>
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white focus:outline-none focus:border-amber-500/50"
        >
          <option value="">All Status</option>
          <option value="active">{t('active')}</option>
          <option value="suspended">{t('suspended')}</option>
          <option value="banned">{t('banned')}</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">{t('username')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">{t('role')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">{t('balance')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">{t('status')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">{t('parentAgent')}</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  {t('loading')}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  {t('noData')}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-white">{user.username}</div>
                      {user.nickname && <div className="text-sm text-slate-400">{user.nickname}</div>}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                      {t(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-amber-400 font-medium">{Number(user.balance).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={user.status}
                      onChange={(e) => handleStatusChange(user, e.target.value)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium bg-transparent border cursor-pointer ${STATUS_COLORS[user.status]}`}
                    >
                      <option value="active">{t('active')}</option>
                      <option value="suspended">{t('suspended')}</option>
                      <option value="banned">{t('banned')}</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    {user.parentAgent?.username || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowTransactionModal(true);
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-sm font-medium flex items-center gap-1 ml-auto"
                    >
                      <Coins className="w-4 h-4" /> {t('deposit')}/{t('withdraw')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl bg-slate-800 border border-slate-700"
            >
              <h2 className="text-xl font-bold text-white mb-4">{t('createUser')}</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('username')}</label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('password')}</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Nickname</label>
                  <input
                    type="text"
                    value={newUser.nickname}
                    onChange={(e) => setNewUser({ ...newUser, nickname: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('role')}</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'agent' | 'member' })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                  >
                    <option value="member">{t('member')}</option>
                    <option value="agent">{t('agent')}</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold"
                  >
                    {t('confirm')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {showTransactionModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowTransactionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl bg-slate-800 border border-slate-700"
            >
              <h2 className="text-xl font-bold text-white mb-2">{t('deposit')} / {t('withdraw')}</h2>
              <p className="text-slate-400 mb-4">
                User: {selectedUser.username} | {t('balance')}: {Number(selectedUser.balance).toLocaleString()}
              </p>
              <form onSubmit={handleTransaction} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTransaction({ ...transaction, type: 'deposit' })}
                      className={`flex-1 py-2 rounded-lg font-medium ${
                        transaction.type === 'deposit'
                          ? 'bg-green-500 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {t('deposit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransaction({ ...transaction, type: 'withdraw' })}
                      className={`flex-1 py-2 rounded-lg font-medium ${
                        transaction.type === 'withdraw'
                          ? 'bg-red-500 text-white'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {t('withdraw')}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('amount')}</label>
                  <input
                    type="number"
                    value={transaction.amount || ''}
                    onChange={(e) => setTransaction({ ...transaction, amount: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{t('note')}</label>
                  <input
                    type="text"
                    value={transaction.note}
                    onChange={(e) => setTransaction({ ...transaction, note: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(false)}
                    className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 py-2 rounded-lg font-bold ${
                      transaction.type === 'deposit'
                        ? 'bg-green-500 hover:bg-green-400 text-white'
                        : 'bg-red-500 hover:bg-red-400 text-white'
                    }`}
                  >
                    {t('confirm')}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
