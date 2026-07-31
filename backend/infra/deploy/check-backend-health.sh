#!/usr/bin/env bash

set -euo pipefail

HEALTH_URL="${1:?Health check URL is required.}"
MAX_ATTEMPTS="${2:-30}"
INTERVAL_SECONDS="${3:-2}"

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  response="$(curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" || true)"

  if printf '%s' "$response" | grep -Eq '"status"[[:space:]]*:[[:space:]]*"UP"'; then
    echo "Backend health check succeeded: $HEALTH_URL"
    exit 0
  fi

  echo "Backend health check attempt $attempt/$MAX_ATTEMPTS failed: $HEALTH_URL"
  attempt=$((attempt + 1))
  sleep "$INTERVAL_SECONDS"
done

echo "Backend health check failed: $HEALTH_URL" >&2
exit 1
