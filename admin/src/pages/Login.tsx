import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { User, Lock, Loader2, Shield, Globe } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

// Floating poker suit component
function FloatingPokerSuit({
  suit,
  initialX,
  initialY,
  delay
}: {
  suit: string;
  initialX: number;
  initialY: number;
  delay: number;
}) {
  const isRed = suit === '♥' || suit === '♦';

  return (
    <motion.div
      initial={{ opacity: 0, x: initialX, y: initialY }}
      animate={{
        opacity: [0, 0.15, 0.15, 0],
        y: [initialY, initialY - 100],
        rotate: [0, 15, -15, 0]
      }}
      transition={{
        duration: 8,
        delay,
        repeat: Infinity,
        ease: "easeInOut"
      }}
      className={`absolute text-4xl ${isRed ? 'text-red-800' : 'text-amber-700'} pointer-events-none select-none`}
      style={{ left: `${initialX}%` }}
    >
      {suit}
    </motion.div>
  );
}

// Art Deco corner decoration
function ArtDecoCorner({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const rotations = {
    'top-left': 'rotate-0',
    'top-right': 'rotate-90',
    'bottom-right': 'rotate-180',
    'bottom-left': '-rotate-90'
  };

  const positions = {
    'top-left': 'top-0 left-0',
    'top-right': 'top-0 right-0',
    'bottom-left': 'bottom-0 left-0',
    'bottom-right': 'bottom-0 right-0'
  };

  return (
    <div className={`absolute ${positions[position]} w-12 h-12 ${rotations[position]}`}>
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <path
          d="M0 0 L24 0 L24 4 L4 4 L4 24 L0 24 Z"
          fill="url(#goldGradient)"
        />
        <path
          d="M8 8 L20 8 L20 10 L10 10 L10 20 L8 20 Z"
          fill="url(#goldGradient)"
          opacity="0.6"
        />
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5d17a" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#a88a2a" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Decorative playing card
function DecorativeCard({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left';

  return (
    <motion.div
      initial={{ opacity: 0, x: isLeft ? -100 : 100, rotate: isLeft ? -30 : 30 }}
      animate={{ opacity: 1, x: 0, rotate: isLeft ? -15 : 15 }}
      transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
      className={`absolute ${isLeft ? '-left-16 -bottom-8' : '-right-16 -bottom-8'} w-24 h-36 hidden lg:block`}
    >
      <div className="relative w-full h-full">
        <div
          className="absolute inset-0 rounded-lg shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
            border: '2px solid rgba(212, 175, 55, 0.3)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Card pattern */}
          <div className="absolute inset-2 rounded border border-amber-700/20">
            <div className="absolute top-2 left-2 text-amber-500 text-lg font-bold">
              {isLeft ? '♠' : '♦'}
            </div>
            <div className="absolute bottom-2 right-2 text-amber-500 text-lg font-bold rotate-180">
              {isLeft ? '♠' : '♦'}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl ${isLeft ? 'text-amber-500' : 'text-red-700'}`}>
                {isLeft ? '♠' : '♦'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

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

  const pokerSuits = [
    { suit: '♠', x: 10, y: 20, delay: 0 },
    { suit: '♥', x: 85, y: 60, delay: 2 },
    { suit: '♣', x: 15, y: 70, delay: 4 },
    { suit: '♦', x: 90, y: 30, delay: 6 },
    { suit: '♠', x: 50, y: 80, delay: 1 },
    { suit: '♥', x: 75, y: 10, delay: 3 },
    { suit: '♣', x: 30, y: 40, delay: 5 },
    { suit: '♦', x: 60, y: 50, delay: 7 },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0a0a0f 100%)'
      }}
    >
      {/* Art Deco diamond pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30L30 0z' fill='none' stroke='%23d4af37' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Animated gold/red glow orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.3) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.08, 0.12, 0.08],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(139, 0, 0, 0.3) 0%, transparent 70%)' }}
      />
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.05, 0.1, 0.05],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 60%)' }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />

      {/* Floating poker suits */}
      {pokerSuits.map((poker, index) => (
        <FloatingPokerSuit
          key={index}
          suit={poker.suit}
          initialX={poker.x}
          initialY={poker.y}
          delay={poker.delay}
        />
      ))}

      {/* Main container */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* Decorative cards */}
        <DecorativeCard side="left" />
        <DecorativeCard side="right" />

        {/* Language switcher */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="absolute -top-14 right-0"
        >
          <button
            onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all duration-300"
            style={{
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              color: '#d4af37'
            }}
          >
            <Globe className="w-4 h-4" />
            {i18n.language === 'zh' ? 'English' : '中文'}
          </button>
        </motion.div>

        {/* Login card with glassmorphism */}
        <div
          className="relative rounded-2xl p-8 overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(20, 20, 30, 0.9) 0%, rgba(15, 15, 25, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            boxShadow: `
              0 25px 50px rgba(0, 0, 0, 0.5),
              inset 0 1px 0 rgba(255, 255, 255, 0.05),
              inset 0 0 60px rgba(212, 175, 55, 0.03)
            `
          }}
        >
          {/* Art Deco corners */}
          <ArtDecoCorner position="top-left" />
          <ArtDecoCorner position="top-right" />
          <ArtDecoCorner position="bottom-left" />
          <ArtDecoCorner position="bottom-right" />

          {/* Inner gold border glow */}
          <div
            className="absolute inset-[1px] rounded-2xl pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, transparent 50%, rgba(212, 175, 55, 0.05) 100%)'
            }}
          />

          {/* Header with shield logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center mb-8 relative"
          >
            {/* Shield logo */}
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, #f5d17a 0%, #d4af37 50%, #a88a2a 100%)',
                  boxShadow: '0 10px 30px rgba(212, 175, 55, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.2)'
                }}
              />
              <div className="absolute inset-[3px] rounded-lg bg-gradient-to-br from-[#1a1a2e] to-[#12121a] flex items-center justify-center">
                <Shield className="w-8 h-8 text-amber-400" strokeWidth={1.5} />
              </div>
            </div>

            {/* Title with gold gradient */}
            <h1
              className="text-3xl font-bold mb-2 tracking-wider"
              style={{
                background: 'linear-gradient(135deg, #f5d17a 0%, #d4af37 50%, #f5d17a 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 40px rgba(212, 175, 55, 0.3)'
              }}
            >
              {i18n.language === 'zh' ? '管理后台' : 'ADMIN'}
            </h1>
            <p
              className="text-sm tracking-[0.15em]"
              style={{ color: 'rgba(212, 175, 55, 0.6)' }}
            >
              {i18n.language === 'zh' ? '百家乐管理控制台' : 'Management Console'}
            </p>
          </motion.div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 relative">
            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl text-sm"
                style={{
                  background: 'rgba(139, 0, 0, 0.2)',
                  border: '1px solid rgba(139, 0, 0, 0.4)',
                  color: '#ff6b6b'
                }}
              >
                {error}
              </motion.div>
            )}

            {/* Username field */}
            <div>
              <label
                className="block text-sm font-medium mb-2 tracking-wide"
                style={{ color: '#d4af37' }}
              >
                {t('username')}
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <User className="w-5 h-5" style={{ color: '#d4af37' }} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg transition-all duration-300 outline-none text-base"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.95) 0%, rgba(15, 15, 28, 0.98) 100%)',
                    border: '2px solid rgba(212, 175, 55, 0.4)',
                    color: '#ffffff',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(212, 175, 55, 0.1)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#d4af37';
                    e.target.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                    e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(212, 175, 55, 0.1)';
                  }}
                  placeholder={t('username')}
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                className="block text-sm font-medium mb-2 tracking-wide"
                style={{ color: '#d4af37' }}
              >
                {t('password')}
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Lock className="w-5 h-5" style={{ color: '#d4af37' }} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-lg transition-all duration-300 outline-none text-base"
                  style={{
                    background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.95) 0%, rgba(15, 15, 28, 0.98) 100%)',
                    border: '2px solid rgba(212, 175, 55, 0.4)',
                    color: '#ffffff',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(212, 175, 55, 0.1)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#d4af37';
                    e.target.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.3)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)';
                    e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(212, 175, 55, 0.1)';
                  }}
                  placeholder={t('password')}
                  required
                />
              </div>
            </div>

            {/* Login button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 rounded-lg font-bold text-lg tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-8 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #f5d17a 0%, #d4af37 40%, #b8960c 100%)',
                color: '#0a0a0f',
                border: '2px solid #f5d17a',
                boxShadow: '0 8px 32px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -2px 0 rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(212, 175, 55, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.4), inset 0 -2px 0 rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ffe066 0%, #f5d17a 40%, #d4af37 100%)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 8px 32px rgba(212, 175, 55, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 -2px 0 rgba(0, 0, 0, 0.1)';
                e.currentTarget.style.background = 'linear-gradient(135deg, #f5d17a 0%, #d4af37 40%, #b8960c 100%)';
              }}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin inline-block" />
              ) : (
                t('login')
              )}
            </motion.button>
          </form>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8"
        >
          <p
            className="text-xs tracking-wider"
            style={{ color: 'rgba(212, 175, 55, 0.4)' }}
          >
            © 2025 百家乐管理系统
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'rgba(255, 255, 255, 0.2)' }}
          >
            尊享游戏管理平台
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
