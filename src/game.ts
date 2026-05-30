import { Addition as AdditionSticker, Multiplier as MultiplierSticker, type Sticker } from "./sticker"
import { BaseDie, DieD6 } from "./die"
import type { Modifier, ComboMods } from "./modifier"

type Die = BaseDie | DieD6;
type Roll = number | Sticker | null;
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
    if (modifier?.perDieValueBonus) {
      total += modifier.perDieValueBonus * this.numericRolls(dice).length;
    }
    total = this.calculateDiceBonuses(total, dice, modifier);
    total = this.calculateBonuses(total, dice, modifier);
    total = this.calculateStickers(total, dice);
    total = this.applyCrit(total, dice, modifier);
    return total;
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

    if (modifier?.perDieValueBonus) {
      const gain = modifier.perDieValueBonus * this.numericRolls(dice).length;
      if (gain > 0) bonuses.push(`Big Numbers (+${gain})`);
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
      }
    });

    return stickers;
  }

  calculateBonuses(currentTotal: number, dice: Dice, modifier: Modifier | null = null): number {
    return currentTotal + this.comboBonuses(dice, modifier?.combo).total;
  }

  calculateStickers(currentTotal: number, dice: Dice): number {
    let total = currentTotal;

    dice.forEach((die) => {
      const roll = die.rolledValue;
      if (roll instanceof AdditionSticker) {
        total += roll.amount;
      }
    });

    dice.forEach((die) => {
      const roll = die.rolledValue;
      if (roll instanceof MultiplierSticker) {
        total *= roll.factor;
      }
    });

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
    let total = 0;
    const lines: string[] = [];

    if (combo?.disabled) {
      return { total, lines };
    }

    const pairScale = combo?.pairScale ?? 1;
    for (const [value, count] of this.valueCounts(dice)) {
      let bonus = 0;
      let name = '';
      if (count === 2) { bonus = value * Game.PAIR_FACTOR * pairScale; name = 'Pair'; }
      else if (count === 3) { bonus = value * Game.TRIPLE_FACTOR; name = 'Triple'; }
      else if (count === 4) { bonus = value * Game.QUAD_FACTOR; name = 'Quad'; }
      else if (count === 5) { bonus = value * Game.FIVE_FACTOR; name = 'Five'; }
      else if (count >= 6) { bonus = value * Game.SIX_FACTOR; name = 'Six'; }
      if (bonus > 0) {
        total += bonus;
        lines.push(`${name} of ${value} (+${bonus})`);
      }
    }

    const run = this.straightRun(dice, combo?.straightNeeds ?? 5);
    if (run) {
      const high = run[run.length - 1];
      const bonus = high * Game.STRAIGHT_FACTOR * (combo?.straightScale ?? 1);
      total += bonus;
      lines.push(`Straight to ${high} (+${bonus})`);
    }

    return { total, lines };
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
