import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingDown,
  BarChart3,
  FileText,
  User,
  Shield,
  Building2,
  Link2
} from 'lucide-react';
import { agentReportApi } from '../services/api';

interface DashboardData {
  user: {
    username: string;
    nickname: string;
    agentLevel: number;
    balance: number;
    status: string;
    inviteCode: string;
    sharePercent: number;
    parentShare: number | null;
  };
  today: {
    earnedRebate: number;
    receivable: number;
    payable: number;
    memberWinLoss: number;
    validBet: number;
    betCount: number;
    profit: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await agentReportApi.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getAgentLevelText = (level: number) => {
    const levels: Record<number, string> = {
      1: '1级代理',
      2: '2级代理',
      3: '3级代理',
      4: '4级代理',
      5: '5级代理',
    };
    return levels[level] || `${level}级代理`;
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      active: '正常',
      suspended: '停用',
      banned: '禁用',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      active: 'text-green-400',
      suspended: 'text-yellow-400',
      banned: 'text-red-400',
    };
    return colorMap[status] || 'text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">无法加载数据</div>
      </div>
    );
  }

  const statCards = [
    {
      label: '今日赚取退水',
      value: formatCurrency(data.today.earnedRebate),
      icon: Wallet,
      color: 'from-amber-500 to-yellow-500',
    },
    {
      label: '今日应收金额',
      value: formatCurrency(data.today.receivable),
      icon: ArrowDownCircle,
      color: 'from-green-500 to-emerald-500',
    },
    {
      label: '今日应缴上线',
      value: formatCurrency(data.today.payable),
      icon: ArrowUpCircle,
      color: 'from-red-500 to-pink-500',
    },
    {
      label: '今日会员输赢',
      value: formatCurrency(data.today.memberWinLoss),
      icon: TrendingDown,
      color: data.today.memberWinLoss >= 0 ? 'from-green-500 to-emerald-500' : 'from-red-500 to-pink-500',
    },
    {
      label: '今日会员有效投注',
      value: formatCurrency(data.today.validBet),
      icon: BarChart3,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      label: '今日会员注单数',
      value: data.today.betCount.toString(),
      icon: FileText,
      color: 'from-purple-500 to-indigo-500',
    },
  ];

  const userInfoItems = [
    {
      label: '代理层级',
      value: getAgentLevelText(data.user.agentLevel),
      icon: Building2
    },
    {
      label: '账号状态',
      value: getStatusText(data.user.status),
      icon: Shield,
      valueColor: getStatusColor(data.user.status)
    },
    {
      label: '上级',
      value: data.user.parentShare !== null ? `占成 ${data.user.parentShare}%` : '无',
      icon: User
    },
    {
      label: '邀请码',
      value: data.user.inviteCode || '无',
      icon: Link2
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">
            欢迎回来，{data.user.nickname || data.user.username}
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            统计时间：{new Date(data.dateRange.startDate).toLocaleDateString('zh-CN')} 12:00:00 至{' '}
            {new Date(data.dateRange.endDate).toLocaleDateString('zh-CN')} 12:00:00
          </p>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => {
          const IconComponent = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative overflow-hidden rounded-xl bg-[#1e1e1e] border border-[#333] p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{card.label}</p>
                  <p className="text-xl font-bold text-white mt-1">{card.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-lg bg-gradient-to-r ${card.color} flex items-center justify-center`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Today Profit - Large Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-gradient-to-r from-[#1e1e1e] to-[#252525] border border-[#333] p-6"
      >
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">今日盈亏</p>
          <p className={`text-4xl font-bold ${data.today.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.today.profit >= 0 ? '+' : ''}{formatCurrency(data.today.profit)}
          </p>
        </div>
      </motion.div>

      {/* User Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-xl bg-[#1e1e1e] border border-[#333] overflow-hidden"
      >
        <div className="p-4 border-b border-[#333]">
          <h2 className="text-white font-semibold">个人资料</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#333]">
          {userInfoItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <div key={item.label} className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <IconComponent className="w-5 h-5 text-amber-400" />
                </div>
                <p className="text-gray-400 text-xs mb-1">{item.label}</p>
                <p className={`font-semibold ${item.valueColor || 'text-white'}`}>
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="border-t border-[#333] p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">账号：</span>
              <span className="text-white ml-1">{data.user.username}</span>
            </div>
            <div>
              <span className="text-gray-400">名称：</span>
              <span className="text-white ml-1">{data.user.nickname || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">余额：</span>
              <span className="text-amber-400 ml-1 font-semibold">{formatCurrency(data.user.balance)}</span>
            </div>
            <div>
              <span className="text-gray-400">占成：</span>
              <span className="text-white ml-1">{data.user.sharePercent}%</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
