const STORAGE_KEY = 'bp-room-session-v2';

export function saveRoomSession(session) {
  if (typeof localStorage === 'undefined' || !session?.seed || !session?.sessionToken) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function loadRoomSession() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return data?.seed && data?.sessionToken ? data : null;
  } catch {
    return null;
  }
}

export function clearRoomSession() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('bp-room-session');
}
