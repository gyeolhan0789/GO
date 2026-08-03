# k6 부하 테스트

로컬/dev 백엔드를 대상으로 하는 k6 부하 테스트 스크립트입니다. 인증 → 방 생성/조회/수정/삭제 → 빙고판 조회 흐름을 검증합니다.

## 전체 실행 (인터랙티브 러너)

인자 없이 실행하면 대화형으로 대상 환경(local/dev)과 범위(시나리오/단일 API 전부)를 물어보고, 끝나면 결과를 요약한 뒤 해당 환경의 `cleanup.sql`까지 자동으로 실행합니다.

**사전 준비**: k6 설치(아래 "설치" 참고)와, local을 고를 거라면 백엔드 기동(아래 "실행 준비" 참고)이 먼저 되어 있어야 합니다. `run.sh`는 백엔드를 띄워주지 않습니다.

```bash
cd load-test
./run.sh
```

- 시나리오를 선택하면 `load-test.js` → `stress-test.js` → `spike-test.js` 3개를 환경과 무관하게 그대로 순차 실행합니다. `stress-test.js`/`spike-test.js`는 항상 100 VU까지 램프업하는 하드코딩된 스크립트라 dev를 고르면 팀 공유 dev에 그 부하가 그대로 갑니다(러너가 별도로 막거나 경고하지 않으니 직접 판단해서 실행하세요).
- 중간에 어떤 스크립트가 실패해도 멈추지 않고 끝까지 진행한 뒤 마지막에 PASS/FAIL 목록을 보여줍니다.
- dev + 정리 단계에서는 SSH pem 키 경로를 그때그때 물어봅니다(팀원마다 경로가 다르므로 스크립트에 하드코딩하지 않음).
- 개별 스크립트를 직접 돌리고 싶다면 아래 "테스트 종류"/"단일 API 테스트" 섹션의 `k6 run` 방식을 그대로 써도 됩니다. 이 경우 정리(cleanup)는 자동으로 되지 않으니 아래 "정리 (Cleanup)"을 직접 실행해야 합니다.

## 테스트 종류

실제 테스트 로직(`scripts/lib/scenario.js`)은 공통이고, 부하 패턴(`options`)만 스크립트마다 다릅니다.

| 스크립트 | 용도 | 부하 패턴 |
|---|---|---|
| `load-test.js` (기본) | 평상시 기대 트래픽 검증 | `VUS`(기본 10)/`DURATION`(기본 30s) 환경변수로 조정 |
| `stress-test.js` | 어디서 한계가 오는지 점진적으로 확인 | 20→50→100 VU로 6분에 걸쳐 램프업 |
| `spike-test.js` | 순간적인 트래픽 급증 대응 확인 | 5 VU → 100 VU로 급격히 튐 |

smoke(스크립트/환경이 살아있는지 빠른 확인)와 soak(장시간)은 별도 스크립트 없이 `load-test.js`를 `--env VUS=1 --env DURATION=10s` 또는 `--env DURATION=30m`처럼 돌리면 됩니다.

## 단일 API 테스트

`scripts/endpoints/` 아래에 엔드포인트 하나씩 개별 실행 가능한 스크립트가 있습니다. 실행 방법은 기존 스크립트와 동일합니다(`k6 run scripts/endpoints/<파일명>.js`, `VUS`/`DURATION` 환경변수도 동일하게 적용).

친구/게임 요청처럼 상태가 1회성으로 소모되는 API는 반복마다 계정을 새로 만들어 필요한 상태(대기 중인 친구 요청 등)를 준비한 뒤 대상 API를 호출합니다(공용 로직: `scripts/endpoints/lib/setup.js`). 그래서 k6 결과의 `checks`에 `setup: ...`으로 표시되는 준비 단계가 같이 보일 수 있는데, 실제 측정 대상은 준비 단계가 아니라 마지막 체크(해당 API 이름이 그대로 적힌 것)입니다.

| 도메인 | 스크립트 | API |
|---|---|---|
| Member | `member-me.js` | GET /members/me |
| Member | `member-search.js` | GET /members/search |
| Member | `member-character.js` | GET /members/character |
| Member | `member-items.js` | GET /members/items |
| Member | `member-patch.js` | PATCH /members/me |
| Member | `member-password.js` | PATCH /members/password |
| Member | `member-fcm-token.js` | PATCH /members/me/fcm-token |
| Friend | `friend-list.js` | GET /friends |
| Friend | `friend-delete.js` | DELETE /friends/{friendId} |
| Friend | `friend-request-create.js` | POST /friend-requests |
| Friend | `friend-request-received.js` | GET /friend-requests |
| Friend | `friend-request-sent.js` | GET /friend-requests/sent |
| Friend | `friend-request-delete.js` | DELETE /friend-requests/{requestId} |
| Friend | `friend-request-accept.js` | PATCH /friend-requests/{requestId}/accept |
| Friend | `friend-request-reject.js` | PATCH /friend-requests/{requestId}/reject |
| GameRequest | `game-request-create.js` | POST /rooms/{roomId}/requests |
| GameRequest | `game-request-received.js` | GET /rooms/requests/received |
| GameRequest | `game-request-sent.js` | GET /rooms/requests/sent |
| GameRequest | `game-request-accept.js` | PATCH /rooms/{roomId}/requests/{requestId}/accept |
| GameRequest | `game-request-reject.js` | PATCH /rooms/{roomId}/requests/{requestId}/reject |
| GameRequest | `game-request-cancel.js` | PATCH /rooms/{roomId}/requests/{requestId}/cancel |
| Cash | `cash.js` | GET /members/cash |
| Cash | `cash-histories.js` | GET /members/cash-histories |
| Shop | `shop-items.js` | GET /shop/items |
| Notification | `notifications.js` | GET /notifications |
| Notification | `notification-read.js` | PATCH /notifications/{notificationId}/read |
| Ranking | `ranking.js` | GET /rankings |
| Ranking | `ranking-friends.js` | GET /rankings/friends |
| History | `history-get.js` | GET /histories |
| History | `history-post.js` | POST /histories |

### 제외된 API (현재 환경에서 테스트 불가능)

- **OAuth** (`/auth/oauth/**`) — 외부 IdP(Google/Kakao) 의존이라 k6에서 재현 불가.
- **빙고 셀 인증 제출** (`submit`) — AI 검증 서버가 배포돼 있지 않아 항상 503.
- **빙고 리뉴얼** (`renewal`) — 빙고 목표 달성(AI 검증 필요) 또는 실제 7일 경과 중 하나가 있어야 호출 가능해 k6로 재현 불가.
- **빙고 리매치** (`rematch`) — BATTLE 게임이 완료돼야 호출 가능한데, 유일한 완료 경로(비호스트가 방을 나가 몰수패 처리)가 동시에 인원을 2명 밑으로 떨어뜨려 리매치의 "인원 2명 필수" 조건과 충돌한다. 우회 경로 없음.
- **상점 구매** (`purchase`) / **아이템 장착** (`character-items`) — 새 계정 캐시는 0원이고, 캐시는 AI 검증을 거친 게임 완료 보상으로만 들어와서 테스트 계정이 캐시를 획득할 방법이 없음.
- **`/admin/**`** — ROLE_ADMIN 계정 프로비저닝과 이미지 업로드가 필요해 범위에서 제외.

## 실행 준비

```bash
cd backend
docker compose -f docker-compose.local.yml up -d mysql redis
./gradlew bootRun --args='--spring.profiles.active=local'
```

## 실행

### 설치

- macOS: `brew install k6`
- Windows: `choco install k6` 또는 `winget install k6`
- Linux: https://k6.io/docs/get-started/installation/

```bash
cd load-test
k6 run scripts/load-test.js   # stress-test.js / spike-test.js도 동일하게
```

### 공통 옵션 (환경변수로 조정 가능, 기본값은 소규모)

```bash
k6 run --env VUS=50 --env DURATION=1m scripts/load-test.js
```

- `BASE_URL` — 기본 `http://localhost:8080`. 로컬과 dev(아래 참조) 외 다른 URL은 스크립트가 거부합니다(prod 오발사 방지).
- `VUS` (기본 10), `DURATION` (기본 30s)

## dev 환경에서 실행

```bash
k6 run --env BASE_URL=https://i15a506.p.ssafy.io/dev --env CONFIRM_DEV=yes scripts/load-test.js
```

- **실행 위치**: 반드시 로컬(내 PC)에서 실행하세요. dev/prod가 같은 EC2 인스턴스에서 돌아가므로, 그 인스턴스 안에서 k6를 돌리면 부하 생성기 자체가 prod와 자원을 직접 경합하게 됩니다.
- `CONFIRM_DEV=yes`가 없으면 스크립트가 바로 종료됩니다 — dev DB는 팀이 공유하는 자원이라 실수 실행을 막기 위한 안전장치입니다.
- **실행 전 확인**: dev DB에 `missions`가 9개 이상 있는지 확인하세요 (`boardSize=3` 방 생성에 필요). 부족하면 방 생성이 전부 실패(409)합니다.
- **VUS를 낮게 유지하세요** (예: 5~10). dev는 팀이 같이 쓰는 환경이고, 방/게임 관련 로우가 소프트 삭제 없이 계속 쌓입니다(아래 "알려진 제한" 참조) — 로컬과 달리 재기동으로 초기화되지 않습니다.
- **`stress-test.js`/`spike-test.js`는 100 VU까지 램프업합니다.** dev 공유 DB에 그만큼 데이터가 쌓이고 다른 사용자 트래픽에도 영향을 줄 수 있으니, dev 대상 실행은 `load-test.js`(낮은 VUS)로 제한하고 stress/spike는 로컬에서만 돌리는 걸 권장합니다.
- 팀에 미리 알리고 실행하는 걸 권장합니다.

## 결과 확인

k6 콘솔 요약에서 `http_req_failed`(에러율 < 1%)와 `http_req_duration`(p95 < 500ms) 통과 여부를 확인하면 됩니다. 별도 리포트 파일이나 대시보드는 없습니다.

## 정리 (Cleanup)

테스트로 생성된 계정(`k6-*@k6.local`)과 거기서 파생된 방/게임/빙고/친구/알림/걸음기록 데이터를 `cleanup.sql`로 삭제합니다. 로컬 mysql 클라이언트 설치 없이, 각 MySQL이 떠 있는 컨테이너에 `docker exec`로 바로 실행합니다.

```bash
# 로컬 (docker-compose.local.yml의 wecandoit-mysql 컨테이너)
docker exec -i wecandoit-mysql mysql -u wecandoit -pwecandoit1234 wecandoit < cleanup.sql

# dev — 백엔드/MySQL이 같은 EC2 안에서만 붙어 있어(wecandoit-mysql-dev 컨테이너) SSH로 접속해서 실행
ssh -i <pem-key> ubuntu@i15a506.p.ssafy.io '
  PW=$(docker exec wecandoit-mysql-dev printenv MYSQL_PASSWORD)
  docker exec -i wecandoit-mysql-dev mysql -u wecandoit -p"$PW" wecandoit
' < cleanup.sql
```

dev 비밀번호는 컨테이너 env(`MYSQL_PASSWORD`)에서 원격 셸 안에서만 읽어 바로 사용하고, 로컬 터미널에는 출력하지 않습니다. 실행 시 삭제 대상 건수(`members`/`rooms`/`games`/`boards`)를 먼저 출력하니 확인 후 계속하면 됩니다.

## 알려진 제한

- 로컬 또는 dev만 지원합니다. prod는 스크립트가 자체적으로 거부합니다 (공유 인프라라 위험합니다).
- 빙고 셀 인증 제출(`submit`)은 AI 검증 서버가 배포되어 있지 않아 항상 실패(503)하므로 이 스크립트에는 포함하지 않았습니다.
- 계정은 VU당 최초 1회만 만들고 이후 iteration은 재사용합니다. 방은 매 반복마다 새로 만들고 지웁니다 — `room_members`는 앱이 삭제/나가기 시점에 실제로 지우지만, `rooms`는 상태만 `CLOSED`로 바뀔 뿐 로우가 남고 `games`/`game_participants`/`bingo_boards`/`bingo_cells`/`game_results`는 전혀 정리되지 않아 반복할수록 DB에 쌓입니다. 로컬 개발 DB는 재기동 시 초기화되지만, **dev DB는 그렇지 않으므로 테스트 후 위 `cleanup.sql`을 실행하세요.** `run.sh`로 실행했다면 이미 자동으로 처리됩니다.
