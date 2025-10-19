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
    // Pair bonus = 10
    // Max roll bonus = 3
    // Total = 34
    expect(game.calculate(dice)).toBe(34);
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
    // Pair bonus = 10
    // Max roll bonus = 3
    // Total = 32
    expect(game.calculate(dice)).toBe(32);
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
    // Pair bonus x2 = 20
    // Min roll penalty = -3
    // Total = 40
    expect(game.calculate(dice)).toBe(34);
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
    // Triple bonus = 20
    // Min roll penalty = -3
    // Total = 32
    expect(game.calculate(dice)).toBe(32);
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
    // Quad bonus = 40
    // Max roll bonuses = 3 * 4 = 12
    // Total = 76
    expect(game.calculate(dice)).toBe(76);
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
    // Straight bonus = 30
    // Min roll penalty = -3
    // Total = 42
    expect(game.calculate(dice)).toBe(42);
  });

  it('calculates a score with a straight + six die', () => {
    const game = new Game();
    // 1 + 2 + 3 + 4 + 5 + 6 + 30 (straight bonus) = 51
    const dice = [
      new DieD6(1),
      new DieD6(2),
      new DieD6(3),
      new DieD6(4),
      new DieD6(5),
      new DieD6(6),
    ];

    // Subtotal = 1 + 2 + 3 + 4 + 5 + 6 = 21
    // Straight bonus = 30
    // Max roll bonus = 3
    // Min roll penalty = -3

    expect(game.calculate(dice)).toBe(51);
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
    // Five bonus = 50
    // Min roll penalty = -3 * 5 = -15
    // Total = 42
    expect(game.calculate(dice)).toBe(42);
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
    // Six bonus = 100
    // Total = 112
    expect(game.calculate(dice)).toBe(112);
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
    // Pair bonus = 10
    // Min roll penalty = -3
    // Total before sticker = 24
    // After sticker = 24 * 2 = 48
    expect(game.calculate(dice)).toBe(48);
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
    // Pair bonus = 10
    // Min roll penalty = -3
    // Total before stickers = 24
    // After stickers = 24 * 2 * 3 = 144
    expect(game.calculate(dice)).toBe(144);
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

    // Subtotal = 2 + 2 + 3 + 4 + 10 = 21
    // Pair bonus = 10
    // Total before stickers = 31
    // After stickers = 31 * 3 = 93

    expect(game.calculate(dice)).toBe(93);
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
    // Five bonus = 50
    // Max roll bonuses = 3 * 5 = 15
    // Total before sticker = 95
    // After sticker = 95 * 2 = 190
    expect(game.calculate(dice)).toBe(190);
  });

  it('calculates 6, 6, 6, 6, 6, 6, 6, x2', () => {
    const game = new Game();
    const sticker = new MultiplierSticker(2);
    // Subtotal = 6 + 6 + 6 + 6 + 6 + 6 + 6 = 42
    // Six bonus = 100
    // Max roll bonuses = 3 * 7 = 21
    // Total before sticker = 163
    // After sticker = 163 * 2 = 326
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
    expect(game.calculate(dice)).toBe(326);
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
