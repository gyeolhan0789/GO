# Backend Basic Convention

Apply these rules when working on Java backend code using Spring Boot, JPA/Hibernate, MySQL, layered architecture, services, repositories, entities, DTOs, exceptions, or external API clients.

## Core Rules

- Use Java 21.
- Use Spring Boot 3.5.2, JPA/Hibernate, and MySQL.
- Do not introduce unspecified technologies without asking first.
- Keep code DRY and aligned with SRP.
- Remove magic strings, unused imports, unused code, and unnecessary paths.
- Run build/test after changes when the project provides a build command.

## Layered Architecture

Use these responsibilities:

```text
controller/     - request handling, validation, response mapping
service/        - transaction boundary, orchestration, domain logic execution
repository/     - database access
domain/         - entities, state changes, business rules
```

Dependency direction:

```text
Controller -> Service -> Repository -> DB
Controller -> DTO
Service    -> Domain Entity
```

Rules:

- Dependencies must flow downward only.
- Controller must call Service only, never Repository directly.
- Service may call Repository, but must not depend on Controller.
- Repository must not contain business decisions.
- Domain Entity must not depend on Controller, Service, Repository, or DTO.
- Domain Entity may use pure Java and JPA annotations.
- DTOs belong at the API boundary.
- Convert between Entity and DTO at the Service/API boundary.
- Service-to-Service calls are allowed, but circular dependencies are forbidden.

## Services

- Use `@Transactional(readOnly = true)` for read-only service methods or classes.
- Use `@Transactional` for create, update, and delete operations.
- State changes must be performed through clear Domain Entity methods.
- Keep service methods focused on transaction boundaries, orchestration, and domain logic execution.

## Naming

- Class: UpperCamelCase.
- Interface: UpperCamelCase, no `I` prefix.
- Implementation: use `Impl` suffix or a concrete name.
- Entity: no suffix.
- Request DTO: `XXXRequest`.
- Response DTO: `XXXResponse`.
- Method: lowerCamelCase, preferably verb + noun.
- Variable: lowerCamelCase.
- Constant: UPPER_SNAKE_CASE.

Avoid unclear abbreviations:

- `cnt` -> `count`
- `idx` -> `index`
- `msg` -> `message`

## Dependency Injection and Lombok

- Use constructor injection.
- Do not use field injection with `@Autowired`.
- Prefer `@RequiredArgsConstructor`.
- Use `private final` fields whenever possible.
- Prefer Java `record` for DTOs.

Allowed Lombok annotations:

- `@Getter`
- `@Builder`
- `@ToString`, excluding sensitive fields
- `@RequiredArgsConstructor`

Forbidden Lombok annotations:

- `@Data`
- `@Setter` on Entity classes

Entity state changes must use intention-revealing methods.

```java
// Bad
user.setStatus("WITHDRAWN");

// Good
user.requestWithdrawal();
```

## JPA / MySQL

- Specify `@Table(name = "...")` on Entity classes.
- Use `fetch = FetchType.LAZY` by default for relationships.
- Be aware of N+1 problems on `@OneToMany`.
- Use `@EntityGraph` or fetch join when needed.
- Use `@Enumerated(EnumType.STRING)`.
- Do not use `EnumType.ORDINAL`.
- Share `created_at` and `updated_at` through `@MappedSuperclass`.

## Exceptions

- Business exceptions must extend `RuntimeException` through custom exception classes.
- Handle API exceptions consistently with `@RestControllerAdvice`.
- Use a `GlobalExceptionHandler` for common error responses.
- Do not swallow exceptions with empty or meaningless `try-catch`.
- Prefer early returns to reduce nesting depth.

## External API Calls

- Use `WebClient` for external HTTP APIs.
- Avoid `RestTemplate`.
- Separate external API clients with interface and implementation.
- Do not include external API calls inside database transactions.
- Use a Facade when external calls and transactional work need orchestration.

## Prohibited

- Adding unspecified technologies without asking
- Business logic in Controller
- Direct Repository access from Controller
- Business decisions in Repository
- Domain dependency on higher layers
- Field injection with `@Autowired`
- `@Data`
- `@Setter` on Entity classes
- `EnumType.ORDINAL`
- Swallowing exceptions
- External HTTP calls inside transactions
