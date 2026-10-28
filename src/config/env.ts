/** Single source of truth for the API base URL. Override with the BASE_URL env var. */
export const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:5000';
