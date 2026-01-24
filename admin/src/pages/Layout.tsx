import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  History,
  Users,
  ScrollText,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/report/agent', icon: FileText, label: '账务报表' },
  { path: '/bet/index', icon: History, label: '投注记录' },
  { path: '/member/index', icon: Users, label: '下线代理管理' },
  { path: '/log/index', icon: ScrollText, label: '日志' },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 72 : 220 }}
        className="bg-[#1e1e1e] border-r border-[#333] flex flex-col"
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
        <nav className="flex-1 py-4">
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

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 bg-[#1e1e1e] border-b border-[#333] flex items-center justify-between px-6">
          <div className="text-gray-400 text-sm">
            欢迎回来，<span className="text-white font-medium">{user?.nickname || user?.username}</span>
            <span className="ml-2 px-2 py-0.5 rounded text-xs bg-amber-500/20 text-amber-400 font-medium">
              {user?.role === 'admin' ? '管理员' : '代理'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Logout */}
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
        <main className="flex-1 p-6 overflow-auto bg-[#1a1a1a]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
