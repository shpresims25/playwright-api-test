import type { APIRequestContext, APIResponse } from '@playwright/test';

/**
 * Thin wrapper around the User Management API. It only sends requests and returns the
 * raw APIResponse; all assertions stay in the tests.
 */
export class UsersClient {
  constructor(private readonly request: APIRequestContext) {}

  health(): Promise<APIResponse> {
    return this.request.get('/health');
  }

  /** POST /users with any JSON-serialisable payload (valid or deliberately invalid). */
  create(payload: unknown): Promise<APIResponse> {
    return this.createRaw(JSON.stringify(payload), 'application/json');
  }

  /** POST /users with an exact raw body and content type (malformed JSON, other formats). */
  createRaw(body: string, contentType: string): Promise<APIResponse> {
    return this.request.post('/users', {
      data: body,
      headers: { 'Content-Type': contentType },
    });
  }

  /** IDs are typed string | number so tests can send values like "abc" or "-1". */
  get(id: string | number): Promise<APIResponse> {
    return this.request.get(`/users/${id}`);
  }

  delete(id: string | number): Promise<APIResponse> {
    return this.request.delete(`/users/${id}`);
  }
}
