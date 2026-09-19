import { describe, expect, it } from 'vitest';
import { DICE_COUNT, emptyDiceFaces, formatPowNonce, isDiceReady, nonceFromDiceRoll } from '../src/lib/powDice.js';
import { simulateDicePow } from '../src/lib/powSimulations.js';
import { createSeededRandom } from '../src/lib/seededRandom.js';
import { POW_BITS_CHOICES, POW_SCHEDULE_LENGTH, compactToTargetHash, createPowSchedule, generateTargetHash, getPowBits, getTargetPacing, isProofOfWorkValid, isValidPowSchedule, normalizePowLevel } from '../src/lib/targetHash.js';

describe('compact Bitcoin-style proof-of-work target', () => {
  it('formats the uint32 nonce as a stable 8-digit header field', () => {
    expect(formatPowNonce(0)).toBe('0x00000000');
    expect(formatPowNonce(0xffffffff)).toBe('0xFFFFFFFF');
    expect(formatPowNonce(-1)).toBe('—');
  });
  it('draws independent, bounded schedules with a target for every playable block', () => {
    const first = createPowSchedule();
    const second = createPowSchedule();
    const third = createPowSchedule();
    const fourth = createPowSchedule();
    expect(first).toHaveLength(POW_SCHEDULE_LENGTH);
    expect(isValidPowSchedule(first)).toBe(true);
    expect(isValidPowSchedule(second)).toBe(true);
    expect(new Set([first, second, third, fourth].map(JSON.stringify)).size).toBeGreaterThan(1);
    expect(isValidPowSchedule(first.slice(0, -1))).toBe(false);
    expect(isValidPowSchedule([...first.slice(0, -1), 0])).toBe(false);
    expect(getPowBits(() => 0x00000000)).toBe(POW_BITS_CHOICES[0]);
    expect(getPowBits(() => 0x40000000)).toBe(POW_BITS_CHOICES[1]);
    expect(getPowBits(() => 0x80000000)).toBe(POW_BITS_CHOICES[1]);
    expect(getPowBits(() => 0xc0000000)).toBe(POW_BITS_CHOICES[2]);
    const draws = [0, 0x40000000, 0x80000000, 0xc0000000];
    let drawIndex = 0;
    const deterministic = createPowSchedule(() => draws[drawIndex++ % draws.length]);
    expect(deterministic).toHaveLength(POW_SCHEDULE_LENGTH);
    expect(isValidPowSchedule(deterministic)).toBe(true);
    expect(getTargetPacing(compactToTargetHash(POW_BITS_CHOICES[0])).median).toBe(59);
    expect(getTargetPacing(compactToTargetHash(POW_BITS_CHOICES[1])).median).toBe(45);
    expect(getTargetPacing(compactToTargetHash(POW_BITS_CHOICES[2])).median).toBe(36);
  });

  it('normalizes legacy level labels without affecting target selection', () => {
    expect(normalizePowLevel('1')).toBe('2');
    expect(normalizePowLevel('hard')).toBe('2');
    expect(normalizePowLevel('expert')).toBe('2');
    expect(normalizePowLevel('invalid')).toBe('2');
  });

  it('uses one inclusive numeric target comparison in display byte order', () => {
    const target = generateTargetHash();
    expect(isProofOfWorkValid('0'.repeat(64), target)).toBe(true);
    expect(isProofOfWorkValid(target, target)).toBe(true);
    expect(isProofOfWorkValid('f'.repeat(64), target)).toBe(false);
    expect(isProofOfWorkValid('not-a-hash', target)).toBe(false);
  });

  it('uses four visual dice but exactly one 32-bit nonce per roll', () => {
    expect(emptyDiceFaces()).toHaveLength(DICE_COUNT);
    const attempt = nonceFromDiceRoll(1, createSeededRandom('dice'));
    expect(attempt.dice).toHaveLength(DICE_COUNT);
    expect(isDiceReady(attempt.dice)).toBe(true);
    expect(isDiceReady([1, 2])).toBe(false);
    expect(attempt.nonce).toBeGreaterThanOrEqual(0);
    expect(attempt.nonce).toBeLessThanOrEqual(0xffffffff);
  });

  it('keeps every target playable without making each block immediate', async () => {
    const stats = await simulateDicePow({ targetHash: compactToTargetHash(POW_BITS_CHOICES[1]), trials: 600, rng: createSeededRandom('pow-balanced') });
    expect(stats.successRate).toBeGreaterThan(0.99);
    const expected = getTargetPacing(stats.targetHash).median;
    expect(stats.median).toBeGreaterThanOrEqual(expected - 8);
    expect(stats.median).toBeLessThanOrEqual(expected + 8);
  });
});
