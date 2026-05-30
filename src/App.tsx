import { useState } from "react";
import "./App.css";
import mousetrap from "mousetrap";

import { type Die, getRandomDie } from "./die";

import { Game } from "./game";
import { BASE_SCORE, targetForRound } from "./progression";
import { type Reward, generateRewards, applyReward } from "./reward";

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

const game = new Game();
const maxRollsPerRound = 5;
const startingDice = Array.from({ length: 6 }, () =>
  getRandomDie(6, 8, 10, 12)
);

function App() {
  const [dice, setDice] = useState(startingDice);

  const [round, setRound] = useState(1);
  const [roll, setRoll] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [score, setScore] = useState(0);
  const [targetScore, setTargetScore] = useState(BASE_SCORE);
  const [lost, setLost] = useState(false);

  const [showBonuses, setShowBonuses] = useState(false);
  const [showFinalTotal, setShowFinalTotal] = useState(false);

  const startNewRound = () => {
    const nextRound = round + 1;
    setUpgrading(false);
    setRewards([]);
    setScore(0);
    setTargetScore(targetForRound(nextRound));
    setRound(nextRound);
    setRoll(1);
    setShowBonuses(false);
    setShowFinalTotal(false);
  };

  const chooseReward = (reward: Reward) => {
    setDice(applyReward(dice, reward));
    startNewRound();
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
          const newScore = score + game.calculate(newDice);
          setScore(newScore);
          setRolling(false);
          if (newScore >= targetScore) {
            setRewards(generateRewards(newDice));
            setUpgrading(true);
            return;
          }
          if (roll >= maxRollsPerRound) {
            setLost(true);
          } else {
            setRoll(roll + 1);
          }
        }, rollCount * intervalMs + 2000);
      }
    }, intervalMs);
  };

  mousetrap.bind("space", () => {
    if (!rolling && !upgrading && !lost) {
      rollDie();
    }
  });

  const total = game.calculateSubTotal(dice);
  const bonuses = game.bonusesApplied(dice);
  const finalTotal = game.calculate(dice);

  const Roller = () => {
    return (
      <div className="text-center">
        <button
          onClick={rollDie}
          disabled={rolling}
          className="bg-blue-500 text-white py-2 px-4 rounded mb-4 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Roll Die
        </button>
        <div className="grid grid-cols-5 md:grid-cols-6 gap-4 w-full md:w-1/2 lg:w-1/3 mx-auto">
          {dice.map((die, index) => (
            <DiceVisualizer key={index} die={die} />
          ))}
        </div>
        <Scorecard />
      </div>
    );
  };

  const GameApp = () => {
    if (lost) {
      return (
        <div className="lost-notice mt-4 p-4 bg-red-100 border border-red-300 rounded">
          <p className="font-bold">You Lost!</p>
          <p>Better luck next time!</p>
        </div>
      );
    }

    if (!upgrading) {
      return <Roller />;
    }

    return (
      <div className="upgrade-notice mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
        <p className="font-bold">Choose Your Reward!</p>
        <p>Three rewards were rolled at random — pick one to keep.</p>

        <div className="mt-4 flex flex-col md:flex-row justify-center gap-4">
          {rewards.map((reward, index) => (
            <button
              key={index}
              onClick={() => chooseReward(reward)}
              className="bg-blue-500 text-white py-3 px-4 rounded hover:bg-blue-600"
            >
              {reward.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const Scorecard = () => {
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
                {game.stickersApplied(dice).map((sticker, index) => (
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
  };

  return (
    <>
      <div className="py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Rolly Polly!</h1>
          <div className="mb-4">
            <div>Round: {round}</div>
            <div>
              Roll: {roll} / {maxRollsPerRound}
            </div>
            <div>
              Score: {score} / {targetScore}
            </div>
          </div>
          <GameApp />
        </div>
      </div>
    </>
  );
}

export default App;
