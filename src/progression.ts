export const BASE_SCORE = 100;
export const INITIAL_RATIO_BONUS = 0.5; // round 1 -> 2 ratio starts at 1.5
export const RATIO_DECAY = 0.15; // how quickly the per-round ratio eases toward 1

// Target score needed to clear a given round (1-indexed).
//
// The old curve multiplied the target by a flat 1.5 every round, so it grew
// geometrically while player power grows roughly one upgrade per round. Felt
// difficulty (target / power) then exploded in the late game.
//
// Here the ratio between consecutive rounds decays from 1.5 toward 1, so the
// curve climbs steeply early then eases off — a smoother ramp against the
// player's near-linear power growth.
//
//   round:  1    2    3    4    5    6    7
//   target: 100  150  215  298  401  526  676
export function targetForRound(round: number): number {
  let target = BASE_SCORE;
  for (let n = 1; n < round; n++) {
    const ratio = 1 + INITIAL_RATIO_BONUS / (1 + (n - 1) * RATIO_DECAY);
    target = Math.ceil(target * ratio);
  }
  return target;
}
