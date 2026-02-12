import { memo } from 'react';

interface CountdownTimerProps {
  timeRemaining: number;
  totalTime?: number;
  phase: string;
  hidden?: boolean;
}

function CountdownTimer({ timeRemaining, totalTime = 15, phase, hidden }: CountdownTimerProps) {
  const showTimer = phase === 'betting' && timeRemaining > 0 && !hidden;

  if (!showTimer) return null;

  // Color based on time remaining: 15-6 green, 5-4 yellow, 3-1 red
  let ringColor: string;
  let textColor: string;
  let glowColor: string;
  if (timeRemaining >= 6) {
    ringColor = '#22c55e'; // green-500
    textColor = '#4ade80'; // green-400
    glowColor = 'rgba(34, 197, 94, 0.3)';
  } else if (timeRemaining >= 4) {
    ringColor = '#eab308'; // yellow-500
    textColor = '#facc15'; // yellow-400
    glowColor = 'rgba(234, 179, 8, 0.3)';
  } else {
    ringColor = '#ef4444'; // red-500
    textColor = '#f87171'; // red-400
    glowColor = 'rgba(239, 68, 68, 0.4)';
  }

  // SVG circle parameters
  const size = 80;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = timeRemaining / totalTime;
  const dashOffset = circumference * (1 - progress);

  return (
    <div
      className="absolute top-3 left-3 z-30"
      style={{ width: size, height: size }}
    >
      {/* Glow background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
        }}
      />

      {/* Background circle */}
      <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm" />

      {/* SVG ring */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        style={{ transform: 'rotate(-90deg)' }}
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-out, stroke 0.3s ease' }}
        />
      </svg>

      {/* Number */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-black tabular-nums"
          style={{
            fontSize: timeRemaining >= 10 ? '28px' : '34px',
            color: textColor,
            textShadow: `0 0 10px ${glowColor}`,
          }}
        >
          {timeRemaining}
        </span>
      </div>
    </div>
  );
}

export default memo(CountdownTimer);
