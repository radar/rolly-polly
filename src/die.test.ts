import { describe, it, expect, vi, afterEach } from "vitest";
import { BaseDie, DieMultiplier, DiePercent, DieOdd, DieEven, DieFib, DiePrime, DiePower } from "./die";
import { Multiplier, Percentage } from "./sticker";

afterEach(() => vi.restoreAllMocks());

describe("weighted roll", () => {
  it("picks a face by weight using the random draw", () => {
    // faces a,b,c with weights 1,2,2 (total 5). Boundaries: [0,1)->a, [1,3)->b,
    // [3,5)->c. Drives Math.random() to land in each bucket.
    const die = new BaseDie(["a", "b", "c"] as unknown as number[]);
    die.weights = [1, 2, 2];
    const at = (r: number) => {
      vi.spyOn(Math, "random").mockReturnValue(r);
      return die.roll();
    };
    expect(at(0.0)).toBe("a"); // 0.0 * 5 = 0.0 -> a [0,1)
    expect(at(0.1)).toBe("a"); // 0.1 * 5 = 0.5 -> a [0,1)
    expect(at(0.3)).toBe("b"); // 0.3 * 5 = 1.5 -> b [1,3)
    expect(at(0.9)).toBe("c"); // 0.9 * 5 = 4.5 -> c [3,5)
  });

  it("keeps DieMultiplier's face pool unchanged but weights the 0 down", () => {
    const die = new DieMultiplier();
    const factors = die.faces.map((f) => (f as Multiplier).factor);
    expect(factors).toEqual([0, 0.5, 1, 2, 3]); // faces untouched
    expect(die.weights).toEqual([1, 2, 3, 3, 3]); // low faces downweighted

    const N = 40000;
    let zeros = 0;
    for (let i = 0; i < N; i++) {
      die.roll();
      if ((die.rolledValue as Multiplier).factor === 0) zeros++;
    }
    const rate = zeros / N;
    // Expected ~1/12 = 0.083, well under the uniform 0.20.
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.12);
  });

  it("keeps DiePercent's face pool unchanged but weights the 0% down", () => {
    const die = new DiePercent();
    const percents = die.faces.map((f) => (f as Percentage).percent);
    expect(percents).toEqual([0, 10, 20, 30, 40, 50]); // faces untouched
    expect(die.weights).toEqual([1, 2, 2, 2, 2, 2]); // 0% half as likely as the rest

    const N = 40000;
    let zeros = 0;
    for (let i = 0; i < N; i++) {
      die.roll();
      if ((die.rolledValue as Percentage).percent === 0) zeros++;
    }
    const rate = zeros / N;
    // Expected ~1/11 = 0.091, well under the uniform ~0.167.
    expect(rate).toBeGreaterThan(0.06);
    expect(rate).toBeLessThan(0.13);
  });
});

describe("pattern die growth", () => {
  it("Odd/Even ride both the upgrade and grow rewards and append the next number", () => {
    const odd = new DieOdd();
    const even = new DieEven();
    // Swept by the Upgrade reward (canUpgrade) and the Grow reward (canGrow).
    expect([odd.canUpgrade, odd.canGrow]).toEqual([true, true]);
    expect([even.canUpgrade, even.canGrow]).toEqual([true, true]);
    expect((odd.upgrade().faces as number[])).toEqual([1, 3, 5, 7, 9, 11]);
    expect((even.upgrade().faces as number[])).toEqual([2, 4, 6, 8, 10, 12]);
    // grows again, not back to base
    expect((odd.upgrade().upgrade().faces as number[])).toEqual([1, 3, 5, 7, 9, 11, 13]);
  });

  it("Fib/Prime/Power are grown by the standalone reward (canGrow) along their pattern", () => {
    const fib = new DieFib();
    const prime = new DiePrime();
    const power = new DiePower();
    expect([fib.canGrow, prime.canGrow, power.canGrow]).toEqual([true, true, true]);
    expect([fib.canUpgrade, prime.canUpgrade, power.canUpgrade]).toEqual([false, false, false]);
    expect((fib.upgrade().faces as number[])).toEqual([1, 1, 2, 3, 5, 8, 13, 21, 34]);
    expect((prime.upgrade().faces as number[])).toEqual([2, 3, 5, 7, 11, 13, 17]);
    expect((power.upgrade().faces as number[])).toEqual([1, 2, 4, 8, 16, 32, 64]);
  });

  it("preserves the rolled value through an upgrade", () => {
    const die = new DiePower(undefined, 16);
    expect(die.upgrade().rolledValue).toBe(16);
  });
});
