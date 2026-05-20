import { kv } from './kv.js';

// Helper to generate a random word seed
const SEED_WORDS = ["SATOSHI", "GENESIS", "HALVING", "MEMPOOL", "LEDGER", "NODE", "HASH", "WALLET", "BLOCK", "MINER"];

export default async function handler(req, res) {
  // CORS headers for local dev proxying if needed
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action } = req.query;

  try {
    if (action === 'create') {
      const { hostName, numPlayers } = req.body || JSON.parse(req.body);
      const seed = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)] + Math.floor(Math.random() * 1000);
      
      const roomData = {
        seed,
        numPlayers: parseInt(numPlayers, 10),
        players: [{ name: hostName, blocks: 0 }], // host is the first player
        status: 'waiting', // waiting, playing, finished
        winner: null
      };
      
      await kv.set(`room:${seed}`, roomData);
      return res.status(200).json({ success: true, seed });
    }

    if (action === 'join') {
      const { seed, playerName } = req.body || JSON.parse(req.body);
      const room = await kv.get(`room:${seed}`);
      
      if (!room) return res.status(404).json({ error: 'Room not found' });
      if (room.status !== 'waiting') return res.status(400).json({ error: 'Game already started' });
      if (room.players.length > room.numPlayers) return res.status(400).json({ error: 'Room is full' });
      if (room.players.find(p => p.name === playerName)) return res.status(400).json({ error: 'Name already taken' });

      room.players.push({ name: playerName, blocks: 0 });
      await kv.set(`room:${seed}`, room);
      
      return res.status(200).json({ success: true, room });
    }

    if (action === 'status') {
      const seed = req.query.seed;
      const room = await kv.get(`room:${seed}`);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      return res.status(200).json({ success: true, room });
    }

    if (action === 'start') {
      const { seed } = req.body || JSON.parse(req.body);
      const room = await kv.get(`room:${seed}`);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      
      room.status = 'playing';
      await kv.set(`room:${seed}`, room);
      return res.status(200).json({ success: true, room });
    }

    if (action === 'mine') {
      const { seed, playerName } = req.body || JSON.parse(req.body);
      const room = await kv.get(`room:${seed}`);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      if (room.status !== 'playing') return res.status(400).json({ error: 'Game not active' });

      const player = room.players.find(p => p.name === playerName);
      if (player) {
        player.blocks += 1;
        if (player.blocks >= 6) {
          room.status = 'finished';
          room.winner = playerName;
        }
        await kv.set(`room:${seed}`, room);
      }
      return res.status(200).json({ success: true, room });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
}
