import { test, expect } from './fixtures/api.fixture';

test.describe('GET /health', { tag: '@contract' }, () => {
  test('[HLT-001] returns 200 OK', async ({ users }) => {
    const response = await users.health();
    expect(response.status()).toBe(200);
  });

  test('[HLT-002] returns body {"status":"ok"}', async ({ users }) => {
    const response = await users.health();
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  test('[HLT-003] responds with a JSON content type', async ({ users }) => {
    const response = await users.health();
    expect(response.headers()['content-type']).toContain('application/json');
  });
});
