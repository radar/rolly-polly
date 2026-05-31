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
  static STRAIGHT_FACTOR = 6;

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
    return total;
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

    if (bonuses.length === 0) {
      bonuses.push("None!");
    }

    return bonuses;
  }

  stickersApplied(dice: Dice): string[] {
    const stickers: string[] = [];

    dice.forEach((die, index) => {
      const roll = die.rolledValue;
      if (roll instanceof AdditionSticker) {
        stickers.push(`Die ${index + 1}: +${roll.amount}`);
      } else if (roll instanceof MultiplierSticker) {
        stickers.push(`Die ${index + 1}: x${roll.factor}`);
      } else if (roll instanceof PercentageSticker) {
        stickers.push(`Die ${index + 1}: +${roll.percent}%`);
      }
    });

    return stickers;
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
      if (count >= 6) return { bonus: value * Game.SIX_FACTOR, name: 'Six' };
      if (count === 5) return { bonus: value * Game.FIVE_FACTOR, name: 'Five' };
      if (count === 4) return { bonus: value * Game.QUAD_FACTOR, name: 'Quad' };
      if (count === 3) return { bonus: value * Game.TRIPLE_FACTOR, name: 'Triple' };
      if (count === 2) return { bonus: value * Game.PAIR_FACTOR * pairScale, name: 'Pair' };
      return { bonus: 0, name: '' };
    };

    const counts = this.valueCounts(dice);
    const wildCount = dice.filter((die) => die.rolledValue instanceof Wild).length;

    // Matched-set score when `wildsForSets` jokers are available: they all pile
    // onto the single value whose set gains the most (a lone 13 + two wilds ->
    // triple 13). Returns the total and a scorecard line per set.
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
      let setTotal = 0;
      const setLines: string[] = [];
      for (const [value, count] of counts) {
        const effective = value === wildValue ? count + wildsForSets : count;
        const { bonus, name } = setBonus(value, effective);
        if (bonus > 0) {
          setTotal += bonus;
          setLines.push(`${name} of ${value}${value === wildValue ? ' (wild)' : ''} (+${bonus})`);
        }
      }
      return { total: setTotal, lines: setLines };
    };

    // Candidate straights: every length-`needs` window with at least one real
    // die in it (wilds fill the gaps but can't fabricate a straight from
    // nothing). Each records how many wilds it would consume.
    const needs = combo?.straightNeeds ?? 5;
    const straightScale = combo?.straightScale ?? 1;
    const present = new Set(this.numericRolls(dice));
    const maxPresent = present.size ? Math.max(...present) : 0;
    const straights: { high: number; wildsUsed: number }[] = [];
    for (let high = maxPresent + wildCount; high >= needs; high--) {
      const low = high - needs + 1;
      if (low < 1) continue;
      let inWindow = 0;
      for (let value = low; value <= high; value++) if (present.has(value)) inWindow++;
      const wildsUsed = needs - inWindow;
      if (inWindow >= 1 && wildsUsed <= wildCount) {
        straights.push({ high, wildsUsed });
      }
    }

    // Wilds are shared between sets and the straight, so pick the split that
    // scores the most: no straight (all wilds to sets), or each candidate
    // straight with the remaining wilds spent on sets.
    let bestTotal = 0;
    let bestLines: string[] = [];
    const consider = (straight: { high: number; wildsUsed: number } | null) => {
      const used = straight ? straight.wildsUsed : 0;
      const sets = setScore(wildCount - used);
      let candidate = sets.total;
      const candidateLines = [...sets.lines];
      if (straight) {
        const bonus = straight.high * Game.STRAIGHT_FACTOR * straightScale;
        candidate += bonus;
        candidateLines.push(`Straight to ${straight.high}${used > 0 ? ' (wild)' : ''} (+${bonus})`);
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
