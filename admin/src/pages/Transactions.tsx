import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { transactionApi } from '../services/api';
import type { Transaction, TransactionType } from '../types';

const TYPE_COLORS: Record<TransactionType, string> = {
  deposit: 'bg-green-500/20 text-green-400',
  withdraw: 'bg-red-500/20 text-red-400',
  bet: 'bg-blue-500/20 text-blue-400',
  win: 'bg-amber-500/20 text-amber-400',
  refund: 'bg-purple-500/20 text-purple-400',
  adjustment: 'bg-gray-500/20 text-gray-400',
};

export default function Transactions() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', startDate: '', endDate: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchTransactions();
  }, [filter, pagination.page]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data } = await transactionApi.getTransactions({
        type: filter.type || undefined,
        startDate: filter.startDate || undefined,
        endDate: filter.endDate || undefined,
        page: pagination.page,
        limit: pagination.limit,
      });
      setTransactions(data.transactions);
      setPagination({ ...pagination, ...data.pagination });
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t('transactions')}</h1>
        <p className="text-gray-400 mt-1">View all point transactions</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 p-4 rounded-xl bg-[#1e1e1e]/50 border border-[#333]/50">
        <select
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="px-4 py-2 rounded-lg bg-[#252525]/50 border border-[#444]/50 text-white focus:outline-none focus:border-amber-500/50"
        >
          <option value="">All Types</option>
          <option value="deposit">{t('deposit')}</option>
          <option value="withdraw">{t('withdraw')}</option>
          <option value="bet">Bet</option>
          <option value="win">Win</option>
          <option value="refund">Refund</option>
          <option value="adjustment">{t('adjustment')}</option>
        </select>
        <input
          type="date"
          value={filter.startDate}
          onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
          className="px-4 py-2 rounded-lg bg-[#252525]/50 border border-[#444]/50 text-white focus:outline-none focus:border-amber-500/50"
        />
        <input
          type="date"
          value={filter.endDate}
          onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
          className="px-4 py-2 rounded-lg bg-[#252525]/50 border border-[#444]/50 text-white focus:outline-none focus:border-amber-500/50"
        />
        <button
          onClick={() => setFilter({ type: '', startDate: '', endDate: '' })}
          className="px-4 py-2 rounded-lg bg-[#252525]/50 hover:bg-[#333]/50 text-white"
        >
          Clear
        </button>
      </div>

      {/* Transactions Table */}
      <div className="rounded-xl bg-[#1e1e1e]/50 border border-[#333]/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#333]/50">
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Time</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">User</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Type</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">{t('amount')}</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">{t('balanceBefore')}</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">{t('balanceAfter')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">{t('operator')}</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">{t('note')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  {t('loading')}
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-400">
                  {t('noData')}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-[#333]/30 hover:bg-[#252525]/20"
                >
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {formatDate(tx.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{tx.user.username}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${TYPE_COLORS[tx.type]}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${Number(tx.amount) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {Number(tx.amount) >= 0 ? '+' : ''}{Number(tx.amount).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {Number(tx.balanceBefore).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-white font-medium">
                    {Number(tx.balanceAfter).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {tx.operator.username}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400 max-w-xs truncate">
                    {tx.note || '-'}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#333]/50">
            <div className="text-sm text-gray-400">
              Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-3 py-1 rounded-lg bg-[#252525]/50 hover:bg-[#333]/50 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-gray-400">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 rounded-lg bg-[#252525]/50 hover:bg-[#333]/50 disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
