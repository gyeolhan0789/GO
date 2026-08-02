#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_CONF="$SCRIPT_DIR/../wecandoit.conf"

dev_location_line="$(grep -nF 'location ^~ /ai/dev/ {' "$NGINX_CONF" | cut -d: -f1)"
prod_location_line="$(grep -nF 'location ^~ /ai/ {' "$NGINX_CONF" | cut -d: -f1)"

test -n "$dev_location_line"
test -n "$prod_location_line"
test "$dev_location_line" -lt "$prod_location_line"
grep -A8 -F 'location ^~ /ai/dev/ {' "$NGINX_CONF" | grep -Fq 'proxy_pass http://127.0.0.1:8000/;'
grep -A8 -F 'location ^~ /ai/ {' "$NGINX_CONF" | grep -Fq 'proxy_pass http://127.0.0.1:8001/;'
grep -Fq 'location = /ai/dev {' "$NGINX_CONF"
grep -Fq 'return 301 /ai/dev/;' "$NGINX_CONF"
grep -Fq 'location = /ai {' "$NGINX_CONF"
grep -Fq 'return 301 /ai/;' "$NGINX_CONF"

echo "AI Nginx routing config test passed."
