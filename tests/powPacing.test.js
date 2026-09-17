import { describe, expect, it } from 'vitest';
import { formatPowNonce } from '../src/lib/powDice.js';
import { simulateDicePow } from '../src/lib/powSimulations.js';
import { createSeededRandom } from '../src/lib/seededRandom.js';
import { compactToTargetHash, generateTargetHash, getPowBits, getTargetPacing, isProofOfWorkValid, normalizePowLevel } from '../src/lib/targetHash.js';

describe('compact Bitcoin-style proof-of-work target', () => {
  it('formats the uint32 nonce as a stable 8-digit header field', () => {
    expect(formatPowNonce(0)).toBe('0x00000000');
    expect(formatPowNonce(0xffffffff)).toBe('0xFFFFFFFF');
    expect(formatPowNonce(-1)).toBe('—');
  });
  it('keeps nBits and target fixed throughout the short game', () => {
    const target = generateTargetHash('ROOM-ABC', 1);
    expect(generateTargetHash('ANOTHER-ROOM', 12)).toBe(target);
    expect(compactToTargetHash(getPowBits())).toBe(target);
    expect(parseInt(target.slice(0, 2), 16)).toBe(0x05);
    expect(getTargetPacing(target).median).toBe(36);
  });

  it('maps every legacy level to the fixed balanced target', () => {
    expect(normalizePowLevel('1')).toBe('2');
    expect(normalizePowLevel('hard')).toBe('2');
    expect(normalizePowLevel('expert')).toBe('2');
    expect(normalizePowLevel('invalid')).toBe('2');
    expect(generateTargetHash('ROOM', 1, '1')).toBe(generateTargetHash('ROOM', 1, '3'));
  });

  it('uses one inclusive numeric target comparison in display byte order', () => {
    const target = generateTargetHash('ROOM-ABC', 1, '2');
    expect(isProofOfWorkValid('0'.repeat(64), target)).toBe(true);
    expect(isProofOfWorkValid(target, target)).toBe(true);
    expect(isProofOfWorkValid('f'.repeat(64), target)).toBe(false);
    expect(isProofOfWorkValid('not-a-hash', target)).toBe(false);
  });

  it('keeps the balanced target playable without making each block immediate', async () => {
    const stats = await simulateDicePow({ trials: 600, rng: createSeededRandom('pow-balanced') });
    expect(stats.successRate).toBeGreaterThan(0.99);
    expect(stats.median).toBeGreaterThanOrEqual(29);
    expect(stats.median).toBeLessThanOrEqual(45);
  });
});
