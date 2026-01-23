// Dragon Tiger game logic
// Card representation (same as baccarat)
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string; // 'A', '2'-'10', 'J', 'Q', 'K'
  value: number; // 1-13 for Dragon Tiger (A=1 lowest, K=13 highest)
}

// Dragon Tiger result type
export type DragonTigerResult = 'dragon' | 'tiger' | 'tie';

// Dragon Tiger bet types
export type DragonTigerBetType =
  | 'dragon'
  | 'tiger'
  | 'dt_tie'
  | 'dt_suited_tie'
  | 'dragon_big'
  | 'dragon_small'
  | 'tiger_big'
  | 'tiger_small';

// Bet payouts for Dragon Tiger
export const DT_BET_PAYOUTS = {
  dragon: 1,           // 1:1
  tiger: 1,            // 1:1
  dt_tie: 8,           // 8:1
  dt_suited_tie: 50,   // 50:1
  dragon_big: 1,       // 1:1 (dragon card > 7)
  dragon_small: 1,     // 1:1 (dragon card < 7)
  tiger_big: 1,        // 1:1 (tiger card > 7)
  tiger_small: 1,      // 1:1 (tiger card < 7)
} as const;

// Create a single deck of cards with Dragon Tiger values
function createDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const deck: Card[] = [];

  for (const suit of suits) {
    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];
      // In Dragon Tiger: A=1, 2=2, ..., 10=10, J=11, Q=12, K=13
      const value = i + 1;
      deck.push({ suit, rank, value });
    }
  }

  return deck;
}

// Create and shuffle 8 decks (standard shoe)
export function createShoe(): Card[] {
  const shoe: Card[] = [];

  // Add 8 decks
  for (let i = 0; i < 8; i++) {
    shoe.push(...createDeck());
  }

  // Fisher-Yates shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }

  return shoe;
}

// Get card value for Dragon Tiger (A=1, 2-10=face value, J=11, Q=12, K=13)
export function getDTCardValue(rank: string): number {
  if (rank === 'A') return 1;
  if (rank === 'J') return 11;
  if (rank === 'Q') return 12;
  if (rank === 'K') return 13;
  return parseInt(rank);
}

// Round result interface
export interface DragonTigerRoundResult {
  dragonCard: Card;
  tigerCard: Card;
  dragonValue: number;
  tigerValue: number;
  result: DragonTigerResult;
  isSuitedTie: boolean;
}

// Play a complete Dragon Tiger round
export function playDragonTigerRound(shoe: Card[]): DragonTigerRoundResult {
  // Deal one card to Dragon and one to Tiger
  const dragonCard = shoe.pop()!;
  const tigerCard = shoe.pop()!;

  const dragonValue = dragonCard.value;
  const tigerValue = tigerCard.value;

  // Determine result
  let result: DragonTigerResult;
  if (dragonValue > tigerValue) {
    result = 'dragon';
  } else if (tigerValue > dragonValue) {
    result = 'tiger';
  } else {
    result = 'tie';
  }

  // Check for suited tie (same rank AND same suit)
  const isSuitedTie = result === 'tie' && dragonCard.suit === tigerCard.suit;

  return {
    dragonCard,
    tigerCard,
    dragonValue,
    tigerValue,
    result,
    isSuitedTie,
  };
}

// Bet result interface
export interface BetResult {
  won: boolean;
  payout: number; // Net payout (positive if won, negative if lost, 0 for push)
}

// Calculate bet result for Dragon Tiger
export function calculateDTBetResult(
  betType: DragonTigerBetType,
  betAmount: number,
  roundResult: DragonTigerRoundResult
): BetResult {
  const { result, isSuitedTie, dragonValue, tigerValue } = roundResult;

  switch (betType) {
    case 'dragon':
      if (result === 'dragon') {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dragon };
      } else if (result === 'tie') {
        // Tie: return half the bet (lose half)
        return { won: false, payout: -betAmount * 0.5 };
      }
      return { won: false, payout: -betAmount };

    case 'tiger':
      if (result === 'tiger') {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.tiger };
      } else if (result === 'tie') {
        // Tie: return half the bet (lose half)
        return { won: false, payout: -betAmount * 0.5 };
      }
      return { won: false, payout: -betAmount };

    case 'dt_tie':
      if (result === 'tie') {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dt_tie };
      }
      return { won: false, payout: -betAmount };

    case 'dt_suited_tie':
      if (isSuitedTie) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dt_suited_tie };
      }
      return { won: false, payout: -betAmount };

    case 'dragon_big':
      // Dragon card > 7
      if (dragonValue > 7) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dragon_big };
      }
      // If dragon value is exactly 7, it's a push (neither big nor small)
      if (dragonValue === 7) {
        return { won: false, payout: 0 };
      }
      return { won: false, payout: -betAmount };

    case 'dragon_small':
      // Dragon card < 7
      if (dragonValue < 7) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dragon_small };
      }
      // If dragon value is exactly 7, it's a push
      if (dragonValue === 7) {
        return { won: false, payout: 0 };
      }
      return { won: false, payout: -betAmount };

    case 'tiger_big':
      // Tiger card > 7
      if (tigerValue > 7) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.tiger_big };
      }
      // If tiger value is exactly 7, it's a push
      if (tigerValue === 7) {
        return { won: false, payout: 0 };
      }
      return { won: false, payout: -betAmount };

    case 'tiger_small':
      // Tiger card < 7
      if (tigerValue < 7) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.tiger_small };
      }
      // If tiger value is exactly 7, it's a push
      if (tigerValue === 7) {
        return { won: false, payout: 0 };
      }
      return { won: false, payout: -betAmount };

    default:
      return { won: false, payout: 0 };
  }
}
