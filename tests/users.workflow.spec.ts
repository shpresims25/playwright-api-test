import { test, expect } from './fixtures/api.fixture';
import { buildUser } from '../src/data/user.factory';
import type { User } from '../src/types/user.types';

test.describe('User lifecycle workflow', { tag: '@contract' }, () => {
  test('[WF-001] create -> get -> delete -> get behaves as documented', async ({ users }) => {
    // expect.soft: keep going after a failed step so ONE run reports every deviation (create, get, delete).
    const payload = buildUser({ name: 'Workflow User' });

    // 1. Create
    const createResponse = await users.create(payload);
    expect.soft(createResponse.status(), 'Step 1: create returns 201').toBe(201);
    const created = (await createResponse.json()) as User;

    // 2-3. Retrieve and verify every field, including the exact id
    const getResponse = await users.get(created.id);
    expect.soft(getResponse.status(), 'Step 2: get returns 200').toBe(200);
    const fetched = (await getResponse.json()) as User;
    expect.soft(fetched.id, 'Step 3: id must equal the id from the create response').toBe(created.id);
    expect.soft(fetched.name, 'Step 3: name').toBe(payload.name);
    expect.soft(fetched.email, 'Step 3: email').toBe(payload.email);

    // 4-5. Delete
    const deleteResponse = await users.delete(created.id);
    expect.soft(deleteResponse.status(), 'Step 4: delete returns 204').toBe(204);
    expect.soft(await deleteResponse.text(), 'Step 5: delete body is empty').toBe('');

    // 6-7. Retrieve again
    const finalGet = await users.get(created.id);
    expect.soft(finalGet.status(), 'Step 7: deleted user must return 404').toBe(404);
  });
});
