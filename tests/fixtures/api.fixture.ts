import { test as base, expect } from '@playwright/test';
import { UsersClient } from '../../src/clients/users.client';
import { buildUser } from '../../src/data/user.factory';
import type { CreateUserRequest, User } from '../../src/types/user.types';

type ApiFixtures = {
  /** API client bound to the configured BASE_URL. */
  users: UsersClient;
  /**
   * Creates a user as test PRECONDITION. It accepts any 2xx (not only 201) on purpose:
   * the status code itself is verified by the create tests, so a create defect does not
   * make every get/delete test fail for the wrong reason.
   */
  seedUser: (overrides?: Partial<CreateUserRequest>) => Promise<User>;
};

export const test = base.extend<ApiFixtures>({
  users: async ({ request }, use) => {
    await use(new UsersClient(request));
  },

  seedUser: async ({ users }, use) => {
    await use(async (overrides = {}) => {
      const response = await users.create(buildUser(overrides));
      expect(response.ok(), `Test setup failed: could not create a user (HTTP ${response.status()})`).toBe(true);
      return (await response.json()) as User;
    });
  },
});

export { expect };
