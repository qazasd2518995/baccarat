// Card representation
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string; // 'A', '2'-'10', 'J', 'Q', 'K'
  value: number; // 0-9
}

// Game result type
export type GameResult = 'player' | 'banker' | 'tie';

// Bet types and their payouts (standard with commission)
export const BET_PAYOUTS = {
  player: 1,
  banker: 0.95, // 5% commission
  tie: 8,
  player_pair: 11,
  banker_pair: 11,
  super_six_2cards: 12,
  super_six_3cards: 20,
} as const;

// No commission payouts
export const BET_PAYOUTS_NO_COMMISSION = {
  player: 1,
  banker: 1, // No commission - 1:1
  banker_six: 0.5, // Banker wins with 6 points - 1:0.5
  tie: 8,
  player_pair: 11,
  banker_pair: 11,
  super_six_2cards: 12,
  super_six_3cards: 20,
} as const;

// Create a single deck of cards
function createDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      let value: number;
      if (rank === 'A') {
        value = 1;
      } else if (['10', 'J', 'Q', 'K'].includes(rank)) {
        value = 0;
      } else {
        value = parseInt(rank);
      }
      deck.push({ suit, rank, value });
    }
  }

  return deck;
}

// Create and shuffle 8 decks (standard baccarat shoe)
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

// Calculate hand points (sum mod 10)
export function calculatePoints(cards: Card[]): number {
  const sum = cards.reduce((total, card) => total + card.value, 0);
  return sum % 10;
}

// Check if hand is a natural (8 or 9)
export function isNatural(points: number): boolean {
  return points === 8 || points === 9;
}

// Check if cards form a pair
export function isPair(cards: Card[]): boolean {
  if (cards.length < 2) return false;
  return cards[0].rank === cards[1].rank;
}

// Determine if player needs to draw third card
export function playerShouldDraw(playerPoints: number): boolean {
  return playerPoints <= 5;
}

// Determine if banker needs to draw third card
export function bankerShouldDraw(
  bankerPoints: number,
  playerThirdCard: Card | null
): boolean {
  // If player stood (didn't draw), banker draws on 0-5
  if (!playerThirdCard) {
    return bankerPoints <= 5;
  }

  const playerThirdValue = playerThirdCard.value;

  switch (bankerPoints) {
    case 0:
    case 1:
    case 2:
      return true;
    case 3:
      return playerThirdValue !== 8;
    case 4:
      return playerThirdValue >= 2 && playerThirdValue <= 7;
    case 5:
      return playerThirdValue >= 4 && playerThirdValue <= 7;
    case 6:
      return playerThirdValue === 6 || playerThirdValue === 7;
    case 7:
      return false;
    default:
      return false;
  }
}

// Play a complete round
export interface RoundResult {
  playerCards: Card[];
  bankerCards: Card[];
  playerPoints: number;
  bankerPoints: number;
  result: GameResult;
  playerPair: boolean;
  bankerPair: boolean;
}

export function playRound(shoe: Card[]): RoundResult {
  // Deal initial cards: Player, Banker, Player, Banker
  const playerCards: Card[] = [shoe.pop()!, shoe.pop()!];
  const bankerCards: Card[] = [shoe.pop()!, shoe.pop()!];

  // Swap to correct order (1st and 3rd to player, 2nd and 4th to banker)
  [playerCards[1], bankerCards[0]] = [bankerCards[0], playerCards[1]];

  let playerPoints = calculatePoints(playerCards);
  let bankerPoints = calculatePoints(bankerCards);

  const playerPair = isPair(playerCards);
  const bankerPair = isPair(bankerCards);

  // Check for naturals
  if (!isNatural(playerPoints) && !isNatural(bankerPoints)) {
    // Player's third card logic
    let playerThirdCard: Card | null = null;

    if (playerShouldDraw(playerPoints)) {
      playerThirdCard = shoe.pop()!;
      playerCards.push(playerThirdCard);
      playerPoints = calculatePoints(playerCards);
    }

    // Banker's third card logic
    if (bankerShouldDraw(bankerPoints, playerThirdCard)) {
      bankerCards.push(shoe.pop()!);
      bankerPoints = calculatePoints(bankerCards);
    }
  }

  // Determine winner
  let result: GameResult;
  if (playerPoints > bankerPoints) {
    result = 'player';
  } else if (bankerPoints > playerPoints) {
    result = 'banker';
  } else {
    result = 'tie';
  }

  return {
    playerCards,
    bankerCards,
    playerPoints,
    bankerPoints,
    result,
    playerPair,
    bankerPair,
  };
}

// Calculate payout for a bet
export interface BetResult {
  won: boolean;
  payout: number; // Net payout (0 if lost, positive if won)
}

export interface CalculateBetOptions {
  isNoCommission?: boolean;
}

export function calculateBetResult(
  betType: string,
  betAmount: number,
  roundResult: RoundResult,
  options: CalculateBetOptions = {}
): BetResult {
  const { result, playerPair, bankerPair, bankerPoints, bankerCards } = roundResult;
  const { isNoCommission = false } = options;

  switch (betType) {
    case 'player':
      if (result === 'player') {
        return { won: true, payout: betAmount * BET_PAYOUTS.player };
      } else if (result === 'tie') {
        return { won: false, payout: 0 }; // Push - return bet
      }
      return { won: false, payout: -betAmount };

    case 'banker':
      if (result === 'banker') {
        // No commission mode: banker wins with 6 points pays 1:0.5
        if (isNoCommission) {
          const payoutRate = bankerPoints === 6
            ? BET_PAYOUTS_NO_COMMISSION.banker_six
            : BET_PAYOUTS_NO_COMMISSION.banker;
          return { won: true, payout: betAmount * payoutRate };
        }
        return { won: true, payout: betAmount * BET_PAYOUTS.banker };
      } else if (result === 'tie') {
        return { won: false, payout: 0 }; // Push - return bet
      }
      return { won: false, payout: -betAmount };

    case 'tie':
      if (result === 'tie') {
        return { won: true, payout: betAmount * BET_PAYOUTS.tie };
      }
      return { won: false, payout: -betAmount };

    case 'player_pair':
      if (playerPair) {
        return { won: true, payout: betAmount * BET_PAYOUTS.player_pair };
      }
      return { won: false, payout: -betAmount };

    case 'banker_pair':
      if (bankerPair) {
        return { won: true, payout: betAmount * BET_PAYOUTS.banker_pair };
      }
      return { won: false, payout: -betAmount };

    case 'super_six':
      if (result === 'banker' && bankerPoints === 6) {
        const payout = bankerCards.length === 2
          ? BET_PAYOUTS.super_six_2cards
          : BET_PAYOUTS.super_six_3cards;
        return { won: true, payout: betAmount * payout };
      }
      return { won: false, payout: -betAmount };

    default:
      return { won: false, payout: 0 };
  }
}
