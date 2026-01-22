import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Spade, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await authApi.login(username, password);

      // Check if user has admin or agent role
      if (data.user.role === 'member') {
        setError('Access denied. Admin or Agent role required.');
        setLoading(false);
        return;
      }

      setAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Language switcher */}
        <div className="absolute -top-12 right-0">
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            {i18n.language === 'zh' ? 'English' : '中文'}
          </button>
        </div>

        {/* Login card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Spade className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">{t('loginTitle')}</h1>
            <p className="text-slate-400">{t('loginSubtitle')}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                placeholder={t('username')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t('password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all"
                placeholder={t('password')}
                required
              />
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin inline-block" /> : t('login')}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-slate-500 text-sm">
          Baccarat Admin Panel v1.0
        </div>
      </motion.div>
    </div>
  );
}
