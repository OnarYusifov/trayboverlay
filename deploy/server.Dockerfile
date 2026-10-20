# syntax=docker/dockerfile:1
# Trayb image for Spectra-Server (server/). Build context: the repo root
# (server.Dockerfile.dockerignore keeps it to server/).
# Upstream's server/Dockerfile is left alone so syncs never conflict (docs/upstream-sync.md).
#
# Differences from upstream's image: compiled with tsc and run with node instead of tsx,
# production dependencies only, non-root, no self-signed certificate (TLS ends at Traefik).

FROM node:22-alpine AS build
WORKDIR /app
ENV HUSKY=0
RUN corepack enable
COPY server/package.json server/yarn.lock server/.yarnrc.yml ./
RUN yarn install --immutable
COPY server/tsconfig.json ./
COPY server/src ./src
RUN yarn build && yarn workspaces focus --production

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    INSECURE=true
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY server/package.json server/LICENSE.md server/NOTICE-TRAYB.md ./
# The server writes one replay file per match to ./replays (mounted as a volume).
RUN mkdir -p replays && chown node:node replays
USER node
EXPOSE 5100 5101 5200
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5101/status >/dev/null || exit 1
CMD ["node", "dist/index.js"]
