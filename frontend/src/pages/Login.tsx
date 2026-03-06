import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, User, Lock } from 'lucide-react';
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
        // Only allow member role to login to game
        if (data.user.role === 'admin' || data.user.role === 'agent') {
          setError(i18n.language === 'zh' ? '管理员和代理请使用管理后台登录' : 'Admins and agents please use admin panel to login');
          setIsLoading(false);
          return;
        }

        setAuth(data.token, data.user);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/', { replace: true });
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
    <div className="min-h-screen w-full relative overflow-hidden bg-black">
      {/* Background Image - Model */}
      <div className="absolute inset-0">
        <img
          src="/login-model.jpg"
          alt=""
          className="w-full h-full object-cover object-top"
          style={{ objectPosition: '50% 15%' }}
        />
        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, transparent 60%),
              linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 100%)
            `
          }}
        />
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Gold accent line top */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, #d4af37, transparent 30%, transparent 70%, #d4af37)' }}
        />
        {/* Gold accent line bottom */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, #d4af37, transparent 30%, transparent 70%, #d4af37)' }}
        />
        {/* Floating particles effect */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-amber-400/30"
            style={{
              left: `${10 + Math.random() * 30}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [-20, 20, -20],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Login Form */}
        <div className="w-full lg:w-[45%] xl:w-[40%] flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full max-w-md"
          >
            {/* Language Switcher */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute top-4 right-4 lg:top-6 lg:right-6"
            >
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(212, 175, 55, 0.15)',
                  border: '1px solid rgba(212, 175, 55, 0.4)',
                  color: '#d4af37',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                {i18n.language === 'zh' ? 'EN' : '中文'}
              </button>
            </motion.div>

            {/* Logo & Brand */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-8 lg:mb-12"
            >
              {/* JW Logo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 mb-4 lg:mb-6 relative"
              >
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #aa8c2c 100%)',
                    boxShadow: '0 10px 40px rgba(212, 175, 55, 0.5)'
                  }}
                />
                <div className="absolute inset-[3px] rounded-xl bg-black/90 flex items-center justify-center">
                  <span
                    className="text-3xl lg:text-4xl font-black"
                    style={{
                      background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    JW
                  </span>
                </div>
                {/* Glow effect */}
                <div className="absolute -inset-4 rounded-3xl opacity-40 blur-xl" style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.6) 0%, transparent 70%)' }} />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-3xl lg:text-4xl font-bold mb-2"
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #ffd700 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {i18n.language === 'zh' ? '九贏百家' : 'JIU WIN'}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-sm lg:text-base tracking-[0.3em] text-amber-500/60 uppercase"
              >
                {i18n.language === 'zh' ? '尊贵游戏体验' : 'Premium Gaming'}
              </motion.p>
            </motion.div>

            {/* Login Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative p-6 sm:p-8 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(20,20,25,0.95) 0%, rgba(10,10,15,0.98) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.25)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(212, 175, 55, 0.1) inset'
              }}
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-amber-500/40 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-amber-500/40 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-amber-500/40 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-amber-500/40 rounded-br-2xl" />

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl text-sm text-center"
                    style={{
                      background: 'rgba(220, 38, 38, 0.15)',
                      border: '1px solid rgba(220, 38, 38, 0.3)',
                      color: '#fca5a5'
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Username */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-amber-500/80 tracking-wider uppercase">
                    {t('username')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/50" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-12 pr-4 py-4 rounded-xl text-white text-sm transition-all duration-300 outline-none"
                      style={{
                        background: 'rgba(30,30,40,0.8)',
                        border: focusedField === 'username' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.2)',
                        boxShadow: focusedField === 'username' ? '0 0 20px rgba(212, 175, 55, 0.2)' : 'none'
                      }}
                      placeholder={t('enterUsername')}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-amber-500/80 tracking-wider uppercase">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500/50" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-12 pr-4 py-4 rounded-xl text-white text-sm transition-all duration-300 outline-none"
                      style={{
                        background: 'rgba(30,30,40,0.8)',
                        border: focusedField === 'password' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.2)',
                        boxShadow: focusedField === 'password' ? '0 0 20px rgba(212, 175, 55, 0.2)' : 'none'
                      }}
                      placeholder={t('enterPassword')}
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-xl font-bold text-base tracking-wider transition-all duration-300 disabled:opacity-50 relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #aa8c2c 100%)',
                    color: '#0a0a0f',
                    boxShadow: '0 10px 30px rgba(212, 175, 55, 0.4)'
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                      animation: 'shimmer 2s linear infinite'
                    }}
                  />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      i18n.language === 'zh' ? '立即登录' : 'LOGIN'
                    )}
                  </span>
                </motion.button>
              </form>

              {/* Decorative suits */}
              <div className="flex justify-center gap-4 mt-6">
                {['♠', '♥', '♣', '♦'].map((suit, i) => (
                  <motion.span
                    key={suit}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0.4, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="text-xl"
                    style={{ color: suit === '♥' || suit === '♦' ? '#dc2626' : '#d4af37' }}
                  >
                    {suit}
                  </motion.span>
                ))}
              </div>
            </motion.div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-center mt-6"
            >
              <p className="text-xs text-amber-500/40 tracking-wider">
                © 2025 JW {i18n.language === 'zh' ? '九贏百家' : 'JIU WIN BACCARAT'}
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Right side - Image area (visible on desktop) */}
        <div className="hidden lg:block lg:w-[55%] xl:w-[60%]" />
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        input::placeholder {
          color: rgba(212, 175, 55, 0.3);
        }
      `}</style>
    </div>
  );
}
