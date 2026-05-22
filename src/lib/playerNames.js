/** Normalize for duplicate checks (trim + case-insensitive). */
export function normalizePlayerName(name) {
  return String(name ?? '').trim().toLowerCase();
}

/** True if `name` matches an existing player in the room (waiting lobby). */
export function isPlayerNameTaken(room, name) {
  const key = normalizePlayerName(name);
  if (!key || !room?.players?.length) return false;
  return room.players.some((p) => normalizePlayerName(p.name) === key);
}
