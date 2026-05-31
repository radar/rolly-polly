
import { Addition as AdditionSticker, Multiplier as MultiplierSticker, Percentage as PercentageSticker, StickerFactory, type Sticker } from "./sticker"

// A joker face: it has no numeric value of its own, but during scoring it joins
// the matched-set combo that gains the most (see Game.comboBonuses). Marker
// class — its mere instance type is the signal.
class Wild {}

type Die = BaseDie | DieD6 | DieD8 | DieD10 | DieD12 | DieD20
type Face = number | Sticker | Wild;
type RolledValue = Face | null;

class BaseDie {
  name = ""
  className = ""
  faces: Face[];
  rolledValue: RolledValue = null;
  canUpgrade = true;

  constructor(faces: Face[], rolledValue: RolledValue = null) {
    this.faces = faces;
    this.rolledValue = rolledValue;
  }

  modificationsApplied(): string[] {
    const modifications: string[] = [];
    const additionStickers = this.faces.filter(
      (face) => face instanceof AdditionSticker
    ) as AdditionSticker[];
    const multiplierStickers = this.faces.filter(
      (face) => face instanceof MultiplierSticker
    ) as MultiplierSticker[];

    additionStickers.forEach((sticker) => {
      modifications.push(`(+${sticker.amount})`);
    });

    multiplierStickers.forEach((sticker) => {
      modifications.push(`(x${sticker.factor})`);
    });

    return modifications;
  }

  highestNumber(): number {
    return Math.max(
      ...this.faces.filter((face) => typeof face === 'number') as number[]
    );
  }

  lowestNumber(): number {
    return Math.min(
      ...this.faces.filter((face) => typeof face === 'number') as number[]
    );
  }

  maxBonus(): number {
    return Math.ceil(this.highestNumber() / 2);
  }

  rolledMax(): boolean {
    return this.rolledValue === this.highestNumber();
  }

  rolledMin(): boolean {
    return this.rolledValue === this.lowestNumber();
  }

  minPenalty(): number {
    return -Math.floor(this.highestNumber() / 2);
  }

  roll(): Face {
    const randomIndex = Math.floor(Math.random() * this.faces.length);
    this.rolledValue = this.faces[randomIndex];
    return this.rolledValue;
  }

  displayRolledValue(): string | undefined {
    if (this.rolledValue instanceof AdditionSticker) {
      return `+${this.rolledValue.amount}`;
    } else if (this.rolledValue instanceof MultiplierSticker) {
      return `x${this.rolledValue.factor}`;
    } else if (this.rolledValue instanceof PercentageSticker) {
      return `+${this.rolledValue.percent}%`;
    } else if (this.rolledValue instanceof Wild) {
      return "★";
    } else if (typeof this.rolledValue === 'number') {
      return this.rolledValue.toString();
    }
  }

  addSticker(sticker: Sticker) {
    if (sticker instanceof AdditionSticker) {
      // Remove two random faces, then add two stickers
      this.faces.splice(Math.floor(Math.random() * this.faces.length), 1);
      this.faces.splice(Math.floor(Math.random() * this.faces.length), 1);
      this.faces.push(sticker, sticker);
    } else if (sticker instanceof MultiplierSticker) {
      // Remove one random face, then add one sticker
      this.faces.splice(Math.floor(Math.random() * this.faces.length), 1);
      this.faces.push(sticker);
    }
  }

  upgrade(): Die {
    return this;
  }
}

class DieD1 extends BaseDie {
  name = "D1"
  className = "die-d1"
  constructor(rolledValue: RolledValue = null) {
    super([1], rolledValue);
  }

  minPenalty(): number {
    return 0;
  }

  upgrade(): Die {
    return new DieD2(this.rolledValue);
  }
}

class DieD2 extends BaseDie {
  name = "D2"
  className = "die-d2"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2], rolledValue);
  }

  minPenalty(): number {
    return 0;
  }

  upgrade(): Die {
    return new DieD4(this.rolledValue);
  }
}

class DieD4 extends BaseDie {
  name = "D4";
  className = "die-d4";
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4], rolledValue);
  }

  upgrade(): Die {
    return new DieD6(this.rolledValue);
  }
}

class DieD6 extends BaseDie {
  name = "D6";
  className = "die-d6"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6], rolledValue);
  }

  upgrade(): Die {
    return new DieD8(this.rolledValue);
  }
}

class DieD8 extends BaseDie {
  name = "D8";
  className = "die-d8"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6, 7, 8], rolledValue);
  }

  upgrade(): Die {
    return new DieD10(this.rolledValue);
  }
}

class DieD10 extends BaseDie {
  name = "D10";
  className = "die-d10"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rolledValue);
  }

  upgrade(): Die {
    return new DieD12(this.rolledValue);
  }
}

class DieD12 extends BaseDie {
  name = "D12";
  className = "die-d12"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rolledValue);
  }

  upgrade(): Die {
    return new DieD20(this.rolledValue);
  }
}

class DieD20 extends BaseDie {
  name = "D20";
  className = "die-d20"
  canUpgrade = false;
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], rolledValue);
  }
}

class DieOdd extends BaseDie {
  name = "Dodd";
  className = "die-dodd"
  canUpgrade = false;
  constructor(rolledValue: RolledValue = null) {
    super([1, 3, 5, 7, 9], rolledValue);
  }
}

class DieEven extends BaseDie {
  name = "Deven";
  className = "die-deven"
  canUpgrade = false;
  constructor(rolledValue: RolledValue = null) {
    super([2, 4, 6, 8, 10], rolledValue);
  }
}

class DieFib extends BaseDie {
  name = "Dfib";
  className = "die-dfib"
  canUpgrade = false;

  // Default Fibonacci faces up to 21
  constructor(faces: number[] = [1, 1, 2, 3, 5, 8, 13, 21], rolledValue: RolledValue = null) {
    super(faces, rolledValue);
  }
}

class DieMultiplier extends BaseDie {
  name = "Dmulti";
  className = "die-dmulti"
  canUpgrade = false;

  constructor(rolledValue: RolledValue = null) {
    // Whole-total multiplier, so faces center near 1 with a real downside
    // (a 0 "whiff") to keep it a gamble rather than free score. EV = 1.3.
    super([
      StickerFactory.createMultiplier(0),
      StickerFactory.createMultiplier(0.5),
      StickerFactory.createMultiplier(1),
      StickerFactory.createMultiplier(2),
      StickerFactory.createMultiplier(3),
    ], rolledValue);
  }
}

class DiePercent extends BaseDie {
  name = "D%";
  className = "die-dpercent"
  canUpgrade = false;

  constructor(rolledValue: RolledValue = null) {
    // A pure upside die: each face boosts the whole score by that percent. A 0
    // face keeps it a gamble rather than free points. EV = +25%.
    super([
      new PercentageSticker(0),
      new PercentageSticker(10),
      new PercentageSticker(20),
      new PercentageSticker(30),
      new PercentageSticker(40),
      new PercentageSticker(50),
    ], rolledValue);
  }
}

class DiePrime extends BaseDie {
  name = "Prime";
  className = "die-dprime"
  canUpgrade = false;
  constructor(rolledValue: RolledValue = null) {
    // Sparse spread — near-impossible to pair or straight, a raw-value gamble.
    super([2, 3, 5, 7, 11, 13], rolledValue);
  }
}

class DiePower extends BaseDie {
  name = "Power";
  className = "die-dpower"
  canUpgrade = false;
  constructor(rolledValue: RolledValue = null) {
    // Doubling ladder: a huge top end (32) but weak combo odds. High variance.
    super([1, 2, 4, 8, 16, 32], rolledValue);
  }
}

class DieGlass extends BaseDie {
  name = "Glass";
  className = "die-dglass"
  canUpgrade = false;
  constructor(rolledValue: RolledValue = null) {
    // Glass cannon: max-roll bonus farmer when it hits 20, min-roll penalty
    // when it whiffs to 1. No middle ground.
    super([20, 20, 20, 1, 1, 1], rolledValue);
  }
}

class DieWild extends BaseDie {
  name = "Wild";
  className = "die-dwild"
  canUpgrade = false;
  constructor(rolledValue: RolledValue = null) {
    // Every face is a joker — it always rolls wild and joins the best combo.
    super([new Wild(), new Wild(), new Wild(), new Wild(), new Wild(), new Wild()], rolledValue);
  }

  // No numeric faces, so the inherited max/min logic would read ±Infinity.
  // A wild never earns a max bonus or a min penalty.
  maxBonus(): number { return 0; }
  minPenalty(): number { return 0; }
  rolledMax(): boolean { return false; }
  rolledMin(): boolean { return false; }
}

const getRandomDie = (...possibilities: Array<number | string>): Die => {
  const randomIndex = Math.floor(Math.random() * possibilities.length);

  switch (possibilities[randomIndex]) {
    case "odd":
      return new DieOdd();
    case "even":
      return new DieEven();
    case "fib":
      return new DieFib();
    case "multi":
      return new DieMultiplier();
    case "percent":
      return new DiePercent();
    case "prime":
      return new DiePrime();
    case "power":
      return new DiePower();
    case "glass":
      return new DieGlass();
    case "wild":
      return new DieWild();
    case 1:
      return new DieD1();
    case 2:
      return new DieD2();
    case 4:
      return new DieD4();
    case 6:
      return new DieD6();
    case 8:
      return new DieD8();
    case 10:
      return new DieD10();
    case 12:
      return new DieD12();
    case 20:
      return new DieD20();
    default:
      return new DieD6();
  }
}

export { BaseDie, Wild, DieD1, DieD2, DieD4, DieD6, DieD8, DieD10, DieD12, DieD20, DieOdd, DieEven, DieFib, DieMultiplier, DiePercent, DiePrime, DiePower, DieGlass, DieWild, type Die, getRandomDie };
