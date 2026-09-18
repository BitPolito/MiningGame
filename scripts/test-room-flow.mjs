#!/usr/bin/env node
import { computeBlockValue } from '../src/lib/easyMining.js';
import { pickGreedySelection } from '../src/lib/playability.js';
import { getTransactionsInSelectionOrder, getValidBlockSelections } from '../src/lib/txSelection.js';

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
  if (!/^[A-Z]{4}[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/.test(seed)) {
    throw new Error('new room code is not short and separator-free');
  }
  const typedCode = `${seed.slice(0, 4).toLowerCase()} ${seed.slice(4).toLowerCase()}`;
  const typedStatus = expectOk(await call('status', { method: 'GET', seed: typedCode }), 'manual room code');
  if (typedStatus.room.seed !== seed) throw new Error('manual room code did not normalize');
  if (created.room.hostTokenHash || created.room.players[0].tokenHash) throw new Error('public room leaked credentials');

  const joined = expectOk(await call('join', { body: { seed: typedCode, playerName: 'Guest' } }), 'join');
  const guestToken = joined.sessionToken;

  const duplicate = await call('join', { body: { seed, playerName: 'guest' } });
  if (duplicate.data.error !== 'NAME_TAKEN') throw new Error('duplicate name accepted');

  const unauthorized = await call('start', { body: { seed }, token: guestToken });
  if (unauthorized.data.error !== 'HOST_ONLY') throw new Error('guest started the room');

  expectOk(await call('start', { body: { seed }, token: hostToken }), 'start');

  const status = expectOk(await call('status', { method: 'GET', seed, token: hostToken }), 'status');
  const game = status.playerState;
  const selectedTxIds = pickGreedySelection(game.mempool, game.balances);
  const selected = getTransactionsInSelectionOrder(game.mempool, selectedTxIds);
  const nonce = game.target - game.prevTarget - computeBlockValue(selected);

  const suboptimal = getValidBlockSelections(game.mempool, game.balances)
    .find((selection) => selection.totalFees < selected.reduce((sum, tx) => sum + tx.fee, 0));
  if (!suboptimal) throw new Error('test mempool lacks a suboptimal valid group');
  const suboptimalTxs = getTransactionsInSelectionOrder(game.mempool, suboptimal.ids);
  const suboptimalNonce = game.target - game.prevTarget - computeBlockValue(suboptimalTxs);
  const lowFees = await call('mine', {
    body: { seed, blockIndex: game.blockNum, selectedTxIds: suboptimal.ids, nonce: suboptimalNonce }, token: hostToken,
  });
  if (lowFees.data.error !== 'FEES_NOT_MAXIMIZED') throw new Error('suboptimal fees accepted');

  const cheat = await call('mine', {
    body: { seed, blockIndex: game.blockNum, selectedTxIds, nonce: nonce + 1 }, token: hostToken,
  });
  if (cheat.data.error !== 'INVALID_PROOF') throw new Error('invalid proof accepted');

  const mined = expectOk(await call('mine', {
    body: { seed, blockIndex: game.blockNum, selectedTxIds, nonce }, token: hostToken,
  }), 'mine');
  if (mined.playerState.blockNum !== 2 || mined.playerBlocks !== 1) throw new Error('mine state not advanced');
  if (!mined.block?.totalFees || mined.playerState.feesEarned !== mined.block.totalFees) throw new Error('miner fees not recorded');

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
  const secondTxs = getTransactionsInSelectionOrder(secondGame.mempool, secondIds);
  const secondNonce = secondGame.target - secondGame.prevTarget - computeBlockValue(secondTxs);
  const simultaneous = await Promise.all([
    call('mine', { body: { seed, blockIndex: secondGame.blockNum, selectedTxIds: secondIds, nonce: secondNonce }, token: hostToken }),
    call('mine', { body: { seed, blockIndex: secondGame.blockNum, selectedTxIds: secondIds, nonce: secondNonce }, token: hostToken }),
  ]);
  const winners = simultaneous.filter((entry) => entry.data.success);
  if (winners.length !== 1 || !winners[0].data.won) throw new Error('simultaneous proof was not committed exactly once');
  const reset = expectOk(await call('reset', { body: { seed }, token: hostToken }), 'reset');
  if (reset.room.players.some((player) => player.feesEarned !== 0)) throw new Error('reset retained miner fees');

  const raceRoom = expectOk(await call('create', { body: {
    hostName: 'Teacher', numPlayers: 3, difficulty: 'easy', blocksToWin: 1, hostParticipates: false,
  } }), 'concurrency room');
  const joins = await Promise.all(
    ['A', 'B', 'C', 'D', 'E'].map((playerName) => call('join', { body: { seed: raceRoom.seed, playerName } })),
  );
  if (joins.filter((entry) => entry.data.success).length !== 3) throw new Error('concurrent joins exceeded room capacity');
  const raceStatus = expectOk(await call('status', { method: 'GET', seed: raceRoom.seed }), 'concurrency status');
  if (raceStatus.room.players.length !== 3) throw new Error('concurrent room state is inconsistent');

  console.log('Room API flow, authorization, proof validation, concurrency and restore passed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
