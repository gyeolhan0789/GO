#!/usr/bin/env bash

set -euo pipefail

NGINX_IMAGE="${1:?Nginx image is required.}"
VALIDATION_CONTAINER="${NGINX_VALIDATION_CONTAINER:-wecandoit-nginx-validate-$$}"
VALIDATION_HTTP_PORT="${2:-18080}"
VALIDATION_HTTPS_PORT="${3:-18443}"
VALIDATION_BIND_ADDRESS="${NGINX_VALIDATION_BIND_ADDRESS:-127.0.0.1}"

cleanup() {
  docker rm -f "$VALIDATION_CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker image inspect "$NGINX_IMAGE" >/dev/null
docker run --detach \
  --name "$VALIDATION_CONTAINER" \
  --publish "$VALIDATION_BIND_ADDRESS:$VALIDATION_HTTP_PORT:80" \
  --publish "$VALIDATION_BIND_ADDRESS:$VALIDATION_HTTPS_PORT:443" \
  --add-host host.docker.internal:host-gateway \
  --add-host backend-stable:127.0.0.1 \
  --add-host backend-canary:127.0.0.1 \
  --volume /etc/letsencrypt:/etc/letsencrypt:ro \
  "$NGINX_IMAGE" >/dev/null

attempt=1
while [ "$attempt" -le 10 ]; do
  if docker exec "$VALIDATION_CONTAINER" \
    curl --fail --silent --show-error --max-time 5 \
      "http://127.0.0.1:8088/nginx-health" >/dev/null; then
    break
  fi
  if [ "$attempt" -eq 10 ]; then
    docker logs "$VALIDATION_CONTAINER" >&2
    echo "Temporary Nginx validation container did not become ready." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done

docker port "$VALIDATION_CONTAINER" 80/tcp \
  | grep -qx "$VALIDATION_BIND_ADDRESS:$VALIDATION_HTTP_PORT"
docker port "$VALIDATION_CONTAINER" 443/tcp \
  | grep -qx "$VALIDATION_BIND_ADDRESS:$VALIDATION_HTTPS_PORT"

for mode in stable-only canary-10 canary-only; do
  docker exec "$VALIDATION_CONTAINER" \
    /usr/local/bin/switch-backend-route "$mode"
done

nginx_dump="$(docker exec "$VALIDATION_CONTAINER" nginx -T 2>&1)"
grep -Fq "server_name i15a506.p.ssafy.io;" <<<"$nginx_dump"
grep -Fq "/etc/letsencrypt/live/i15a506.p.ssafy.io/fullchain.pem" <<<"$nginx_dump"
grep -Fq "location = /admin-ui/ {" <<<"$nginx_dump"
grep -Fq "client_max_body_size 6m;" <<<"$nginx_dump"
grep -Fq "location /ws {" <<<"$nginx_dump"
grep -Fq "proxy_http_version 1.1;" <<<"$nginx_dump"
grep -Fq "proxy_read_timeout 3600s;" <<<"$nginx_dump"
grep -Fq "proxy_set_header Upgrade \$http_upgrade;" <<<"$nginx_dump"
grep -Fq "proxy_set_header Connection \$connection_upgrade;" <<<"$nginx_dump"

dev_location="$(sed -n '/location \/dev\/ {/,/^[[:space:]]*}/p' <<<"$nginx_dump")"
grep -Fq "proxy_http_version 1.1;" <<<"$dev_location"
grep -Fq "proxy_read_timeout 3600s;" <<<"$dev_location"
grep -Fq "proxy_send_timeout 3600s;" <<<"$dev_location"
grep -Fq "proxy_set_header Upgrade \$http_upgrade;" <<<"$dev_location"
grep -Fq "proxy_set_header Connection \$connection_upgrade;" <<<"$dev_location"

echo "Nginx image validation succeeded: $NGINX_IMAGE"
