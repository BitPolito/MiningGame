#!/usr/bin/env node
import { computeBlockValue } from '../src/lib/easyMining.js';
import { pickGreedySelection } from '../src/lib/playability.js';

const BASE = process.env.ROOM_API || 'http://127.0.0.1:3001/api/room';

async function call(action, { method = 'POST', body, token, seed } = {}) {
  const query = new URLSearchParams({ action });
  if (seed) query.set('seed', seed);
  const res = await fetch(`${BASE}?${query}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  return { res, data };
}

function expectOk(result, label) {
  if (!result.res.ok || !result.data.success) throw new Error(`${label}: ${result.data.error}`);
  return result.data;
}

async function main() {
  const created = expectOk(await call('create', { body: {
    hostName: 'Host', numPlayers: 2, difficulty: 'easy', blocksToWin: 2, hostParticipates: true,
  } }), 'create');
  const { seed, sessionToken: hostToken } = created;
  if (created.room.hostTokenHash || created.room.players[0].tokenHash) throw new Error('public room leaked credentials');

  const joined = expectOk(await call('join', { body: { seed, playerName: 'Guest' } }), 'join');
  const guestToken = joined.sessionToken;

  const duplicate = await call('join', { body: { seed, playerName: 'guest' } });
  if (duplicate.data.error !== 'NAME_TAKEN') throw new Error('duplicate name accepted');

  const unauthorized = await call('start', { body: { seed }, token: guestToken });
  if (unauthorized.data.error !== 'HOST_ONLY') throw new Error('guest started the room');

  expectOk(await call('start', { body: { seed }, token: hostToken }), 'start');

  const status = expectOk(await call('status', { method: 'GET', seed, token: hostToken }), 'status');
  const game = status.playerState;
  const selectedTxIds = pickGreedySelection(game.mempool, game.balances);
  const selected = game.mempool.filter((tx) => selectedTxIds.includes(tx.id));
  const nonce = game.target - game.prevTarget - computeBlockValue(selected);

  const cheat = await call('mine', {
    body: { seed, blockIndex: game.blockNum, selectedTxIds, nonce: nonce + 1 }, token: hostToken,
  });
  if (cheat.data.error !== 'INVALID_PROOF') throw new Error('invalid proof accepted');

  const mined = expectOk(await call('mine', {
    body: { seed, blockIndex: game.blockNum, selectedTxIds, nonce }, token: hostToken,
  }), 'mine');
  if (mined.playerState.blockNum !== 2 || mined.playerBlocks !== 1) throw new Error('mine state not advanced');

  const replay = await call('mine', {
    body: { seed, blockIndex: game.blockNum, selectedTxIds, nonce }, token: hostToken,
  });
  if (replay.data.error !== 'UNEXPECTED_BLOCK') throw new Error('replay accepted');

  const rejoined = expectOk(await call('rejoin', { body: { seed }, token: hostToken }), 'rejoin');
  if (rejoined.playerState.blockNum !== 2 || rejoined.role !== 'host') throw new Error('state was not restored');

  const publicStatus = expectOk(await call('status', { method: 'GET', seed }), 'public status');
  if (publicStatus.playerState || JSON.stringify(publicStatus).includes('tokenHash')) throw new Error('private state leaked');

  const secondGame = mined.playerState;
  const secondIds = pickGreedySelection(secondGame.mempool, secondGame.balances);
  const secondTxs = secondGame.mempool.filter((tx) => secondIds.includes(tx.id));
  const secondNonce = secondGame.target - secondGame.prevTarget - computeBlockValue(secondTxs);
  const won = expectOk(await call('mine', {
    body: { seed, blockIndex: secondGame.blockNum, selectedTxIds: secondIds, nonce: secondNonce }, token: hostToken,
  }), 'winning mine');
  if (!won.won) throw new Error('winning state not recorded');
  expectOk(await call('reset', { body: { seed }, token: hostToken }), 'reset');

  const raceRoom = expectOk(await call('create', { body: {
    hostName: 'Teacher', numPlayers: 2, difficulty: 'easy', blocksToWin: 1, hostParticipates: false,
  } }), 'concurrency room');
  const joins = await Promise.all(
    ['A', 'B', 'C', 'D', 'E'].map((playerName) => call('join', { body: { seed: raceRoom.seed, playerName } })),
  );
  if (joins.filter((entry) => entry.data.success).length !== 2) throw new Error('concurrent joins exceeded room capacity');
  const raceStatus = expectOk(await call('status', { method: 'GET', seed: raceRoom.seed }), 'concurrency status');
  if (raceStatus.room.players.length !== 2) throw new Error('concurrent room state is inconsistent');

  console.log('Room API flow, authorization, proof validation, concurrency and restore passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
