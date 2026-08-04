# Flyway 컨벤션

운영 DB 스키마 마이그레이션 SQL 작성 시 적용한다.

## 파일 네이밍과 버전 번호

- 마이그레이션 파일은 `src/main/resources/db/migration/` 하위에 `V{n}__{snake_case_description}.sql` 형식으로 둔다.
- 버전은 순차 정수를 유지하고 타임스탬프 버전으로 전환하지 않는다.
- 새 파일 작성 전 `origin/develop`의 최고 `V{n}`을 확인하고 `n+1`을 사용한다. pull은 필요 없다.

```bash
git fetch origin
git ls-tree --name-only origin/develop backend/src/main/resources/db/migration/
```

- 이미 머지된 마이그레이션 파일은 수정하지 않는다. 체크섬이 불일치하면 부팅이 실패한다.
- `R__` repeatable 마이그레이션은 사용하지 않는다.

## SQL 작성 규칙

- DDL만 작성하고 `INSERT`·`UPDATE`·`DELETE` 등 DML은 마이그레이션에 포함하지 않는다.
- 모든 제약조건은 `CONSTRAINT uk_{table}_{columns} UNIQUE (...)`처럼 이름을 명시한다.
- Hibernate가 자동 생성한 이름(`V1__baseline.sql:15`의 `UKjvruwoheigjhiu3ry9kwebyww`)을 그대로 두지 않는다.
- 인덱스는 `idx_{table}_{columns}` 형식을 사용한다 (`V2__add_walk_sessions.sql:20-21`).
- 신규 테이블은 `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`를 명시한다 (`V2:22`, `V4:15`).
- `IF NOT EXISTS`로 실패를 감추지 않는다.

`V4__add_active_walk_sessions.sql:12-14` 예시.

```sql
    CONSTRAINT uk_active_walk_sessions_member UNIQUE (member_id),
    CONSTRAINT uk_active_walk_sessions_key UNIQUE (walk_session_key),
    INDEX idx_active_walk_sessions_expires_at (expires_at)
```

- 엔티티와 유니크 제약조건을 일치시키는 규칙은 JPA 컨벤션 문서를 따른다 (하단 관련 문서 참고).

## 관련 문서

- [JPA 컨벤션](jpa-convention.md) — 엔티티 유니크 제약조건
- [Flyway 운영](../manual/flyway-operations.md) — 환경별 동작, PR 전 검증 절차
