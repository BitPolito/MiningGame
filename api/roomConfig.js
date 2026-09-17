export const DEFAULT_BLOCKS_TO_WIN = 3;
export const MIN_BLOCKS_TO_WIN = 1;
export const MAX_BLOCKS_TO_WIN = 12;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 30;
export const FIXED_POW_LEVEL = '2';

export function clampBlocksToWin(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return DEFAULT_BLOCKS_TO_WIN;
  return Math.min(MAX_BLOCKS_TO_WIN, Math.max(MIN_BLOCKS_TO_WIN, n));
}

export function clampNumPlayers(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 3;
  return Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, n));
}

/** Everyone connected to the room counts, including a non-mining host. */
export function getRoomOccupancy(room) {
  return (room?.players?.length ?? 0) + (room?.hostParticipates === false ? 1 : 0);
}

export function normalizePowLevel(value) {
  void value;
  return FIXED_POW_LEVEL;
}
