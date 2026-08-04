#!/usr/bin/env bash

set -euo pipefail

MYSQL_CONTAINER="${1:?MySQL container name is required.}"
DB_NAME="${2:?Database name is required.}"
MIGRATION_DIR="${3:?Migration directory is required.}"
DB_ROOT_PASSWORD="${DB_ROOT_PASSWORD:?DB_ROOT_PASSWORD is required.}"

expected_version="$( { ls "$MIGRATION_DIR"/V*.sql 2>/dev/null || true; } \
  | sed -nE 's#.*/V([0-9]+([._][0-9]+)*)__.*#\1#p' \
  | tr '_' '.' \
  | sort -V \
  | tail -n1)"

if [ -z "$expected_version" ]; then
  echo "No V*.sql migration files found in $MIGRATION_DIR" >&2
  exit 1
fi

if ! result="$(docker exec "$MYSQL_CONTAINER" mysql -uroot -p"$DB_ROOT_PASSWORD" -N -B \
  -e "SELECT installed_rank, version, type, success FROM ${DB_NAME}.flyway_schema_history ORDER BY installed_rank;" 2>&1)"; then
  echo "flyway_schema_history query failed on $MYSQL_CONTAINER/$DB_NAME (table missing or Flyway never ran):" >&2
  echo "$result" >&2
  exit 1
fi

if [ -z "$result" ]; then
  echo "flyway_schema_history is empty on $MYSQL_CONTAINER/$DB_NAME — Flyway did not record any migration." >&2
  exit 1
fi

echo "flyway_schema_history ($MYSQL_CONTAINER/$DB_NAME):"
echo "$result"

if printf '%s\n' "$result" | awk -F'\t' '$4 == "0" { found=1 } END { exit !found }'; then
  echo "Detected a failed migration (success=0) in flyway_schema_history on $MYSQL_CONTAINER/$DB_NAME." >&2
  exit 1
fi

latest_version="$(printf '%s\n' "$result" | tail -n1 | awk -F'\t' '{print $2}')"
if [ "$latest_version" != "$expected_version" ]; then
  echo "flyway_schema_history's latest applied version ($latest_version) does not match the highest migration file shipped ($expected_version) — Flyway may be disabled or the wrong image is running." >&2
  exit 1
fi

echo "flyway_schema_history check passed (latest version: $latest_version)."
