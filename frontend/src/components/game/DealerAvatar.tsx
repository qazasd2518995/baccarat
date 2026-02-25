import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useFBX, useAnimations } from '@react-three/drei';
import { LoopOnce } from 'three';
import type { Group } from 'three';

interface DealerAvatarProps {
  isDealing: boolean;
  dealerName?: string;
}

const MODEL_URL = '/models/dealer-cards-new.fbx';

function DealerModel({ isDealing }: { isDealing: boolean }) {
  const groupRef = useRef<Group>(null);
  const fbx = useFBX(MODEL_URL);

  const { actions, names } = useAnimations(fbx.animations, groupRef);

  // On mount: pause the animation at frame 0 (idle pose)
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

  // When isDealing changes, play or reset the animation
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

useFBX.preload(MODEL_URL);

export default function DealerAvatar({ isDealing, dealerName }: DealerAvatarProps) {
  return (
    <div className="relative flex flex-col items-center w-full h-full">
      {/* Canvas fills parent — aspect ratio maintained by container */}
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
            <DealerModel isDealing={isDealing} />
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
