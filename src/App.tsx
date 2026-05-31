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

// Group a die's sticker faces into "+50×2" / "x3" style badges. The multiplier
// die's faces are inherent (not stickers), so it gets no badge.
function stickerBadges(die: Die): string[] {
  if (die.className === "die-dmulti" || die.className === "die-dpercent") return [];
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
  return (
    <button className={`${die.className} die-card ${compact ? "die-card-compact" : ""}`} onClick={onClick}>
      <span className="text-xs font-bold tracking-wide text-gray-500 dark:text-gray-400">
        {die.name}
      </span>
      <span
        className={`flex-1 grid place-items-center w-full font-extrabold leading-none py-2 ${
          compact ? "text-xl sm:text-2xl" : "text-3xl sm:text-4xl"
        }`}
      >
        {die.displayRolledValue() ?? "·"}
      </span>
      {badges.length > 0 && (
        <span className="flex flex-wrap justify-center gap-1 w-full">
          {badges.map((badge, index) => (
            <span
              key={index}
              className="text-xs font-bold rounded-md px-1.5 py-0.5 bg-emerald-500 text-white"
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

const RULES: { heading?: string; body: string[] }[] = [
  { body: ["Beat the rising target before you run out of rolls."] },
  {
    heading: "Goal",
    body: [
      "Start with 6 dice — a random mix of d6/d8/d10/d12.",
      "5 rolls per round; your score accumulates across rolls.",
      "Hit the target to earn a reward. Run out of rolls and it's game over.",
    ],
  },
  {
    heading: "Scoring",
    body: [
      "Subtotal of all numeric faces.",
      "Max-roll bonus and min-roll penalty per die.",
      "Combos: Pair v×3, Triple v×6, Quad v×8, Five v×10, Six v×16, Straight v×6.",
      "Stickers: addition stickers (+50, +100) apply to your score first. Multiplier stickers (x3, x4) come next — but they add together rather than pile on. Example: a x3 and a x4 landing at once combine into a x6 (not x12), so a 50-point roll becomes 300 instead of 600.",
      "Percentage dice (D%) boost the whole score by the percent they roll, stacking additively with multipliers.",
    ],
  },
  {
    heading: "Dice tiers",
    body: [
      "Standard ladder: D1 → D2 → D4 → D6 → D8 → D10 → D12 → D20. Higher tier = bigger faces (1…N), more raw value and combo range. Only these dice upgrade.",
      "Odd / Even — faces are the odds (1–9) or evens (2–10).",
      "Fib — Fibonacci faces: 1, 1, 2, 3, 5, 8, 13, 21.",
      "Prime — prime faces (2, 3, 5, 7, 11, 13); solid value, poor combo odds.",
      "Power — doubling faces (1, 2, 4, 8, 16, 32); huge top end, high variance.",
      "Glass — all 20s and 1s: a big max-roll bonus or a big min-roll penalty, nothing in between.",
      "Multi (×) — multiplies your whole score (×0 to ×3; can whiff to nothing).",
      "Percent (%) — boosts your whole score by 0–50%.",
      "Wild (★, rare) — a valueless joker that joins whichever combo it makes biggest.",
      "Every die except the standard ladder is non-upgradable — you only get them from rewards.",
    ],
  },
  {
    heading: "Rewards (pick 1 of 3)",
    body: [
      "New die — a random die joins your pool (cap 12).",
      "Upgrade — every upgradable die goes up one tier (D6→D8…); bundles a free die when 2 or fewer dice are upgradable.",
      "Sticker — paste a multiplier or addition onto one die.",
      "Randomise — swap one die for a random type. Usually a step up, but a 1-in-4 chance it steps down.",
    ],
  },
  {
    heading: "Modifiers (from round 4)",
    body: [
      "Each round rolls a random rule — Pairs Pay Double, Straight Fever, Bonus Roll, Big Numbers, Combo Lockout, Crit Day, and more.",
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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

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
          const newScore = score + game.calculate(newDice, modifier);
          setScore(newScore);
          setRolling(false);
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
          <div className="mt-5 rounded-2xl border px-4 py-3 text-center bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/40 dark:border-purple-500/50 dark:text-white">
            <p className="font-bold">{modifier.name}</p>
            <p className="text-sm opacity-80">{modifier.description}</p>
          </div>
        )}

        {lost ? (
          <div className="flex-1 flex flex-col justify-center">
            <div className="rounded-2xl border px-4 py-6 text-center bg-red-100 border-red-300 text-red-900 dark:bg-red-900/40 dark:border-red-500/50 dark:text-white">
              <p className="text-2xl font-bold">You Lost!</p>
              <p className="mt-1">You made it to round {round}.</p>
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
