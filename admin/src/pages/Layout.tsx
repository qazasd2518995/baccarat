import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  History,
  Users,
  ScrollText,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Settings,
  Bell,
  BarChart3,
  Menu,
  X,
  Target,
  Activity,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/report/agent', icon: FileText, label: '账务报表' },
  { path: '/reports', icon: BarChart3, label: '综合报表' },
  { path: '/bet/index', icon: History, label: '投注记录' },
  { path: '/game/rounds', icon: Gamepad2, label: '游戏记录' },
  { path: '/game/win-control', icon: Target, label: '输赢控制' },
  { path: '/game/manual-detection', icon: Activity, label: '自动侦测' },
  { path: '/member/index', icon: Users, label: '下线代理管理' },
  { path: '/notices', icon: Bell, label: '公告管理' },
  { path: '/settings', icon: Settings, label: '系统设置' },
  { path: '/log/index', icon: ScrollText, label: '日志' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 220 }}
        className="hidden lg:flex bg-[#1e1e1e] border-r border-[#333] flex-col"
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-[#333]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">RP</span>
            </div>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-amber-400 font-bold text-base tracking-wide"
              >
                代理后台
              </motion.span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 my-0.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-400 border-l-2 border-amber-400'
                      : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                  }`
                }
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-medium text-sm whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div className="p-3 border-t border-[#333]">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-[#1e1e1e] border-r border-[#333] flex flex-col z-50 lg:hidden"
          >
            {/* Logo */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-[#333]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-sm">RP</span>
                </div>
                <span className="text-amber-400 font-bold text-base tracking-wide">
                  代理后台
                </span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 mx-2 my-0.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-amber-500/20 text-amber-400 border-l-2 border-amber-400'
                          : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                      }`
                    }
                  >
                    <IconComponent className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium text-sm whitespace-nowrap">
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </nav>

            {/* Logout in mobile */}
            <div className="p-4 border-t border-[#333]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">登出</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-4 lg:px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-gray-400 hover:text-white lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:block text-gray-400 text-sm">
            欢迎回来，<span className="text-white font-medium">{user?.nickname || user?.username}</span>
            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 font-medium">
              {user?.role === 'admin' ? '管理员' : '代理'}
            </span>
          </div>

          {/* Mobile: show username badge only */}
          <div className="sm:hidden flex items-center gap-2">
            <span className="text-white font-medium text-sm">{user?.nickname || user?.username}</span>
            <span className="px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 font-medium">
              {user?.role === 'admin' ? '管理员' : '代理'}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {/* Logout - Desktop only */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">登出</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto bg-[#1a1a1a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
