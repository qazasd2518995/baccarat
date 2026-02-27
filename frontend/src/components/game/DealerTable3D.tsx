import type { ReactNode } from 'react';
import DealerAvatar from './DealerAvatar';
import type { DealerModel } from './DealerAvatar';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface DealerTable3DProps {
  children: ReactNode;
  isDealing: boolean;
  dealerName?: string;
  gameType?: 'baccarat' | 'dragonTiger' | 'bullBull';
  dealerModel?: DealerModel;
}

const FELT_COLORS = {
  baccarat:    { from: '#0d4a2a', via: '#0a3d22', to: '#07301a' },
  dragonTiger: { from: '#0d4a2a', via: '#0a3d22', to: '#07301a' },
  bullBull:    { from: '#0a3a30', via: '#083028', to: '#062520' },
};

/**
 * Premium Casino Baccarat Table with realistic felt texture and decorative elements.
 * Features:
 * - Rich green baize felt with subtle fiber texture
 * - Gold decorative trim and borders
 * - Corner ornaments mimicking real casino tables
 * - Subtle lighting effects for depth
 */
export default function DealerTable3D({
  children,
  isDealing,
  dealerName,
  gameType = 'baccarat',
  dealerModel = 'v2',
}: DealerTable3DProps) {
  const bp = useBreakpoint();
  const felt = FELT_COLORS[gameType];

  // Responsive values
  const perspective = bp === 'mobile' ? 800 : bp === 'tablet' ? 1000 : 1200;
  const rotateX = bp === 'mobile' ? 6 : bp === 'tablet' ? 8 : 10;

  // === All positioning in pure % — consistent across all screen sizes ===
  // Dealer zone: top offset + height (% of container)
  const isDT = gameType === 'dragonTiger';
  const dealerTop = bp === 'mobile'
    ? (isDT ? '2%' : '5%')
    : bp === 'tablet'
      ? (isDT ? '1%' : '3%')
      : '0%';
  const dealerZoneHeight = bp === 'mobile' ? '42%' : '50%';
  // Table top overlaps with dealer zone bottom by a fixed % amount
  const tableTop = bp === 'mobile' ? '35%' : '38%';

  return (
    <div className="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-[#050a0d]">

      {/* === Opulent Art Deco Noir Casino Background === */}
      <div className="absolute inset-0 z-0 overflow-hidden">

        {/* Base: Deep noir gradient background - warm tones throughout to avoid dark bands */}
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom,
                #0a0806 0%,
                #0c0a08 10%,
                #0e0c0a 25%,
                #0c0a09 50%,
                #050a0d 100%
              )
            `,
          }}
        />

        {/* === Architectural Elements === */}

        {/* Ceiling coffer with Art Deco pattern - full width */}
        <div
          className="absolute top-0 left-0 right-0 h-[8px]"
          style={{
            background: `
              linear-gradient(to bottom,
                #d4af37 0%,
                #b8962f 20%,
                #8b7020 50%,
                #5a4a15 80%,
                #2a2210 100%
              )
            `,
            boxShadow: '0 4px 20px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        />

        {/* Art Deco geometric trim pattern - full width */}
        <svg className="absolute top-[8px] left-0 right-0 h-[12px] w-full" preserveAspectRatio="none" viewBox="0 0 100 10">
          <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d4af37" />
              <stop offset="50%" stopColor="#aa8a2a" />
              <stop offset="100%" stopColor="#705a1a" />
            </linearGradient>
          </defs>
          <path d="M0,10 L5,0 L10,10 L15,0 L20,10 L25,0 L30,10 L35,0 L40,10 L45,0 L50,10 L55,0 L60,10 L65,0 L70,10 L75,0 L80,10 L85,0 L90,10 L95,0 L100,10"
                fill="none" stroke="url(#goldGrad)" strokeWidth="1" opacity="0.6" />
        </svg>

        {/* === Crystal Chandelier Effect === */}
        <div className="absolute top-[1%] left-1/2 -translate-x-1/2 w-48 h-40 sm:w-56 sm:h-40">
          {/* Main chandelier glow */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 100% 80% at 50% 20%, rgba(255,248,220,0.25) 0%, transparent 50%),
                radial-gradient(ellipse 60% 50% at 50% 30%, rgba(255,215,0,0.15) 0%, transparent 40%)
              `,
            }}
          />
          {/* Crystal sparkles with staggered animation */}
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full animate-[crystalPulse_2s_ease-in-out_infinite]"
               style={{ boxShadow: '0 0 15px 5px rgba(255,255,255,0.8), 0 0 30px 10px rgba(255,215,0,0.4)' }} />
          <div className="absolute top-[25%] left-[25%] w-1 h-1 bg-white/90 rounded-full animate-[crystalPulse_2s_ease-in-out_infinite_0.3s]"
               style={{ boxShadow: '0 0 8px 3px rgba(255,255,255,0.6)' }} />
          <div className="absolute top-[25%] right-[25%] w-1 h-1 bg-white/90 rounded-full animate-[crystalPulse_2s_ease-in-out_infinite_0.6s]"
               style={{ boxShadow: '0 0 8px 3px rgba(255,255,255,0.6)' }} />
          <div className="absolute top-[35%] left-[35%] w-0.5 h-0.5 bg-white/70 rounded-full animate-[crystalPulse_2s_ease-in-out_infinite_0.9s]"
               style={{ boxShadow: '0 0 5px 2px rgba(255,255,255,0.5)' }} />
          <div className="absolute top-[35%] right-[35%] w-0.5 h-0.5 bg-white/70 rounded-full animate-[crystalPulse_2s_ease-in-out_infinite_1.2s]"
               style={{ boxShadow: '0 0 5px 2px rgba(255,255,255,0.5)' }} />
          <div className="absolute top-[20%] left-[45%] w-0.5 h-0.5 bg-[#ffd700]/60 rounded-full animate-[crystalPulse_2s_ease-in-out_infinite_1.5s]"
               style={{ boxShadow: '0 0 4px 1px rgba(255,215,0,0.4)' }} />
        </div>

        {/* === Dramatic Light Beams from Chandelier === */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[60%] sm:w-[400px] opacity-[0.07]"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,248,220,0.8) 0%, transparent 100%)',
            clipPath: 'polygon(40% 0%, 60% 0%, 80% 100%, 20% 100%)',
          }}
        />

        {/* === Luxurious Velvet Curtains === */}
        {/* Left Curtain */}
        <div className="absolute top-0 left-0 w-[14%] h-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(to right,
                  #1a0808 0%,
                  #3d1414 10%,
                  #4a1a1a 18%,
                  #3d1414 26%,
                  #4a1a1a 34%,
                  #3d1414 42%,
                  #2d0f0f 55%,
                  #1a0808 70%,
                  transparent 100%
                )
              `,
            }}
          />
          {/* Velvet sheen highlights */}
          <div className="absolute inset-0 opacity-20" style={{
            background: `
              repeating-linear-gradient(to right,
                transparent 0%,
                rgba(255,200,200,0.15) 3%,
                transparent 6%,
                transparent 12%
              )
            `
          }} />
          {/* Gold tassel tie */}
          <div className="absolute top-[22%] right-1 w-4 h-12 rounded-l-full hidden sm:block" style={{
            background: 'linear-gradient(to bottom, #f0d060, #d4af37, #aa8a2a, #d4af37, #f0d060)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.6), 0 0 15px rgba(212,175,55,0.3)'
          }}>
            {/* Tassel fringe */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-4" style={{
              background: 'repeating-linear-gradient(to right, #d4af37 0px, #d4af37 1px, transparent 1px, transparent 3px)',
            }} />
          </div>
        </div>

        {/* Right Curtain */}
        <div className="absolute top-0 right-0 w-[14%] h-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(to left,
                  #1a0808 0%,
                  #3d1414 10%,
                  #4a1a1a 18%,
                  #3d1414 26%,
                  #4a1a1a 34%,
                  #3d1414 42%,
                  #2d0f0f 55%,
                  #1a0808 70%,
                  transparent 100%
                )
              `,
            }}
          />
          {/* Velvet sheen highlights */}
          <div className="absolute inset-0 opacity-20" style={{
            background: `
              repeating-linear-gradient(to left,
                transparent 0%,
                rgba(255,200,200,0.15) 3%,
                transparent 6%,
                transparent 12%
              )
            `
          }} />
          {/* Gold tassel tie */}
          <div className="absolute top-[22%] left-1 w-4 h-12 rounded-r-full hidden sm:block" style={{
            background: 'linear-gradient(to bottom, #f0d060, #d4af37, #aa8a2a, #d4af37, #f0d060)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.6), 0 0 15px rgba(212,175,55,0.3)'
          }}>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3 h-4" style={{
              background: 'repeating-linear-gradient(to right, #d4af37 0px, #d4af37 1px, transparent 1px, transparent 3px)',
            }} />
          </div>
        </div>

        {/* === Art Deco Wall Panels === */}
        {/* Left panel with geometric pattern */}
        <div className="absolute top-[12%] left-[14%] w-[8%] h-[35%] hidden sm:block">
          <div className="absolute inset-0 border border-[#d4af37]/25 rounded-sm" />
          <div className="absolute inset-2 border border-[#d4af37]/15 rounded-sm" />
          {/* Inner diamond pattern */}
          <svg className="absolute inset-4 w-full h-full opacity-15" viewBox="0 0 40 60" preserveAspectRatio="none">
            <path d="M20,0 L40,30 L20,60 L0,30 Z" fill="none" stroke="#d4af37" strokeWidth="0.5" />
            <path d="M20,10 L32,30 L20,50 L8,30 Z" fill="none" stroke="#d4af37" strokeWidth="0.5" />
            <circle cx="20" cy="30" r="3" fill="#d4af37" opacity="0.3" />
          </svg>
        </div>

        {/* Right panel with geometric pattern */}
        <div className="absolute top-[12%] right-[14%] w-[8%] h-[35%] hidden sm:block">
          <div className="absolute inset-0 border border-[#d4af37]/25 rounded-sm" />
          <div className="absolute inset-2 border border-[#d4af37]/15 rounded-sm" />
          <svg className="absolute inset-4 w-full h-full opacity-15" viewBox="0 0 40 60" preserveAspectRatio="none">
            <path d="M20,0 L40,30 L20,60 L0,30 Z" fill="none" stroke="#d4af37" strokeWidth="0.5" />
            <path d="M20,10 L32,30 L20,50 L8,30 Z" fill="none" stroke="#d4af37" strokeWidth="0.5" />
            <circle cx="20" cy="30" r="3" fill="#d4af37" opacity="0.3" />
          </svg>
        </div>

        {/* === Ambient Lighting Effects === */}
        {/* Warm ambient glow from below (reflecting table light) */}
        <div
          className="absolute bottom-[35%] left-0 right-0 h-[25%] opacity-40"
          style={{
            background: 'linear-gradient(to top, rgba(180,140,80,0.12) 0%, transparent 100%)',
          }}
        />

        {/* Side wall sconce glow - left */}
        <div
          className="absolute top-[25%] left-[10%] w-16 h-24 opacity-30 hidden sm:block"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,200,100,0.4) 0%, transparent 70%)',
          }}
        />

        {/* Side wall sconce glow - right */}
        <div
          className="absolute top-[25%] right-[10%] w-16 h-24 opacity-30 hidden sm:block"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,200,100,0.4) 0%, transparent 70%)',
          }}
        />

        {/* === Atmospheric Particles === */}
        {/* Floating dust in light beams */}
        <div className="absolute top-[18%] left-[30%] w-1 h-1 rounded-full bg-[#ffd700]/25 blur-[1px] animate-[float_6s_ease-in-out_infinite]" />
        <div className="absolute top-[25%] left-[40%] w-0.5 h-0.5 rounded-full bg-white/20 blur-[0.5px] animate-[float_8s_ease-in-out_infinite_1s]" />
        <div className="absolute top-[15%] right-[35%] w-1 h-1 rounded-full bg-[#ffd700]/20 blur-[1px] animate-[float_7s_ease-in-out_infinite_2s]" />
        <div className="absolute top-[30%] right-[45%] w-0.5 h-0.5 rounded-full bg-white/15 blur-[0.5px] animate-[float_9s_ease-in-out_infinite_3s]" />
        <div className="absolute top-[22%] left-[50%] w-0.5 h-0.5 rounded-full bg-[#ffd700]/15 blur-[0.5px] animate-[float_5s_ease-in-out_infinite_0.5s]" />

        {/* === Cinematic Vignette === */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 85% 70% at 50% 35%, transparent 0%, rgba(0,0,0,0.5) 100%),
              linear-gradient(to bottom, transparent 60%, rgba(0,0,0,0.4) 100%)
            `,
          }}
        />

        {/* Film grain texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* === Dealer — absolute positioned, overlaps into table === */}
      <div
        className="absolute left-0 right-0 z-10 flex justify-center pointer-events-none"
        style={{ top: dealerTop, height: dealerZoneHeight }}
      >
        {/* Dramatic chandelier spotlight on dealer */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Main warm cone of light from chandelier */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-[380px] sm:w-[450px] sm:h-[500px]"
            style={{
              background: `
                radial-gradient(ellipse 70% 90% at 50% 0%, rgba(255,240,200,0.18) 0%, rgba(255,220,150,0.08) 40%, transparent 70%)
              `,
            }}
          />
          {/* Secondary rim light for depth */}
          <div
            className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[200px] h-[280px] sm:w-[320px] sm:h-[380px]"
            style={{
              background: 'radial-gradient(ellipse 80% 100% at 50% 10%, rgba(212,175,55,0.06) 0%, transparent 50%)',
            }}
          />
          {/* Soft fill light from below (table reflection) */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] sm:w-[400px] sm:h-[200px]"
            style={{
              background: 'radial-gradient(ellipse 100% 100% at 50% 100%, rgba(100,180,100,0.05) 0%, transparent 60%)',
            }}
          />
        </div>

        <DealerAvatar
          isDealing={isDealing}
          dealerName={dealerName}
          model={dealerModel}
        />
      </div>

      {/* === Table Surface — positioned below dealer with overlap === */}
      <div
        className="absolute left-0 right-0 bottom-0 z-20"
        style={{ top: tableTop }}
      >
        {/* Table edge — premium wood grain with gold inlay */}
        <div className="relative z-10 h-2 sm:h-3"
          style={{
            background: 'linear-gradient(to bottom, #c9a227 0%, #8b6914 15%, #5d3a0a 50%, #3a2210 100%)',
            borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
            boxShadow: 'inset 0 1px 0 rgba(255,215,0,0.3), inset 0 -1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {/* Gold highlight line */}
          <div
            className="absolute top-0 left-[5%] right-[5%] h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)' }}
          />
        </div>

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
            {/* Base felt layer with rich gradient */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse 80% 50% at 50% 30%, ${felt.from} 0%, transparent 70%),
                  linear-gradient(to bottom, ${felt.from} 0%, ${felt.via} 40%, ${felt.to} 100%)
                `,
                borderRadius: '0 0 50% 50% / 0 0 15% 15%',
              }}
            >
              {/* Baize felt fiber texture - horizontal */}
              <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      90deg,
                      transparent,
                      transparent 1px,
                      rgba(255,255,255,0.1) 1px,
                      rgba(255,255,255,0.1) 2px
                    )
                  `,
                  backgroundSize: '3px 100%',
                }}
              />

              {/* Baize felt fiber texture - diagonal weave */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      45deg,
                      transparent,
                      transparent 2px,
                      rgba(0,0,0,0.3) 2px,
                      rgba(0,0,0,0.3) 4px
                    )
                  `,
                }}
              />

              {/* Noise texture overlay for realism */}
              <div
                className="absolute inset-0 opacity-[0.15]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                }}
              />

              {/* Center spotlight glow */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(212,175,55,0.06) 0%, transparent 60%)',
                }}
              />

              {/* ——— Decorative Gold Trim ——— */}

              {/* Outer gold border with shadow */}
              <div
                className="absolute inset-2 sm:inset-3"
                style={{
                  borderRadius: '0 0 45% 45% / 0 0 12% 12%',
                  border: '2px solid transparent',
                  borderImage: 'linear-gradient(to bottom, rgba(212,175,55,0.5), rgba(139,107,20,0.3)) 1',
                  boxShadow: 'inset 0 0 20px rgba(0,0,0,0.3)',
                }}
              />

              {/* Inner decorative border */}
              <div
                className="absolute inset-4 sm:inset-6 border border-[#d4af37]/15"
                style={{ borderRadius: '0 0 42% 42% / 0 0 10% 10%' }}
              />

              {/* ——— Corner Ornaments ——— */}

              {/* Top-left corner ornament */}
              <svg className="absolute top-3 left-3 sm:top-5 sm:left-5 w-6 h-6 sm:w-10 sm:h-10 opacity-30" viewBox="0 0 40 40">
                <path d="M5 5 L15 5 L15 8 L8 8 L8 15 L5 15 Z" fill="#d4af37" />
                <circle cx="12" cy="12" r="2" fill="#d4af37" />
              </svg>

              {/* Top-right corner ornament */}
              <svg className="absolute top-3 right-3 sm:top-5 sm:right-5 w-6 h-6 sm:w-10 sm:h-10 opacity-30" viewBox="0 0 40 40">
                <path d="M35 5 L25 5 L25 8 L32 8 L32 15 L35 15 Z" fill="#d4af37" />
                <circle cx="28" cy="12" r="2" fill="#d4af37" />
              </svg>

              {/* ——— Center Table Logo/Emblem ——— */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.08] pointer-events-none">
                <svg className="w-24 h-24 sm:w-40 sm:h-40" viewBox="0 0 100 100">
                  {/* Outer ring */}
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#d4af37" strokeWidth="1" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#d4af37" strokeWidth="0.5" />

                  {/* Inner diamond pattern */}
                  <path d="M50 15 L75 50 L50 85 L25 50 Z" fill="none" stroke="#d4af37" strokeWidth="1" />
                  <path d="M50 25 L65 50 L50 75 L35 50 Z" fill="none" stroke="#d4af37" strokeWidth="0.5" />

                  {/* Center circle */}
                  <circle cx="50" cy="50" r="8" fill="#d4af37" opacity="0.3" />
                  <circle cx="50" cy="50" r="4" fill="#d4af37" opacity="0.5" />

                  {/* Cross lines */}
                  <line x1="50" y1="20" x2="50" y2="35" stroke="#d4af37" strokeWidth="1" />
                  <line x1="50" y1="65" x2="50" y2="80" stroke="#d4af37" strokeWidth="1" />
                  <line x1="20" y1="50" x2="35" y2="50" stroke="#d4af37" strokeWidth="1" />
                  <line x1="65" y1="50" x2="80" y2="50" stroke="#d4af37" strokeWidth="1" />
                </svg>
              </div>

              {/* ——— Side accent lines ——— */}
              <div
                className="absolute top-[20%] left-4 sm:left-8 w-[1px] h-[30%] opacity-20"
                style={{ background: 'linear-gradient(to bottom, transparent, #d4af37, transparent)' }}
              />
              <div
                className="absolute top-[20%] right-4 sm:right-8 w-[1px] h-[30%] opacity-20"
                style={{ background: 'linear-gradient(to bottom, transparent, #d4af37, transparent)' }}
              />
            </div>

            {/* Game content — flat transform for click targets */}
            <div className="absolute inset-0" style={{ transformStyle: 'flat' }}>
              {children}
            </div>
          </div>
        </div>

        {/* Bottom table edge — curved premium wood */}
        <div className="absolute bottom-0 left-0 right-0 h-2 sm:h-4 z-10"
          style={{
            background: 'linear-gradient(to bottom, #6b4423, #4a2c17, #2d1a0f)',
            borderRadius: '0 0 50% 50% / 0 0 100% 100%',
            boxShadow: 'inset 0 2px 4px rgba(139,107,20,0.2), 0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          {/* Wood grain texture hint */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 10px, rgba(0,0,0,0.3) 10px, rgba(0,0,0,0.3) 11px)',
              borderRadius: '0 0 50% 50% / 0 0 100% 100%',
            }}
          />
        </div>
      </div>
    </div>
  );
}
