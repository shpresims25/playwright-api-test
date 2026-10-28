<<<<<<< HEAD
# User Management API – Playwright API Tests

Automated API tests (Playwright Test + TypeScript) for the Flask **User Management API** (`GET /health`, `POST /users`, `GET /users/{id}`, `DELETE /users/{id}`).

The tests check the **documented contract** in the API's README. The API contains deliberate defects, so **some tests are expected to fail** – that is the framework doing its job. The API source code is never modified. No browser is needed.

## Folder structure

```text
user-management-api-tests/
├── tests/
│   ├── health.spec.ts            GET /health
│   ├── users.create.spec.ts      POST /users (contract + additional + exploratory)
│   ├── users.get.spec.ts         GET /users/{id}
│   ├── users.delete.spec.ts      DELETE /users/{id}
│   ├── users.workflow.spec.ts    create -> get -> delete -> get
│   └── fixtures/
│       ├── api.fixture.ts        `users` (API client) and `seedUser` (test precondition) fixtures
│       └── assertions.ts         expectJsonError(): status + JSON content type + `error` message
├── src/
│   ├── clients/users.client.ts   ALL HTTP calls; returns raw responses, contains no assertions
│   ├── data/user.factory.ts      valid user data, unique emails, a nonexistent id
│   ├── types/user.types.ts       TypeScript interfaces for requests/responses
│   └── config/
│       ├── env.ts                BASE_URL (the only place the default lives)
│       └── global-setup.ts       fails fast with a clear message if the API is unreachable
├── playwright.config.ts          base URL, 1 worker, reporters
├── tsconfig.json  package.json  .gitignore
```

Changes from the suggested layout: added `src/config/` (so the base URL has one home and a connectivity check exists) and `tests/fixtures/assertions.ts` (one shared "expect a JSON error" helper instead of copy-pasting it).

## Prerequisites

- Node.js 18+ and npm
- Python 3.9+ to run the Flask API (separately)

## Install

```bash
cd user-management-api-tests
npm install
npm run typecheck      # optional TypeScript check
```

## Start the API (separate terminal)

```bash
cd <folder containing app.py>
python -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt                      # first time only
python app.py                                        # http://127.0.0.1:5000
```

Use `127.0.0.1`, not `localhost`: on macOS `localhost` can resolve to IPv6 where AirPlay Receiver answers on port 5000 with 403.

## Configure BASE_URL

Default `http://127.0.0.1:5000`, defined once in `src/config/env.ts` and consumed by `playwright.config.ts`.

```bash
BASE_URL=http://127.0.0.1:5001 npx playwright test
```

## Run tests

| Goal | Command |
|---|---|
| All tests | `npm test` |
| One file | `npx playwright test tests/users.get.spec.ts` |
| One test by ID | `npx playwright test -g "CRT-007"` |
| Only documented-contract tests | `npm run test:contract` |
| Only exploratory tests | `npm run test:exploratory` |
| Generate and open HTML report | `npm run report` (report is written to `playwright-report/` on every run) |

## In-memory data and why there is one worker

The API keeps users in a Python dict shared by every request, and IDs only ever increase. Therefore:

- **One worker** (`workers: 1`, `fullyParallel: false`): parallel tests would share the same store; today uniqueness makes that mostly safe, but one worker keeps results deterministic while we learn the API. It can be raised later because tests are already independent.
- **Tests never depend on order, on specific IDs, or on data from Postman.** Every test creates what it needs, with a unique email (`user.<uuid>@example.com`), and reads IDs from the create response.
- **No reset endpoint exists**, so data accumulates across runs; unique emails make that harmless. For a fully clean state, restart `python app.py` (this also resets IDs).
- The `seedUser` fixture accepts any 2xx when creating *preconditions*. Otherwise the create defect (200 instead of 201) would make every GET/DELETE test fail for the wrong reason. The exact status is asserted in the create tests.

## Environment problems vs. real failures

Before any test runs, `global-setup.ts` calls `/health`. If the connection is refused the whole run stops with `ENVIRONMENT ISSUE (not a test failure): cannot reach the API...`. If you see assertion errors like `Expected: 201 / Received: 200`, the API *was* reachable and the failure is an application-vs-contract difference.

## Test categories

- **`@contract`** – asserts something the API README explicitly states (or follows directly from it). A failure is a defect.
- **`@exploratory`** – behaviour the README does not define (e.g. strictness of "basic email format", unsupported content types). A failure is an **observation to discuss with the team**, not a confirmed defect. These tests carry an `observation` annotation visible in the HTML report.

## Known defects and how they show up

Results of the run against the supplied API (68 tests: 50 passed, 18 failed):

| Defect | Failing tests |
|---|---|
| **D1** POST returns `200` instead of `201` | CRT-001, CRT-002 |
| **D2** Email only needs an `@` (invalid emails accepted) | CRT-006, CRT-018.2, CRT-018.3, CRT-018.4 (+ exploratory EXP-005, EXP-006) |
| **D3** No duplicate-email check (exact and case-insensitive) | CRT-007, CRT-008, CRT-019, CRT-021 |
| **D4** GET returns `id + 1` (wrong user / wrong id) | GET-001, GET-009, DEL-010, WF-001 |
| **D5** DELETE returns 204 but does not remove the user | DEL-003, DEL-009, WF-001 |

Some tests fail on more than one defect; the first failing assertion is reported (WF-001 uses soft assertions so it reports D1, D4 and D5 in one run). When one defect is fixed, tests blocked by it may reveal a second one.

## Mapping: manual Postman scenarios → automated tests

| Manual scenario | Expected | Automated test(s) | Result vs. current API |
|---|---|---|---|
| Create a valid user | 201 | CRT-001 | Fails (200) – D1 |
| Retrieve user ID 2 | 200 with ID 2 | GET-001 | Fails (id+1) – D4 |
| Delete user ID 2 | 204, user removed | DEL-001, DEL-002 (204/empty body) and DEL-003 (removed) | DEL-001/002 pass, DEL-003 fails – D5 |
| Invalid email `email-jovalid@` | 400 | CRT-006 | Fails (200) – D2 |
| Duplicate email | 409 | CRT-007 | Fails (200) – D3 |
| Duplicate email, uppercase | 409 | CRT-008 | Fails (200) – D3 |
| Missing name | 400 | CRT-003 | Pass |
| Missing email | 400 | CRT-005 | Pass |
| Whitespace-only name | 400 | CRT-004 | Pass |
| Retrieve nonexistent user | 404 | GET-002 | Pass |
| Retrieve ID 0 | 400 | GET-003 | Pass |
| Delete nonexistent user | 404 | DEL-004 | Pass |
| Numeric name | 201 | CRT-002 | Fails (200) – D1 |
| *(task list)* non-string name / email | 400 | CRT-009, CRT-010 | Pass |
| *(task list)* malformed JSON / non-object JSON | 400 | CRT-011, CRT-012 | Pass |
| *(task list)* distinct IDs | – | CRT-013 | Pass |
| *(task list)* negative / non-numeric ID (GET, DELETE) | 400 | GET-004, GET-005, DEL-006, DEL-007, DEL-005 (ID 0) | Pass |
| *(task list)* full workflow | – | WF-001 | Fails – D1, D4, D5 |

## Additional scenarios (beyond the manual Postman set)

### Documented-contract tests (`@contract`)

| ID | Behaviour verified | Expected | Why it matters |
|---|---|---|---|
| CRT-014.1–4 | `name` sent as JSON null / boolean / array / object | 400 | README: name must be a string. Each JSON type can hit a different validator path; null is also the "explicit null vs. missing" case. |
| CRT-015.1–4 | Same four types for `email` | 400 | Same reasoning for email. |
| CRT-016 / CRT-017 | Empty-string name / email | 400 | Empty string is the boundary just below "nonblank" and is distinct from whitespace-only and missing. |
| CRT-018.1–4 | Invalid formats: `plainaddress`, `@example.com`, `user@`, `user@@example.com` | 400 | Manual testing covered one bad email. The API only checks for `@`, so these probe different missing/duplicated parts. |
| CRT-019 | Duplicate where the **first** email is uppercase | 409 | Case-insensitive uniqueness must work in both directions (catches a one-sided `lower()`). |
| CRT-020 | A 400-rejected request does not reserve the email | Same email later accepted | Data integrity: rejected input must not create a "phantom" user. |
| CRT-021 | A 409-rejected duplicate does not change the original user | Original name/email intact | Data integrity: a failed create must not overwrite existing data. |
| CRT-022 | 201 response is JSON with exactly `id`, `name`, `email` | Exact keys | Verifies the documented response schema and content type. |
| CRT-023 | Unicode name `José Müller 李雷` | Accepted, unchanged | Positive/boundary case: encoding bugs corrupt names silently. |
| HLT-003 | `/health` content type is JSON | `application/json` | README: responses should be JSON. |
| GET-006 | IDs `1.5`, `1abc`, `1e2`, `null`, `-0` | 400 | Numeric-looking invalid IDs that naive parsing might accept. |
| GET-007 | ID `99999999999999999999` | 404 | Boundary: huge valid positive integer must be "not found", not a 500. |
| GET-008 | 200 body is JSON with exactly `id` (integer), `name`, `email` | Exact schema | Schema/content-type check on retrieval. |
| GET-009 | Two users each retrieved with their own data | Each equals its create response | Detects cross-over/off-by-one mixups that a single-user test can miss. |
| DEL-008 | Invalid IDs `1.5`, `1abc`, `1e2` on DELETE | 400 | Mirrors GET-006 for the delete path (validation is implemented separately per endpoint). |
| DEL-009 | Second DELETE of the same user | 404 | README: deleting a nonexistent user returns 404; this proves the first delete really removed it. |
| DEL-010 | Deleting one user leaves another untouched | Other user still 200 and equal | Data integrity: deletion must be scoped to one user. |

### Exploratory tests (`@exploratory`) – README is silent; failures are observations

| ID | Behaviour | Expectation used | Why it matters |
|---|---|---|---|
| EXP-001 | Extra field (`role`) in create body | Not a 5xx; if accepted, response has only `id,name,email` | Mass-assignment style leaks; README defines the response shape but not input strictness. |
| EXP-002 | Name with surrounding spaces | Create and GET return the same name | README does not say whether names are trimmed; consistency is the only safe assertion. *(Observation: the API trims on create.)* |
| EXP-003 | Valid JSON sent as `text/plain` | Any 4xx, and no user created | Unsupported body formats must not silently create data. *(Observation: API answers 400 and creates nothing.)* |
| EXP-004 | Form-encoded body | Any 4xx | Same, for a second unsupported format. |
| EXP-005 | Email `user@example` (no dot) | 400 | "Basic format" is undefined; shows how strict the API is. A failure needs a team decision. |
| EXP-006 | Email containing a space | 400 | Invalid under any common definition, but not literally spelled out in the README. |
| EXP-007 | Email of a deleted user re-registered | Accepted | Follows from "unique among users" + delete, but is not stated. Currently passes. |

## Architecture in short

- **Client** (`UsersClient`): one place that knows URLs and how to send bodies (including raw/malformed ones). Tests never build requests by hand.
- **Types**: document the contract and give editor autocompletion.
- **Factory**: valid data plus unique emails, so tests do not collide or depend on each other.
- **Fixtures**: inject the client into tests; `seedUser` removes repeated setup code.
- **Tests**: contain all scenarios and assertions, with descriptive names and failure messages.
- **Config**: base URL, worker count and reporters each defined once.
=======
# playwright-api-test
>>>>>>> origin/main
