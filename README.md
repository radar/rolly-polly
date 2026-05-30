# Rolly Polly!

A push-your-luck dice game. Each round you roll a pool of dice, stack up
bonuses, and try to beat a rising target score. Clear a round and you pick one
of three randomly-rolled rewards to make your dice stronger for the next.

## Running

```bash
yarn install
yarn dev      # start the dev server
yarn build    # type-check + production build
yarn test     # run the vitest suite
```

## How to play

- You start with **6 dice** (a random mix of d6/d8/d10/d12).
- Each **round** gives you up to **5 rolls**. Press **Space** (or *Roll Die*) to
  roll every die at once.
- Your score for the round **accumulates across rolls**. Reach the **target
  score** before your rolls run out to clear the round.
- Run out of rolls below the target and you lose.

## Scoring

Each roll is scored as:

1. **Subtotal** — the sum of all numeric die faces.
2. **Die bonuses / penalties** — rolling a die's highest face adds a bonus;
   rolling its lowest face applies a penalty (see `maxBonus` / `minPenalty` in
   `src/die.ts`).
3. **Combo bonuses** — matching faces and runs:
   - Pair `+10`, Triple `+20`, Quad `+40`, Five-of-a-kind `+50`, Six-of-a-kind `+100`
   - **Straight** (five consecutive values) `+30`
4. **Stickers** — additions are applied first, then multipliers (multipliers are
   applied last, so they scale everything).

The full pipeline lives in `Game.calculate` (`src/game.ts`).

## Difficulty curve

The target score for each round is computed by `targetForRound` in
`src/progression.ts`. Rather than a flat geometric jump, the ratio between
consecutive rounds **decays from 1.5 toward 1**, so the curve climbs steeply
early then eases off — a smoother ramp against the player's roughly one-upgrade-
per-round power growth.

```
round:  1    2    3    4    5    6    7
target: 100  150  216  300  404  531  683
```

## Rewards

Clear a round and three concrete rewards are **rolled at random** — typically one
of each kind:

- **New die** — adds a randomly-rolled die to your pool.
- **Upgrade** — bumps one die up a level (e.g. d6 → d8).
- **Sticker** — attaches a multiplier (`x3`…`x10`) or addition (`+50`/`+100`)
  sticker to one die.

Generation is random, but the **choice is yours** — pick the one option that best
fits your pool. Reward logic lives in `src/reward.ts`.
