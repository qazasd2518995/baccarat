import type { ReactNode } from 'react';
import DealerAvatar from './DealerAvatar';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface DealerTable3DProps {
  children: ReactNode;
  isDealing: boolean;
  dealerName?: string;
  gameType?: 'baccarat' | 'dragonTiger' | 'bullBull';
}

const FELT_COLORS = {
  baccarat:    { from: '#1e6b35', via: '#185c2e', to: '#124a24' },
  dragonTiger: { from: '#1e6b35', via: '#185c2e', to: '#124a24' },
  bullBull:    { from: '#1a4a3a', via: '#15403a', to: '#103030' },
};

/**
 * Integrated 3D casino table with dealer.
 * The dealer sits BEHIND the table — lower body hidden by the table felt.
 * Cards fly from the dealer's hand position.
 *
 * Single unified layout (no separated sections):
 * - Dark background fills entire area
 * - Dealer avatar positioned at top, overlapping into table area
 * - Table felt with perspective takes remaining space
 * - Dealer's lower body is hidden behind table z-index
 */
export default function DealerTable3D({
  children,
  isDealing,
  dealerName,
  gameType = 'baccarat',
}: DealerTable3DProps) {
  const bp = useBreakpoint();
  const felt = FELT_COLORS[gameType];

  // Responsive values
  const perspective = bp === 'mobile' ? 800 : bp === 'tablet' ? 1000 : 1200;
  const rotateX = bp === 'mobile' ? 6 : bp === 'tablet' ? 8 : 10;
  const dealerSize = bp === 'mobile' ? 'sm' : bp === 'tablet' ? 'md' : 'lg';

  // How much the dealer overlaps into the table area
  const dealerOverlap = bp === 'mobile' ? 15 : bp === 'tablet' ? 70 : 100;
  const dealerZoneHeight = bp === 'mobile' ? '30%' : '50%';
  const tableTop = bp === 'mobile' ? `calc(25% - ${dealerOverlap}px)` : `calc(42% - ${dealerOverlap}px)`;

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden bg-[#0a0e14]">

      {/* === Dealer — absolute positioned, overlaps into table === */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex justify-center pointer-events-none"
        style={{ height: dealerZoneHeight }}
      >
        {/* Ambient glow behind dealer */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-[#d4af37]/4 rounded-full blur-[100px]" />
        </div>

        <DealerAvatar
          isDealing={isDealing}
          dealerName={dealerName}
          size={dealerSize as 'sm' | 'md' | 'lg'}
        />
      </div>

      {/* === Table Surface — positioned below dealer with overlap === */}
      <div
        className="absolute left-0 right-0 bottom-0 z-20"
        style={{ top: tableTop }}
      >
        {/* Table edge — thin golden border at top */}
        <div className="relative z-10 h-1.5 sm:h-2"
          style={{
            background: 'linear-gradient(to bottom, #8b6914, #5a3a1a, #3a2210)',
            borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          }}
        />

        {/* 3D Perspective felt surface */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            perspective: `${perspective}px`,
            perspectiveOrigin: '50% 15%',
            height: '100%',
          }}
        >
          <div
            className="absolute inset-0 origin-top"
            style={{
              transform: `rotateX(${rotateX}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {/* Felt background */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${felt.from} 0%, ${felt.via} 40%, ${felt.to} 100%)`,
                borderRadius: '0 0 50% 50% / 0 0 15% 15%',
              }}
            >
              {/* Subtle radial glow */}
              <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-[#d4af37]/4 via-transparent to-transparent" />
              {/* Felt texture */}
              <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
              {/* Gold inner border */}
              <div className="absolute inset-3 sm:inset-4 border border-[#d4af37]/12" style={{ borderRadius: '0 0 45% 45% / 0 0 12% 12%' }} />
            </div>

            {/* Game content — flat transform for click targets */}
            <div className="absolute inset-0" style={{ transformStyle: 'flat' }}>
              {children}
            </div>
          </div>
        </div>

        {/* Bottom table edge — curved wood */}
        <div className="absolute bottom-0 left-0 right-0 h-2 sm:h-3 z-10"
          style={{
            background: 'linear-gradient(to bottom, #5a3a1a, #3a2210)',
            borderRadius: '0 0 50% 50% / 0 0 100% 100%',
          }}
        />
      </div>
    </div>
  );
}
