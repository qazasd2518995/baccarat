import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Loader2, Crown, Eye, EyeOff } from 'lucide-react';
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
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-[420px]"
        >
          {/* Language Switcher - Top Right */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')}
            className="absolute -top-12 right-0 px-4 py-1.5 text-xs font-medium tracking-wider transition-all duration-300 hover:text-white"
            style={{ color: 'rgba(212, 175, 55, 0.7)' }}
          >
            {i18n.language === 'zh' ? 'ENGLISH' : '中文'}
          </motion.button>

          {/* Login Card - Refined Design */}
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(18, 18, 28, 0.92) 0%, rgba(12, 12, 20, 0.96) 100%)',
              borderRadius: '24px',
              border: '1px solid rgba(212, 175, 55, 0.15)',
              boxShadow: '0 40px 80px -20px rgba(0, 0, 0, 0.8), 0 0 1px rgba(212, 175, 55, 0.3)'
            }}
          >
            {/* Top Gold Accent Line */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px]"
              style={{ background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }}
            />

            {/* Card Content */}
            <div className="px-10 py-12">
              {/* Logo & Title Section */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-10"
              >
                {/* Crown Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                  className="inline-flex items-center justify-center w-16 h-16 mb-5 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%)',
                    border: '1px solid rgba(212, 175, 55, 0.3)'
                  }}
                >
                  <Crown className="w-8 h-8" style={{ color: '#d4af37' }} strokeWidth={1.5} />
                </motion.div>

                {/* Title */}
                <h1
                  className="text-2xl font-semibold tracking-wide mb-2"
                  style={{ color: '#ffffff' }}
                >
                  {i18n.language === 'zh' ? '管理后台' : 'Admin Console'}
                </h1>
                <p
                  className="text-sm tracking-widest uppercase"
                  style={{ color: 'rgba(212, 175, 55, 0.5)' }}
                >
                  {i18n.language === 'zh' ? '百家乐管理系统' : 'Baccarat Management'}
                </p>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-4 py-3 rounded-lg text-sm text-center"
                    style={{
                      background: 'rgba(220, 38, 38, 0.1)',
                      border: '1px solid rgba(220, 38, 38, 0.3)',
                      color: '#fca5a5'
                    }}
                  >
                    {error}
                  </motion.div>
                )}

                {/* Username Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <label
                    className="block text-xs font-medium mb-2 tracking-wider uppercase"
                    style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                  >
                    {t('username')}
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-lg text-sm transition-all duration-300 outline-none"
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: '#ffffff'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                    placeholder={i18n.language === 'zh' ? '输入用户名' : 'Enter username'}
                    required
                  />
                </motion.div>

                {/* Password Field */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <label
                    className="block text-xs font-medium mb-2 tracking-wider uppercase"
                    style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                  >
                    {t('password')}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3.5 pr-12 rounded-lg text-sm transition-all duration-300 outline-none"
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#ffffff'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(212, 175, 55, 0.5)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                      }}
                      placeholder={i18n.language === 'zh' ? '输入密码' : 'Enter password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                      style={{ color: 'rgba(255, 255, 255, 0.3)' }}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>

                {/* Login Button */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="pt-3"
                >
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-4 rounded-lg font-semibold text-sm tracking-wider uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: 'linear-gradient(135deg, #d4af37 0%, #b8962e 100%)',
                      color: '#0a0a0f',
                      boxShadow: '0 4px 20px rgba(212, 175, 55, 0.25)'
                    }}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin inline-block" />
                    ) : (
                      i18n.language === 'zh' ? '登 录' : 'Sign In'
                    )}
                  </motion.button>
                </motion.div>
              </form>
            </div>

            {/* Bottom Section */}
            <div
              className="px-10 py-5 text-center border-t"
              style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <p className="text-xs" style={{ color: 'rgba(255, 255, 255, 0.25)' }}>
                {i18n.language === 'zh' ? '安全登录 · 数据加密' : 'Secure Login · Encrypted'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-8 text-xs"
            style={{ color: 'rgba(255, 255, 255, 0.2)' }}
          >
            © 2025 Baccarat Admin System
          </motion.p>
        </motion.div>
      </div>

      {/* Styles */}
      <style>{`
        input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
      `}</style>
    </div>
  );
}
