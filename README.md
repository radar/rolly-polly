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
3. **Combo bonuses** — matching faces and runs, scaled by the matched value
   (so a pair of 8s beats a pair of 2s, and upgrading dice grows your combos):
   - Pair `value×3`, Triple `value×6`, Quad `value×8`, Five-of-a-kind `value×10`,
     Six-of-a-kind `value×16`
   - **Straight** (five consecutive values) — highest value in the run `×6`
4. **Stickers** — additions are applied first, then multipliers (multipliers are
   applied last, so they scale everything).

The full pipeline lives in `Game.calculate` (`src/game.ts`).

## Difficulty curve

The target score for each round is computed by `targetForRound` in
`src/progression.ts`. Rather than a flat geometric jump, the ratio between
consecutive rounds **decays from 1.38 toward 1**, so the curve climbs steeply
early then eases off. The constants were tuned by simulation so targets grow at
roughly the pace rewards add power — runs last and reward choices matter,
instead of every game hitting a wall around round 7.

```
round:  1    2    3    4    5    6    7
target: 100  138  181  229  282  339  401
```

## Rewards

Clear a round and three concrete rewards are **rolled at random** — typically one
of each kind:

- **New die** — adds a randomly-rolled die to your pool (more dice, more combos),
  up to a cap of 12 dice. Past the cap this reward is replaced by an upgrade or
  sticker, so adding dice can't be the only strategy.
- **Upgrade** — bumps **every** upgradable die up one tier (e.g. d6 → d8). Scales
  with your pool, so it grows in value as the game goes on.
- **Sticker** — attaches a multiplier (`x3`…`x10`) or addition (`+50`/`+100`)
  sticker to one die.

Generation is random, but the **choice is yours** — pick the one option that best
fits your pool. Reward logic lives in `src/reward.ts`.

## Round modifiers

From **round 4 onward**, each round rolls a random modifier — a one-round rule
that changes how you play. They're a mix of boons, banes, and twists, e.g.:

- **Pairs Pay Double** — pair bonuses doubled.
- **Straight Fever** — straights need only 4 in a row.
- **Big Numbers** — every scoring die is worth +1.
- **Bonus Roll** / **Drought** — 6 / 4 rolls this round.
- **Combo Lockout** — no combo bonuses; subtotal and stickers only.
- **Tax Season** / **Clearance** — target ±20%.

A modifier is plain data (`src/modifier.ts`); `Game.calculate(dice, modifier?)`
and the App read the fields they need, so scoring stays decoupled. Rounds 1-3
have no modifier (onboarding).
