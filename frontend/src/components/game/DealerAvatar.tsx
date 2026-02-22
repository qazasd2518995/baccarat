import { motion } from 'framer-motion';

interface DealerAvatarProps {
  isDealing: boolean;
  dealerName?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 3D-styled dealer avatar with dealing animation.
 * Uses layered gradients, shadows, and highlights to simulate depth.
 */
export default function DealerAvatar({ isDealing, dealerName, size = 'lg' }: DealerAvatarProps) {
  const heights = { sm: 90, md: 140, lg: 200 };
  const h = heights[size];

  return (
    <div className="relative flex flex-col items-center" style={{ height: h }}>
      {/* Drop shadow on table surface */}
      <div
        className="absolute rounded-[50%] bg-black/20 blur-md"
        style={{
          width: h * 0.5,
          height: h * 0.08,
          bottom: -h * 0.02,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />

      {/* Dealer body — 3D styled */}
      <motion.div
        className="relative flex flex-col items-center"
        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}
        animate={isDealing ? {
          y: [0, 5, 5, 0],
          scale: [1, 1.02, 1.02, 1],
        } : { y: 0, scale: 1 }}
        transition={{
          duration: 0.7,
          times: [0, 0.3, 0.7, 1],
          ease: 'easeInOut',
          repeat: isDealing ? Infinity : 0,
          repeatDelay: 0.5,
        }}
      >
        {/* Head with 3D shading */}
        <div
          className="rounded-full relative z-10"
          style={{
            width: h * 0.2,
            height: h * 0.24,
            background: 'radial-gradient(ellipse at 40% 35%, #f5d0a9 0%, #d4a574 60%, #b8875a 100%)',
            boxShadow: 'inset -2px -3px 6px rgba(0,0,0,0.15), inset 2px 2px 4px rgba(255,255,255,0.2)',
          }}
        >
          {/* Hair — voluminous with highlights */}
          <div
            className="absolute -top-[10%] left-1/2 -translate-x-1/2 rounded-t-full"
            style={{
              width: '115%',
              height: '58%',
              background: 'linear-gradient(135deg, #3d2b1a 0%, #2a1a0e 40%, #1a0f06 100%)',
              boxShadow: 'inset 2px 2px 4px rgba(255,255,255,0.08)',
            }}
          />
          {/* Side hair strands */}
          <div className="absolute top-[20%] -left-[5%] w-[15%] h-[40%] rounded-b-full"
            style={{ background: 'linear-gradient(to bottom, #2a1a0e, #3d2b1a)' }} />
          <div className="absolute top-[20%] -right-[5%] w-[15%] h-[40%] rounded-b-full"
            style={{ background: 'linear-gradient(to bottom, #2a1a0e, #3d2b1a)' }} />
          {/* Eyes with depth */}
          <div className="absolute flex gap-[16%] justify-center w-full" style={{ top: '44%' }}>
            <div className="rounded-full" style={{ width: '10%', height: '7%', background: 'radial-gradient(#1a0f06, #2a1a0e)', boxShadow: '0 1px 1px rgba(255,255,255,0.1)' }} />
            <div className="rounded-full" style={{ width: '10%', height: '7%', background: 'radial-gradient(#1a0f06, #2a1a0e)', boxShadow: '0 1px 1px rgba(255,255,255,0.1)' }} />
          </div>
          {/* Eyebrows */}
          <div className="absolute flex gap-[14%] justify-center w-full" style={{ top: '38%' }}>
            <div style={{ width: '14%', height: '2px', background: '#3d2b1a', borderRadius: '50%' }} />
            <div style={{ width: '14%', height: '2px', background: '#3d2b1a', borderRadius: '50%' }} />
          </div>
          {/* Nose highlight */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: '52%', width: '6%', height: '10%', background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent)', borderRadius: '50%' }} />
          {/* Lips */}
          <div className="absolute left-1/2 -translate-x-1/2 rounded-full" style={{ top: '65%', width: '18%', height: '5%', background: 'radial-gradient(#c07060, #a05848)' }} />
        </div>

        {/* Neck with shadow */}
        <div
          className="relative z-10"
          style={{
            width: h * 0.07,
            height: h * 0.05,
            background: 'linear-gradient(to right, #b8875a, #d4a574 40%, #c89060)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          }}
        />

        {/* Shoulders + Torso — 3D white blouse with casino vest */}
        <div className="relative z-10" style={{ width: h * 0.65, height: h * 0.55 }}>
          {/* Shoulders with 3D roundness */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2"
            style={{
              width: '100%',
              height: '35%',
              borderRadius: '40% 40% 0 0',
              background: 'linear-gradient(180deg, #f8f8f8 0%, #e8e8e8 50%, #d0d0d0 100%)',
              boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.4), inset 0 -2px 6px rgba(0,0,0,0.1)',
            }}
          />
          {/* Body / blouse with depth */}
          <div
            className="absolute top-[20%] left-1/2 -translate-x-1/2"
            style={{
              width: '82%',
              height: '80%',
              borderRadius: '4% 4% 0 0',
              background: 'linear-gradient(180deg, #f0f0f0 0%, #e4e4e4 40%, #d0d0d0 100%)',
              boxShadow: 'inset 3px 0 8px rgba(0,0,0,0.06), inset -3px 0 8px rgba(0,0,0,0.06), inset 0 2px 4px rgba(255,255,255,0.3)',
            }}
          >
            {/* V-neck collar shadow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: `${h * 0.05}px solid transparent`,
                borderRight: `${h * 0.05}px solid transparent`,
                borderTop: `${h * 0.07}px solid #c89060`,
              }}
            />
            {/* Casino vest overlay (dark sides) */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, rgba(30,20,10,0.15) 0%, transparent 20%, transparent 80%, rgba(30,20,10,0.15) 100%)',
              borderRadius: '4% 4% 0 0',
            }} />
            {/* Center button seam with shadows */}
            <div className="absolute top-[22%] left-1/2 -translate-x-[0.5px] w-px h-[55%]"
              style={{ background: 'linear-gradient(to bottom, #ccc, #bbb)' }} />
            {/* Buttons */}
            {[30, 45, 60].map(top => (
              <div key={top} className="absolute left-1/2 -translate-x-1/2 rounded-full"
                style={{ top: `${top}%`, width: h * 0.015, height: h * 0.015, background: 'radial-gradient(#e0e0e0, #c0c0c0)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
            ))}
          </div>

          {/* Left arm with 3D shading */}
          <motion.div
            className="absolute origin-top"
            style={{
              width: '17%',
              height: '70%',
              top: '12%',
              left: '3%',
              borderRadius: '35%',
              background: 'linear-gradient(90deg, #d8d8d8 0%, #f0f0f0 40%, #e0e0e0 100%)',
              boxShadow: 'inset -2px 0 4px rgba(0,0,0,0.1), 2px 2px 6px rgba(0,0,0,0.15)',
              transform: 'rotate(10deg)',
            }}
            animate={isDealing ? { rotate: [10, 4, 4, 10] } : { rotate: 10 }}
            transition={{ duration: 0.7, times: [0, 0.3, 0.7, 1], ease: 'easeInOut', repeat: isDealing ? Infinity : 0, repeatDelay: 0.5 }}
          >
            {/* Hand */}
            <div className="absolute -bottom-[8%] left-1/2 -translate-x-1/2 w-[65%] aspect-square rounded-full"
              style={{ background: 'radial-gradient(ellipse at 40% 40%, #f0c8a0, #d4a574)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
          </motion.div>

          {/* Right arm — dealing arm with 3D shading */}
          <motion.div
            className="absolute origin-top"
            style={{
              width: '17%',
              height: '70%',
              top: '12%',
              right: '3%',
              borderRadius: '35%',
              background: 'linear-gradient(90deg, #e0e0e0 0%, #f0f0f0 60%, #d8d8d8 100%)',
              boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.1), -2px 2px 6px rgba(0,0,0,0.15)',
              transform: 'rotate(-10deg)',
            }}
            animate={isDealing ? {
              rotate: [-10, -2, -2, -10],
              y: [0, 8, 8, 0],
            } : { rotate: -10, y: 0 }}
            transition={{ duration: 0.7, times: [0, 0.3, 0.7, 1], ease: 'easeInOut', repeat: isDealing ? Infinity : 0, repeatDelay: 0.5 }}
          >
            {/* Hand */}
            <div className="absolute -bottom-[8%] left-1/2 -translate-x-1/2 w-[65%] aspect-square rounded-full"
              style={{ background: 'radial-gradient(ellipse at 60% 40%, #f0c8a0, #d4a574)', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }} />
            {/* Card in hand when dealing */}
            {isDealing && (
              <motion.div
                className="absolute -bottom-[18%] left-1/2 -translate-x-1/2 rounded-sm"
                style={{
                  width: '55%',
                  aspectRatio: '2.5/3.5',
                  background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
                  border: '1px solid rgba(212,175,55,0.4)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{ duration: 0.7, times: [0, 0.2, 0.6, 1], repeat: Infinity, repeatDelay: 0.5 }}
              />
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Dealer name tag */}
      {dealerName && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full border border-[#d4af37]/30 whitespace-nowrap backdrop-blur-sm"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
          {dealerName}
        </div>
      )}
    </div>
  );
}
