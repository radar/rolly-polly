// Per-round rules that change how a single round plays. A Modifier is plain
// data; the scoring engine (game.ts) and the App read the fields they care
// about, so nothing is tightly coupled.

export interface ComboMods {
  disabled?: boolean; // no combo bonuses at all this round
  pairScale?: number; // multiply pair bonuses
  straightScale?: number; // multiply the straight bonus
  straightNeeds?: number; // run length required for a straight (default 5)
}

export interface Modifier {
  name: string;
  description: string;
  rolls?: number; // override the per-round roll budget
  targetMultiplier?: number; // scale this round's target score
  perDieValueBonus?: number; // flat +N to the subtotal per scoring die
  penaltyScale?: number; // scale min-roll penalties
  maxBonusScale?: number; // scale max-roll bonuses
  critMultiplier?: number; // each natural 20 multiplies the whole roll by this
  combo?: ComboMods;
}

export const MODIFIERS: Modifier[] = [
  { name: "Pairs Pay Double", description: "Pair bonuses are doubled.", combo: { pairScale: 2 } },
  { name: "Straight Fever", description: "Straights need only 4 in a row.", combo: { straightNeeds: 4 } },
  { name: "High Roller", description: "Max-roll bonuses are doubled.", maxBonusScale: 2 },
  { name: "Big Numbers", description: "Every scoring die is worth +1.", perDieValueBonus: 1 },
  { name: "Bonus Roll", description: "You get 6 rolls this round.", rolls: 6 },
  { name: "Drought", description: "Only 4 rolls this round.", rolls: 4 },
  { name: "Slippery", description: "Min-roll penalties are doubled.", penaltyScale: 2 },
  { name: "Combo Lockout", description: "No combo bonuses — subtotal and stickers only.", combo: { disabled: true } },
  { name: "Tax Season", description: "The target is 20% higher this round.", targetMultiplier: 1.2 },
  { name: "Clearance", description: "The target is 20% lower this round.", targetMultiplier: 0.8 },
  { name: "Crit Day", description: "Each natural 20 on a d20 doubles your roll (stacks).", critMultiplier: 2 },
];

// No modifier through round 3 (gentle onboarding); a random one every round
// after that.
export function modifierForRound(
  round: number,
  rng: () => number = Math.random
): Modifier | null {
  if (round <= 3) return null;
  return MODIFIERS[Math.floor(rng() * MODIFIERS.length)];
}
