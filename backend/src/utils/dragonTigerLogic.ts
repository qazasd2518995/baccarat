import { randomInt } from 'crypto';

// Dragon Tiger game logic
// Card representation (same as baccarat)
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string; // 'A', '2'-'10', 'J', 'Q', 'K'
  value: number; // 1-13 for Dragon Tiger (A=1 lowest, K=13 highest)
}

// Dragon Tiger result type
export type DragonTigerResult = 'dragon' | 'tiger' | 'tie';

// Dragon Tiger bet types (GoFun style: odd/even, red/black + big/small + suited tie)
export type DragonTigerBetType =
  | 'dragon'           // 龍 1:1
  | 'tiger'            // 虎 1:1
  | 'dt_tie'           // 和 1:8
  | 'dt_suited_tie'    // 同花和 50:1 (same rank AND same suit)
  | 'dragon_big'       // 龍大 1:1 (value 8-13, 7=loss)
  | 'dragon_small'     // 龍小 1:1 (value 1-6, 7=loss)
  | 'tiger_big'        // 虎大 1:1 (value 8-13, 7=loss)
  | 'tiger_small'      // 虎小 1:1 (value 1-6, 7=loss)
  | 'dragon_odd'       // 龍單 1:0.75 (牌點數為奇數)
  | 'dragon_even'      // 龍雙 1:1.05 (牌點數為偶數)
  | 'tiger_odd'        // 虎單 1:0.75
  | 'tiger_even'       // 虎雙 1:1.05
  | 'dragon_red'       // 龍紅 1:0.9 (紅心/方塊)
  | 'dragon_black'     // 龍黑 1:0.9 (黑桃/梅花)
  | 'tiger_red'        // 虎紅 1:0.9
  | 'tiger_black';     // 虎黑 1:0.9

// Bet payouts for Dragon Tiger (GoFun style)
export const DT_BET_PAYOUTS = {
  dragon: 1,           // 1:1
  tiger: 1,            // 1:1
  dt_tie: 8,           // 8:1
  dt_suited_tie: 50,   // 50:1
  dragon_big: 1,       // 1:1 (value 8-13, 7=loss)
  dragon_small: 1,     // 1:1 (value 1-6, 7=loss)
  tiger_big: 1,        // 1:1 (value 8-13, 7=loss)
  tiger_small: 1,      // 1:1 (value 1-6, 7=loss)
  dragon_odd: 0.75,    // 1:0.75
  dragon_even: 1.05,   // 1:1.05
  tiger_odd: 0.75,     // 1:0.75
  tiger_even: 1.05,    // 1:1.05
  dragon_red: 0.9,     // 1:0.9
  dragon_black: 0.9,   // 1:0.9
  tiger_red: 0.9,      // 1:0.9
  tiger_black: 0.9,    // 1:0.9
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
    const j = randomInt(i + 1);
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }

  return shoe;
}

// Burn cards from the shoe after shuffle (standard casino procedure)
export function burnCards(shoe: Card[]): void {
  if (shoe.length < 2) return;
  const firstCard = shoe.pop()!;
  // Burn N more cards where N = card value (face cards count as 10)
  const burnCount = firstCard.value >= 10 ? 10 : firstCard.value;
  for (let i = 0; i < burnCount && shoe.length > 0; i++) {
    shoe.pop();
  }
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

// Helper function to check if card suit is red (hearts/diamonds)
function isRedSuit(suit: Card['suit']): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

// Helper function to check if value is odd
function isOdd(value: number): boolean {
  return value % 2 === 1;
}

// Calculate bet result for Dragon Tiger (GoFun style)
export function calculateDTBetResult(
  betType: DragonTigerBetType,
  betAmount: number,
  roundResult: DragonTigerRoundResult
): BetResult {
  const { result, dragonCard, tigerCard, dragonValue, tigerValue } = roundResult;

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

    // 同花和 - Same rank AND same suit = 50:1
    case 'dt_suited_tie':
      if (roundResult.isSuitedTie) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dt_suited_tie };
      }
      return { won: false, payout: -betAmount };

    // 龍大 - Dragon value 8-13 wins, 7 = house wins
    case 'dragon_big':
      if (dragonValue === 7) return { won: false, payout: -betAmount };
      if (dragonValue >= 8 && dragonValue <= 13) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dragon_big };
      }
      return { won: false, payout: -betAmount };

    // 龍小 - Dragon value 1-6 wins, 7 = house wins
    case 'dragon_small':
      if (dragonValue === 7) return { won: false, payout: -betAmount };
      if (dragonValue >= 1 && dragonValue <= 6) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dragon_small };
      }
      return { won: false, payout: -betAmount };

    // 虎大 - Tiger value 8-13 wins, 7 = house wins
    case 'tiger_big':
      if (tigerValue === 7) return { won: false, payout: -betAmount };
      if (tigerValue >= 8 && tigerValue <= 13) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.tiger_big };
      }
      return { won: false, payout: -betAmount };

    // 虎小 - Tiger value 1-6 wins, 7 = house wins
    case 'tiger_small':
      if (tigerValue === 7) return { won: false, payout: -betAmount };
      if (tigerValue >= 1 && tigerValue <= 6) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.tiger_small };
      }
      return { won: false, payout: -betAmount };

    // 龍單 - Dragon card value is odd (1, 3, 5, 7, 9, 11, 13)
    case 'dragon_odd':
      if (isOdd(dragonValue)) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dragon_odd };
      }
      return { won: false, payout: -betAmount };

    // 龍雙 - Dragon card value is even (2, 4, 6, 8, 10, 12)
    case 'dragon_even':
      if (!isOdd(dragonValue)) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dragon_even };
      }
      return { won: false, payout: -betAmount };

    // 虎單 - Tiger card value is odd
    case 'tiger_odd':
      if (isOdd(tigerValue)) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.tiger_odd };
      }
      return { won: false, payout: -betAmount };

    // 虎雙 - Tiger card value is even
    case 'tiger_even':
      if (!isOdd(tigerValue)) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.tiger_even };
      }
      return { won: false, payout: -betAmount };

    // 龍紅 - Dragon card is red (hearts/diamonds)
    case 'dragon_red':
      if (isRedSuit(dragonCard.suit)) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dragon_red };
      }
      return { won: false, payout: -betAmount };

    // 龍黑 - Dragon card is black (spades/clubs)
    case 'dragon_black':
      if (!isRedSuit(dragonCard.suit)) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.dragon_black };
      }
      return { won: false, payout: -betAmount };

    // 虎紅 - Tiger card is red
    case 'tiger_red':
      if (isRedSuit(tigerCard.suit)) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.tiger_red };
      }
      return { won: false, payout: -betAmount };

    // 虎黑 - Tiger card is black
    case 'tiger_black':
      if (!isRedSuit(tigerCard.suit)) {
        return { won: true, payout: betAmount * DT_BET_PAYOUTS.tiger_black };
      }
      return { won: false, payout: -betAmount };

    default:
      return { won: false, payout: 0 };
  }
}
