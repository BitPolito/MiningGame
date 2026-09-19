const STORAGE_KEY = 'bp-room-session-v5';
const RESUME_INTENT_KEY = 'bp-room-resume-intent-v1';

export function saveRoomSession(session) {
  if (typeof localStorage === 'undefined' || !session?.seed || !session?.sessionToken) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  setRoomResumeIntent(true);
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

export function setRoomResumeIntent(active) {
  if (typeof sessionStorage === 'undefined') return;
  if (active) sessionStorage.setItem(RESUME_INTENT_KEY, 'active');
  else sessionStorage.removeItem(RESUME_INTENT_KEY);
}

export function shouldAutoResumeRoom() {
  return typeof sessionStorage !== 'undefined'
    && sessionStorage.getItem(RESUME_INTENT_KEY) === 'active';
}

export function clearRoomSession() {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('bp-room-session-v4');
  localStorage.removeItem('bp-room-session-v3');
  localStorage.removeItem('bp-room-session-v2');
  localStorage.removeItem('bp-room-session');
  setRoomResumeIntent(false);
}
