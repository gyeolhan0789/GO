#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CHECK_SCRIPT="$PROJECT_ROOT/infra/deploy/check-flyway-history.sh"
TEST_DIR="$(mktemp -d)"
MOCK_BIN="$TEST_DIR/bin"
MOCK_RESPONSE_FILE="$TEST_DIR/response"
MIGRATION_DIR="$TEST_DIR/migration"

cleanup() { rm -rf "$TEST_DIR"; }
trap cleanup EXIT

mkdir -p "$MOCK_BIN" "$MIGRATION_DIR"

cat > "$MOCK_BIN/docker" <<'EOF'
#!/usr/bin/env bash
set -eu
if [ "$1" = "exec" ]; then
  content="$(cat "$MOCK_RESPONSE_FILE")"
  if [ "$content" = "__QUERY_FAILS__" ]; then
    echo "ERROR 1146 (42S02): Table 'wecandoit.flyway_schema_history' doesn't exist" >&2
    exit 1
  fi
  printf '%s' "$content"
  exit 0
fi
exit 1
EOF
chmod +x "$MOCK_BIN/docker"

set_response() { printf '%s' "$1" > "$MOCK_RESPONSE_FILE"; }

run_check() {
  PATH="$MOCK_BIN:$PATH" MOCK_RESPONSE_FILE="$MOCK_RESPONSE_FILE" DB_ROOT_PASSWORD="dummy" \
    bash "$CHECK_SCRIPT" wecandoit-mysql-prod wecandoit "$MIGRATION_DIR"
}

# no migration files at all -> must fail without hitting docker
set_response "$(printf '1\t1\tBASELINE\t1')"
if run_check; then
  echo "Expected an empty migration directory to fail the check." >&2
  exit 1
fi

# happy path: single baseline row, matches only V1 file present
: > "$MIGRATION_DIR/V1__baseline.sql"
set_response "$(printf '1\t1\tBASELINE\t1')"
run_check

# underscore version separator (V1_1__desc.sql) is normalized to 1.1
: > "$MIGRATION_DIR/V1_1__add_index.sql"
set_response "$(printf '1\t1\tBASELINE\t1\n2\t1.1\tSQL\t1')"
run_check
rm -f "$MIGRATION_DIR/V1_1__add_index.sql"

# failed migration row -> must fail
set_response "$(printf '1\t1\tBASELINE\t1\n2\t2\tSQL\t0')"
if run_check; then echo "Expected a success=0 row to fail the check." >&2; exit 1; fi

# empty result -> must fail
set_response ""
if run_check; then echo "Expected an empty flyway_schema_history to fail the check." >&2; exit 1; fi

# query error (table missing) -> must fail
set_response "__QUERY_FAILS__"
if run_check; then echo "Expected a failed query to fail the check." >&2; exit 1; fi

# version mismatch: history says V1 but repo now ships V2 -> must fail
: > "$MIGRATION_DIR/V2__add_column.sql"
set_response "$(printf '1\t1\tBASELINE\t1')"
if run_check; then echo "Expected a version mismatch (history=1, shipped=2) to fail the check." >&2; exit 1; fi

# matching latest version -> passes
set_response "$(printf '1\t1\tBASELINE\t1\n2\t2\tSQL\t1')"
run_check

echo "check-flyway-history tests passed."
