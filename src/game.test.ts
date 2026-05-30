import { describe, it, expect } from 'vitest';
import { Game } from './game';
import { DieD6, DieD8, DieD10, DieD12 } from './die';

import { Addition as AdditionSticker, Multiplier as MultiplierSticker } from "./sticker"

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
    // Pair of 3 (+9) + Pair of 5 (+15) = 24
    // Min roll penalty = -3
    // Total = 38
    expect(game.calculate(dice)).toBe(38);
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
    // Total = 84
    expect(game.calculate(dice)).toBe(84);
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

  it('calculates a score with a straight + six die', () => {
    const game = new Game();
    // Straight 2-6 (+36), plus +3/-3 max/min, on subtotal 21 = 57
    const dice = [
      new DieD6(1),
      new DieD6(2),
      new DieD6(3),
      new DieD6(4),
      new DieD6(5),
      new DieD6(6),
    ];

    // Subtotal = 1 + 2 + 3 + 4 + 5 + 6 = 21
    // Best straight is 2-6, so Straight to 6 = 6 * 6 = 36
    // Max roll bonus = 3 (the 6)
    // Min roll penalty = -3 (the 1)
    // Total = 21 + 36 + 3 - 3 = 57
    expect(game.calculate(dice)).toBe(57);
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
    // Total = 44
    expect(game.calculate(dice)).toBe(44);
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
    expect(game.calculate(dice)).toBe(210);
  });

  it('calculates 6, 6, 6, 6, 6, 6, 6, x2', () => {
    const game = new Game();
    const sticker = new MultiplierSticker(2);
    // Subtotal = 6 + 6 + 6 + 6 + 6 + 6 + 6 = 42
    // Six of 6 = 6 * 16 = 96 (count >= 6 all score as a six-of-a-kind)
    // Max roll bonuses = 3 * 7 = 21
    // Total before sticker = 159
    // After sticker = 159 * 2 = 318
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
    expect(game.calculate(dice)).toBe(318);
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
});
