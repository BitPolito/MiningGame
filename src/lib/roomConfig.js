export const DEFAULT_BLOCKS_TO_WIN = 3;
export const MIN_BLOCKS_TO_WIN = 1;
export const MAX_BLOCKS_TO_WIN = 12;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 21;

export function clampNumPlayers(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 3;
  return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, n));
}

/** Clamp blocks-to-win to allowed range. */
export function clampBlocksToWin(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return DEFAULT_BLOCKS_TO_WIN;
  return Math.min(MAX_BLOCKS_TO_WIN, Math.max(MIN_BLOCKS_TO_WIN, n));
}

/** Block indices for UI (#0 genesis … #N). */
export function getBlockColumns(blocksToWin) {
  const n = clampBlocksToWin(blocksToWin);
  return Array.from({ length: n + 1 }, (_, i) => i);
}

export function getRoomBlocksToWin(room) {
  if (room?.blocksToWin != null) return clampBlocksToWin(room.blocksToWin);
  return DEFAULT_BLOCKS_TO_WIN;
}

/** Prefer the room document with the latest `updatedAt` (avoids stale poll state). */
export function pickNewerRoom(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  const ta = a.updatedAt ?? 0;
  const tb = b.updatedAt ?? 0;
  return tb >= ta ? b : a;
}
