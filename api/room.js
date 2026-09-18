import { createHash, randomBytes } from 'node:crypto';
import { kv, updateAtomically } from './kv.js';
import { generateRoomCode } from './roomCode.js';
import { createInitialGameState, validateAndApplyMine } from '../src/lib/gameEngine.js';
import { clampBlocksToWin, clampNumPlayers, DEFAULT_BLOCKS_TO_WIN, getRoomOccupancy, normalizePowLevel } from './roomConfig.js';
import { isValidRoomCode, normalizeRoomCode } from '../src/lib/roomCode.js';

const MAX_NAME_LENGTH = 32;

class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function parseBody(req) {
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'INVALID_BODY');
  return body;
}

function normalizeSeed(seed) {
  return normalizeRoomCode(seed);
}

function normalizeName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ');
}

function nameKey(name) {
  return normalizeName(name).toLocaleLowerCase('en');
}

function validateName(name) {
  const normalized = normalizeName(name);
  if (!normalized || normalized.length > MAX_NAME_LENGTH || [...normalized].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
    throw new ApiError(400, 'INVALID_PLAYER_NAME');
  }
  return normalized;
}

function validateCode(seed) {
  const code = normalizeSeed(seed);
  if (!isValidRoomCode(code)) throw new ApiError(400, 'INVALID_ROOM_CODE');
  return code;
}

function roomKey(seed) {
  return `room:v7:${seed}`;
}

function makeToken() {
  return randomBytes(32).toString('base64url');
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function bearerToken(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers?.authorization || '');
  return match?.[1]?.trim() || '';
}

function authenticate(room, req, required = true) {
  const token = bearerToken(req);
  if (!token) {
    if (required) throw new ApiError(401, 'AUTH_REQUIRED');
    return null;
  }
  const hash = tokenHash(token);
  if (room.hostTokenHash === hash) {
    const player = room.players.find((item) => item.tokenHash === hash) ?? null;
    return { role: 'host', player };
  }
  const player = room.players.find((item) => item.tokenHash === hash);
  if (player) return { role: 'player', player };
  if (required) throw new ApiError(401, 'INVALID_SESSION');
  return null;
}

function publicRoom(room) {
  return {
    version: room.version,
    seed: room.seed,
    numPlayers: room.numPlayers,
    blocksToWin: room.blocksToWin,
    difficulty: room.difficulty,
    powLevel: room.powLevel ?? '2',
    status: room.status,
    winner: room.winner,
    gameSeed: room.gameSeed,
    hostDisplayName: room.hostDisplayName,
    hostParticipates: room.hostParticipates,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
    startedAt: room.startedAt,
    players: room.players.map(({ name, blocks, feesEarned, lastMinedAt, connectedAt }) => ({
      name,
      blocks,
      feesEarned: feesEarned ?? 0,
      lastMinedAt,
      connectedAt,
    })),
  };
}

function successRoom(res, room, auth = null, extra = {}) {
  return res.status(200).json({
    success: true,
    room: publicRoom(room),
    ...(auth?.player ? { playerState: auth.player.gameState } : {}),
    ...extra,
  });
}

function fail(res, status, code) {
  return res.status(status).json({ success: false, error: code });
}

function newPlayer(name, token, difficulty, seed, powLevel = '2') {
  const now = Date.now();
  return {
    name,
    blocks: 0,
    feesEarned: 0,
    lastMinedAt: null,
    connectedAt: now,
    tokenHash: tokenHash(token),
    gameState: createInitialGameState(difficulty, seed, powLevel),
  };
}

function assertMethod(req, expected) {
  if (req.method !== expected) throw new ApiError(405, 'METHOD_NOT_ALLOWED');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const contentLength = Number(req.headers?.['content-length'] || 0);
    if (contentLength > 16 * 1024) throw new ApiError(413, 'BODY_TOO_LARGE');
    const action = String(req.query?.action || '');

    if (action === 'create') {
      assertMethod(req, 'POST');
      const body = parseBody(req);
      const hostName = validateName(body.hostName);
      const difficulty = body.difficulty === 'hard' ? 'hard' : 'easy';
      const powLevel = normalizePowLevel(body.powLevel);
      const hostParticipates = Boolean(body.hostParticipates);
      const sessionToken = makeToken();

      for (let attempt = 0; attempt < 8; attempt += 1) {
        const seed = generateRoomCode();
        const now = Date.now();
        const room = {
          version: 6,
          seed,
          gameSeed: seed,
          numPlayers: clampNumPlayers(body.numPlayers),
          blocksToWin: clampBlocksToWin(body.blocksToWin ?? DEFAULT_BLOCKS_TO_WIN),
          difficulty,
          powLevel,
          status: 'waiting',
          winner: null,
          hostDisplayName: hostName,
          hostParticipates,
          hostTokenHash: tokenHash(sessionToken),
          players: hostParticipates ? [newPlayer(hostName, sessionToken, difficulty, seed, powLevel)] : [],
          createdAt: now,
          updatedAt: now,
          startedAt: null,
        };
        if (await kv.setIfAbsent(roomKey(seed), room)) {
          return successRoom(res, room, hostParticipates ? { player: room.players[0] } : null, {
            seed,
            sessionToken,
            role: 'host',
          });
        }
      }
      throw new ApiError(503, 'ROOM_CODE_UNAVAILABLE');
    }

    if (action === 'join') {
      assertMethod(req, 'POST');
      const body = parseBody(req);
      const code = validateCode(body.seed);
      const playerName = validateName(body.playerName);
      const sessionToken = makeToken();
      const hash = tokenHash(sessionToken);
      const result = await updateAtomically(roomKey(code), (room) => {
        if (room.status !== 'waiting') throw new ApiError(409, 'ROOM_NOT_WAITING');
        if (nameKey(room.hostDisplayName) === nameKey(playerName)
          || room.players.some((p) => nameKey(p.name) === nameKey(playerName))) {
          throw new ApiError(409, 'NAME_TAKEN');
        }
        if (getRoomOccupancy(room) >= room.numPlayers) throw new ApiError(409, 'ROOM_FULL');
        room.players.push(newPlayer(playerName, sessionToken, room.difficulty, room.seed, room.powLevel));
        room.updatedAt = Date.now();
        return room;
      });
      if (!result) throw new ApiError(404, 'ROOM_NOT_FOUND');
      const player = result.value.players.find((p) => p.tokenHash === hash);
      return successRoom(res, result.value, { player }, { sessionToken, role: 'player', playerName });
    }

    if (action === 'status') {
      assertMethod(req, 'GET');
      const code = validateCode(req.query?.seed);
      const room = await kv.get(roomKey(code));
      if (!room) throw new ApiError(404, 'ROOM_NOT_FOUND');
      const auth = authenticate(room, req, false);
      return successRoom(res, room, auth, auth ? { role: auth.role } : {});
    }

    if (action === 'rejoin') {
      assertMethod(req, 'POST');
      const code = validateCode(parseBody(req).seed);
      const result = await updateAtomically(roomKey(code), (room) => {
        const auth = authenticate(room, req);
        if (auth.player) auth.player.connectedAt = Date.now();
        room.updatedAt = Date.now();
        return room;
      });
      if (!result) throw new ApiError(404, 'ROOM_NOT_FOUND');
      const auth = authenticate(result.value, req);
      return successRoom(res, result.value, auth, {
        role: auth.role,
        playerName: auth.player?.name,
        displayName: auth.role === 'host' ? result.value.hostDisplayName : auth.player?.name,
        hostParticipates: result.value.hostParticipates,
      });
    }

    if (action === 'start') {
      assertMethod(req, 'POST');
      const code = validateCode(parseBody(req).seed);
      const result = await updateAtomically(roomKey(code), (room) => {
        const auth = authenticate(room, req);
        if (auth.role !== 'host') throw new ApiError(403, 'HOST_ONLY');
        if (room.status !== 'waiting') throw new ApiError(409, 'ROOM_NOT_WAITING');
        if (room.players.length < 1) throw new ApiError(409, 'PLAYER_REQUIRED');
        room.status = 'playing';
        room.startedAt = Date.now();
        room.updatedAt = Date.now();
        return room;
      });
      if (!result) throw new ApiError(404, 'ROOM_NOT_FOUND');
      return successRoom(res, result.value, authenticate(result.value, req));
    }

    if (action === 'reset') {
      assertMethod(req, 'POST');
      const code = validateCode(parseBody(req).seed);
      const result = await updateAtomically(roomKey(code), (room) => {
        const auth = authenticate(room, req);
        if (auth.role !== 'host') throw new ApiError(403, 'HOST_ONLY');
        if (room.status !== 'finished') throw new ApiError(409, 'GAME_NOT_FINISHED');
        room.status = 'waiting';
        room.winner = null;
        room.startedAt = null;
        room.players.forEach((player) => {
          player.blocks = 0;
          player.feesEarned = 0;
          player.lastMinedAt = null;
          player.gameState = createInitialGameState(room.difficulty, room.seed, room.powLevel);
        });
        room.updatedAt = Date.now();
        return room;
      });
      if (!result) throw new ApiError(404, 'ROOM_NOT_FOUND');
      return successRoom(res, result.value, authenticate(result.value, req));
    }

    if (action === 'mine') {
      assertMethod(req, 'POST');
      const body = parseBody(req);
      const code = validateCode(body.seed);
      let minedPlayerHash = '';
      const result = await updateAtomically(roomKey(code), async (room) => {
        const auth = authenticate(room, req);
        if (!auth.player) throw new ApiError(403, 'PLAYER_REQUIRED');
        if (room.status !== 'playing') throw new ApiError(409, 'GAME_NOT_PLAYING');
        const applied = await validateAndApplyMine({
          difficulty: room.difficulty,
          roomSeed: room.seed,
          state: auth.player.gameState,
          proof: body,
        });
        if (!applied.ok) throw new ApiError(422, applied.error);
        auth.player.gameState = applied.state;
        auth.player.blocks += 1;
        auth.player.feesEarned = applied.state.feesEarned;
        auth.player.lastMinedAt = Date.now();
        auth.player.connectedAt = Date.now();
        minedPlayerHash = auth.player.tokenHash;
        if (auth.player.blocks >= room.blocksToWin) {
          room.status = 'finished';
          room.winner = auth.player.name;
        }
        room.updatedAt = Date.now();
        return room;
      });
      if (!result) throw new ApiError(404, 'ROOM_NOT_FOUND');
      const player = result.value.players.find((p) => p.tokenHash === minedPlayerHash);
      return successRoom(res, result.value, { player }, {
        playerBlocks: player.blocks,
        won: result.value.status === 'finished',
        block: player.gameState.history[player.gameState.history.length - 1],
      });
    }

    throw new ApiError(400, 'INVALID_ACTION');
  } catch (error) {
    if (error instanceof SyntaxError) return fail(res, 400, 'INVALID_BODY');
    if (error instanceof ApiError) return fail(res, error.status, error.code);
    if (error?.code === 'STORAGE_UNAVAILABLE') return fail(res, 503, 'STORAGE_UNAVAILABLE');
    if (error?.code === 'ROOM_CONFLICT') return fail(res, 409, 'ROOM_CONFLICT');
    console.error('room api error', { name: error?.name, message: error?.message });
    return fail(res, 500, 'SERVER_ERROR');
  }
}
