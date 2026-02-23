import { memo } from 'react';
import { useBreakpoint } from '../../hooks/useBreakpoint';

interface CountdownTimerProps {
  timeRemaining: number;
  totalTime?: number;
  phase: string;
  hidden?: boolean;
}

function CountdownTimer({ timeRemaining, totalTime = 15, phase, hidden }: CountdownTimerProps) {
  const bp = useBreakpoint();
  const showTimer = phase === 'betting' && timeRemaining > 0 && !hidden;

  if (!showTimer) return null;

  // Responsive sizing
  const size = bp === 'mobile' ? 64 : bp === 'tablet' ? 85 : 110;
  const strokeWidth = bp === 'mobile' ? 4 : bp === 'tablet' ? 5 : 6;
  const fontSize1 = bp === 'mobile' ? '24px' : bp === 'tablet' ? '32px' : '38px';
  const fontSize2 = bp === 'mobile' ? '30px' : bp === 'tablet' ? '38px' : '46px';

  // Color based on time remaining
  let ringColor: string;
  let textColor: string;
  let glowColor: string;
  if (timeRemaining >= 6) {
    ringColor = '#22c55e';
    textColor = '#4ade80';
    glowColor = 'rgba(34, 197, 94, 0.3)';
  } else if (timeRemaining >= 4) {
    ringColor = '#eab308';
    textColor = '#facc15';
    glowColor = 'rgba(234, 179, 8, 0.3)';
  } else {
    ringColor = '#ef4444';
    textColor = '#f87171';
    glowColor = 'rgba(239, 68, 68, 0.4)';
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeRemaining / totalTime;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="absolute top-2 left-2 sm:top-3 sm:left-3 z-30"
      style={{ width: size, height: size }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ boxShadow: `0 0 15px ${glowColor}, 0 0 30px ${glowColor}` }}
      />
      <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm" />
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={ringColor} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-black tabular-nums"
          style={{
            fontSize: timeRemaining >= 10 ? fontSize1 : fontSize2,
            color: textColor,
            textShadow: `0 0 8px ${glowColor}`,
          }}
        >
          {timeRemaining}
        </span>
      </div>
    </div>
  );
}

export default memo(CountdownTimer);
