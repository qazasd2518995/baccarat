import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { Card } from '../../types';
import PlayingCard from './PlayingCard';

interface AnimatedPlayingCardProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
  /** Starting position for fly-in animation relative to card's final position */
  flyFrom?: { x: number; y: number };
  /** Delay before fly-in starts (seconds) */
  flyDelay?: number;
  /** Duration of fly-in animation (seconds) */
  flyDuration?: number;
  /** Delay after fly-in before flip starts (seconds) */
  flipDelay?: number;
  /** Duration of flip animation (seconds) */
  flipDuration?: number;
  /** Z-axis rotation in degrees (for third cards) */
  rotation?: number;
  /** Whether to show a pulsing glow effect */
  glowing?: boolean;
  /** Color of the glow effect */
  glowColor?: string;
  /** Skip all animations (for reconnection/mid-join) */
  skipAnimation?: boolean;
  /** Callback when flip animation completes */
  onFlipComplete?: () => void;
}

const SIZES = {
  sm: { width: 50, height: 70 },
  md: { width: 65, height: 91 },
  lg: { width: 80, height: 112 },
};

export default function AnimatedPlayingCard({
  card,
  size = 'md',
  flyFrom,
  flyDelay = 0,
  flyDuration = 0.5,
  flipDelay = 0.5,
  flipDuration = 0.6,
  rotation = 0,
  glowing = false,
  glowColor = 'rgba(212, 175, 55, 0.6)',
  skipAnimation = false,
  onFlipComplete,
}: AnimatedPlayingCardProps) {
  const sizeConfig = SIZES[size];
  const [flipped, setFlipped] = useState(skipAnimation);
  const totalFlipDelay = flyDelay + flyDuration + flipDelay;

  useEffect(() => {
    if (skipAnimation) {
      setFlipped(true);
      return;
    }
    const timer = setTimeout(() => {
      setFlipped(true);
    }, totalFlipDelay * 1000);
    return () => clearTimeout(timer);
  }, [totalFlipDelay, skipAnimation]);

  const handleFlipAnimationComplete = () => {
    if (flipped && onFlipComplete) {
      onFlipComplete();
    }
  };

  if (skipAnimation) {
    return (
      <div
        className={glowing ? 'card-glow' : ''}
        style={{
          width: sizeConfig.width,
          height: sizeConfig.height,
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          '--glow-color': glowColor,
        } as React.CSSProperties}
      >
        <PlayingCard card={card} size={size} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        x: flyFrom?.x ?? 0,
        y: flyFrom?.y ?? -100,
        scale: 0.3,
        opacity: 0,
        rotateZ: rotation,
      }}
      animate={{
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        rotateZ: rotation,
      }}
      transition={{
        delay: flyDelay,
        duration: flyDuration,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className={glowing ? 'card-glow' : ''}
      style={{
        perspective: 800,
        width: sizeConfig.width,
        height: sizeConfig.height,
        '--glow-color': glowColor,
      } as React.CSSProperties}
    >
      {/* 3D Flip Container */}
      <motion.div
        animate={{ rotateY: flipped ? 0 : 180 }}
        initial={{ rotateY: 180 }}
        transition={{
          duration: flipDuration,
          ease: [0.4, 0, 0.2, 1],
        }}
        onAnimationComplete={handleFlipAnimationComplete}
        style={{
          transformStyle: 'preserve-3d',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Front face (card image) */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
        >
          <PlayingCard card={card} size={size} />
        </div>

        {/* Back face (card back) */}
        <div
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            position: 'absolute',
            width: '100%',
            height: '100%',
          }}
        >
          <PlayingCard card={{ suit: 'spades', rank: 'A', value: 1 }} faceDown size={size} />
        </div>
      </motion.div>
    </motion.div>
  );
}
