import { normalizePlayerName } from './playerNames.js';

export function getHostDisplayName(room) {
  return room?.hostDisplayName || room?.players?.[0]?.name || '';
}

export function isRoomHost(sessionId, room) {
  if (!sessionId || !room) return false;
  if (room.hostSessionId && sessionId === room.hostSessionId) return true;
  return false;
}

export function findPlayerInRoom(room, { sessionId, playerName } = {}) {
  if (!room?.players?.length) return null;
  if (sessionId) {
    const bySession = room.players.find((p) => p.sessionId === sessionId);
    if (bySession) return bySession;
  }
  const key = normalizePlayerName(playerName);
  if (!key) return null;
  return room.players.find((p) => normalizePlayerName(p.name) === key) ?? null;
}

export function isActivePlayer(sessionId, room, playerName) {
  return !!findPlayerInRoom(room, { sessionId, playerName });
}

export function hostParticipatesInGame(room) {
  if (room?.hostParticipates === false) return false;
  if (room?.hostParticipates === true) return true;
  const hostName = getHostDisplayName(room);
  return room?.players?.some(
    (p) => normalizePlayerName(p.name) === normalizePlayerName(hostName),
  );
}

/** Pick the App view after loading or updating a room. */
export function resolveRoomView(room, { isHost, isPlayer }) {
  if (!room) return 'menu';
  if (room.status === 'playing' && isPlayer) return 'game';
  if (isHost && !hostParticipatesInGame(room)) return 'host_dashboard';
  if (room.status === 'waiting') return 'lobby_waiting';
  if (room.status === 'playing') return isPlayer ? 'game' : 'host_dashboard';
  if (room.status === 'finished') return 'lobby_finished';
  return 'menu';
}
