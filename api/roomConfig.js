export const DEFAULT_BLOCKS_TO_WIN = 3;
export const MIN_BLOCKS_TO_WIN = 1;
export const MAX_BLOCKS_TO_WIN = 12;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 21;

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
