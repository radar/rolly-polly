# CLAUDE.md

Guidance for Claude Code working in this repo.

## What this is

**Rolly Polly!** — a push-your-luck dice game built with React + TypeScript +
Vite. See `README.md` for gameplay. Styling is Tailwind utility classes.

## Commands

```bash
yarn dev      # dev server (HMR)
yarn build    # tsc -b && vite build  — run this to type-check
yarn test     # vitest (use `yarn test --run` for a single non-watch pass)
yarn lint     # eslint
```

## Architecture

Game logic is plain TS classes, deliberately decoupled from React so it is unit
testable without rendering.

- `src/game.ts` — `Game` class: the scoring engine. `calculate()` runs the
  pipeline subtotal → die bonuses/penalties → combo bonuses → stickers. Combo
  detection (`pairs`/`triples`/`quads`/`fives`/`sixes`/`isStraight`) counts
  rolled face values.
- `src/die.ts` — `BaseDie` and the die ladder (`DieD1`…`DieD20`, plus `DieOdd`,
  `DieEven`, `DieFib`, `DieMultiplier`). `upgrade()` returns the next die up;
  `canUpgrade` gates which dice can be upgraded. `getRandomDie(...pool)` picks a
  die from a weighted argument list. `addSticker` mutates a die's faces in place.
- `src/sticker.ts` — `Multiplier` / `Addition` value objects and
  `StickerFactory.build("3x" | "+50")`.
- `src/progression.ts` — `targetForRound(round)`: the per-round target score
  curve (decaying-ratio, see below).
- `src/reward.ts` — `generateRewards(dice)` rolls three concrete reward options;
  `applyReward(dice, reward)` applies the player's pick. Reward is a discriminated
  union (`add-die` | `upgrade` | `sticker`).
- `src/App.tsx` — the only React component. Owns all game state (round, roll,
  score, target, dice, rewards) and the roll/score/reward loop.

## Conventions

- **Keep scoring/progression/reward logic out of `App.tsx`** — it belongs in the
  testable plain-TS modules. App should orchestrate state, not compute rules.
- **Tests live beside source** as `*.test.ts` (vitest). Add or update tests when
  changing game rules — see `src/game.test.ts`, `src/progression.test.ts`,
  `src/reward.test.ts`.
- Dice are **mutable class instances**; `addSticker` and rolling mutate in place.
  When updating React state, spread into a new array (`[...dice]`) so React sees
  the change.

## Difficulty curve

`targetForRound` multiplies the base (100) by a ratio that **decays from 1.5
toward 1** each round, so difficulty ramps smoothly rather than exploding
geometrically. Tune via `BASE_SCORE`, `INITIAL_RATIO_BONUS`, and `RATIO_DECAY`
in `src/progression.ts`.
