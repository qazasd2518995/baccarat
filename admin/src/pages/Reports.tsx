import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';
import { transactionApi } from '../services/api';

export default function Reports() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');
  const [stats, setStats] = useState({
    totalDeposits: 0,
    totalWithdraws: 0,
    netFlow: 0,
    transactionCount: 0,
  });

  useEffect(() => {
    fetchStats();
  }, [dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
      }

      const { data } = await transactionApi.getTransactions({
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        limit: 1000,
      });

      const transactions = data.transactions || [];
      let totalDeposits = 0;
      let totalWithdraws = 0;

      transactions.forEach((tx: any) => {
        if (tx.type === 'deposit') {
          totalDeposits += Number(tx.amount);
        } else if (tx.type === 'withdraw') {
          totalWithdraws += Number(tx.amount);
        }
      });

      setStats({
        totalDeposits,
        totalWithdraws,
        netFlow: totalDeposits - totalWithdraws,
        transactionCount: transactions.length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t('reports')}</h1>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-4 py-2 bg-[#1e1e1e] border border-[#333] rounded-xl text-white focus:outline-none focus:border-amber-500"
        >
          <option value="today">今日</option>
          <option value="week">近7天</option>
          <option value="month">近30天</option>
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#333]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-1">总入点</div>
          <div className="text-2xl font-bold text-green-400">
            {loading ? '...' : stats.totalDeposits.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#333]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-400" />
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-1">总出点</div>
          <div className="text-2xl font-bold text-red-400">
            {loading ? '...' : stats.totalWithdraws.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#333]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-1">净流入</div>
          <div className={`text-2xl font-bold ${stats.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {loading ? '...' : (stats.netFlow >= 0 ? '+' : '') + stats.netFlow.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#333]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="text-sm text-gray-400 mb-1">交易笔数</div>
          <div className="text-2xl font-bold text-white">
            {loading ? '...' : stats.transactionCount}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#333]">
        <h2 className="text-lg font-bold text-white mb-4">报表说明</h2>
        <div className="space-y-2 text-gray-400">
          <p>• <span className="text-green-400">入点</span>：上级给下级充值的点数</p>
          <p>• <span className="text-red-400">出点</span>：下级退还给上级的点数</p>
          <p>• <span className="text-amber-400">净流入</span>：入点 - 出点，正数表示系统内点数增加</p>
          <p>• 数据统计基于所选时间范围内的所有交易记录</p>
        </div>
      </div>
    </div>
  );
}
