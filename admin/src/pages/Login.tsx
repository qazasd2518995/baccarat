import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, User, Lock, Shield, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

// Generate random 4-digit captcha
function generateCaptcha(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaCode, setCaptchaCode] = useState(generateCaptcha());
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptcha());
    setCaptcha('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!username || !password) {
      setError(i18n.language === 'zh' ? '请输入用户名和密码' : 'Please enter username and password');
      return;
    }

    // Validate captcha
    if (captcha !== captchaCode) {
      setError(i18n.language === 'zh' ? '验证码错误' : 'Invalid captcha');
      refreshCaptcha();
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      const { data } = await authApi.login(username, password);

      if (data.user.role === 'member') {
        setError(i18n.language === 'zh' ? '访问被拒绝。需要管理员或代理权限。' : 'Access denied. Admin or Agent role required.');
        setIsLoading(false);
        return;
      }

      setAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || (i18n.language === 'zh' ? '登录失败' : 'Login failed');
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
    <div className="min-h-screen w-full relative overflow-hidden bg-[#0a0a0f]">
      {/* Background Image - Casino Model */}
      <div className="absolute inset-0">
        <img
          src="/login-model.jpg"
          alt=""
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center 20%' }}
        />
        {/* Mobile: Bottom gradient */}
        <div
          className="absolute inset-0 lg:hidden"
          style={{
            background: `
              linear-gradient(to bottom,
                transparent 0%,
                transparent 25%,
                rgba(10,10,15,0.6) 45%,
                rgba(10,10,15,0.95) 65%,
                rgba(10,10,15,1) 100%
              )
            `
          }}
        />
        {/* Desktop: Right side gradient */}
        <div
          className="absolute inset-0 hidden lg:block"
          style={{
            background: `
              linear-gradient(to left, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.7) 30%, transparent 50%),
              linear-gradient(to top, rgba(10,10,15,0.6) 0%, transparent 40%)
            `
          }}
        />
      </div>

      {/* Decorative gold lines */}
      <div className="absolute inset-0 pointer-events-none z-20">
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)' }}
        />
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)' }}
        />
      </div>

      {/* Language Switcher - Fixed position */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-4 right-4 z-30"
      >
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 hover:scale-105"
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
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

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Mobile: Spacer to show image at top */}
        <div className="h-[30vh] sm:h-[35vh] lg:hidden flex-shrink-0" />

        {/* Desktop: Left side spacer (image area) */}
        <div className="hidden lg:block lg:w-[55%]" />

        {/* Form Container */}
        <div className="flex-1 lg:w-[45%] flex items-start lg:items-center justify-center px-5 py-5 sm:px-8 sm:py-6 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="w-full max-w-sm sm:max-w-md"
          >
            {/* Logo & Brand */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-5 sm:mb-6"
            >
              {/* Shield Icon for Admin */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-14 h-14 sm:w-18 sm:h-18 mb-3 relative"
              >
                <div
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #aa8c2c 100%)',
                    boxShadow: '0 8px 30px rgba(212, 175, 55, 0.5)'
                  }}
                />
                <div className="absolute inset-[2px] rounded-lg bg-[#0a0a12] flex items-center justify-center">
                  <Shield className="w-7 h-7 sm:w-9 sm:h-9 text-amber-400" strokeWidth={1.5} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mb-0.5"
              >
                <span
                  className="text-3xl sm:text-4xl font-black tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  JW
                </span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl sm:text-2xl font-bold mb-1"
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
                className="text-[10px] sm:text-xs tracking-[0.15em] sm:tracking-[0.2em] text-amber-500/60 uppercase"
              >
                {i18n.language === 'zh' ? '代理后台管理' : 'Agent Console'}
              </motion.p>
            </motion.div>

            {/* Login Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative p-4 sm:p-6 rounded-xl sm:rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(8,8,12,0.98) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
                backdropFilter: 'blur(20px)'
              }}
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-l-2 border-amber-500/50 rounded-tl-xl sm:rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 border-r-2 border-amber-500/50 rounded-tr-xl sm:rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-l-2 border-amber-500/50 rounded-bl-xl sm:rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 border-r-2 border-amber-500/50 rounded-br-xl sm:rounded-br-2xl" />

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2.5 sm:p-3 rounded-lg text-xs sm:text-sm text-center"
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
                  <label className="block text-[10px] sm:text-xs font-medium mb-1.5 text-amber-500/80 tracking-wider uppercase">
                    {t('username')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-amber-500/50" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setFocusedField('username')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-9 sm:pl-11 pr-3 py-2.5 sm:py-3 rounded-lg text-white text-sm transition-all duration-300 outline-none"
                      style={{
                        background: 'rgba(25,25,35,0.9)',
                        border: focusedField === 'username' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.2)',
                        boxShadow: focusedField === 'username' ? '0 0 15px rgba(212, 175, 55, 0.15)' : 'none'
                      }}
                      placeholder={i18n.language === 'zh' ? '请输入用户名' : 'Enter username'}
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium mb-1.5 text-amber-500/80 tracking-wider uppercase">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-amber-500/50" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className="w-full pl-9 sm:pl-11 pr-3 py-2.5 sm:py-3 rounded-lg text-white text-sm transition-all duration-300 outline-none"
                      style={{
                        background: 'rgba(25,25,35,0.9)',
                        border: focusedField === 'password' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.2)',
                        boxShadow: focusedField === 'password' ? '0 0 15px rgba(212, 175, 55, 0.15)' : 'none'
                      }}
                      placeholder={i18n.language === 'zh' ? '请输入密码' : 'Enter password'}
                      required
                    />
                  </div>
                </div>

                {/* Captcha */}
                <div>
                  <label className="block text-[10px] sm:text-xs font-medium mb-1.5 text-amber-500/80 tracking-wider uppercase">
                    {i18n.language === 'zh' ? '验证码' : 'Captcha'}
                  </label>
                  <div className="flex gap-2 sm:gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={captcha}
                        onChange={(e) => setCaptcha(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        onFocus={() => setFocusedField('captcha')}
                        onBlur={() => setFocusedField(null)}
                        maxLength={4}
                        className="w-full px-3 py-2.5 sm:py-3 rounded-lg text-white text-sm text-center tracking-[0.4em] sm:tracking-[0.5em] transition-all duration-300 outline-none"
                        style={{
                          background: 'rgba(25,25,35,0.9)',
                          border: focusedField === 'captcha' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.2)',
                          boxShadow: focusedField === 'captcha' ? '0 0 15px rgba(212, 175, 55, 0.15)' : 'none'
                        }}
                        placeholder="• • • •"
                        required
                      />
                    </div>
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      onClick={refreshCaptcha}
                      className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 rounded-lg cursor-pointer select-none"
                      style={{
                        background: 'rgba(25,25,35,0.9)',
                        border: '2px solid rgba(212, 175, 55, 0.2)',
                        minWidth: '85px'
                      }}
                    >
                      <div className="flex">
                        {captchaCode.split('').map((digit, i) => (
                          <span
                            key={i}
                            className="text-base sm:text-xl font-bold text-amber-400"
                            style={{
                              transform: `rotate(${(i - 1.5) * 6}deg)`,
                              textShadow: '0 0 8px rgba(212,175,55,0.5)'
                            }}
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                      <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500/50" />
                    </motion.div>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base tracking-wider transition-all duration-300 disabled:opacity-50 relative overflow-hidden group mt-1"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #aa8c2c 100%)',
                    color: '#0a0a0f',
                    boxShadow: '0 8px 25px rgba(212, 175, 55, 0.4)'
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
              <div className="flex justify-center gap-2.5 sm:gap-3 mt-3 sm:mt-4">
                {['♠', '♥', '♣', '♦'].map((suit, i) => (
                  <motion.span
                    key={suit}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0.4, y: 0 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="text-base sm:text-lg"
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
              transition={{ delay: 0.8 }}
              className="text-center mt-4 sm:mt-5"
            >
              <p className="text-[10px] sm:text-xs text-amber-500/40 tracking-wider">
                © 2025 JW {i18n.language === 'zh' ? '九贏百家 · 代理系统' : 'JIU WIN · Agent System'}
              </p>
            </motion.div>
          </motion.div>
        </div>
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
