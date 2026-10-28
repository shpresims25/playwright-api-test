import { request } from '@playwright/test';
import { BASE_URL } from './env';

/**
 * Runs once before all tests. If the API is not reachable we stop immediately with a
 * clear ENVIRONMENT message, instead of letting every test fail with a confusing
 * "connect ECONNREFUSED" that looks like an application defect.
 * Any HTTP response (even a 500) counts as reachable; only connection errors abort.
 */
export default async function globalSetup(): Promise<void> {
  const api = await request.newContext({ baseURL: BASE_URL });
  try {
    await api.get('/health', { timeout: 5_000 });
  } catch (error) {
    throw new Error(
      `ENVIRONMENT ISSUE (not a test failure): cannot reach the API at ${BASE_URL}.\n` +
        `Start the Flask app (python app.py) or set BASE_URL. Cause: ${(error as Error).message}`,
    );
  } finally {
    await api.dispose();
  }
}
