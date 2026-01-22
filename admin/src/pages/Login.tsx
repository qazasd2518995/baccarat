import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Eye, EyeOff, User, Lock, Sparkles } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial, Environment, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';

// 3D Poker Chip Component
function PokerChip({ position, color, delay = 0 }: { position: [number, number, number]; color: string; delay?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5 + delay) * 0.2;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
      <mesh ref={meshRef} position={position}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 32]} />
        <meshStandardMaterial
          color={color}
          metalness={0.8}
          roughness={0.2}
          emissive={color}
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh position={position}>
        <torusGeometry args={[0.5, 0.05, 8, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
      </mesh>
    </Float>
  );
}

// 3D Playing Card Component
function PlayingCard({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.3 + rotation[1];
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
  });

  return (
    <group ref={meshRef} position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.7, 1, 0.02]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[0.65, 0.95]} />
        <meshStandardMaterial color="#0d0d15" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Gold Particles System
function GoldParticles({ count = 200 }) {
  const points = useRef<THREE.Points>(null);

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.02;
      points.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  const bufferRef = useRef<THREE.BufferAttribute>(null);

  return (
    <points ref={points}>
      <bufferGeometry>
        <primitive
          ref={bufferRef}
          attach="attributes-position"
          object={new THREE.BufferAttribute(particlesPosition, 3)}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#ffd700"
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

// Floating Diamond
function FloatingDiamond({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={1} floatIntensity={1}>
      <mesh ref={meshRef} position={position}>
        <octahedronGeometry args={[0.3, 0]} />
        <MeshTransmissionMaterial
          backside
          samples={4}
          thickness={0.5}
          chromaticAberration={0.2}
          anisotropy={0.3}
          distortion={0.5}
          distortionScale={0.5}
          temporalDistortion={0.1}
          iridescence={1}
          iridescenceIOR={1}
          iridescenceThicknessRange={[0, 1400]}
          color="#ffd700"
        />
      </mesh>
    </Float>
  );
}

// Glowing Ring
function GlowingRing({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5;
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <torusGeometry args={[1, 0.02, 16, 100]} />
      <meshStandardMaterial
        color="#d4af37"
        emissive="#d4af37"
        emissiveIntensity={2}
        metalness={1}
        roughness={0}
      />
    </mesh>
  );
}

// 3D Scene
function Scene() {
  return (
    <>
      <Environment preset="night" />
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />

      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} color="#ffd700" />
      <pointLight position={[-10, -10, -5]} intensity={0.3} color="#8b0000" />
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#d4af37" />

      <PokerChip position={[-4, 2, -3]} color="#d4af37" delay={0} />
      <PokerChip position={[4, -1, -4]} color="#8b0000" delay={1} />
      <PokerChip position={[-3, -2, -2]} color="#1a1a2e" delay={2} />
      <PokerChip position={[3, 3, -5]} color="#d4af37" delay={0.5} />
      <PokerChip position={[5, 0, -3]} color="#8b0000" delay={1.5} />

      <PlayingCard position={[-5, 0, -4]} rotation={[0.2, 0.5, 0.1]} />
      <PlayingCard position={[5, 2, -5]} rotation={[-0.1, -0.3, 0.2]} />
      <PlayingCard position={[0, -3, -6]} rotation={[0.1, 0.8, -0.1]} />

      <FloatingDiamond position={[-2, 1, -2]} />
      <FloatingDiamond position={[2, -1, -3]} />
      <FloatingDiamond position={[0, 2, -4]} />

      <GlowingRing position={[0, 0, -8]} scale={3} />
      <GlowingRing position={[-3, 2, -6]} scale={1.5} />
      <GlowingRing position={[3, -2, -7]} scale={2} />

      <GoldParticles count={300} />
    </>
  );
}

// Luxury Input Component
function LuxuryInput({
  type,
  value,
  onChange,
  placeholder,
  icon: Icon,
  showPasswordToggle,
  showPassword,
  onTogglePassword
}: {
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ElementType;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Outer glow container */}
      <div
        className="relative rounded-2xl p-[1px] transition-all duration-500"
        style={{
          background: isFocused
            ? 'linear-gradient(135deg, #d4af37 0%, #f5d17a 50%, #d4af37 100%)'
            : 'linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(212, 175, 55, 0.1) 100%)',
          boxShadow: isFocused
            ? '0 0 30px rgba(212, 175, 55, 0.3), 0 0 60px rgba(212, 175, 55, 0.1)'
            : 'none'
        }}
      >
        {/* Inner container */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.95) 0%, rgba(10, 10, 18, 0.98) 100%)'
          }}
        >
          {/* Shimmer effect on focus */}
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 w-1/2"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.1), transparent)'
                }}
              />
            )}
          </AnimatePresence>

          {/* Input wrapper */}
          <div className="relative flex items-center">
            {/* Icon */}
            <div
              className="absolute left-5 transition-all duration-300"
              style={{
                color: isFocused ? '#d4af37' : 'rgba(212, 175, 55, 0.4)'
              }}
            >
              <Icon className="w-5 h-5" strokeWidth={1.5} />
            </div>

            {/* Input */}
            <input
              type={showPasswordToggle ? (showPassword ? 'text' : 'password') : type}
              value={value}
              onChange={onChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              required
              className="w-full bg-transparent text-white text-base py-5 pl-14 pr-14 outline-none placeholder-gold-muted"
              style={{
                fontFamily: "'Noto Sans SC', sans-serif",
                letterSpacing: '0.5px'
              }}
            />

            {/* Password toggle */}
            {showPasswordToggle && (
              <button
                type="button"
                onClick={onTogglePassword}
                className="absolute right-5 p-1 transition-all duration-300 hover:scale-110"
                style={{ color: 'rgba(212, 175, 55, 0.5)' }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute -bottom-[1px] left-1/2 h-[2px] -translate-x-1/2"
        initial={{ width: 0 }}
        animate={{ width: isFocused ? '60%' : '0%' }}
        transition={{ duration: 0.3 }}
        style={{
          background: 'linear-gradient(90deg, transparent, #ffd700, transparent)'
        }}
      />
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
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await authApi.login(username, password);

      if (data.user.role === 'member') {
        setError(i18n.language === 'zh' ? '访问被拒绝。需要管理员或代理权限。' : 'Access denied. Admin or Agent role required.');
        setLoading(false);
        return;
      }

      setAuth(data.user, data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || (i18n.language === 'zh' ? '登录失败' : 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden" style={{ background: '#050508' }}>
      {/* Three.js Canvas Background */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 75 }}
          gl={{ antialias: true, alpha: true }}
        >
          <Scene />
        </Canvas>
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5, 5, 8, 0.3) 50%, rgba(5, 5, 8, 0.7) 100%)'
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[480px]"
        >
          {/* Language Switcher */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
            className="absolute -top-14 right-0 px-5 py-2 text-xs font-medium tracking-widest uppercase transition-all duration-300 rounded-full hover:bg-white/5"
            style={{
              color: 'rgba(212, 175, 55, 0.7)',
              border: '1px solid rgba(212, 175, 55, 0.2)'
            }}
          >
            {i18n.language === 'zh' ? 'English' : '中文'}
          </motion.button>

          {/* Main Card */}
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(18, 18, 30, 0.9) 0%, rgba(10, 10, 18, 0.95) 100%)',
              borderRadius: '32px',
              border: '1px solid rgba(212, 175, 55, 0.15)',
              boxShadow: `
                0 50px 100px -30px rgba(0, 0, 0, 0.8),
                0 0 0 1px rgba(212, 175, 55, 0.1) inset,
                0 0 80px rgba(212, 175, 55, 0.03) inset
              `
            }}
          >
            {/* Top decorative border */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-amber-500/20 rounded-tl-[32px]" />
            <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2 border-amber-500/20 rounded-tr-[32px]" />
            <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2 border-amber-500/20 rounded-bl-[32px]" />
            <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-amber-500/20 rounded-br-[32px]" />

            {/* Card Content */}
            <div className="px-12 py-14">
              {/* Logo Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-center mb-12"
              >
                {/* Animated Crown/Diamond Logo */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.3, duration: 0.8, type: 'spring', stiffness: 200 }}
                  className="relative w-24 h-24 mx-auto mb-8"
                >
                  {/* Outer ring */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderTopColor: '#d4af37'
                    }}
                  />

                  {/* Inner glow */}
                  <div
                    className="absolute inset-2 rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)'
                    }}
                  />

                  {/* Center icon container */}
                  <div
                    className="absolute inset-4 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      boxShadow: '0 0 40px rgba(212, 175, 55, 0.2) inset'
                    }}
                  >
                    <Sparkles className="w-8 h-8 text-amber-400" strokeWidth={1.5} />
                  </div>

                  {/* Pulse effect */}
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 0, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full"
                    style={{ border: '1px solid rgba(212, 175, 55, 0.5)' }}
                  />
                </motion.div>

                {/* Title */}
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl font-bold mb-3 tracking-wide"
                  style={{
                    fontFamily: "'Noto Serif SC', serif",
                    background: 'linear-gradient(135deg, #ffd700 0%, #f5d17a 30%, #d4af37 60%, #ffd700 100%)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'shimmer 4s ease-in-out infinite'
                  }}
                >
                  {i18n.language === 'zh' ? '尊贵管理系统' : 'Royal Admin'}
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm tracking-[0.25em] uppercase"
                  style={{ color: 'rgba(212, 175, 55, 0.5)' }}
                >
                  {i18n.language === 'zh' ? '百家乐后台管理' : 'Baccarat Management'}
                </motion.p>

                {/* Decorative line */}
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                  className="mt-6 h-[1px] mx-auto w-20"
                  style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }}
                />
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="px-5 py-4 rounded-2xl text-sm text-center overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.05) 100%)',
                        border: '1px solid rgba(220, 38, 38, 0.3)',
                        color: '#fca5a5'
                      }}
                    >
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Username Field */}
                <div>
                  <label
                    className="block text-xs font-medium mb-3 tracking-[0.2em] uppercase"
                    style={{ color: 'rgba(212, 175, 55, 0.6)' }}
                  >
                    {t('username')}
                  </label>
                  <LuxuryInput
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={i18n.language === 'zh' ? '请输入用户名' : 'Enter username'}
                    icon={User}
                  />
                </div>

                {/* Password Field */}
                <div>
                  <label
                    className="block text-xs font-medium mb-3 tracking-[0.2em] uppercase"
                    style={{ color: 'rgba(212, 175, 55, 0.6)' }}
                  >
                    {t('password')}
                  </label>
                  <LuxuryInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={i18n.language === 'zh' ? '请输入密码' : 'Enter password'}
                    icon={Lock}
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                  />
                </div>

                {/* Login Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="pt-6"
                >
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative w-full py-5 rounded-2xl font-bold text-base tracking-[0.15em] uppercase transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, #d4af37 0%, #f5d17a 25%, #d4af37 50%, #aa8c2c 100%)',
                      color: '#0a0a0f',
                      boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                    }}
                  >
                    {/* Animated shine effect */}
                    <motion.div
                      className="absolute inset-0"
                      initial={{ x: '-100%' }}
                      whileHover={{ x: '100%' }}
                      transition={{ duration: 0.6 }}
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)'
                      }}
                    />

                    {/* Button content */}
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
                            {i18n.language === 'zh' ? '立即登录' : 'Sign In'}
                          </span>
                          <motion.span
                            animate={{ x: [0, 4, 0] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            →
                          </motion.span>
                        </>
                      )}
                    </span>

                    {/* Bottom highlight */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[1px]"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent)' }}
                    />
                  </motion.button>
                </motion.div>
              </form>
            </div>

            {/* Footer Section */}
            <div
              className="px-12 py-6 text-center"
              style={{
                background: 'linear-gradient(180deg, transparent 0%, rgba(212, 175, 55, 0.02) 100%)',
                borderTop: '1px solid rgba(212, 175, 55, 0.1)'
              }}
            >
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-amber-500/30" />
                <p className="text-xs tracking-widest" style={{ color: 'rgba(212, 175, 55, 0.4)' }}>
                  {i18n.language === 'zh' ? '安全加密 · 尊享体验' : 'Secure · Premium'}
                </p>
                <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-amber-500/30" />
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-8 text-xs tracking-wider"
            style={{ color: 'rgba(255, 255, 255, 0.15)' }}
          >
            © 2025 Royal Baccarat System
          </motion.p>
        </motion.div>
      </div>

      {/* Global Styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;700&display=swap');

        @keyframes shimmer {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 200% center; }
        }

        input::placeholder {
          color: rgba(212, 175, 55, 0.25);
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-text-fill-color: #ffffff;
          -webkit-box-shadow: 0 0 0px 1000px rgba(15, 15, 25, 0.95) inset;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
    </div>
  );
}
