import { describe, it, expect } from 'vitest';
import { Game } from './game';
import { DieD6, DieD8, DieD10, DieD12, DiePercent, DiePower, DieWild, Wild } from './die';

import { Addition as AdditionSticker, Multiplier as MultiplierSticker, Percentage as PercentageSticker } from "./sticker"

describe('Game', () => {
  it('calculates a total score with given roll', () => {
    const game = new Game();
    const dice = [
      new DieD6(2),
      new DieD6(4),
      new DieD6(4),
      new DieD6(5),
      new DieD6(6),
    ];
    // Subtotal = 2 + 4 + 4 + 5 + 6 = 21
    // Pair of 4 = 4 * 3 = 12
    // Max roll bonus = 3
    // Total = 36
    expect(game.calculate(dice)).toBe(36);
  });

it('calculates a total score with a pair', () => {
    const game = new Game();
    const dice = [
      new DieD6(2),
      new DieD6(2),
      new DieD6(4),
      new DieD6(5),
      new DieD6(6),
    ];
    // Subtotal = 2 + 2 + 4 + 5 + 6 = 19
    // Pair of 2 = 2 * 3 = 6
    // Max roll bonus = 3
    // Total = 28
    expect(game.calculate(dice)).toBe(28);
  });

  it('calculates a total score with multiple pairs', () => {
    const game = new Game();
    const dice = [
      new DieD6(3),
      new DieD6(3),
      new DieD6(5),
      new DieD6(5),
      new DieD6(1),
    ];
    // Subtotal = 3 + 3 + 5 + 5 + 1 = 17
    // Two Pair replaces the two pairs: ceil((15 + 9) * 1.5) = 36
    // Min roll penalty = -3
    // Total = 50
    expect(game.calculate(dice)).toBe(50);
  });

  it('calculates a total score with a triple', () => {
    const game = new Game();
    const dice = [
      new DieD6(4),
      new DieD6(4),
      new DieD6(4),
      new DieD6(2),
      new DieD6(1),
    ];
    // Subtotal = 4 + 4 + 4 + 2 + 1 = 15
    // Triple of 4 = 4 * 6 = 24
    // Min roll penalty = -3
    // Total = 36
    expect(game.calculate(dice)).toBe(36);
  });

  it('calculates a total score with a quad', () => {
    const game = new Game();
    const dice = [
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
    ];
    // Subtotal = 6 + 6 + 6 + 6 = 24
    // Quad of 6 = 6 * 8 = 48
    // Max roll bonuses = 3 * 4 = 12
    // (24 + 48 + 12) = 84, then JACKPOT (all match) x10 = 840
    expect(game.calculate(dice)).toBe(840);
  });

  it('calculates a total score with a straight', () => {
    const game = new Game();
    const dice = [
      new DieD6(1),
      new DieD6(2),
      new DieD6(3),
      new DieD6(4),
      new DieD6(5),
    ];
    // Subtotal = 1 + 2 + 3 + 4 + 5 = 15
    // Straight to 5 = 5 * 6 = 30
    // Min roll penalty = -3
    // Total = 42
    expect(game.calculate(dice)).toBe(42);
  });

  it('calculates a score with a six-long straight', () => {
    const game = new Game();
    const dice = [
      new DieD6(1),
      new DieD6(2),
      new DieD6(3),
      new DieD6(4),
      new DieD6(5),
      new DieD6(6),
    ];

    // Subtotal = 1 + 2 + 3 + 4 + 5 + 6 = 21
    // A full 1-6 run is a length-6 straight: ceil(6 * 6 * (6/5)) = ceil(43.2) = 44
    // Max roll bonus = 3 (the 6)
    // Min roll penalty = -3 (the 1)
    // Total = 21 + 44 + 3 - 3 = 65
    expect(game.calculate(dice)).toBe(65);
  });

  it('scores a full house (triple + pair)', () => {
    const game = new Game();
    const dice = [
      new DieD6(3),
      new DieD6(3),
      new DieD6(3),
      new DieD6(5),
      new DieD6(5),
    ];
    // Subtotal = 3 + 3 + 3 + 5 + 5 = 19
    // Full House replaces the triple + pair: ceil((18 + 15) * 1.5) = 50
    // Total = 19 + 50 = 69
    expect(game.calculate(dice)).toBe(69);
  });

  it('names the full house with its values ("Ns full of Ms")', () => {
    const game = new Game();
    const dice = [
      new DieD6(3), new DieD6(3), new DieD6(3),
      new DieD6(4), new DieD6(4),
    ];
    const lines = game.bonusesApplied(dice);
    expect(lines.some((l) => l.startsWith('Full House — 3s full of 4s'))).toBe(true);
  });

  it('scores a huge-faced die fast (straight scan is bounded by dice, not face size)', () => {
    const game = new Game();
    // A grown Power die can reach faces in the millions; the straight detector
    // must not iterate the integer range up to that value.
    const dice = [new DiePower(undefined, 134217728), new DieD6(3), new DieD6(4)];
    const start = performance.now();
    const score = game.calculate(dice, null);
    expect(performance.now() - start).toBeLessThan(50);
    // Subtotal 134217728 + 3 + 4 = 134217735, no combos (all distinct).
    expect(score).toBe(134217735);
  });

  it('multiplies the whole roll by 10 when every numeric die matches (jackpot)', () => {
    const game = new Game();
    const dice = [new DieD8(6), new DieD8(6), new DieD8(6), new DieD8(6)];
    // Subtotal = 24. Quad of 6 = 6 * 8 = 48. 6 is not d8's max, so no max bonus.
    // (24 + 48) = 72, then JACKPOT x10 = 720.
    expect(game.calculate(dice)).toBe(720);
    expect(game.isJackpot(dice)).toBe(true);
    expect(game.bonusesApplied(dice).some((l) => l.startsWith('JACKPOT'))).toBe(true);
  });

  it('does not jackpot when the numbers differ, or with only one numeric die', () => {
    const game = new Game();
    expect(game.isJackpot([new DieD8(6), new DieD8(5)])).toBe(false);
    expect(game.isJackpot([new DieD8(6)])).toBe(false);
  });

  it('lets a wild complete a jackpot (wilds do not break the match)', () => {
    const game = new Game();
    const dice = [new DieD8(6), new DieD8(6), new DieWild(new Wild())];
    // Two 6s + wild -> triple of 6 = 6 * 6 = 36. Subtotal 12. (12 + 36) x10 = 480.
    expect(game.isJackpot(dice)).toBe(true);
    expect(game.calculate(dice)).toBe(480);
  });

  it('never returns a negative roll score (floored at 0)', () => {
    const game = new Game();
    // All minimum rolls under a harsh penalty multiplier would go negative.
    const dice = [new DieD12(1), new DieD12(1), new DieD12(1)];
    expect(game.calculate(dice, { name: '', description: '', penaltyScale: 5 })).toBe(0);
  });

  it('scores seven of a kind above six of a kind', () => {
    const game = new Game();
    const dice = Array.from({ length: 7 }, () => new DieD6(3));
    // Subtotal = 21. Seven of 3 = 3 * 20 = 60. (3 is neither max nor min.)
    // (21 + 60) = 81, then JACKPOT (all match) x10 = 810
    expect(game.calculate(dice)).toBe(810);
  });

  it('calculates fives', () => {
    const game = new Game();
    const dice = [
      new DieD6(1),
      new DieD6(1),
      new DieD6(2),
      new DieD6(1),
      new DieD6(1),
      new DieD6(1),
    ];
    // Subtotal = 1 + 1 + 2 + 1 + 1 + 1 = 7
    // Five of 1 = 1 * 10 = 10  (low-value combos now pay little)
    // Min roll penalty = -3 * 5 = -15
    // Total = 2
    expect(game.calculate(dice)).toBe(2);
  });

  it('calculates sixes', () => {
    const game = new Game();
    const dice = [
      new DieD6(2),
      new DieD6(2),
      new DieD6(2),
      new DieD6(2),
      new DieD6(2),
      new DieD6(2),
    ];
    // Subtotal = 2 + 2 + 2 + 2 + 2 + 2 = 12
    // Six of 2 = 2 * 16 = 32  (2 is not the min face of a d6, so no penalty)
    // (12 + 32) = 44, then JACKPOT (all match) x10 = 440
    expect(game.calculate(dice)).toBe(440);
  });

  it('calculates a total score including a multiplier sticker', () => {
    const game = new Game();
    const sticker = new MultiplierSticker(2);
    const dice = [
      new DieD6(1),
      new DieD6(3),
      new DieD6(4),
      new DieD6(4),
      new DieD6(5),
      new DieD6(sticker)
    ];
    // Subtotal = 1 + 3 + 4 + 4 + 5 = 17
    // Pair of 4 = 4 * 3 = 12
    // Min roll penalty = -3
    // Total before sticker = 26
    // After sticker = 26 * 2 = 52
    expect(game.calculate(dice)).toBe(52);
  });

  it('calculates a total score including two multiplier stickers', () => {
    const game = new Game();
    const sticker = new MultiplierSticker(2);
    const sticker2 = new MultiplierSticker(3);
    const dice = [
      new DieD6(1),
      new DieD6(3),
      new DieD6(4),
      new DieD6(4),
      new DieD6(5),
      new DieD6(sticker),
      new DieD6(sticker2),
    ];

    // Subtotal = 1 + 3 + 4 + 4 + 5 = 17
    // Pair of 4 = 4 * 3 = 12
    // Min roll penalty = -3
    // Total before stickers = 26
    // Multipliers stack additively: 1 + (2-1) + (3-1) = 4
    // After stickers = 26 * 4 = 104
    expect(game.calculate(dice)).toBe(104);
  });

  it('calculates a total using an addition sticker and a multiplier sticker', () => {
    const game = new Game();
    const multiplierSticker = new MultiplierSticker(3);
    const additionSticker = new AdditionSticker(10);
    const dice = [
      new DieD6(2),
      new DieD6(2),
      new DieD6(3),
      new DieD6(4),
      new DieD6(additionSticker),
      new DieD6(multiplierSticker),
    ];

    // Subtotal (numeric) = 2 + 2 + 3 + 4 = 11
    // Pair of 2 = 2 * 3 = 6  (2 is not the min face of a d6, so no penalty)
    // Addition sticker = +10, then multiplier = *3
    // (11 + 6 + 10) * 3 = 81
    expect(game.calculate(dice)).toBe(81);
  });

  it('calculates 5x sixes and a 2x multiplier sticker', () => {
    const game = new Game();
    const sticker = new MultiplierSticker(2);
    const dice = [
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
      new DieD6(sticker),
    ];
    // Subtotal = 6 + 6 + 6 + 6 + 6 = 30
    // Five of 6 = 6 * 10 = 60
    // Max roll bonuses = 3 * 5 = 15
    // Total before sticker = 105
    // After sticker = 105 * 2 = 210
    // All numeric dice show 6 (sticker die is non-numeric), so JACKPOT x10 = 2100
    expect(game.calculate(dice)).toBe(2100);
  });

  it('calculates 6, 6, 6, 6, 6, 6, 6, x2', () => {
    const game = new Game();
    const sticker = new MultiplierSticker(2);
    // Subtotal = 6 + 6 + 6 + 6 + 6 + 6 + 6 = 42
    // Seven of 6 = 6 * 20 = 120 (seven-of-a-kind tier)
    // Max roll bonuses = 3 * 7 = 21
    // Total before sticker = 183
    // After sticker = 183 * 2 = 366
    // All numeric dice show 6 (sticker die is non-numeric), so JACKPOT x10 = 3660
    const dice = [
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
      new DieD6(6),
      new DieD6(sticker),
    ];
    expect(game.calculate(dice)).toBe(3660);
  });

  it('detects a straight when a duplicate value is present', () => {
    const game = new Game();
    const dice = [
      new DieD6(1),
      new DieD6(2),
      new DieD6(2),
      new DieD6(3),
      new DieD6(4),
      new DieD6(5),
    ];

    // Subtotal = 1 + 2 + 2 + 3 + 4 + 5 = 17
    // Straight to 5 = 5 * 6 = 30
    // Pair of 2 = 2 * 3 = 6
    // Min roll penalty = -3
    // Total = 50
    expect(game.isStraight(dice)).toBe(true);
    expect(game.calculate(dice)).toBe(50);
  });

  it('calculates a 3, 4, 6, 7, 8, 9 as NOT a straight', () => {
    const game = new Game();
    const dice = [
      new DieD6(3),
      new DieD6(4),
      new DieD6(6),
      new DieD8(7),
      new DieD10(8),
      new DieD12(9),
    ];

    // Subtotal = 3 + 4 + 6 + 7 + 8 + 9 = 37
    // D6 max bonus = 3
    // Total = 37 + 3 = 40
    expect(game.calculate(dice)).toBe(40);
  });

  it('applies a percentage die as a whole-score boost', () => {
    const game = new Game();
    const dice = [
      new DieD6(4),
      new DieD6(2),
      new DiePercent(new PercentageSticker(50)),
    ];
    // Subtotal = 6 (the percentage face is non-numeric).
    // +50% => 6 * 1.5 = 9
    expect(game.calculate(dice)).toBe(9);
  });

  it('stacks a percentage die additively with a multiplier sticker', () => {
    const game = new Game();
    const dice = [
      new DieD6(4),
      new DieD6(new MultiplierSticker(3)),
      new DiePercent(new PercentageSticker(50)),
    ];
    // Subtotal = 4. Bonus = (3 - 1) + (50 / 100) = 2.5 => 4 * 3.5 = 14
    expect(game.calculate(dice)).toBe(14);
  });

  it('lets wild dice complete a matched-set combo', () => {
    const game = new Game();
    const dice = [
      new DiePower(undefined, 8),
      new DieWild(new Wild()),
      new DieWild(new Wild()),
    ];
    // Subtotal = 8 (wilds are non-numeric). Two wilds join the 8 => triple of 8.
    // Triple = 8 * 6 = 48. Total = 8 + 48 = 56
    expect(game.calculate(dice)).toBe(56);
  });

  it('sends wilds to the matched set that gains the most', () => {
    const game = new Game();
    const dice = [
      new DiePower(undefined, 2),
      new DiePower(undefined, 2),
      new DiePower(undefined, 16),
      new DieWild(new Wild()),
    ];
    // Subtotal = 20. The wild lands on the 16 (pair of 16 beats a third 2),
    // leaving pairs of 16 and 2 -> Two Pair: ceil((48 + 6) * 1.5) = 81.
    // Total = 20 + 81 = 101
    expect(game.calculate(dice)).toBe(101);
  });

  it('lets a wild fill the gap in a straight', () => {
    const game = new Game();
    const dice = [
      new DieD6(2),
      new DieD6(3),
      new DieD6(4),
      new DieD6(5),
      new DieWild(new Wild()),
    ];
    // Subtotal = 14 (wild is non-numeric). The wild extends 2-3-4-5 to a
    // straight to 6: 6 * 6 = 36. Total = 14 + 36 = 50
    expect(game.calculate(dice)).toBe(50);
  });
});
