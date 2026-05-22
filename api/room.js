import { kv } from './kv.js';
import {
  clampBlocksToWin,
  clampNumPlayers,
  DEFAULT_BLOCKS_TO_WIN,
} from './roomConfig.js';

const SEED_WORDS = [
  'SATOSHI', 'GENESIS', 'HALVING', 'MEMPOOL', 'LEDGER',
  'NODE', 'HASH', 'WALLET', 'BLOCK', 'MINER',
];

function parseBody(req) {
  if (typeof req.body === 'string') return JSON.parse(req.body);
  return req.body ?? {};
}

function normalizeSeed(seed) {
  return String(seed ?? '')
    .trim()
    .toUpperCase();
}

function fail(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

function roomKey(seed) {
  return `room:${normalizeSeed(seed)}`;
}

function newSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function normalizePlayerName(name) {
  return String(name ?? '').trim().toLowerCase();
}

function isPlayerNameTaken(players, name) {
  const key = normalizePlayerName(name);
  if (!key) return false;
  return players.some((p) => normalizePlayerName(p.name) === key);
}

function newPlayer(name, sessionId = newSessionId()) {
  const now = Date.now();
  return {
    name: String(name ?? '').trim(),
    blocks: 0,
    lastMinedAt: null,
    sessionId,
    connectedAt: now,
  };
}

/** Backfill fields for rooms created before host/session support. */
function shapeRoom(room) {
  if (!room) return room;
  const hostDisplayName = room.hostDisplayName || room.players?.[0]?.name || 'Host';
  const hostParticipates = room.hostParticipates ?? (
    !!room.players?.length
    && normalizePlayerName(room.players[0]?.name) === normalizePlayerName(hostDisplayName)
  );
  return {
    ...room,
    hostDisplayName,
    hostParticipates,
  };
}

function assertIsHost(room, { hostSessionId, hostName }) {
  if (hostSessionId && room.hostSessionId === hostSessionId) return true;
  const legacyHost = room.players?.[0];
  if (legacyHost && hostName?.trim() === legacyHost.name) return true;
  if (hostName?.trim() === room.hostDisplayName) return true;
  return false;
}

function findPlayer(room, { sessionId, playerName }) {
  if (sessionId) {
    const bySession = room.players.find((p) => p.sessionId === sessionId);
    if (bySession) return bySession;
  }
  const key = normalizePlayerName(playerName);
  if (!key) return null;
  return room.players.find((p) => normalizePlayerName(p.name) === key) ?? null;
}

function createRoomDocument({
  seed,
  hostName,
  numPlayers,
  blocksToWin,
  difficulty,
  hostParticipates = false,
}) {
  const now = Date.now();
  const hostSessionId = newSessionId();
  const hostDisplayName = String(hostName ?? '').trim();
  const participates = !!hostParticipates;
  const players = participates
    ? [newPlayer(hostDisplayName, hostSessionId)]
    : [];

  return {
    seed,
    numPlayers,
    blocksToWin,
    difficulty,
    players,
    status: 'waiting',
    winner: null,
    gameSeed: seed,
    hostDisplayName,
    hostSessionId,
    hostParticipates: participates,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
  };
}

async function persistRoom(code, room) {
  room.updatedAt = Date.now();
  await kv.set(roomKey(code), room);
  return shapeRoom(room);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  try {
    if (action === 'create') {
      const {
        hostName,
        numPlayers,
        blocksToWin,
        difficulty,
        hostParticipates,
      } = parseBody(req);
      if (!hostName?.trim()) {
        return fail(res, 400, 'Host name is required');
      }

      const seed =
        SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)] +
        Math.floor(Math.random() * 1000);

      const roomData = createRoomDocument({
        seed,
        hostName: hostName.trim(),
        numPlayers: clampNumPlayers(numPlayers),
        blocksToWin: clampBlocksToWin(blocksToWin ?? DEFAULT_BLOCKS_TO_WIN),
        difficulty: difficulty === 'hard' ? 'hard' : 'easy',
        hostParticipates: !!hostParticipates,
      });

      await kv.set(roomKey(seed), roomData);
      return res.status(200).json({
        success: true,
        seed,
        room: shapeRoom(roomData),
        hostSessionId: roomData.hostSessionId,
        sessionId: roomData.hostSessionId,
        role: 'host',
      });
    }

    if (action === 'join') {
      const { seed, playerName, sessionId: clientSessionId } = parseBody(req);
      const code = normalizeSeed(seed);
      if (!code) return fail(res, 400, 'Room code is required');

      const room = await kv.get(roomKey(code));

      if (!room) return fail(res, 404, 'Room not found');
      if (room.status !== 'waiting') {
        return fail(res, 400, 'Game already started');
      }
      if (isPlayerNameTaken(room.players, playerName)) {
        return fail(res, 400, 'Name already taken');
      }
      if (room.players.length >= room.numPlayers) {
        return fail(res, 400, 'Room is full');
      }

      const player = newPlayer(playerName, clientSessionId || newSessionId());
      room.players.push(player);
      const shaped = await persistRoom(code, room);

      return res.status(200).json({
        success: true,
        room: shaped,
        sessionId: player.sessionId,
        role: 'player',
        playerName: player.name,
      });
    }

    if (action === 'rejoin') {
      const { seed, playerName, sessionId, role } = parseBody(req);
      const code = normalizeSeed(seed);
      if (!code) return fail(res, 400, 'Room code is required');

      let room = await kv.get(roomKey(code));
      if (!room) return fail(res, 404, 'Room not found');
      room = shapeRoom(room);

      const sid = sessionId?.trim() || null;
      const name = playerName?.trim() || '';

      if (sid && room.hostSessionId === sid) {
        await persistRoom(code, room);
        return res.status(200).json({
          success: true,
          room,
          role: 'host',
          sessionId: room.hostSessionId,
          hostSessionId: room.hostSessionId,
          displayName: room.hostDisplayName,
          hostParticipates: room.hostParticipates,
        });
      }

      let player = findPlayer(room, { sessionId: sid, playerName: name });

      if (player) {
        if (sid && player.sessionId !== sid) {
          player.sessionId = sid;
        } else if (!player.sessionId) {
          player.sessionId = newSessionId();
        }
        player.connectedAt = Date.now();
        const shaped = await persistRoom(code, room);
        return res.status(200).json({
          success: true,
          room: shaped,
          role: 'player',
          sessionId: player.sessionId,
          playerName: player.name,
          hostParticipates: room.hostParticipates,
        });
      }

      if (room.status === 'waiting') {
        if (role === 'host' && name && normalizePlayerName(name) === normalizePlayerName(room.hostDisplayName)) {
          await persistRoom(code, room);
          return res.status(200).json({
            success: true,
            room,
            role: 'host',
            sessionId: room.hostSessionId,
            hostSessionId: room.hostSessionId,
            displayName: room.hostDisplayName,
            hostParticipates: room.hostParticipates,
          });
        }

        if (!name) return fail(res, 400, 'Player name is required');
        if (isPlayerNameTaken(room.players, name)) {
          return fail(res, 400, 'Name already taken');
        }
        if (room.players.length >= room.numPlayers) {
          return fail(res, 400, 'Room is full');
        }

        const joined = newPlayer(name, sid || newSessionId());
        room.players.push(joined);
        const shaped = await persistRoom(code, room);
        return res.status(200).json({
          success: true,
          room: shaped,
          role: 'player',
          sessionId: joined.sessionId,
          playerName: joined.name,
          hostParticipates: room.hostParticipates,
        });
      }

      if (name) {
        player = findPlayer(room, { playerName: name });
        if (player) {
          player.sessionId = sid || player.sessionId || newSessionId();
          player.connectedAt = Date.now();
          const shaped = await persistRoom(code, room);
          return res.status(200).json({
            success: true,
            room: shaped,
            role: 'player',
            sessionId: player.sessionId,
            playerName: player.name,
            hostParticipates: room.hostParticipates,
          });
        }
      }

      return fail(res, 403, 'Not in this room');
    }

    if (action === 'status') {
      const code = normalizeSeed(req.query.seed);
      if (!code) return fail(res, 400, 'Room code is required');

      const room = await kv.get(roomKey(code));
      if (!room) return fail(res, 404, 'Room not found');
      return res.status(200).json({ success: true, room: shapeRoom(room) });
    }

    if (action === 'start') {
      const { seed, difficulty, hostSessionId } = parseBody(req);
      const code = normalizeSeed(seed);
      const room = await kv.get(roomKey(code));
      if (!room) return fail(res, 404, 'Room not found');
      if (!assertIsHost(room, { hostSessionId, hostName: parseBody(req).hostName })) {
        return fail(res, 403, 'Only the room host can start the game');
      }
      if (room.status !== 'waiting') {
        return fail(res, 400, 'Game already started');
      }
      if (room.players.length < 1) {
        return fail(res, 400, 'At least one player must join');
      }

      room.status = 'playing';
      if (difficulty === 'hard' || difficulty === 'easy') {
        room.difficulty = difficulty;
      }
      room.startedAt = Date.now();
      room.updatedAt = Date.now();
      await kv.set(roomKey(code), room);
      return res.status(200).json({ success: true, room: shapeRoom(room) });
    }

    if (action === 'reset') {
      const { seed, hostName, hostSessionId } = parseBody(req);
      const code = normalizeSeed(seed);
      const room = await kv.get(roomKey(code));
      if (!room) return fail(res, 404, 'Room not found');

      if (!assertIsHost(room, { hostSessionId, hostName })) {
        return fail(res, 403, 'Only the room host can reset the game');
      }
      if (room.status !== 'finished') {
        return fail(res, 400, 'Game is not finished yet');
      }

      room.status = 'waiting';
      room.winner = null;
      room.startedAt = null;
      room.players.forEach((p) => {
        p.blocks = 0;
        p.lastMinedAt = null;
      });
      room.updatedAt = Date.now();
      await kv.set(roomKey(code), room);
      return res.status(200).json({ success: true, room: shapeRoom(room) });
    }

    if (action === 'mine') {
      const { seed, playerName, blockIndex } = parseBody(req);
      const code = normalizeSeed(seed);
      if (!playerName?.trim()) {
        return fail(res, 400, 'Player name is required');
      }

      const before = await kv.get(roomKey(code));
      if (!before) return fail(res, 404, 'Room not found');
      if (before.status !== 'playing') {
        return fail(res, 400, 'Game is not in progress');
      }

      const prevPlayer = before.players.find((p) => p.name === playerName.trim());
      if (!prevPlayer) return res.status(400).json({ error: 'Player not in room' });

      const goal = clampBlocksToWin(before.blocksToWin);
      if (prevPlayer.blocks >= goal) {
        return res.status(400).json({ error: 'Player already reached block goal' });
      }

      const expectedBlock = prevPlayer.blocks + 1;
      if (blockIndex != null && parseInt(blockIndex, 10) !== expectedBlock) {
        return res.status(400).json({ error: 'Unexpected block index' });
      }

      const updatedRoom = await kv.update(roomKey(code), (room) => {
        if (!room || room.status !== 'playing') return room;

        const player = room.players.find((p) => p.name === playerName.trim());
        if (!player || player.blocks >= goal) return room;

        player.blocks += 1;
        player.lastMinedAt = Date.now();
        player.connectedAt = Date.now();
        room.updatedAt = Date.now();

        if (player.blocks >= goal) {
          room.status = 'finished';
          room.winner = player.name;
        }

        return room;
      });

      if (!updatedRoom) return fail(res, 404, 'Room not found');

      const p = updatedRoom.players.find((pl) => pl.name === playerName.trim());
      if (!p || p.blocks === prevPlayer.blocks) {
        return fail(res, 409, 'Mine not recorded');
      }

      return res.status(200).json({
        success: true,
        room: shapeRoom(updatedRoom),
        playerBlocks: p.blocks,
        won: updatedRoom.status === 'finished',
      });
    }

    return fail(res, 400, 'Invalid action');
  } catch (error) {
    console.error(error);
    return fail(res, 500, 'Server error');
  }
}
