import type { Card } from '../types';

// Import all card SVGs
import ace_of_hearts from '../assets/cards/ace_of_hearts.svg';
import ace_of_diamonds from '../assets/cards/ace_of_diamonds.svg';
import ace_of_clubs from '../assets/cards/ace_of_clubs.svg';
import ace_of_spades from '../assets/cards/ace_of_spades.svg';
import two_of_hearts from '../assets/cards/2_of_hearts.svg';
import two_of_diamonds from '../assets/cards/2_of_diamonds.svg';
import two_of_clubs from '../assets/cards/2_of_clubs.svg';
import two_of_spades from '../assets/cards/2_of_spades.svg';
import three_of_hearts from '../assets/cards/3_of_hearts.svg';
import three_of_diamonds from '../assets/cards/3_of_diamonds.svg';
import three_of_clubs from '../assets/cards/3_of_clubs.svg';
import three_of_spades from '../assets/cards/3_of_spades.svg';
import four_of_hearts from '../assets/cards/4_of_hearts.svg';
import four_of_diamonds from '../assets/cards/4_of_diamonds.svg';
import four_of_clubs from '../assets/cards/4_of_clubs.svg';
import four_of_spades from '../assets/cards/4_of_spades.svg';
import five_of_hearts from '../assets/cards/5_of_hearts.svg';
import five_of_diamonds from '../assets/cards/5_of_diamonds.svg';
import five_of_clubs from '../assets/cards/5_of_clubs.svg';
import five_of_spades from '../assets/cards/5_of_spades.svg';
import six_of_hearts from '../assets/cards/6_of_hearts.svg';
import six_of_diamonds from '../assets/cards/6_of_diamonds.svg';
import six_of_clubs from '../assets/cards/6_of_clubs.svg';
import six_of_spades from '../assets/cards/6_of_spades.svg';
import seven_of_hearts from '../assets/cards/7_of_hearts.svg';
import seven_of_diamonds from '../assets/cards/7_of_diamonds.svg';
import seven_of_clubs from '../assets/cards/7_of_clubs.svg';
import seven_of_spades from '../assets/cards/7_of_spades.svg';
import eight_of_hearts from '../assets/cards/8_of_hearts.svg';
import eight_of_diamonds from '../assets/cards/8_of_diamonds.svg';
import eight_of_clubs from '../assets/cards/8_of_clubs.svg';
import eight_of_spades from '../assets/cards/8_of_spades.svg';
import nine_of_hearts from '../assets/cards/9_of_hearts.svg';
import nine_of_diamonds from '../assets/cards/9_of_diamonds.svg';
import nine_of_clubs from '../assets/cards/9_of_clubs.svg';
import nine_of_spades from '../assets/cards/9_of_spades.svg';
import ten_of_hearts from '../assets/cards/10_of_hearts.svg';
import ten_of_diamonds from '../assets/cards/10_of_diamonds.svg';
import ten_of_clubs from '../assets/cards/10_of_clubs.svg';
import ten_of_spades from '../assets/cards/10_of_spades.svg';
import jack_of_hearts from '../assets/cards/jack_of_hearts.svg';
import jack_of_diamonds from '../assets/cards/jack_of_diamonds.svg';
import jack_of_clubs from '../assets/cards/jack_of_clubs.svg';
import jack_of_spades from '../assets/cards/jack_of_spades.svg';
import queen_of_hearts from '../assets/cards/queen_of_hearts.svg';
import queen_of_diamonds from '../assets/cards/queen_of_diamonds.svg';
import queen_of_clubs from '../assets/cards/queen_of_clubs.svg';
import queen_of_spades from '../assets/cards/queen_of_spades.svg';
import king_of_hearts from '../assets/cards/king_of_hearts.svg';
import king_of_diamonds from '../assets/cards/king_of_diamonds.svg';
import king_of_clubs from '../assets/cards/king_of_clubs.svg';
import king_of_spades from '../assets/cards/king_of_spades.svg';

interface PlayingCardProps {
  card: Card;
  size?: 'sm' | 'md' | 'lg';
}

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

// Size configurations (maintaining 2.5:3.5 poker card ratio)
const SIZES = {
  sm: { width: 40, height: 56 },
  md: { width: 50, height: 70 },
  lg: { width: 65, height: 91 },
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
function getCardImage(rank: string, suit: Suit): string {
  const key = `${rank}_${suit}`;
  return CARD_IMAGES[key] || ace_of_spades; // fallback
}

// Main PlayingCard Component
export default function PlayingCard({ card, size = 'md' }: PlayingCardProps) {
  const sizeConfig = SIZES[size];
  const cardImage = getCardImage(card.rank, card.suit as Suit);

  return (
    <div
      className="rounded-md shadow-lg overflow-hidden bg-white"
      style={{ width: sizeConfig.width, height: sizeConfig.height }}
    >
      <img
        src={cardImage}
        alt={`${card.rank} of ${card.suit}`}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </div>
  );
}

// CardGroup component for displaying a hand
interface CardGroupProps {
  cards: Card[];
  points: number;
  label: string;
  color: 'blue' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

export function CardGroup({ cards, points, label, color, size = 'sm' }: CardGroupProps) {
  const bgColor = color === 'blue' ? 'bg-blue-500/10' : 'bg-red-500/10';
  const borderColor = color === 'blue' ? 'border-blue-500/30' : 'border-red-500/30';
  const textColor = color === 'blue' ? 'text-blue-400' : 'text-red-400';
  const pointsBg = color === 'blue' ? 'bg-blue-500' : 'bg-red-500';

  return (
    <div className={`${bgColor} ${borderColor} border rounded-lg p-2`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`${textColor} text-xs font-medium`}>{label}</span>
        <span className={`${pointsBg} text-white text-xs font-bold px-1.5 py-0.5 rounded`}>
          {points}点
        </span>
      </div>
      <div className="flex gap-1">
        {cards.map((card, index) => (
          <PlayingCard key={index} card={card} size={size} />
        ))}
      </div>
    </div>
  );
}
