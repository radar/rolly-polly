import { useEffect, useState } from "react";
import "./App.css";
import mousetrap from "mousetrap";

import { type Die, getRandomDie, Wild } from "./die";
import { Addition, Multiplier, Percentage } from "./sticker";

import { Game } from "./game";
import { BASE_SCORE, targetForRound } from "./progression";
import { type Reward, generateRewards, applyReward } from "./reward";
import { type Modifier, modifierForRound } from "./modifier";

// Target for a round, after the round modifier's optional target multiplier.
const targetFor = (round: number, modifier: Modifier | null) =>
  Math.ceil(targetForRound(round) * (modifier?.targetMultiplier ?? 1));

// Human-readable label for a single die face.
const faceLabel = (face: number | Addition | Multiplier | Percentage | Wild): string =>
  typeof face === "number"
    ? String(face)
    : face instanceof Wild
      ? "★"
      : face instanceof Addition
        ? `+${face.amount}`
        : face instanceof Percentage
          ? `+${face.percent}%`
          : `x${face.factor}`;

// Group a die's pasted sticker faces into "+50×2" / "x3" style badges. Only
// Addition/Multiplier stickers count — the multiplier die's inherent Multiplier
// faces would otherwise read as badges, so it's skipped. The percentage die's
// inherent faces are Percentage (not counted), so it can still show stickers
// that were pasted onto it.
function stickerBadges(die: Die): string[] {
  if (die.className === "die-dmulti") return [];
  const counts = new Map<string, number>();
  die.faces.forEach((face) => {
    if (face instanceof Addition || face instanceof Multiplier) {
      const key = faceLabel(face);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  });
  return Array.from(counts, ([label, n]) => (n > 1 ? `${label}×${n}` : label));
}

function DieCard({ die, onClick, compact }: { die: Die; onClick: () => void; compact: boolean }) {
  const badges = stickerBadges(die);
  const value = die.displayRolledValue() ?? "·";
  // Long faces like "+100" / "+30%" would overflow the card, so shrink the
  // value font as the text gets longer.
  const size =
    value.length >= 4
      ? compact ? "text-sm sm:text-base" : "text-xl sm:text-2xl"
      : value.length === 3
        ? compact ? "text-base sm:text-lg" : "text-2xl sm:text-3xl"
        : compact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl";
  return (
    <button className={`${die.className} die-card ${compact ? "die-card-compact" : ""}`} onClick={onClick}>
      <span className="text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400">
        {die.name}
      </span>
      <span className={`flex-1 min-h-0 grid place-items-center w-full font-extrabold leading-none py-1 whitespace-nowrap ${size}`}>
        {value}
      </span>
      {badges.length > 0 && (
        <span className="flex flex-nowrap justify-center gap-1 w-full overflow-hidden">
          {badges.map((badge, index) => (
            <span
              key={index}
              className="text-[10px] leading-tight font-bold rounded-md px-1 py-0.5 bg-emerald-500 text-white whitespace-nowrap shrink-0"
            >
              {badge}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

const game = new Game();
const maxRollsPerRound = 5;
const freshDice = () => Array.from({ length: 6 }, () => getRandomDie(6, 8, 10, 12));

// Read a persisted best score, defaulting to 0 for missing/garbage values.
const loadBest = (key: string): number => {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const RULES: { heading?: string; body: string[] }[] = [
  { body: ["Beat the rising target before you run out of rolls."] },
  {
    heading: "Goal",
    body: [
      "Start with 6 dice — a random mix of d6/d8/d10/d12.",
      "5 rolls per round; your score adds up across all of them.",
      "Hit the target to earn a reward. Run out of rolls and it's game over.",
    ],
  },
  {
    heading: "Combos",
    body: [
      "Set — two or more dice showing the same number. The bonus is that number multiplied by a factor, and the factor grows the more dice match:",
      "Pair (2 match): ×3",
      "Triple (3 match): ×6",
      "Four of a kind: ×8",
      "Five of a kind: ×10",
      "Six of a kind: ×16 (even bigger groups pay more)",
      "Example: three 5s is a triple, so 5 × 6 = 30.",
      "Two Pair or Full House — when the same dice could score more than one way, only the highest-scoring combo wins. Example: three 3s with two 4s is a Full House (\"3s full of 4s\").",
      "Straight — five numbers in a row pays the highest of them × 6; a longer run (6+ in a row) pays even more.",
      "Jackpot — if every die shows the same number, your whole score for that roll is multiplied by 10.",
    ],
  },
  {
    heading: "Scoring",
    body: [
      "First, add up all the numbers you rolled — that's your subtotal.",
      "Roll a die's highest number and it adds a bonus of about half that number — a 20 on a d20 gives +10. Roll its lowest and you lose about half the top number — a 1 on a d20 is −10. (D1 and D2 have no penalty.)",
      "Then any combos you made are added on (see Combos above).",
      "Addition stickers (+50, +100) are added straight onto that running score.",
      "Multiplier stickers (x3, x4) and percentage dice (D%) come last, and they stack by adding together — not piling up. A x3 and a x4 make x6 (not x12), and a +20% die just adds 0.2 on top, giving x6.2.",
      "Example, step by step:",
      "Subtotal of your numbers: 40.",
      "Add a pair of 5s (5 × 3 = 15): 55.",
      "Add a +50 sticker: 105.",
      "A x3 sticker and a +20% die combine to x3.2.",
      "Final score: 105 × 3.2 = 336.",
    ],
  },
  {
    heading: "Dice tiers",
    body: [
      "Standard ladder: D1 → D2 → D4 → D6 → D8 → D10 → D12 → D20. A higher die rolls bigger numbers, so more value and more ways to make combos.",
      "Odd / Even — roll only odd or only even numbers.",
      "Fib, Prime, Power — each rolls its own special set of numbers.",
      "Glass — rolls only its highest or lowest number: a big bonus or a big penalty, nothing in between.",
      "Multi (×) — multiplies your whole score.",
      "Percent (%) — adds a percentage to your whole score.",
      "Wild (★) — a joker with no number that joins whichever combo it makes biggest.",
    ],
  },
  {
    heading: "Rewards (pick 1 of 3)",
    body: [
      "New die — a random die joins your pool (cap 12).",
      "Upgrade — every upgradable die goes up one tier (D6→D8…). Also gives a free die when 2 or fewer dice can be upgraded.",
      "Grow — every pattern die (Odd, Even, Fib, Prime, Power) gains its next number.",
      "Sticker — paste a multiplier or addition onto one die.",
      "Randomise — swap one die for a random type. Usually a step up, but a 1-in-4 chance it steps down.",
    ],
  },
  {
    heading: "Modifiers (from round 4)",
    body: [
      "Each round rolls one random rule:",
      "Pairs Pay Double — pair bonuses ×2.",
      "Straight Fever — straights need only 4 in a row.",
      "High Roller — max-roll bonuses ×2.",
      "Big Numbers — dice rolling in their top half score double.",
      "Bonus Roll — 6 rolls this round.",
      "Drought — only 4 rolls, but the target is 20% lower.",
      "Slippery — min-roll penalties ×5.",
      "Combo Lockout — no combo bonuses, but the target is 40% lower.",
      "Tax Season — target 10% higher.",
      "Clearance — target 20% lower.",
      "Crit Day — each natural 20 doubles your whole roll (stacks).",
    ],
  },
  { heading: "Tip", body: ["Tap any die in the grid to see its current face pool."] },
];

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md max-h-[85vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white text-gray-900 dark:bg-slate-800 dark:text-white p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg grid place-items-center bg-gray-200 dark:bg-slate-700 hover:brightness-110"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function App() {
  const [dice, setDice] = useState(freshDice);

  const [round, setRound] = useState(1);
  const [roll, setRoll] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [score, setScore] = useState(0);
  const [targetScore, setTargetScore] = useState(BASE_SCORE);
  const [modifier, setModifier] = useState<Modifier | null>(null);
  const [lost, setLost] = useState(false);

  const [showBonuses, setShowBonuses] = useState(false);
  const [showFinalTotal, setShowFinalTotal] = useState(false);

  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [showRules, setShowRules] = useState(false);
  const [facesDie, setFacesDie] = useState<Die | null>(null);
  const [rewardOutcome, setRewardOutcome] = useState<string | null>(null);

  // All-time bests, persisted across sessions.
  const [bestRound, setBestRound] = useState(() => loadBest("bestRound"));
  const [bestRoll, setBestRoll] = useState(() => loadBest("bestRoll"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  // Highest round reached ever (restart sets round 1, so this only ever rises).
  useEffect(() => {
    if (round > bestRound) {
      setBestRound(round);
      localStorage.setItem("bestRound", String(round));
    }
  }, [round, bestRound]);

  const maxRolls = modifier?.rolls ?? maxRollsPerRound;

  const startNewRound = () => {
    const nextRound = round + 1;
    const nextModifier = modifierForRound(nextRound);
    setUpgrading(false);
    setRewards([]);
    setScore(0);
    setModifier(nextModifier);
    setTargetScore(targetFor(nextRound, nextModifier));
    setRound(nextRound);
    setRoll(1);
    setShowBonuses(false);
    setShowFinalTotal(false);
  };

  const describeReward = (reward: Reward, before: Die[]): string => {
    switch (reward.kind) {
      case "add-die":
        return `New die added: ${reward.die.name}.`;
      case "sticker":
        return `Stuck a ${faceLabel(reward.sticker)} sticker on ${before[reward.dieIndex].name}.`;
      case "randomise":
        return `${before[reward.dieIndex].name} randomised into ${reward.die.name}.`;
      case "upgrade": {
        const upgraded = before.filter((die) => die.canUpgrade).length;
        const bonus = reward.bonusDie ? ` and added a ${reward.bonusDie.name}` : "";
        return `Upgraded ${upgraded} ${upgraded === 1 ? "die" : "dice"} a tier${bonus}.`;
      }
      case "grow": {
        const grown = before.filter((die) => die.canGrow);
        if (grown.length === 0) return "No dice to grow.";
        const parts = grown.map((die) => {
          const faces = die.upgrade().faces as number[];
          return `${die.name} (gained ${faces[faces.length - 1]})`;
        });
        return `Grew ${parts.join(", ")}.`;
      }
    }
  };

  const chooseReward = (reward: Reward) => {
    setRewardOutcome(describeReward(reward, dice));
    setDice(applyReward(dice, reward));
    startNewRound();
  };

  const restart = () => {
    setDice(freshDice());
    setRound(1);
    setRoll(1);
    setRolling(false);
    setUpgrading(false);
    setRewards([]);
    setScore(0);
    setModifier(null);
    setTargetScore(BASE_SCORE);
    setLost(false);
    setShowBonuses(false);
    setShowFinalTotal(false);
    setRewardOutcome(null);
  };

  const rollDie = () => {
    setRewardOutcome(null);
    setShowBonuses(false);
    setShowFinalTotal(false);
    setRolling(true);
    const rollCount = 24;
    const intervalMs = 50;
    let currentRoll = 0;

    const interval = setInterval(() => {
      const newDice = dice.map((die) => {
        die.roll();
        return die;
      });
      setDice(newDice);

      currentRoll++;
      if (currentRoll >= rollCount) {
        clearInterval(interval);

        setTimeout(() => {
          setShowBonuses(true);
        }, rollCount * intervalMs + 500);

        setTimeout(() => {
          setShowFinalTotal(true);
        }, rollCount * intervalMs + 1000);

        setTimeout(() => {
          const rollScore = game.calculate(newDice, modifier);
          const newScore = score + rollScore;
          setScore(newScore);
          setRolling(false);
          if (rollScore > bestRoll) {
            setBestRoll(rollScore);
            localStorage.setItem("bestRoll", String(rollScore));
          }
          if (newScore >= targetScore) {
            setRewards(generateRewards(newDice));
            setUpgrading(true);
            return;
          }
          if (roll >= maxRolls) {
            setLost(true);
          } else {
            setRoll(roll + 1);
          }
        }, rollCount * intervalMs + 2000);
      }
    }, intervalMs);
  };

  // Bind Space to roll. Lives in an effect (not the render body) with cleanup,
  // so we never leave a stale handler bound across re-renders.
  useEffect(() => {
    mousetrap.bind("space", () => {
      if (!rolling && !upgrading && !lost && !showRules && !facesDie) {
        rollDie();
      }
    });
    return () => {
      mousetrap.unbind("space");
    };
  });

  const subtotal = game.calculateSubTotal(dice);
  const bonuses = game.bonusesApplied(dice, modifier);
  const stickers = game.stickersApplied(dice);
  const finalTotal = game.calculate(dice, modifier);
  const rollsLeft = Math.max(0, maxRolls - roll);

  const iconButton =
    "w-11 h-11 rounded-xl grid place-items-center text-lg font-bold bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-200 hover:brightness-110 transition";

  return (
    <div className="min-h-screen transition-colors">
      <div className="max-w-md mx-auto px-4 py-8 min-h-screen flex flex-col">
        {/* Header */}
        <header className="relative text-center">
          <div className="absolute right-0 top-0 flex gap-2">
            <button onClick={() => setDark((value) => !value)} className={iconButton} aria-label="Toggle theme">
              {dark ? "☀️" : "🌙"}
            </button>
            <button onClick={() => setShowRules(true)} className={iconButton} aria-label="Rules">
              ?
            </button>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold">Rolly Polly!</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Round {round} <span className="px-1">•</span> Roll {roll}/{maxRolls}
          </p>
          <p className="text-xl font-bold">
            Score {score} <span className="text-gray-400 dark:text-gray-500">/</span> Target {targetScore}
          </p>
        </header>

        {modifier && (
          <div
            className={`mt-5 rounded-2xl border px-4 py-3 text-center ${
              modifier.tone === "bad"
                ? "bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-500/50 dark:text-white"
                : "bg-green-100 border-green-300 text-green-900 dark:bg-green-900/40 dark:border-green-500/50 dark:text-white"
            }`}
          >
            <p className="font-bold">{modifier.name}</p>
            <p className="text-sm opacity-80">{modifier.description}</p>
          </div>
        )}

        {lost ? (
          <div className="flex-1 flex flex-col justify-center">
            <div className="rounded-2xl border px-4 py-6 text-center bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-500/50 dark:text-white">
              <p className="text-2xl font-bold">You Lost!</p>
              <p className="mt-1">You made it to round {round}.</p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-black/5 dark:bg-white/10 py-3">
                  <p className="text-xs uppercase tracking-wide opacity-70">Best round</p>
                  <p className="text-2xl font-extrabold">{bestRound}</p>
                  {round >= bestRound && round > 1 && (
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">New best!</p>
                  )}
                </div>
                <div className="rounded-xl bg-black/5 dark:bg-white/10 py-3">
                  <p className="text-xs uppercase tracking-wide opacity-70">Best roll</p>
                  <p className="text-2xl font-extrabold">{bestRoll}</p>
                </div>
              </div>

              <button
                onClick={restart}
                className="mt-5 w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition"
              >
                Play Again
              </button>
            </div>
          </div>
        ) : upgrading ? (
          <div className="flex-1 flex flex-col justify-center">
            <div className="rounded-2xl border px-4 py-6 text-center bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/30 dark:border-amber-500/50 dark:text-white">
              <p className="text-2xl font-bold">Choose Your Reward!</p>
              <p className="mt-1 text-sm opacity-80">Three rewards were rolled at random — pick one to keep.</p>
              <div className="mt-5 flex flex-col gap-3">
                {rewards.map((reward, index) => (
                  <button
                    key={index}
                    onClick={() => chooseReward(reward)}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold transition"
                  >
                    {reward.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <main className="flex-1 flex flex-col">
            {/* Dice */}
            <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
              {dice.map((die, index) => (
                <DieCard
                  key={index}
                  die={die}
                  onClick={() => setFacesDie(die)}
                  compact={dice.length >= 9}
                />
              ))}
            </div>

            {/* Last roll */}
            {showFinalTotal && (
              <p className="mt-5 text-center text-xl font-bold text-emerald-500">
                Last roll: +{finalTotal}
              </p>
            )}

            {/* Scorecard */}
            {showBonuses && (
              <div className="mt-4 text-sm">
                <p className="text-gray-500 dark:text-gray-400">
                  Subtotal <span className="font-bold text-gray-900 dark:text-white">{subtotal}</span>
                </p>
                <p className="mt-3 text-gray-500 dark:text-gray-400">Bonuses</p>
                <ul className="mt-1 pl-3 space-y-0.5">
                  {bonuses.map((bonus, index) => {
                    const penalty = bonus.includes("(-");
                    const neutral = bonus === "None!";
                    const color = neutral
                      ? "text-gray-500 dark:text-gray-400"
                      : penalty
                        ? "text-red-500"
                        : "text-emerald-500";
                    return (
                      <li key={index} className={color}>
                        {bonus}
                      </li>
                    );
                  })}
                </ul>

                {stickers.length > 0 && (
                  <>
                    <p className="mt-3 text-gray-500 dark:text-gray-400">Stickers</p>
                    <ul className="mt-1 pl-3 space-y-0.5">
                      {stickers.map((sticker, index) => (
                        <li key={index} className="text-emerald-500">
                          {sticker}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {/* Reward outcome + roll button pinned to the foot of the column */}
            <div className="mt-auto pt-8">
              {rewardOutcome && (
                <p className="mb-3 text-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {rewardOutcome}
                </p>
              )}
              <button
                onClick={rollDie}
                disabled={rolling}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-lg font-bold transition"
              >
                Roll Dice ({rollsLeft} left)
              </button>
            </div>
          </main>
        )}
      </div>

      {showRules && (
        <Modal title="How to play" onClose={() => setShowRules(false)}>
          <div className="space-y-4 text-sm">
            {RULES.map((section, index) => (
              <div key={index}>
                {section.heading && <h3 className="font-bold mb-1">{section.heading}</h3>}
                {section.body.map((line, lineIndex) =>
                  section.heading ? (
                    <p key={lineIndex} className="text-gray-600 dark:text-gray-300">
                      • {line}
                    </p>
                  ) : (
                    <p key={lineIndex} className="font-semibold">
                      {line}
                    </p>
                  )
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}

      {facesDie && (
        <Modal title={`${facesDie.name} — face pool`} onClose={() => setFacesDie(null)}>
          <div className="flex flex-wrap gap-2">
            {facesDie.faces.map((face, index) => {
              const bg =
                face instanceof Addition
                  ? "bg-emerald-500 text-white"
                  : face instanceof Multiplier
                    ? "bg-orange-400 text-white"
                    : "bg-gray-100 dark:bg-slate-700";
              return (
                <span
                  key={index}
                  className={`min-w-9 px-2 py-1 rounded-lg text-center font-bold ${bg}`}
                >
                  {faceLabel(face)}
                </span>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

export default App;
