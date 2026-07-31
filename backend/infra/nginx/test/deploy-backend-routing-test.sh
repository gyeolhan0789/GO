#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DEPLOY_SCRIPT="$PROJECT_ROOT/infra/nginx/deploy-backend-routing.sh"
TEST_DIR="$(mktemp -d)"
MOCK_BIN="$TEST_DIR/bin"
SITE_FILE="$TEST_DIR/site.conf"
UPSTREAM_FILE="$TEST_DIR/upstream.conf"
NGINX_COUNT_FILE="$TEST_DIR/nginx-count"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

mkdir -p "$MOCK_BIN"

cat > "$SITE_FILE" <<'EOF'
upstream backend_prod {
    include /etc/nginx/snippets/wecandoit-backend-upstream.conf;
}
server {
    location / {
        proxy_pass http://backend_prod;
    }
}
EOF

printf '%s\n' 'server 127.0.0.1:8080;' > "$UPSTREAM_FILE"
EXPECTED_UPSTREAM="$(cat "$UPSTREAM_FILE")"

cat > "$MOCK_BIN/sudo" <<'EOF'
#!/usr/bin/env bash
set -eu

command_path="$1"
shift

case "$command_path" in
  test|/usr/bin/test)
    test "$@"
    ;;
  grep|/usr/bin/grep)
    grep "$@"
    ;;
  cat|/usr/bin/cat)
    cat "$@"
    ;;
  /usr/bin/mkdir)
    mkdir "$@"
    ;;
  /usr/bin/install)
    source_file="${@: -2:1}"
    target_file="${@: -1}"
    cp "$source_file" "$target_file"
    ;;
  /usr/bin/rm)
    rm "$@"
    ;;
  /usr/sbin/nginx)
    if [ "${1:-}" = "-t" ]; then
      count=1
      if [ -f "$NGINX_COUNT_FILE" ]; then
        count=$(( $(cat "$NGINX_COUNT_FILE") + 1 ))
      fi
      printf '%s\n' "$count" > "$NGINX_COUNT_FILE"
      [ "$count" -ne 1 ]
    elif [ "${1:-}" = "-T" ]; then
      cat "$NGINX_SITE_FILE"
    fi
    ;;
  /usr/bin/systemctl)
    exit 0
    ;;
  *)
    echo "Unexpected sudo command: $command_path $*" >&2
    exit 1
    ;;
esac
EOF
chmod +x "$MOCK_BIN/sudo"

if PATH="$MOCK_BIN:$PATH" \
  NGINX_SITE_FILE="$SITE_FILE" \
  NGINX_UPSTREAM_FILE="$UPSTREAM_FILE" \
  NGINX_COUNT_FILE="$NGINX_COUNT_FILE" \
    bash "$DEPLOY_SCRIPT" canary-10; then
  echo "Expected the simulated Nginx validation failure to fail deployment." >&2
  exit 1
fi

test "$(cat "$UPSTREAM_FILE")" = "$EXPECTED_UPSTREAM"
test "$(cat "$NGINX_COUNT_FILE")" -eq 2

echo "deploy-backend-routing rollback test passed."
