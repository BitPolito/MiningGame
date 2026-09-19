import { MAX_BLOCKS_TO_WIN } from './roomConfig.js';

export const POW_BITS = 0x20040000;
export const POW_SCHEDULE_LENGTH = MAX_BLOCKS_TO_WIN + 1;
export const POW_BITS_CHOICES = Object.freeze([0x20030000, POW_BITS, 0x20050000]);

/** A fresh Web Crypto draw, never derived from a public room code or block index. */
export function getPowBits(randomUint32 = null) {
  if (randomUint32) {
    const quartile = Number(randomUint32()) >>> 30;
    if (quartile === 0) return POW_BITS_CHOICES[0];
    if (quartile === 3) return POW_BITS_CHOICES[2];
    return POW_BITS;
  }
  const draw = new Uint32Array(1);
  globalThis.crypto.getRandomValues(draw);
  const quartile = draw[0] >>> 30;
  if (quartile === 0) return POW_BITS_CHOICES[0];
  if (quartile === 3) return POW_BITS_CHOICES[2];
  return POW_BITS;
}

/** Draw once at game creation/reset, then persist for every miner and block. */
export function createPowSchedule(randomUint32 = null) {
  return Array.from({ length: POW_SCHEDULE_LENGTH }, () => getPowBits(randomUint32));
}

export function isValidPowSchedule(schedule) {
  return Array.isArray(schedule)
    && schedule.length === POW_SCHEDULE_LENGTH
    && schedule.every((bits) => POW_BITS_CHOICES.includes(bits));
}

export function normalizePowLevel(value) {
  void value;
  return '2';
}

export function compactToTargetHash(bits) {
  const compact = Number(bits) >>> 0;
  const exponent = compact >>> 24;
  const mantissa = compact & 0x007fffff;
  if (!mantissa || compact & 0x00800000) throw new RangeError('Invalid compact target');
  const target = exponent <= 3
    ? BigInt(mantissa) >> BigInt(8 * (3 - exponent))
    : BigInt(mantissa) << BigInt(8 * (exponent - 3));
  if (target <= 0n || target >= (1n << 256n)) throw new RangeError('Target outside uint256 range');
  return target.toString(16).padStart(64, '0');
}

/** Educational per-block variation; Bitcoin itself retargets much less often. */
export function generateTargetHash() {
  return compactToTargetHash(getPowBits());
}

export function isProofOfWorkValid(displayHash, targetHash) {
  if (!displayHash || !targetHash) return false;
  if (!/^[0-9a-f]{64}$/i.test(displayHash) || !/^[0-9a-f]{64}$/i.test(targetHash)) return false;
  return BigInt(`0x${displayHash}`) <= BigInt(`0x${targetHash}`);
}

export function getTargetPacing(targetHash) {
  if (!/^[0-9a-f]{64}$/i.test(targetHash)) return null;
  const prefix = Number.parseInt(targetHash.slice(0, 8), 16);
  const probability = (prefix + 1) / 0x100000000;
  const percentile = (chance) => Math.max(1, Math.ceil(Math.log(1 - chance) / Math.log(1 - probability)));
  return { probability, median: percentile(0.5), p90: percentile(0.9) };
}
