// Bull Bull (牛牛) game logic

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: string; // 'A', '2'-'10', 'J', 'Q', 'K'
  value: number; // For calculation: A=1, 2-9=face, 10/J/Q/K=10, but only take last digit (0)
}

// Bull Bull bet types
export type BullBullBetType = 'bb_banker' | 'bb_player1' | 'bb_player2' | 'bb_player3';

// Bull Bull rank (highest to lowest)
export type BullBullRank =
  | 'five_face'     // 五花牛 - 5 face cards (J/Q/K)
  | 'bull_bull'     // 牛牛 - both groups sum to 0
  | 'bull_9'        // 牛九
  | 'bull_8'        // 牛八
  | 'bull_7'        // 牛七
  | 'bull_6'        // 牛六
  | 'bull_5'        // 牛五
  | 'bull_4'        // 牛四
  | 'bull_3'        // 牛三
  | 'bull_2'        // 牛二
  | 'bull_1'        // 牛一
  | 'no_bull';      // 无牛

// Rank order for comparison (higher index = better hand)
const RANK_ORDER: BullBullRank[] = [
  'no_bull',
  'bull_1',
  'bull_2',
  'bull_3',
  'bull_4',
  'bull_5',
  'bull_6',
  'bull_7',
  'bull_8',
  'bull_9',
  'bull_bull',
  'five_face',
];

// Payouts for player winning against banker
export const BB_PAYOUTS = {
  five_face: 5,    // 5:1
  bull_bull: 3,    // 3:1
  bull_9: 2,       // 2:1
  bull_8: 2,       // 2:1
  bull_7: 2,       // 2:1
  bull_6: 1,       // 1:1
  bull_5: 1,       // 1:1
  bull_4: 1,       // 1:1
  bull_3: 1,       // 1:1
  bull_2: 1,       // 1:1
  bull_1: 1,       // 1:1
  no_bull: 1,      // 1:1
} as const;

// Create a single deck of cards with Bull Bull values
function createDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const deck: Card[] = [];

  for (const suit of suits) {
    for (let i = 0; i < ranks.length; i++) {
      const rank = ranks[i];
      // In Bull Bull: A=1, 2-9=face, 10/J/Q/K=10 (but we take mod 10, so 0)
      let value: number;
      if (rank === 'A') {
        value = 1;
      } else if (['10', 'J', 'Q', 'K'].includes(rank)) {
        value = 10; // Will become 0 after mod 10
      } else {
        value = parseInt(rank);
      }
      deck.push({ suit, rank, value });
    }
  }

  return deck;
}

// Create and shuffle 8 decks
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

// Get card point value for calculation (A=1, 2-9=face, 10/J/Q/K=0)
export function getBBCardPoint(card: Card): number {
  if (card.value >= 10) return 0;
  return card.value;
}

// Check if a card is a face card (J/Q/K)
export function isFaceCard(card: Card): boolean {
  return ['J', 'Q', 'K'].includes(card.rank);
}

// Calculate sum of cards (taking mod 10)
function sumPoints(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + getBBCardPoint(card), 0) % 10;
}

// Find the best Bull combination from 5 cards
// Returns the 3 cards that sum to a multiple of 10, or null if no Bull
export interface BullCombination {
  hasBull: boolean;
  bullValue: number; // 0-10, where 10 = bull bull, 0 = no bull
  threeCards: Card[];
  twoCards: Card[];
}

export function findBullCombination(cards: Card[]): BullCombination {
  if (cards.length !== 5) {
    return {
      hasBull: false,
      bullValue: 0,
      threeCards: [],
      twoCards: cards,
    };
  }

  // Try all combinations of 3 cards from 5
  // C(5,3) = 10 combinations
  const combinations: number[][] = [
    [0, 1, 2],
    [0, 1, 3],
    [0, 1, 4],
    [0, 2, 3],
    [0, 2, 4],
    [0, 3, 4],
    [1, 2, 3],
    [1, 2, 4],
    [1, 3, 4],
    [2, 3, 4],
  ];

  let bestBull: BullCombination | null = null;

  for (const combo of combinations) {
    const threeCards = combo.map(i => cards[i]);
    const threeSum = threeCards.reduce((sum, card) => sum + getBBCardPoint(card), 0);

    // Check if these 3 cards sum to a multiple of 10
    if (threeSum % 10 === 0) {
      const remainingIndices = [0, 1, 2, 3, 4].filter(i => !combo.includes(i));
      const twoCards = remainingIndices.map(i => cards[i]);
      const twoSum = twoCards.reduce((sum, card) => sum + getBBCardPoint(card), 0);
      const bullValue = twoSum % 10;

      // Bull value 0 means bull bull (10 points)
      const effectiveBullValue = bullValue === 0 ? 10 : bullValue;

      // Keep the best combination (highest bull value)
      if (!bestBull || effectiveBullValue > (bestBull.bullValue === 10 ? 10 : bestBull.bullValue)) {
        bestBull = {
          hasBull: true,
          bullValue: effectiveBullValue,
          threeCards,
          twoCards,
        };
      }
    }
  }

  if (bestBull) {
    return bestBull;
  }

  // No bull found
  return {
    hasBull: false,
    bullValue: 0,
    threeCards: [],
    twoCards: cards,
  };
}

// Determine the rank of a hand
export function getBullBullRank(cards: Card[]): BullBullRank {
  // Check for Five Face (五花牛) - all 5 cards are J/Q/K
  if (cards.every(card => isFaceCard(card))) {
    return 'five_face';
  }

  const combination = findBullCombination(cards);

  if (!combination.hasBull) {
    return 'no_bull';
  }

  const bullValue = combination.bullValue;

  if (bullValue === 10) return 'bull_bull';
  if (bullValue === 9) return 'bull_9';
  if (bullValue === 8) return 'bull_8';
  if (bullValue === 7) return 'bull_7';
  if (bullValue === 6) return 'bull_6';
  if (bullValue === 5) return 'bull_5';
  if (bullValue === 4) return 'bull_4';
  if (bullValue === 3) return 'bull_3';
  if (bullValue === 2) return 'bull_2';
  if (bullValue === 1) return 'bull_1';

  return 'no_bull';
}

// Get the highest card value for tiebreaker
// In Bull Bull, card ranking is: K > Q > J > 10 > 9 > ... > A
// Suit ranking (if needed): Spades > Hearts > Clubs > Diamonds
function getCardRankValue(card: Card): number {
  const rankValues: { [key: string]: number } = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
  };
  return rankValues[card.rank] || 0;
}

function getSuitValue(suit: Card['suit']): number {
  const suitValues: { [key: string]: number } = {
    'diamonds': 1,
    'clubs': 2,
    'hearts': 3,
    'spades': 4,
  };
  return suitValues[suit] || 0;
}

// Get highest card from hand (for tiebreaker)
function getHighestCard(cards: Card[]): Card {
  return cards.reduce((highest, card) => {
    const currentRank = getCardRankValue(card);
    const highestRank = getCardRankValue(highest);
    if (currentRank > highestRank) return card;
    if (currentRank === highestRank && getSuitValue(card.suit) > getSuitValue(highest.suit)) {
      return card;
    }
    return highest;
  }, cards[0]);
}

// Compare two hands
// Returns: 1 if hand1 wins, -1 if hand2 wins, 0 for tie
export function compareHands(hand1: Card[], hand2: Card[]): number {
  const rank1 = getBullBullRank(hand1);
  const rank2 = getBullBullRank(hand2);

  const rankIndex1 = RANK_ORDER.indexOf(rank1);
  const rankIndex2 = RANK_ORDER.indexOf(rank2);

  if (rankIndex1 > rankIndex2) return 1;
  if (rankIndex1 < rankIndex2) return -1;

  // Same rank - compare highest cards
  const high1 = getHighestCard(hand1);
  const high2 = getHighestCard(hand2);

  const highRank1 = getCardRankValue(high1);
  const highRank2 = getCardRankValue(high2);

  if (highRank1 > highRank2) return 1;
  if (highRank1 < highRank2) return -1;

  // Same highest card rank - compare suits
  const suit1 = getSuitValue(high1.suit);
  const suit2 = getSuitValue(high2.suit);

  if (suit1 > suit2) return 1;
  if (suit1 < suit2) return -1;

  return 0; // True tie (shouldn't happen with suit comparison)
}

// Hand result for a single position
export interface HandResult {
  cards: Card[];
  rank: BullBullRank;
  combination: BullCombination;
  highestCard: Card;
}

// Position result (player vs banker)
export type PositionResult = 'win' | 'lose';

// Full round result
export interface BullBullRoundResult {
  banker: HandResult;
  player1: HandResult;
  player2: HandResult;
  player3: HandResult;
  player1Result: PositionResult;
  player2Result: PositionResult;
  player3Result: PositionResult;
}

// Create a hand result from cards
function createHandResult(cards: Card[]): HandResult {
  return {
    cards,
    rank: getBullBullRank(cards),
    combination: findBullCombination(cards),
    highestCard: getHighestCard(cards),
  };
}

// Play a complete Bull Bull round
export function playBullBullRound(shoe: Card[]): BullBullRoundResult {
  // Deal 5 cards to each position (banker + 3 players = 20 cards)
  const bankerCards: Card[] = [];
  const player1Cards: Card[] = [];
  const player2Cards: Card[] = [];
  const player3Cards: Card[] = [];

  // Deal cards in rounds (like real dealing)
  for (let i = 0; i < 5; i++) {
    bankerCards.push(shoe.pop()!);
    player1Cards.push(shoe.pop()!);
    player2Cards.push(shoe.pop()!);
    player3Cards.push(shoe.pop()!);
  }

  const banker = createHandResult(bankerCards);
  const player1 = createHandResult(player1Cards);
  const player2 = createHandResult(player2Cards);
  const player3 = createHandResult(player3Cards);

  // Determine results (each player vs banker independently)
  const player1Result: PositionResult = compareHands(player1Cards, bankerCards) > 0 ? 'win' : 'lose';
  const player2Result: PositionResult = compareHands(player2Cards, bankerCards) > 0 ? 'win' : 'lose';
  const player3Result: PositionResult = compareHands(player3Cards, bankerCards) > 0 ? 'win' : 'lose';

  return {
    banker,
    player1,
    player2,
    player3,
    player1Result,
    player2Result,
    player3Result,
  };
}

// Bet result interface
export interface BetResult {
  won: boolean;
  payout: number;
  multiplier: number;
}

// Calculate bet result for Bull Bull
export function calculateBBBetResult(
  betType: BullBullBetType,
  betAmount: number,
  roundResult: BullBullRoundResult
): BetResult {
  let playerWon: boolean;
  let winnerRank: BullBullRank;

  switch (betType) {
    case 'bb_player1':
      playerWon = roundResult.player1Result === 'win';
      winnerRank = playerWon ? roundResult.player1.rank : roundResult.banker.rank;
      break;
    case 'bb_player2':
      playerWon = roundResult.player2Result === 'win';
      winnerRank = playerWon ? roundResult.player2.rank : roundResult.banker.rank;
      break;
    case 'bb_player3':
      playerWon = roundResult.player3Result === 'win';
      winnerRank = playerWon ? roundResult.player3.rank : roundResult.banker.rank;
      break;
    case 'bb_banker':
      // Betting on banker: win if all players lose
      const bankerWinsAll = roundResult.player1Result === 'lose' &&
                           roundResult.player2Result === 'lose' &&
                           roundResult.player3Result === 'lose';
      playerWon = bankerWinsAll;
      winnerRank = roundResult.banker.rank;
      break;
    default:
      return { won: false, payout: -betAmount, multiplier: 0 };
  }

  const multiplier = BB_PAYOUTS[winnerRank];

  if (playerWon) {
    return {
      won: true,
      payout: betAmount * multiplier,
      multiplier,
    };
  } else {
    return {
      won: false,
      payout: -betAmount,
      multiplier: 0,
    };
  }
}

// Get display name for a rank
export function getRankDisplayName(rank: BullBullRank): string {
  const names: { [key in BullBullRank]: string } = {
    'five_face': '五花牛',
    'bull_bull': '牛牛',
    'bull_9': '牛九',
    'bull_8': '牛八',
    'bull_7': '牛七',
    'bull_6': '牛六',
    'bull_5': '牛五',
    'bull_4': '牛四',
    'bull_3': '牛三',
    'bull_2': '牛二',
    'bull_1': '牛一',
    'no_bull': '无牛',
  };
  return names[rank];
}
