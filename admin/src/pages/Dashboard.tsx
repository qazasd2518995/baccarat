import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Users, Building2, User, Coins } from 'lucide-react';
import { userApi, transactionApi } from '../services/api';
import type { User as UserType, Transaction } from '../types';

interface Stats {
  totalUsers: number;
  totalAgents: number;
  totalMembers: number;
  totalBalance: number;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalAgents: 0,
    totalMembers: 0,
    totalBalance: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [usersRes, transactionsRes] = await Promise.all([
        userApi.getUsers({ limit: 1000 }),
        transactionApi.getTransactions({ limit: 10 }),
      ]);

      const users = usersRes.data.users;
      setStats({
        totalUsers: users.length,
        totalAgents: users.filter((u: UserType) => u.role === 'agent').length,
        totalMembers: users.filter((u: UserType) => u.role === 'member').length,
        totalBalance: users.reduce((sum: number, u: UserType) => sum + Number(u.balance), 0),
      });

      setRecentTransactions(transactionsRes.data.transactions);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const STAT_CARDS = [
    { key: 'totalUsers', value: stats.totalUsers, icon: Users, color: 'from-blue-500 to-blue-600' },
    { key: 'totalAgents', value: stats.totalAgents, icon: Building2, color: 'from-purple-500 to-purple-600' },
    { key: 'totalMembers', value: stats.totalMembers, icon: User, color: 'from-green-500 to-green-600' },
    { key: 'totalBalance', value: stats.totalBalance.toLocaleString(), icon: Coins, color: 'from-amber-500 to-orange-500' },
  ];

  const TYPE_COLORS: Record<string, string> = {
    deposit: 'bg-green-500/20 text-green-400',
    withdraw: 'bg-red-500/20 text-red-400',
    bet: 'bg-blue-500/20 text-blue-400',
    win: 'bg-amber-500/20 text-amber-400',
    refund: 'bg-purple-500/20 text-purple-400',
    adjustment: 'bg-slate-500/20 text-slate-400',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('dashboard')}</h1>
        <p className="text-slate-400 mt-1">Overview of your system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">{t(card.key)}</p>
                  <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${card.color} flex items-center justify-center`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
              </div>
              {/* Decorative gradient */}
              <div className={`absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-r ${card.color} opacity-10 rounded-full blur-2xl`} />
            </motion.div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-slate-800/50 border border-slate-700/50 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-700/50">
          <h2 className="text-lg font-bold text-white">{t('recentTransactions')}</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/30">
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Time</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">User</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">Type</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-slate-400">{t('amount')}</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-slate-400">{t('operator')}</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">{tx.user.username}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${TYPE_COLORS[tx.type]}`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className={`px-6 py-4 text-right font-medium ${Number(tx.amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {tx.operator.username}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
