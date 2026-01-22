import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  BarChart3,
  History,
  Settings,
  FileText,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Spade,
  ClipboardList,
  Network,
} from 'lucide-react';
import type { UserRole } from '../../../types';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPath: string;
  userRole: UserRole;
}

interface NavItem {
  path: string;
  labelKey: string;
  labelZh: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  {
    path: '/admin',
    labelKey: 'dashboard',
    labelZh: '儀表盤',
    icon: <LayoutDashboard size={20} />
  },
  {
    path: '/admin/reports',
    labelKey: 'financialReports',
    labelZh: '帳務報表',
    icon: <BarChart3 size={20} />
  },
  {
    path: '/admin/betting-records',
    labelKey: 'bettingRecords',
    labelZh: '投注記錄',
    icon: <ClipboardList size={20} />
  },
  {
    path: '/admin/agents',
    labelKey: 'subAgentManagement',
    labelZh: '下線代理管理',
    icon: <Network size={20} />,
    adminOnly: false // agents can also see this
  },
  {
    path: '/admin/logs',
    labelKey: 'logs',
    labelZh: '日誌',
    icon: <FileText size={20} />
  },
  {
    path: '/admin/game-rounds',
    labelKey: 'gameRounds',
    labelZh: '牌局記錄',
    icon: <History size={20} />
  },
  {
    path: '/admin/game-control',
    labelKey: 'gameControl',
    labelZh: '遊戲控制',
    icon: <Gamepad2 size={20} />,
    adminOnly: true
  },
  {
    path: '/admin/settings',
    labelKey: 'settings',
    labelZh: '個人設定',
    icon: <Settings size={20} />
  },
];

export default function Sidebar({ collapsed, onToggle, currentPath, userRole }: SidebarProps) {
  const { t, i18n } = useTranslation();

  const filteredItems = navItems.filter((item) => {
    if (item.adminOnly && userRole !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#141922] border-r border-gray-700/50 transition-all duration-300 z-40 flex flex-col ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-700/50 bg-[#0d1117]">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Spade size={22} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-lg text-white tracking-wide">BACCARAT</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Admin Panel</span>
            </div>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-[#2a3548] text-gray-500 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = currentPath === item.path ||
            (item.path !== '/admin' && currentPath.startsWith(item.path));
          const label = i18n.language === 'zh' ? item.labelZh : t(item.labelKey);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${
                isActive
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-gray-400 hover:bg-[#2a3548] hover:text-white'
              }`}
              title={collapsed ? label : undefined}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-orange-500 rounded-r-full" />
              )}
              <span className={`flex-shrink-0 transition-colors ${isActive ? 'text-orange-400' : 'group-hover:text-orange-400'}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Back to Game */}
      <div className="p-3 border-t border-gray-700/50">
        <Link
          to="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-orange-400 hover:bg-orange-500/10 transition-all group ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? t('returnToGame') : undefined}
        >
          <Gamepad2 size={20} className="group-hover:scale-110 transition-transform" />
          {!collapsed && (
            <span className="text-sm font-medium">{i18n.language === 'zh' ? '返回遊戲' : t('returnToGame')}</span>
          )}
        </Link>
      </div>
    </aside>
  );
}
