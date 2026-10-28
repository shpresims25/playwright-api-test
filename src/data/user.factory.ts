import { randomUUID } from 'node:crypto';
import type { CreateUserRequest } from '../types/user.types';

/** A fresh, lowercase email that no other test (or earlier run) has used. */
export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}.${randomUUID()}@example.com`;
}

/** A valid create-user body with a unique email. Override any field per test. */
export function buildUser(overrides: Partial<CreateUserRequest> = {}): CreateUserRequest {
  return {
    name: 'Alex Smith',
    email: uniqueEmail(),
    ...overrides,
  };
}

/** Positive integer far beyond any ID the in-memory API will ever hand out. */
export const NONEXISTENT_USER_ID = 999_999_999;
