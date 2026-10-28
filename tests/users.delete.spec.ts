import { test, expect } from './fixtures/api.fixture';
import { expectJsonError } from './fixtures/assertions';
import { NONEXISTENT_USER_ID } from '../src/data/user.factory';

test.describe('DELETE /users/{id}', { tag: '@contract' }, () => {
  test('[DEL-001] existing user is deleted and returns 204 No Content', async ({ users, seedUser }) => {
    const created = await seedUser();
    const response = await users.delete(created.id);
    expect(response.status()).toBe(204);
  });

  test('[DEL-002] successful DELETE has an empty response body', async ({ users, seedUser }) => {
    const created = await seedUser();
    const response = await users.delete(created.id);
    expect(response.status()).toBe(204);
    expect(await response.text(), 'Body must be empty').toBe('');
  });

  test('[DEL-003] GET after DELETE returns 404', async ({ users, seedUser }) => {
    const created = await seedUser();
    expect((await users.delete(created.id)).status()).toBe(204);
    const response = await users.get(created.id);
    expect(response.status(), 'Deleted user must no longer be retrievable').toBe(404);
  });

  test('[DEL-004] deleting a nonexistent user returns 404', async ({ users }) => {
    await expectJsonError(await users.delete(NONEXISTENT_USER_ID), 404);
  });

  test('[DEL-005] id 0 returns 400', async ({ users }) => {
    await expectJsonError(await users.delete(0), 400);
  });

  test('[DEL-006] negative id returns 400', async ({ users }) => {
    await expectJsonError(await users.delete(-1), 400);
  });

  test('[DEL-007] non-numeric id returns 400', async ({ users }) => {
    await expectJsonError(await users.delete('abc'), 400);
  });

  for (const id of ['1.5', '1abc', '1e2']) {
    test(`[DEL-008] invalid id "${id}" returns 400`, async ({ users }) => {
      await expectJsonError(await users.delete(id), 400);
    });
  }

  test('[DEL-009] deleting the same user twice: second DELETE returns 404', async ({ users, seedUser }) => {
    const created = await seedUser();
    expect((await users.delete(created.id)).status()).toBe(204);
    await expectJsonError(await users.delete(created.id), 404);
  });

  test('[DEL-010] deleting one user does not affect another user', async ({ users, seedUser }) => {
    const doomed = await seedUser({ name: 'To Delete' });
    const survivor = await seedUser({ name: 'Must Survive' });

    expect((await users.delete(doomed.id)).status()).toBe(204);

    const response = await users.get(survivor.id);
    expect(response.status(), 'Other user must still exist').toBe(200);
    expect(await response.json()).toEqual(survivor);
  });
});

// README does not say that a deleted user's email becomes reusable; this follows logically from
// "unique among users" + "deleted", but is reported as an observation if it differs.
test.describe('DELETE /users/{id} - exploratory', { tag: '@exploratory' }, () => {
  test('[EXP-007] email of a deleted user can be registered again', async ({ users, seedUser }) => {
    const created = await seedUser();
    expect((await users.delete(created.id)).status()).toBe(204);
    const again = await users.create({ name: 'Re-registered', email: created.email });
    expect(again.ok(), `Re-registering a deleted email must not be rejected (HTTP ${again.status()})`).toBe(true);
  });
});
