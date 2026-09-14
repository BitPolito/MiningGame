import { afterEach, describe, expect, it, vi } from 'vitest';

describe('production storage policy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('fails clearly on Vercel when Upstash is not configured', async () => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.resetModules();
    const { kv } = await import('../api/kv.js');
    expect(kv.kind).toBe('unavailable');
    await expect(kv.ping()).rejects.toMatchObject({ code: 'STORAGE_UNAVAILABLE' });
  });
});
