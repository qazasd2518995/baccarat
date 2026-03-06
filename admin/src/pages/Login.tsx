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
          style={{ objectPosition: '50% 20%' }}
        />
        {/* Gradient overlays for readability */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to left, rgba(10,10,15,0.9) 0%, rgba(10,10,15,0.6) 35%, transparent 55%),
              linear-gradient(to top, rgba(10,10,15,0.8) 0%, transparent 50%)
            `
          }}
        />
      </div>

      {/* Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top gold line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)' }}
        />
        {/* Bottom gold line */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 h-[2px]"
          style={{ background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)' }}
        />
        {/* Vertical accent line */}
        <motion.div
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute right-[45%] top-0 bottom-0 w-[1px] hidden lg:block"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(212,175,55,0.3) 30%, rgba(212,175,55,0.3) 70%, transparent)' }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex">
        {/* Left side - Image area (desktop) */}
        <div className="hidden lg:flex lg:w-[55%] xl:w-[55%] items-center justify-center">
          {/* Optional: Add decorative text or logo here */}
        </div>

        {/* Right side - Login Form */}
        <div className="w-full lg:w-[45%] xl:w-[45%] flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
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
              className="text-center mb-8"
            >
              {/* Shield Icon for Admin */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-20 h-20 lg:w-24 lg:h-24 mb-4 relative"
              >
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #aa8c2c 100%)',
                    boxShadow: '0 10px 40px rgba(212, 175, 55, 0.5)'
                  }}
                />
                <div className="absolute inset-[3px] rounded-xl bg-[#0a0a12] flex items-center justify-center">
                  <Shield className="w-10 h-10 lg:w-12 lg:h-12 text-amber-400" strokeWidth={1.5} />
                </div>
                <div className="absolute -inset-4 rounded-3xl opacity-40 blur-xl" style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.6) 0%, transparent 70%)' }} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mb-1"
              >
                <span
                  className="text-4xl lg:text-5xl font-black tracking-tight"
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
                className="text-2xl lg:text-3xl font-bold mb-2"
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
                className="text-sm tracking-[0.2em] text-amber-500/60 uppercase"
              >
                {i18n.language === 'zh' ? '代理后台管理' : 'Agent Console'}
              </motion.p>
            </motion.div>

            {/* Login Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative p-6 sm:p-8 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(15,15,20,0.95) 0%, rgba(8,8,12,0.98) 100%)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(212, 175, 55, 0.1) inset',
                backdropFilter: 'blur(20px)'
              }}
            >
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-amber-500/50 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-amber-500/50 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-amber-500/50 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-amber-500/50 rounded-br-2xl" />

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl text-sm text-center"
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
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white text-sm transition-all duration-300 outline-none"
                      style={{
                        background: 'rgba(25,25,35,0.9)',
                        border: focusedField === 'username' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.2)',
                        boxShadow: focusedField === 'username' ? '0 0 20px rgba(212, 175, 55, 0.15)' : 'none'
                      }}
                      placeholder={i18n.language === 'zh' ? '请输入用户名' : 'Enter username'}
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
                      className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white text-sm transition-all duration-300 outline-none"
                      style={{
                        background: 'rgba(25,25,35,0.9)',
                        border: focusedField === 'password' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.2)',
                        boxShadow: focusedField === 'password' ? '0 0 20px rgba(212, 175, 55, 0.15)' : 'none'
                      }}
                      placeholder={i18n.language === 'zh' ? '请输入密码' : 'Enter password'}
                      required
                    />
                  </div>
                </div>

                {/* Captcha */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-amber-500/80 tracking-wider uppercase">
                    {i18n.language === 'zh' ? '验证码' : 'Captcha'}
                  </label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={captcha}
                        onChange={(e) => setCaptcha(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        onFocus={() => setFocusedField('captcha')}
                        onBlur={() => setFocusedField(null)}
                        maxLength={4}
                        className="w-full px-4 py-3.5 rounded-xl text-white text-sm text-center tracking-[0.5em] transition-all duration-300 outline-none"
                        style={{
                          background: 'rgba(25,25,35,0.9)',
                          border: focusedField === 'captcha' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.2)',
                          boxShadow: focusedField === 'captcha' ? '0 0 20px rgba(212, 175, 55, 0.15)' : 'none'
                        }}
                        placeholder="• • • •"
                        required
                      />
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={refreshCaptcha}
                      className="flex items-center justify-center gap-2 px-4 rounded-xl cursor-pointer select-none"
                      style={{
                        background: 'rgba(25,25,35,0.9)',
                        border: '2px solid rgba(212, 175, 55, 0.2)',
                        minWidth: '100px'
                      }}
                    >
                      <div className="flex">
                        {captchaCode.split('').map((digit, i) => (
                          <span
                            key={i}
                            className="text-xl font-bold text-amber-400"
                            style={{
                              transform: `rotate(${(i - 1.5) * 8}deg)`,
                              textShadow: '0 0 10px rgba(212,175,55,0.5)'
                            }}
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                      <RefreshCw className="w-4 h-4 text-amber-500/50" />
                    </motion.div>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-xl font-bold text-base tracking-wider transition-all duration-300 disabled:opacity-50 relative overflow-hidden group mt-2"
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
              <div className="flex justify-center gap-3 mt-5">
                {['♠', '♥', '♣', '♦'].map((suit, i) => (
                  <motion.span
                    key={suit}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0.4, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="text-lg"
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
