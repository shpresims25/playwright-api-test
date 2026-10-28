import type { APIResponse } from '@playwright/test';
import { expect } from './api.fixture';
import type { ErrorResponse } from '../../src/types/user.types';

/** Expects the given status, a JSON content type and a non-empty string `error` field. */
export async function expectJsonError(response: APIResponse, status: number): Promise<void> {
  expect(response.status(), `Expected HTTP ${status}`).toBe(status);
  expect(response.headers()['content-type'] ?? '', 'Error response should be JSON').toContain('application/json');
  const body = (await response.json()) as ErrorResponse;
  expect(typeof body.error, 'Error body should contain a string "error" field').toBe('string');
  expect(body.error.length, 'Error message should not be empty').toBeGreaterThan(0);
}
