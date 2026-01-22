import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCog,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  FileText,
  ChevronRight,
  User,
  Copy,
  Check,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { reportApi } from '../../services/api';

interface DashboardStats {
  todayRebate: number;        // 今日賺取退水
  todayReceivable: number;    // 今日應收金額
  todayPayable: number;       // 今日應繳上線
  todayMemberWinLoss: number; // 今日會員輸贏
  todayValidBets: number;     // 今日會員有效投注
  todayBetCount: number;      // 今日會員注單數
  todayProfit: number;        // 今日盈虧
  remainingCredit: number;    // 剩餘額度
  agentCount: number;         // 擁有代理數
  directMemberCount: number;  // 直屬會員數
  totalMemberCount: number;   // 總會員數
}

export default function Dashboard() {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);

  const isZh = i18n.language === 'zh';

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await reportApi.getDashboard();
      // Map API response to our stats structure
      setStats({
        todayRebate: response.data?.todayRebate || 0,
        todayReceivable: response.data?.todayReceivable || 0,
        todayPayable: response.data?.todayPayable || 0,
        todayMemberWinLoss: response.data?.netProfit || 0,
        todayValidBets: response.data?.totalBets || 0,
        todayBetCount: response.data?.todayRounds || 0,
        todayProfit: response.data?.netProfit || 0,
        remainingCredit: user?.balance || 0,
        agentCount: response.data?.totalAgents || 0,
        directMemberCount: response.data?.activeMembers || 0,
        totalMemberCount: response.data?.totalMembers || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({
        todayRebate: 0,
        todayReceivable: 0,
        todayPayable: 0,
        todayMemberWinLoss: 0,
        todayValidBets: 0,
        todayBetCount: 0,
        todayProfit: 0,
        remainingCredit: user?.balance || 0,
        agentCount: 0,
        directMemberCount: 0,
        totalMemberCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyUserId = async () => {
    if (user?.id) {
      await navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount));
    return amount < 0 ? `-$${formatted}` : `$${formatted}`;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, { zh: string; en: string; level?: string }> = {
      admin: { zh: '系統管理員', en: 'Admin' },
      agent: { zh: '代理', en: 'Agent', level: '4級代理' },
      member: { zh: '會員', en: 'Member' },
    };
    return roleMap[role] || roleMap.member;
  };

  const roleInfo = getRoleLabel(user?.role || 'member');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-64 bg-[#2a3548] rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-[#1e2a3a] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: isZh ? '今日賺取退水' : 'Today Rebate Earned',
      value: stats?.todayRebate || 0,
      icon: <TrendingUp size={20} />,
      color: 'text-green-400',
    },
    {
      label: isZh ? '今日應收金額' : 'Today Receivable',
      value: stats?.todayReceivable || 0,
      icon: <DollarSign size={20} />,
      color: 'text-orange-400',
    },
    {
      label: isZh ? '今日應繳上線' : 'Today Payable to Upline',
      value: stats?.todayPayable || 0,
      icon: <TrendingDown size={20} />,
      color: 'text-red-400',
    },
    {
      label: isZh ? '今日會員輸贏' : 'Today Member Win/Loss',
      value: stats?.todayMemberWinLoss || 0,
      icon: <Users size={20} />,
      color: stats?.todayMemberWinLoss && stats.todayMemberWinLoss < 0 ? 'text-red-400' : 'text-green-400',
      showSign: true,
    },
    {
      label: isZh ? '今日會員有效投注' : 'Today Valid Bets',
      value: stats?.todayValidBets || 0,
      icon: <Receipt size={20} />,
      color: 'text-blue-400',
    },
    {
      label: isZh ? '今日會員注單數' : 'Today Bet Count',
      value: stats?.todayBetCount || 0,
      icon: <FileText size={20} />,
      color: 'text-purple-400',
      isCount: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-br from-[#1e2a3a] to-[#141922] border border-gray-700/50 rounded-xl p-6">
        <h1 className="text-2xl font-bold text-white mb-1">
          {isZh ? `歡迎回來，${user?.nickname || user?.username}` : `Welcome back, ${user?.nickname || user?.username}`}
        </h1>
        <p className="text-gray-400 text-sm">
          {isZh ? '統計時間：今日 00:00 ~ 23:59' : 'Statistics period: Today 00:00 ~ 23:59'}
        </p>
      </div>

      {/* Stats Grid - 2x3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-5 hover:border-gray-600/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-gray-400 text-sm">{card.label}</span>
              <div className={`p-2 rounded-lg bg-[#2a3548] ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>
              {card.isCount
                ? formatNumber(card.value)
                : formatCurrency(card.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Today Profit Panel & User Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today Profit Panel */}
        <div className="bg-gradient-to-br from-[#1e2a3a] via-[#1a2235] to-[#141922] border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-gray-400 text-sm mb-2">
            {isZh ? '今日盈虧' : "Today's Profit/Loss"}
          </h2>
          <div className={`text-4xl font-bold ${(stats?.todayProfit || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(stats?.todayProfit || 0)}
          </div>
          <p className="text-gray-500 text-xs mt-3">
            {isZh ? '統計時間：今日' : 'Statistics: Today'}
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <User size={32} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-white">{user?.nickname || user?.username}</p>
              <p className="text-gray-400 text-sm">@{user?.username}</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Role & Level */}
            <div className="flex items-center justify-between py-2 border-b border-gray-700/30">
              <span className="text-gray-400 text-sm">{isZh ? '代理層級' : 'Agent Level'}</span>
              <span className="text-orange-400 font-medium">
                {isZh ? roleInfo.level || roleInfo.zh : roleInfo.en}
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between py-2 border-b border-gray-700/30">
              <span className="text-gray-400 text-sm">{isZh ? '帳號狀態' : 'Account Status'}</span>
              <span className="text-green-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                {isZh ? '正常' : 'Active'}
              </span>
            </div>

            {/* Account ID */}
            <div className="flex items-center justify-between py-2 border-b border-gray-700/30">
              <span className="text-gray-400 text-sm">{isZh ? '帳號ID' : 'Account ID'}</span>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-mono">{user?.id?.slice(0, 8)}...</span>
                <button
                  onClick={copyUserId}
                  className="text-gray-400 hover:text-orange-400 transition-colors"
                >
                  {copiedId ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Stats Panel */}
      <div className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          {isZh ? '個人數據' : 'Personal Stats'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Remaining Credit */}
          <div className="bg-[#141922] rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">{isZh ? '剩餘額度' : 'Remaining Credit'}</p>
            <p className="text-2xl font-bold text-orange-400">{formatCurrency(stats?.remainingCredit || 0)}</p>
          </div>

          {/* Agent Count */}
          <div className="bg-[#141922] rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">{isZh ? '擁有代理數' : 'Agent Count'}</p>
            <p className="text-2xl font-bold text-blue-400">{formatNumber(stats?.agentCount || 0)}</p>
          </div>

          {/* Direct Member Count */}
          <div className="bg-[#141922] rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">{isZh ? '直屬會員數' : 'Direct Members'}</p>
            <p className="text-2xl font-bold text-green-400">{formatNumber(stats?.directMemberCount || 0)}</p>
          </div>

          {/* Total Member Count */}
          <div className="bg-[#141922] rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-1">{isZh ? '總會員數' : 'Total Members'}</p>
            <p className="text-2xl font-bold text-purple-400">{formatNumber(stats?.totalMemberCount || 0)}</p>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/admin/reports"
          className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-5 hover:border-orange-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Receipt size={20} className="text-orange-400" />
              </div>
              <div>
                <p className="text-white font-medium">{isZh ? '帳務報表' : 'Financial Reports'}</p>
                <p className="text-gray-500 text-sm">{isZh ? '查看代理/會員報表' : 'View agent/member reports'}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-500 group-hover:text-orange-400 transition-colors" />
          </div>
        </Link>

        <Link
          to="/admin/agents"
          className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-5 hover:border-orange-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <UserCog size={20} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">{isZh ? '下線代理管理' : 'Sub-agent Management'}</p>
                <p className="text-gray-500 text-sm">{isZh ? '管理代理與會員' : 'Manage agents & members'}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-500 group-hover:text-orange-400 transition-colors" />
          </div>
        </Link>

        <Link
          to="/admin/logs"
          className="bg-[#1e2a3a] border border-gray-700/50 rounded-xl p-5 hover:border-orange-500/50 transition-colors group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <FileText size={20} className="text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">{isZh ? '日誌' : 'Logs'}</p>
                <p className="text-gray-500 text-sm">{isZh ? '操作/現金/登入日誌' : 'Operation/Cash/Login logs'}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-500 group-hover:text-orange-400 transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
