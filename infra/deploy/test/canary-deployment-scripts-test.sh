#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEST_DIR="$(mktemp -d)"
MOCK_BIN="$TEST_DIR/bin"
DOCKER_LOG="$TEST_DIR/docker.log"

cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

mkdir -p "$MOCK_BIN"

cat > "$MOCK_BIN/docker" <<'EOF'
#!/usr/bin/env bash
set -eu
printf '%s\n' "$*" >> "$DOCKER_LOG"

if [ "${FAIL_COMPOSE_UP:-false}" = "true" ] \
  && [ "$1" = "compose" ] && [ "${2:-}" = "-f" ]; then
  exit 42
elif [ "$1" = "inspect" ] && [ "${3:-}" = "{{.Image}}" ]; then
  printf 'sha256:nginx-candidate\n'
elif [ "$1" = "inspect" ] \
  && [ "${3:-}" = "{{range .Mounts}}{{println .Source .Destination .RW}}{{end}}" ]; then
  printf '/etc/letsencrypt /etc/letsencrypt false\n'
elif [ "$1" = "image" ] && [ "${2:-}" = "inspect" ]; then
  printf 'sha256:nginx-candidate\n'
elif [ "$1" = "port" ]; then
  case "$3" in
    80/tcp) printf '127.0.0.1:18080\n' ;;
    443/tcp) printf '127.0.0.1:18443\n' ;;
  esac
elif [ "$1" = "exec" ] && [ "${3:-}" = "nginx" ] && [ "${4:-}" = "-T" ]; then
  cat <<'NGINX'
server_name i15a506.p.ssafy.io;
ssl_certificate /etc/letsencrypt/live/i15a506.p.ssafy.io/fullchain.pem;
location = /admin-ui/ {
client_max_body_size 6m;
location /ws {
proxy_http_version 1.1;
proxy_read_timeout 3600s;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
}
location /dev/ {
proxy_http_version 1.1;
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
}
NGINX
elif [ "$1" = "exec" ] && [ "${3:-}" = "curl" ]; then
  printf '{"openapi":"3.0.1"}\n'
fi
EOF

cat > "$MOCK_BIN/curl" <<'EOF'
#!/usr/bin/env bash
set -eu
printf '{"openapi":"3.0.1"}\n'
EOF

chmod +x "$MOCK_BIN/docker" "$MOCK_BIN/curl"

JENKINSFILE="$PROJECT_ROOT/backend/Jenkinsfile.prod"
grep -Fq "'{{range .Containers}}{{println .Name}}{{end}}'" "$JENKINSFILE"
grep -Fq "'{{range .Containers}}{{println .Name .IPv4Address}}{{end}}'" "$JENKINSFILE"
grep -Fq 'docker network disconnect' "$JENKINSFILE"
grep -Fq 'for dependency in wecandoit-mysql-prod wecandoit-redis-prod; do' "$JENKINSFILE"
if grep -Fq 'up -d mysql redis' "$JENKINSFILE"; then
  echo "CD-prod must not recreate production database dependencies." >&2
  exit 1
fi
if grep -Fq 'index .NetworkSettings.Networks' "$JENKINSFILE"; then
  echo "Dynamic Docker network index syntax must not be used." >&2
  exit 1
fi
grep -Fq 'docker logs --tail 300 "$CANARY_CONTAINER" 2>&1 || true' "$JENKINSFILE"
grep -Fq 'docker inspect "$CANARY_CONTAINER" || true' "$JENKINSFILE"

start_nginx_stage="$(sed -n \
  "/stage('Start Nginx') {/,/stage('Complete Temporary Validation') {/p" \
  "$JENKINSFILE")"
start_nginx_script="$TEST_DIR/start-nginx.sh"
printf '%s\n' "$start_nginx_stage" \
  | awk 'BEGIN { quote = sprintf("%c", 39); marker = "sh " quote quote quote }
      index($0, marker) { capture = 1; next }
      capture && index($0, quote quote quote) { exit }
      capture { sub(/^[[:space:]]{24}/, ""); print }' \
  > "$start_nginx_script"

export GIT_SHA=test NGINX_CONTAINER=wecandoit-nginx-prod
export NGINX_CANDIDATE_IMAGE=wecandoit-nginx-prod:test
export NGINX_BIND_ADDRESS=127.0.0.1 NGINX_HTTP_PORT=18080
export NGINX_HTTPS_PORT=18443 COMPOSE_FILE=docker-compose.prod.yml
export NGINX_IMAGE_REPOSITORY=wecandoit-nginx-prod

: > "$DOCKER_LOG"
(cd "$PROJECT_ROOT/backend" && \
  PATH="$MOCK_BIN:$PATH" DOCKER_LOG="$DOCKER_LOG" \
    HOST_NGINX_CUTOVER_REQUIRED=false bash "$start_nginx_script")
grep -Fq 'compose -f docker-compose.prod.yml up -d --no-deps --force-recreate nginx' \
  "$DOCKER_LOG"
grep -Fq 'inspect --format {{range .Mounts}}{{println .Source .Destination .RW}}{{end}} wecandoit-nginx-prod' \
  "$DOCKER_LOG"

: > "$DOCKER_LOG"
start_failure_log="$TEST_DIR/start-failure.log"
if (cd "$PROJECT_ROOT/backend" && \
  PATH="$MOCK_BIN:$PATH" DOCKER_LOG="$DOCKER_LOG" FAIL_COMPOSE_UP=true \
    HOST_NGINX_CUTOVER_REQUIRED=true bash "$start_nginx_script" \
      2> "$start_failure_log"); then
  echo "Expected Start Nginx compose failure." >&2
  exit 1
fi
grep -Fq 'rm -f wecandoit-nginx-prod' "$DOCKER_LOG"
grep -Fq 'Run on EC2 immediately: sudo systemctl start nginx' \
  "$start_failure_log"

canary_logs_line="$(grep -nF 'docker logs --tail 300 "$CANARY_CONTAINER"' \
  "$JENKINSFILE" | cut -d: -f1)"
canary_inspect_line="$(grep -nF 'docker inspect "$CANARY_CONTAINER" || true' \
  "$JENKINSFILE" | cut -d: -f1)"
canary_stop_line="$(grep -nF 'docker compose -f "$COMPOSE_FILE" stop backend-canary' \
  "$JENKINSFILE" | tail -n 1 | cut -d: -f1)"
if [ "$canary_logs_line" -ge "$canary_inspect_line" ] \
  || [ "$canary_inspect_line" -ge "$canary_stop_line" ]; then
  echo "Canary diagnostics must run before failed Canary cleanup." >&2
  exit 1
fi

PATH="$MOCK_BIN:$PATH" DOCKER_LOG="$DOCKER_LOG" \
  bash "$PROJECT_ROOT/infra/deploy/validate-nginx-image.sh" \
    wecandoit-nginx-prod:test 18080 18443

grep -Fq -- '--publish 127.0.0.1:18080:80' "$DOCKER_LOG"
grep -Fq -- '--publish 127.0.0.1:18443:443' "$DOCKER_LOG"
grep -Fq -- '--volume /etc/letsencrypt:/etc/letsencrypt:ro' "$DOCKER_LOG"
grep -Fq '/usr/local/bin/switch-backend-route stable-only' "$DOCKER_LOG"
grep -Fq '/usr/local/bin/switch-backend-route canary-10' "$DOCKER_LOG"
grep -Fq '/usr/local/bin/switch-backend-route canary-only' "$DOCKER_LOG"

: > "$DOCKER_LOG"
PATH="$MOCK_BIN:$PATH" DOCKER_LOG="$DOCKER_LOG" \
  bash "$PROJECT_ROOT/infra/deploy/apply-backend-route.sh" \
    canary-10 https://i15a506.p.ssafy.io/v3/api-docs

smoke_count="$(grep -c 'exec wecandoit-nginx-prod curl' "$DOCKER_LOG")"
if [ "$smoke_count" -lt 51 ]; then
  echo "Expected at least 51 routed smoke requests, got $smoke_count." >&2
  exit 1
fi

printf '2026-08-05T00:00:00Z\t127.0.0.1\tGET /v3/api-docs HTTP/1.1\t200\t0.100\t172.20.0.3:8080\t200\t0.100\n' \
  | bash "$PROJECT_ROOT/infra/deploy/check-canary-monitoring.sh" \
      172.20.0.3:8080 1 1.0 1.0 3.0

if printf '' | bash "$PROJECT_ROOT/infra/deploy/check-canary-monitoring.sh" \
  172.20.0.3:8080 1 1.0 1.0 3.0; then
  echo "Expected Canary monitoring without request samples to fail." >&2
  exit 1
fi

echo "Canary deployment script tests passed."
