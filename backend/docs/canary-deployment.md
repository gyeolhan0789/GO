# 백엔드 카나리 배포 운영 가이드

## 배포 구성

| 역할 | 컨테이너 | 호스트 포트 | 스케줄러 | Hibernate DDL | Flyway |
|---|---|---:|---|---|---|
| Stable | `wecandoit-backend-stable` | 8080 | 활성화 | `none` | 비활성화 |
| Canary | `wecandoit-backend-canary` | 8082 | 비활성화 | `validate` | 활성화 |

두 컨테이너는 운영 MySQL, Redis, `./uploads` 디렉터리를 함께 사용한다.
예약 알림의 중복 실행을 방지하기 위해 `BingoBoardRenewalScheduler`는 Stable에서만
실행한다. 요청에 의해 발생하는 알림 이벤트는 해당 요청을 처리한 컨테이너에서
계속 실행된다.

## 최초 배포 전 점검

Nginx는 `wecandoit-nginx-prod` 컨테이너로 실행하며 Stable, Canary와 외부
`wecandoit-edge` Docker 네트워크를 공유한다. 운영 Compose 프로젝트를 시작하기
전에 네트워크를 한 번 생성한다.

```bash
docker network inspect wecandoit-edge >/dev/null 2>&1 \
  || docker network create wecandoit-edge
```

Jenkins는 다음 두 가지 배포 모드를 제공한다.

| 모드 | Nginx 바인딩 | 수행 범위 |
|---|---|---|
| `validation` | `127.0.0.1:18080`, `127.0.0.1:18443` | Stable-only Nginx와 Canary 직접 검증까지만 수행하며 운영 트래픽은 분배하지 않음 |
| `production` | `0.0.0.0:80`, `0.0.0.0:443` | 90:10 전환, Canary-only 전환, Stable 승격 수행 |

항상 `validation`을 먼저 실행한다. `production`을 선택하기 전에는 Host Nginx를
수동으로 중지하고 80/443 포트가 비어 있는지 확인한다. Jenkins는 Host Nginx나
systemd를 제어하지 않는다. Docker Nginx가 80/443을 사용하기 시작한 이후의 배포는
`production` 모드를 사용해야 한다. 실행 중인 운영 Nginx를 임시 포트로 되돌리지
않도록 validation 모드에서는 이를 차단한다.

validation 배포에서는 Host Nginx와 충돌하지 않도록 Docker Nginx를 loopback 전용
임시 포트에 바인딩한다.

```text
127.0.0.1:18080 -> 컨테이너 포트 80
127.0.0.1:18443 -> 컨테이너 포트 443
```

Host의 80/443 포트를 변경하지 않고 컨테이너를 빌드하고 검증하는 명령은 다음과 같다.

```bash
cd backend
docker build -t wecandoit-nginx-prod:latest ../infra/nginx
bash ../infra/deploy/validate-nginx-image.sh wecandoit-nginx-prod:latest
NGINX_BIND_ADDRESS=127.0.0.1 \
NGINX_HTTP_PORT=18080 \
NGINX_HTTPS_PORT=18443 \
  docker compose -f docker-compose.prod.yml up -d --no-deps nginx
docker exec wecandoit-nginx-prod \
  /usr/local/bin/switch-backend-route stable-only
```

Nginx 컨테이너는 다음 Host 경로의 기존 인증서와 Admin UI 파일을 읽는다.

```text
/etc/letsencrypt
/var/www/wecandoit-admin
/var/www/certbot
```

`i15a506.p.ssafy.io`와 `admin.i15a506.p.ssafy.io` 인증서 파일이 모두 존재해야 한다.
후보 이미지 검증 과정에서 두 server block을 모두 읽으며, TLS 설정이 하나라도
잘못되면 실행 중인 Nginx를 교체하기 전에 실패 처리한다.

백엔드 WebSocket 엔드포인트 `/ws`는 HTTP/1.1 Upgrade 헤더를 사용해 프록시한다.
multipart 경계값 때문에 정상적인 5MB 파일이 Nginx에서 먼저 거부되지 않도록 Nginx의
요청 본문 제한은 6MB로 설정한다. 최종 파일 및 요청 제한은 Spring의 5MB 설정을
기준으로 한다.

Jenkins, 개발 백엔드, AI, Grafana 컨테이너도 각 경로를 검증하기 전에
`wecandoit-edge`에 연결되어 있어야 한다. Nginx를 컨테이너로 전환해도 아래의 DB
마이그레이션 선행 조건은 달라지지 않는다.

## 이미지 보존

파이프라인은 현재 Stable 또는 기존 운영 컨테이너가 다음 조건을 모두 만족할 때만
해당 이미지를 보존한다.

- 컨테이너가 실행 중이다.
- 컨테이너 포트 8080이 `127.0.0.1:8080`에 매핑되어 있다.
- Stable Health Check를 통과한다.

새 이미지를 빌드하기 전에 실행 중인 컨테이너의 이미지 ID를 확인하고 다음 태그로
보존한다.

```text
wecandoit-backend-prod:<이미지 revision>
wecandoit-backend-prod:stable
```

OCI revision label이 없는 기존 이미지는 다음 형식으로 보존한다.

```text
wecandoit-backend-prod:<CURRENT_STABLE_REVISION>
```

기존 Dockerfile은 Git SHA를 기록하지 않았다. 최초 카나리 배포에서는 이전에 성공한
운영 Jenkins 빌드의 커밋을 찾아 `CURRENT_STABLE_REVISION` 파라미터에 입력해야 한다.
값이 없거나 7~40자의 16진수 Git SHA가 아니면 파이프라인은 배포된 revision을
추측하지 않고 최초 배포를 중단한다.

새 이미지는 `org.opencontainers.image.revision` label에 Git 커밋 SHA를 기록하고
짧은 SHA를 이미지 태그로 사용한다.

Docker Nginx를 교체하기 전에 Jenkins는 실행 중인 이미지를
`wecandoit-nginx-prod:rollback`으로 보존한다. 후보 이미지는
`wecandoit-nginx-prod:<Git SHA>`를 사용하며 임시 컨테이너에서 세 가지 라우팅 모드,
운영 인증서, Admin 인증서를 검증한다. 검증을 통과한 후보만 실행 중인 Nginx를
교체할 수 있다. 새 컨테이너가 Stable 라우팅을 복구하지 못하면 보존된 rollback
이미지로 Nginx를 재생성한다.

TODO(후속 이슈): 현재 실행 이미지와 rollback 이미지의 보호 태그 및 보존 기간을
먼저 정의한 후 오래된 이미지 정리를 구현한다. 현재 파이프라인은 Docker 이미지를
prune하지 않는다.

## 배포 흐름

### Validation 모드

1. 외부 통신이 가능한 local bridge `wecandoit-edge` 네트워크와 임시 포트를 검증한다.
2. 현재 백엔드와 Docker Nginx 이미지를 보존한다.
3. 백엔드와 Nginx 이미지를 빌드한다.
4. 임시 컨테이너에서 모든 라우팅, TLS, WebSocket, 업로드 설정을 포함한 Nginx 후보
   이미지를 선검증한다.
5. Stable을 `127.0.0.1:8080`에서 시작하거나 기존 컨테이너를 이전한다.
6. Nginx를 `127.0.0.1:18080/18443`에서 시작하고 `stable-only`를 적용한다.
7. Canary를 `127.0.0.1:8082`에서 시작하고 컨테이너 포트 9091의 Actuator를 검증한다.
8. `stable-only`로 복귀하고 Canary를 제거한다. 90:10 라우팅은 수행하지 않는다.

### Production 모드

1. validation 성공, Host Nginx 중지, 80/443 포트 미사용 상태를 확인한다.
2. 네트워크, 이미지 보존, 빌드, 후보 이미지 검증을 다시 수행한다.
3. Stable을 시작한 다음 Docker Nginx를 80/443에서 `stable-only`로 시작한다.
4. Canary를 시작하고 컨테이너 포트 9091의 Actuator를 검증한다.
5. `canary-10`을 적용하고 서비스 Smoke API와 로그를 확인한다.
6. 수동 승인 후 `canary-only`를 적용한다.
7. Stable 승격을 승인하고 Stable을 재생성한 뒤 Actuator와 Smoke API를 검증한다.
8. `stable-only`로 복귀하고 Canary를 제거한다.

기존 `wecandoit-backend-prod` 컨테이너를 `wecandoit-backend-stable`로 처음 이전할 때는
두 컨테이너가 모두 Host 포트 8080을 사용하므로 기존 컨테이너를 중지해야 한다.
보존한 이미지를 그대로 사용하지만 최초 이름 변경 과정에서 짧은 중단이 발생할 수 있다.

## Health Check

```bash
docker exec wecandoit-backend-stable \
  curl --fail http://127.0.0.1:9091/actuator/health
docker exec wecandoit-backend-canary \
  curl --fail http://127.0.0.1:9091/actuator/health
docker exec wecandoit-nginx-prod \
  curl --fail http://127.0.0.1:8088/v3/api-docs
curl --fail https://i15a506.p.ssafy.io/v3/api-docs
```

정상 Actuator 응답은 다음과 같다.

```json
{
  "status": "UP"
}
```

Health Check 스크립트는 HTTP 요청이 성공하고 최상위 `status` 필드가 정확히 하나이며
값이 `UP`일 때만 성공한다. 내부 컴포넌트가 `UP`이더라도 최상위 상태가 `DOWN`이면
실패한다. 파서는 POSIX `awk`를 사용하고 Jenkins Preflight에서 명령어 존재 여부를
확인하므로 Jenkins 및 백엔드 컨테이너에 `jq`를 추가할 필요가 없다.

트래픽 경로 Smoke Test는 Health Check와 분리되어 있다. 활성 Nginx upstream을 통해
OpenAPI 문서를 요청하고 응답에 `openapi` 필드가 있는지 확인한다.

Jenkins는 `infra/deploy/apply-backend-route.sh`를 통해 라우팅 전환과 내부·외부 Smoke
Test를 수행한다. 컨테이너명, Docker 네트워크, 내부 포트, 운영 도메인은 Jenkins
environment block에서 공통으로 관리한다. Rollback 판단 흐름이 명확하게 드러나도록
Stable 및 Canary의 Health Check는 각 lifecycle 단계에 명시적으로 남겨 둔다.

## Canary 로그 및 승인 기준

Nginx는 tab으로 구분된 백엔드 access log를 컨테이너 stdout에 출력한다. 관측 구간의
로그는 다음 명령어로 확인한다.

```bash
docker logs --since "$CANARY_MONITOR_STARTED_AT" wecandoit-nginx-prod
```

각 로그에는 다음 정보가 순서대로 기록된다.

- 요청 시간
- 클라이언트 주소
- 요청 정보
- 최종 HTTP 상태 코드
- 전체 요청 시간
- upstream 주소
- upstream 상태 코드
- upstream 응답 시간

Jenkins는 `wecandoit-edge`에서 Canary 주소를 확인하고 `<Canary IP>:8080` 값을 기준으로
Canary 요청을 구분한다.

90:10 라우팅 적용 후 Jenkins는 새 로그를 60초 동안 관측한다. 다음 초기 기준 중
하나라도 만족하지 못하면 수동 승인 단계로 진행하지 않는다.

- Canary에 최소 1개 이상의 요청이 도달해야 한다.
- Canary 5xx 비율은 1% 이하여야 한다.
- Canary 평균 upstream 응답 시간은 1초 이하여야 한다.
- Canary 최대 upstream 응답 시간은 3초 이하여야 한다.
- 90:10 전환 이후 Canary 컨테이너 로그에 `ERROR` 또는 `Exception`이 없어야 한다.

Canary 100% 전환을 승인하기 전에 Jenkins 모니터링 요약과 해당 구간의 Nginx 및
컨테이너 로그를 확인한다. 운영 트래픽이 적어 관측 구간에 Canary 요청이 발생하지
않았다면 샘플 없이 승인하지 말고 통제된 Health 또는 Smoke 요청을 보낸 뒤 단계를
다시 실행한다. 위 기준은 초기 안전장치이며 후속 이슈에서 운영 기준값을 바탕으로
조정해야 한다.

## Rollback

파이프라인은 배포 단계와 현재 실행 중인 이미지에 따라 다음과 같이 Rollback한다.

1. 실행 중인 Stable이 이미 정상 rollback 이미지를 사용하고 있다면 컨테이너를
   재생성하지 않고 Nginx만 `stable-only`로 복구한다.
2. Canary 기동, Health Check, 모니터링 실패 시 정상 Stable 컨테이너는 재시작하지
   않는다.
3. Stable 승격이 완료됐고 승격된 Stable이 정상이면 해당 컨테이너를 유지하고 Nginx를
   `stable-only`로 복구한다.
4. 정상적으로 사용할 수 있는 Stable이 없을 때만 보존한 rollback 이미지로 Stable을
   재생성하고 이미지 ID, 포트, Health 상태를 검증한다.
5. 정상 Stable을 확인한 후 Nginx 설정을 검증하고 reload한 다음 Canary를 중지한다.
   Nginx 변경이 실패하여 이전 설정으로 원복한 경우 Canary는 실행 상태로 남긴다.
6. 현재 Docker Nginx가 Stable 라우팅을 적용하지 못하면
   `wecandoit-nginx-prod:rollback` 이미지로 Nginx를 재생성한 후 라우팅과 Smoke
   Test를 다시 실행한다.

수동 라우팅 Rollback 명령은 다음과 같다.

```bash
docker exec wecandoit-nginx-prod \
  /usr/local/bin/switch-backend-route stable-only
```

현재 Stable과 복원한 rollback 이미지가 모두 비정상이면 파이프라인은 Nginx 라우팅을
변경하거나 Canary를 제거하지 않는다. 정상 Canary-only 경로를 비정상 Stable로
교체하는 상황을 방지하기 위한 동작이다.

## DB 호환성

Flyway가 운영 스키마를 소유한다. `backend-canary`가 유일한 마이그레이션
실행자이며(`SPRING_FLYWAY_ENABLED` 기본값 `true`), `backend-stable`은 Flyway가
기본적으로 비활성화되어(`SPRING_FLYWAY_ENABLED` 기본값 `false`) 이미 적용된
스키마를 그대로 신뢰한다. 카나리 배포 중에는 다음 원칙을 적용한다.

- Canary는 대기 중인 Flyway 마이그레이션을 실행한 뒤, 트래픽 전환 전에 그 결과를
  Hibernate `validate`로 검증한다.
- Stable은 `ddl-auto=none`이고 Flyway도 비활성화돼 있어 스키마를 전혀 건드리지
  않는다 — 그래서 몇 번의 마이그레이션이 적용됐든 상관없이 Stable을 이전 이미지로
  되돌려도 항상 안전하다.
- `validate`는 테이블/컬럼의 존재 여부와 타입만 확인하며, nullable·길이·인덱스·
  외래키는 확인하지 않는다. 두 버전이 동일한 스키마와 저장 데이터를 모두 처리할 수
  있어야 한다는 원칙은 그대로 유지된다.
- 컬럼 삭제, 이름 변경, 기본값 없는 필수 컬럼 추가는 이 파이프라인으로 배포하면
  안 된다.
- Canary 없이 Stable만 수동으로 재기동하는 상황(예: 장애 대응)에서 대기 중인
  마이그레이션이 있으면 아무도 이를 적용하지 않는다 — 이 경우 Canary를 먼저
  정상적으로 띄우거나, 불가피하면 `STABLE_FLYWAY_ENABLED=true`로 Stable을
  재기동한다.

스키마를 변경할 때는 `src/main/resources/db/migration`에 직접 작성한 Flyway
마이그레이션으로, 두 버전에서 모두 동작하는 하위 호환 expansion을 먼저 적용한다.
contract 또는 정리 변경은 새 버전의 Stable 승격이 끝난 후 별도 배포로 진행한다.

게임·빙고 V3를 적용하기 전에는 현재 Stable 및 rollback 이미지가 상태 Enum 변경과
호환되는지 확인하고 운영 DB를 백업한다. 적용 후에는 `flyway_schema_history`와 주요
데이터 정합성을 확인한다. 마이그레이션이 실패하면 90:10 전환을 중단하고
Stable-only를 유지한다. 상태 값 병합 이후의 복구에는 임의의 DOWN SQL을 사용하지
않고 검증된 백업을 사용한다.
