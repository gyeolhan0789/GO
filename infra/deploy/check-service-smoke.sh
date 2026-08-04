#!/usr/bin/env bash

set -euo pipefail

SMOKE_URL="${1:?Smoke-test URL is required.}"
MAX_ATTEMPTS="${2:-10}"
INTERVAL_SECONDS="${3:-2}"

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  if [ -n "${SMOKE_CHECK_CONTAINER:-}" ]; then
    response="$(docker exec "$SMOKE_CHECK_CONTAINER" \
      curl --fail --silent --show-error --max-time 5 "$SMOKE_URL" || true)"
  else
    response="$(curl --fail --silent --show-error --max-time 5 "$SMOKE_URL" || true)"
  fi

  if printf '%s' "$response" | grep -Eq '"openapi"[[:space:]]*:'; then
    echo "Service smoke test succeeded: $SMOKE_URL"
    exit 0
  fi

  echo "Service smoke-test attempt $attempt/$MAX_ATTEMPTS failed: $SMOKE_URL"
  attempt=$((attempt + 1))
  if [ "$attempt" -le "$MAX_ATTEMPTS" ]; then
    sleep "$INTERVAL_SECONDS"
  fi
done

echo "Service smoke test failed: $SMOKE_URL" >&2
exit 1
