import { motion } from 'framer-motion';
import type { Card } from '../../types';

// Import all card SVGs
import ace_of_hearts from '../../assets/cards/ace_of_hearts.svg';
import ace_of_diamonds from '../../assets/cards/ace_of_diamonds.svg';
import ace_of_clubs from '../../assets/cards/ace_of_clubs.svg';
import ace_of_spades from '../../assets/cards/ace_of_spades.svg';
import two_of_hearts from '../../assets/cards/2_of_hearts.svg';
import two_of_diamonds from '../../assets/cards/2_of_diamonds.svg';
import two_of_clubs from '../../assets/cards/2_of_clubs.svg';
import two_of_spades from '../../assets/cards/2_of_spades.svg';
import three_of_hearts from '../../assets/cards/3_of_hearts.svg';
import three_of_diamonds from '../../assets/cards/3_of_diamonds.svg';
import three_of_clubs from '../../assets/cards/3_of_clubs.svg';
import three_of_spades from '../../assets/cards/3_of_spades.svg';
import four_of_hearts from '../../assets/cards/4_of_hearts.svg';
import four_of_diamonds from '../../assets/cards/4_of_diamonds.svg';
import four_of_clubs from '../../assets/cards/4_of_clubs.svg';
import four_of_spades from '../../assets/cards/4_of_spades.svg';
import five_of_hearts from '../../assets/cards/5_of_hearts.svg';
import five_of_diamonds from '../../assets/cards/5_of_diamonds.svg';
import five_of_clubs from '../../assets/cards/5_of_clubs.svg';
import five_of_spades from '../../assets/cards/5_of_spades.svg';
import six_of_hearts from '../../assets/cards/6_of_hearts.svg';
import six_of_diamonds from '../../assets/cards/6_of_diamonds.svg';
import six_of_clubs from '../../assets/cards/6_of_clubs.svg';
import six_of_spades from '../../assets/cards/6_of_spades.svg';
import seven_of_hearts from '../../assets/cards/7_of_hearts.svg';
import seven_of_diamonds from '../../assets/cards/7_of_diamonds.svg';
import seven_of_clubs from '../../assets/cards/7_of_clubs.svg';
import seven_of_spades from '../../assets/cards/7_of_spades.svg';
import eight_of_hearts from '../../assets/cards/8_of_hearts.svg';
import eight_of_diamonds from '../../assets/cards/8_of_diamonds.svg';
import eight_of_clubs from '../../assets/cards/8_of_clubs.svg';
import eight_of_spades from '../../assets/cards/8_of_spades.svg';
import nine_of_hearts from '../../assets/cards/9_of_hearts.svg';
import nine_of_diamonds from '../../assets/cards/9_of_diamonds.svg';
import nine_of_clubs from '../../assets/cards/9_of_clubs.svg';
import nine_of_spades from '../../assets/cards/9_of_spades.svg';
import ten_of_hearts from '../../assets/cards/10_of_hearts.svg';
import ten_of_diamonds from '../../assets/cards/10_of_diamonds.svg';
import ten_of_clubs from '../../assets/cards/10_of_clubs.svg';
import ten_of_spades from '../../assets/cards/10_of_spades.svg';
import jack_of_hearts from '../../assets/cards/jack_of_hearts.svg';
import jack_of_diamonds from '../../assets/cards/jack_of_diamonds.svg';
import jack_of_clubs from '../../assets/cards/jack_of_clubs.svg';
import jack_of_spades from '../../assets/cards/jack_of_spades.svg';
import queen_of_hearts from '../../assets/cards/queen_of_hearts.svg';
import queen_of_diamonds from '../../assets/cards/queen_of_diamonds.svg';
import queen_of_clubs from '../../assets/cards/queen_of_clubs.svg';
import queen_of_spades from '../../assets/cards/queen_of_spades.svg';
import king_of_hearts from '../../assets/cards/king_of_hearts.svg';
import king_of_diamonds from '../../assets/cards/king_of_diamonds.svg';
import king_of_clubs from '../../assets/cards/king_of_clubs.svg';
import king_of_spades from '../../assets/cards/king_of_spades.svg';

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
}

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

// Size configurations (maintaining 2.5:3.5 poker card ratio)
export const SIZES = {
  xs: { width: 36, height: 50 },
  sm: { width: 50, height: 70 },
  md: { width: 65, height: 91 },
  lg: { width: 80, height: 112 },
  xl: { width: 120, height: 168 },
  xxl: { width: 160, height: 224 },
};

// Card image mapping
const CARD_IMAGES: Record<string, string> = {
  // Hearts
  'A_hearts': ace_of_hearts,
  '2_hearts': two_of_hearts,
  '3_hearts': three_of_hearts,
  '4_hearts': four_of_hearts,
  '5_hearts': five_of_hearts,
  '6_hearts': six_of_hearts,
  '7_hearts': seven_of_hearts,
  '8_hearts': eight_of_hearts,
  '9_hearts': nine_of_hearts,
  '10_hearts': ten_of_hearts,
  'J_hearts': jack_of_hearts,
  'Q_hearts': queen_of_hearts,
  'K_hearts': king_of_hearts,
  // Diamonds
  'A_diamonds': ace_of_diamonds,
  '2_diamonds': two_of_diamonds,
  '3_diamonds': three_of_diamonds,
  '4_diamonds': four_of_diamonds,
  '5_diamonds': five_of_diamonds,
  '6_diamonds': six_of_diamonds,
  '7_diamonds': seven_of_diamonds,
  '8_diamonds': eight_of_diamonds,
  '9_diamonds': nine_of_diamonds,
  '10_diamonds': ten_of_diamonds,
  'J_diamonds': jack_of_diamonds,
  'Q_diamonds': queen_of_diamonds,
  'K_diamonds': king_of_diamonds,
  // Clubs
  'A_clubs': ace_of_clubs,
  '2_clubs': two_of_clubs,
  '3_clubs': three_of_clubs,
  '4_clubs': four_of_clubs,
  '5_clubs': five_of_clubs,
  '6_clubs': six_of_clubs,
  '7_clubs': seven_of_clubs,
  '8_clubs': eight_of_clubs,
  '9_clubs': nine_of_clubs,
  '10_clubs': ten_of_clubs,
  'J_clubs': jack_of_clubs,
  'Q_clubs': queen_of_clubs,
  'K_clubs': king_of_clubs,
  // Spades
  'A_spades': ace_of_spades,
  '2_spades': two_of_spades,
  '3_spades': three_of_spades,
  '4_spades': four_of_spades,
  '5_spades': five_of_spades,
  '6_spades': six_of_spades,
  '7_spades': seven_of_spades,
  '8_spades': eight_of_spades,
  '9_spades': nine_of_spades,
  '10_spades': ten_of_spades,
  'J_spades': jack_of_spades,
  'Q_spades': queen_of_spades,
  'K_spades': king_of_spades,
};

// Get card image URL
export function getCardImage(rank: string, suit: Suit): string {
  const key = `${rank}_${suit}`;
  return CARD_IMAGES[key] || ace_of_spades; // fallback
}

// Card Back Component
export function CardBack({ width, height }: { width: number; height: number }) {
  const patternId = `backPattern-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      className="rounded-lg shadow-xl overflow-hidden"
      style={{ width, height }}
    >
      <svg viewBox="0 0 169 245" className="w-full h-full">
        {/* Deep blue background */}
        <rect width="169" height="245" fill="#1e3a5f" rx="8" />

        {/* Inner background */}
        <rect x="8" y="8" width="153" height="229" fill="#0f2744" rx="6" />

        {/* Gold border */}
        <rect
          x="12" y="12" width="145" height="221" rx="5"
          fill="none" stroke="#d4af37" strokeWidth="2"
        />

        {/* Inner decorative border */}
        <rect
          x="18" y="18" width="133" height="209" rx="4"
          fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.5"
        />

        {/* Diamond pattern */}
        <defs>
          <pattern id={patternId} width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M8 0L16 8L8 16L0 8Z" fill="#d4af37" opacity="0.15" />
          </pattern>
        </defs>
        <rect x="20" y="20" width="129" height="205" fill={`url(#${patternId})`} rx="3" />

        {/* Center ornament */}
        <g transform="translate(84.5, 122.5)">
          {/* Outer ring */}
          <circle cx="0" cy="0" r="35" fill="none" stroke="#d4af37" strokeWidth="2" />
          <circle cx="0" cy="0" r="28" fill="none" stroke="#d4af37" strokeWidth="1" opacity="0.7" />

          {/* Inner diamond */}
          <path d="M0 -22L15 0L0 22L-15 0Z" fill="#d4af37" opacity="0.3" />
          <path d="M0 -22L15 0L0 22L-15 0Z" fill="none" stroke="#d4af37" strokeWidth="1.5" />

          {/* Center dot */}
          <circle cx="0" cy="0" r="8" fill="#d4af37" opacity="0.5" />
          <circle cx="0" cy="0" r="4" fill="#d4af37" />

          {/* Decorative lines */}
          <path d="M-28 0L-20 0M20 0L28 0M0 -28L0 -20M0 20L0 28" stroke="#d4af37" strokeWidth="2" />
        </g>

        {/* Corner decorations */}
        <g opacity="0.6">
          <circle cx="30" cy="30" r="4" fill="#d4af37" />
          <circle cx="139" cy="30" r="4" fill="#d4af37" />
          <circle cx="30" cy="215" r="4" fill="#d4af37" />
          <circle cx="139" cy="215" r="4" fill="#d4af37" />
        </g>
      </svg>
    </div>
  );
}

// Main PlayingCard Component
export default function PlayingCard({ card, faceDown, size = 'md' }: PlayingCardProps) {
  const sizeConfig = SIZES[size];

  if (faceDown) {
    return <CardBack width={sizeConfig.width} height={sizeConfig.height} />;
  }

  const cardImage = getCardImage(card.rank, card.suit as Suit);

  return (
    <motion.div
      className="rounded-lg shadow-xl overflow-hidden bg-white"
      style={{ width: sizeConfig.width, height: sizeConfig.height }}
      whileHover={{ y: -2, scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <img
        src={cardImage}
        alt={`${card.rank} of ${card.suit}`}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </motion.div>
  );
}
