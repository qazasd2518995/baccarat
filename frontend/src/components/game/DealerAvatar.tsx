import { Suspense, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { LoopOnce } from 'three';
import type { Group } from 'three';

export type DealerModel = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6';

interface DealerAvatarProps {
  isDealing: boolean;
  dealerName?: string;
  model?: DealerModel;
}

const MODEL_URLS: Record<DealerModel, string> = {
  v1: '/models/dealer-v1.glb',
  v2: '/models/dealer-v2.glb',
  v3: '/models/dealer-v3.glb',
  v4: '/models/dealer-v4.glb',
  v5: '/models/dealer-v5.glb',
  v6: '/models/dealer-v6.glb',
};

export const ALL_MODEL_URLS = Object.values(MODEL_URLS);

function DealerModelInner({ isDealing, url }: { isDealing: boolean; url: string }) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(url);
  const { actions, names } = useAnimations(gltf.animations, groupRef);

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
      <primitive object={gltf.scene} scale={4.5} position={[0, -3, 0]} />
    </group>
  );
}

// Loading placeholder inside Canvas (3D silhouette)
function DealerLoadingFallback() {
  return (
    <mesh position={[0, -1, 0]}>
      <capsuleGeometry args={[0.6, 1.5, 8, 16]} />
      <meshStandardMaterial color="#d4af37" transparent opacity={0.15} />
    </mesh>
  );
}

export default function DealerAvatar({ isDealing, model = 'v2' }: DealerAvatarProps) {
  // Only preload the model we actually need
  useEffect(() => {
    useGLTF.preload(MODEL_URLS[model]);
  }, [model]);

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
          <Suspense fallback={<DealerLoadingFallback />}>
            <DealerModelInner isDealing={isDealing} url={MODEL_URLS[model]} />
          </Suspense>
        </Canvas>
      </div>

      {/* Dealer name badge is now rendered by DealerTable3D */}
    </div>
  );
}
