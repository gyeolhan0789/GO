# Backend Canary Deployment Runbook

Related issue: `S15P11A506-418`

## Deployment layout

| Role | Container | Host port | Scheduling | Hibernate DDL |
|---|---|---:|---|---|
| Stable | `wecandoit-backend-stable` | 8080 | enabled | `update` |
| Canary | `wecandoit-backend-canary` | 8082 | disabled | `validate` |

Both containers share the production MySQL, Redis, and `./uploads` directory.
Only Stable runs `BingoBoardRenewalScheduler` to prevent duplicate scheduled
notifications. Request-driven notification events continue to run in whichever
container receives the request.

## First deployment checks

Run these commands on the production Jenkins agent before the first deployment.
The Jenkins `Preflight` stage performs equivalent checks and stops on failure.

```bash
sudo /usr/sbin/nginx -T 2>&1 \
  | awk '
    /^# configuration file / { file=$0 }
    /server_name i15a506\.p\.ssafy\.io/ { print file }
  '

sudo ss -ltnp 'sport = :8082'
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}'
```

The default Nginx site path used by Jenkins is:

```text
/etc/nginx/sites-available/wecandoit.conf
```

If the active file is different, set the `NGINX_SITE_FILE` Jenkins parameter to
that file. Merge the changes from `infra/nginx/wecandoit.conf` into the active
file before running the pipeline. Do not overwrite the active file blindly:
server-only locations such as a Jenkins reverse proxy may not exist in the
repository copy.

The active Nginx site must contain the upstream include, proxy target, and
backend access log configuration from `infra/nginx/wecandoit.conf`:

```nginx
upstream backend_prod {
    include /etc/nginx/snippets/wecandoit-backend-upstream.conf;
}

log_format backend_upstream escape=json
    '$time_iso8601\t$remote_addr\t$request\t$status\t$request_time\t'
    '$upstream_addr\t$upstream_status\t$upstream_response_time';

proxy_pass http://backend_prod;
access_log /var/log/nginx/wecandoit-backend-access.log backend_upstream;
```

For the first rollout, install the Stable-only snippet before validating the
merged site configuration:

```bash
sudo /usr/bin/mkdir -p /etc/nginx/snippets
sudo /usr/bin/install -m 0644 \
  backend/infra/nginx/upstreams/stable-only.conf \
  /etc/nginx/snippets/wecandoit-backend-upstream.conf

# Merge the upstream and proxy_pass changes into the active site file.
sudo /usr/sbin/nginx -t
sudo /usr/bin/systemctl reload nginx
```

The Jenkins user needs restricted sudo permission for:

```text
/usr/sbin/nginx -t
/usr/sbin/nginx -T
/usr/bin/systemctl reload nginx
/usr/bin/install
/usr/bin/mkdir
/usr/bin/rm
/usr/bin/cat
/usr/bin/grep
/usr/bin/test
/usr/bin/wc
/usr/bin/tail
```

## Image preservation

The pipeline preserves an image only when the current Stable or legacy
production container is running, maps container port 8080 to
`127.0.0.1:8080`, and passes the Stable health check. It reads that
container's image ID before building the new image and preserves it as:

```text
wecandoit-backend-prod:<image revision>
wecandoit-backend-prod:stable
```

Legacy images without the OCI revision label are preserved as:

```text
wecandoit-backend-prod:<CURRENT_STABLE_REVISION>
```

The existing Dockerfile did not record its Git SHA. For the first Canary
deployment, find the commit used by the previous successful production Jenkins
build and enter it in the `CURRENT_STABLE_REVISION` parameter. The pipeline
rejects the first deployment when this value is missing or is not a 7–40
character hexadecimal Git SHA; it does not guess the deployed revision.

New images contain the Git commit SHA in the
`org.opencontainers.image.revision` label and use the short SHA as their image
tag.

TODO (follow-up issue): define protected current/rollback image tags and the
retention period before implementing old-image cleanup. This pipeline does not
prune Docker images.

## Deployment flow

1. Preserve the current production image.
2. Run tests and build `wecandoit-backend-prod:<Git SHA>`.
3. Start or migrate Stable on `127.0.0.1:8080`.
4. Start Canary on `127.0.0.1:8082`.
5. Verify Canary through `/actuator/health`.
6. Apply `stable-only` routing and validate/reload Nginx.
7. Apply `canary-10` routing.
8. Observe Canary logs and metrics, then approve Canary 100% in Jenkins.
9. Apply `canary-only` routing.
10. Monitor and approve Stable promotion in Jenkins.
11. Retag the new image as `stable`, recreate Stable, and verify it.
12. Return routing to `stable-only` and remove the Canary container.

The first migration from the legacy `wecandoit-backend-prod` container to
`wecandoit-backend-stable` requires stopping the legacy container because both
bind host port 8080. The preserved image is reused, but a short interruption is
possible during this one-time rename migration.

## Health checks

```bash
curl --fail http://127.0.0.1:8080/actuator/health
curl --fail http://127.0.0.1:8082/actuator/health
curl --fail https://i15a506.p.ssafy.io/actuator/health
```

Expected response:

```json
{
  "status": "UP"
}
```

The deployment health-check script requires HTTP success and a response body
whose `status` is `UP`.

## Canary logs and approval criteria

Nginx writes backend requests to:

```text
/var/log/nginx/wecandoit-backend-access.log
```

Each tab-separated line records the request time, client, request, final HTTP
status, total request time, upstream address, upstream status, and upstream
response time. The upstream address distinguishes Stable
(`127.0.0.1:8080`) from Canary (`127.0.0.1:8082`).

After applying 90:10 routing, Jenkins observes new log lines for 60 seconds and
automatically blocks approval when any of these initial thresholds fail:

- At least one request must reach Canary.
- Canary 5xx rate must be at most 1%.
- Canary average upstream response time must be at most 1 second.
- Canary maximum upstream response time must be at most 3 seconds.
- Canary container logs since the 90:10 transition must not contain `ERROR` or
  `Exception`.

Before approving Canary 100%, check the Jenkins monitoring summary and inspect
the corresponding Nginx and container logs. If production traffic is too low to
produce a Canary request during the observation window, send a controlled
health or smoke-test request and rerun the stage rather than approving without
samples. These thresholds are initial guardrails and should be tuned from
production baselines in a follow-up issue.

## Rollback

The pipeline rollback behavior depends on the deployment phase and running
image:

1. If the running Stable already uses the healthy rollback image, it is not
   recreated. Nginx alone is returned to `stable-only`.
2. Canary startup, health, or monitoring failures therefore leave a healthy
   Stable container untouched.
3. If Stable promotion completed and the promoted Stable is healthy, it is
   retained and Nginx is returned to `stable-only`.
4. Only when no suitable healthy Stable is running does Jenkins recreate Stable
   from the preserved rollback image and verify its image ID, port, and health.
5. After a healthy Stable is confirmed, Jenkins validates/reloads Nginx and
   stops Canary. If the Nginx change fails and is restored, Canary remains
   running.

Manual routing rollback:

```bash
cd backend
NGINX_SITE_FILE=/etc/nginx/sites-available/wecandoit.conf \
  bash infra/nginx/deploy-backend-routing.sh stable-only
```

If neither the current Stable nor the restored rollback image is healthy, the
pipeline does not change Nginx routing or remove Canary. This avoids replacing a
healthy Canary-only route with an unhealthy Stable.

## Database compatibility

The production application currently uses Hibernate `ddl-auto=update` and has
no Flyway or Liquibase migrations. During a Canary deployment:

- Stable retains `update`.
- Canary uses `validate` and cannot change the schema.
- Both versions must understand the same schema and stored values.
- Destructive column changes, renames, and required columns without defaults
  must not be deployed through this pipeline.

For a schema change, first apply a backward-compatible expansion that works with
both versions. Contract or cleanup changes must be deployed separately after the
new version has been Stable.
