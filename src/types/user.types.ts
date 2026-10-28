/** Valid body for POST /users. */
export interface CreateUserRequest {
  name: string;
  email: string;
}

/** User as returned by POST /users and GET /users/{id}. */
export interface User {
  id: number;
  name: string;
  email: string;
}

/** JSON error body returned with 4xx responses. */
export interface ErrorResponse {
  error: string;
}

/** Response of GET /health. */
export interface HealthResponse {
  status: string;
}
