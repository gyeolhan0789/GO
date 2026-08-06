#!/usr/bin/env bash

set -euo pipefail

ROUTE_MODE="${1:?Backend route mode is required.}"
EXTERNAL_SMOKE_URL="${2:-}"
NGINX_CONTAINER="${NGINX_CONTAINER:-wecandoit-nginx-prod}"
NGINX_SMOKE_PORT="${NGINX_SMOKE_PORT:-8088}"
ROUTED_SMOKE_URL="${NGINX_ROUTED_SMOKE_URL:-http://127.0.0.1:$NGINX_SMOKE_PORT/v3/api-docs}"
MAX_ATTEMPTS="${ROUTE_SMOKE_MAX_ATTEMPTS:-10}"
INTERVAL_SECONDS="${ROUTE_SMOKE_INTERVAL_SECONDS:-2}"

check_service_smoke() {
  local smoke_url="$1"
  local check_container="${2:-}"
  local attempt=1
  local response

  while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
    if [ -n "$check_container" ]; then
      response="$(docker exec "$check_container" \
        curl --fail --silent --show-error --max-time 5 "$smoke_url" || true)"
    else
      response="$(curl --fail --silent --show-error --max-time 5 "$smoke_url" || true)"
    fi

    if printf '%s' "$response" | grep -Eq '"openapi"[[:space:]]*:'; then
      echo "Service smoke test succeeded: $smoke_url"
      return 0
    fi

    echo "Service smoke-test attempt $attempt/$MAX_ATTEMPTS failed: $smoke_url"
    attempt=$((attempt + 1))
    if [ "$attempt" -le "$MAX_ATTEMPTS" ]; then
      sleep "$INTERVAL_SECONDS"
    fi
  done

  echo "Service smoke test failed: $smoke_url" >&2
  return 1
}

docker exec "$NGINX_CONTAINER" \
  /usr/local/bin/switch-backend-route "$ROUTE_MODE"

check_service_smoke "$ROUTED_SMOKE_URL" "$NGINX_CONTAINER"

if [ -n "$EXTERNAL_SMOKE_URL" ]; then
  check_service_smoke "$EXTERNAL_SMOKE_URL"
fi

if [ "$ROUTE_MODE" = "canary-10" ]; then
  warmup_request=1
  while [ "$warmup_request" -le 50 ]; do
    check_service_smoke "$ROUTED_SMOKE_URL" "$NGINX_CONTAINER"
    warmup_request=$((warmup_request + 1))
  done
fi
