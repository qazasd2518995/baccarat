import { useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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

      {/* Gradient overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5, 5, 8, 0.4) 50%, rgba(5, 5, 8, 0.8) 100%)'
        }}
      />

      {/* Animated gold accent lines */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }}
      />
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
        className="absolute bottom-0 left-0 right-0 h-[1px]"
        style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }}
      />

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-3 sm:p-4">
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Language Switcher */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute -top-12 sm:-top-16 right-0"
          >
            <button
              onClick={toggleLanguage}
              className="group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-500"
              style={{
                background: 'rgba(212, 175, 55, 0.1)',
                border: '1px solid rgba(212, 175, 55, 0.3)',
                color: '#d4af37',
                backdropFilter: 'blur(10px)'
              }}
            >
              <span className="w-5 h-5 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </span>
              <span className="group-hover:tracking-wider transition-all duration-300">
                {i18n.language === 'zh' ? 'English' : '中文'}
              </span>
            </button>
          </motion.div>

          {/* Login Card */}
          <div
            className="relative rounded-2xl sm:rounded-3xl p-5 sm:p-10 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 15, 25, 0.85) 0%, rgba(10, 10, 18, 0.95) 100%)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              boxShadow: `
                0 50px 100px rgba(0, 0, 0, 0.5),
                0 0 0 1px rgba(212, 175, 55, 0.1) inset,
                0 0 100px rgba(212, 175, 55, 0.05) inset
              `
            }}
          >
            {/* Decorative corner accents */}
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner) => (
              <div
                key={corner}
                className={`absolute w-16 h-16 ${corner.includes('top') ? 'top-0' : 'bottom-0'} ${corner.includes('left') ? 'left-0' : 'right-0'}`}
                style={{
                  background: `linear-gradient(${corner === 'top-left' ? '135deg' : corner === 'top-right' ? '225deg' : corner === 'bottom-left' ? '45deg' : '315deg'}, rgba(212, 175, 55, 0.3) 0%, transparent 50%)`,
                }}
              />
            ))}

            {/* Animated border glow */}
            <motion.div
              animate={{
                boxShadow: [
                  '0 0 20px rgba(212, 175, 55, 0.1)',
                  '0 0 40px rgba(212, 175, 55, 0.2)',
                  '0 0 20px rgba(212, 175, 55, 0.1)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-3xl pointer-events-none"
            />

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-center mb-5 sm:mb-10 relative"
            >
              {/* Spade Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.4, duration: 0.8, type: "spring" }}
                className="w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 relative"
              >
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #aa8c2c 100%)',
                    boxShadow: '0 10px 40px rgba(212, 175, 55, 0.4)'
                  }}
                />
                <div className="absolute inset-[2px] sm:inset-[3px] rounded-lg sm:rounded-xl bg-gradient-to-br from-[#12121f] to-[#0a0a12] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 sm:w-10 sm:h-10" fill="#ffd700">
                    <path d="M12 2C9.5 5 6 7 6 11c0 2.5 1.5 4.5 3.5 5.5-.5 1-1.5 2-3 2.5H12h5.5c-1.5-.5-2.5-1.5-3-2.5C16.5 15.5 18 13.5 18 11c0-4-3.5-6-6-9z" />
                  </svg>
                </div>
                <div className="absolute -inset-4 rounded-3xl opacity-50 blur-xl" style={{ background: 'radial-gradient(circle, rgba(212, 175, 55, 0.4) 0%, transparent 70%)' }} />
              </motion.div>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="casino-display text-2xl sm:text-4xl font-bold mb-2 sm:mb-3"
                style={{
                  background: 'linear-gradient(135deg, #ffd700 0%, #f5d17a 25%, #d4af37 50%, #f5d17a 75%, #ffd700 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: 'shimmer 3s linear infinite',
                }}
              >
                {i18n.language === 'zh' ? '皇家百家乐' : 'ROYAL BACCARAT'}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.3em] uppercase"
                style={{ color: 'rgba(212, 175, 55, 0.6)' }}
              >
                {i18n.language === 'zh' ? '尊贵游戏体验' : 'Premium Gaming Experience'}
              </motion.p>

              {/* Decorative line */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="mt-4 sm:mt-6 h-[1px] mx-auto w-24 sm:w-32"
                style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }}
              />
            </motion.div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-xl text-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.3) 0%, rgba(100, 0, 0, 0.2) 100%)',
                    border: '1px solid rgba(255, 100, 100, 0.3)',
                    color: '#ff8080'
                  }}
                >
                  {error}
                </motion.div>
              )}

              {/* Username field */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <label
                  className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 tracking-wider"
                  style={{ color: '#d4af37' }}
                >
                  {t('username')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    className="login-input w-full px-4 py-3 sm:px-5 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-500 outline-none text-sm sm:text-base"
                    style={{
                      background: focusedField === 'username'
                        ? 'linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 35, 0.98) 100%)'
                        : 'linear-gradient(135deg, rgba(20, 20, 35, 0.9) 0%, rgba(15, 15, 28, 0.95) 100%)',
                      border: focusedField === 'username' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.3)',
                      color: '#ffffff',
                      boxShadow: focusedField === 'username'
                        ? '0 0 30px rgba(212, 175, 55, 0.2), inset 0 0 20px rgba(212, 175, 55, 0.05)'
                        : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                    }}
                    placeholder={t('enterUsername')}
                    required
                  />
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: focusedField === 'username' ? 1 : 0 }}
                    className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
                    style={{ background: 'linear-gradient(90deg, #d4af37, #ffd700, #d4af37)' }}
                  />
                </div>
              </motion.div>

              {/* Password field */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label
                  className="block text-xs sm:text-sm font-medium mb-2 sm:mb-3 tracking-wider"
                  style={{ color: '#d4af37' }}
                >
                  {t('password')}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="login-input w-full px-4 py-3 sm:px-5 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-500 outline-none text-sm sm:text-base"
                    style={{
                      background: focusedField === 'password'
                        ? 'linear-gradient(135deg, rgba(30, 30, 50, 0.95) 0%, rgba(20, 20, 35, 0.98) 100%)'
                        : 'linear-gradient(135deg, rgba(20, 20, 35, 0.9) 0%, rgba(15, 15, 28, 0.95) 100%)',
                      border: focusedField === 'password' ? '2px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.3)',
                      color: '#ffffff',
                      boxShadow: focusedField === 'password'
                        ? '0 0 30px rgba(212, 175, 55, 0.2), inset 0 0 20px rgba(212, 175, 55, 0.05)'
                        : 'inset 0 2px 4px rgba(0, 0, 0, 0.3)'
                    }}
                    placeholder={t('enterPassword')}
                    required
                  />
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: focusedField === 'password' ? 1 : 0 }}
                    className="absolute bottom-0 left-0 right-0 h-[2px] origin-left"
                    style={{ background: 'linear-gradient(90deg, #d4af37, #ffd700, #d4af37)' }}
                  />
                </div>
              </motion.div>

              {/* Login button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="pt-2 sm:pt-4"
              >
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 sm:py-5 rounded-lg sm:rounded-xl font-bold text-base sm:text-lg tracking-widest transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  style={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 50%, #aa8c2c 100%)',
                    color: '#0a0a0f',
                    boxShadow: '0 10px 40px rgba(212, 175, 55, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                      animation: 'shimmer 2s linear infinite'
                    }}
                  />
                  <span className="relative z-10">
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin inline-block" />
                    ) : (
                      i18n.language === 'zh' ? '立即登录' : 'LOGIN'
                    )}
                  </span>
                </motion.button>
              </motion.div>
            </form>

            {/* Bottom decoration */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-4 sm:mt-8 flex justify-center gap-3 sm:gap-4"
            >
              {['♠', '♥', '♣', '♦'].map((suit, i) => (
                <motion.span
                  key={suit}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.4, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.1 }}
                  className="text-xl sm:text-2xl"
                  style={{ color: suit === '♥' || suit === '♦' ? '#8b0000' : '#d4af37' }}
                >
                  {suit}
                </motion.span>
              ))}
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center mt-4 sm:mt-8"
          >
            <p className="text-xs tracking-widest" style={{ color: 'rgba(212, 175, 55, 0.4)' }}>
              © 2025 {i18n.language === 'zh' ? '皇家游戏 · 尊贵百家乐' : 'ROYAL GAMING · PREMIUM BACCARAT'}
            </p>
            <p className="text-xs mt-2" style={{ color: 'rgba(255, 255, 255, 0.2)' }}>
              {i18n.language === 'zh' ? '奢华 · 刺激 · 公平' : 'LUXURY · THRILL · FAIR'}
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Global styles */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&family=Playfair+Display:wght@400;700&display=swap');

        input::placeholder {
          color: rgba(212, 175, 55, 0.3);
        }
      `}</style>
    </div>
  );
}
