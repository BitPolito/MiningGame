const STORAGE_KEY = 'bp-room-session';

/** @typedef {'host' | 'player'} RoomRole */

/**
 * @typedef {object} RoomSession
 * @property {string} seed
 * @property {string} sessionId
 * @property {RoomRole} role
 * @property {string} displayName
 * @property {boolean} hostParticipates
 */

export function createSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function saveRoomSession(session) {
  if (typeof localStorage === 'undefined' || !session?.seed || !session?.sessionId) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadRoomSession() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.seed || !data?.sessionId) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearRoomSession() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
