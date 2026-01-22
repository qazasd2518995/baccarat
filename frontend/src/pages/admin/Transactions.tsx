import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import DataTable from '../../components/admin/common/DataTable';
// import { useAuthStore } from '../../store/authStore';
import { transactionApi } from '../../services/api';
import type { Transaction } from '../../types';

export default function Transactions() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchTransactions();
  }, [page, search, typeFilter, dateFrom, dateTo]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page,
        limit: 20,
      };
      if (typeFilter !== 'all') params.type = typeFilter;
      if (dateFrom) params.startDate = dateFrom;
      if (dateTo) params.endDate = dateTo;

      const response = await transactionApi.getTransactions(params);

      setTransactions(response.data.transactions || []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const getTypeStyles = (type: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      deposit: {
        bg: 'bg-green-500/20',
        text: 'text-green-400',
        icon: <ArrowUpRight size={14} />,
      },
      withdraw: {
        bg: 'bg-red-500/20',
        text: 'text-red-400',
        icon: <ArrowDownRight size={14} />,
      },
      bet: {
        bg: 'bg-blue-500/20',
        text: 'text-blue-400',
        icon: <ArrowDownRight size={14} />,
      },
      win: {
        bg: 'bg-amber-500/20',
        text: 'text-amber-400',
        icon: <ArrowUpRight size={14} />,
      },
      refund: {
        bg: 'bg-purple-500/20',
        text: 'text-purple-400',
        icon: <ArrowUpRight size={14} />,
      },
      adjustment: {
        bg: 'bg-slate-500/20',
        text: 'text-slate-400',
        icon: null,
      },
    };
    return styles[type] || styles.adjustment;
  };

  const columns = [
    {
      key: 'createdAt',
      header: t('time'),
      render: (tx: Transaction) => (
        <div>
          <p className="text-white text-sm">
            {new Date(tx.createdAt).toLocaleDateString()}
          </p>
          <p className="text-slate-400 text-xs">
            {new Date(tx.createdAt).toLocaleTimeString()}
          </p>
        </div>
      ),
    },
    {
      key: 'type',
      header: t('type'),
      render: (tx: Transaction) => {
        const style = getTypeStyles(tx.type);
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${style.bg} ${style.text} text-xs font-medium`}>
            {style.icon}
            {tx.type.toUpperCase()}
          </span>
        );
      },
    },
    {
      key: 'user',
      header: t('users'),
      render: (tx: Transaction) => (
        <div>
          <p className="text-white text-sm">{tx.user.username}</p>
          {tx.user.nickname && (
            <p className="text-slate-400 text-xs">{tx.user.nickname}</p>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: t('amount'),
      render: (tx: Transaction) => (
        <span className={tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}>
          {tx.amount >= 0 ? '+' : '-'}${formatCurrency(tx.amount)}
        </span>
      ),
    },
    {
      key: 'balance',
      header: t('balance'),
      render: (tx: Transaction) => (
        <div className="text-xs">
          <p className="text-slate-400">
            {t('balanceBefore')}: ${formatCurrency(tx.balanceBefore)}
          </p>
          <p className="text-white">
            {t('balanceAfter')}: ${formatCurrency(tx.balanceAfter)}
          </p>
        </div>
      ),
    },
    {
      key: 'operator',
      header: t('operator'),
      render: (tx: Transaction) => (
        <span className="text-slate-400 text-sm">
          {tx.operator.username}
        </span>
      ),
    },
    {
      key: 'note',
      header: t('note'),
      render: (tx: Transaction) => (
        <span className="text-slate-400 text-sm truncate max-w-[200px] block">
          {tx.note || '-'}
        </span>
      ),
    },
  ];

  const handleExport = () => {
    // CSV export functionality
    const headers = ['Time', 'Type', 'User', 'Amount', 'Balance Before', 'Balance After', 'Operator', 'Note'];
    const rows = transactions.map((tx) => [
      new Date(tx.createdAt).toISOString(),
      tx.type,
      tx.user.username,
      tx.amount,
      tx.balanceBefore,
      tx.balanceAfter,
      tx.operator.username,
      tx.note || '',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t('transactionsTitle')}</h1>
          <p className="text-slate-400 mt-1">{t('transactionsSubtitle')}</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
        >
          <Download size={18} /> {t('export')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('search') + '...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">{t('allTypes')}</option>
          <option value="deposit">{t('deposit')}</option>
          <option value="withdraw">{t('withdraw')}</option>
          <option value="bet">{t('bet')}</option>
          <option value="win">{t('win')}</option>
          <option value="refund">{t('refund')}</option>
          <option value="adjustment">{t('adjustment')}</option>
        </select>
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-slate-400" />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-slate-400">{t('to')}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">{t('totalDeposit')}</p>
          <p className="text-xl font-bold text-green-400">
            ${formatCurrency(
              transactions
                .filter((tx) => tx.type === 'deposit')
                .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
            )}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">{t('totalWithdraw')}</p>
          <p className="text-xl font-bold text-red-400">
            ${formatCurrency(
              transactions
                .filter((tx) => tx.type === 'withdraw')
                .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
            )}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">{t('totalBets')}</p>
          <p className="text-xl font-bold text-blue-400">
            ${formatCurrency(
              transactions
                .filter((tx) => tx.type === 'bet')
                .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
            )}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <p className="text-sm text-slate-400">{t('totalWins')}</p>
          <p className="text-xl font-bold text-amber-400">
            ${formatCurrency(
              transactions
                .filter((tx) => tx.type === 'win')
                .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
            )}
          </p>
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={transactions}
        keyField="id"
        loading={loading}
        emptyMessage={t('noData')}
        pagination={{
          page,
          totalPages,
          total,
          onPageChange: setPage,
        }}
      />
    </div>
  );
}
