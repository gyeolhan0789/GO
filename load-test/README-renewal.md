# 빙고 갱신 API 락 경합 테스트

MR !280의 `load-test/scripts/endpoints` 구조와 공통 `guard.js` 정책을 유지하면서, 상태를 한 번 소비하는 빙고 갱신 API를 별도 fixture 기반으로 측정한다.

## 실험 전제

이 테스트에서 확인하려는 쿼리는 다음과 같다.

```sql
SELECT id, room_id, status
FROM games
WHERE room_id = ?
  AND status = 'ACTIVE'
LIMIT 1
FOR UPDATE;
```

- `games(room_id, status)` 복합 인덱스가 없는 상태여야 한다.
- 트러블 슈팅에서 제외하기로 한 `ORDER BY id DESC`가 실제 실행 쿼리에도 없어야 한다.
- MySQL 격리 수준은 `REPEATABLE-READ`를 사용한다.
- 5,000명은 서비스 전체 사용자 규모이며 k6의 VU 수가 아니다. 기본 fixture 5,000개를 만들되 실제 동시 갱신 요청은 별도로 조절한다.

현재 애플리케이션 코드가 위 조건과 다르면 그 실행 결과는 같은 실험으로 해석할 수 없다. 부하 테스트 스크립트는 애플리케이션 쿼리를 변경하지 않는다.

```sql
SHOW INDEX FROM games;
SELECT @@transaction_isolation;
```

## fixture 구성

`renewal-prepare.sql`은 기존 `k6-renew-%@k6.local` 데이터만 지운 뒤 다음 상태를 다시 만든다.

- 서로 다른 회원 5,000명
- 회원마다 서로 다른 `SINGLE` 방 1개
- 방마다 8일 전에 시작한 `ACTIVE` 게임 1개
- 게임마다 참가자 1명, `ACTIVE` 공유 빙고판 1개, 미완료 셀 9개

각 요청은 서로 다른 회원과 방을 사용한다. 따라서 같은 방의 정책적 직렬화나 같은 회원의 보상 갱신이 아니라, `games` 전체 스캔과 비관적 락 때문에 서로 다른 방끼리 경합하는지를 관찰할 수 있다.

## 실행

백엔드와 로컬 MySQL/Redis를 먼저 실행한 뒤 다음 명령을 사용한다.

```bash
cd load-test
VUS=5 ITERATIONS=100 FIXTURE_COUNT=5000 ./run-renewal.sh
```

러너는 실행할 때마다 fixture를 원상태로 재구성하고, 테스트 전후 MySQL 누적 락 지표와 종료 후 정합성 결과를 출력한다. k6 threshold가 실패해도 사후 지표와 정합성 검증까지 실행한 뒤 k6의 종료 코드를 반환한다.

직접 나누어 실행하려면 다음과 같이 한다.

```bash
docker exec -i wecandoit-mysql \
  mysql -u wecandoit -pwecandoit1234 wecandoit \
  --init-command="SET @renewal_fixture_count=5000" \
  < renewal-prepare.sql

k6 run \
  --env VUS=5 \
  --env ITERATIONS=100 \
  scripts/endpoints/bingo-renewal.js
```

준비 단계에서 fixture 계정의 로그인과 방 조회를 먼저 끝낸다. 실제 threshold는 `endpoint:renewal` 태그가 붙은 갱신 요청과 `renewal_duration`, `renewal_failed`만 평가하므로 로그인/방 조회 시간이 갱신 API 지연시간에 섞이지 않는다.

## 단계별 부하

각 단계 전에 반드시 fixture를 다시 준비한다. 한 번 갱신한 방은 기존 게임이 종료되고 새 게임이 생성되므로 그대로 재사용할 수 없다.

| 단계 | VUS | ITERATIONS | 목적 |
|---|---:|---:|---|
| Smoke | 1 | 1 | fixture와 API 성공 여부 확인 |
| 순차 기준선 | 1 | 100 | 락 경합이 없을 때 지연시간 확인 |
| 예상 동시성 | 5 | 100 | 5,000명 중 소수의 동시 갱신 확인 |
| 경계 확인 | 10 | 100 | 기본 Hikari 풀 규모 부근 확인 |
| Stress | 25, 50, 100 | 각 100 | 락 대기와 커넥션 풀 대기가 커지는 구간 확인 |
| Spike | 250 | 250 | 전체 사용자의 5%가 동시에 몰리는 보수적 순간 부하 확인 |

`shared-iterations`를 사용하므로 `VUS`는 동시 실행자 수, `ITERATIONS`는 서로 다른 방에 보내는 총 갱신 요청 수다.

## 확인할 지표

k6에서는 갱신 요청만 대상으로 다음 값을 비교한다.

- `renewal_duration`: 평균, 중앙값, p90, p95, p99, 최대값
- `renewal_failed`: 201이 아닌 응답 비율
- `http_req_failed{endpoint:renewal}`와 `checks{endpoint:renewal}`
- `iteration_duration`, 완료 iteration 수, 초당 처리량

MySQL은 테스트 전후 `renewal-lock-metrics.sql` 결과의 차이를 본다. `performance_schema.data_locks`는 일반 애플리케이션 계정으로 조회할 수 없으므로 로컬 Docker의 root 계정을 사용한다. `run-renewal.sh`가 이 구분을 자동으로 처리한다.

- `Innodb_row_lock_waits`: 락을 기다린 횟수 증가량
- `Innodb_row_lock_time`: 총 락 대기 시간 증가량
- `Innodb_row_lock_time_avg`, `Innodb_row_lock_time_max`
- `Innodb_deadlocks`
- 실행 중 `performance_schema.data_locks`, `data_lock_waits`의 대기/차단 관계

사후 `renewal-verify.sql`에서 아래 두 값은 반드시 0이어야 한다.

- `invalid_active_game_rooms`
- `invalid_active_board_rooms`

`renewed_rooms`는 k6의 성공 요청 수와 같아야 한다. 인덱스 적용 전후에는 같은 fixture 수와 같은 VUS/ITERATIONS로 다시 실행해 p95/p99, 실패율, MySQL 락 대기 증가량을 비교한다.

## 주의

- 25 VU 이상은 애플리케이션 커넥션 풀 대기까지 포함할 수 있다. DB 락 자체의 변화는 5/10 VU 구간과 MySQL 지표를 우선 비교한다.
- 5,000개 fixture와 45,000개 빙고 셀을 만들므로 공유 dev나 prod에서는 실행하지 않는다. `run-renewal.sh`는 로컬 URL만 허용한다.
- 실행 중의 `data_lock_waits`를 보려면 부하 테스트가 진행되는 동안 별도 터미널에서 `renewal-lock-metrics.sql`을 반복 실행한다.
