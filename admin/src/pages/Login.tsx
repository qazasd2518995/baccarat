import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, User, Lock, Shield, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

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
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Premium Dark Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 100% 80% at 20% 50%, rgba(139,69,19,0.12) 0%, transparent 50%),
            radial-gradient(ellipse 80% 100% at 80% 80%, rgba(212,175,55,0.06) 0%, transparent 40%),
            linear-gradient(135deg, #08080c 0%, #0f0f18 50%, #08080c 100%)
          `
        }}
      />

      {/* Subtle Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 5L24 12L32 12L26 18L28 26L20 22L12 26L14 18L8 12L16 12Z' fill='%23d4af37'/%3E%3C/svg%3E")`,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Animated Accent Lines */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          initial={{ x: '200%' }}
          animate={{ x: '-100%' }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute top-[25%] left-0 w-[60%] h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.3), transparent)' }}
        />
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-[35%] left-0 w-[50%] h-[1px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)' }}
        />
      </div>

      {/* Border Lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #d4af37 50%, transparent)' }} />
      </div>

      {/* Model Image - Desktop only */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="hidden lg:block absolute left-[5%] bottom-0 pointer-events-none"
        style={{ zIndex: 5 }}
      >
        <img
          src="/login-model.png"
          alt=""
          className="h-[85vh] w-auto object-contain object-bottom"
          style={{
            filter: 'drop-shadow(0 0 50px rgba(212,175,55,0.15))',
            maskImage: 'linear-gradient(to top, black 75%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 75%, transparent 100%)'
          }}
        />
      </motion.div>

      {/* Language Switcher */}
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
            background: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
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

      {/* Main Content - Right aligned */}
      <div className="relative z-10 min-h-screen flex items-center justify-end px-6 sm:px-8 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-sm lg:max-w-md lg:mr-[5%]"
        >
          {/* Logo & Brand */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center lg:text-right mb-6"
          >
            {/* Shield Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 mb-3 relative"
            >
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #aa8c2c 100%)',
                  boxShadow: '0 8px 30px rgba(212, 175, 55, 0.4)'
                }}
              />
              <div className="absolute inset-[2px] rounded-lg bg-[#0a0a12] flex items-center justify-center">
                <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-amber-400" strokeWidth={1.5} />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
              <span
                className="text-3xl sm:text-4xl font-black"
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
              className="text-xs tracking-[0.2em] text-amber-500/60 uppercase"
            >
              {i18n.language === 'zh' ? '代理后台管理' : 'Agent Console'}
            </motion.p>
          </motion.div>

          {/* Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative p-5 sm:p-6 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(15,15,22,0.95) 0%, rgba(8,8,12,0.98) 100%)',
              border: '1px solid rgba(212, 175, 55, 0.15)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)'
            }}
          >
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-amber-500/30 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-amber-500/30 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-amber-500/30 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-amber-500/30 rounded-br-xl" />

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 rounded-lg text-xs sm:text-sm text-center"
                  style={{
                    background: 'rgba(220, 38, 38, 0.1)',
                    border: '1px solid rgba(220, 38, 38, 0.25)',
                    color: '#fca5a5'
                  }}
                >
                  {error}
                </motion.div>
              )}

              {/* Username */}
              <div>
                <label className="block text-[10px] sm:text-xs font-medium mb-1.5 text-amber-500/70 tracking-wider uppercase">
                  {t('username')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-10 pr-3 py-3 rounded-lg text-white text-sm transition-all duration-300 outline-none"
                    style={{
                      background: 'rgba(20,20,30,0.8)',
                      border: focusedField === 'username' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.12)',
                      boxShadow: focusedField === 'username' ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none'
                    }}
                    placeholder={i18n.language === 'zh' ? '请输入用户名' : 'Enter username'}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] sm:text-xs font-medium mb-1.5 text-amber-500/70 tracking-wider uppercase">
                  {t('password')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full pl-10 pr-3 py-3 rounded-lg text-white text-sm transition-all duration-300 outline-none"
                    style={{
                      background: 'rgba(20,20,30,0.8)',
                      border: focusedField === 'password' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.12)',
                      boxShadow: focusedField === 'password' ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none'
                    }}
                    placeholder={i18n.language === 'zh' ? '请输入密码' : 'Enter password'}
                    required
                  />
                </div>
              </div>

              {/* Captcha */}
              <div>
                <label className="block text-[10px] sm:text-xs font-medium mb-1.5 text-amber-500/70 tracking-wider uppercase">
                  {i18n.language === 'zh' ? '验证码' : 'Captcha'}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={captcha}
                      onChange={(e) => setCaptcha(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      onFocus={() => setFocusedField('captcha')}
                      onBlur={() => setFocusedField(null)}
                      maxLength={4}
                      className="w-full px-3 py-3 rounded-lg text-white text-sm text-center tracking-[0.4em] transition-all duration-300 outline-none"
                      style={{
                        background: 'rgba(20,20,30,0.8)',
                        border: focusedField === 'captcha' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.12)',
                        boxShadow: focusedField === 'captcha' ? '0 0 15px rgba(212, 175, 55, 0.1)' : 'none'
                      }}
                      placeholder="• • • •"
                      required
                    />
                  </div>
                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    onClick={refreshCaptcha}
                    className="flex items-center justify-center gap-1.5 px-3 rounded-lg cursor-pointer select-none"
                    style={{
                      background: 'rgba(20,20,30,0.8)',
                      border: '2px solid rgba(212, 175, 55, 0.12)',
                      minWidth: '80px'
                    }}
                  >
                    <div className="flex">
                      {captchaCode.split('').map((digit, i) => (
                        <span
                          key={i}
                          className="text-lg font-bold text-amber-400"
                          style={{
                            transform: `rotate(${(i - 1.5) * 5}deg)`,
                            textShadow: '0 0 6px rgba(212,175,55,0.4)'
                          }}
                        >
                          {digit}
                        </span>
                      ))}
                    </div>
                    <RefreshCw className="w-3.5 h-3.5 text-amber-500/40" />
                  </motion.div>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02, boxShadow: '0 12px 35px rgba(212, 175, 55, 0.35)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-lg font-bold text-sm tracking-wider transition-all duration-300 disabled:opacity-50 relative overflow-hidden group mt-1"
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #aa8c2c 100%)',
                  color: '#0a0a0f',
                  boxShadow: '0 8px 25px rgba(212, 175, 55, 0.3)'
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    animation: 'shimmer 2s linear infinite'
                  }}
                />
                <span className="relative z-10">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (i18n.language === 'zh' ? '立即登录' : 'LOGIN')}
                </span>
              </motion.button>
            </form>

            {/* Suits */}
            <div className="flex justify-center gap-3 mt-4">
              {['♠', '♥', '♣', '♦'].map((suit, i) => (
                <motion.span
                  key={suit}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.4, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  className="text-base"
                  style={{ color: suit === '♥' || suit === '♦' ? '#dc2626' : '#d4af37' }}
                >
                  {suit}
                </motion.span>
              ))}
            </div>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-center lg:text-right mt-5 text-[10px] sm:text-xs text-amber-500/35 tracking-wider"
          >
            © 2025 JW {i18n.language === 'zh' ? '九贏百家 · 代理系统' : 'JIU WIN · Agent System'}
          </motion.p>
        </motion.div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        input::placeholder { color: rgba(212, 175, 55, 0.2); }
      `}</style>
    </div>
  );
}
