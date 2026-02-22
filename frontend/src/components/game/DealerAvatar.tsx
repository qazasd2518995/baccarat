import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import type { Group } from 'three';

interface DealerAvatarProps {
  isDealing: boolean;
  dealerName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const IDLE_URL = '/models/dealer-idle.glb';
const CARDS_URL = '/models/dealer-cards.glb';

/** 3D dealer with Mixamo idle + dealing animations */
function DealerModel({ isDealing }: { isDealing: boolean }) {
  const groupRef = useRef<Group>(null);

  // Load both models (same mesh, different animations)
  const idle = useGLTF(IDLE_URL);
  const cards = useGLTF(CARDS_URL);

  // Get animation actions from both
  const { actions: idleActions } = useAnimations(idle.animations, groupRef);
  const { actions: cardsActions } = useAnimations(cards.animations, groupRef);

  useEffect(() => {
    // All Mixamo animations are named "mixamo.com"
    const idleAction = idleActions['mixamo.com'];
    const cardsAction = cardsActions['mixamo.com'];

    if (isDealing && cardsAction) {
      // Crossfade to dealing animation
      idleAction?.fadeOut(0.3);
      cardsAction.reset().fadeIn(0.3).play();
    } else if (idleAction) {
      // Crossfade back to idle
      cardsAction?.fadeOut(0.3);
      idleAction.reset().fadeIn(0.3).play();
    }
  }, [isDealing, idleActions, cardsActions]);

  return (
    <group ref={groupRef}>
      <primitive object={idle.scene} scale={1.1} position={[0, -1.05, 0]} />
    </group>
  );
}

// Preload both models
useGLTF.preload(IDLE_URL);
useGLTF.preload(CARDS_URL);

export default function DealerAvatar({ isDealing, dealerName, size = 'lg' }: DealerAvatarProps) {
  const heights = { sm: 90, md: 140, lg: 200 };
  const h = heights[size];

  return (
    <div className="relative flex flex-col items-center" style={{ height: h }}>
      <div style={{ width: h * 1.1, height: h }}>
        <Canvas
          camera={{ position: [0, 0, 2], fov: 30 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 2]} intensity={1.2} />
          <directionalLight position={[-1, 2, -1]} intensity={0.4} />
          <Suspense fallback={null}>
            <DealerModel isDealing={isDealing} />
          </Suspense>
        </Canvas>
      </div>

      {/* Dealer name tag */}
      {dealerName && (
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border border-[#d4af37]/30 whitespace-nowrap backdrop-blur-sm"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
        >
          {dealerName}
        </div>
      )}
    </div>
  );
}
