import { type Die, getRandomDie } from "./die";
import { StickerFactory, type Sticker } from "./sticker";

// A concrete, already-rolled reward the player can choose between. Generation
// is random; selection is deliberate — the player picks one of three.
export type Reward =
  | { kind: "add-die"; label: string; die: Die }
  | { kind: "upgrade"; label: string; bonusDie?: Die }
  | { kind: "sticker"; label: string; dieIndex: number; sticker: Sticker }
  | { kind: "randomise"; label: string; dieIndex: number; die: Die };

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
  ...Array(2).fill("percent"),
  ...Array(3).fill("prime"),
  ...Array(3).fill("power"),
  ...Array(2).fill("glass"),
  ...Array(1).fill("wild"), // rare
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

// Every die type, ranked weakest → strongest. The "randomise" reward walks this
// ladder: it favours stepping up (a roughly 75/25 up/down split), so it's a
// gamble that usually rewards but can bite.
const DIE_LADDER: Array<number | string> = [
  1, 2, 4, 6, "odd", 8, "even", "prime", 10, "fib", "power", 12, "multi", "percent", "glass", 20, "wild",
];

// die.name -> its rung on the ladder above.
const NAME_TO_LADDER: Record<string, number | string> = {
  D1: 1, D2: 2, D4: 4, D6: 6, D8: 8, D10: 10, D12: 12, D20: 20,
  Dodd: "odd", Deven: "even", Dfib: "fib", Dmulti: "multi", "D%": "percent",
  Prime: "prime", Power: "power", Glass: "glass", Wild: "wild",
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function stickerDisplay(value: string): string {
  // "3x" -> "x3", "+50" -> "+50"
  return value.endsWith("x") ? `x${value.slice(0, -1)}` : value;
}

function makeAddDieReward(): Reward {
  const die = getRandomDie(...DIE_POOL);
  return { kind: "add-die", die, label: `New Die: ${die.name}` };
}

function makeUpgradeReward(dice: Die[]): Reward {
  // Lifts every upgradable die one tier — it scales with the pool and trades
  // off against add-die (more dice / combos) vs sticker (multipliers).
  //
  // The upgrade path runs out of gas once dice max out (d20 can't upgrade), so
  // when 2 or fewer dice are still upgradable we also grant a fresh die. The
  // new die is itself upgradable, refilling the pipeline, and adds combo
  // frequency — this brings the upgrade path to ~parity with dice/stickers.
  const upgradableCount = dice.filter((die) => die.canUpgrade).length;
  const bonusDie = upgradableCount <= 2 && dice.length < MAX_DICE ? getRandomDie(...DIE_POOL) : undefined;

  const label = bonusDie
    ? `Upgrade all dice +1 tier & New Die: ${bonusDie.name}`
    : `Upgrade all dice +1 tier (${upgradableCount} dice)`;

  return { kind: "upgrade", label, bonusDie };
}

// Replace a random die with a random die type. Weighted 75% upgrade / 25%
// downgrade relative to the chosen die's rung on the ladder — so it usually
// trades up, but can hand back something weaker.
function makeRandomiseReward(dice: Die[]): Reward {
  const dieIndex = Math.floor(Math.random() * dice.length);
  const current = dice[dieIndex];
  const rank = DIE_LADDER.indexOf(NAME_TO_LADDER[current.name]);

  const goUp = Math.random() < 0.75;
  const higher = DIE_LADDER.filter((_, i) => i > rank);
  const lower = DIE_LADDER.filter((_, i) => i < rank);
  // Prefer the chosen direction; fall back to the other end (or any other rung)
  // when the die is already at the top or bottom of the ladder.
  let candidates = goUp ? higher : lower;
  if (candidates.length === 0) candidates = goUp ? lower : higher;
  if (candidates.length === 0) candidates = DIE_LADDER.filter((_, i) => i !== rank);

  const die = getRandomDie(pick(candidates));
  // Keep the result a secret — the label names the die being randomised but not
  // what it becomes, so it stays a gamble.
  return { kind: "randomise", dieIndex, die, label: `Randomise ${current.name} (mystery result)` };
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

  // Upgrade is guaranteed whenever something can be upgraded (and appears at
  // most once — it's a single global action). The other slots are filled from a
  // shuffled pool so add-die, sticker, and randomise rotate through the offers.
  const kinds: Reward["kind"][] = [];
  if (upgradableCount > 0) kinds.push("upgrade");

  const rest: Reward["kind"][] = ["sticker", "randomise"];
  if (canAddDie) rest.push("add-die");
  for (const kind of shuffle(rest)) {
    if (kinds.length >= 3) break;
    kinds.push(kind);
  }
  while (kinds.length < 3) kinds.push("sticker");

  return kinds.slice(0, 3).map((kind) => {
    if (kind === "add-die") return makeAddDieReward();
    if (kind === "upgrade") return makeUpgradeReward(dice);
    if (kind === "randomise") return makeRandomiseReward(dice);
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
    case "randomise": {
      const next = [...dice];
      next[reward.dieIndex] = reward.die;
      return next;
    }
  }
}
