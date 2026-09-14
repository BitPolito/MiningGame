import { normalizePlayerName } from './playerNames.js';

export function getHostDisplayName(room) {
  return room?.hostDisplayName || room?.players?.[0]?.name || '';
}

export function findPlayerInRoom(room, { playerName } = {}) {
  if (!room?.players?.length) return null;
  const key = normalizePlayerName(playerName);
  if (!key) return null;
  return room.players.find((player) => normalizePlayerName(player.name) === key) ?? null;
}

export function isActivePlayer(room, playerName) {
  return Boolean(findPlayerInRoom(room, { playerName }));
}

export function hostParticipatesInGame(room) {
  if (room?.hostParticipates === false) return false;
  if (room?.hostParticipates === true) return true;
  const hostName = getHostDisplayName(room);
  return room?.players?.some(
    (player) => normalizePlayerName(player.name) === normalizePlayerName(hostName),
  );
}

export function resolveRoomView(room, { isHost, isPlayer }) {
  if (!room) return 'menu';
  if (room.status === 'playing' && isPlayer) return 'game';
  if (isHost && !hostParticipatesInGame(room)) return 'host_dashboard';
  if (room.status === 'waiting') return 'lobby_waiting';
  if (room.status === 'playing') return isPlayer ? 'game' : 'host_dashboard';
  if (room.status === 'finished') return 'lobby_finished';
  return 'menu';
}
