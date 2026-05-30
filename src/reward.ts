import { type Die, getRandomDie } from "./die";
import { StickerFactory, type Sticker } from "./sticker";

// A concrete, already-rolled reward the player can choose between. Generation
// is random; selection is deliberate — the player picks one of three.
export type Reward =
  | { kind: "add-die"; label: string; die: Die }
  | { kind: "upgrade"; label: string; bonusDie?: Die }
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

// Cap the pool so adding dice can't be the one true strategy. Past the cap the
// add-die reward is replaced, pushing players toward upgrades and stickers.
export const MAX_DICE = 12;

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

function makeUpgradeReward(dice: Die[]): Reward {
  // Lifts every upgradable die one tier — it scales with the pool and trades
  // off against add-die (more dice / combos) vs sticker (multipliers).
  //
  // The upgrade path runs out of gas once dice max out (d20 can't upgrade), so
  // when fewer than 2 dice are still upgradable we also grant a fresh die. The
  // new die is itself upgradable, refilling the pipeline, and adds combo
  // frequency — keeping the upgrade path competitive late game.
  const upgradableCount = dice.filter((die) => die.canUpgrade).length;
  const bonusDie = upgradableCount < 2 && dice.length < MAX_DICE ? getRandomDie(...DIE_POOL) : undefined;

  const label = bonusDie
    ? `Upgrade dice +1 tier & add ${bonusDie.name}`
    : `Upgrade all dice +1 tier (${upgradableCount} dice)`;

  return { kind: "upgrade", label, bonusDie };
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
// one of each kind (add / upgrade / sticker) when possible. "Upgrade all dice"
// is a single global action, so it appears at most once; add-die slots are
// dropped at the dice cap, and any remaining slots fall back to stickers (each
// sticker offer is a distinct, concrete roll, so those may repeat).
export function generateRewards(dice: Die[]): Reward[] {
  const canAddDie = dice.length < MAX_DICE;
  const upgradableCount = dice.filter((die) => die.canUpgrade).length;

  // One slot of each available kind first (upgrade only ever once), then fill
  // any remaining slots with a fallback that is never another upgrade.
  const kinds: Reward["kind"][] = [];
  if (canAddDie) kinds.push("add-die");
  if (upgradableCount > 0) kinds.push("upgrade");
  kinds.push("sticker");
  while (kinds.length < 3) kinds.push(canAddDie ? "add-die" : "sticker");

  return kinds.slice(0, 3).map((kind) => {
    if (kind === "add-die") return makeAddDieReward();
    if (kind === "upgrade") return makeUpgradeReward(dice);
    return makeStickerReward(dice);
  });
}

// Apply the chosen reward, returning the new dice array.
export function applyReward(dice: Die[], reward: Reward): Die[] {
  switch (reward.kind) {
    case "add-die":
      return [...dice, reward.die];
    case "upgrade": {
      const upgraded = dice.map((die) => (die.canUpgrade ? die.upgrade() : die));
      return reward.bonusDie ? [...upgraded, reward.bonusDie] : upgraded;
    }
    case "sticker":
      dice[reward.dieIndex].addSticker(reward.sticker);
      return [...dice];
  }
}
