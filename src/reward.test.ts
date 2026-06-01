import { describe, it, expect } from 'vitest';
import { generateRewards, applyReward, MAX_DICE } from './reward';
import { DieD6, DieD20, DiePower, DiePrime, DieFib } from './die';
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

  it('grants a bonus die with the upgrade when 2 or fewer dice are upgradable', () => {
    // only the D6 can upgrade; the upgrade path would otherwise stall here
    const dice = [new DieD20(), new DieD20(), new DieD6()];
    const upgrade = generateRewards(dice).find((r) => r.kind === 'upgrade');
    expect(upgrade?.kind).toBe('upgrade');
    if (upgrade?.kind === 'upgrade') {
      expect(upgrade.bonusDie).toBeDefined();
      const next = applyReward(dice, upgrade);
      expect(next).toHaveLength(4); // D6 -> D8, two D20s, plus the bonus die
      expect(next.map((d) => d.name)).toContain('D8');
    }
  });

  it('does not grant a bonus die when more than 2 dice are upgradable', () => {
    const dice = [new DieD6(), new DieD6(), new DieD6(), new DieD20()];
    const upgrade = generateRewards(dice).find((r) => r.kind === 'upgrade');
    if (upgrade?.kind === 'upgrade') expect(upgrade.bonusDie).toBeUndefined();
  });

  it('offers a grow reward only when a Power/Prime/Fib die is present', () => {
    const without = generateRewards([new DieD6(), new DieD6()]);
    expect(without.some((r) => r.kind === 'grow')).toBe(false);

    // Fill the pool with growable dice so the grow slot is bound to appear.
    const withGrowable = [new DiePower(), new DiePrime(), new DieFib(), new DiePower()];
    const rewards = generateRewards(withGrowable);
    expect(rewards.some((r) => r.kind === 'grow')).toBe(true);
  });

  it('grows every Power/Prime/Fib die one step, leaving other dice alone', () => {
    const d6 = new DieD6();
    const dice = [new DiePower(), new DiePrime(), d6];
    const next = applyReward(dice, { kind: 'grow', label: '' });
    expect((next[0].faces as number[])).toEqual([1, 2, 4, 8, 16, 32, 64]);
    expect((next[1].faces as number[])).toEqual([2, 3, 5, 7, 11, 13, 17]);
    expect(next[2]).toBe(d6); // untouched
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

  it('randomises the die at the given index, leaving the rest alone', () => {
    const dice = [new DieD6(), new DieD6()];
    const replacement = new DieD20();
    const next = applyReward(dice, { kind: 'randomise', label: '', dieIndex: 1, die: replacement });
    expect(next).toHaveLength(2);
    expect(next[1]).toBe(replacement);
    expect(next[0]).toBe(dice[0]);
  });
});
