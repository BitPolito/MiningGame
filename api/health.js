import { kv } from './kv.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  try {
    const ok = await kv.ping();
    return res.status(ok ? 200 : 503).json({ ok, service: 'blockgame-api', storage: kv.kind });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      service: 'blockgame-api',
      storage: kv.kind,
      error: error?.code || 'STORAGE_UNAVAILABLE',
    });
  }
}
