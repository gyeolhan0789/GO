#!/bin/sh

set -eu

ROUTING_DIR="${NGINX_ROUTE_TARGET_DIR:-/etc/nginx/runtime}"
ROUTING_FILE="$ROUTING_DIR/backend-upstream.conf"
STABLE_TEMPLATE="${NGINX_ROUTE_TEMPLATE_DIR:-/etc/nginx/upstreams}/stable-only.conf"

mkdir -p "$ROUTING_DIR"

if [ ! -s "$ROUTING_FILE" ]; then
  cp "$STABLE_TEMPLATE" "$ROUTING_FILE"
fi
