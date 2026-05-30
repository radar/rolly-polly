import { useEffect, useState } from "react";
import "./App.css";
import mousetrap from "mousetrap";

import { type Die, getRandomDie } from "./die";

import { Game } from "./game";
import { BASE_SCORE, targetForRound } from "./progression";
import { type Reward, generateRewards, applyReward } from "./reward";
import { type Modifier, modifierForRound } from "./modifier";

// Target for a round, after the round modifier's optional target multiplier.
const targetFor = (round: number, modifier: Modifier | null) =>
  Math.ceil(targetForRound(round) * (modifier?.targetMultiplier ?? 1));

function DiceVisualizer({ die }: { die: Die }) {
  return (
    <div className="die-container">
      <div className={`${die.className} die`}>
        <p className={`${die.className}-content`}>{die.displayRolledValue()}</p>
      </div>
      <div>
        <p className="text-center mt-2 text-gray-400 text-sm">{die.name}</p>

        <p className="text-center">
          <strong>{die.modificationsApplied().join(", ")}</strong>
        </p>
      </div>
    </div>
  );
}

function Scorecard({
  dice,
  total,
  bonuses,
  finalTotal,
  showBonuses,
  showFinalTotal,
}: {
  dice: Die[];
  total: number;
  bonuses: string[];
  finalTotal: number;
  showBonuses: boolean;
  showFinalTotal: boolean;
}) {
  const stickers = game.stickersApplied(dice);
  return (
    <div>
      <div className="total">Sum: {total}</div>
      {showBonuses && (
        <div>
          <div className="bonuses mt-4">
            <p>Bonuses Applied:</p>
            {bonuses.map((bonus, index) => (
              <div key={index}>{bonus}</div>
            ))}
          </div>

          {stickers.length > 0 && (
            <div className="stickers mt-4">
              <p>Stickers Applied:</p>
              {stickers.map((sticker, index) => (
                <div key={index}>{sticker}</div>
              ))}
            </div>
          )}
        </div>
      )}
      {showFinalTotal && (
        <div className="final-total mt-4 text-2xl font-bold">
          Final Total: {finalTotal}
        </div>
      )}
    </div>
  );
}

function Roller({
  dice,
  rolling,
  onRoll,
  total,
  bonuses,
  finalTotal,
  showBonuses,
  showFinalTotal,
}: {
  dice: Die[];
  rolling: boolean;
  onRoll: () => void;
  total: number;
  bonuses: string[];
  finalTotal: number;
  showBonuses: boolean;
  showFinalTotal: boolean;
}) {
  return (
    <div className="text-center">
      <button
        onClick={onRoll}
        disabled={rolling}
        className="bg-blue-500 text-white py-3 px-4 rounded mb-4 w-full sm:w-auto hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Roll Die
      </button>
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4 w-full">
        {dice.map((die, index) => (
          <DiceVisualizer key={index} die={die} />
        ))}
      </div>
      <Scorecard
        dice={dice}
        total={total}
        bonuses={bonuses}
        finalTotal={finalTotal}
        showBonuses={showBonuses}
        showFinalTotal={showFinalTotal}
      />
    </div>
  );
}

const game = new Game();
const maxRollsPerRound = 5;
const freshDice = () => Array.from({ length: 6 }, () => getRandomDie(6, 8, 10, 12));

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

  const chooseReward = (reward: Reward) => {
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
  };

  const rollDie = () => {
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
      if (!rolling && !upgrading && !lost) {
        rollDie();
      }
    });
    return () => {
      mousetrap.unbind("space");
    };
  });

  const total = game.calculateSubTotal(dice);
  const bonuses = game.bonusesApplied(dice, modifier);
  const finalTotal = game.calculate(dice, modifier);

  return (
    <>
      <div className="py-6 sm:py-8 px-4 overflow-x-hidden">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">Rolly Polly!</h1>
          <div className="mb-4">
            <div>Round: {round}</div>
            <div>
              Roll: {roll} / {maxRolls}
            </div>
            <div>
              Score: {score} / {targetScore}
            </div>
          </div>

          {modifier && (
            <div className="modifier-notice mb-4 p-3 bg-purple-100 border border-purple-300 rounded">
              <span className="font-bold">{modifier.name}</span>
              <span className="block sm:inline text-sm text-gray-600 sm:before:content-['_—_']">
                {modifier.description}
              </span>
            </div>
          )}

          {lost ? (
            <div className="lost-notice mt-4 p-4 bg-red-100 border border-red-300 rounded">
              <p className="font-bold">You Lost!</p>
              <p>You made it to round {round}.</p>
              <button
                onClick={restart}
                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Play Again
              </button>
            </div>
          ) : upgrading ? (
            <div className="upgrade-notice mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
              <p className="font-bold">Choose Your Reward!</p>
              <p>Three rewards were rolled at random — pick one to keep.</p>

              <div className="mt-4 flex flex-col md:flex-row justify-center gap-3 sm:gap-4">
                {rewards.map((reward, index) => (
                  <button
                    key={index}
                    onClick={() => chooseReward(reward)}
                    className="bg-blue-500 text-white py-3 px-4 rounded w-full md:w-auto md:flex-1 hover:bg-blue-600"
                  >
                    {reward.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Roller
              dice={dice}
              rolling={rolling}
              onRoll={rollDie}
              total={total}
              bonuses={bonuses}
              finalTotal={finalTotal}
              showBonuses={showBonuses}
              showFinalTotal={showFinalTotal}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default App;
