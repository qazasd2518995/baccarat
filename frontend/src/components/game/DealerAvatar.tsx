import { motion } from 'framer-motion';

interface DealerAvatarProps {
  isDealing: boolean;
  dealerName?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * CSS-illustrated dealer avatar with dealing animation.
 * Renders a stylized female dealer silhouette using gradients and shapes.
 * When isDealing=true, the dealer leans forward with a subtle animation.
 */
export default function DealerAvatar({ isDealing, dealerName, size = 'lg' }: DealerAvatarProps) {
  const heights = { sm: 100, md: 160, lg: 220 };
  const h = heights[size];

  return (
    <div className="relative flex flex-col items-center" style={{ height: h }}>
      {/* Dealer body — CSS illustration */}
      <motion.div
        className="relative flex flex-col items-center"
        animate={isDealing ? {
          y: [0, 6, 6, 0],
          scale: [1, 1.03, 1.03, 1],
        } : { y: 0, scale: 1 }}
        transition={{
          duration: 0.7,
          times: [0, 0.3, 0.7, 1],
          ease: 'easeInOut',
          repeat: isDealing ? Infinity : 0,
          repeatDelay: 0.5,
        }}
      >
        {/* Head */}
        <div
          className="rounded-full bg-gradient-to-b from-[#f5d0a9] to-[#d4a574] relative z-10"
          style={{
            width: h * 0.22,
            height: h * 0.26,
          }}
        >
          {/* Hair */}
          <div
            className="absolute -top-[8%] left-1/2 -translate-x-1/2 rounded-t-full bg-gradient-to-b from-[#2a1a0e] to-[#3d2b1a]"
            style={{
              width: '110%',
              height: '55%',
            }}
          />
          {/* Eyes */}
          <div className="absolute flex gap-[18%] justify-center w-full" style={{ top: '42%' }}>
            <div className="w-[10%] h-[6%] bg-[#2a1a0e] rounded-full" />
            <div className="w-[10%] h-[6%] bg-[#2a1a0e] rounded-full" />
          </div>
          {/* Smile */}
          <div
            className="absolute left-1/2 -translate-x-1/2 border-b-2 border-[#c0846a] rounded-b-full"
            style={{ top: '62%', width: '22%', height: '8%' }}
          />
        </div>

        {/* Neck */}
        <div
          className="bg-gradient-to-b from-[#d4a574] to-[#c8956a] relative z-10"
          style={{ width: h * 0.08, height: h * 0.06 }}
        />

        {/* Shoulders + Torso — white blouse */}
        <div className="relative z-10" style={{ width: h * 0.7, height: h * 0.55 }}>
          {/* Shoulders */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-b from-white to-[#e8e8e8] rounded-t-[40%]"
            style={{ width: '100%', height: '35%' }}
          />
          {/* Body / blouse */}
          <div
            className="absolute top-[20%] left-1/2 -translate-x-1/2 bg-gradient-to-b from-[#f0f0f0] to-[#d8d8d8]"
            style={{
              width: '85%',
              height: '80%',
              borderRadius: '5% 5% 0 0',
            }}
          >
            {/* V-neck collar */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: `${h * 0.06}px solid transparent`,
                borderRight: `${h * 0.06}px solid transparent`,
                borderTop: `${h * 0.08}px solid #d4a574`,
              }}
            />
            {/* Center line (button seam) */}
            <div className="absolute top-[20%] left-1/2 -translate-x-[0.5px] w-px h-[60%] bg-[#ccc]" />
          </div>

          {/* Left arm */}
          <motion.div
            className="absolute bg-gradient-to-b from-white to-[#e0e0e0] rounded-b-lg origin-top"
            style={{
              width: '18%',
              height: '75%',
              top: '10%',
              left: '2%',
              borderRadius: '30%',
              transform: 'rotate(12deg)',
            }}
            animate={isDealing ? {
              rotate: [12, 5, 5, 12],
            } : { rotate: 12 }}
            transition={{
              duration: 0.7,
              times: [0, 0.3, 0.7, 1],
              ease: 'easeInOut',
              repeat: isDealing ? Infinity : 0,
              repeatDelay: 0.5,
            }}
          >
            {/* Hand */}
            <div className="absolute -bottom-[10%] left-1/2 -translate-x-1/2 w-[70%] aspect-square rounded-full bg-gradient-to-b from-[#f0c8a0] to-[#d4a574]" />
          </motion.div>

          {/* Right arm — dealing arm */}
          <motion.div
            className="absolute bg-gradient-to-b from-white to-[#e0e0e0] rounded-b-lg origin-top"
            style={{
              width: '18%',
              height: '75%',
              top: '10%',
              right: '2%',
              borderRadius: '30%',
              transform: 'rotate(-12deg)',
            }}
            animate={isDealing ? {
              rotate: [-12, -2, -2, -12],
              y: [0, 10, 10, 0],
            } : { rotate: -12, y: 0 }}
            transition={{
              duration: 0.7,
              times: [0, 0.3, 0.7, 1],
              ease: 'easeInOut',
              repeat: isDealing ? Infinity : 0,
              repeatDelay: 0.5,
            }}
          >
            {/* Hand */}
            <div className="absolute -bottom-[10%] left-1/2 -translate-x-1/2 w-[70%] aspect-square rounded-full bg-gradient-to-b from-[#f0c8a0] to-[#d4a574]" />
            {/* Card in hand when dealing */}
            {isDealing && (
              <motion.div
                className="absolute -bottom-[20%] left-1/2 -translate-x-1/2 bg-gradient-to-br from-[#1e3a5f] to-[#0f2744] border border-[#d4af37]/40 rounded-sm"
                style={{
                  width: '60%',
                  aspectRatio: '2.5/3.5',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: 0.7,
                  times: [0, 0.2, 0.6, 1],
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Dealer name tag */}
      {dealerName && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] sm:text-xs px-2 py-0.5 rounded-full border border-[#d4af37]/20 whitespace-nowrap">
          {dealerName}
        </div>
      )}
    </div>
  );
}
