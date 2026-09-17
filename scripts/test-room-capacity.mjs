#!/usr/bin/env node

const BASE = process.env.ROOM_API || 'http://127.0.0.1:3001/api/room';
const MAX_PLAYERS = 30;

async function call(action, { method = 'POST', body, token, seed } = {}) {
  const query = new URLSearchParams({ action });
  if (seed) query.set('seed', seed);
  const response = await fetch(`${BASE}?${query}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { response, data: await response.json() };
}

function expectOk(result, label) {
  if (!result.response.ok || !result.data.success) {
    throw new Error(`${label}: ${result.data.error || result.response.status}`);
  }
  return result.data;
}

function roomOptions(index, overrides = {}) {
  return {
    hostName: `Host ${index}`,
    numPlayers: MAX_PLAYERS,
    difficulty: index % 2 ? 'hard' : 'easy',
    blocksToWin: 3,
    hostParticipates: false,
    ...overrides,
  };
}

async function main() {
  const capacityRoom = expectOk(await call('create', {
    body: roomOptions('Capacity'),
  }), 'create capacity room');
  if (capacityRoom.room.numPlayers !== MAX_PLAYERS) {
    throw new Error(`capacity was clamped to ${capacityRoom.room.numPlayers}`);
  }

  for (let index = 1; index < MAX_PLAYERS; index += 1) {
    expectOk(await call('join', {
      body: { seed: capacityRoom.seed, playerName: `Miner ${index}` },
    }), `join player ${index}`);
  }
  const overflow = await call('join', {
    body: { seed: capacityRoom.seed, playerName: 'Miner 30' },
  });
  if (overflow.response.status !== 409 || overflow.data.error !== 'ROOM_FULL') {
    throw new Error(`the 31st participant returned ${overflow.response.status}/${overflow.data.error || 'NO_ERROR'}`);
  }
  const fullStatus = expectOk(await call('status', {
    method: 'GET', seed: capacityRoom.seed,
  }), 'full room status');
  if (fullStatus.room.players.length !== MAX_PLAYERS - 1) {
    throw new Error(`spectator-host room contains ${fullStatus.room.players.length + 1} participants`);
  }
  const reservedHostName = await call('join', {
    body: { seed: capacityRoom.seed, playerName: 'Host Capacity' },
  });
  if (reservedHostName.data.error !== 'NAME_TAKEN') {
    throw new Error('spectator host name was not reserved');
  }

  const playingHostRoom = expectOk(await call('create', {
    body: roomOptions('Playing host', { hostParticipates: true }),
  }), 'create playing-host room');
  if (playingHostRoom.room.players.length !== 1) {
    throw new Error('participating host did not occupy a player slot');
  }
  for (let index = 1; index < MAX_PLAYERS; index += 1) {
    expectOk(await call('join', {
      body: { seed: playingHostRoom.seed, playerName: `Guest ${index}` },
    }), `join host-room guest ${index}`);
  }
  const hostRoomOverflow = await call('join', {
    body: { seed: playingHostRoom.seed, playerName: 'Guest 30' },
  });
  if (hostRoomOverflow.response.status !== 409 || hostRoomOverflow.data.error !== 'ROOM_FULL') {
    throw new Error('participating host was not counted in the 30-player capacity');
  }

  const simultaneous = await Promise.all(
    Array.from({ length: 40 }, (_, index) => call('create', {
      body: roomOptions(`Parallel ${index + 1}`),
    })),
  );
  const simultaneousRooms = simultaneous.map((result, index) =>
    expectOk(result, `parallel room ${index + 1}`));
  const simultaneousCodes = new Set(simultaneousRooms.map((room) => room.seed));
  if (simultaneousCodes.size !== simultaneousRooms.length) {
    throw new Error('parallel room creation returned duplicate codes');
  }

  const repeatedRooms = [];
  for (let index = 1; index <= 60; index += 1) {
    repeatedRooms.push(expectOk(await call('create', {
      body: roomOptions(`Repeated ${index}`),
    }), `repeated room ${index}`));
  }
  const allCodes = new Set([
    capacityRoom.seed,
    playingHostRoom.seed,
    ...simultaneousRooms.map((room) => room.seed),
    ...repeatedRooms.map((room) => room.seed),
  ]);
  if (allCodes.size !== 102) throw new Error('repeated room creation returned duplicate codes');

  const isolatedRooms = simultaneousRooms.slice(0, 10);
  await Promise.all(isolatedRooms.flatMap((room, roomIndex) =>
    Array.from({ length: 3 }, (_, playerIndex) => call('join', {
      body: {
        seed: room.seed,
        playerName: `Room ${roomIndex + 1} Miner ${playerIndex + 1}`,
      },
    }).then((result) => expectOk(result, `isolated join ${roomIndex + 1}/${playerIndex + 1}`))),
  ));
  const isolatedStatuses = await Promise.all(isolatedRooms.map((room) =>
    call('status', { method: 'GET', seed: room.seed })));
  isolatedStatuses.forEach((result, index) => {
    const status = expectOk(result, `isolated status ${index + 1}`);
    if (status.room.players.length !== 3) {
      throw new Error(`room ${index + 1} contains players from another room`);
    }
  });
  const untouchedStatus = expectOk(await call('status', {
    method: 'GET', seed: simultaneousRooms[10].seed,
  }), 'untouched room status');
  if (untouchedStatus.room.players.length !== 0) {
    throw new Error('an untouched room received players from another room');
  }

  console.log('30-participant capacity (host included), repeated creation, parallel creation and room isolation passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
