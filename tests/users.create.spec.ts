import { test, expect } from './fixtures/api.fixture';
import { expectJsonError } from './fixtures/assertions';
import { buildUser, uniqueEmail } from '../src/data/user.factory';
import type { User } from '../src/types/user.types';

test.describe('POST /users - documented contract', { tag: '@contract' }, () => {
  test('[CRT-001] valid user returns 201 with positive integer id, string name and email', async ({ users }) => {
    const payload = buildUser({ name: 'Alex Smith' });
    const response = await users.create(payload);

    expect(response.status(), 'Valid creation must return 201 Created').toBe(201);
    const body = (await response.json()) as User;
    expect(Number.isInteger(body.id) && body.id > 0, `id must be a positive integer, got ${body.id}`).toBe(true);
    expect(typeof body.name).toBe('string');
    expect(typeof body.email).toBe('string');
    expect(body.name).toBe(payload.name);
    expect(body.email).toBe(payload.email);
  });

  test('[CRT-002] numeric-looking name "123455666777" is accepted (nonblank string)', async ({ users }) => {
    const response = await users.create(buildUser({ name: '123455666777' }));
    expect(response.status()).toBe(201);
    expect(((await response.json()) as User).name).toBe('123455666777');
  });

  test('[CRT-003] missing name returns 400', async ({ users }) => {
    const response = await users.create({ email: uniqueEmail() });
    await expectJsonError(response, 400);
  });

  test('[CRT-004] whitespace-only name returns 400', async ({ users }) => {
    const response = await users.create(buildUser({ name: '   ' }));
    await expectJsonError(response, 400);
  });

  test('[CRT-005] missing email returns 400', async ({ users }) => {
    const response = await users.create({ name: 'No Email' });
    await expectJsonError(response, 400);
  });

  test('[CRT-006] invalid email "email-jovalid@" returns 400', async ({ users }) => {
    const response = await users.create(buildUser({ email: 'email-jovalid@' }));
    await expectJsonError(response, 400);
  });

  test('[CRT-007] exact duplicate email returns 409', async ({ users, seedUser }) => {
    const first = await seedUser();
    const response = await users.create(buildUser({ email: first.email }));
    await expectJsonError(response, 409);
  });

  test('[CRT-008] duplicate email differing only by letter case returns 409', async ({ users, seedUser }) => {
    const first = await seedUser({ email: uniqueEmail('case') });
    const response = await users.create(buildUser({ email: first.email.toUpperCase() }));
    await expectJsonError(response, 409);
  });

  test('[CRT-009] non-string name (number) returns 400', async ({ users }) => {
    const response = await users.create({ name: 12345, email: uniqueEmail() });
    await expectJsonError(response, 400);
  });

  test('[CRT-010] non-string email (number) returns 400', async ({ users }) => {
    const response = await users.create({ name: 'Alex', email: 12345 });
    await expectJsonError(response, 400);
  });

  test('[CRT-011] malformed JSON returns 400', async ({ users }) => {
    const response = await users.createRaw('{"name": "Alex", "email": ', 'application/json');
    await expectJsonError(response, 400);
  });

  test('[CRT-012] JSON that is not an object (array) returns 400', async ({ users }) => {
    const response = await users.create([{ name: 'Alex', email: uniqueEmail() }]);
    await expectJsonError(response, 400);
  });

  test('[CRT-013] separate successful creations receive distinct ids', async ({ seedUser }) => {
    const first = await seedUser();
    const second = await seedUser();
    expect(first.id, 'Two different users must not share an id').not.toBe(second.id);
  });
});

test.describe('POST /users - additional contract coverage', { tag: '@contract' }, () => {
  // Why: README says name/email must be strings. null/boolean/array/object are the other JSON types
  // a client could send; each is a separate code path in many validators.
  const wrongTypes: Array<[string, unknown]> = [
    ['null', null],
    ['boolean', true],
    ['array', ['Alex']],
    ['object', { first: 'Alex' }],
  ];
  wrongTypes.forEach(([label, value], i) => {
    test(`[CRT-014.${i + 1}] name as JSON ${label} returns 400`, async ({ users }) => {
      const response = await users.create({ name: value, email: uniqueEmail() });
      await expectJsonError(response, 400);
    });
    test(`[CRT-015.${i + 1}] email as JSON ${label} returns 400`, async ({ users }) => {
      const response = await users.create({ name: 'Alex', email: value });
      await expectJsonError(response, 400);
    });
  });

  test('[CRT-016] empty-string name returns 400', async ({ users }) => {
    await expectJsonError(await users.create(buildUser({ name: '' })), 400);
  });

  test('[CRT-017] empty-string email returns 400', async ({ users }) => {
    await expectJsonError(await users.create(buildUser({ email: '' })), 400);
  });

  // Why: the existing manual test only covers "email-jovalid@". These are other clearly broken shapes.
  const invalidEmails = ['plainaddress', '@example.com', 'user@', 'user@@example.com'];
  invalidEmails.forEach((email, i) => {
    test(`[CRT-018.${i + 1}] invalid email format "${email}" returns 400`, async ({ users }) => {
      await expectJsonError(await users.create(buildUser({ email })), 400);
    });
  });

  test('[CRT-019] duplicate detection is case-insensitive when the FIRST email is uppercase', async ({ users }) => {
    const first = buildUser({ email: uniqueEmail('upper').toUpperCase() });
    expect((await users.create(first)).ok(), 'Setup: first create must succeed').toBe(true);
    const response = await users.create(buildUser({ email: first.email.toLowerCase() }));
    await expectJsonError(response, 409);
  });

  test('[CRT-020] a rejected (400) request does not reserve the email', async ({ users }) => {
    const email = uniqueEmail('rejected');
    await expectJsonError(await users.create({ email }), 400); // missing name -> rejected
    const retry = await users.create({ name: 'Valid Later', email });
    // Status code (201) is checked in CRT-001; here we only care that the email was not reserved.
    expect(retry.ok(), `Email from a rejected request must still be free (got HTTP ${retry.status()})`).toBe(true);
  });

  test('[CRT-021] a rejected duplicate (409) does not modify the original user', async ({ users, seedUser }) => {
    const original = await seedUser({ name: 'Original Name' });
    await expectJsonError(await users.create({ name: 'Impostor', email: original.email }), 409);

    const fetched = (await (await users.get(original.id)).json()) as User;
    expect(fetched.name, 'Original user must keep its name').toBe('Original Name');
    expect(fetched.email).toBe(original.email);
  });

  test('[CRT-022] 201 response is JSON and contains exactly id, name and email', async ({ users }) => {
    const response = await users.create(buildUser());
    expect(response.ok(), `Create must succeed (HTTP ${response.status()}); exact status is checked in CRT-001`).toBe(true);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(Object.keys(await response.json()).sort()).toEqual(['email', 'id', 'name']);
  });

  test('[CRT-023] unicode name is accepted and returned unchanged', async ({ users }) => {
    const name = 'José Müller 李雷';
    const response = await users.create(buildUser({ name }));
    expect(response.ok(), `Create must succeed (HTTP ${response.status()})`).toBe(true);
    expect(((await response.json()) as User).name).toBe(name);
  });
});

// These cover behaviour the README does not spell out. A failure here is an OBSERVATION to review
// with the team, not an automatic contract violation.
test.describe('POST /users - exploratory', { tag: '@exploratory' }, () => {
  test('[EXP-001] extra unknown fields are not echoed back in the response', async ({ users }) => {
    test.info().annotations.push({ type: 'observation', description: 'README is silent on extra fields; response shape is {id,name,email}.' });
    const response = await users.create({ ...buildUser(), role: 'admin' });
    expect(response.status(), 'Extra fields: expected a success or a 400 rejection').toBeLessThan(500);
    if (response.ok()) {
      expect(Object.keys(await response.json()).sort()).toEqual(['email', 'id', 'name']);
    }
  });

  test('[EXP-002] name with surrounding spaces is stored consistently (create vs get)', async ({ users, seedUser }) => {
    test.info().annotations.push({ type: 'observation', description: 'README does not say whether names are trimmed. Only consistency is checked.' });
    const created = await seedUser({ name: '  Padded Name  ' });
    const fetched = (await (await users.get(created.id)).json()) as User;
    expect(fetched.name).toBe(created.name);
  });

  test('[EXP-003] body sent as text/plain is not accepted as a user', async ({ users }) => {
    test.info().annotations.push({ type: 'observation', description: 'README does not name a status for unsupported content types; any 4xx is accepted.' });
    const payload = buildUser();
    const response = await users.createRaw(JSON.stringify(payload), 'text/plain');
    expect(response.status(), 'Unsupported body format should be a client error').toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
    const retry = await users.create(payload);
    expect(retry.ok(), `Rejected request must not have created the user (retry got HTTP ${retry.status()})`).toBe(true);
  });

  test('[EXP-004] form-encoded body is not accepted as a user', async ({ users }) => {
    const email = uniqueEmail('form');
    const response = await users.createRaw(`name=Alex&email=${encodeURIComponent(email)}`, 'application/x-www-form-urlencoded');
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('[EXP-005] email without a dot in the domain ("user@example") - basic-format strictness', async ({ users }) => {
    test.info().annotations.push({ type: 'observation', description: 'Whether "user@example" is a valid basic format is not defined by the README.' });
    const response = await users.create(buildUser({ email: `${uniqueEmail('nodot').split('@')[0]}@example` }));
    expect(response.status()).toBe(400);
  });

  test('[EXP-006] email containing a space returns 400', async ({ users }) => {
    test.info().annotations.push({ type: 'observation', description: 'Spaces in an email are invalid under any common definition of a basic format.' });
    const response = await users.create(buildUser({ email: 'john doe@example.com' }));
    expect(response.status()).toBe(400);
  });
});
