import { Addition as AdditionSticker, Multiplier as MultiplierSticker, type Sticker } from "./sticker"
import { BaseDie, DieD6 } from "./die"

type Die = BaseDie | DieD6;
type Roll = number | Sticker | null;
type Dice = Die[];

class Game {
  static PAIR_BONUS = 10;
  static TRIPLE_BONUS = 20;
  static STRAIGHT_BONUS = 30;
  static QUAD_BONUS = 40;
  static FIVE_BONUS = 50;
  static SIX_BONUS = 100;

  // Constructor
  constructor() {
    // Initialization logic goes here
  }

  calculate(dice: Dice): number {
    let total = this.calculateSubTotal(dice);
    total = this.calculateDiceBonuses(total, dice);
    total = this.calculateBonuses(total, dice);
    total = this.calculateStickers(total, dice);
    return total;
  }

  calculateDiceBonuses(total: number, dice: Dice): number {
    total += this.calculateMaximumBonuses(dice);
    total += this.calculateMinimumPenalties(dice);
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

  bonusesApplied(dice: Dice): string[] {
    const bonuses: string[] = [];
    const sixes = this.sixes(dice);
    const fives = this.fives(dice);
    const quads = this.quads(dice);
    const triples = this.triples(dice);
    const pairs = this.pairs(dice);

    if (quads > 0) bonuses.push(`Quads x${quads} (+${Game.QUAD_BONUS * quads})`);
    if (triples > 0) bonuses.push(`Triples x${triples} (+${Game.TRIPLE_BONUS * triples})`);
    if (pairs > 0) bonuses.push(`Pairs x${pairs} (+${Game.PAIR_BONUS * pairs})`);
    if (this.isStraight(dice)) bonuses.push(`Straight (+${Game.STRAIGHT_BONUS})`);
    if (fives > 0) bonuses.push(`Fives x${fives} (+${Game.FIVE_BONUS * fives})`);
    if (sixes > 0) bonuses.push(`Sixes x${sixes} (+${Game.SIX_BONUS * sixes})`);

    const maximumDice = dice.filter((die) => die.rolledMax());
    const minimumDice = dice.filter((die) => die.rolledMin());

    if (maximumDice.length > 0) {
      bonuses.push(`Max Roll Bonus (+${this.calculateMaximumBonuses(maximumDice)})`);
    }

    if (minimumDice.length > 0) {
      bonuses.push(`Min Roll Penalty (${this.calculateMinimumPenalties(minimumDice)})`);
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

  calculateBonuses(currentTotal: number, dice: Dice): number {
    const sixes = this.sixes(dice);
    const fives = this.fives(dice);
    const quads = this.quads(dice);
    const triples = this.triples(dice);
    const pairs = this.pairs(dice);

    currentTotal += Game.QUAD_BONUS * quads;
    currentTotal += Game.TRIPLE_BONUS * triples;
    currentTotal += Game.PAIR_BONUS * pairs;
    if (this.isStraight(dice)) currentTotal += Game.STRAIGHT_BONUS;
    currentTotal += Game.FIVE_BONUS * fives;
    currentTotal += Game.SIX_BONUS * sixes;

    return currentTotal;
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

  pairs(dice: Dice): number {
    const counts = new Map<number, number>();
    dice.forEach((die) => {
      if (typeof die.rolledValue === 'number') {
        counts.set(die.rolledValue, (counts.get(die.rolledValue) || 0) + 1);
      }
    });
    return Array.from(counts.values()).filter((count) => count === 2).length;
  }

  triples(dice: Dice): number {
    const counts = new Map<number, number>();
    dice.forEach((die) => {
      if (typeof die.rolledValue === 'number') {
        counts.set(die.rolledValue, (counts.get(die.rolledValue) || 0) + 1);
      }
    });
    return Array.from(counts.values()).filter((count) => count === 3).length;
  }

  quads(dice: Dice): number {
    const counts = new Map<number, number>();
    dice.forEach((die) => {
      if (typeof die.rolledValue === 'number') {
        counts.set(die.rolledValue, (counts.get(die.rolledValue) || 0) + 1);
      }
    });
    return Array.from(counts.values()).filter((count) => count === 4).length;
  }

  fives(dice: Dice): number {
    const counts = new Map<number, number>();
    dice.forEach((die) => {
      if (typeof die.rolledValue === 'number') {
        counts.set(die.rolledValue, (counts.get(die.rolledValue) || 0) + 1);
      }
    });
    return Array.from(counts.values()).filter((count) => count === 5).length;
  }

  sixes(dice: Dice): number {
    const counts = new Map<number, number>();

    dice.forEach((die) => {
      if (typeof die.rolledValue === 'number') {
        counts.set(die.rolledValue, (counts.get(die.rolledValue) || 0) + 1);
      }
    });
    return Array.from(counts.values()).filter((count) => count >= 6).length;
  }

  isStraight(dice: Dice): boolean {
    const sorted = this.numericRolls(dice).sort((a, b) => a - b);

    // Check all possible 5-consecutive sequences
    for (let i = 0; i <= sorted.length - 5; i++) {
      const sequence = sorted.slice(i, i + 5);
      const isStraightSequence = sequence.every((val, idx) => {
        if (idx === 0) return true;
        return val === sequence[idx - 1] + 1;
      });

      if (isStraightSequence) return true;
    }

    return false;
  }

  numericRolls(dice: Dice): number[] {
    return dice.map(die => die.rolledValue).filter((val): val is number => typeof val === 'number');
  }
}

export { Game };
