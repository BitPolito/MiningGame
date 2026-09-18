export const ROOM_CODE_WORDS = ['HASH', 'NODE', 'SATS', 'UTXO', 'COIN', 'PEER', 'FORK', 'MINE', 'BITS', 'POOL'];
export const ROOM_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const NEW_CODE_RE = /^[A-Z]{4}[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;
const LEGACY_CODE_RE = /^[A-Z]+-[A-Z]+-\d{4}$/;

export function normalizeRoomCode(value) {
  return String(value ?? '').toUpperCase().replace(/\s+/g, '');
}

export function isValidRoomCode(value) {
  const code = normalizeRoomCode(value);
  return NEW_CODE_RE.test(code) || LEGACY_CODE_RE.test(code);
}
