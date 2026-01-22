import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spade, Loader2, Heart } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!username || !password) {
      setError(i18n.language === 'zh' ? '请输入用户名和密码' : 'Please enter username and password');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const { data } = await authApi.login(username, password);

      if (data.token && data.user) {
        setAuth(data.token, data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect admin/agent to admin panel, members to game
        if (data.user.role === 'admin' || data.user.role === 'agent') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setError(i18n.language === 'zh' ? '登录响应无效' : 'Invalid login response');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || t('loginError');
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0f1c] via-[#0d1528] to-[#0a1018] relative overflow-hidden">
      {/* Luxurious Background Effects */}
      <div className="absolute inset-0">
        {/* Animated gradient orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px]"
          animate={{
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-red-500/10 rounded-full blur-[120px]"
          animate={{
            x: [0, -30, 0],
            y: [0, -50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Pattern overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fbbf24' fill-opacity='0.4'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2.5l5 3.5-5 3.5z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Language Toggle */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleLanguage}
        className="absolute top-6 right-6 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/30 text-sm font-medium backdrop-blur-sm"
      >
        {i18n.language === 'zh' ? 'EN' : '中文'}
      </motion.button>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl shadow-black/50 overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-0 text-center">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="inline-block mb-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <Spade className="w-10 h-10 text-black" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600 mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {t('loginTitle')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-400"
            >
              {t('loginSubtitle')}
            </motion.p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {/* Username */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className="block text-sm font-medium text-slate-400 mb-2">
                {t('username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                placeholder={t('enterUsername')}
                required
              />
            </motion.div>

            {/* Password */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <label className="block text-sm font-medium text-slate-400 mb-2">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                placeholder={t('enterPassword')}
                required
              />
            </motion.div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black tracking-widest text-lg transition-all shadow-lg shadow-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin inline-block" />
                ) : (
                  t('login')
                )}
              </button>
            </motion.div>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8 text-center">
            <p className="text-xs text-slate-500">
              {t('royalGaming')} • {t('premiumBaccarat')}
            </p>
          </div>
        </div>

        {/* Decorative cards */}
        <motion.div
          initial={{ opacity: 0, rotate: -20, x: -100 }}
          animate={{ opacity: 1, rotate: -15, x: 0 }}
          transition={{ delay: 0.8, type: 'spring' }}
          className="absolute -left-16 top-1/2 -translate-y-1/2 w-20 h-28 rounded-xl bg-white shadow-2xl flex items-center justify-center -z-10"
        >
          <Heart className="w-10 h-10 text-red-600 fill-red-600" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, rotate: 20, x: 100 }}
          animate={{ opacity: 1, rotate: 15, x: 0 }}
          transition={{ delay: 0.9, type: 'spring' }}
          className="absolute -right-16 top-1/2 -translate-y-1/2 w-20 h-28 rounded-xl bg-white shadow-2xl flex items-center justify-center -z-10"
        >
          <Spade className="w-10 h-10 text-gray-900 fill-gray-900" />
        </motion.div>
      </motion.div>
    </div>
  );
}
