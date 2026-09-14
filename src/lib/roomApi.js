async function parseJsonResponse(res) {
  try {
    return await res.json();
  } catch {
    return { success: false, error: 'INVALID_RESPONSE' };
  }
}

function authHeaders(sessionToken, json = false) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  };
}

async function request(url, { method = 'GET', body, sessionToken } = {}) {
  try {
    const res = await fetch(url, {
      method,
      headers: authHeaders(sessionToken, body !== undefined),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
    });
    const data = await parseJsonResponse(res);
    return res.ok && data.success !== false
      ? data
      : { success: false, error: data?.error || 'REQUEST_FAILED' };
  } catch {
    return { success: false, error: 'CONNECT_ERROR' };
  }
}

export async function checkApiHealth() {
  const data = await request('/api/health');
  return data.ok === true;
}

export function createRoom(options) {
  return request('/api/room?action=create', { method: 'POST', body: options });
}

export function joinRoom(seed, playerName) {
  return request('/api/room?action=join', {
    method: 'POST',
    body: { seed: String(seed).trim().toUpperCase(), playerName: playerName.trim() },
  });
}

export function rejoinRoom(seed, sessionToken) {
  return request('/api/room?action=rejoin', {
    method: 'POST',
    body: { seed: String(seed).trim().toUpperCase() },
    sessionToken,
  });
}

export function startRoom(seed, sessionToken) {
  return request('/api/room?action=start', {
    method: 'POST',
    body: { seed: String(seed).trim().toUpperCase() },
    sessionToken,
  });
}

export async function fetchRoomStatus(seed, sessionToken) {
  if (!seed?.trim()) return { success: false, error: 'INVALID_ROOM_CODE' };
  return request(`/api/room?action=status&seed=${encodeURIComponent(seed.trim().toUpperCase())}`, {
    sessionToken,
  });
}

export function reportMine(roomSeed, sessionToken, { blockIndex, selectedTxIds, nonce }) {
  return request('/api/room?action=mine', {
    method: 'POST',
    body: {
      seed: String(roomSeed).trim().toUpperCase(),
      blockIndex,
      selectedTxIds,
      nonce,
    },
    sessionToken,
  });
}

export function resetRoom(seed, sessionToken) {
  return request('/api/room?action=reset', {
    method: 'POST',
    body: { seed: String(seed).trim().toUpperCase() },
    sessionToken,
  });
}
