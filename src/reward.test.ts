import { describe, it, expect } from 'vitest';
import { generateRewards, applyReward, MAX_DICE } from './reward';
import { DieD6, DieD20 } from './die';
import { Addition, Multiplier } from './sticker';

describe('generateRewards', () => {
  it('offers three concrete options with labels', () => {
    const dice = [new DieD6(), new DieD6()];
    const rewards = generateRewards(dice);
    expect(rewards).toHaveLength(3);
    rewards.forEach((reward) => {
      expect(reward.label.length).toBeGreaterThan(0);
    });
  });

  it('still offers three options when nothing is upgradable', () => {
    const dice = [new DieD20(), new DieD20()];
    const rewards = generateRewards(dice);
    expect(rewards).toHaveLength(3);
    // No upgrade reward can target a maxed-out die.
    expect(rewards.some((r) => r.kind === 'upgrade')).toBe(false);
  });

  it('never offers the upgrade reward more than once at the dice cap', () => {
    // A full pool of upgradable dice: add-die is gated, so the old code
    // produced two identical "upgrade all dice" options.
    const dice = Array.from({ length: MAX_DICE }, () => new DieD6());
    const rewards = generateRewards(dice);
    expect(rewards).toHaveLength(3);
    expect(rewards.filter((r) => r.kind === 'upgrade').length).toBe(1);
    expect(rewards.some((r) => r.kind === 'add-die')).toBe(false);
  });
});

describe('applyReward', () => {
  it('adds a die', () => {
    const dice = [new DieD6()];
    const die = new DieD6();
    const next = applyReward(dice, { kind: 'add-die', label: 'New D6', die });
    expect(next).toHaveLength(2);
    expect(next[1]).toBe(die);
  });

  it('upgrades every upgradable die one tier, leaving maxed dice alone', () => {
    const dice = [new DieD6(), new DieD6(), new DieD20()];
    const next = applyReward(dice, { kind: 'upgrade', label: '' });
    expect(next.map((d) => d.name)).toEqual(['D8', 'D8', 'D20']);
  });

  it('applies a multiplier sticker to the die at the given index', () => {
    const dice = [new DieD6()];
    const before = dice[0].faces.length;
    applyReward(dice, {
      kind: 'sticker',
      label: '',
      dieIndex: 0,
      sticker: new Multiplier(3),
    });
    expect(dice[0].faces.some((f) => f instanceof Multiplier)).toBe(true);
    // Multiplier sticker swaps one face, so the count is unchanged.
    expect(dice[0].faces.length).toBe(before);
  });

  it('applies addition stickers to the die at the given index', () => {
    const dice = [new DieD6()];
    applyReward(dice, {
      kind: 'sticker',
      label: '',
      dieIndex: 0,
      sticker: new Addition(50),
    });
    expect(dice[0].faces.filter((f) => f instanceof Addition)).toHaveLength(2);
  });
});
