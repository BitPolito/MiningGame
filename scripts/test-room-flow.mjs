#!/usr/bin/env node
/**
 * Smoke test API stanze (create → join → rejoin → start → mine → reset).
 * Richiede: node server.js in ascolto su :3001
 */
const BASE = process.env.ROOM_API || 'http://127.0.0.1:3001/api/room';

async function post(action, body = {}) {
  const res = await fetch(`${BASE}?action=${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function getStatus(seed) {
  const res = await fetch(`${BASE}?action=status&seed=${encodeURIComponent(seed)}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function main() {
  const created = await post('create', {
    hostName: 'Host',
    numPlayers: 2,
    difficulty: 'easy',
    blocksToWin: 3,
    hostParticipates: true,
  });
  const seed = created.seed;
  const hostSessionId = created.hostSessionId;
  console.log('create OK', seed);

  await post('join', { seed, playerName: 'Guest' });
  console.log('join OK');

  try {
    await post('join', { seed, playerName: 'Guest' });
    throw new Error('expected duplicate name to fail');
  } catch (err) {
    if (!String(err.message).includes('Name already taken')) throw err;
  }
  console.log('duplicate name rejected OK');

  const rejoined = await post('rejoin', {
    seed,
    playerName: 'Host',
    sessionId: hostSessionId,
  });
  if (rejoined.role !== 'host' || rejoined.room.status !== 'waiting') {
    throw new Error('host rejoin failed');
  }
  console.log('host rejoin OK');

  const guestPlayer = rejoined.room.players.find((p) => p.name === 'Guest');
  const guestRejoin = await post('rejoin', {
    seed,
    playerName: 'Guest',
    sessionId: guestPlayer.sessionId,
  });
  if (guestRejoin.role !== 'player') throw new Error('guest rejoin failed');
  console.log('guest rejoin while waiting OK');

  const earlyRoom = await post('create', {
    hostName: 'EarlyHost',
    numPlayers: 4,
    difficulty: 'easy',
    blocksToWin: 2,
    hostParticipates: true,
  });
  const earlySeed = earlyRoom.seed;
  await post('join', { seed: earlySeed, playerName: 'SoloGuest' });
  const earlyStart = await post('start', {
    seed: earlySeed,
    hostSessionId: earlyRoom.hostSessionId,
  });
  if (earlyStart.room.players.length !== 2 || earlyStart.room.status !== 'playing') {
    throw new Error('start with fewer than max players failed');
  }
  console.log('early start (2/4) OK');

  const started = await post('start', { seed, difficulty: 'easy', hostSessionId });
  if (started.room.status !== 'playing') throw new Error('start failed');
  console.log('start OK');

  const guestMid = await post('rejoin', {
    seed,
    playerName: 'Guest',
    sessionId: guestPlayer.sessionId,
  });
  if (guestMid.room.status !== 'playing') throw new Error('guest rejoin mid-game failed');
  console.log('guest rejoin mid-game OK');

  for (let i = 1; i <= 3; i += 1) {
    await post('mine', { seed, playerName: 'Host', blockIndex: i });
  }

  const statusData = await getStatus(seed);
  if (statusData.room?.status !== 'finished') {
    throw new Error('expected finished after 3 mines');
  }
  console.log('mine + win OK');

  const reset = await post('reset', { seed, hostSessionId });
  if (reset.room.status !== 'waiting') throw new Error('reset failed');
  console.log('reset OK');

  const spectator = await post('create', {
    hostName: 'Organizer',
    numPlayers: 2,
    difficulty: 'easy',
    blocksToWin: 2,
    hostParticipates: false,
  });
  const specSeed = spectator.seed;
  const specHostId = spectator.hostSessionId;
  if (spectator.room.players.length !== 0) {
    throw new Error('spectator host should not be in players list');
  }
  await post('join', { seed: specSeed, playerName: 'Alice' });
  await post('join', { seed: specSeed, playerName: 'Bob' });
  await post('start', { seed: specSeed, hostSessionId: specHostId });
  const specRejoin = await post('rejoin', {
    seed: specSeed,
    sessionId: specHostId,
    playerName: 'Organizer',
  });
  if (specRejoin.role !== 'host') throw new Error('spectator host rejoin failed');
  console.log('spectator host room OK');

  console.log('\nRoom API smoke test passed.');
}

main().catch((err) => {
  console.error('Room API smoke test FAILED:', err.message);
  console.error('Avvia prima: node server.js  oppure  npm start');
  process.exit(1);
});
