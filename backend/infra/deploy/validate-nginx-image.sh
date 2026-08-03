#!/usr/bin/env bash

set -euo pipefail

NGINX_IMAGE="${1:?Nginx image is required.}"
VALIDATION_CONTAINER="${NGINX_VALIDATION_CONTAINER:-wecandoit-nginx-validate-$$}"

cleanup() {
  docker rm -f "$VALIDATION_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker image inspect "$NGINX_IMAGE" >/dev/null
docker run --rm \
  --name "$VALIDATION_CONTAINER" \
  --add-host backend-stable:127.0.0.1 \
  --add-host backend-canary:127.0.0.1 \
  --volume /etc/letsencrypt:/etc/letsencrypt:ro \
  --entrypoint /bin/sh \
  "$NGINX_IMAGE" \
  -c '
    set -eu
    mkdir -p /etc/nginx/runtime
    for mode in stable-only canary-10 canary-only; do
      cp "/etc/nginx/upstreams/$mode.conf" \
        /etc/nginx/runtime/backend-upstream.conf
      nginx -t
    done
    nginx -T 2>&1 | grep -Fq "server_name admin.i15a506.p.ssafy.io;"
    nginx -T 2>&1 | grep -Fq "/etc/letsencrypt/live/admin.i15a506.p.ssafy.io/fullchain.pem"
    nginx -T 2>&1 | grep -Fq "client_max_body_size 6m;"
    nginx -T 2>&1 | grep -Fq "location /ws {"
    nginx -T 2>&1 | grep -Fq "proxy_http_version 1.1;"
    nginx -T 2>&1 | grep -Fq "proxy_read_timeout 3600s;"
    nginx -T 2>&1 | grep -Fq "proxy_set_header Upgrade \$http_upgrade;"
    nginx -T 2>&1 | grep -Fq "proxy_set_header Connection \$connection_upgrade;"
  '

echo "Nginx image validation succeeded: $NGINX_IMAGE"
