# Flyway 운영

마이그레이션 스크립트 작성 규칙은 [Flyway 컨벤션](../convention/flyway-convention.md)을 따른다. 이 문서는 환경별 동작과 PR 전 검증 절차를 다룬다.

## 환경별 동작

| 프로파일 | `spring.flyway.enabled` | `ddl-auto` | 스키마 소유 |
|---|---|---|---|
| `local` | `false` (base 상속) | `create` | Hibernate + `db/local/data.sql` 시드 |
| `test` | `false` (base 상속) | `create` | Hibernate (`FlywayMigrationTest`만 예외) |
| `dev` | `true` (`baseline-on-migrate: true`, `baseline-version: "1"`) | `validate` | Flyway |
| `prod` | `true` (컨테이너별 `SPRING_FLYWAY_ENABLED`로 재정의) | `none` | Flyway |

- `application.yml`의 기본값은 `false`이므로 Flyway를 사용하는 프로파일에서만 명시적으로 켠다.
- `prod`는 stable과 canary 컨테이너가 서로 다른 `SPRING_FLYWAY_ENABLED` 값으로 기동한다.
- 운영 DB 호환성과 롤백 정책은 [카나리 배포 운영 매뉴얼](canary-deployment.md)을 따른다.

## 검증

- PR 전 `FlywayMigrationTest`를 실행해 빈 DB에 `V1`부터 최신 버전까지 재생되는지 확인한다.

```bash
./gradlew test --tests '*FlywayMigrationTest'
```

- 이 테스트는 Testcontainers MySQL 8.0 컨테이너에 Flyway를 실제로 적용한다.
- 적용 후 Hibernate `validate`로 엔티티와 스키마 일치를 확인하며, 컨텍스트 로딩 성공이 곧 검증 통과다.
- Docker가 실행 중이어야 한다.
- 테스트 작성 규칙은 [백엔드 테스트 컨벤션](../convention/back-test-convention.md)을 따른다.
- 운영 반영 후에는 Jenkins prod 파이프라인의 `infra/deploy/check-flyway-history.sh`가 `flyway_schema_history`의 최신 적용 버전과 실패 행을 확인한다.
