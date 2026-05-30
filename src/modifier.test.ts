import { describe, it, expect } from 'vitest';
import { Game } from './game';
import { DieD6, DieD20 } from './die';
import { MODIFIERS, modifierForRound } from './modifier';

const game = new Game();

describe('modifierForRound', () => {
  it('gives no modifier through round 3', () => {
    for (let round = 1; round <= 3; round++) {
      expect(modifierForRound(round, () => 0)).toBeNull();
    }
  });

  it('gives a modifier from round 4 onward', () => {
    expect(modifierForRound(4, () => 0)).toBe(MODIFIERS[0]);
    expect(modifierForRound(9, () => 0.999)).toBe(MODIFIERS[MODIFIERS.length - 1]);
  });
});

describe('modifier effects on scoring', () => {
  // 2, 4, 4, 5, 6: pair of 4 (+12), the 6 is a max roll (+3) => 21 + 12 + 3 = 36
  const pairDice = () => [
    new DieD6(2), new DieD6(4), new DieD6(4), new DieD6(5), new DieD6(6),
  ];

  it('Pairs Pay Double doubles the pair bonus', () => {
    expect(game.calculate(pairDice())).toBe(36);
    expect(game.calculate(pairDice(), { name: '', description: '', combo: { pairScale: 2 } })).toBe(48);
  });

  it('Combo Lockout removes all combo bonuses', () => {
    // 21 subtotal + 3 max, no pair
    expect(game.calculate(pairDice(), { name: '', description: '', combo: { disabled: true } })).toBe(24);
  });

  it('Combo Lockout pairs the combo ban with a lower target so it is not a wall', () => {
    const lockout = MODIFIERS.find((m) => m.name === 'Combo Lockout')!;
    expect(lockout.combo?.disabled).toBe(true);
    expect(lockout.targetMultiplier).toBeLessThan(1);
  });

  it('Big Numbers doubles dice that roll in their top half', () => {
    // 2, 4, 4, 5, 6 on d6 (max 6, half 3): 4, 4, 5, 6 are > 3
    // base 36 + (4 + 4 + 5 + 6) = 55
    expect(game.calculate(pairDice())).toBe(36);
    expect(game.calculate(pairDice(), { name: '', description: '', highRollScale: 1 })).toBe(55);
  });

  it('High Roller doubles max-roll bonuses', () => {
    // max bonus 3 -> 6, so 21 + 12 + 6 = 39
    expect(game.calculate(pairDice(), { name: '', description: '', maxBonusScale: 2 })).toBe(39);
  });

  it('Slippery doubles min-roll penalties', () => {
    // 1, 1, 3, 4, 5: subtotal 14, pair of 1 (+3), two 1s are min (-3 each)
    const dice = () => [new DieD6(1), new DieD6(1), new DieD6(3), new DieD6(4), new DieD6(5)];
    expect(game.calculate(dice())).toBe(11); // 14 + 3 - 6
    expect(game.calculate(dice(), { name: '', description: '', penaltyScale: 2 })).toBe(5); // 14 + 3 - 12
  });

  it('Straight Fever lets a 4-in-a-row count as a straight', () => {
    // 2, 3, 4, 5, 5: pair of 5 (+15); no 5-straight normally
    const dice = () => [new DieD6(2), new DieD6(3), new DieD6(4), new DieD6(5), new DieD6(5)];
    expect(game.calculate(dice())).toBe(34); // 19 + 15
    // with a 4-length straight 2-3-4-5: + (5 * 6) = 30
    expect(game.calculate(dice(), { name: '', description: '', combo: { straightNeeds: 4 } })).toBe(64);
  });

  it('Crit Day doubles the roll per natural 20', () => {
    const crit = { name: '', description: '', critMultiplier: 2 };
    // single d20 showing 20: subtotal 20 + max bonus 10 = 30, then x2 = 60
    expect(game.calculate([new DieD20(20)])).toBe(30);
    expect(game.calculate([new DieD20(20)], crit)).toBe(60);
    // a d20 not showing 20 does not crit (rolled 19: 19 subtotal, no max/min)
    expect(game.calculate([new DieD20(19)], crit)).toBe(19);
    // two natural 20s stack to x4: subtotal 40 + max 20 + pair of 20 (60) = 120, x4 = 480
    expect(game.calculate([new DieD20(20), new DieD20(20)], crit)).toBe(480);
  });
});
