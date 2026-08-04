#!/usr/bin/env bash
# 인자 없이 실행하는 인터랙티브 k6 테스트 러너.
# 대상 환경(local/dev)과 범위(시나리오/단일 API 전부)를 대화형으로 묻고,
# 실패가 나와도 끝까지 진행한 뒤 마지막에 결과를 요약하고 cleanup.sql을 실행한다.
set -o pipefail
cd "$(dirname "$0")"

ENDPOINT_SCRIPTS=(
  member-me member-search member-character member-items member-patch member-password member-fcm-token
  friend-list friend-delete friend-request-create friend-request-received friend-request-sent
  friend-request-delete friend-request-accept friend-request-reject
  game-request-create game-request-received game-request-sent game-request-accept game-request-reject game-request-cancel
  cash cash-histories shop-items
  notifications notification-read
  ranking ranking-friends
  history-get history-post
)

RESULTS=()

run_k6() {
  local path="$1"
  shift
  echo ""
  echo "=== $path ==="
  if k6 run "$@" "$path"; then
    RESULTS+=("PASS  $path")
  else
    RESULTS+=("FAIL  $path")
  fi
}

cleanup() {
  echo ""
  echo "### 정리(cleanup.sql) 실행 ###"
  if [[ "$TARGET_ENV" == "local" ]]; then
    docker exec -i wecandoit-mysql mysql -u wecandoit -pwecandoit1234 wecandoit < cleanup.sql
  else
    read -rp "dev SSH pem 키 경로: " PEM_PATH
    ssh -i "$PEM_PATH" ubuntu@i15a506.p.ssafy.io '
      PW=$(docker exec wecandoit-mysql-dev printenv MYSQL_PASSWORD)
      docker exec -i wecandoit-mysql-dev mysql -u wecandoit -p"$PW" wecandoit
    ' < cleanup.sql
  fi
}

echo "k6 통합 테스트 러너"
echo "===================="

echo ""
echo "대상 환경을 선택하세요:"
select TARGET_ENV in local dev; do
  [[ -n "${TARGET_ENV:-}" ]] && break
done

echo ""
echo "실행 범위를 선택하세요:"
select SCOPE in "시나리오 테스트" "단일 API 전부 테스트" "둘 다"; do
  [[ -n "${SCOPE:-}" ]] && break
done

read -rp "VUS (기본 5): " VUS
VUS="${VUS:-5}"
read -rp "DURATION (기본 10s, 시나리오 스크립트에는 적용 안 됨): " DURATION
DURATION="${DURATION:-10s}"

ENV_ARGS=()
if [[ "$TARGET_ENV" == "dev" ]]; then
  ENV_ARGS+=(--env "BASE_URL=https://i15a506.p.ssafy.io/dev" --env "CONFIRM_DEV=yes")
fi

if [[ "$SCOPE" == "시나리오 테스트" || "$SCOPE" == "둘 다" ]]; then
  # load-test.js는 VUS/DURATION을 지원하지만 stress-test.js/spike-test.js는
  # 하드코딩된 stage를 쓰기 때문에 두 값을 읽지 않는다.
  run_k6 "scripts/load-test.js" "${ENV_ARGS[@]}" --env "VUS=$VUS" --env "DURATION=$DURATION"
  run_k6 "scripts/stress-test.js" "${ENV_ARGS[@]}"
  run_k6 "scripts/spike-test.js" "${ENV_ARGS[@]}"
fi

if [[ "$SCOPE" == "단일 API 전부 테스트" || "$SCOPE" == "둘 다" ]]; then
  for name in "${ENDPOINT_SCRIPTS[@]}"; do
    run_k6 "scripts/endpoints/$name.js" "${ENV_ARGS[@]}" --env "VUS=$VUS" --env "DURATION=$DURATION"
  done
fi

echo ""
echo "### 결과 요약 ###"
for line in "${RESULTS[@]}"; do
  echo "$line"
done

if [[ "$TARGET_ENV" == "dev" ]]; then
  echo ""
  echo "🔍 DB 풀 확인: https://i15a506.p.ssafy.io/grafana-dev/d/backend-jvm-overview"
fi

cleanup
