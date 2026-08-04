#!/bin/sh

set -eu

MODE="${1:-}"
TEMPLATE_DIR="${NGINX_ROUTE_TEMPLATE_DIR:-/etc/nginx/upstreams}"
TARGET="${NGINX_ROUTE_TARGET:-/etc/nginx/runtime/backend-upstream.conf}"
NGINX_BIN="${NGINX_BIN:-nginx}"

case "$MODE" in
  stable-only|canary-10|canary-only)
    SOURCE="$TEMPLATE_DIR/$MODE.conf"
    ;;
  *)
    echo "Usage: $0 {stable-only|canary-10|canary-only}" >&2
    exit 2
    ;;
esac

TARGET_DIR="$(dirname "$TARGET")"
BACKUP="$TARGET_DIR/.backend-upstream.backup.$$"
NEXT="$TARGET_DIR/.backend-upstream.next.$$"

cleanup() {
  rm -f "$BACKUP" "$NEXT"
}
trap cleanup EXIT

mkdir -p "$TARGET_DIR"

if [ ! -s "$TARGET" ]; then
  cp "$TEMPLATE_DIR/stable-only.conf" "$TARGET"
fi

cp "$TARGET" "$BACKUP"
cp "$SOURCE" "$NEXT"
mv "$NEXT" "$TARGET"

restore_previous_route() {
  cp "$BACKUP" "$NEXT"
  mv "$NEXT" "$TARGET"
}

if ! "$NGINX_BIN" -t; then
  echo "Nginx configuration validation failed. Restoring the previous route." >&2
  restore_previous_route
  "$NGINX_BIN" -t
  exit 1
fi

if ! "$NGINX_BIN" -s reload; then
  echo "Nginx reload failed. Restoring the previous route." >&2
  restore_previous_route
  "$NGINX_BIN" -t
  "$NGINX_BIN" -s reload
  exit 1
fi

echo "Nginx backend routing mode applied: $MODE"
