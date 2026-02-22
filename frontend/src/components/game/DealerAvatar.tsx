import { Suspense, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { MeshoptDecoder } from 'meshoptimizer';
import { AnimationClip } from 'three';
import type { Group } from 'three';

interface DealerAvatarProps {
  isDealing: boolean;
  dealerName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const IDLE_URL = '/models/dealer-idle.glb';
const CARDS_URL = '/models/dealer-cards.glb';

// Register meshopt decoder for compressed GLB files
useGLTF.defaults = { decoder: MeshoptDecoder } as never;

/** 3D dealer with Mixamo idle + dealing animations */
function DealerModel({ isDealing }: { isDealing: boolean }) {
  const groupRef = useRef<Group>(null);

  // Load both models
  const idle = useGLTF(IDLE_URL);
  const cards = useGLTF(CARDS_URL);

  // Merge all animations with unique names
  const allClips = useMemo(() => {
    const clips: AnimationClip[] = [];
    idle.animations.forEach(clip => {
      const c = clip.clone();
      c.name = 'idle';
      clips.push(c);
    });
    cards.animations.forEach(clip => {
      const c = clip.clone();
      c.name = 'dealing';
      clips.push(c);
    });
    return clips;
  }, [idle.animations, cards.animations]);

  const { actions } = useAnimations(allClips, groupRef);

  // Start idle on mount
  useEffect(() => {
    actions['idle']?.play();
  }, [actions]);

  // Switch animation based on isDealing
  useEffect(() => {
    const idleAction = actions['idle'];
    const dealAction = actions['dealing'];

    if (isDealing && dealAction) {
      idleAction?.fadeOut(0.4);
      dealAction.reset().fadeIn(0.4).play();
    } else if (idleAction) {
      dealAction?.fadeOut(0.4);
      idleAction.reset().fadeIn(0.4).play();
    }
  }, [isDealing, actions]);

  return (
    <group ref={groupRef}>
      <primitive object={idle.scene} scale={1.1} position={[0, -1.0, 0]} />
    </group>
  );
}

// Preload both models
useGLTF.preload(IDLE_URL);
useGLTF.preload(CARDS_URL);

export default function DealerAvatar({ isDealing, dealerName, size = 'lg' }: DealerAvatarProps) {
  const heights = { sm: 100, md: 150, lg: 210 };
  const h = heights[size];

  return (
    <div className="relative flex flex-col items-center" style={{ height: h }}>
      <div style={{ width: h * 1.2, height: h, position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0.15, 2.2], fov: 28 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'default' }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 3, 2]} intensity={1.2} color="#fff5e0" />
          <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#c0d0ff" />
          <pointLight position={[0, 1, 1.5]} intensity={0.4} color="#ffd700" distance={5} />
          <Suspense fallback={null}>
            <DealerModel isDealing={isDealing} />
          </Suspense>
        </Canvas>
      </div>

      {/* Dealer name tag */}
      {dealerName && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border border-[#d4af37]/30 whitespace-nowrap backdrop-blur-sm z-50"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >
          {dealerName}
        </div>
      )}
    </div>
  );
}
