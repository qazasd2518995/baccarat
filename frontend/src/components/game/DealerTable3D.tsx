import type { ReactNode } from 'react';
import DealerAvatar from './DealerAvatar';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface DealerTable3DProps {
  children: ReactNode;
  phase: string;
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
 * 3D perspective casino table wrapper with dealer avatar.
 * Provides the illusion of looking down at a casino table from the player's POV.
 *
 * Layout (top to bottom):
 * 1. Dark background with dealer avatar (~25%)
 * 2. Chip tray / table edge divider (~3%)
 * 3. 3D perspective table felt with children (~60%)
 * 4. Bottom table rail (~12%)
 */
export default function DealerTable3D({
  children,
  phase,
  isDealing,
  dealerName,
  gameType = 'baccarat',
}: DealerTable3DProps) {
  const bp = useBreakpoint();
  const felt = FELT_COLORS[gameType];

  // Responsive perspective values
  const perspective = bp === 'mobile' ? 800 : bp === 'tablet' ? 1000 : 1200;
  const rotateX = bp === 'mobile' ? 8 : bp === 'tablet' ? 10 : 12;
  const dealerSize = bp === 'mobile' ? 'sm' : bp === 'tablet' ? 'md' : 'lg';

  return (
    <div className="flex-1 relative flex flex-col overflow-hidden bg-[#0a0e14]">
      {/* === Dealer Zone === */}
      <div className="relative z-40 shrink-0"
        style={{
          background: 'linear-gradient(to bottom, #0d1117 0%, #141922 60%, #1a2030 100%)',
        }}
      >
        {/* Ambient light behind dealer */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 w-[300px] h-[200px] bg-[#d4af37]/5 rounded-full blur-[80px]" />
        </div>

        <div className="relative flex justify-center pt-1 sm:pt-2">
          <DealerAvatar
            isDealing={isDealing}
            dealerName={dealerName}
            size={dealerSize as 'sm' | 'md' | 'lg'}
          />
        </div>
      </div>

      {/* === Chip Tray / Table Edge Divider === */}
      <div className="relative z-30 shrink-0 h-4 sm:h-6 lg:h-8">
        {/* Wooden rail background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#5a3a1a] via-[#8b6914] to-[#4a2a10]" />
        {/* Chrome strip */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#c0c0c0]/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent" />
        {/* Chip tray decoration — row of colored dots */}
        <div className="absolute inset-0 flex items-center justify-center gap-1 sm:gap-1.5">
          {['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#e74c3c', '#3498db'].map((color, i) => (
            <div
              key={i}
              className="rounded-full border border-white/20"
              style={{
                width: bp === 'mobile' ? 6 : bp === 'tablet' ? 8 : 10,
                height: bp === 'mobile' ? 6 : bp === 'tablet' ? 8 : 10,
                backgroundColor: color,
                boxShadow: `0 1px 3px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)`,
              }}
            />
          ))}
        </div>
      </div>

      {/* === 3D Perspective Table Surface === */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          perspective: `${perspective}px`,
          perspectiveOrigin: '50% 20%',
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
              background: `linear-gradient(to bottom, ${felt.from}ee, ${felt.via}f0, ${felt.to}ee)`,
              borderRadius: '0 0 50% 50% / 0 0 12% 12%',
            }}
          >
            {/* Subtle radial glow */}
            <div className="absolute inset-0 bg-radial-[ellipse_at_center] from-[#d4af37]/4 via-transparent to-transparent" />
            {/* Felt texture overlay */}
            <div className="absolute inset-0 opacity-8" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)' }} />
            {/* Gold border — inner frame */}
            <div className="absolute inset-3 sm:inset-4 rounded-xl border border-[#d4af37]/15" style={{ borderRadius: '0 0 45% 45% / 0 0 10% 10%' }} />
            <div className="absolute inset-5 sm:inset-6 rounded-lg border border-[#d4af37]/8" style={{ borderRadius: '0 0 40% 40% / 0 0 8% 8%' }} />
            {/* Corner ornaments */}
            <div className="absolute top-5 left-5 sm:top-6 sm:left-6 w-5 h-5 border-t-2 border-l-2 border-[#d4af37]/25 rounded-tl" />
            <div className="absolute top-5 right-5 sm:top-6 sm:right-6 w-5 h-5 border-t-2 border-r-2 border-[#d4af37]/25 rounded-tr" />
          </div>

          {/* Game content (children) — flat transform to fix click targets */}
          <div className="absolute inset-0" style={{ transformStyle: 'flat' }}>
            {children}
          </div>
        </div>
      </div>

      {/* === Bottom Table Rail === */}
      <div className="relative z-20 shrink-0 h-6 sm:h-8 lg:h-10">
        {/* Wood texture */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, #3a2210, #5a3a1a 30%, #8b6914 50%, #5a3a1a 70%, #2a1a0a)',
          borderRadius: '0 0 50% 50% / 0 0 100% 100%',
        }} />
        {/* Top chrome strip */}
        <div className="absolute top-0 left-[5%] right-[5%] h-px bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent" />
        {/* Bottom inner shadow */}
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-black/30 to-transparent" />
      </div>
    </div>
  );
}
