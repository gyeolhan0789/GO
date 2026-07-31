#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
HEALTH_SCRIPT="$PROJECT_ROOT/infra/deploy/check-backend-health.sh"
TEST_DIR="$(mktemp -d)"
MOCK_BIN="$TEST_DIR/bin"
MOCK_RESPONSES_FILE="$TEST_DIR/responses"
MOCK_COUNT_FILE="$TEST_DIR/count"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

mkdir -p "$MOCK_BIN"

cat > "$MOCK_BIN/curl" <<'EOF'
#!/usr/bin/env bash
set -eu

attempt=1
if [ -f "$MOCK_COUNT_FILE" ]; then
  attempt=$(( $(cat "$MOCK_COUNT_FILE") + 1 ))
fi
printf '%s\n' "$attempt" > "$MOCK_COUNT_FILE"

response="$(sed -n "${attempt}p" "$MOCK_RESPONSES_FILE")"
if [ "$response" = "HTTP_ERROR" ]; then
  exit 22
fi

printf '%s' "$response"
EOF
chmod +x "$MOCK_BIN/curl"

set_responses() {
  rm -f "$MOCK_COUNT_FILE"
  printf '%s\n' "$@" > "$MOCK_RESPONSES_FILE"
}

run_health_check() {
  PATH="$MOCK_BIN:$PATH" \
  MOCK_RESPONSES_FILE="$MOCK_RESPONSES_FILE" \
  MOCK_COUNT_FILE="$MOCK_COUNT_FILE" \
    bash "$HEALTH_SCRIPT" "http://localhost/actuator/health" "$1" 0
}

set_responses '{"status":"UP"}'
run_health_check 1

set_responses 'HTTP_ERROR'
if run_health_check 1; then
  echo "Expected an HTTP error to fail the health check." >&2
  exit 1
fi

set_responses '{"status":"DOWN"}'
if run_health_check 1; then
  echo "Expected a non-UP status to fail the health check." >&2
  exit 1
fi

set_responses '{"status":"DOWN"}' 'HTTP_ERROR' '{"status":"UP"}'
run_health_check 3
test "$(cat "$MOCK_COUNT_FILE")" -eq 3

set_responses '{"status":"DOWN"}' '{"status":"DOWN"}' '{"status":"DOWN"}'
if run_health_check 3; then
  echo "Expected all retry attempts to fail the health check." >&2
  exit 1
fi
test "$(cat "$MOCK_COUNT_FILE")" -eq 3

echo "check-backend-health tests passed."
