import { type Die, getRandomDie } from "./die";
import { StickerFactory, type Sticker } from "./sticker";

// A concrete, already-rolled reward the player can choose between. Generation
// is random; selection is deliberate — the player picks one of three.
export type Reward =
  | { kind: "add-die"; label: string; die: Die }
  | { kind: "upgrade"; label: string; dieIndex: number }
  | { kind: "sticker"; label: string; dieIndex: number; sticker: Sticker };

// Weighted pool of dice that can be granted (mirrors the original upgrade odds).
const DIE_POOL: Array<number | string> = [
  ...Array(1).fill(1),
  ...Array(2).fill(2),
  ...Array(4).fill(4),
  ...Array(5).fill(6),
  ...Array(5).fill(8),
  ...Array(5).fill(10),
  ...Array(5).fill(12),
  ...Array(4).fill(20),
  ...Array(3).fill("odd"),
  ...Array(3).fill("even"),
  ...Array(2).fill("fib"),
  ...Array(1).fill("multi"),
];

// Weighted pool of stickers that can be granted.
const STICKER_POOL: string[] = [
  ...Array(10).fill("3x"),
  ...Array(5).fill("4x"),
  ...Array(3).fill("5x"),
  ...Array(1).fill("10x"),
  ...Array(20).fill("+50"),
  ...Array(10).fill("+100"),
];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function stickerDisplay(value: string): string {
  // "3x" -> "x3", "+50" -> "+50"
  return value.endsWith("x") ? `x${value.slice(0, -1)}` : value;
}

function makeAddDieReward(): Reward {
  const die = getRandomDie(...DIE_POOL);
  return { kind: "add-die", die, label: `New ${die.name}` };
}

function makeUpgradeReward(candidates: Array<{ die: Die; index: number }>): Reward {
  const { die, index } = pick(candidates);
  const next = die.upgrade(); // throwaway, used only for its name
  return { kind: "upgrade", dieIndex: index, label: `Upgrade ${die.name} → ${next.name}` };
}

function makeStickerReward(dice: Die[]): Reward {
  const index = Math.floor(Math.random() * dice.length);
  const value = pick(STICKER_POOL);
  const sticker = StickerFactory.build(value);
  return {
    kind: "sticker",
    dieIndex: index,
    sticker,
    label: `${stickerDisplay(value)} sticker on ${dice[index].name}`,
  };
}

// Produce three concrete reward options for the player to choose from. Offers
// one of each kind (add / upgrade / sticker) when possible; falls back to an
// extra die when nothing is upgradable.
export function generateRewards(dice: Die[]): Reward[] {
  const upgradable = dice
    .map((die, index) => ({ die, index }))
    .filter(({ die }) => die.canUpgrade);

  return [
    makeAddDieReward(),
    upgradable.length > 0 ? makeUpgradeReward(upgradable) : makeAddDieReward(),
    makeStickerReward(dice),
  ];
}

// Apply the chosen reward, returning the new dice array.
export function applyReward(dice: Die[], reward: Reward): Die[] {
  switch (reward.kind) {
    case "add-die":
      return [...dice, reward.die];
    case "upgrade": {
      const next = [...dice];
      next[reward.dieIndex] = next[reward.dieIndex].upgrade();
      return next;
    }
    case "sticker":
      dice[reward.dieIndex].addSticker(reward.sticker);
      return [...dice];
  }
}
