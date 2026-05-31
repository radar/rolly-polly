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
  pipeline subtotal → die bonuses/penalties → combo bonuses → stickers.
  `valueCounts` tallies rolled faces; `comboBonuses` turns matches into
  value-scaled bonuses (a combo of value V is worth `V × factor`, a straight
  worth its highest value `× STRAIGHT_FACTOR`); `straightRun` finds the
  highest-value five-in-a-row.
- `src/die.ts` — `BaseDie` and the die ladder (`DieD1`…`DieD20`, plus `DieOdd`,
  `DieEven`, `DieFib`, `DieMultiplier`, `DiePercent`, `DiePrime`, `DiePower`,
  `DieGlass`, `DieWild`). `DiePercent`'s faces are `Percentage` stickers that
  boost the whole score by their rolled percent, folded into the same additive
  multiplier step as `DieMultiplier`. `DieWild`'s faces are `Wild` markers —
  non-numeric jokers that `Game.comboBonuses` piles onto the single matched set
  they most improve (no subtotal/straight/max-min effect). `upgrade()` returns
  the next die up;
  `canUpgrade` gates which dice can be upgraded. `getRandomDie(...pool)` picks a
  die from a weighted argument list. `addSticker` mutates a die's faces in place.
- `src/sticker.ts` — `Multiplier` / `Addition` value objects and
  `StickerFactory.build("3x" | "+50")`.
- `src/progression.ts` — `targetForRound(round)`: the per-round target score
  curve (decaying-ratio, see below).
- `src/modifier.ts` — `Modifier` (plain-data per-round rule) and
  `modifierForRound(round)` (random from round 4+, null through round 3).
  `Game.calculate(dice, modifier?)` reads its combo/penalty/bonus fields; the
  App reads `rolls` and `targetMultiplier`. Scoring stays decoupled — modifiers
  are just data the engine consults.
- `src/reward.ts` — `generateRewards(dice)` rolls three concrete reward options;
  `applyReward(dice, reward)` applies the player's pick. Reward is a discriminated
  union (`add-die` | `upgrade` | `sticker` | `randomise`). `upgrade` lifts every
  upgradable die one tier (and grants a bonus die via `bonusDie` when 2 or fewer
  dice are upgradable, so the path doesn't stall); `add-die` is gated by
  `MAX_DICE`; `randomise` swaps one die for a random type, weighted 75% up / 25%
  down along `DIE_LADDER`.
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

`targetForRound` multiplies the base (100) by a ratio that **decays from 1.38
toward 1** each round, so difficulty ramps smoothly rather than exploding
geometrically. The constants (`BASE_SCORE`, `INITIAL_RATIO_BONUS`, `RATIO_DECAY`
in `src/progression.ts`) were tuned by simulation so targets grow at roughly the
pace rewards add power. If you change reward strength (`src/reward.ts`) or
scoring (`src/game.ts`), re-check this curve — a throwaway sim that drives the
real modules over many runs is the fastest way to spot a new wall or a runaway
snowball.
