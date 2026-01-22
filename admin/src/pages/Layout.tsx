import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  Coins,
  Spade,
  Gamepad2,
  History,
  FileText,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, key: 'dashboard' },
  { path: '/agents', icon: UserPlus, key: 'agents' },
  { path: '/members', icon: Users, key: 'members' },
  { path: '/transactions', icon: Coins, key: 'transactions' },
  { path: '/betting-records', icon: History, key: 'bettingRecords' },
  { path: '/game-control', icon: Gamepad2, key: 'gameControl' },
  { path: '/game-rounds', icon: Spade, key: 'gameRounds' },
  { path: '/operation-logs', icon: FileText, key: 'operationLogs' },
  { path: '/reports', icon: BarChart3, key: 'reports' },
  { path: '/notices', icon: Bell, key: 'notices' },
  { path: '/settings', icon: Settings, key: 'settings' },
];

export default function Layout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        className="bg-slate-800 border-r border-slate-700/50 flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Spade className="w-5 h-5 text-black" />
            </div>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white font-bold text-lg"
              >
                Admin
              </motion.span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
                  }`
                }
              >
                <IconComponent className="w-5 h-5" />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium"
                  >
                    {t(item.key)}
                  </motion.span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 bg-slate-800/50 border-b border-slate-700/50 flex items-center justify-between px-6">
          <div className="text-slate-400 text-sm">
            Welcome back, <span className="text-white font-medium">{user?.nickname || user?.username}</span>
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">
              {user?.role}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Language switcher */}
            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              {i18n.language === 'zh' ? 'English' : '中文'}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">{t('logout')}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
