/**
 * Hard-mode mining: each attempt is a dice roll → random nonce (not sequential +1).
 */

/** @typedef {{ d1: number, d2: number, sum: number }} DiceRoll */

const DICE_MIN = 1;
const DICE_MAX = 6;

/**
 * @param {() => number} [rng] unit interval [0, 1)
 * @returns {DiceRoll}
 */
export function rollDicePair(rng = Math.random) {
  const d1 = DICE_MIN + Math.floor(rng() * DICE_MAX);
  const d2 = DICE_MIN + Math.floor(rng() * DICE_MAX);
  return { d1, d2, sum: d1 + d2 };
}

/**
 * Random nonce for this attempt (dice are the visual metaphor; nonce is not d1+d2 only).
 * @param {number} attemptIndex 1-based roll count
 * @param {() => number} [rng]
 */
export function nonceFromDiceRoll(attemptIndex, rng = Math.random) {
  const { d1, d2 } = rollDicePair(rng);
  const spread = Math.floor(rng() * 997) + 1;
  const nonce = d1 * 10000 + d2 * 1000 + attemptIndex * 37 + spread;
  return { dice: [d1, d2], nonce: Math.max(1, nonce) };
}

export function emptyDiceFaces() {
  return [null, null];
}

export function isDiceReady(faces) {
  return faces.every((v) => typeof v === 'number' && v >= DICE_MIN && v <= DICE_MAX);
}
