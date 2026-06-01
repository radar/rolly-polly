import { Addition as AdditionSticker, Multiplier as MultiplierSticker, Percentage as PercentageSticker, type Sticker } from "./sticker"
import { BaseDie, DieD6, Wild } from "./die"
import type { Modifier, ComboMods } from "./modifier"

type Die = BaseDie | DieD6;
type Roll = number | Sticker | Wild | null;
type Dice = Die[];

class Game {
  // Combo bonuses scale with the matched face value, so upgrading dice (bigger
  // faces) grows your combo output — not just adding more dice. A combo of
  // value V is worth V * factor; a straight is worth its highest value * factor.
  static PAIR_FACTOR = 3;
  static TRIPLE_FACTOR = 6;
  static QUAD_FACTOR = 8;
  static FIVE_FACTOR = 10;
  static SIX_FACTOR = 16;
  // 12-dice pools can roll past six-of-a-kind, so the ladder keeps climbing.
  static SEVEN_FACTOR = 20;
  static EIGHT_FACTOR = 24;
  static NINE_FACTOR = 28;
  static TEN_FACTOR = 34;
  static ELEVEN_FACTOR = 40;
  static TWELVE_FACTOR = 50;
  static STRAIGHT_FACTOR = 6;

  // Jackpot: every numeric die in the pool shows the same number (Wilds don't
  // break it; non-numeric dice like Multi/Percent are ignored). Multiplies the
  // whole roll, applied last — the rare "everything matched!" payoff.
  static JACKPOT_MULTIPLIER = 10;

  // Poker-style category combos. These REPLACE the individual sets they
  // consume (no double-counting) and pay a premium over scoring those sets
  // apart, so completing the category is always the better outcome.
  static TWO_PAIR_FACTOR = 1.5; // × (combined bonus of the two consumed pairs)
  static FULL_HOUSE_FACTOR = 1.5; // × (combined bonus of the consumed set + pair)

  // Factor for a matched set of `count` dice (count clamped to 2..12).
  static setFactor(count: number): number {
    switch (Math.min(count, 12)) {
      case 2: return Game.PAIR_FACTOR;
      case 3: return Game.TRIPLE_FACTOR;
      case 4: return Game.QUAD_FACTOR;
      case 5: return Game.FIVE_FACTOR;
      case 6: return Game.SIX_FACTOR;
      case 7: return Game.SEVEN_FACTOR;
      case 8: return Game.EIGHT_FACTOR;
      case 9: return Game.NINE_FACTOR;
      case 10: return Game.TEN_FACTOR;
      case 11: return Game.ELEVEN_FACTOR;
      default: return Game.TWELVE_FACTOR;
    }
  }

  static setName(count: number): string {
    return ["", "", "Pair", "Triple", "Quad", "Five", "Six", "Seven", "Eight",
      "Nine", "Ten", "Eleven", "Twelve"][Math.min(count, 12)];
  }

  // Constructor
  constructor() {
    // Initialization logic goes here
  }

  calculate(dice: Dice, modifier: Modifier | null = null): number {
    let total = this.calculateSubTotal(dice);
    total = this.calculateDiceBonuses(total, dice, modifier);
    total = this.calculateBonuses(total, dice, modifier);
    total += this.highRollBonus(dice, modifier);
    total = this.calculateStickers(total, dice);
    total = this.applyCrit(total, dice, modifier);
    total = this.applyJackpot(total, dice);
    // Multipliers, percentages and length-scaled straights can leave fractions;
    // always round the final score up. Floor at 0 — harsh penalties (e.g. a 5×
    // Slippery round) can drive the raw total negative, but a roll must never
    // subtract from the round's running score.
    return Math.max(0, Math.ceil(total));
  }

  // "Big Numbers": each die rolling above half its max face scores extra,
  // value * highRollScale. Rewards big rolls (and big dice) rather than a flat
  // per-die bump, so the payoff swings with what you actually roll.
  highRollBonus(dice: Dice, modifier: Modifier | null = null): number {
    const scale = modifier?.highRollScale;
    if (!scale) return 0;
    let bonus = 0;
    dice.forEach((die) => {
      const value = die.rolledValue;
      if (typeof value === "number" && value > die.highestNumber() / 2) {
        bonus += value * scale;
      }
    });
    return bonus;
  }

  // Number of natural 20s rolled (only a d20 has a 20 face).
  critCount(dice: Dice): number {
    return dice.filter((die) => die.rolledValue === 20).length;
  }

  // "Crit Day": each natural 20 multiplies the whole roll. Applied last, after
  // stickers, so it scales the full total.
  applyCrit(total: number, dice: Dice, modifier: Modifier | null = null): number {
    const mult = modifier?.critMultiplier;
    if (!mult) return total;
    return total * Math.pow(mult, this.critCount(dice));
  }

  // True when every numeric die in the pool shows the same value (and at least
  // two do). Wilds and non-numeric dice (Multi/Percent) don't count against it.
  isJackpot(dice: Dice): boolean {
    const values = this.numericRolls(dice);
    return values.length >= 2 && new Set(values).size === 1;
  }

  // "Jackpot": all numbers match — multiply the whole roll. Applied last so it
  // scales the full total, on top of every other bonus.
  applyJackpot(total: number, dice: Dice): number {
    return this.isJackpot(dice) ? total * Game.JACKPOT_MULTIPLIER : total;
  }

  calculateDiceBonuses(total: number, dice: Dice, modifier: Modifier | null = null): number {
    total += this.calculateMaximumBonuses(dice) * (modifier?.maxBonusScale ?? 1);
    total += this.calculateMinimumPenalties(dice) * (modifier?.penaltyScale ?? 1);
    return total;
  }

  calculateMaximumBonuses(dice: Dice): number {
    let bonus = 0;
    const maximumDice = dice.filter((die) => {
      return die.rolledMax();
    });

    maximumDice.forEach((die) => {
      bonus += die.maxBonus();
    });

    return bonus;
  }

  calculateMinimumPenalties(dice: Dice): number {
    let penalty = 0;
    const minimumDice = dice.filter((die) => {
      return die.rolledMin();
    });

    minimumDice.forEach((die) => {
      penalty += die.minPenalty();
    });

    return penalty;
  }

  calculateSubTotal(dice: Dice): number {
    return this.numericRolls(dice).reduce((sum, val) => sum + val, 0);
  }

  bonusesApplied(dice: Dice, modifier: Modifier | null = null): string[] {
    const bonuses: string[] = [...this.comboBonuses(dice, modifier?.combo).lines];

    const highRoll = this.highRollBonus(dice, modifier);
    if (highRoll > 0) {
      bonuses.push(`Big Rolls (+${highRoll})`);
    }

    const maxScale = modifier?.maxBonusScale ?? 1;
    const penaltyScale = modifier?.penaltyScale ?? 1;
    const maximumDice = dice.filter((die) => die.rolledMax());
    const minimumDice = dice.filter((die) => die.rolledMin());

    if (maximumDice.length > 0) {
      bonuses.push(`Max Roll Bonus (+${this.calculateMaximumBonuses(maximumDice) * maxScale})`);
    }

    if (minimumDice.length > 0) {
      bonuses.push(`Min Roll Penalty (${this.calculateMinimumPenalties(minimumDice) * penaltyScale})`);
    }

    if (modifier?.critMultiplier) {
      const crits = this.critCount(dice);
      if (crits > 0) {
        bonuses.push(`Critical x${crits} (x${modifier.critMultiplier ** crits})`);
      }
    }

    if (this.isJackpot(dice)) {
      bonuses.push(`JACKPOT — all numbers match! (x${Game.JACKPOT_MULTIPLIER})`);
    }

    if (bonuses.length === 0) {
      bonuses.push("None!");
    }

    return bonuses;
  }

  stickersApplied(dice: Dice): string[] {
    // Listed in the order they apply to the score: additions first, then the
    // multiplier-step stickers (× and %).
    const additions: string[] = [];
    const multipliers: string[] = [];

    dice.forEach((die, index) => {
      const roll = die.rolledValue;
      if (roll instanceof AdditionSticker) {
        additions.push(`Die ${index + 1}: +${roll.amount}`);
      } else if (roll instanceof MultiplierSticker) {
        multipliers.push(`Die ${index + 1}: x${roll.factor}`);
      } else if (roll instanceof PercentageSticker) {
        multipliers.push(`Die ${index + 1}: +${roll.percent}%`);
      }
    });

    return [...additions, ...multipliers];
  }

  calculateBonuses(currentTotal: number, dice: Dice, modifier: Modifier | null = null): number {
    return currentTotal + this.comboBonuses(dice, modifier?.combo).total;
  }

  calculateStickers(currentTotal: number, dice: Dice): number {
    let total = currentTotal;

    // Additions first.
    dice.forEach((die) => {
      const roll = die.rolledValue;
      if (roll instanceof AdditionSticker) {
        total += roll.amount;
      }
    });

    // Multipliers stack ADDITIVELY, not multiplicatively: the combined factor
    // is 1 + Σ(factor - 1). A lone x3 still triples, but x3 + x4 gives x6 (not
    // x12), so several stickers landing at once can't explode the score the
    // way a runaway multiplicative product did. Clamped at 0 (sub-1 factors,
    // e.g. the Dmulti die, can pull it down but never negative).
    // Percentage dice fold in here too: a "+30%" face contributes 0.3 to the
    // same additive bonus, so it stacks with multipliers without exploding.
    let multiplierBonus = 0;
    dice.forEach((die) => {
      const roll = die.rolledValue;
      if (roll instanceof MultiplierSticker) {
        multiplierBonus += roll.factor - 1;
      } else if (roll instanceof PercentageSticker) {
        multiplierBonus += roll.percent / 100;
      }
    });
    if (multiplierBonus !== 0) {
      total *= Math.max(0, 1 + multiplierBonus);
    }

    return total;
  }

  roll(dice: Dice): Roll[] {
    return dice.map((die) => die.roll());
  }

  // Map of rolled face value -> how many dice show it.
  valueCounts(dice: Dice): Map<number, number> {
    const counts = new Map<number, number>();
    dice.forEach((die) => {
      if (typeof die.rolledValue === 'number') {
        counts.set(die.rolledValue, (counts.get(die.rolledValue) || 0) + 1);
      }
    });
    return counts;
  }

  // All combo bonuses for this roll, scaled by the matched face value, plus a
  // human-readable line per combo for the scorecard. A round modifier's combo
  // rules can disable combos, scale pairs/straights, or shorten the straight.
  comboBonuses(dice: Dice, combo: ComboMods | null = null): { total: number; lines: string[] } {
    if (combo?.disabled) {
      return { total: 0, lines: [] };
    }

    const pairScale = combo?.pairScale ?? 1;

    // Value-scaled bonus for a matched set of `count` dice showing `value`.
    const setBonus = (value: number, count: number): { bonus: number; name: string } => {
      if (count < 2) return { bonus: 0, name: '' };
      const scale = count === 2 ? pairScale : 1;
      return { bonus: value * Game.setFactor(count) * scale, name: Game.setName(count) };
    };

    const counts = this.valueCounts(dice);
    const wildCount = dice.filter((die) => die.rolledValue instanceof Wild).length;

    // Matched-set score when `wildsForSets` jokers are available: they all pile
    // onto the single value whose set gains the most (a lone 13 + two wilds ->
    // triple 13). Also pays the poker-style Two Pair and Full House categories
    // on top of the individual sets. Returns the total and a line per combo.
    const setScore = (wildsForSets: number): { total: number; lines: string[] } => {
      let wildValue: number | null = null;
      if (wildsForSets > 0) {
        let bestDelta = 0;
        for (const [value, count] of counts) {
          const delta = setBonus(value, count + wildsForSets).bonus - setBonus(value, count).bonus;
          if (delta > bestDelta) {
            bestDelta = delta;
            wildValue = value;
          }
        }
      }

      // Effective counts after the wilds land.
      const effective = new Map<number, number>();
      for (const [value, count] of counts) {
        effective.set(value, value === wildValue ? count + wildsForSets : count);
      }

      let setTotal = 0;
      const setLines: string[] = [];
      // Values already spent on a category combo — they don't score again.
      const consumed = new Set<number>();

      // Full House: the highest 3+ set plus the highest separate 2+ set. Pays a
      // premium over those two sets scored apart, and consumes both.
      const triples = [...effective].filter(([, c]) => c >= 3).map(([v]) => v).sort((a, b) => b - a);
      if (triples.length >= 1) {
        const triple = triples[0];
        const others = [...effective].filter(([v, c]) => c >= 2 && v !== triple).map(([v]) => v).sort((a, b) => b - a);
        if (others.length >= 1) {
          const pair = others[0];
          const parts = setBonus(triple, effective.get(triple)!).bonus + setBonus(pair, effective.get(pair)!).bonus;
          const bonus = Math.ceil(parts * Game.FULL_HOUSE_FACTOR);
          setTotal += bonus;
          setLines.push(`Full House — ${triple}s full of ${pair}s (+${bonus})`);
          consumed.add(triple);
          consumed.add(pair);
        }
      }

      // Two Pair: the two highest unconsumed pairs, scored as one combo instead
      // of two separate pairs.
      const pairs = [...effective].filter(([v, c]) => c === 2 && !consumed.has(v)).map(([v]) => v).sort((a, b) => b - a);
      if (pairs.length >= 2) {
        const parts = setBonus(pairs[0], 2).bonus + setBonus(pairs[1], 2).bonus;
        const bonus = Math.ceil(parts * Game.TWO_PAIR_FACTOR);
        setTotal += bonus;
        setLines.push(`Two Pair (+${bonus})`);
        consumed.add(pairs[0]);
        consumed.add(pairs[1]);
      }

      // Everything not folded into a category scores as its own set.
      for (const [value, count] of effective) {
        if (consumed.has(value)) continue;
        const { bonus, name } = setBonus(value, count);
        if (bonus > 0) {
          setTotal += bonus;
          setLines.push(`${name} of ${value}${value === wildValue ? ' (wild)' : ''} (+${bonus})`);
        }
      }

      return { total: setTotal, lines: setLines };
    };

    // Candidate straights: every run of length `length` (from `needs` up) with
    // at least one real die in it (wilds fill gaps but can't fabricate a run
    // from nothing). Longer runs pay proportionally more (× length / needs).
    //
    // We scan windows anchored on the rolled values, NOT the raw integer range:
    // a valid run can only span present values plus up to `wildCount` filler
    // slots, so its `high` is within wildCount of some present value and its
    // length can't exceed (present count + wildCount). Iterating face magnitude
    // instead would blow up for big-faced dice (a grown Power die rolling
    // millions), so cost stays tied to the dice count, not the face values.
    const needs = combo?.straightNeeds ?? 5;
    const straightScale = combo?.straightScale ?? 1;
    const present = new Set(this.numericRolls(dice));
    const presentValues = [...present];
    const maxLength = presentValues.length + wildCount;
    // Highs worth trying: each present value, plus up to wildCount slots of
    // wild extension above it.
    const highCandidates = new Set<number>();
    for (const value of presentValues) {
      for (let extend = 0; extend <= wildCount; extend++) highCandidates.add(value + extend);
    }
    const straights: { high: number; length: number; wildsUsed: number; bonus: number }[] = [];
    for (const high of highCandidates) {
      for (let length = needs; length <= maxLength; length++) {
        const low = high - length + 1;
        if (low < 1) continue;
        let inWindow = 0;
        for (const value of presentValues) if (value >= low && value <= high) inWindow++;
        const wildsUsed = length - inWindow;
        if (inWindow >= 1 && wildsUsed <= wildCount) {
          const bonus = Math.ceil(high * Game.STRAIGHT_FACTOR * straightScale * (length / needs));
          straights.push({ high, length, wildsUsed, bonus });
        }
      }
    }

    // Wilds are shared between sets and the straight, so pick the split that
    // scores the most: no straight (all wilds to sets), or each candidate
    // straight with the remaining wilds spent on sets.
    let bestTotal = 0;
    let bestLines: string[] = [];
    const consider = (straight: { high: number; length: number; wildsUsed: number; bonus: number } | null) => {
      const used = straight ? straight.wildsUsed : 0;
      const sets = setScore(wildCount - used);
      let candidate = sets.total;
      const candidateLines = [...sets.lines];
      if (straight) {
        candidate += straight.bonus;
        const label = straight.length > needs ? `Straight (${straight.length}) to ${straight.high}` : `Straight to ${straight.high}`;
        candidateLines.push(`${label}${used > 0 ? ' (wild)' : ''} (+${straight.bonus})`);
      }
      if (candidate > bestTotal) {
        bestTotal = candidate;
        bestLines = candidateLines;
      }
    };
    consider(null);
    straights.forEach(consider);

    return { total: bestTotal, lines: bestLines };
  }

  // Highest-value run of `length` consecutive face values, or null if none.
  straightRun(dice: Dice, length: number = 5): number[] | null {
    const sorted = Array.from(new Set(this.numericRolls(dice))).sort((a, b) => a - b);

    let best: number[] | null = null;
    for (let i = 0; i <= sorted.length - length; i++) {
      const sequence = sorted.slice(i, i + length);
      const isStraightSequence = sequence.every((val, idx) => {
        if (idx === 0) return true;
        return val === sequence[idx - 1] + 1;
      });
      // windows ascend, so a later match has higher values than an earlier one
      if (isStraightSequence) best = sequence;
    }

    return best;
  }

  isStraight(dice: Dice): boolean {
    return this.straightRun(dice) !== null;
  }

  numericRolls(dice: Dice): number[] {
    return dice.map(die => die.rolledValue).filter((val): val is number => typeof val === 'number');
  }
}

export { Game };
