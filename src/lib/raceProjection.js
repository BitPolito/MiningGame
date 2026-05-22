import { getRoomBlocksToWin } from './roomConfig.js';

/** @param {import('./roomApi').RoomPlayer[]} players */
export function sortPlayersByBlocks(players = []) {
  return [...players].sort((a, b) => {
    if (b.blocks !== a.blocks) return b.blocks - a.blocks;
    const ta = a.lastMinedAt ?? 0;
    const tb = b.lastMinedAt ?? 0;
    return tb - ta;
  });
}

/**
 * @param {object} room
 * @returns {{ leader: object|null, likelyWinner: object|null, goal: number }}
 */
export function analyzeRace(room) {
  const players = room?.players ?? [];
  const goal = getRoomBlocksToWin(room);
  const sorted = sortPlayersByBlocks(players);

  if (!sorted.length) {
    return { leader: null, likelyWinner: null, goal, sorted };
  }

  const leader = sorted[0];
  const finished = room?.status === 'finished';
  const officialWinner = room?.winner
    ? players.find((p) => p.name === room.winner) ?? null
    : null;

  if (officialWinner) {
    return { leader: officialWinner, likelyWinner: officialWinner, goal, sorted };
  }

  if (finished) {
    return { leader, likelyWinner: leader, goal, sorted };
  }

  const atGoal = sorted.filter((p) => p.blocks >= goal);
  if (atGoal.length) {
    return { leader: atGoal[0], likelyWinner: atGoal[0], goal, sorted };
  }

  const top = leader.blocks;
  const contenders = sorted.filter((p) => p.blocks >= top - 1 && p.blocks > 0);
  const likelyWinner = contenders.length === 1 ? contenders[0] : leader;

  return { leader, likelyWinner, goal, sorted };
}
