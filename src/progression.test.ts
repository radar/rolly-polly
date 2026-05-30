import { describe, it, expect } from 'vitest';
import { BASE_SCORE, targetForRound } from './progression';

describe('targetForRound', () => {
  it('starts at the base score', () => {
    expect(targetForRound(1)).toBe(BASE_SCORE);
  });

  it('follows the smoothed, decaying-ratio curve', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map((round) => targetForRound(round))).toEqual([
      100, 138, 181, 229, 282, 339, 401,
    ]);
  });

  it('is monotonically increasing', () => {
    let prev = 0;
    for (let round = 1; round <= 20; round++) {
      const target = targetForRound(round);
      expect(target).toBeGreaterThan(prev);
      prev = target;
    }
  });

  it('grows slower each round (ratio decays toward 1)', () => {
    const r2 = targetForRound(2) / targetForRound(1);
    const r10 = targetForRound(10) / targetForRound(9);
    expect(r2).toBeGreaterThan(r10);
    expect(r10).toBeGreaterThan(1);
  });
});
