# syntax=docker/dockerfile:1
# Trayb image for the VAL26 overlay (frontend/). Build context: the repo root
# (frontend.Dockerfile.dockerignore keeps it to frontend/ and deploy/frontend/).
# Upstream's frontend/Dockerfile is left alone so syncs never conflict (docs/upstream-sync.md).
#
# Difference from upstream's image: deploy/frontend/40-trayb-config.sh writes
# assets/config/config.json from env when the container starts (#11).

FROM node:22-alpine AS build
WORKDIR /app
ENV HUSKY=0 \
    YARN_IGNORE_PATH=1
RUN corepack enable
COPY frontend/ ./
RUN yarn install --immutable && yarn build

FROM nginx:1.27-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/spectra-frontend/browser /usr/share/nginx/html
COPY frontend/LICENSE.md frontend/NOTICE-TRAYB.md /usr/share/doc/trayb-overlay/
COPY --chmod=755 deploy/frontend/40-trayb-config.sh /docker-entrypoint.d/40-trayb-config.sh
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/assets/config/config.json >/dev/null || exit 1
