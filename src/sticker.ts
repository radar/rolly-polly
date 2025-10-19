class Multiplier {
  factor: number;
  constructor(factor: number) {
    this.factor = factor;
  }
}

class Addition {
  amount: number;
  constructor(amount: number) {
    this.amount = amount;
  }
}

type Sticker = Multiplier | Addition;

class StickerFactory {
  static createMultiplier(factor: number): Multiplier {
    return new Multiplier(factor);
  }

  static createAddition(amount: number): Addition {
    return new Addition(amount);
  }

  static build(value: string): Sticker {
    if (value.endsWith("x")) {
      const factor = parseInt(value.slice(0, -1), 10);
      return this.createMultiplier(factor);
    } else if (value.startsWith("+")) {
      const amount = parseInt(value.slice(1), 10);
      return this.createAddition(amount);
    } else {
      throw new Error(`Invalid sticker value: ${value}`);
    }
  }
}

export { Multiplier, Addition, type Sticker, StickerFactory };
