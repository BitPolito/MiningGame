import { describe, expect, it } from 'vitest';
import { generateRoomCode } from '../api/roomCode.js';
import { isValidRoomCode, normalizeRoomCode, ROOM_CODE_ALPHABET, ROOM_CODE_WORDS } from '../src/lib/roomCode.js';

describe('room codes', () => {
  it('generates short Bitcoin-themed codes without separators or ambiguous suffix characters', () => {
    for (let index = 0; index < 100; index += 1) {
      const code = generateRoomCode();
      expect(code).toHaveLength(10);
      expect(ROOM_CODE_WORDS).toContain(code.slice(0, 4));
      expect([...code.slice(4)].every((character) => ROOM_CODE_ALPHABET.includes(character))).toBe(true);
      expect(isValidRoomCode(code)).toBe(true);
    }
  });

  it('normalizes manual entry and still accepts existing room codes', () => {
    expect(normalizeRoomCode(' hash 7kq2m9 ')).toBe('HASH7KQ2M9');
    expect(isValidRoomCode(' hash 7kq2m9 ')).toBe(true);
    expect(isValidRoomCode('SATOSHI-GENESIS-0400')).toBe(true);
    expect(isValidRoomCode('HASH7KQ2M0')).toBe(false);
    expect(isValidRoomCode('INVALID')).toBe(false);
  });
});
