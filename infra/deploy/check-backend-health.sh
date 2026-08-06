#!/usr/bin/env bash

set -euo pipefail

HEALTH_URL="${1:?Health check URL is required.}"
MAX_ATTEMPTS="${2:-30}"
INTERVAL_SECONDS="${3:-2}"
FALLBACK_HEALTH_URL="${4:-}"

top_level_status_is_up() {
  awk '
    {
      json = json $0 "\n"
    }
    END {
      depth = 0
      in_string = 0
      escaped = 0
      root_started = 0
      root_closed = 0

      for (i = 1; i <= length(json); i++) {
        character = substr(json, i, 1)

        if (in_string) {
          if (depth == 1) {
            top_level = top_level character
          }
          if (escaped) {
            escaped = 0
          } else if (character == "\\") {
            escaped = 1
          } else if (character == "\"") {
            in_string = 0
          }
          continue
        }

        if (depth == 0) {
          if (character ~ /[[:space:]]/) {
            continue
          }
          if (!root_started && character == "{") {
            root_started = 1
            depth = 1
            top_level = character
            continue
          }
          invalid = 1
          break
        }

        if (character == "\"") {
          in_string = 1
          if (depth == 1) {
            top_level = top_level character
          }
        } else if (character == "{" || character == "[") {
          depth++
          if (depth == 1) {
            top_level = top_level character
          }
        } else if (character == "}" || character == "]") {
          if (depth == 1) {
            top_level = top_level character
          }
          depth--
          if (depth == 0) {
            root_closed = 1
          }
        } else if (depth == 1) {
          top_level = top_level character
        }
      }

      compact = top_level
      gsub(/[[:space:]]/, "", compact)
      status_keys = compact
      status_count = gsub(/"status":/, "&", status_keys)

      exit !(!invalid && !in_string && root_closed && depth == 0 \
        && compact ~ /^\{.*\}$/ \
        && status_count == 1 \
        && compact ~ /(\{|,)"status":"UP"(,|\})/)
    }
  '
}

attempt=1
while [ "$attempt" -le "$MAX_ATTEMPTS" ]; do
  if [ -n "${HEALTH_CHECK_CONTAINER:-}" ]; then
    response="$(docker exec "$HEALTH_CHECK_CONTAINER" \
      curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" || true)"
  else
    response="$(curl --fail --silent --show-error --max-time 5 "$HEALTH_URL" || true)"
  fi

  if printf '%s' "$response" | top_level_status_is_up; then
    echo "Backend health check succeeded: $HEALTH_URL"
    exit 0
  fi

  if [ -n "$FALLBACK_HEALTH_URL" ]; then
    if [ -n "${HEALTH_CHECK_CONTAINER:-}" ]; then
      fallback_response="$(docker exec "$HEALTH_CHECK_CONTAINER" \
        curl --fail --silent --show-error --max-time 5 "$FALLBACK_HEALTH_URL" || true)"
    else
      fallback_response="$(curl --fail --silent --show-error --max-time 5 \
        "$FALLBACK_HEALTH_URL" || true)"
    fi

    if printf '%s' "$fallback_response" | top_level_status_is_up; then
      echo "Backend health check succeeded with legacy fallback: $FALLBACK_HEALTH_URL"
      exit 0
    fi
  fi

  echo "Backend health check attempt $attempt/$MAX_ATTEMPTS failed: $HEALTH_URL"
  attempt=$((attempt + 1))
  sleep "$INTERVAL_SECONDS"
done

echo "Backend health check failed: $HEALTH_URL" >&2
exit 1
