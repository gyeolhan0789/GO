#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
MONITORING_SCRIPT="$PROJECT_ROOT/infra/deploy/check-canary-monitoring.sh"

log_line() {
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "2026-07-31T12:00:00+09:00" \
    "127.0.0.1" \
    "GET / HTTP/1.1" \
    "$2" \
    "$3" \
    "$1" \
    "$2" \
    "$3"
}

{
  log_line "127.0.0.1:8080" 200 0.100
  log_line "127.0.0.1:8082" 200 0.200
} | bash "$MONITORING_SCRIPT" "127.0.0.1:8082" 1 1.0 1.0 3.0

if log_line "127.0.0.1:8082" 500 0.200 \
  | bash "$MONITORING_SCRIPT" "127.0.0.1:8082" 1 1.0 1.0 3.0; then
  echo "Expected a Canary 5xx rate violation to fail." >&2
  exit 1
fi

if log_line "127.0.0.1:8082" 200 2.000 \
  | bash "$MONITORING_SCRIPT" "127.0.0.1:8082" 1 1.0 1.0 3.0; then
  echo "Expected a Canary average response-time violation to fail." >&2
  exit 1
fi

if log_line "127.0.0.1:8082" 200 4.000 \
  | bash "$MONITORING_SCRIPT" "127.0.0.1:8082" 1 1.0 5.0 3.0; then
  echo "Expected a Canary maximum response-time violation to fail." >&2
  exit 1
fi

if log_line "127.0.0.1:8080" 200 0.100 \
  | bash "$MONITORING_SCRIPT" "127.0.0.1:8082" 1 1.0 1.0 3.0; then
  echo "Expected missing Canary requests to fail." >&2
  exit 1
fi

echo "check-canary-monitoring tests passed."
