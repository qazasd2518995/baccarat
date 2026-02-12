import { memo, useId } from 'react';

export function formatChipValue(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return k >= 1000 ? `${k / 1000}M` : `${k}K`;
  }
  return value.toString();
}

// Map chip values to solid hex colors for SVG rendering
export const CHIP_COLORS: Record<number, { base: string; dark: string; light: string; stripe: string }> = {
  10:     { base: '#94a3b8', dark: '#64748b', light: '#cbd5e1', stripe: '#e2e8f0' },
  50:     { base: '#22c55e', dark: '#16a34a', light: '#4ade80', stripe: '#bbf7d0' },
  100:    { base: '#ef4444', dark: '#dc2626', light: '#f87171', stripe: '#fecaca' },
  500:    { base: '#a855f7', dark: '#9333ea', light: '#c084fc', stripe: '#e9d5ff' },
  1000:   { base: '#f59e0b', dark: '#d97706', light: '#fbbf24', stripe: '#fef3c7' },
  5000:   { base: '#06b6d4', dark: '#0891b2', light: '#22d3ee', stripe: '#cffafe' },
  10000:  { base: '#d946ef', dark: '#c026d3', light: '#e879f9', stripe: '#fae8ff' },
  20000:  { base: '#f43f5e', dark: '#e11d48', light: '#fb7185', stripe: '#ffe4e6' },
  50000:  { base: '#6366f1', dark: '#4f46e5', light: '#818cf8', stripe: '#e0e7ff' },
  100000: { base: '#eab308', dark: '#ca8a04', light: '#facc15', stripe: '#fef9c3' },
};

const DEFAULT_COLOR = { base: '#94a3b8', dark: '#64748b', light: '#cbd5e1', stripe: '#e2e8f0' };

interface CasinoChipProps {
  size?: number;
  value?: number;
  color?: { base: string; dark: string; light: string; stripe: string };
  label?: string;
  className?: string;
}

function CasinoChipInner({ size = 48, value, color, label, className }: CasinoChipProps) {
  const uid = useId();
  const c = color || (value ? CHIP_COLORS[value] : undefined) || DEFAULT_COLOR;
  const r = size / 2;
  const edgeR = r - 1;     // edge decoration radius
  const innerR = r * 0.65; // inner dashed circle
  const centerR = r * 0.42; // center circle

  // 8 edge stripe bars evenly spaced
  const stripeCount = 8;
  const stripeWidth = size * 0.1;
  const stripeHeight = size * 0.16;
  const glossId = `gloss-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ display: 'block' }}
    >
      <defs>
        {/* Glossy gradient */}
        <radialGradient id={glossId} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.35" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Shadow */}
      <circle cx={r} cy={r + 1} r={r - 1} fill="rgba(0,0,0,0.3)" />

      {/* Base circle */}
      <circle cx={r} cy={r} r={edgeR} fill={c.base} />

      {/* Outer ring */}
      <circle cx={r} cy={r} r={edgeR} fill="none" stroke={c.dark} strokeWidth={1.5} />

      {/* Edge stripe decorations — 8 groups around the perimeter */}
      {Array.from({ length: stripeCount }, (_, i) => {
        const angle = (i * 360) / stripeCount;
        return (
          <rect
            key={i}
            x={r - stripeWidth / 2}
            y={1}
            width={stripeWidth}
            height={stripeHeight}
            rx={stripeWidth * 0.3}
            fill={c.stripe}
            opacity={0.85}
            transform={`rotate(${angle} ${r} ${r})`}
          />
        );
      })}

      {/* Inner ring (dashed) */}
      <circle
        cx={r}
        cy={r}
        r={innerR}
        fill="none"
        stroke={c.light}
        strokeWidth={1}
        strokeDasharray={`${size * 0.06} ${size * 0.04}`}
        opacity={0.6}
      />

      {/* Center filled circle */}
      <circle cx={r} cy={r} r={centerR} fill={c.dark} />
      <circle cx={r} cy={r} r={centerR} fill="none" stroke={c.light} strokeWidth={0.8} opacity={0.5} />

      {/* Center diamond decoration (when no label) */}
      {!label && (
        <g opacity={0.5}>
          <polygon
            points={`${r},${r - size * 0.1} ${r + size * 0.06},${r} ${r},${r + size * 0.1} ${r - size * 0.06},${r}`}
            fill={c.light}
          />
        </g>
      )}

      {/* Label text */}
      {label && (
        <text
          x={r}
          y={r}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={size * 0.24}
          fontWeight="900"
          style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
        >
          {label}
        </text>
      )}

      {/* Glossy overlay */}
      <circle cx={r} cy={r} r={edgeR} fill={`url(#${glossId})`} />
    </svg>
  );
}

export default memo(CasinoChipInner);
