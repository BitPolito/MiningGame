import { createSeededRandom } from './seededRandom.js';

/** Classroom-friendly: ~1/16 hashes pass the leading-zero check per dice roll. */
export const LEADING_ZEROS = 1;

/**
 * Full Bitcoin-style check also compares hash < target (median ~19 rolls).
 * Prefix-only is tuned for faster dice sessions (median ~11 rolls); see npm run simulate:pow.
 */
export const HARD_POW_CHECK_TARGET = false;

export function isProofOfWorkValid(
  finalHash,
  targetHash,
  leadingZeros = LEADING_ZEROS,
  checkTarget = HARD_POW_CHECK_TARGET,
) {
  if (!finalHash || !targetHash) return false;
  const prefix = '0'.repeat(leadingZeros);
  if (!finalHash.startsWith(prefix)) return false;
  if (!checkTarget) return true;
  return finalHash < targetHash;
}

export function generateTargetHash(roomSeed = '', blockNum = 1) {
  const rng = createSeededRandom(`${roomSeed || 'solo'}-target-${blockNum}`);
  let randomTarget = '';
  for (let i = 0; i < 64 - LEADING_ZEROS; i++) {
    randomTarget += Math.floor(rng() * 16).toString(16);
  }
  return '0'.repeat(LEADING_ZEROS) + randomTarget;
}
