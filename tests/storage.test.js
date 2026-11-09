import { afterEach, describe, expect, it, vi } from 'vitest';

describe('production storage policy', () => {
  it('uses the existing prefixed Vercel Redis variables', async () => {
    const { getRedisConfig } = await import('../api/kv.js');
    expect(getRedisConfig({
      MINING_GAME_KV_REST_API_URL: 'https://redis.example',
      MINING_GAME_KV_REST_API_TOKEN: 'secret',
    })).toEqual({ url: 'https://redis.example', token: 'secret' });
  });

  it('supports current Upstash and legacy Vercel KV variables with safe fallback order', async () => {
    const { getRedisConfigs } = await import('../api/kv.js');
    expect(getRedisConfigs({
      UPSTASH_REDIS_REST_URL: 'https://upstash.example',
      UPSTASH_REDIS_REST_TOKEN: 'upstash-secret',
      KV_REST_API_URL: 'https://vercel-kv.example',
      KV_REST_API_TOKEN: 'vercel-secret',
      MINING_GAME_KV_REST_API_URL: 'https://old.example',
      MINING_GAME_KV_REST_API_TOKEN: 'old-secret',
    })).toEqual([
      { source: 'mining-game-kv', url: 'https://old.example', token: 'old-secret' },
      { source: 'upstash', url: 'https://upstash.example', token: 'upstash-secret' },
      { source: 'vercel-kv', url: 'https://vercel-kv.example', token: 'vercel-secret' },
    ]);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('fails clearly on Vercel when Upstash is not configured', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('MINING_GAME_KV_REST_API_URL', '');
    vi.stubEnv('MINING_GAME_KV_REST_API_TOKEN', '');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.resetModules();
    const { kv } = await import('../api/kv.js');
    expect(kv.kind).toBe('unavailable');
    await expect(kv.ping()).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
  });
});
