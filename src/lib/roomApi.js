async function parseJsonResponse(res) {
  try {
    return await res.json();
  } catch {
    return { success: false, error: 'Invalid server response' };
  }
}

function mapApiError(data, fallback) {
  return data?.error || fallback;
}

/** Check that the room API is reachable (dev: needs npm start or npm run server). */
export async function checkApiHealth() {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    const data = await parseJsonResponse(res);
    return res.ok && data.ok === true;
  } catch {
    return false;
  }
}

export async function createRoom({
  hostName,
  numPlayers,
  blocksToWin,
  difficulty,
  hostParticipates = false,
}) {
  try {
    const res = await fetch('/api/room?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostName,
        numPlayers,
        blocksToWin,
        difficulty,
        hostParticipates,
      }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok || !data.success) {
      return { success: false, error: mapApiError(data, 'Could not create room') };
    }
    return data;
  } catch {
    return { success: false, error: 'connect' };
  }
}

export async function joinRoom(seed, playerName, sessionId) {
  try {
    const res = await fetch('/api/room?action=join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seed: String(seed).trim().toUpperCase(),
        playerName: playerName.trim(),
        sessionId: sessionId || undefined,
      }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok || !data.success) {
      return { success: false, error: mapApiError(data, 'Could not join room') };
    }
    return data;
  } catch {
    return { success: false, error: 'connect' };
  }
}

export async function rejoinRoom(seed, playerName, sessionId, role) {
  try {
    const res = await fetch('/api/room?action=rejoin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seed: String(seed).trim().toUpperCase(),
        playerName: playerName?.trim() || undefined,
        sessionId: sessionId || undefined,
        role,
      }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok || !data.success) {
      return { success: false, error: mapApiError(data, 'Could not rejoin room') };
    }
    return data;
  } catch {
    return { success: false, error: 'connect' };
  }
}

export async function startRoom(seed, difficulty, hostSessionId) {
  try {
    const res = await fetch('/api/room?action=start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seed: String(seed).trim().toUpperCase(),
        difficulty,
        hostSessionId,
      }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok || !data.success) {
      return { success: false, error: mapApiError(data, 'Could not start game') };
    }
    return data;
  } catch {
    return { success: false, error: 'connect' };
  }
}

/** Fetch current room document (status / peek before join). */
export async function fetchRoomStatus(seed) {
  if (!seed?.trim()) return { error: 'Room code is required' };
  try {
    const res = await fetch(
      `/api/room?action=status&seed=${encodeURIComponent(seed.trim().toUpperCase())}`,
      { cache: 'no-store' },
    );
    const data = await parseJsonResponse(res);
    if (!res.ok || !data.success) {
      return { error: mapApiError(data, 'Room not found') };
    }
    return { room: data.room };
  } catch {
    return { error: 'connect' };
  }
}

/** Report a successfully mined block to the room API. */
export async function reportMine(roomSeed, playerName, blockIndex) {
  if (!roomSeed || !playerName) return { success: false, error: 'missing_params' };
  try {
    const res = await fetch('/api/room?action=mine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seed: String(roomSeed).trim().toUpperCase(),
        playerName: String(playerName).trim(),
        blockIndex,
      }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok || data.success === false) {
      return { success: false, error: mapApiError(data, 'Mine not recorded') };
    }
    return data;
  } catch (e) {
    console.error(e);
    return { success: false, error: 'connect' };
  }
}

/** Host resets a finished room for a rematch (same players, scores cleared). */
export async function resetRoom(seed, { hostName, hostSessionId } = {}) {
  try {
    const res = await fetch('/api/room?action=reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seed: String(seed).trim().toUpperCase(),
        hostName,
        hostSessionId,
      }),
    });
    const data = await parseJsonResponse(res);
    if (!res.ok || !data.success) {
      return { success: false, error: mapApiError(data, 'connect') };
    }
    return data;
  } catch {
    return { success: false, error: 'connect' };
  }
}
