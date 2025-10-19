
import { Addition as AdditionSticker, Multiplier as MultiplierSticker, type Sticker } from "./sticker"

type Die = BaseDie | DieD6 | DieD8 | DieD10 | DieD12 | DieD20
type RolledValue = number | Sticker | null;

class BaseDie {
  name = ""
  className = ""
  faces: (number | Sticker)[];
  rolledValue: RolledValue = null;

  constructor(faces: (number | Sticker)[], rolledValue: RolledValue = null) {
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

  roll(): number | Sticker {
    const randomIndex = Math.floor(Math.random() * this.faces.length);
    this.rolledValue = this.faces[randomIndex];
    return this.rolledValue;
  }

  displayRolledValue(): string | undefined {
    if (this.rolledValue instanceof AdditionSticker) {
      return `+${this.rolledValue.amount}`;
    } else if (this.rolledValue instanceof MultiplierSticker) {
      return `x${this.rolledValue.factor}`;
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
}

class DieD2 extends BaseDie {
  name = "D2"
  className = "die-d2"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2], rolledValue);
  }
}

class DieD4 extends BaseDie {
  name = "D4";
  className = "die-d4";
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4], rolledValue);
  }
}

class DieD6 extends BaseDie {
  name = "D6";
  className = "die-d6"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6], rolledValue);
  }
}

class DieD8 extends BaseDie {
  name = "D8";
  className = "die-d8"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6, 7, 8], rolledValue);
  }
}

class DieD10 extends BaseDie {
  name = "D10";
  className = "die-d10"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], rolledValue);
  }
}

class DieD12 extends BaseDie {
  name = "D12";
  className = "die-d12"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rolledValue);
  }
}

class DieD20 extends BaseDie {
  name = "D20";
  className = "die-d20"
  constructor(rolledValue: RolledValue = null) {
    super([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], rolledValue);
  }
}

const getRandomDie = (...possibilities: number[]): Die => {
  const randomIndex = Math.floor(Math.random() * possibilities.length);

  switch (possibilities[randomIndex]) {
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

export { BaseDie, DieD4, DieD6, DieD8, DieD10, DieD12, DieD20, type Die, getRandomDie };
