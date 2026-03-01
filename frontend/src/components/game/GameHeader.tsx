import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Coins, User, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useGameStore } from '../../store/gameStore';

export default function GameHeader() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { balance } = useGameStore();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-700/30 bg-slate-900/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30 border border-amber-400/30"
        >
          <span className="text-black font-black text-lg tracking-tighter" style={{ fontFamily: 'system-ui' }}>JW</span>
        </motion.div>
        <div>
          <h1
            className="text-xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500"
            style={{ fontFamily: 'system-ui' }}
          >
            九贏百家
          </h1>
          <p className="text-[10px] text-amber-500/50 tracking-widest">JIU WIN BACCARAT</p>
        </div>
      </div>

      {/* Balance */}
      <motion.div
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-900/30 to-amber-800/20 border border-amber-500/30"
        whileHover={{ scale: 1.02 }}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
          <Coins className="w-4 h-4 text-black" />
        </div>
        <div>
          <div className="text-xs text-amber-400/70">{t('balance')}</div>
          <div className="text-xl font-black text-amber-400">
            {balance.toLocaleString()}
          </div>
        </div>
      </motion.div>

      {/* User Info & Controls */}
      <div className="flex items-center gap-4">
        {/* Language Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleLanguage}
          className="px-4 py-2 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500/30 text-sm font-medium"
        >
          {i18n.language === 'zh' ? 'EN' : '中文'}
        </motion.button>

        {/* User Menu */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 border border-slate-700/30">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium">{user?.nickname || user?.username}</div>
            <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>

        {/* Logout */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogout}
          className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400"
        >
          <LogOut className="w-5 h-5" />
        </motion.button>
      </div>
    </header>
  );
}
