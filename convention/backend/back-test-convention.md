# Backend Test Convention

Apply these rules when working on Java Spring Boot tests, including controller tests, REST Docs tests, service unit tests, persistence integration tests, fixtures, mocks, assertions, or test structure.

## Core Rules

- Use JUnit 5 and AssertJ.
- Write test display names in Korean with `@DisplayName`.
- Follow the given / when / then structure.
- One test should verify one behavior.
- Test names should describe behavior, not implementation.
- Do not test private methods directly.
- Avoid unnecessary Spring Context loading.
- Prefer readable tests over excessive fixture reuse.

## Test Layers

### Controller Test

Use controller tests for:

- request validation
- request/response mapping
- HTTP status codes
- error responses
- REST Docs snippets

Rules:

- Use RestAssuredMockMvc.
- Generate REST Docs from controller tests.
- Mock Service dependencies.
- Do not verify business logic.
- Do not access Repository directly.
- Verify API contract: path, method, headers, request fields, response fields.
- Use request DTO fixtures and minimal mocked response DTO fixtures.

### Service Test

Use service tests for:

- business flow
- transaction boundary behavior when needed
- domain orchestration
- exception cases

Rules:

- Use unit tests by default.
- Mock Repository and external dependencies.
- Verify domain behavior and service decisions.
- Do not load Spring Context unless necessary.
- Test through public service methods.
- Use command/input fixtures and Entity fixtures needed for business flow verification.

### Persistence Test

Use persistence integration tests for:

- repository queries
- JPA mappings
- fetch join / EntityGraph behavior
- constraints and persistence behavior
- custom query methods

Rules:

- Use integration tests.
- Use a real persistence context.
- Verify saved and loaded data explicitly.
- Clear the persistence context when verifying database reads.
- Do not mock Repository in persistence tests.
- Use persistable Entity fixtures that satisfy real JPA mappings and DB constraints.

## REST Docs Rules

- Generate REST Docs only from passing tests.
- Document request fields, response fields, path parameters, query parameters, and headers when present.
- Keep documented examples realistic.
- Document error responses for important failure cases.
- Use stable and descriptive snippet names.
- REST Docs tests must fail when the documented contract differs from the actual API behavior.

## Fixture Rules

- Keep one-off fixtures close to the test.
- Extract repeated fixtures into dedicated fixture classes, helpers, or factory methods.
- Fixture names must reveal test intent.
- Prefer small, domain-specific fixtures over one large shared fixture.
- Do not hide important test conditions inside fixtures.
- Test data must not depend on execution order.
- Separate object creation fixtures from persistence helpers.
- Persistence helpers must reveal side effects with names like `saveUser`.

## Fixture Location Rules

- Prefer placing fixtures near the package that owns the test target.
- If a fixture needs access to package-private constructors, methods, or value objects, place it in the same package as the target.
- Do not place all fixtures in one global fixture package when it breaks package-private access or hides domain context.
- A separate test fixture source root may be used only if it preserves the same package structure as production/test code.
- Do not make production constructors, methods, or classes more visible only for fixtures.

Example:

```text
src/main/java/com/example/order/domain/Order.java
src/main/java/com/example/order/domain/Money.java
src/test/java/com/example/order/domain/OrderFixture.java
```

Even though `OrderFixture` is under `src/test/java`, it can access package-private members when it declares the same package:

```java
package com.example.order.domain;
```

## Mocking Rules

- Mock only external boundaries or dependencies outside the test target.
- Do not over-mock domain objects.
- Do not mock value objects or simple entities without a strong reason.
- Verify interactions only when the interaction itself is the behavior.
- Prefer state/result assertions over excessive interaction verification.

## Assertion Rules

- Use AssertJ assertions.
- Assert meaningful outcomes, not implementation details.
- Include exception tests for business rule failures.
- Avoid broad assertions that do not prove behavior.

## Prohibited

- Testing multiple behaviors in one test
- Loading Spring Context for simple unit tests
- Verifying business logic in Controller tests
- Depending on a real DB in Service unit tests
- Mocking Repository in persistence tests
- REST Docs snippets that do not match actual API behavior
- Empty or order-dependent fixtures
- Making production code more public only for tests or fixtures
