import { test, expect } from './fixtures/api.fixture';
import { expectJsonError } from './fixtures/assertions';
import { NONEXISTENT_USER_ID } from '../src/data/user.factory';
import type { User } from '../src/types/user.types';

test.describe('GET /users/{id}', { tag: '@contract' }, () => {
  test('[GET-001] returns 200 with the exact user (same id, name, email) that was created', async ({ users, seedUser }) => {
    const created = await seedUser({ name: 'Retrieve Me' });
    const response = await users.get(created.id);

    expect(response.status()).toBe(200);
    expect(await response.json(), 'GET must return exactly the created user, including the same id').toEqual(created);
  });

  test('[GET-002] nonexistent user returns 404', async ({ users }) => {
    await expectJsonError(await users.get(NONEXISTENT_USER_ID), 404);
  });

  test('[GET-003] id 0 returns 400', async ({ users }) => {
    await expectJsonError(await users.get(0), 400);
  });

  test('[GET-004] negative id returns 400', async ({ users }) => {
    await expectJsonError(await users.get(-1), 400);
  });

  test('[GET-005] non-numeric id returns 400', async ({ users }) => {
    await expectJsonError(await users.get('abc'), 400);
  });

  // Why: other malformed shapes that look numeric-ish and often slip through naive parsing.
  for (const id of ['1.5', '1abc', '1e2', 'null', '-0']) {
    test(`[GET-006] invalid id "${id}" returns 400`, async ({ users }) => {
      await expectJsonError(await users.get(id), 400);
    });
  }

  test('[GET-007] very large positive id returns 404 (valid format, not found), not an error', async ({ users }) => {
    await expectJsonError(await users.get('99999999999999999999'), 404);
  });

  test('[GET-008] 200 response is JSON with exactly id (integer), name (string), email (string)', async ({ users, seedUser }) => {
    const created = await seedUser();
    const response = await users.get(created.id);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const body = (await response.json()) as User;
    expect(Object.keys(body).sort()).toEqual(['email', 'id', 'name']);
    expect(Number.isInteger(body.id)).toBe(true);
    expect(typeof body.name).toBe('string');
    expect(typeof body.email).toBe('string');
  });

  test('[GET-009] each of two users is retrieved with its own data (no cross-over)', async ({ users, seedUser }) => {
    const first = await seedUser({ name: 'First User' });
    const second = await seedUser({ name: 'Second User' });

    expect(await (await users.get(first.id)).json(), 'First user').toEqual(first);
    expect(await (await users.get(second.id)).json(), 'Second user').toEqual(second);
  });
});
