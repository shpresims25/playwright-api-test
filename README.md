# User Management API -- Playwright API Tests

## Overview

This project contains automated API tests for the User Management API,
implemented with Playwright Test and TypeScript.

The test suite covers the following endpoints:

-   `GET /health`
-   `POST /users`
-   `GET /users/{id}`
-   `DELETE /users/{id}`

The tests validate response status codes, response bodies, data
validation, and user lifecycle behavior against the API requirements.
The API source code is not modified by this test project. No browser is
required.

## Project Structure

``` text
user-management-api-tests/
├── tests/
│   ├── health.spec.ts
│   ├── users.create.spec.ts
│   ├── users.get.spec.ts
│   ├── users.delete.spec.ts
│   ├── users.workflow.spec.ts
│   └── fixtures/
│       ├── api.fixture.ts
│       └── assertions.ts
├── src/
│   ├── clients/
│   │   └── users.client.ts
│   ├── data/
│   │   └── user.factory.ts
│   ├── types/
│   │   └── user.types.ts
│   └── config/
│       ├── env.ts
│       └── global-setup.ts
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

### Main Components

-   **API client:** Centralizes HTTP requests to the API.
-   **Types:** Defines TypeScript types for API requests and responses.
-   **Test data factory:** Generates valid test data, including unique
    email addresses.
-   **Fixtures and assertions:** Reuse test setup and common response
    checks.
-   **Configuration:** Defines the base URL, test workers, reporters,
    and API availability check.

## Prerequisites

-   Node.js 18 or later
-   npm
-   Python 3.9 or later to run the Flask API

## Installation

From the project directory, install the dependencies:

``` bash
cd user-management-api-tests
npm install
```

Run the TypeScript check:

``` bash
npm run typecheck
```

## Start the API

Start the Flask API in a separate terminal from the directory containing
`app.py`.

Create and activate a virtual environment if needed, install the API
dependencies, and start the application:

``` bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The API should be available at:

``` text
http://127.0.0.1:5000
```

Keep the API running while executing the tests.

## Configuration

The default API base URL is `http://127.0.0.1:5000`. It can be
overridden with the `BASE_URL` environment variable.

For example:

``` bash
BASE_URL=http://127.0.0.1:5001 npx playwright test
```

On macOS, `127.0.0.1` is recommended instead of `localhost` if
`localhost` resolves to IPv6 and another service is listening on port
5000.

## Running Tests

  -----------------------------------------------------------------------------------
  Purpose                             Command
  ----------------------------------- -----------------------------------------------
  Run all tests                       `npm test`

  Run a specific test file            `npx playwright test tests/users.get.spec.ts`

  Run a test by ID                    `npx playwright test -g "CRT-007"`

  Run contract tests                  `npm run test:contract`

  Run exploratory tests               `npm run test:exploratory`

  Open the HTML report                `npm run report`
  -----------------------------------------------------------------------------------

The HTML report is generated in `playwright-report/`.

## Requirements Under Test

The tests check the behavior below. It is derived from the API
requirements and from the expectations encoded in the tests.

  -----------------------------------------------------------------------
  Endpoint                Requirement             Expected status
  ----------------------- ----------------------- -----------------------
  `GET /health`           Reports the service is  `200`,
                          up                      `{"status":"ok"}`

  `POST /users`           Valid `name` and        `201` with `id`,
                          `email` creates a user  `name`, `email`

  `POST /users`           `name` and `email` are  `400`
                          required, must be       
                          strings, and must not   
                          be blank                

  `POST /users`           `email` must have a     `400`
                          valid basic format      

  `POST /users`           `email` must be unique, `409`
                          ignoring letter case    

  `POST /users`           Malformed JSON or JSON  `400`
                          that is not an object   

  `GET /users/{id}`       Returns the user with   `200`
                          exactly that ID         

  `GET /users/{id}`       Unknown ID              `404`

  `GET /users/{id}`       Invalid ID (`0`,        `400`
                          negative, non-numeric)  

  `DELETE /users/{id}`    Removes the user,       `204`, empty body
                          returns no body         

  `DELETE /users/{id}`    Unknown ID              `404`

  `DELETE /users/{id}`    Invalid ID              `400`
  -----------------------------------------------------------------------

Error responses are expected to be JSON with a non-empty `error` message.

## Test Approach

-   Tests create the data they need and do not rely on fixed user IDs or
    data created manually in Postman.
-   Unique email addresses are generated to avoid collisions between
    test runs.
-   Tests validate both HTTP status codes and response data.
-   The test suite uses one worker to keep execution predictable while
    tests share the API's in-memory data store.
-   The API has no reset endpoint. User data is stored in memory and is
    cleared when the Flask application restarts.
-   The test setup checks API availability before running the test
    suite. If the API cannot be reached, check that the Flask
    application is running and that `BASE_URL` is correct.

### Why These Scenarios

The goal was to check the contract, not to maximize the number of tests.

-   **Start from the documented requirements.** Each stated status code
    (`201`, `400`, `404`, `409`, `204`) has at least one test, and the
    manual Postman scenarios are mapped one to one.
-   **Add boundaries and variations around each rule.** Missing,
    empty and whitespace-only values are different inputs and can hit
    different validation paths. The same applies to each wrong JSON type
    and to IDs such as `0`, `-1`, `1.5`, `1abc` and a very large number.
-   **Check data integrity, not only status codes.** A rejected request
    must not create or change a user, and deleting one user must not
    affect another. A status code alone would miss defects such as
    `DELETE` returning `204` without removing anything.
-   **Verify the full lifecycle.** The workflow test chains create, get,
    delete and get, and uses soft assertions so one run reports every
    deviation.
-   **Separate facts from opinions.** Behavior the requirements state is
    tagged `@contract`. Behavior they do not define is tagged
    `@exploratory`, so a failure there is a question for the team, not a
    confirmed bug.
-   **Keep failures meaningful.** Test setup accepts any `2xx` when it
    creates preconditions, so the create defect does not cause unrelated
    GET and DELETE tests to fail.

## Test Coverage

The test suite covers health checks, user creation, retrieval, deletion,
validation, response schemas, and end-to-end user workflows.

  -----------------------------------------------------------------------
  Area                                Scenarios covered
  ----------------------------------- -----------------------------------
  Health check                        Endpoint availability, successful
                                      response, JSON content type

  User creation                       Valid user, numeric string name,
                                      missing fields, empty and
                                      whitespace-only values, invalid
                                      email formats, duplicate emails,
                                      case-insensitive duplicates

  Request validation                  Non-string values, explicit `null`,
                                      malformed JSON, non-object JSON,
                                      unsupported content types,
                                      additional fields

  Response validation                 Status codes, JSON content type,
                                      response fields and data types

  User retrieval                      Existing and nonexistent users,
                                      invalid IDs, large IDs, correct ID
                                      and user data, retrieval of
                                      multiple users

  User deletion                       Existing and nonexistent users,
                                      invalid IDs, empty response body,
                                      repeated deletion, ensuring other
                                      users remain unchanged

  Data integrity                      Unique IDs, rejected requests do
                                      not create or alter users, deleted
                                      users can be checked through
                                      subsequent requests

  User workflow                       Create a user, retrieve it, delete
                                      it, and verify the result of a
                                      subsequent retrieval
  -----------------------------------------------------------------------

### Mapping of Manual Postman Scenarios

  -----------------------------------------------------------------------
  Scenario                Expected result         Automated test
  ----------------------- ----------------------- -----------------------
  Health check            `200` with              `health.spec.ts`
                          `{"status":"ok"}`       

  Create a valid user     `201` with the created  `CRT-001`
                          user's data             

  Retrieve a created user `200` with the same     `GET-001`
                          user ID and data        

  Delete a user           `204` with an empty     `DEL-001`, `DEL-002`
                          response body           

  Retrieve a user after   `404`                   `DEL-003`
  deletion                                        

  Create user with        `400`                   `CRT-006`
  invalid email                                   

  Create user with an     `409`                   `CRT-007`
  existing email                                  

  Create user with an     `409`                   `CRT-008`
  email differing only by                         
  letter case                                     

  Create user without a   `400`                   `CRT-003`
  name                                            

  Create user without an  `400`                   `CRT-005`
  email                                           

  Create user with a      `400`                   `CRT-004`
  whitespace-only name                            

  Retrieve a nonexistent  `404`                   `GET-002`
  user                                            

  Retrieve user ID `0`    `400`                   `GET-003`

  Delete a nonexistent    `404`                   `DEL-004`
  user                                            

  Create a user with a    `201`                   `CRT-002`
  numeric string as its                           
  name                                            
  -----------------------------------------------------------------------

## Execution Results

The recorded test run against the supplied API reported **68 tests: 50
passed and 18 failed**.

The failing tests indicate differences between the API's actual behavior
and the documented requirements. The main findings were:

  -----------------------------------------------------------------------
  Finding                 Observed behavior       Expected behavior
  ----------------------- ----------------------- -----------------------
  User creation status    `POST /users` returns   `201`
                          `200`                   

  Email validation        Some invalid email      Invalid email addresses
                          addresses are accepted  return `400`

  Duplicate email         Duplicate email         Duplicate email
  handling                addresses are accepted, addresses return `409`
                          including               
                          case-insensitive        
                          duplicates              

  User retrieval          `GET /users/{id}`       Return the correct user
                          returns an ID that      and ID
                          differs from the        
                          requested user's ID     

  User deletion           `DELETE /users/{id}`    Remove the user;
                          returns `204`, but the  subsequent retrieval
                          user remains            returns `404`
                          retrievable             
  -----------------------------------------------------------------------

Some tests can be affected by more than one issue. After an issue is
resolved, rerun the suite to identify any remaining failures.

## Bug Reports

Each report was found by the automated tests against the supplied API.
The full run reported 68 tests: 50 passed and 18 failed. The observed
responses below were confirmed with direct requests to the running API.

### BUG-01: `POST /users` returns `200` instead of `201`

-   **Severity:** Low (wrong status code, data is created correctly)
-   **Failing tests:** CRT-001, CRT-002, WF-001
-   **Steps:**
    1.  Send `POST /users` with
        `{"name":"Alex Smith","email":"alex@example.com"}`.
-   **Expected:** `201 Created` with `id`, `name` and `email`.
-   **Actual:** `200 OK`.

### BUG-02: Invalid email addresses are accepted

-   **Severity:** Medium (bad data is stored)
-   **Failing tests:** CRT-006, CRT-018.2 to CRT-018.4, and the
    exploratory EXP-005 and EXP-006
-   **Steps:**
    1.  Send `POST /users` with `{"name":"Alex","email":"user@"}`.
    2.  Repeat with `@example.com` and `user@@example.com`.
-   **Expected:** `400` with a JSON `error` message.
-   **Actual:** The user is created. The API appears to check only that
    the email contains an `@`.
-   **Note:** CRT-006 (`email-jovalid@`) is the scenario from the manual
    testing.

### BUG-03: Duplicate emails are accepted

-   **Severity:** High (breaks the uniqueness rule)
-   **Failing tests:** CRT-007, CRT-008, CRT-019, CRT-021
-   **Steps:**
    1.  Create a user with `dup@example.com`.
    2.  Send `POST /users` again with `dup@example.com`.
    3.  Repeat step 2 with `DUP@EXAMPLE.COM`.
-   **Expected:** `409 Conflict`, and the original user is unchanged.
-   **Actual:** The duplicate is accepted, including when it differs
    only by letter case.

### BUG-04: `GET /users/{id}` returns the wrong `id` in the response

-   **Severity:** Medium (the user data is correct, but clients receive
    an ID that does not match the user)
-   **Failing tests:** GET-001, GET-009, DEL-010, WF-001
-   **Steps:**
    1.  Create a user and note its `id` from the response (for example
        `429`).
    2.  Send `GET /users/429`.
-   **Expected:** `200` with `"id": 429` and the same `name` and `email`.
-   **Actual:** `200` with the correct `name` and `email`, but
    `"id": 430` (the requested ID plus one).
-   **Evidence:** `GET /users/429` returned
    `{"email":"probe@example.com","id":430,"name":"Probe"}`.

### BUG-05: `DELETE /users/{id}` does not remove the user

-   **Severity:** High (data is not deleted)
-   **Failing tests:** DEL-003, DEL-009, WF-001
-   **Steps:**
    1.  Create a user and note its `id`.
    2.  Send `DELETE /users/{id}`. It returns `204`.
    3.  Send `GET /users/{id}` again, or repeat the `DELETE`.
-   **Expected:** `404` on the second request.
-   **Actual:** The user can still be retrieved. The API reports
    success without deleting.
-   **Evidence:** `DELETE /users/429` returned `204`, then
    `GET /users/429` returned `200` with the user, and a second `DELETE`
    returned `204` instead of `404`.
-   **Note:** The workflow test reports BUG-01, BUG-04 and BUG-05 in one
    run.

## Test Categories

-   **Contract tests (`@contract`):** Verify behavior specified by the
    API requirements.
-   **Exploratory tests (`@exploratory`):** Check behavior that is not
    fully specified. Results should be reviewed with the team before
    being treated as confirmed defects.

## Notes

-   Successful deletion is expected to return `204` with no response
    body.
-   The API stores users in memory, so data does not persist after the
    Flask application restarts.
-   The tests should not be used to change or repair the API
    implementation. API defects should be reported separately.
