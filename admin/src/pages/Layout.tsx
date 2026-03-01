import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Gamepad2,
  Settings,
  Bell,
  Menu,
  X,
  Target,
  Activity,
  Headphones,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

interface NavItem {
  path?: string;
  icon: any;
  label: string;
  adminOnly?: boolean;
  children?: { path: string; icon: any; label: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/report/agent', icon: FileText, label: '账务报表' },
  { path: '/game/rounds', icon: Gamepad2, label: '开奖记录' },
  { path: '/member/index', icon: Users, label: '下线代理管理' },
  {
    icon: Headphones,
    label: '客服功能',
    adminOnly: true,
    children: [
      { path: '/game/win-control', icon: Target, label: '输赢控制' },
      { path: '/game/manual-detection', icon: Activity, label: '自动侦测' },
      { path: '/notices', icon: Bell, label: '公告管理' },
    ],
  },
  { path: '/settings', icon: Settings, label: '系统设置' },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['客服功能']);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Auto-expand parent menu if child is active
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) => location.pathname === child.path);
        if (isChildActive && !expandedMenus.includes(item.label)) {
          setExpandedMenus((prev) => [...prev, item.label]);
        }
      }
    });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const renderNavItem = (item: NavItem, isMobile: boolean = false) => {
    const IconComponent = item.icon;
    const showLabel = isMobile || !sidebarCollapsed;

    if (item.children) {
      const isExpanded = expandedMenus.includes(item.label);
      const isChildActive = item.children.some((child) => location.pathname === child.path);

      return (
        <div key={item.label}>
          <button
            onClick={() => toggleMenu(item.label)}
            className={`w-full flex items-center gap-3 px-4 py-3 mx-2 my-0.5 rounded-lg transition-all ${
              isChildActive
                ? 'bg-amber-500/10 text-amber-400'
                : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
            }`}
          >
            <IconComponent className="w-5 h-5 flex-shrink-0" />
            {showLabel && (
              <>
                <span className="font-medium text-sm whitespace-nowrap flex-1 text-left">
                  {item.label}
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
              </>
            )}
          </button>
          <AnimatePresence>
            {isExpanded && showLabel && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {item.children.map((child) => {
                  const ChildIcon = child.icon;
                  return (
                    <NavLink
                      key={child.path}
                      to={child.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-2.5 mx-2 ml-6 my-0.5 rounded-lg transition-all ${
                          isActive
                            ? 'bg-amber-500/20 text-amber-400 border-l-2 border-amber-400'
                            : 'text-gray-400 hover:bg-[#2a2a2a] hover:text-white'
                        }`
                      }
                    >
                      <ChildIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium text-sm whitespace-nowrap">{child.label}</span>
                    </NavLink>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    return (
      <NavLink
        key={item.path}
        to={item.path!}
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
        {showLabel && (
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
        <div className="h-16 flex items-center justify-center border-b border-[#333] bg-gradient-to-r from-[#1a1a1a] to-[#252525]">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
              <span className="text-black font-black text-sm tracking-tighter" style={{ fontFamily: 'system-ui' }}>JW</span>
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col"
              >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-black text-sm tracking-wide" style={{ fontFamily: 'system-ui' }}>
                  九贏百家
                </span>
                <span className="text-gray-500 text-[10px] tracking-widest">
                  代理后台
                </span>
              </motion.div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => renderNavItem(item))}
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
            <div className="h-16 flex items-center justify-between px-4 border-b border-[#333] bg-gradient-to-r from-[#1a1a1a] to-[#252525]">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
                  <span className="text-black font-black text-sm tracking-tighter" style={{ fontFamily: 'system-ui' }}>JW</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 font-black text-sm tracking-wide" style={{ fontFamily: 'system-ui' }}>
                    九贏百家
                  </span>
                  <span className="text-gray-500 text-[10px] tracking-widest">
                    代理后台
                  </span>
                </div>
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
              {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin').map((item) => renderNavItem(item, true))}
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
