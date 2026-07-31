#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITE_TARGET="${NGINX_SITE_FILE:-/etc/nginx/sites-available/wecandoit.conf}"
UPSTREAM_TARGET="${NGINX_UPSTREAM_FILE:-/etc/nginx/snippets/wecandoit-backend-upstream.conf}"

case "$MODE" in
  stable-only)
    UPSTREAM_SOURCE="$SCRIPT_DIR/upstreams/stable-only.conf"
    ;;
  canary-10)
    UPSTREAM_SOURCE="$SCRIPT_DIR/upstreams/canary-10.conf"
    ;;
  canary-only)
    UPSTREAM_SOURCE="$SCRIPT_DIR/upstreams/canary-only.conf"
    ;;
  *)
    echo "Usage: $0 {stable-only|canary-10|canary-only}" >&2
    exit 2
    ;;
esac

BACKUP_DIR="$(mktemp -d)"
UPSTREAM_EXISTED=false

cleanup() {
  rm -rf "$BACKUP_DIR"
}
trap cleanup EXIT

if ! sudo test -f "$SITE_TARGET"; then
  echo "Nginx site configuration does not exist: $SITE_TARGET" >&2
  exit 1
fi

if ! sudo grep -Fq "include /etc/nginx/snippets/wecandoit-backend-upstream.conf;" "$SITE_TARGET" \
    || ! sudo grep -Fq "proxy_pass http://backend_prod;" "$SITE_TARGET"; then
  echo "$SITE_TARGET is not prepared for Canary routing." >&2
  echo "Merge infra/nginx/wecandoit.conf into the active site configuration first." >&2
  exit 1
fi

if sudo test -f "$UPSTREAM_TARGET"; then
  sudo cat "$UPSTREAM_TARGET" > "$BACKUP_DIR/upstream.conf"
  UPSTREAM_EXISTED=true
fi

restore_previous_config() {
  if [ "$UPSTREAM_EXISTED" = true ]; then
    sudo /usr/bin/install -m 0644 "$BACKUP_DIR/upstream.conf" "$UPSTREAM_TARGET"
  else
    sudo /usr/bin/rm -f "$UPSTREAM_TARGET"
  fi
}

sudo /usr/bin/mkdir -p "$(dirname "$UPSTREAM_TARGET")"
sudo /usr/bin/install -m 0644 "$UPSTREAM_SOURCE" "$UPSTREAM_TARGET"

if ! sudo /usr/sbin/nginx -t; then
  echo "Nginx configuration validation failed. Restoring the previous configuration." >&2
  restore_previous_config
  sudo /usr/sbin/nginx -t
  exit 1
fi

if ! sudo /usr/sbin/nginx -T 2>&1 \
    | grep -F "include /etc/nginx/snippets/wecandoit-backend-upstream.conf;" >/dev/null; then
  echo "$SITE_TARGET is not included by the active Nginx configuration." >&2
  restore_previous_config
  sudo /usr/sbin/nginx -t
  exit 1
fi

if ! sudo /usr/bin/systemctl reload nginx; then
  echo "Nginx reload failed. Restoring the previous configuration." >&2
  restore_previous_config
  sudo /usr/sbin/nginx -t
  sudo /usr/bin/systemctl reload nginx
  exit 1
fi

echo "Nginx backend routing mode applied: $MODE"
