FROM nginx:1.27-alpine

RUN apk add --no-cache curl openssl

COPY nginx.conf /etc/nginx/nginx.conf
COPY wecandoit.conf /etc/nginx/conf.d/default.conf
COPY admin.wecandoit.conf /etc/nginx/conf.d/admin.conf
COPY admin-ui.location.conf /etc/nginx/snippets/admin-ui.conf
COPY ai-dev.location.conf /etc/nginx/snippets/ai-dev.conf
COPY jenkins.location.conf /etc/nginx/snippets/jenkins.conf
COPY observability.location.conf /etc/nginx/snippets/observability.conf
COPY upstreams/ /etc/nginx/upstreams/
COPY init-backend-routing.sh /docker-entrypoint.d/20-init-backend-routing.sh
COPY switch-backend-route.sh /usr/local/bin/switch-backend-route

RUN chmod 0755 \
      /docker-entrypoint.d/20-init-backend-routing.sh \
      /usr/local/bin/switch-backend-route
