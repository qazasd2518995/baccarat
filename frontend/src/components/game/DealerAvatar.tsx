import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls } from '@react-three/drei';
import type { Group } from 'three';

interface DealerAvatarProps {
  isDealing: boolean;
  dealerName?: string;
  size?: 'sm' | 'md' | 'lg';
}

/** 3D dealer model with idle sway and dealing lean animation */
function DealerModel({ isDealing }: { isDealing: boolean }) {
  const { scene } = useGLTF('/models/dealer.glb');
  const groupRef = useRef<Group>(null);
  const timeRef = useRef(0);
  const dealPhaseRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;

    // Idle: gentle breathing sway
    const idleY = Math.sin(timeRef.current * 1.2) * 0.005;
    const idleRotZ = Math.sin(timeRef.current * 0.8) * 0.008;

    if (isDealing) {
      // Dealing: lean forward smoothly
      dealPhaseRef.current = Math.min(dealPhaseRef.current + delta * 3, 1);
      const lean = Math.sin(dealPhaseRef.current * Math.PI) * 0.08;
      groupRef.current.rotation.x = lean;
      groupRef.current.position.y = idleY - lean * 0.3;
      groupRef.current.rotation.z = idleRotZ;
    } else {
      // Return to idle
      dealPhaseRef.current = Math.max(dealPhaseRef.current - delta * 2, 0);
      const lean = Math.sin(dealPhaseRef.current * Math.PI) * 0.08;
      groupRef.current.rotation.x = lean;
      groupRef.current.position.y = idleY;
      groupRef.current.rotation.z = idleRotZ;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={1.8} position={[0, -0.85, 0]} />
    </group>
  );
}

// Preload model
useGLTF.preload('/models/dealer.glb');

export default function DealerAvatar({ isDealing, dealerName, size = 'lg' }: DealerAvatarProps) {
  const heights = { sm: 90, md: 140, lg: 200 };
  const h = heights[size];

  return (
    <div className="relative flex flex-col items-center" style={{ height: h }}>
      <div style={{ width: h * 0.9, height: h }}>
        <Canvas
          camera={{ position: [0, 0.1, 1.2], fov: 35 }}
          gl={{ alpha: true, antialias: true }}
          dpr={[1, 2]}
          style={{ background: 'transparent' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 2]} intensity={1} />
          <directionalLight position={[-1, 1, -1]} intensity={0.3} />
          <Suspense fallback={null}>
            <DealerModel isDealing={isDealing} />
          </Suspense>
          <OrbitControls
            enabled={false}
            enableZoom={false}
            enablePan={false}
            enableRotate={false}
          />
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
