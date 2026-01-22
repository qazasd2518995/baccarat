import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Menu,
  Bell,
  User,
  LogOut,
  Settings,
  ChevronDown,
  Globe,
  Copy,
  Check,
} from 'lucide-react';
import type { User as UserType } from '../../../types';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export default function Header({ user, onLogout, onToggleSidebar }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const copyUserId = async () => {
    await navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  };

  const getRoleBadge = (role: string) => {
    const config = {
      admin: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: '系統管理員' },
      agent: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: '代理' },
      member: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: '會員' },
    };
    return config[role as keyof typeof config] || config.member;
  };

  const roleConfig = getRoleBadge(user.role);

  return (
    <header className="h-16 bg-[#0d1117] border-b border-gray-700/50 flex items-center justify-between px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-[#2a3548] text-gray-400 hover:text-white transition-colors lg:hidden"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb / Title */}
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">
            {i18n.language === 'zh' ? '管理後台' : t('adminPanel')}
          </span>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a3548] hover:bg-[#323d52] text-gray-300 hover:text-white transition-colors text-sm font-medium"
        >
          <Globe size={16} />
          {i18n.language === 'zh' ? 'EN' : '中文'}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg hover:bg-[#2a3548] text-gray-400 hover:text-white transition-colors"
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[#1e2a3a] border border-gray-700/50 rounded-xl shadow-xl z-50">
              <div className="p-4 border-b border-gray-700/50">
                <h3 className="font-semibold text-white">{i18n.language === 'zh' ? '通知' : t('notifications')}</h3>
              </div>
              <div className="max-h-80 overflow-auto">
                <div className="p-4 text-center text-gray-400 text-sm">
                  {i18n.language === 'zh' ? '暫無通知' : t('noNotifications')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#2a3548] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-white">{user.nickname || user.username}</p>
              <p className="text-xs text-orange-400">${formatBalance(user.balance)}</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-[#1e2a3a] border border-gray-700/50 rounded-xl shadow-xl z-50">
              {/* User Info Header */}
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                    <User size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{user.nickname || user.username}</p>
                    <p className="text-sm text-gray-400">@{user.username}</p>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded border ${roleConfig.bg} ${roleConfig.text} ${roleConfig.border}`}>
                    {i18n.language === 'zh' ? roleConfig.label : user.role.toUpperCase()}
                  </span>
                  <span className="text-green-400 text-xs">
                    {i18n.language === 'zh' ? '正常' : 'Active'}
                  </span>
                </div>

                {/* Balance */}
                <div className="flex items-center justify-between bg-[#141922] rounded-lg p-3">
                  <span className="text-gray-400 text-sm">{i18n.language === 'zh' ? '剩餘額度' : 'Balance'}</span>
                  <span className="text-orange-400 font-bold text-lg">${formatBalance(user.balance)}</span>
                </div>

                {/* User ID */}
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-gray-500">ID: {user.id.slice(0, 8)}...</span>
                  <button
                    onClick={copyUserId}
                    className="flex items-center gap-1 text-gray-400 hover:text-orange-400 transition-colors"
                  >
                    {copiedId ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId ? (i18n.language === 'zh' ? '已複製' : 'Copied') : (i18n.language === 'zh' ? '複製' : 'Copy')}
                  </button>
                </div>
              </div>

              {/* Menu Options */}
              <div className="p-2">
                <Link
                  to="/admin/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:bg-[#2a3548] hover:text-white transition-colors"
                >
                  <Settings size={18} />
                  <span className="text-sm">{i18n.language === 'zh' ? '個人設定' : t('settings')}</span>
                </Link>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm">{i18n.language === 'zh' ? '登出' : t('logout')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
