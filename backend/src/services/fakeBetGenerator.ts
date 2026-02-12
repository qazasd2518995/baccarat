// Fake bet generator — produces realistic-looking aggregate bet distributions
// Purely visual, does NOT affect real bet settlement

type GameType = 'baccarat' | 'dragonTiger' | 'bullBull';

const BACCARAT_WEIGHTS: Record<string, number> = {
  player: 0.30,
  banker: 0.35,
  tie: 0.06,
  player_pair: 0.05,
  banker_pair: 0.05,
  super_six: 0.04,
  player_bonus: 0.04,
  banker_bonus: 0.04,
  big: 0.04,
  small: 0.03,
};

const DT_WEIGHTS: Record<string, number> = {
  dragon: 0.28,
  tiger: 0.28,
  dt_tie: 0.08,
  dt_suited_tie: 0.02,
  dragon_odd: 0.04,
  dragon_even: 0.04,
  tiger_odd: 0.04,
  tiger_even: 0.04,
  dragon_red: 0.02,
  dragon_black: 0.02,
  tiger_red: 0.02,
  tiger_black: 0.02,
  dragon_big: 0.04,
  dragon_small: 0.03,
  tiger_big: 0.04,
  tiger_small: 0.03,
};

const BB_WEIGHTS: Record<string, number> = {
  bb_player1: 0.35,
  bb_player2: 0.35,
  bb_player3: 0.30,
};

// Pool ranges per game type [min, max] in raw currency
const POOL_RANGES: Record<GameType, [number, number]> = {
  baccarat: [20_000_000, 80_000_000],
  dragonTiger: [15_000_000, 60_000_000],
  bullBull: [10_000_000, 50_000_000],
};

function randBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function roundTo100K(value: number): number {
  return Math.round(value / 100_000) * 100_000;
}

export function generateFakeBets(gameType: GameType): Record<string, number> {
  const weights =
    gameType === 'baccarat' ? BACCARAT_WEIGHTS :
    gameType === 'dragonTiger' ? DT_WEIGHTS :
    BB_WEIGHTS;

  const [poolMin, poolMax] = POOL_RANGES[gameType];
  const totalPool = randBetween(poolMin, poolMax);

  const bets: Record<string, number> = {};

  for (const [betType, weight] of Object.entries(weights)) {
    // Apply ±20% noise to weight
    const noise = 0.8 + Math.random() * 0.4; // 0.8 ~ 1.2
    const amount = totalPool * weight * noise;
    bets[betType] = roundTo100K(amount);
  }

  return bets;
}
