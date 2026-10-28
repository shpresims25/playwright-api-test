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
