# 백엔드 기본 컨벤션

Java 21, Spring Boot 3.5.2, JPA/Hibernate, MySQL 기반 코드에 적용한다.

## 코드 스타일

- 모든 파일의 마지막은 개행으로 마무리한다.
- import문에서 와일드카드(`*`) 사용을 지양한다.

## 핵심 원칙

- 지정되지 않은 기술은 먼저 물어보고 도입한다.
- DRY와 SRP를 지킨다.
- 매직 스트링, 미사용 import, 미사용 코드를 남기지 않는다.
- 변경 후 빌드·테스트를 실행한다.

## 레이어드 아키텍처

```
controller/   요청 처리, 유효성 검사, 응답 매핑
service/      트랜잭션 경계, 오케스트레이션, 도메인 로직 실행
repository/   DB 접근
domain/       엔티티, 상태 변경, 비즈니스 규칙
```

의존 방향은 아래로만 흐른다.

```
Controller → Service → Repository → DB
Controller → DTO
Service    → Domain Entity
```

- Controller는 Service만 호출한다. Repository를 직접 호출하지 않는다.
- Service는 Repository를 호출할 수 있으나 Controller에 의존하지 않는다.
- Repository에 비즈니스 판단 로직을 두지 않는다.
- Domain Entity는 상위 레이어(Controller, Service, Repository, DTO)에 의존하지 않는다.
- Entity ↔ DTO 변환은 Service/API 경계에서 한다.
- Service 간 호출은 허용하되 순환 의존은 금지한다.

## REST API 설계

- URL은 소문자와 하이픈(`-`)을 사용한다.
- 리소스는 복수형 명사로 표현한다. (`/users`, `/orders`)
- 다중 단어 URL에는 kebab-case를 사용한다. (`/order-items`)
- 경로 파라미터는 camelCase를 사용한다. (`/users/{userId}`)
- URL에 동사를 사용하지 않는다.
- HTTP 메서드로 행위를 표현한다.
- 계층 관계는 경로로 표현한다. (`/users/{userId}/orders`)

## 서비스

- 읽기 전용 메서드나 클래스에는 `@Transactional(readOnly = true)`를 붙인다.
- 생성·수정·삭제 메서드에는 `@Transactional`을 붙인다.
- 상태 변경은 Domain Entity의 명시적인 메서드를 통해서만 한다.

## 네이밍

| 대상 | 규칙 |
|---|---|
| 클래스 | UpperCamelCase |
| 인터페이스 | UpperCamelCase, `I` 접두사 없음 |
| 구현체 | `Impl` 접미사 또는 구체적인 이름 |
| 엔티티 | 접미사 없음 |
| 요청 DTO | `XXXRequest`, `controller/request` 패키지 하위 |
| 응답 DTO | `XXXResponse`, `controller/response` 패키지 하위 |
| 메서드 | lowerCamelCase, 동사+명사 형태 |
| 변수 | lowerCamelCase |
| 상수 | UPPER_SNAKE_CASE |

불명확한 약어는 사용하지 않는다: `cnt` → `count`, `idx` → `index`, `msg` → `message`

## 의존성 주입 / Lombok

- 생성자 주입을 사용한다. `@Autowired` 필드 주입은 금지한다.
- `@RequiredArgsConstructor`를 사용한다.
- 필드는 `private final`로 선언한다.
- DTO는 Java `record`를 우선 사용한다.

허용 Lombok 어노테이션: `@Getter`, `@Builder`, `@ToString`(민감 필드 제외), `@RequiredArgsConstructor`

금지 Lombok 어노테이션: `@Data`, Entity에 `@Setter`

Entity 상태 변경은 의도를 드러내는 메서드를 사용한다.

```java
// 금지
user.setStatus("WITHDRAWN");

// 허용
user.requestWithdrawal();
```

## JPA / MySQL

- 엔티티에 `@Table(name = "...")` 을 명시한다.
- 연관관계 기본 fetch 전략은 `FetchType.LAZY`다.
- `@OneToMany`의 N+1 문제에 주의하고, 필요 시 `@EntityGraph` 또는 fetch join을 사용한다.
- `@Enumerated(EnumType.STRING)`을 사용한다. `EnumType.ORDINAL`은 금지한다.
- `created_at`, `updated_at`은 `@MappedSuperclass`로 공유한다.

## 예외 처리

- 비즈니스 예외는 커스텀 예외 클래스로 `RuntimeException`을 상속받아 만든다.
- `@RestControllerAdvice`로 API 예외를 일관되게 처리한다.
- `GlobalExceptionHandler`에서 공통 에러 응답을 반환한다.
- 빈 `try-catch`로 예외를 삼키지 않는다.
- 중첩 깊이를 줄이기 위해 early return을 선호한다.

## 외부 API 호출

- 외부 HTTP API는 `WebClient`를 사용한다. `RestTemplate`은 사용하지 않는다.
- 외부 API 클라이언트는 인터페이스와 구현체로 분리한다.
- DB 트랜잭션 안에서 외부 HTTP 호출을 하지 않는다.
- 외부 호출과 트랜잭션 작업을 함께 다뤄야 할 때는 Facade를 사용한다.

## 금지 사항

- 승인 없이 지정되지 않은 기술 도입
- Controller에 비즈니스 로직 작성
