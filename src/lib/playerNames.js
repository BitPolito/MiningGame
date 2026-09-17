/** Normalize for duplicate checks (trim + case-insensitive). */
export function normalizePlayerName(name) {
  return String(name ?? '').trim().toLowerCase();
}

export const RANDOM_HOST_NAMES = Object.freeze([
  'Satoshi',
  'Hal Finney',
  'Laszlo',
  'Nick Szabo',
  'Adam Back',
  'Wei Dai',
]);

export function getRandomHostName(random = Math.random) {
  const index = Math.floor(random() * RANDOM_HOST_NAMES.length);
  return RANDOM_HOST_NAMES[Math.min(RANDOM_HOST_NAMES.length - 1, Math.max(0, index))];
}

/** True if `name` matches an existing player in the room (waiting lobby). */
export function isPlayerNameTaken(room, name) {
  const key = normalizePlayerName(name);
  if (!key || !room) return false;
  return normalizePlayerName(room.hostDisplayName) === key
    || (room.players ?? []).some((p) => normalizePlayerName(p.name) === key);
}
