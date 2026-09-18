import { randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_WORDS } from '../src/lib/roomCode.js';

export function generateRoomCode() {
  const word = ROOM_CODE_WORDS[randomInt(ROOM_CODE_WORDS.length)];
  let suffix = '';
  for (let index = 0; index < 6; index += 1) {
    suffix += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return word + suffix;
}
