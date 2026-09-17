export const POW_BITS = 0x20050000;

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

export function getPowBits() {
  return POW_BITS;
}

/** A short game keeps nBits fixed, as Bitcoin does inside a difficulty period. */
export function generateTargetHash(roomSeed = 'solo', blockNum = 1, powLevel = '2') {
  void roomSeed;
  void blockNum;
  void powLevel;
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
