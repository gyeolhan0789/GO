#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
MYSQL_CONTAINER=${MYSQL_CONTAINER:-wecandoit-mysql}
MYSQL_USER=${MYSQL_USER:-wecandoit}
MYSQL_PASSWORD=${MYSQL_PASSWORD:-wecandoit1234}
MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD:-root1234}
MYSQL_DATABASE=${MYSQL_DATABASE:-wecandoit}
FIXTURE_COUNT=${FIXTURE_COUNT:-5000}
VUS=${VUS:-5}
ITERATIONS=${ITERATIONS:-100}
BASE_URL=${BASE_URL:-http://localhost:8080}

for value_name in FIXTURE_COUNT VUS ITERATIONS; do
  value=${!value_name}
  if [[ ! "${value}" =~ ^[1-9][0-9]*$ ]]; then
    echo "${value_name}는 1 이상의 정수여야 합니다: ${value}" >&2
    exit 1
  fi
done

if (( ITERATIONS > FIXTURE_COUNT )); then
  echo "ITERATIONS(${ITERATIONS})는 FIXTURE_COUNT(${FIXTURE_COUNT})보다 클 수 없습니다." >&2
  exit 1
fi

if (( VUS > ITERATIONS )); then
  echo "VUS(${VUS})는 ITERATIONS(${ITERATIONS})보다 클 수 없습니다." >&2
  exit 1
fi

if [[ ! "${BASE_URL}" =~ ^https?://(localhost|127\.0\.0\.1)(:|/|$) ]]; then
  echo "갱신 부하 테스트 fixture는 로컬 DB 전용입니다. BASE_URL=${BASE_URL}" >&2
  exit 1
fi

echo "[1/4] ${FIXTURE_COUNT}개 갱신 fixture 재구성"
docker exec -i "${MYSQL_CONTAINER}" \
  mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" \
  --init-command="SET @renewal_fixture_count=${FIXTURE_COUNT}" \
  < "${SCRIPT_DIR}/renewal-prepare.sql"

echo "[2/4] 테스트 전 MySQL 락 지표"
docker exec -i "${MYSQL_CONTAINER}" \
  mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" \
  < "${SCRIPT_DIR}/renewal-lock-metrics.sql"

echo "[3/4] 갱신 API 실행: VUS=${VUS}, ITERATIONS=${ITERATIONS}"
set +e
k6 run \
  --env "BASE_URL=${BASE_URL}" \
  --env "VUS=${VUS}" \
  --env "ITERATIONS=${ITERATIONS}" \
  "${SCRIPT_DIR}/scripts/endpoints/bingo-renewal.js"
K6_STATUS=$?
set -e

echo "[4/4] 테스트 후 MySQL 락 지표 및 정합성"
docker exec -i "${MYSQL_CONTAINER}" \
  mysql -uroot -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" \
  < "${SCRIPT_DIR}/renewal-lock-metrics.sql"
docker exec -i "${MYSQL_CONTAINER}" \
  mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}" \
  < "${SCRIPT_DIR}/renewal-verify.sql"

exit "${K6_STATUS}"
