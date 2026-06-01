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
  // Whether the rule helps the player (green) or hinders them (red). Drives the
  // banner colour. Compensated constraints (Drought, Combo Lockout) are marked
  // "bad" — they're challenges even though the lower target offsets them.
  tone?: "good" | "bad";
  rolls?: number; // override the per-round roll budget
  targetMultiplier?: number; // scale this round's target score
  highRollScale?: number; // dice rolling above half their max score (value * this) extra
  penaltyScale?: number; // scale min-roll penalties
  maxBonusScale?: number; // scale max-roll bonuses
  critMultiplier?: number; // each natural 20 multiplies the whole roll by this
  combo?: ComboMods;
}

export const MODIFIERS: Modifier[] = [
  { name: "Pairs Pay Double", description: "Pair bonuses are doubled.", tone: "good", combo: { pairScale: 2 } },
  { name: "Straight Fever", description: "Straights need only 4 in a row.", tone: "good", combo: { straightNeeds: 4 } },
  { name: "High Roller", description: "Max-roll bonuses are doubled.", tone: "good", maxBonusScale: 2 },
  { name: "Big Numbers", description: "Dice that roll in their top half score double.", tone: "good", highRollScale: 1 },
  { name: "Bonus Roll", description: "You get 6 rolls this round.", tone: "good", rolls: 6 },
  { name: "Drought", description: "Only 4 rolls this round, but the target is 20% lower to match.", tone: "bad", rolls: 4, targetMultiplier: 0.8 },
  { name: "Slippery", description: "Min-roll penalties are 5× as harsh.", tone: "bad", penaltyScale: 5 },
  { name: "Combo Lockout", description: "No combo bonuses, but the target is 40% lower — a raw-value round.", tone: "bad", targetMultiplier: 0.6, combo: { disabled: true } },
  { name: "Tax Season", description: "The target is 10% higher this round.", tone: "bad", targetMultiplier: 1.1 },
  { name: "Clearance", description: "The target is 20% lower this round.", tone: "good", targetMultiplier: 0.8 },
  { name: "Crit Day", description: "Each natural 20 on a d20 doubles your roll (stacks).", tone: "good", critMultiplier: 2 },
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
