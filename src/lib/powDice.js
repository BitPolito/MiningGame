/** Hard-mode mining: dice are visual; every attempt uses a uint32 nonce. */
const DICE_MIN = 1;
const DICE_MAX = 6;
const UINT32_RANGE = 0x100000000;
export const DICE_COUNT = 4;
export function formatPowNonce(value) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= UINT32_RANGE) return '—';
  return `0x${value.toString(16).padStart(8, '0').toUpperCase()}`;
}

export function rollDiceFaces(rng = Math.random) {
  return Array.from({ length: DICE_COUNT }, () => DICE_MIN + Math.floor(rng() * DICE_MAX));
}

function secureUint32() {
  if (!globalThis.crypto?.getRandomValues) return null;
  const value = new Uint32Array(1);
  globalThis.crypto.getRandomValues(value);
  return value[0];
}

/** The optional RNG keeps simulations deterministic; normal play uses Web Crypto. */
export function nonceFromDiceRoll(attemptIndex, rng = null) {
  void attemptIndex;
  const visualRng = rng ?? Math.random;
  const dice = rollDiceFaces(visualRng);
  const nonce = rng ? Math.floor(rng() * UINT32_RANGE) >>> 0 : (secureUint32() ?? Math.floor(Math.random() * UINT32_RANGE));
  return { dice, nonce };
}

export function emptyDiceFaces() {
  return Array(DICE_COUNT).fill(null);
}

export function isDiceReady(faces) {
  return Array.isArray(faces) && faces.length === DICE_COUNT
    && faces.every((value) => Number.isInteger(value) && value >= DICE_MIN && value <= DICE_MAX);
}
