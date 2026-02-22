import { Suspense, useEffect, useRef, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { AnimationClip } from 'three';
import type { Group } from 'three';

interface DealerAvatarProps {
  isDealing: boolean;
  dealerName?: string;
  size?: 'sm' | 'md' | 'lg';
}

const IDLE_URL = '/models/dealer-idle.glb';
const CARDS_URL = '/models/dealer-cards.glb';

/** 3D dealer with Mixamo idle + dealing animations */
function DealerModel({ isDealing, onLoaded }: { isDealing: boolean; onLoaded: () => void }) {
  const groupRef = useRef<Group>(null);

  const idle = useGLTF(IDLE_URL, undefined, true);
  const cards = useGLTF(CARDS_URL, undefined, true);

  useEffect(() => {
    console.log('[DealerModel] idle loaded:', !!idle.scene, 'animations:', idle.animations.length);
    console.log('[DealerModel] cards loaded:', !!cards.scene, 'animations:', cards.animations.length);
    console.log('[DealerModel] idle scene children:', idle.scene?.children?.length);
    onLoaded();
  }, [idle, cards, onLoaded]);

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

  useEffect(() => {
    console.log('[DealerModel] actions:', Object.keys(actions));
    actions['idle']?.play();
  }, [actions]);

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
      <primitive object={idle.scene} scale={2.8} position={[0, -1.2, 0]} />
    </group>
  );
}

useGLTF.preload(IDLE_URL, undefined, true);
useGLTF.preload(CARDS_URL, undefined, true);

export default function DealerAvatar({ isDealing, dealerName, size = 'lg' }: DealerAvatarProps) {
  const heights = { sm: 160, md: 240, lg: 320 };
  const h = heights[size];
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  return (
    <div className="relative flex flex-col items-center" style={{ height: h, width: '100%' }}>
      <div style={{ width: Math.min(h * 1.4, 500), height: h, border: '1px solid rgba(255,0,0,0.3)' }}>
        <Canvas
          camera={{ position: [0, 0.35, 1.8], fov: 36 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'default' }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent', pointerEvents: 'none' }}
          onCreated={() => console.log('[DealerAvatar] Canvas created, size:', h)}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 3, 2]} intensity={1.3} color="#fff5e0" />
          <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#c0d0ff" />
          <pointLight position={[0, 0.5, 1.5]} intensity={0.5} color="#ffd700" distance={5} />
          {/* Debug: red cube at origin to verify camera */}
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="red" />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="green" />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="blue" />
          </mesh>
          <Suspense fallback={null}>
            <DealerModel isDealing={isDealing} onLoaded={() => setStatus('loaded')} />
          </Suspense>
        </Canvas>

        {/* Debug overlay */}
        <div className="absolute top-1 left-1 text-[9px] text-yellow-400 bg-black/70 px-1 rounded z-50">
          3D: {status} | h={h}
        </div>
      </div>

      {/* Dealer name tag */}
      {dealerName && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] sm:text-xs px-3 py-1 rounded-full border border-[#d4af37]/30 whitespace-nowrap backdrop-blur-sm z-50"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
        >
          {dealerName}
        </div>
      )}
    </div>
  );
}
