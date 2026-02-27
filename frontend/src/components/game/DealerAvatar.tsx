import { Suspense, useEffect, useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useFBX, useGLTF, useAnimations } from '@react-three/drei';
import { LoopOnce, AnimationClip } from 'three';
import type { Group } from 'three';

export type DealerModel = 'original' | 'new';

interface DealerAvatarProps {
  isDealing: boolean;
  dealerName?: string;
  model?: DealerModel;
}

// === New FBX model (single file with dealing animation) ===
const FBX_URL = '/models/dealer-cards-new.fbx';

function FBXDealerModel({ isDealing }: { isDealing: boolean }) {
  const groupRef = useRef<Group>(null);
  const fbx = useFBX(FBX_URL);
  const { actions, names } = useAnimations(fbx.animations, groupRef);

  useEffect(() => {
    if (names.length > 0 && actions[names[0]]) {
      const action = actions[names[0]]!;
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.play();
      action.paused = true;
      action.time = 0;
    }
  }, [actions, names]);

  useEffect(() => {
    if (names.length === 0) return;
    const action = actions[names[0]];
    if (!action) return;

    if (isDealing) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.reset().play();
      action.paused = false;
    } else {
      action.paused = true;
      action.time = 0;
    }
  }, [isDealing, actions, names]);

  return (
    <group ref={groupRef}>
      <primitive object={fbx} scale={0.05} position={[0, -3.5, 0]} />
    </group>
  );
}

// === Original GLB model (idle + dealing as separate files) ===
const IDLE_URL = '/models/dealer-idle.glb';
const CARDS_URL = '/models/dealer-cards.glb';

function GLBDealerModel({ isDealing }: { isDealing: boolean }) {
  const groupRef = useRef<Group>(null);
  const idle = useGLTF(IDLE_URL, undefined, true);
  const cards = useGLTF(CARDS_URL, undefined, true);

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
      <primitive object={idle.scene} scale={5.0} position={[0, -3.5, 0]} />
    </group>
  );
}

// Preload both models
useFBX.preload(FBX_URL);
useGLTF.preload(IDLE_URL, undefined, true);
useGLTF.preload(CARDS_URL, undefined, true);

export default function DealerAvatar({ isDealing, dealerName, model = 'new' }: DealerAvatarProps) {
  return (
    <div className="relative flex flex-col items-center w-full h-full">
      <div className="w-full h-full max-w-[500px]">
        <Canvas
          camera={{ position: [0, 2.5, 3.0], fov: 40 }}
          gl={{ alpha: true, antialias: true, powerPreference: 'default' }}
          dpr={[1, 1.5]}
          style={{ background: 'transparent', pointerEvents: 'none' }}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[2, 3, 2]} intensity={1.3} color="#fff5e0" />
          <directionalLight position={[-2, 1, -1]} intensity={0.3} color="#c0d0ff" />
          <pointLight position={[0, 0.5, 1.5]} intensity={0.5} color="#ffd700" distance={5} />
          <Suspense fallback={null}>
            {model === 'original' ? (
              <GLBDealerModel isDealing={isDealing} />
            ) : (
              <FBXDealerModel isDealing={isDealing} />
            )}
          </Suspense>
        </Canvas>
      </div>

      {dealerName && (
        <>
          {/* Mobile: Name on right side */}
          <div
            className="sm:hidden absolute top-1/2 -translate-y-1/2 right-0 bg-black/70 text-white text-[9px] px-2 py-0.5 rounded-full border border-[#d4af37]/30 whitespace-nowrap backdrop-blur-sm z-50"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
          >
            {dealerName}
          </div>
          {/* Desktop: Name at bottom center */}
          <div
            className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full border border-[#d4af37]/30 whitespace-nowrap backdrop-blur-sm z-50"
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
          >
            {dealerName}
          </div>
        </>
      )}
    </div>
  );
}
